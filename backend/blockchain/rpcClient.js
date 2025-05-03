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
  console.log('Connecting to WebSocket with callbacks:',
              `blockCallback: ${typeof onBlockCallback}`,
              `txCallback: ${typeof onTxCallback}`);
  
  // Validate callbacks
  if (typeof onBlockCallback !== 'function') {
    console.error('Invalid block callback provided to connectWebSocket');
  }
  
  if (typeof onTxCallback !== 'function') {
    console.error('Invalid transaction callback provided to connectWebSocket');
  }
  
  if (ws) {
    console.log('Terminating existing WebSocket connection');
    ws.terminate();
  }

  console.log(`Connecting to WebSocket at ${WS_URL}`);
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

    // Create a bound version of the callbacks to ensure "this" context is preserved
    const boundBlockCallback = (data) => {
      console.log('Bound block callback executing with data:', JSON.stringify(data).substring(0, 100));
      return onBlockCallback(data);
    };
    
    const boundTxCallback = (data) => {
      console.log('Bound transaction callback executing with data:', JSON.stringify(data).substring(0, 100));
      return onTxCallback(data);
    };

    // Subscribe to new blocks with bound callback
    const blockSubId = subscribeToBlocks(boundBlockCallback);
    console.log(`Subscribed to new blocks with ID: ${blockSubId}`);

    // Subscribe to new transactions with bound callback
    const txSubId = subscribeToTransactions(boundTxCallback);
    console.log(`Subscribed to new transactions with ID: ${txSubId}`);
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('WebSocket message received:', JSON.stringify(message).substring(0, 300) + '...');
      
      // Handle subscription responses
      if (message.id && subscriptions.has(message.id)) {
        console.log(`Received response for subscription request ID: ${message.id}`);
        const { callback, type } = subscriptions.get(message.id);
        
        const permanentSubId = getSubscriptionId(message);
        
        if (permanentSubId) {
          console.log(`Subscription confirmed for ${type} with ID: ${permanentSubId}`);
          
          // Store the subscription with the new ID provided by the node
          subscriptions.set(permanentSubId, { callback, type });
          console.log(`Mapped subscription ID ${message.id} to permanent ID: ${permanentSubId}`);
          
          // Remove the temporary ID
          subscriptions.delete(message.id);
        } else if (message.error) {
          console.error(`Subscription for ${type} failed:`, JSON.stringify(message.error));
          subscriptions.delete(message.id);
        }
      }
      
      // Handle subscription notifications
      if (message.method === 'sup_subscription' && message.params) {
        console.log('Processing subscription notification:', JSON.stringify(message.params).substring(0, 300));
        
        // Get subscription ID using the helper function
        const subId = getSubscriptionId(message);
        console.log(`Extracted subscription ID: ${subId}`);
        
        if (subId && subscriptions.has(subId)) {
          console.log(`Found subscription handler for ID: ${subId}`);
          const { callback, type } = subscriptions.get(subId);
          console.log(`Subscription type: ${type}, callback type: ${typeof callback}`);
          
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
              
              // Safe callback execution
              if (typeof callback === 'function') {
                // This is the key part - we pass the hash to the callback which will trigger
                // the processBlock function to fetch the full block data and save it to the database
                callback(blockData);
                console.log(`Block callback called for hash: ${blockData.hash}`);
              } else {
                console.error(`Invalid callback for subscription ${subId}, type: ${typeof callback}`);
              }
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
  console.log(`Setting up block subscription with callback type: ${typeof callback}`);
  
  if (typeof callback !== 'function') {
    console.error('Invalid callback provided for block subscription:', callback);
    return -1; // Return negative ID to indicate error
  }
  
  const id = nextSubscriptionId++;
  subscriptions.set(id, { callback, type: 'new_blocks' });
  console.log(`Created subscription for new_blocks with ID: ${id}`);
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log(`Sending block subscription request with ID: ${id}`);
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      method: 'sup_subscribe',
      params: ['new_blocks'],
      id
    }));
  } else {
    console.error('WebSocket not connected, cannot subscribe to blocks');
  }
  
  return id;
}

