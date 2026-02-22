#!/bin/bash
# ============================================
# Shinde Mala ERP - Oracle Cloud Deploy Script
# ============================================
# Run this on your Oracle Cloud Ubuntu instance
# Usage: bash deploy.sh <YOUR_PUBLIC_IP>
# ============================================

set -e

PUBLIC_IP=${1:-"YOUR_PUBLIC_IP"}

echo "=========================================="
echo "  Shinde Mala ERP - Deployment Script"
echo "=========================================="

# Step 1: Install Docker and Docker Compose
echo ""
echo "[1/6] Installing Docker..."
if ! command -v docker &> /dev/null; then
    sudo apt update
    sudo apt install -y docker.io docker-compose-plugin
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER
    echo "  ✅ Docker installed. You may need to log out and back in for group changes."
else
    echo "  ✅ Docker already installed."
fi

# Check for docker compose (v2 plugin)
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo "  Installing docker-compose..."
    sudo apt install -y docker-compose
    COMPOSE_CMD="docker-compose"
fi

echo "  Using: $COMPOSE_CMD"

# Step 2: Clone or update the repository
echo ""
echo "[2/6] Setting up project files..."
if [ -d "ShindeMala" ]; then
    echo "  Project directory exists. Pulling latest..."
    cd ShindeMala
    git pull origin main 2>/dev/null || echo "  (git pull skipped)"
else
    echo "  Cloning repository..."
    git clone https://github.com/indra280301/ShindeMala.git
    cd ShindeMala
fi

# Step 3: Open firewall ports (Oracle Ubuntu uses iptables)
echo ""
echo "[3/6] Configuring firewall..."
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT -p tcp --dport 5001 -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT -p tcp --dport 3306 -j ACCEPT 2>/dev/null || true
echo "  ✅ Firewall ports 80, 5001, 3306 opened."

# Save iptables rules to persist across reboots
sudo sh -c 'iptables-save > /etc/iptables/rules.v4' 2>/dev/null || \
sudo apt install -y iptables-persistent 2>/dev/null && \
sudo sh -c 'iptables-save > /etc/iptables/rules.v4' 2>/dev/null || true

# Step 4: Build and start all containers
echo ""
echo "[4/6] Building Docker containers (this may take a few minutes)..."
sudo $COMPOSE_CMD down 2>/dev/null || true
sudo $COMPOSE_CMD build --no-cache
sudo $COMPOSE_CMD up -d

# Step 5: Wait for MySQL to be ready
echo ""
echo "[5/6] Waiting for MySQL to initialize..."
RETRIES=30
until sudo docker exec shinde_mala_db mysqladmin ping -h localhost -uroot -pShindeMala@2026Secure --silent 2>/dev/null; do
    RETRIES=$((RETRIES-1))
    if [ $RETRIES -le 0 ]; then
        echo "  ❌ MySQL did not start in time. Check logs: sudo docker logs shinde_mala_db"
        exit 1
    fi
    echo "  Waiting for MySQL... ($RETRIES attempts left)"
    sleep 5
done
echo "  ✅ MySQL is ready!"

# Step 6: Show status
echo ""
echo "[6/6] Checking container status..."
sudo docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=========================================="
echo "  🎉 DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "  Frontend: http://${PUBLIC_IP}"
echo "  Backend API: http://${PUBLIC_IP}:5001/api"
echo ""
echo "  Login with:"
echo "    Username: admin"
echo "    Password: (your admin password)"
echo ""
echo "  Useful commands:"
echo "    View logs:    sudo docker logs -f shinde_mala_backend"
echo "    Stop all:     sudo $COMPOSE_CMD down"
echo "    Restart all:  sudo $COMPOSE_CMD restart"
echo "    Rebuild:      sudo $COMPOSE_CMD up -d --build"
echo "=========================================="
