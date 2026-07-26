FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssh-server ca-certificates \
    openbsd-inetd telnetd netbase \
    passwd util-linux libpam0g \
    procps iproute2 \
    vim-tiny nano curl less \
    tini \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /var/run/sshd /etc/ssh/hostkeys

RUN sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication yes/' /etc/ssh/sshd_config \
 && sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config \
 && sed -i 's/^#\?PubkeyAuthentication .*/PubkeyAuthentication yes/' /etc/ssh/sshd_config \
 && printf "\nUsePAM yes\n" >> /etc/ssh/sshd_config

RUN printf "23 stream tcp nowait root /usr/sbin/in.telnetd in.telnetd\n" > /etc/inetd.conf

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 22 23
CMD ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
