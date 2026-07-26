FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive \
    TZ=Asia/Tokyo \
    DISPLAY=:0 \
    VNC_PORT=5900 \
    VNC_GEOMETRY=1280x800 \
    VNC_DEPTH=24 \
    VNC_PASSWORD=vncpass \
    BG_COLOR="#2b2b2b"

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      tini \
      xvfb \
      x11vnc \
      fluxbox \
      xterm \
      x11-utils \
      x11-xserver-utils \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /root/.vnc \
    && chmod 700 /root/.vnc

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod 755 /usr/local/bin/entrypoint.sh

EXPOSE 5900

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
