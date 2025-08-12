#!/bin/bash

echo "[MMM-ReflektCompanionSetup] Setting up Access Point..."

sudo apt-get update
sudo apt-get install -y hostapd dnsmasq

# Stop services before configuration
sudo systemctl stop hostapd
sudo systemctl stop dnsmasq

# Determine script directory (where this script lives)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Copy config files
echo "[MMM-ReflektCompanionSetup] Copying hostapd and dnsmasq configs..."
sudo cp "$SCRIPT_DIR/config/hostapd.conf" /etc/hostapd/hostapd.conf
sudo cp "$SCRIPT_DIR/config/dnsmasq.conf" /etc/dnsmasq.conf

# Set ownership and permissions on hostapd.conf
sudo chown root:root /etc/hostapd/hostapd.conf
sudo chmod 600 /etc/hostapd/hostapd.conf

# Set ownership and permissions on dnsmasq.conf
sudo chown root:root /etc/dnsmasq.conf
sudo chmod 644 /etc/dnsmasq.conf

# Configure static IP for wlan0 in dhcpcd.conf, but avoid duplicates
if ! grep -q "interface wlan0" /etc/dhcpcd.conf; then
  echo -e "\ninterface wlan0\nstatic ip_address=192.168.4.1/24\nnohook wpa_supplicant" | sudo tee -a /etc/dhcpcd.conf
  echo "[MMM-ReflektCompanionSetup] Added static IP config for wlan0."
else
  echo "[MMM-ReflektCompanionSetup] Static IP config for wlan0 already exists, skipping."
fi

# Fix DAEMON_CONF in /etc/default/hostapd to point to correct hostapd.conf path
echo "[MMM-ReflektCompanionSetup] Setting DAEMON_CONF in /etc/default/hostapd..."
sudo sed -i 's|^#\?DAEMON_CONF=.*|DAEMON_CONF="/etc/hostapd/hostapd.conf"|' /etc/default/hostapd

# Unmask, enable and start services
echo "[MMM-ReflektCompanionSetup] Enabling and starting hostapd and dnsmasq services..."
sudo systemctl unmask hostapd
sudo systemctl enable hostapd
sudo systemctl enable dnsmasq

sudo systemctl restart dhcpcd
sudo systemctl restart dnsmasq
sudo systemctl restart hostapd

# Check statuses
echo "[MMM-ReflektCompanionSetup] Checking service statuses..."
sudo systemctl status hostapd --no-pager
sudo systemctl status dnsmasq --no-pager

echo "[MMM-ReflektCompanionSetup] Setup complete."
