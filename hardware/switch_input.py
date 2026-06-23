#!/usr/bin/env python3
"""
Speak — Switch Input Handler  (device firmware)
================================================
Turns physical accessibility switches wired to the Raspberry Pi's GPIO pins
into keyboard presses, so a switch can drive Speak's on-screen Switch Scanning.

How it fits the device:
  The Speak app (speakaac.org) has single-switch auto-scan — it highlights each
  symbol in turn, and SPACE / ENTER selects the highlighted one. THIS script is
  the missing link that lets a *physical* switch send that SPACE/ENTER. Plug an
  accessibility switch into a 3.5mm jack wired to a GPIO pin -> press it ->
  Speak selects the highlighted symbol. That completes the access loop:
  a kid who can't touch the screen can drive the whole app with one switch.

Wiring (per switch):
  - One leg of the 3.5mm jack  -> the GPIO pin set below (BCM numbering)
  - Other leg of the jack       -> any GND pin
  Internal pull-up is on, so a press pulls the pin LOW (active-low). No resistor
  needed.

Install on the Pi:
  sudo apt update && sudo apt install -y python3-gpiozero python3-evdev
  (evdev injects key events at the *kernel* level, so it works under both X11
   and Wayland — unlike browser-level key fakers that break on newer Pi OS.)

Run it:
  sudo python3 switch_input.py        # needs /dev/uinput access -> run as root
  (or install the systemd service at the bottom so it starts on boot)

NOTE: untested until the Pi + a switch are in hand. The logic is straightforward
and standard; verify on real hardware before relying on it with a user.
"""

from evdev import UInput, ecodes as e
from gpiozero import Button
from signal import pause

# ── Configuration ──────────────────────────────────────────────────
# Map each switch's GPIO pin (BCM numbering) -> the key it sends.
# SPACE drives Speak's scan-select. A 2nd switch (ENTER) is optional — handy
# later if you add step-scanning (one switch advances, one selects).
SWITCH_MAP = {
    17: e.KEY_SPACE,   # Switch 1 (primary — selects the highlighted symbol)
    27: e.KEY_ENTER,   # Switch 2 (optional — alternate select)
}

BOUNCE_SECONDS = 0.05   # debounce: ignore re-triggers within 50ms

# ── Virtual keyboard (kernel-level, works under X11 + Wayland) ──────
ui = UInput({e.EV_KEY: list(SWITCH_MAP.values())}, name="speak-switch")

def tap(key):
    ui.write(e.EV_KEY, key, 1); ui.syn()   # key down
    ui.write(e.EV_KEY, key, 0); ui.syn()   # key up

# ── Wire up the switches ───────────────────────────────────────────
buttons = []
for pin, key in SWITCH_MAP.items():
    btn = Button(pin, pull_up=True, bounce_time=BOUNCE_SECONDS)
    btn.when_pressed = lambda k=key: tap(k)   # default-arg captures each key
    buttons.append(btn)

print(f"Speak switch handler running — {SWITCH_MAP}. Press a switch; Ctrl+C to stop.")
try:
    pause()
except KeyboardInterrupt:
    pass
finally:
    ui.close()

# ── Install as a boot service ──────────────────────────────────────
# Save the block below as /etc/systemd/system/speak-switch.service, then:
#   sudo systemctl enable --now speak-switch
#
# [Unit]
# Description=Speak switch input handler
# After=multi-user.target
#
# [Service]
# ExecStart=/usr/bin/python3 /home/pi/aac-app/hardware/switch_input.py
# Restart=always
# User=root
#
# [Install]
# WantedBy=multi-user.target
