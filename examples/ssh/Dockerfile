FROM ubuntu:22.04
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssh-server ca-certificates \
    procps iproute2 \
    tini \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/run/sshd /etc/ssh/hostkeys

# Explicit sshd config for test usage
RUN sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication yes/' /etc/ssh/sshd_config \
 && sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config \
 && sed -i 's/^#\?PubkeyAuthentication .*/PubkeyAuthentication yes/' /etc/ssh/sshd_config \
 && sed -i 's/^#\?LogLevel .*/LogLevel VERBOSE/' /etc/ssh/sshd_config \
 && printf "\nUsePAM yes\n" >> /etc/ssh/sshd_config

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 22
CMD ["/usr/bin/tini","--","/usr/local/bin/entrypoint.sh"]
