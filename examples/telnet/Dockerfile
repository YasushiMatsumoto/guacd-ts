FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    openbsd-inetd telnetd netbase \
    passwd util-linux libpam0g \
  && rm -rf /var/lib/apt/lists/*

# Create telnet user
ARG TELNET_USER=telnetuser
ARG TELNET_PASSWORD=telnetpass

RUN useradd -m -s /bin/bash "${TELNET_USER}" \
 && echo "${TELNET_USER}:${TELNET_PASSWORD}" | chpasswd

# Enable telnet service (avoid /etc/services dependency by using port number)
RUN printf "23 stream tcp nowait root /usr/sbin/in.telnetd in.telnetd\n" > /etc/inetd.conf

EXPOSE 23

CMD ["/usr/sbin/inetd", "-d", "/etc/inetd.conf"]
