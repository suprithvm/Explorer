#!/bin/bash

echo "========== FLUSHING DATABASE AND RESTARTING EXPLORER BACKEND =========="
echo "Stopping any running node processes..."
pkill -f "node server.js" || echo "No server processes found"

echo "Waiting for processes to stop..."
sleep 2

cd /home/suprithvardhan/Desktop/hybridblockchain/Explorer/backend

echo "Flushing database tables..."
node scripts/flush-db.js

echo "Starting the server with fixed RPC calls..."
npm start 