#!/bin/sh
set -eu

SSH_USER="${SSH_USER:-sshuser}"
SSH_PASSWORD="${SSH_PASSWORD:-sshpass}"
KEYDIR="/etc/ssh/hostkeys"

mkdir -p "$KEYDIR"

# Create login user if missing
if ! id -u "$SSH_USER" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "$SSH_USER"
fi
echo "$SSH_USER:$SSH_PASSWORD" | chpasswd

# Generate host keys if missing (private keys must exist)
if [ ! -s "$KEYDIR/ssh_host_ed25519_key" ] || [ ! -s "$KEYDIR/ssh_host_rsa_key" ]; then
  echo "[entry] generating ssh host keys..." >&2
  rm -f "$KEYDIR/ssh_host_"*
  ssh-keygen -t ed25519 -f "$KEYDIR/ssh_host_ed25519_key" -N "" >/dev/null
  ssh-keygen -t rsa -b 3072 -f "$KEYDIR/ssh_host_rsa_key" -N "" >/dev/null
fi

echo "[entry] host key fingerprints:" >&2
ssh-keygen -lf "$KEYDIR/ssh_host_rsa_key.pub" 2>/dev/null || true
ssh-keygen -lf "$KEYDIR/ssh_host_ed25519_key.pub" 2>/dev/null || true

echo "[entry] starting sshd..." >&2
exec /usr/sbin/sshd -D -e \
  -h "$KEYDIR/ssh_host_ed25519_key" \
  -h "$KEYDIR/ssh_host_rsa_key"
