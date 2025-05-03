#!/bin/bash

echo "Stopping any running node processes..."
pkill -f "node server.js" || echo "No server processes found"

echo "Waiting for processes to stop..."
sleep 2

echo "Starting the server..."
cd /home/suprithvardhan/Desktop/hybridblockchain/Explorer/backend
npm start 