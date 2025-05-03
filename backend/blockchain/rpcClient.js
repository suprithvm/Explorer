const axios = require('axios');
const WebSocket = require('ws');
require('dotenv').config();

// RPC Configuration
const RPC_URL = process.env.NODE_RPC_URL || 'http://localhost:8545';
const WS_URL = process.env.NODE_WS_URL || 'wss://localhost:8546';

// HTTP RPC Client
const rpcClient = axios.create({
  baseURL: RPC_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Make JSON-RPC call
async function callRpc(method, params = []) {
  try {
    console.log(`Making RPC call to method: ${method} with params: ${JSON.stringify(params)}`);
    
    const response = await rpcClient.post('', {
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now()
    });

    console.log(`RPC response for ${method}: Status ${response.status}`);
    
    // Check for errors in the response
    if (response.data.error) {
      console.error(`RPC Error in method ${method}:`, JSON.stringify(response.data.error));
      throw new Error(`RPC Error: ${JSON.stringify(response.data.error)}`);
    }
    
    // Check if result is present
    if (response.data.result === undefined) {
      console.warn(`RPC call to ${method} returned undefined result`);
      return null;
    }
    
    // Log result type
    console.log(`RPC call to ${method} returned ${typeof response.data.result} result`);
    
    return response.data.result;
  } catch (error) {
    console.error(`Error calling RPC method ${method}:`, error.message);
    if (error.response) {
      console.error(`RPC response data:`, JSON.stringify(error.response.data));
    }
    throw error;
  }
}

// WebSocket connection and subscription management
let ws = null;
let reconnectInterval = null;
const subscriptions = new Map();
let nextSubscriptionId = 1;
let usePolling = false;
let pollingInterval = null;
let lastBlockNumber = null;
let lastTxHashes = new Set();

function connectWebSocket(onBlockCallback, onTxCallback) {
  if (ws) {
    ws.terminate();
  }

  ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log('Connected to blockchain node WebSocket');
    clearInterval(reconnectInterval);
    
    // Clear polling if we were using it as a fallback
    if (usePolling && pollingInterval) {
      console.log('Switching from polling to WebSocket subscription');
      clearInterval(pollingInterval);
      usePolling = false;
    }

    // Subscribe to new blocks
    const blockSubId = subscribeToBlocks(onBlockCallback);
    console.log(`Subscribed to new blocks with ID: ${blockSubId}`);

    // Subscribe to new transactions
    const txSubId = subscribeToTransactions(onTxCallback);
    console.log(`Subscribed to new transactions with ID: ${txSubId}`);
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('WebSocket message received:', JSON.stringify(message).substring(0, 300) + '...');
      
      // Handle subscription responses
      if (message.id && subscriptions.has(message.id)) {
        const { callback, type } = subscriptions.get(message.id);
        if (message.result) {
          console.log(`Subscription confirmed for ${type} with ID: ${message.result}`);
          subscriptions.set(message.result, { callback, type });
          subscriptions.delete(message.id);
        }
      }
      
      // Handle subscription notifications
      if (message.method === 'sup_subscription' && message.params && message.params.subscription) {
        const subId = message.params.subscription;
        if (subscriptions.has(subId)) {
          const { callback, type } = subscriptions.get(subId);
          
          // Process the result based on Supereum's format
          const result = message.params.result;
          
          if (type === 'new_blocks' && result) {
            // Extract block data from Supereum format
            const blockData = {
              hash: result.block_hash || result.hash || '',
              number: result.block_number || result.number || 0,
              timestamp: result.timestamp || Math.floor(Date.now() / 1000)
            };
            
            console.log('Processed block notification:', blockData);
            
            // Immediately fetch full block data using the hash
            if (blockData.hash) {
              console.log(`Received new block notification with hash: ${blockData.hash}`);
              console.log(`About to call block callback with hash: ${blockData.hash}`);
              
              // Debug the callback type and existence
              console.log(`Callback type: ${typeof callback}`);
              console.log(`Is callback a function: ${typeof callback === 'function'}`);
              
              // This is the key part - we pass the hash to the callback which will trigger
              // the processBlock function to fetch the full block data and save it to the database
              callback(blockData);
              console.log(`Block callback called for hash: ${blockData.hash}`);
            } else {
              console.error('Block notification missing hash:', result);
            }
          } else if (type === 'new_transactions' && result) {
            // Extract transaction data from Supereum format
            const txData = {
              hash: result.hash || result.tx_hash || result.TransactionID || '',
            };
            
            console.log('Processed transaction notification:', txData);
            callback(txData);
          } else {
            callback(result);
          }
        }
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      console.error('Raw message data:', data.toString().substring(0, 500) + '...');
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    // If we get a connection refused, start polling immediately
    if (error.code === 'ECONNREFUSED') {
      startPolling(onBlockCallback, onTxCallback);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed. Reconnecting...');
    if (!reconnectInterval) {
      reconnectInterval = setInterval(() => {
        connectWebSocket(onBlockCallback, onTxCallback);
      }, 10000); // Retry every 10 seconds
      
      // Start polling as a fallback
      startPolling(onBlockCallback, onTxCallback);
    }
  });

  return ws;
}

// Fallback polling mechanism when WebSocket is unavailable
function startPolling(onBlockCallback, onTxCallback) {
  if (usePolling) return; // Already polling
  
  usePolling = true;
  console.log('WebSocket unavailable, falling back to HTTP polling');
  
  // Clear any existing polling interval
  if (pollingInterval) clearInterval(pollingInterval);
  
  // Poll for new blocks every 15 seconds
  pollingInterval = setInterval(async () => {
    try {
      // Get current block number
      const blockNumber = await callRpc('getBlockCount');
      
      // If this is our first poll or we have a new block
      if (lastBlockNumber === null || blockNumber !== lastBlockNumber) {
        console.log(`Polling detected new block: ${blockNumber} (previous: ${lastBlockNumber})`);
        
        // Get the new block
        const block = await getBlockByNumber(blockNumber);
        
        // Process only if it's a new block
        if (lastBlockNumber !== null) {
          // Call the callback with the block data
          onBlockCallback({
            hash: block.hash,
            number: block.number
          });
          
          // Process transactions
          if (block.transactions && block.transactions.length > 0) {
            const newTxs = block.transactions.filter(tx => !lastTxHashes.has(tx.hash));
            
            // Update transaction set
            lastTxHashes.clear();
            block.transactions.forEach(tx => lastTxHashes.add(tx.hash));
            
            // Call transaction callback for each new transaction
            for (const tx of newTxs) {
              onTxCallback({ hash: tx.hash });
            }
          }
        } else {
          // First run, just store transactions
          if (block.transactions) {
            block.transactions.forEach(tx => lastTxHashes.add(tx.hash));
          }
        }
        
        lastBlockNumber = blockNumber;
      }
    } catch (error) {
      console.error('Error during polling:', error);
    }
  }, 15000); // Poll every 15 seconds
}

function subscribeToBlocks(callback) {
  const id = nextSubscriptionId++;
  subscriptions.set(id, { callback, type: 'new_blocks' });
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      method: 'sup_subscribe',
      params: ['new_blocks'],
      id
    }));
  }
  
  return id;
}

