#!/bin/bash
# Script to install canvas dependencies
# Run this if you have sudo access, or install these packages manually

echo "Canvas requires these system packages:"
echo "  - libcairo2-dev"
echo "  - libpango1.0-dev"
echo "  - libjpeg-dev"
echo "  - libgif-dev"
echo "  - librsvg2-dev"
echo ""
echo "On Ubuntu/Debian, install with:"
echo "  sudo apt-get install -y libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev"
echo ""
echo "Then rebuild canvas:"
echo "  npm rebuild canvas"
echo "  # or"
echo "  bun install"
