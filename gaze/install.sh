#!/usr/bin/env bash
# Run once on the Raspberry Pi to install gaze tracking dependencies.
# Usage: bash ~/aac-app/gaze/install.sh

set -e

echo "Installing system dependencies..."
sudo apt install -y libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libxrender1

echo "Installing Python packages..."
pip3 install --break-system-packages \
    mediapipe>=0.10.7 \
    opencv-python>=4.8.0 \
    numpy>=1.24.0 \
    websockets>=12.0

echo ""
echo "Done. Run: python3 ~/aac-app/gaze/tracker.py"
