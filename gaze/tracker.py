#!/usr/bin/env python3
"""
tracker.py — Speak AAC gaze tracking server.

Runs on the Raspberry Pi. Two servers in one process:
  - WebSocket port 5050: real-time gaze stream ↔ Chromium kiosk
  - HTTP port 5051: calibration API + serves calibrate.html

Protocol (WebSocket):
  Browser → server:
    { "action": "set_targets", "targets": [{id, x, y, w, h}] }  (normalized 0-1)
    { "action": "set_dwell_ms", "dwell_ms": 1200 }

  Server → browser:
    { "type": "gaze",      "x": 0.5, "y": 0.4 }
    { "type": "progress",  "targets": { "symbol_id": 0.6 } }
    { "type": "selection", "target_id": "happy" }

Usage:
    python3 ~/aac-app/gaze/tracker.py
"""

import asyncio
import json
import math
import os
import threading
import time
import collections
import pickle
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

import cv2
import numpy as np
import websockets

CAL_PATH   = Path.home() / ".speak_calibration.pkl"
WS_PORT    = 5050
HTTP_PORT  = 5051
GAZE_DIR   = Path(__file__).parent
CAL_PAGE   = GAZE_DIR / "calibrate.html"
SMOOTH_A   = 0.3    # EMA smoothing — 0 = frozen, 1 = raw
TARGET_PAD = 0.008  # normalized padding around target hit boxes


# ── Camera ─────────────────────────────────────────────────────────────────────

def open_camera():
    """Try Pi camera first (picamera2), fall back to OpenCV."""
    try:
        from picamera2 import Picamera2
        cam = Picamera2()
        cam.configure(cam.create_preview_configuration(
            main={"size": (640, 480), "format": "BGR888"}
        ))
        cam.start()
        time.sleep(0.5)
        print("Camera: picamera2")
        return 'picamera2', cam
    except Exception:
        pass

    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)
    if not cap.isOpened():
        raise RuntimeError("No camera found. Tried picamera2 and /dev/video0.")
    print("Camera: OpenCV /dev/video0")
    return 'opencv', cap


def capture_frame(cam_type, cam):
    if cam_type == 'picamera2':
        return cam.capture_array()
    else:
        ret, frame = cam.read()
        return frame if ret else None


# ── MediaPipe face mesh ────────────────────────────────────────────────────────

def load_face_mesh():
    import mediapipe as mp
    return mp.solutions.face_mesh.FaceMesh(
        max_num_faces=1,
        refine_landmarks=True,   # iris landmarks at 468-477
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )


def extract_iris(face_mesh, frame):
    """
    Returns (raw_x, raw_y) normalized 0-1 in image space, or None.
    Uses average of left (473) and right (468) iris centers.
    raw_x/y are in image coordinates — calibration maps these to screen.
    """
    import mediapipe as mp
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    rgb.flags.writeable = False
    result = face_mesh.process(rgb)

    if not result.multi_face_landmarks:
        return None

    lm = result.multi_face_landmarks[0].landmark
    # Landmark 468 = right iris center, 473 = left iris center
    # Average both for stability; weight by horizontal position spread
    rx, ry = lm[468].x, lm[468].y
    lx, ly = lm[473].x, lm[473].y
    return (rx + lx) / 2.0, (ry + ly) / 2.0


# ── Calibration ────────────────────────────────────────────────────────────────

def load_calibration():
    if CAL_PATH.exists():
        with open(CAL_PATH, 'rb') as f:
            return pickle.load(f)
    return None


def save_calibration(matrix):
    with open(CAL_PATH, 'wb') as f:
        pickle.dump(matrix, f)
    print(f"Calibration saved to {CAL_PATH}")


def fit_calibration(samples):
    """
    samples: list of {raw_x, raw_y, target_x, target_y}
    Returns 2×3 affine matrix A where: [sx, sy] = A @ [raw_x, raw_y, 1]
    """
    if len(samples) < 3:
        return None
    X = np.array([[s['raw_x'], s['raw_y'], 1.0] for s in samples])   # N×3
    Y = np.array([[s['target_x'], s['target_y']] for s in samples])  # N×2
    A, _, _, _ = np.linalg.lstsq(X, Y, rcond=None)                   # 3×2
    return A.T  # 2×3 so screen = A @ f


