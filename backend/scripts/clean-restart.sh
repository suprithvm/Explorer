#!/bin/bash

echo "Stopping any running node processes..."
pkill -f "node server.js" || echo "No server processes found"

echo "Waiting for processes to stop..."
sleep 3

echo "Clearing any open WebSocket connections..."
# If netstat is available, it can show and help close open connections
if command -v netstat &> /dev/null; then
  echo "Checking for open WebSocket connections on port 3001..."
  netstat -tuln | grep ':3001'
fi

echo "Clearing port 3001 if in use..."
# Attempt to free up port 3001 if still in use
fuser -k 3001/tcp 2>/dev/null || echo "Port 3001 is free"

echo "Starting fresh server..."
cd /home/suprithvardhan/Desktop/hybridblockchain/Explorer/backend
npm start 