function subscribeToTransactions(callback) {
  console.log(`Setting up transaction subscription with callback type: ${typeof callback}`);
  
  if (typeof callback !== 'function') {
    console.error('Invalid callback provided for transaction subscription:', callback);
    return -1; // Return negative ID to indicate error
  }
  
  const id = nextSubscriptionId++;
  subscriptions.set(id, { callback, type: 'new_transactions' });
  console.log(`Created subscription for new_transactions with ID: ${id}`);
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log(`Sending transaction subscription request with ID: ${id}`);
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      method: 'sup_subscribe',
      params: ['new_transactions'],
      id
    }));
  } else {
    console.error('WebSocket not connected, cannot subscribe to transactions');
  }
  
  return id;
}

// Block methods
async function getBlockByHash(hash) {
  try {
    console.log(`Fetching block with hash: ${hash}`);
    
    // Make the RPC call with detailed logging
    console.log(`Making RPC call to getBlockByHash with hash: ${hash}`);
    
    // Use axios directly but with the CORRECT format - params as object, not array
    const response = await rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'getBlockByHash',
      params: {
        hash: hash
      },
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
    
    // Make the RPC call with detailed logging
    console.log(`Making RPC call to getBlockByHeight with height: ${number}`);
    
    // Use axios directly with the CORRECT format - params as object, not array
    const response = await rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'getBlockByHeight',
      params: {
        height: parseInt(number)
      },
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
      console.error(`Empty result from RPC for block number: ${number}`);
      return null;
    }
    
    console.log(`Successfully fetched block with number: ${number}`);
    
    return response.data.result;
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
  try {
    console.log(`Fetching transaction with hash: ${hash}`);
    
    // Use axios directly with the CORRECT format - params as object, not array
    const response = await rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'getTransaction',
      params: {
        txid: hash
      },
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
      console.error(`Empty result from RPC for transaction hash: ${hash}`);
      return null;
    }
    
    console.log(`Successfully fetched transaction with hash: ${hash}`);
    
    // Normalize transaction data to match our expected format
    const rawTx = response.data.result;
    console.log(`Raw transaction data: ${JSON.stringify(rawTx).substring(0, 200)}...`);
    
    const normalizedTx = {
      // Map txid to hash if it exists
      hash: rawTx.txid || rawTx.TransactionID || rawTx.hash || hash,
      // Map other fields
      from: rawTx.from || rawTx.Sender || rawTx.sender || '',
      to: rawTx.to || rawTx.Receiver || rawTx.receiver || '',
      value: rawTx.amount || rawTx.Amount || rawTx.value || 0,
      blockHash: rawTx.blockHash || rawTx.BlockHash || '',
      blockNumber: rawTx.blockHeight || rawTx.BlockNumber || rawTx.blockNumber || 0,
      timestamp: rawTx.timestamp || rawTx.Timestamp || Math.floor(Date.now() / 1000),
      gasPrice: rawTx.GasPrice || rawTx.gasPrice || 0,
      gas: rawTx.GasLimit || rawTx.gas || 0,
      gasUsed: rawTx.GasUsed || rawTx.gasUsed || 0,
      nonce: rawTx.Nonce || rawTx.nonce || 0,
      // Important: Map confirmed field to status if it exists
      status: rawTx.status || (rawTx.confirmed === true ? 'confirmed' : 
                              rawTx.confirmed === false ? 'failed' : 'unknown'),
      fee: rawTx.fee || rawTx.Fee || rawTx.gas_fee || 0,
      type: rawTx.type || rawTx.Type || rawTx.TxType || '',
      data: rawTx.data || rawTx.Data || '',
      confirmed: rawTx.confirmed
    };
  
    
    console.log(`Normalized transaction: ${JSON.stringify(normalizedTx).substring(0, 200)}...`);
    return normalizedTx;
  } catch (error) {
    console.error(`Error fetching transaction by hash ${hash}:`, error.message);
    return null;
  }
}

