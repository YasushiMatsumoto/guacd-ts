#!/bin/sh
set -eu

# Ensure runtime dirs
mkdir -p /run/xrdp /var/run/xrdp
chmod 755 /run/xrdp /var/run/xrdp

# D-Bus (optional, but XFCE wants it)
if command -v dbus-daemon >/dev/null 2>&1; then
  mkdir -p /run/dbus
  dbus-daemon --system --fork || true
fi

# Start sesman + xrdp in foreground-ish
# Note: -n = no daemon, -f = config file (optional)
xrdp-sesman --nodaemon &
xrdp --nodaemon &

# Basic health output
echo "xrdp started"
ps aux | grep -E 'xrdp|sesman' | grep -v grep || true

# Keep container alive and show logs
tail -F /var/log/xrdp-sesman.log /var/log/xrdp.log
