const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const url = require('url');
require('dotenv').config();

// Import routes
const blockRoutes = require('./routes/blockRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const addressRoutes = require('./routes/addressRoutes');
const statsRoutes = require('./routes/statsRoutes');

// Import blockchain client and data processor
const { connectWebSocket, syncInitialBlocks } = require('./blockchain/rpcClient');
const { processBlock, processTransactionByHash } = require('./blockchain/dataProcessor');
const { initializeDatabase } = require('./db/database');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/blocks', blockRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/stats', statsRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// WebSocket debug endpoint
app.get('/ws-debug', (req, res) => {
  res.json({
    clients: Array.from(clients.keys()),
    clientCount: clients.size,
    status: 'WebSocket server is running'
  });
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server for frontend real-time updates
const wss = new WebSocket.Server({ 
  noServer: true, // Use noServer mode to handle the upgrade manually
  // Add a heartbeat check to detect and remove stale connections
  clientTracking: true,
  // Increase timeout to avoid frequent disconnects
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    concurrencyLimit: 10
  }
});

// Handle upgrade manually to explicitly handle the /ws path
server.on('upgrade', function (request, socket, head) {
  const pathname = url.parse(request.url).pathname;
  
  // Only accept connections to the /ws endpoint
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, function done(ws) {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Connected clients with unique IDs for better tracking
const clients = new Map();

// Send ping to all clients every 30 seconds to keep connections alive
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    // Check if connection is still alive
    if (ws.isAlive === false) {
      const clientId = ws.id;
      console.log(`Client ${clientId} not responding, terminating connection`);
      clients.delete(clientId);
      return ws.terminate();
    }
    
    // Mark as inactive until pong is received
    ws.isAlive = false;
    // Send ping
    ws.ping();
  });
}, 30000);

// WebSocket connection handler
wss.on('connection', (ws, request) => {
  // Generate a unique client ID
  const clientId = uuidv4();
  ws.id = clientId;
  ws.isAlive = true;
  
  // Store client in the map
  clients.set(clientId, ws);
  
  console.log(`Frontend client connected (${clientId}). Total clients: ${clients.size}`);

  // Send initial connection message
  ws.send(JSON.stringify({
    event: 'connection',
    data: { 
      clientId,
      message: 'Connected to Supereum Explorer WebSocket server' 
    }
  }));

  // Handle pong responses to keep track of active connections
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  // Handle client messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (error) {
      console.error('Error processing client message:', error);
    }
  });

  // Handle client disconnection
  ws.on('close', () => {
    clients.delete(clientId);
    console.log(`Frontend client disconnected (${clientId}). Total clients: ${clients.size}`);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
  });
});

// Clean up interval when the server is shutting down
wss.on('close', () => {
  clearInterval(pingInterval);
});

// Broadcast to all connected clients
function broadcast(event, data) {
  const message = JSON.stringify({ event, data });
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error(`Error broadcasting to client ${client.id}:`, error);
      }
    }
  });
}

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database schema if needed
    await initializeDatabase();

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);

      // Sync initial blocks from the blockchain
      syncInitialBlocks().then(() => {
        console.log('Initial blocks synchronized, connecting WebSocket...');
        
        // Connect to blockchain node WebSocket
        connectWebSocket(
          // New block handler
          async (blockData) => {
            console.log('New block received in server.js handler:', blockData.hash);

            try {
              // Extract the hash from the notification
              const blockHash = blockData.hash;
              
              if (!blockHash) {
                console.error('Block notification missing hash:', blockData);
                return;
              }
              
              console.log(`About to call processBlock with hash: ${blockHash}`);
              
              // Process and store the block
              const block = await processBlock(blockHash);
              console.log(`processBlock returned:`, block ? `block ${block.number}` : 'null');
              
              if (block) {
                console.log(`Successfully processed and broadcasting block ${block.number} with hash ${block.hash}`);
                // Broadcast to connected frontend clients
                broadcast('new_block', {
                  number: typeof block.number === 'string' && block.number.startsWith('0x') ? 
                    parseInt(block.number, 16) : parseInt(block.number) || 0,
                  hash: block.hash,
                  miner: block.miner,
                  validator: block.validator,
                  txCount: block.transactions?.length || 0,
                  timestamp: block.timestamp
                });
              } else {
                console.error(`Failed to process block with hash ${blockHash}`);
              }
            } catch (error) {
              console.error('Error handling new block:', error);
            }
          },
          // New transaction handler
          async (txData) => {
            console.log('New transaction received:', txData.hash);

            try {
              // Process and store the transaction
              const tx = await processTransactionByHash(txData.hash);
              
              if (tx) {
                // Broadcast to connected frontend clients
                broadcast('new_transaction', {
                  hash: tx.hash,
                  from: tx.from,
                  to: tx.to,
                  value: tx.value / 1e18
                });
              }
            } catch (error) {
              console.error('Error handling new transaction:', error);
            }
          }
        );
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server
startServer(); 