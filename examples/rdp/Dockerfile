FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    xrdp xorgxrdp xserver-xorg-core \
    xfce4 xfce4-terminal \
    dbus-x11 x11-xserver-utils \
    sudo locales \
  && rm -rf /var/lib/apt/lists/*

# Locale (optional but helps with some apps)
RUN sed -i 's/# ja_JP.UTF-8 UTF-8/ja_JP.UTF-8 UTF-8/' /etc/locale.gen \
 && locale-gen

# Create login user
ARG RDP_USER=rdpuser
ARG RDP_PASSWORD=rdppass
RUN useradd -m -s /bin/bash "${RDP_USER}" \
 && echo "${RDP_USER}:${RDP_PASSWORD}" | chpasswd \
 && usermod -aG sudo "${RDP_USER}"

# Xfce session for xrdp
RUN echo "startxfce4" > /etc/skel/.xsession \
 && printf "#!/bin/sh\nstartxfce4\n" > /etc/xrdp/startwm.sh \
 && chmod +x /etc/xrdp/startwm.sh

# xrdp key/cert: use default (fine for demo)

EXPOSE 3389

CMD ["/bin/bash", "-lc", "set -euo pipefail; \
  rm -f /var/run/xrdp/xrdp-sesman.pid /var/run/xrdp/xrdp.pid || true; \
  /usr/sbin/xrdp-sesman --nodaemon & \
  exec /usr/sbin/xrdp --nodaemon"]
