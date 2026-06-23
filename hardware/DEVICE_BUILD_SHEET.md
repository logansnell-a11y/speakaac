# Speak SGD — Device Build Sheet (dedicated AAC speech-generating device)

Builds on `KIOSK_HARDWARE.md` (the ~$200 touch kiosk) and extends it into a real
dedicated AAC device with eye-gaze, switch access, and proper accommodation.
Runs speakaac.org/app.html fullscreen + the gaze service in `gaze/`.

**Positioning:** the per-student dedicated device for kids who need eye-gaze /
severe-motor / rugged all-day use. Sell at ~$1,000 (vs $3,000–8,000 competitors).
Insurance-fundable. NOT the admin console (that's software on a laptop).

---

## BILL OF MATERIALS

### Tier 1 — Touch SGD (~$240) — demo-able on its own
| Item | Search term | Est. |
|---|---|---|
| Raspberry Pi 5 (4GB ok; 8GB for headroom) | "Raspberry Pi 5 4GB" | $60 (8GB ~$80) |
| Active Cooler (Pi 5 needs active cooling) | "Raspberry Pi 5 Active Cooler" | $10 |
| 10.1" HDMI touchscreen (1280×800, USB touch) | "10.1 HDMI touchscreen Raspberry Pi" | $65 |
| 64GB microSD (A2/U3) | "Samsung 64GB microSD A2 U3" | $10 |
| USB-C 27W power supply | "Raspberry Pi 5 27W USB-C PSU" | $12 |
| Micro-HDMI → HDMI cable (1ft) | "micro HDMI to HDMI 1ft" | $8 |
| Loud speaker ≥3W (USB or I2S amp+driver) | "USB speaker 3W loud" | $15 |
| 2× 3.5mm switch jacks + GPIO wiring | "3.5mm mono panel jack" | $8 |
| Mounting plate (VESA 75mm) | "VESA 75 adapter plate" | $15 |
| Enclosure (3D-printed PETG) | filament / print service | $25 |
| Cables, standoffs, fasteners | — | $12 |
| **Tier 1 subtotal** | | **~$240** |

### Tier 2 — add Eye-Gaze module (+~$100) → Full Gaze SGD ~$340
| Item | Search term | Est. |
|---|---|---|
| Raspberry Pi Global Shutter Camera (no IR filter — good for gaze) | "Raspberry Pi Global Shutter Camera" | $50 |
| C/CS-mount lens (~6mm) | "6mm CS mount lens Raspberry Pi" | $25 |
| 850nm IR illuminator ring | "850nm IR LED ring illuminator" | $15 |
| Camera ribbon + mount bracket | "Pi camera ribbon cable" | $10 |
| **Tier 2 add-on** | | **~$100** |

### Optional add-ons
| Item | Why | Est. |
|---|---|---|
| Hailo-8L (M.2) + M.2 HAT+ | on-device vision/AI accel (gaze can run on CPU/cloud without it — skip for v1) | $85 |
| UPS / battery HAT + 18650 cells | untethered all-day use | $40 |
| Keyguard (laser-cut acrylic overlay) | targeting accommodation | $20 |
| USB mic | future voice features | $5 |

**Targets:** Touch SGD ~$240 · Full Gaze SGD ~$340 · Full + Hailo + battery ~$465.
(Matches your ~$367 working number for the gaze build w/o the optional accel.)

---

## ENCLOSURE / CASE SPEC
Your Fusion design: **260 × 180 × 40 mm, 20mm corner fillets, integrated thermal chimney.**
- **Material:** PETG (heat + impact resistant; ABS ok). Not PLA — it warps near the Pi's heat.
- **Thermal chimney:** passive convection channel over the Active Cooler; vents top + bottom.
- **Screen:** recessed behind a 2–3mm bezel lip; flush, no exposed edges.
- **Gaze module:** camera + IR ring mounted in a "chin" below the screen, angled **up ~15°** toward the user's eyes (correct gaze geometry). IR ring concentric around the lens.
- **Speaker:** front-firing grille (sound aimed at people, not the wall).
- **Ports:** side cutouts for 2× 3.5mm switch jacks, USB-C power, 1–2× USB-A; recessed so cables can't be yanked.
- **Mount:** **VESA 75mm** pattern on the back → fits standard wheelchair mounts (RAM, Mount'n Mover) and table stands.
- **Keyguard:** mounting lip/standoffs around the screen so an acrylic keyguard can clip on.
- **Sealing:** rounded, overlapping seams; wipeable; captive screws for service. Drool/spill resistant.

---

## ACCOMMODATION CHECKLIST (what makes it a real AAC device, not "a Pi in a box")
- [ ] **Mounting** — VESA + wheelchair/table mount (most kids can't hold it)
- [ ] **Switch access** — 2× 3.5mm jacks wired to GPIO → drives your scanning
- [ ] **Eye-gaze** — GS camera + IR ring, positioned + angled correctly, calibrated
- [ ] **Loud, clear speaker** — ≥3W, front-firing (classrooms are noisy)
- [ ] **Ruggedness** — PETG, sealed seams, wipeable, recessed cables
- [ ] **All-day power** — mains, or battery HAT for portable
- [ ] **Keyguard option** — clip-on acrylic overlay for targeting
- [ ] **Screen** — anti-glare/matte, adequate brightness, large touch targets (Speak handles this)
- [ ] **Volume** — physical or on-screen control
- [ ] **Serviceable** — captive screws, accessible SD/ports

---

## SOFTWARE SETUP
1. Flash **Raspberry Pi OS 64-bit (Bookworm)** to the SD.
2. **Kiosk mode** → run the existing `kiosk_setup.sh` (KIOSK_HARDWARE.md): boots straight into `speakaac.org/app.html` fullscreen, hides cursor.
3. **Gaze service** → run `gaze/install.sh` then `gaze/start.sh` to launch `tracker.py` (port 5050) on boot. Speak's *Eye Gaze Control* setting + dwell-time then drive selection.
4. **Calibration** → `gaze/calibrate.html` — run once per user / seating change (the in-app "Run Gaze Calibration" button).
5. **Autostart both** kiosk + gaze service via the existing autostart entries.
6. **Switch input** → map the 3.5mm GPIO jacks to keypresses (Space/Enter) → drives Speak's switch scanning (already built).

---

## ASSEMBLY ORDER
1. Flash OS → boot Pi with screen → confirm **Speak runs fullscreen** (this alone is demo #1).
2. Wire + test a **switch** into a 3.5mm jack → confirm **scanning selects** (mapped to Space).
3. Add speaker → confirm loud/clear TTS.
4. Mount **camera + IR ring** in the chin → install gaze service → **calibrate** → confirm gaze select.
5. Print enclosure → fit Pi + screen + camera + speaker → route cables → add VESA mount.
6. Final test: touch + switch + gaze all work; mount it; clean-wipe test.

---

## BUILD PHASES (one at a time — don't build the whole thing before a clinic says yes)
- **Phase 0 — Touch SGD on the bench (~$240).** Proves Speak runs as a dedicated device + switch scanning. *Demo-able by itself.* Do this first.
- **Phase 1 — add gaze (~$340 total).** Camera + IR ring + calibrate. Now it's the differentiated device.
- **Phase 2 — proper enclosure + mounts + keyguard.** Demo-ready, looks/feels real.
- **Phase 3 (optional) — battery + Hailo.** Portability + on-device accel, for productization.

## SOURCING
- **Official parts** (Pi 5, Active Cooler, GS Camera): thepihut.com, adafruit.com, canakit.com
- **Screen / speaker / PSU / cables:** Amazon
- **IR ring / lens / cheaper bits:** AliExpress (longer ship — order early)
- **3D printing the case:** library / makerspace / Highland (your college) maker lab, or a print service (~$30–60). Tie this to your "Assistive Technology" angle — AT programs often have maker resources.

> Reminder: build it **funded from spare money, not survival cash**, and ideally once a contact/clinic has shown interest. Phase 0 is cheap and demo-able — start there.
