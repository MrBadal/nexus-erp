#!/bin/bash
# VM startup: install Docker, set up swap, basic hardening.
# Runs once on first boot via the metadata 'startup-script' key.
set -euxo pipefail

# 1) 2GB swap file as RAM safety net (e2-micro has only 1GB)
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi

# 2) Install Docker engine + compose plugin (Debian 12)
if ! command -v docker >/dev/null 2>&1; then
  apt-get update
  apt-get install -y ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg \
    -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

# 3) Allow the default ssh user (created by gcloud) to use docker without sudo
for u in $(getent passwd | awk -F: '$3 >= 1000 && $1 != "nobody" { print $1 }'); do
  usermod -aG docker "$u" || true
done

# 4) Persist hint for later steps
echo "ready" > /var/lib/nexus-startup-done
