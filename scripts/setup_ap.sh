#!/bin/bash

echo "[MMM-ReflektCompanionSetup] Setting up Access Point..."

sudo apt-get update
sudo apt-get install -y hostapd dnsmasq

# Stop services before configuration
sudo systemctl stop hostapd
sudo systemctl stop dnsmasq

# Copy config files
sudo cp "$(pwd)/config/hostapd.conf" /etc/hostapd/hostapd.conf
sudo cp "$(pwd)/config/dnsmasq.conf" /etc/dnsmasq.conf

# Set static IP for wlan0
echo -e "\ninterface wlan0\n    static ip_address=192.168.4.1/24\n  nohook wpa_supplicant" | sudo tee -a /etc/dhcpcd.conf

# Point to hostapd config
sudo sed -i 's|#DAEMON_CONF=""|DAEMON_CONF="/etc/hostapd.conf"|' /etc/default/hostapd

#Enable services
sudo systemctl unmask hostapd
sudo systemctl enable hostapd
sudo systemctl enable dnsmasq
sudo systemctl restart dhcpcd
sudo systemctl start dnsmasq
sudo systemctl start hostapd

echo "[MMM-ReflektCompanionSetup] Setup complete."