function subscribeToTransactions(callback) {
  const id = nextSubscriptionId++;
  subscriptions.set(id, { callback, type: 'new_transactions' });
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      method: 'sup_subscribe',
      params: ['new_transactions'],
      id
    }));
  }
  
  return id;
}

// Block methods
async function getBlockByHash(hash) {
  try {
    console.log(`Fetching block with hash: ${hash}`);
    
    // For Supereum, we need to wrap the hash in an object
    const params = { hash };
    
    // Make the RPC call with detailed logging
    console.log(`Making RPC call to getBlockByHash with params: ${JSON.stringify(params)}`);
    
    // Use axios directly to have more control over the request
    const response = await rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'getBlockByHash',
      params: [params],
      id: Date.now()
    });
    
    console.log(`RPC response status: ${response.status}`);
    
    // Check for response errors
    if (response.data.error) {
      console.error(`RPC Error:`, JSON.stringify(response.data.error));
      return null;
    }
    
    // Check if we got a valid result
    if (!response.data.result) {
      console.error(`Empty result from RPC for hash: ${hash}`);
      return null;
    }
    
    console.log(`Successfully fetched block with hash: ${hash}`);
    console.log(`Block data structure (partial): ${JSON.stringify(response.data.result).substring(0, 200)}...`);
    
    return response.data.result;
  } catch (error) {
    console.error(`Error fetching block by hash ${hash}:`, error.message);
    console.error(`Stack trace:`, error.stack);
    return null;
  }
}

