#!/usr/bin/env bash
# Start the gaze tracking server.
# Run this before launching the Speak kiosk, or add to autostart.
#
# Usage: bash ~/aac-app/gaze/start.sh
# Background: bash ~/aac-app/gaze/start.sh &

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting Speak gaze tracker..."
exec python3 "$SCRIPT_DIR/tracker.py"
