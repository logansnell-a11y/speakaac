# Speak AAC — Hardware Prototype Shopping List

Target: dedicated kiosk tablet running speakaac.org/app.html in fullscreen kiosk mode.
Total estimated cost: ~$190–220.

---

## Parts to Order

| # | Item | Search Term | Est. Price |
|---|------|-------------|------------|
| 1 | Raspberry Pi 5 (4GB) | "Raspberry Pi 5 4GB" | $60 |
| 2 | 10.1" HDMI touchscreen (1280×800, USB touch) | "10.1 inch HDMI touchscreen Raspberry Pi" | $55–70 |
| 3 | Raspberry Pi 5 case | "Raspberry Pi 5 case fan" | $10–15 |
| 4 | Samsung 64GB microSD (A2, U3) | "Samsung 64GB microSD A2 U3" | $10 |
| 5 | USB-C power supply — 5V 5A (27W) | "Raspberry Pi 5 USB-C 27W power supply" | $12 |
| 6 | Micro-HDMI to HDMI cable (1ft) | "micro HDMI to HDMI 1ft" | $8 |
| 7 | Small USB speaker | "USB mini speaker plug and play" | $10–15 |
| 8 | Wireless USB keyboard (setup only) | "mini wireless USB keyboard touchpad" | $20 |

**Total: ~$185–220**

### Sourcing priority
- Items 1–6: Amazon or adafruit.com (Pi 5 ships immediately)
- Vilros and CanaKit sell Pi 5 starter kits (~$90) that bundle items 1+4+5+6 together
- Search "Vilros Raspberry Pi 5 starter kit" for a bundle option

---

## Pi 5 Kiosk Setup Script

After flashing Raspberry Pi OS (64-bit, Bookworm) to the SD card:

```bash
#!/usr/bin/env bash
# Run this on first boot as the 'pi' user.
# Usage: bash kiosk_setup.sh

set -e

APP_URL="https://speakaac.org/app.html"

# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install unclutter (hides idle cursor)
sudo apt install -y unclutter

# 3. Create autostart directory
mkdir -p ~/.config/autostart

# 4. Kiosk launcher
cat > ~/.config/autostart/kiosk.desktop << DESKTOP
[Desktop Entry]
Type=Application
Name=Speak AAC Kiosk
Exec=/home/pi/kiosk.sh
DESKTOP

# 5. Kiosk shell script
cat > ~/kiosk.sh << 'SCRIPT'
#!/usr/bin/env bash
# Hide cursor after 1s idle
unclutter -idle 1 -root &

# Disable screen blanking
xset s off
xset s noblank
xset -dpms

# Wait for desktop
sleep 3

# Launch Chromium in kiosk mode
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --no-first-run \
  --disable-restore-session-state \
  --disable-session-crashed-bubble \
  --disable-component-update \
  --check-for-update-interval=31536000 \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  "https://speakaac.org/app.html"
SCRIPT

chmod +x ~/kiosk.sh

# 6. Disable screensaver / power management via raspi-config
sudo raspi-config nonint do_blanking 1

# 7. Auto-login to desktop (required for kiosk)
sudo raspi-config nonint do_boot_behaviour B4

echo ""
echo "=========================================="
echo "  Kiosk setup complete."
echo "  Reboot now: sudo reboot"
echo "=========================================="
```

### How to flash and run
1. Download **Raspberry Pi Imager** from raspberrypi.com/software
2. Flash **Raspberry Pi OS (64-bit)** to the 64GB SD card
3. In Imager: set hostname=`speak`, enable SSH, set username=`pi`, set your wifi
4. Boot the Pi, SSH in or connect a keyboard
5. Copy the script above → `nano kiosk_setup.sh` → paste → Ctrl+X → save
6. `bash kiosk_setup.sh`
7. `sudo reboot`

On reboot, Chromium opens speakaac.org/app.html fullscreen automatically.

---

## Demo Checklist (before bringing to clinic)

- [ ] App loads on boot without touching anything (kiosk mode works)
- [ ] Touch response accurate on the symbol grid
- [ ] Text-to-speech plays through USB speaker
- [ ] Help button triggers email (test with your email first)
- [ ] Sign in to a Clinic tier account and add a test patient
- [ ] Verify patient events appear in teacher.html Clinic Dashboard
- [ ] Export CSV from dashboard — opens correctly in Excel/Sheets
- [ ] 60s auto-refresh works (tap a symbol, wait ~60s, see it appear in dashboard)

---

## Enclosure (optional — Fusion 360)

If finishing the enclosure design before the demo:
- Target dims: 260×180×40mm, 20mm corner fillets
- Screen recess: 10.1" panel cutout with 2mm lip
- Speaker grille: 30mm circular hex pattern, bottom-center
- Thermal: 25mm chimney vent above Pi, passive convection
- Power: flush USB-C port on right edge
- Export as STL → print in PLA at 20% infill

Fusion 360 Personal (free) after the 30-day trial expires: sign in at autodesk.com → switch license to Personal.
