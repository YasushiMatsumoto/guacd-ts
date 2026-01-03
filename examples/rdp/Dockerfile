FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      xrdp xorgxrdp \
      xfce4 xfce4-goodies xfce4-terminal \
      dbus dbus-x11 dbus-user-session \
      xauth sudo locales tini procps \
      ca-certificates && \
    locale-gen en_US.UTF-8 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

ARG RDP_USER=rdpuser
ARG RDP_PASSWORD=Passw0rd!

RUN useradd -m -s /bin/bash ${RDP_USER} && \
    echo "${RDP_USER}:${RDP_PASSWORD}" | chpasswd && \
    adduser ${RDP_USER} sudo

# XFCE session
RUN echo "startxfce4" > /etc/skel/.xsession && chmod +x /etc/skel/.xsession && \
    echo "startxfce4" > /home/${RDP_USER}/.xsession && \
    chown ${RDP_USER}:${RDP_USER} /home/${RDP_USER}/.xsession

# XRDP startwm:
# - DO NOT chown /run/user/* here (this script runs as the login user)
# - Dump logs to ~/.xsession-errors so failures are visible
RUN printf '%s\n' \
'#!/bin/sh' \
'set -u' \
'' \
'export HOME="${HOME:-/home/'"${RDP_USER}"'}"' \
'export USER="${USER:-'""${RDP_USER}""'}"' \
'' \
'# Keep a per-login log' \
'mkdir -p "$HOME"' \
'exec >>"$HOME/.xsession-errors" 2>&1' \
'' \
'echo "[startwm] $(date) uid=$(id -u) gid=$(id -g) DISPLAY=$DISPLAY"' \
'' \
'# Docker has no systemd-logind; we provide XDG_RUNTIME_DIR from entrypoint' \
'uid="$(id -u)"' \
'export XDG_RUNTIME_DIR="/run/user/${uid}"' \
'echo "[startwm] XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR"' \
'' \
'# Avoid inheriting broken bus env' \
'unset DBUS_SESSION_BUS_ADDRESS' \
'' \
'# Start XFCE under a session bus' \
'exec dbus-launch --exit-with-session startxfce4' \
> /etc/xrdp/startwm.sh && chmod +x /etc/xrdp/startwm.sh

# (Optional but helps some clients) allow 32bpp too
RUN sed -i 's/^max_bpp=.*/max_bpp=32/' /etc/xrdp/xrdp.ini || true

EXPOSE 3389

CMD ["/usr/bin/tini","--","/bin/sh","-lc", "\
  set -eu; \
  # runtime dirs (Docker resets /run at container start) \
  mkdir -p /run/dbus /run/user/1000; \
  chown 1000:1000 /run/user/1000; chmod 700 /run/user/1000; \
  # system bus \
  dbus-daemon --system --fork; \
  # stream XRDP logs to docker logs \
  ln -sf /proc/1/fd/1 /var/log/xrdp.log; \
  ln -sf /proc/1/fd/1 /var/log/xrdp-sesman.log; \
  /usr/sbin/xrdp-sesman; \
  exec /usr/sbin/xrdp -nodaemon \
"]