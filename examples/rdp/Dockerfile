# Lightweight Ubuntu + XRDP container for demo RDP target
# Ref: typical XRDP setup guides

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      xrdp xorgxrdp xfce4 xfce4-goodies xfce4-terminal dbus-x11 xauth sudo locales && \
    locale-gen en_US.UTF-8 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Create user and set password
ARG RDP_USER=rdpuser
ARG RDP_PASSWORD=Passw0rd!
RUN useradd -m -s /bin/bash ${RDP_USER} && echo "${RDP_USER}:${RDP_PASSWORD}" | chpasswd && adduser ${RDP_USER} sudo

# XFCE session for new users and existing user
RUN echo "startxfce4" > /etc/skel/.xsession && chmod +x /etc/skel/.xsession && \
    echo "startxfce4" > /home/${RDP_USER}/.xsession && chown ${RDP_USER}:${RDP_USER} /home/${RDP_USER}/.xsession

# Allow RDP logins and disable TLS certificate requirement for demo
RUN sed -i 's/^security_layer=.*/security_layer=rdp/' /etc/xrdp/xrdp.ini && \
    sed -i 's/^crypt_level=.*/crypt_level=low/' /etc/xrdp/xrdp.ini && \
    sed -i 's/^certificate=.*/certificate=/' /etc/xrdp/xrdp.ini && \
    sed -i 's/^key_file=.*/key_file=/' /etc/xrdp/xrdp.ini && \
    sed -i 's/^max_bpp=.*/max_bpp=24/' /etc/xrdp/xrdp.ini && \
    sed -i 's/^port=3389/port=3389/' /etc/xrdp/xrdp.ini && \
    sed -i 's/^log_level=.*/log_level=DEBUG/' /etc/xrdp/xrdp.ini && \
    echo "xfce4-session" > /etc/skel/.Xclients && chmod +x /etc/skel/.Xclients

# Increase sesman log level and forward logs to container stdout/stderr
RUN sed -i 's/^LogLevel=.*/LogLevel=DEBUG/' /etc/xrdp/sesman.ini && \
    ln -sf /dev/stdout /var/log/xrdp.log && \
    ln -sf /dev/stdout /var/log/xrdp-sesman.log

# Force XFCE startup and avoid stale env vars that can break sessions
RUN printf '#!/bin/sh\nunset DBUS_SESSION_BUS_ADDRESS\nunset XDG_RUNTIME_DIR\nstartxfce4\n' > /etc/xrdp/startwm.sh && \
    chmod +x /etc/xrdp/startwm.sh

EXPOSE 3389

# Start xrdp and sesman
CMD ["/bin/sh", "-c", "/usr/sbin/xrdp-sesman && exec /usr/sbin/xrdp -nodaemon"]
