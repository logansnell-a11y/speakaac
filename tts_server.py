"""
Tiny local TTS server for the AAC app.
Handles on-demand voice for typed text using gTTS.
Run this alongside the app: python3 ~/aac-app/tts_server.py
"""

from flask import Flask, request, send_file, jsonify
from gtts import gTTS
import io
import os

app = Flask(__name__)

@app.route("/tts", methods=["POST"])
def tts():
    data = request.get_json()
    text = (data or {}).get("text", "").strip()
    if not text:
        return jsonify({"error": "no text"}), 400
    try:
        tts  = gTTS(text=text, lang="en", tld="com", slow=False)
        buf  = io.BytesIO()
        tts.write_to_fp(buf)
        buf.seek(0)
        return send_file(buf, mimetype="audio/mpeg")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

if __name__ == "__main__":
    print("TTS server running at http://localhost:5050")
    print("Keep this open while using the AAC app.\n")
    app.run(port=5050, debug=False)
