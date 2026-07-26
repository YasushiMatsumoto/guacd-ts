FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Base packages + Firefox from Mozilla APT repo (not snap)
RUN apt-get update && apt-get install -y --no-install-recommends \
    xrdp xorgxrdp xserver-xorg-core \
    xfce4 xfce4-terminal \
    dbus-x11 x11-xserver-utils \
    sudo locales \
    wget ca-certificates gnupg \
  && install -d -m 0755 /etc/apt/keyrings \
  && wget -qO /etc/apt/keyrings/packages.mozilla.org.asc \
       https://packages.mozilla.org/apt/repo-signing-key.gpg \
  && echo "deb [signed-by=/etc/apt/keyrings/packages.mozilla.org.asc] https://packages.mozilla.org/apt mozilla main" \
       > /etc/apt/sources.list.d/mozilla.list \
  && printf 'Package: *\nPin: release o=Mozilla\nPin-Priority: 1001\n' \
       > /etc/apt/preferences.d/mozilla \
  && apt-get update && apt-get install -y --no-install-recommends firefox \
  && rm -rf /var/lib/apt/lists/*

# Locale
RUN sed -i 's/# ja_JP.UTF-8 UTF-8/ja_JP.UTF-8 UTF-8/' /etc/locale.gen \
 && locale-gen

# Create login user, .xsession, and startwm.sh all in one layer
ARG RDP_USER=rdpuser
ARG RDP_PASSWORD=rdppass
RUN useradd -m -s /bin/bash "${RDP_USER}" \
 && echo "${RDP_USER}:${RDP_PASSWORD}" | chpasswd \
 && usermod -aG sudo "${RDP_USER}" \
 && echo "dbus-launch --exit-with-session startxfce4" > "/home/${RDP_USER}/.xsession" \
 && chown "${RDP_USER}:${RDP_USER}" "/home/${RDP_USER}/.xsession" \
 && printf '#!/bin/sh\ndbus-launch --exit-with-session startxfce4\n' > /etc/xrdp/startwm.sh \
 && chmod +x /etc/xrdp/startwm.sh

EXPOSE 3389

CMD ["/bin/bash", "-lc", "set -euo pipefail; \
  rm -f /var/run/xrdp/xrdp-sesman.pid /var/run/xrdp/xrdp.pid || true; \
  mkdir -p /run/dbus && dbus-daemon --system --fork 2>/dev/null || true; \
  /usr/sbin/xrdp-sesman --nodaemon & \
  exec /usr/sbin/xrdp --nodaemon"]
