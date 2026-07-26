#!/bin/sh
set -eu

PASSFILE="/root/.vnc/passwd"

: "${DISPLAY:=:0}"
: "${VNC_PORT:=5900}"
: "${VNC_GEOMETRY:=1280x800}"
: "${VNC_DEPTH:=24}"
: "${VNC_PASSWORD:=vncpass}"
: "${BG_COLOR:=#2b2b2b}"

mkdir -p /root/.vnc
chmod 700 /root/.vnc

x11vnc -storepasswd "${VNC_PASSWORD}" "${PASSFILE}" >/dev/null 2>&1
chmod 600 "${PASSFILE}"

echo "[entrypoint] Starting Xvfb on ${DISPLAY} (${VNC_GEOMETRY}x${VNC_DEPTH})"
Xvfb "${DISPLAY}" -screen 0 "${VNC_GEOMETRY}x${VNC_DEPTH}" -nolisten tcp -ac &
# Wait for X to be ready
i=0
until xdpyinfo -display "${DISPLAY}" >/dev/null 2>&1; do
  i=$((i+1))
  if [ "$i" -ge 50 ]; then
    echo "[entrypoint] ERROR: Xvfb did not become ready on ${DISPLAY}"
    exit 1
  fi
  sleep 0.1
done

# Paint background immediately (guarantees non-black framebuffer)
echo "[entrypoint] Painting background: ${BG_COLOR}"
xsetroot -display "${DISPLAY}" -solid "${BG_COLOR}" || true

echo "[entrypoint] Starting fluxbox"
fluxbox >/dev/null 2>&1 &

# Ensure at least one window exists (helps you visually confirm everything works)
echo "[entrypoint] Starting xterm"
xterm -display "${DISPLAY}" -geometry 90x28+20+20 &

echo "[entrypoint] Starting x11vnc on port ${VNC_PORT}"
exec x11vnc \
  -display "${DISPLAY}" \
  -rfbauth "${PASSFILE}" \
  -forever \
  -shared \
  -rfbport "${VNC_PORT}" \
  -rfbwait 30000 \
  -noxdamage \
  -repeat