def apply_calibration(cal, raw_x, raw_y):
    if cal is None:
        # Naive: mirror x (camera faces user), linear y
        return float(np.clip(1.0 - raw_x, 0, 1)), float(np.clip(raw_y, 0, 1))
    f = np.array([raw_x, raw_y, 1.0])
    r = cal @ f
    return float(np.clip(r[0], 0, 1)), float(np.clip(r[1], 0, 1))


# ── Dwell tracker ──────────────────────────────────────────────────────────────

class DwellTracker:
    def __init__(self):
        self.current_id  = None
        self.dwell_start = None
        self.cooldown    = {}  # id → time cooldown expires

    def update(self, gaze_x, gaze_y, targets, dwell_ms):
        """Returns (progress_dict, selections_list)."""
        now = time.monotonic()

        # Find hit target
        hit_id = None
        for t in targets:
            x1 = t['x'] - TARGET_PAD
            y1 = t['y'] - TARGET_PAD
            x2 = t['x'] + t['w'] + TARGET_PAD
            y2 = t['y'] + t['h'] + TARGET_PAD
            if x1 <= gaze_x <= x2 and y1 <= gaze_y <= y2:
                hit_id = t['id']
                break

        # Skip if in post-selection cooldown
        if hit_id and self.cooldown.get(hit_id, 0) > now:
            hit_id = None

        if hit_id != self.current_id:
            self.current_id  = hit_id
            self.dwell_start = now if hit_id else None

        progress   = {}
        selections = []

        if self.current_id and self.dwell_start is not None:
            elapsed  = (now - self.dwell_start) * 1000  # ms
            fraction = min(elapsed / max(dwell_ms, 1), 1.0)
            progress[self.current_id] = fraction

            if fraction >= 1.0:
                selections.append(self.current_id)
                self.cooldown[self.current_id] = now + 1.0  # 1s post-select cooldown
                self.current_id  = None
                self.dwell_start = None

        return progress, selections


# ── Shared state ───────────────────────────────────────────────────────────────

state_lock = threading.Lock()
shared = {
    'targets':  [],
    'dwell_ms': 1800,
    'cal':      load_calibration(),
}

# Ring buffer of raw iris coords for calibration sampling
iris_buffer      = collections.deque(maxlen=150)  # ~5s at 30fps
iris_buffer_lock = threading.Lock()

# Calibration collection event
cal_event    = threading.Event()
cal_samples  = []
cal_duration = 2.0  # seconds to collect per point

ws_clients = set()
ws_clients_lock = threading.Lock()


# ── Camera thread ──────────────────────────────────────────────────────────────

def camera_thread_fn(gaze_queue):
    try:
        face_mesh = load_face_mesh()
    except ImportError:
        print("ERROR: mediapipe not installed. Run gaze/install.sh first.")
        return

    try:
        cam_type, cam = open_camera()
    except Exception as e:
        print(f"ERROR: {e}")
        return

    print("Gaze tracking active.")
    collect_start = None

    while True:
        frame = capture_frame(cam_type, cam)
        if frame is None:
            time.sleep(0.01)
            continue

        coords = extract_iris(face_mesh, frame)
        if coords is None:
            continue

        raw_x, raw_y = coords

        # Store raw coords for calibration collection
        with iris_buffer_lock:
            iris_buffer.append({'raw_x': raw_x, 'raw_y': raw_y, 'ts': time.monotonic()})

        # Build gaze result with calibration applied
        with state_lock:
            cal = shared['cal']

        sx, sy = apply_calibration(cal, raw_x, raw_y)

        try:
            gaze_queue.put_nowait({'x': sx, 'y': sy, 'raw_x': raw_x, 'raw_y': raw_y})
        except Exception:
            pass  # queue full — drop frame


# ── Broadcast loop ─────────────────────────────────────────────────────────────

async def broadcast_loop(gaze_queue):
    dwell   = DwellTracker()
    smooth_x, smooth_y = 0.5, 0.5

    while True:
        # Drain queue, keep only freshest frame
        result = None
        while True:
            try:
                result = gaze_queue.get_nowait()
            except Exception:
                break

        if result:
            smooth_x = SMOOTH_A * result['x'] + (1 - SMOOTH_A) * smooth_x
            smooth_y = SMOOTH_A * result['y'] + (1 - SMOOTH_A) * smooth_y

            with state_lock:
                targets  = list(shared['targets'])
                dwell_ms = shared['dwell_ms']

            progress, selections = dwell.update(smooth_x, smooth_y, targets, dwell_ms)

            gaze_msg    = json.dumps({'type': 'gaze',     'x': round(smooth_x, 4), 'y': round(smooth_y, 4)})
            progress_msg = json.dumps({'type': 'progress', 'targets': {k: round(v, 3) for k, v in progress.items()}})

            with ws_clients_lock:
                clients = list(ws_clients)

            if clients:
                await asyncio.gather(
                    *[ws.send(gaze_msg) for ws in clients],
                    return_exceptions=True,
                )
                await asyncio.gather(
                    *[ws.send(progress_msg) for ws in clients],
                    return_exceptions=True,
                )

            for sel_id in selections:
                sel_msg = json.dumps({'type': 'selection', 'target_id': sel_id})
                if clients:
                    await asyncio.gather(
                        *[ws.send(sel_msg) for ws in clients],
                        return_exceptions=True,
                    )

        await asyncio.sleep(0.033)


