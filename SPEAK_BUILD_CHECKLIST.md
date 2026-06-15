# Speak — Gap to a Functioning Unit

**Purpose of this device:** a safety + voice device for anyone who's lost their voice — elder care (SNF / memory care) and AAC. Resident triggers a safety escalation → PIN gate → selects AAC symbols by **gaze** (no touch). Locked-down kiosk a facility can't wander off with.

---

## Form-Factor Decision (settled June 6, 2026)

**Build ONE custom RPi5 unit** as the SBIR demo + patent prototype. The integrated purpose-built device (gaze + safety + AAC in locked hardware) *is* the technical story for SBIR and the PPA. One prototype — not a product line.

**Scale on software-on-tablet, not custom hardware.** Facilities don't want to support a hand-built box; they want an app on a device they understand (iPad has built-in eye-tracking accessibility; the web app already runs). The custom device is the flagship demo; the software is the scalable product. (Same lesson as Loupe Model D — don't sign up for a hardware support treadmill.)

---

## What's already DONE (software)

- [x] AAC web app — live at speakaac.org
- [x] Gaze tracking — `~/aac-app/gaze/tracker.py` + `calibrate.html` (built Jun 6)
- [x] Safety escalation + PIN onboarding — in codebase (May 22)
- [x] Kiosk autostart with gaze — `kiosk.sh` updated

**The software is ready enough to demo. The gap is the physical unit, and it's gated on parts ($367), which is gated on cash.**

---

## Parts to order ($367 BOM)

| Part | Where | Cost |
|------|-------|------|
| Raspberry Pi 5 8GB | pishop.us | $80 |
| Raspberry Pi AI Kit (Hailo-8L + M.2 HAT+) — ONE product, don't split | pishop.us | $70 |
| 10.1" HDMI touchscreen 1280×800 + USB touch | Amazon | $65 |
| RPi Global Shutter Camera (official) | raspberrypi.com | $50 |
| 850nm IR LED ring | Amazon | $12 |
| Argon NEO 5 BRED case (verify Pi5 + M.2 HAT+ fit) | Amazon | $25 |
| USB audio adapter + powered speaker | Amazon | $25 |
| 64GB microSD A2 | Amazon | $10 |
| 27W USB-C power supply | Amazon | $12 |
| Micro-HDMI to HDMI 1ft | Amazon | $8 |
| Standoffs + misc | Amazon | $10 |

---

## Build sequence (when parts land — Loupe records this for SBIR evidence)

### Phase 1 — Base OS
- [ ] Flash 64GB SD with Raspberry Pi OS (64-bit, Bookworm)
- [ ] First boot, enable SSH + set hostname `speak-01`
- [ ] `sudo apt update && full-upgrade`
- [ ] Install Hailo runtime + verify AI Kit detected (`hailortcli fw-control identify`)

### Phase 2 — App + kiosk
- [ ] Pull aac-app, install deps
- [ ] Run `kiosk_setup.sh` → Chromium kiosk autostarts on boot
- [ ] Confirm gaze tracker auto-starts before Chromium (per updated kiosk.sh)
- [ ] Verify touchscreen registers touch (fallback input path)

### Phase 3 — Gaze
- [ ] Mount Global Shutter camera + IR ring, aim at face position
- [ ] Settings → Eye Gaze Control → Run Gaze Calibration (5-dot, http://localhost:5051/calibrate)
- [ ] Verify dwell selection works (look at symbol 1.8s → fires)
- [ ] Tune dwell time (0.8–3.0s) for the target user

### Phase 4 — Safety + PIN
- [ ] Trigger safety escalation flow end-to-end
- [ ] Confirm PIN gate works (onboarding + unlock)
- [ ] Confirm escalation notification path fires (whatever channel is wired)

### Phase 5 — End-to-end scenario (the real test)
- [ ] Full run: resident triggers safety → PIN → selects AAC symbols by gaze, **no touch** → message delivered
- [ ] Run it on battery/standalone if applicable
- [ ] Note failure modes + fixes

### Phase 6 — SBIR documentation
- [ ] Loupe on during assembly → both cameras recording → `speak_build_YYYY-MM-DD.md` auto-doc
- [ ] Timestamped build record + photos = SBIR technical-competency evidence
- [ ] Save final doc to ~/knowledge/ for the Sept 5 application

---

## Critical path

Bikes are uncertain. **The unit is funded by paychecks, not bike sales.** Once the credit card is cleared and a small buffer exists, $367 of parts is one good paycheck. The only thing between here and a working Speak unit is ordering the parts and a weekend of assembly.
