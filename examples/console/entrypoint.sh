#!/bin/sh
set -eu

SSH_USER="${SSH_USER:-sshuser}"
SSH_PASSWORD="${SSH_PASSWORD:-sshpass}"
TELNET_USER="${TELNET_USER:-telnetuser}"
TELNET_PASSWORD="${TELNET_PASSWORD:-telnetpass}"
KEYDIR="/etc/ssh/hostkeys"

mkdir -p "$KEYDIR"

# ── Create users ────────────────────────────────────────────────────────────

create_user() {
  local user="$1" pass="$2"
  if ! id -u "$user" >/dev/null 2>&1; then
    useradd -m -s /bin/bash "$user"
  fi
  echo "$user:$pass" | chpasswd
}

create_user "$SSH_USER"    "$SSH_PASSWORD"
create_user "$TELNET_USER" "$TELNET_PASSWORD"

# ── SSH host keys ───────────────────────────────────────────────────────────

if [ ! -s "$KEYDIR/ssh_host_ed25519_key" ] || [ ! -s "$KEYDIR/ssh_host_rsa_key" ]; then
  echo "[entry] generating ssh host keys..." >&2
  rm -f "$KEYDIR/ssh_host_"*
  ssh-keygen -t ed25519 -f "$KEYDIR/ssh_host_ed25519_key" -N "" >/dev/null
  ssh-keygen -t rsa -b 3072 -f "$KEYDIR/ssh_host_rsa_key" -N "" >/dev/null
fi

# ── Start services ──────────────────────────────────────────────────────────

echo "[entry] starting inetd (telnet)..." >&2
/usr/sbin/inetd /etc/inetd.conf

echo "[entry] starting sshd..." >&2
exec /usr/sbin/sshd -D -e \
  -h "$KEYDIR/ssh_host_ed25519_key" \
  -h "$KEYDIR/ssh_host_rsa_key"