# ── WebSocket handler ──────────────────────────────────────────────────────────

async def ws_handler(websocket):
    with ws_clients_lock:
        ws_clients.add(websocket)
    print(f"WS connected: {websocket.remote_address}")
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                action = data.get('action')
                with state_lock:
                    if action == 'set_targets':
                        shared['targets'] = data.get('targets', [])
                    elif action == 'set_dwell_ms':
                        shared['dwell_ms'] = int(data.get('dwell_ms', 1800))
            except Exception:
                pass
    except Exception:
        pass
    finally:
        with ws_clients_lock:
            ws_clients.discard(websocket)
        print(f"WS disconnected")


# ── HTTP calibration server ────────────────────────────────────────────────────

class CalibrationHandler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # silence request log

    def do_GET(self):
        p = urllib.parse.urlparse(self.path).path
        if p in ('/', '/calibrate', '/calibrate.html'):
            if CAL_PAGE.exists():
                data = CAL_PAGE.read_bytes()
            else:
                data = b'<h1>calibrate.html not found</h1>'
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.send_header('Content-Length', len(data))
            self.end_headers()
            self.wfile.write(data)
        elif p == '/calibrate/status':
            body = json.dumps({'calibrated': CAL_PATH.exists()}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        p = urllib.parse.urlparse(self.path).path
        length = int(self.headers.get('Content-Length', 0))
        body   = json.loads(self.rfile.read(length) or '{}')

        if p == '/calibrate/sample':
            tx = float(body.get('target_x', 0.5))
            ty = float(body.get('target_y', 0.5))
            # Collect iris samples for cal_duration seconds
            t0 = time.monotonic()
            with iris_buffer_lock:
                iris_buffer.clear()
            time.sleep(cal_duration)
            with iris_buffer_lock:
                recent = [s for s in iris_buffer if s['ts'] >= t0]
            if not recent:
                resp = json.dumps({'ok': False, 'error': 'no iris data'}).encode()
            else:
                avg_x = sum(s['raw_x'] for s in recent) / len(recent)
                avg_y = sum(s['raw_y'] for s in recent) / len(recent)
                resp  = json.dumps({'ok': True, 'raw_x': avg_x, 'raw_y': avg_y,
                                    'n': len(recent)}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(resp)

        elif p == '/calibrate/fit':
            samples = body.get('samples', [])
            A = fit_calibration(samples)
            if A is None:
                resp = json.dumps({'ok': False, 'error': 'not enough samples'}).encode()
            else:
                save_calibration(A)
                with state_lock:
                    shared['cal'] = A
                resp = json.dumps({'ok': True, 'n': len(samples)}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(resp)

        elif p == '/calibrate/reset':
            if CAL_PATH.exists():
                CAL_PATH.unlink()
            with state_lock:
                shared['cal'] = None
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"ok":true}')

        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()


def run_http_server():
    httpd = HTTPServer(('0.0.0.0', HTTP_PORT), CalibrationHandler)
    print(f"Calibration server: http://localhost:{HTTP_PORT}/calibrate")
    httpd.serve_forever()


# ── Entry point ────────────────────────────────────────────────────────────────

async def main():
    import queue as tqueue
    gaze_queue = tqueue.Queue(maxsize=3)

    # Camera thread
    t = threading.Thread(target=camera_thread_fn, args=(gaze_queue,), daemon=True)
    t.start()

    # HTTP calibration server thread
    h = threading.Thread(target=run_http_server, daemon=True)
    h.start()

    print(f"Gaze WebSocket: ws://localhost:{WS_PORT}")

    async with websockets.serve(ws_handler, '0.0.0.0', WS_PORT):
        await asyncio.gather(
            broadcast_loop(gaze_queue),
            asyncio.Future(),  # keep alive
        )


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Stopped.")