async function getBlockByNumber(number) {
  try {
    console.log(`Fetching block with number: ${number}`);
    
    // For Supereum, we need to use height instead of number
    const params = { height: parseInt(number) };
    
    const result = await callRpc('getBlockByHeight', [params]);
    console.log(`Successfully fetched block with number: ${number}`);
    
    return result;
  } catch (error) {
    console.error(`Error fetching block by number ${number}:`, error.message);
    return null;
  }
}

async function getLatestBlocks(limit = 10) {
  try {
    const blockNumber = await callRpc('getBlockCount');
    console.log(`Latest block number: ${blockNumber}`);
    
    const blocks = [];
    
    // Get blocks from newest to oldest
    for (let i = 0; i < limit && blockNumber - i >= 0; i++) {
      try {
        const block = await getBlockByNumber(blockNumber - i);
        if (block) {
          blocks.push(block);
        }
      } catch (err) {
        console.warn(`Error fetching block ${blockNumber - i}:`, err.message);
      }
    }
    
    return blocks;
  } catch (error) {
    console.error('Error fetching latest blocks:', error.message);
    return [];
  }
}

// Transaction methods
async function getTransactionByHash(hash) {
  return callRpc('getTransaction', [{ txid: hash }]);
}

// Address methods
async function getAddressBalance(address) {
  return callRpc('getBalance', [{ address }]);
}

// Chain info
async function getChainInfo() {
  try {
    // Try to get chain info directly
    const chainInfo = await callRpc('getChainInfo', []);
    return chainInfo;
  } catch (error) {
    // If direct getChainInfo fails, build it from separate calls
    try {
      const blockNumber = await callRpc('getBlockCount');
      const latestBlock = await getBlockByNumber(blockNumber);
      
      return {
        blockNumber,
        difficulty: latestBlock?.difficulty || '0x0',
        timestamp: latestBlock?.timestamp || '0x0'
      };
    } catch (innerError) {
      console.error('Error getting chain info:', innerError);
      return {
        blockNumber: 0,
        difficulty: '0x0',
        timestamp: '0x0'
      };
    }
  }
}

// Fetch and process the chain's initial blocks
async function syncInitialBlocks() {
  try {
    console.log('Synchronizing initial blocks...');
    const { processBlock } = require('./dataProcessor'); // Import here to avoid circular dependencies
    
    // Get current block number from the node
    const blockNumber = await callRpc('getBlockCount');
    
    if (blockNumber === 0 || blockNumber === '0x0') {
      console.log('No blocks available on the chain yet');
      return;
    }

    // For blocks 0 to min(blockNumber, 10), get and process each block
    const maxBlocksToSync = Math.min(parseInt(blockNumber), 10);
    
    console.log(`Syncing the first ${maxBlocksToSync} blocks...`);
    
    for (let i = 0; i <= maxBlocksToSync; i++) {
      try {
        console.log(`Fetching block ${i}...`);
        const block = await getBlockByNumber(i);
        
        if (block && block.hash) {
          await processBlock(block.hash);
          console.log(`Processed block ${i}`);
        } else {
          console.warn(`Could not fetch block ${i}`);
        }
      } catch (err) {
        console.error(`Error processing block ${i}:`, err);
        // Continue with the next block even if one fails
      }
    }
    
    console.log('Initial block synchronization completed');
  } catch (error) {
    console.error('Error syncing initial blocks:', error);
  }
}

module.exports = {
  callRpc,
  connectWebSocket,
  getBlockByHash,
  getBlockByNumber,
  getLatestBlocks,
  getTransactionByHash,
  getAddressBalance,
  getChainInfo,
  syncInitialBlocks
}; 