// Address methods
async function getAddressBalance(address) {
  try {
    console.log(`Fetching balance for address: ${address}`);
    
    // First try using the callRpc function which handles response.data.result extraction
    try {
      const result = await callRpc('getBalance', { address });
      
      if (result !== null) {
        console.log(`Successfully fetched balance for address: ${address} using callRpc`);
        
        // Handle different result formats
        if (typeof result === 'object') {
          if (result.balance !== undefined) {
            const balance = parseFloat(result.balance);
            console.log(`Normalized balance for ${address}: ${balance} (from result.balance)`);
            return balance;
          }
        } else if (typeof result === 'number' || typeof result === 'string') {
          const balance = parseFloat(result);
          console.log(`Normalized balance for ${address}: ${balance} (from direct result)`);
          return balance;
        }
      }
      
      // If we got here, callRpc worked but we couldn't extract a balance
      console.log(`Couldn't extract balance from callRpc result for ${address}, falling back to direct RPC call`);
    } catch (callRpcError) {
      console.log(`Error using callRpc for ${address}, falling back to direct RPC call:`, callRpcError.message);
    }
    
    // If callRpc fails or returns an unprocessable result, fall back to direct axios call
    // Use axios directly with the CORRECT format - params as object, not array
    const response = await rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'getBalance',
      params: {
        address: address
      },
      id: Date.now()
    });
    
    // Check for response errors
    if (response.data.error) {
      console.error(`RPC Error:`, JSON.stringify(response.data.error));
      return null;
    }
    
    console.log(`Successfully fetched balance for address: ${address} using direct axios`);
    
    // Properly extract the balance value
    const result = response.data.result;
    
    // Handle different response formats
    if (result === null || result === undefined) {
      console.warn(`Received null/undefined balance for address ${address}`);
      return 0;
    }
    
    // The balance could be directly in result or in a balance property
    let balance = 0;
    
    if (typeof result === 'object') {
      // Check if result has a 'balance' property
      if (result.balance !== undefined) {
        balance = parseFloat(result.balance);
      } else if (result.amount !== undefined) {
        balance = parseFloat(result.amount);
      } else {
        // Try to get the first numeric property if specific fields aren't found
        for (const key in result) {
          if (!isNaN(parseFloat(result[key]))) {
            balance = parseFloat(result[key]);
            break;
          }
        }
      }
    } else if (typeof result === 'number' || typeof result === 'string') {
      // If result is directly a number or string that can be converted to a number
      balance = parseFloat(result);
    }
    
    console.log(`Normalized balance for ${address} from direct axios: ${balance}`);
    return balance;
  } catch (error) {
    console.error(`Error fetching balance for address ${address}:`, error.message);
    return null;
  }
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

// Helper to normalize subscription IDs from different message formats
function getSubscriptionId(message) {
  if (!message || typeof message !== 'object') return null;
  
  // Handle various subscription ID formats
  if (message.params?.subscription) return message.params.subscription;
  if (message.params?.subscription_id) return message.params.subscription_id;
  if (message.result && typeof message.result === 'string') return message.result;
  
  return null;
}

// Get blockchain validators
async function getValidators() {
  try {
    console.log('Fetching validators from blockchain');
    
    // Use axios directly with the CORRECT format
    const response = await rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'getValidators',
      params: {},
      id: Date.now()
    });
    
    console.log(`RPC response status for getValidators: ${response.status}`);
    
    // Check for response errors
    if (response.data.error) {
      console.error(`RPC Error in getValidators:`, JSON.stringify(response.data.error));
      return null;
    }
    
    // Check if we got a valid result
    if (!response.data.result) {
      console.error('Empty result from RPC for getValidators');
      return null;
    }
    
    console.log(`Successfully fetched validators, found ${response.data.result.validators?.length || 0} validators`);
    
    return response.data.result;
  } catch (error) {
    console.error('Error fetching validators:', error.message);
    return null;
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
  syncInitialBlocks,
  getValidators
}; 