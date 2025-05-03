const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getAddressBalance, callRpc } = require('../blockchain/rpcClient');

// GET /api/address/:address - Get address details
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    let addressData = null;
    
    // First check if the address exists in our database
    const [dbAddressData] = await db.query(
      'SELECT address, balance, total_received, total_sent, tx_count FROM addresses WHERE address = ?',
      [address]
    );
    
    console.log(`Fetching data for address: ${address}, exists in DB: ${!!dbAddressData}`);
    
    // Regardless of whether it exists in DB or not, fetch the latest data from RPC
    try {
      // Get address data from blockchain node
      const { callRpc } = require('../blockchain/rpcClient');
      
      // First, try to get the account state which has comprehensive data
      let rpcAddressData = await callRpc('getAccountState', { address });
      
      // If response has a nested result structure, use that
      if (rpcAddressData && rpcAddressData.result && typeof rpcAddressData.result === 'object') {
        console.log(`RPC response has a nested result structure for ${address}`);
        rpcAddressData = rpcAddressData.result;
      }
      
      // If that doesn't work, fall back to wallet info
      if (!rpcAddressData) {
        rpcAddressData = await callRpc('getWalletInfo', { address });
      }
      
      // If that still doesn't work, just get balance directly
      if (!rpcAddressData) {
        const balance = await getAddressBalance(address);
        console.log(`Direct balance query for ${address} returned: ${balance}`);
        
        if (balance !== null) {
          rpcAddressData = {
            address,
            balance: balance,
            nonce: 0,
            transactions: 0
          };
        }
      } else {
        // We got data, but ensure balance is correctly parsed
        if (typeof rpcAddressData === 'object') {
          // Try to extract balance from various possible fields
          if (rpcAddressData.balance === undefined || rpcAddressData.balance === null || rpcAddressData.balance === 0) {
            // If no balance in the response, fetch it directly
            const directBalance = await getAddressBalance(address);
            if (directBalance !== null && directBalance > 0) {
              rpcAddressData.balance = directBalance;
            }
          } else if (typeof rpcAddressData.balance === 'string') {
            // Convert string balance to number
            rpcAddressData.balance = parseFloat(rpcAddressData.balance);
          }
          
          // Also handle nonce or transactions count
          if (rpcAddressData.utxoCount) {
            rpcAddressData.transactions = rpcAddressData.utxoCount;
          }
        }
      }
      
      // If we got data from RPC, update or insert into the database
      if (rpcAddressData) {
        console.log(`Got RPC data for address ${address}: ${JSON.stringify(rpcAddressData).substring(0, 200)}`);
        
        // Extract the data we need
        // Make sure balance is a number and not "0" or some other string
        const balance = typeof rpcAddressData.balance === 'string' 
          ? parseFloat(rpcAddressData.balance) 
          : (rpcAddressData.balance || 0);
        
        console.log(`Extracted balance for ${address}: ${balance}`);
        
        const txCount = rpcAddressData.transactions || rpcAddressData.nonce || 0;
        
        // Update or insert into the database
        if (dbAddressData) {
          // Update existing record - IMPORTANT: Use the RPC balance instead of calculating
          await db.query(
            `UPDATE addresses SET 
              balance = ?, 
              tx_count = ?,
              last_updated = CURRENT_TIMESTAMP
            WHERE address = ?`,
            [balance, txCount > dbAddressData.tx_count ? txCount : dbAddressData.tx_count, address]
          );
        } else {
          // Insert new record
          await db.query(
            `INSERT INTO addresses (
              address, balance, total_received, total_sent, tx_count
            ) VALUES (?, ?, 0, 0, ?)`,
            [address, balance, txCount]
          );
        }
        
        // Set the data to return
        addressData = {
          address,
          balance: balance,
          total_received: dbAddressData?.total_received || 0,
          total_sent: dbAddressData?.total_sent || 0,
          tx_count: txCount > (dbAddressData?.tx_count || 0) ? txCount : (dbAddressData?.tx_count || 0),
          isValidator: rpcAddressData.isValidator || false,
          isActiveValidator: rpcAddressData.isActiveValidator || false,
          stakedAmount: rpcAddressData.staking?.stake || 0
        };
      } else if (dbAddressData) {
        // If RPC call failed but we have data in DB, use that
        addressData = dbAddressData;
      } else {
        // If both RPC and DB failed, return error
        return res.status(404).json({ error: 'Address not found' });
      }
    } catch (rpcError) {
      console.error(`Error fetching address data from RPC for ${address}:`, rpcError);
      
      // If RPC call failed but we have data in DB, use that
      if (dbAddressData) {
        addressData = dbAddressData;
      } else {
        // Both RPC and DB failed
        return res.status(404).json({ error: 'Address not found' });
      }
    }
    
    // Return the data to the frontend
    res.json(addressData);
  } catch (error) {
    console.error('Error handling address request:', error);
    res.status(500).json({ error: 'Failed to fetch address data' });
  }
});

// GET /api/address/:address/transactions - Get transactions for an address
router.get('/:address/transactions', async (req, res) => {
  try {
    const { address } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    console.log(`Fetching transactions for address: ${address}, page: ${page}, limit: ${limit}`);
    
    // Get transactions from database first
    let dbTransactions = await db.query(
      `SELECT 
        id as hash, block_number as blockNumber, block_hash as blockHash,
        sender as from, receiver as to, amount as value,
        gas_fee as gasPrice, tx_type as type, UNIX_TIMESTAMP(timestamp) as timestamp, status,
        CASE 
          WHEN sender = ? THEN 'out' 
          WHEN receiver = ? THEN 'in' 
        END as direction
      FROM transactions
      WHERE sender = ? OR receiver = ?
      ORDER BY block_number DESC, id
      LIMIT ? OFFSET ?`,
      [address, address, address, address, limit, offset]
    );
    
    // Normalize status values for DB transactions
    for (const tx of dbTransactions) {
      if (tx.status === 'true' || tx.status === true) {
        tx.status = 'confirmed';
      } else if (tx.status === 'false' || tx.status === false) {
        tx.status = 'failed';
      } else if (!tx.status) {
        tx.status = 'unknown';
      }
    }
    
    console.log(`Found ${dbTransactions.length} transactions in database for address ${address}`);
    
    // Always try to get the latest transactions from RPC
    let rpcTransactions = [];
    try {
      // Use RPC to get transaction history - callRpc is already imported at the top
      const rpcTxResponse = await callRpc('getTransactionHistory', {
        address: address,
        limit: limit * 2, // Get more to account for new transactions
        offset: 0, // Always get latest
        sortDesc: true
      });
      
      if (rpcTxResponse && rpcTxResponse.transactions && Array.isArray(rpcTxResponse.transactions)) {
        console.log(`Found ${rpcTxResponse.transactions.length} transactions from RPC for address ${address}`);
        
        // Format transactions from RPC
        rpcTransactions = rpcTxResponse.transactions.map(tx => ({
          hash: tx.txid || tx.hash || '',
          blockNumber: tx.blockHeight || 0,
          blockHash: tx.blockHash || '',
          from: tx.sender || '',
          to: tx.receiver || '',
          value: tx.amount || 0,
          gasPrice: tx.fee || 0,
          type: tx.type || '',
          timestamp: tx.timestamp || 0,
          status: tx.confirmations > 0 ? 'confirmed' : 'pending',
          direction: address === tx.sender ? 'out' : 'in'
        }));
        
        // Store new transactions in the database
        for (const tx of rpcTransactions) {
          if (tx.hash && tx.blockNumber > 0) {
            // Check if transaction already exists in DB
            const [existingTx] = await db.query(
              'SELECT id FROM transactions WHERE id = ?',
              [tx.hash]
            );
            
            if (!existingTx) {
              console.log(`Storing new transaction ${tx.hash} in database`);
              
              // Insert transaction
              await db.query(
                `INSERT INTO transactions (
                  id, block_number, block_hash, sender, receiver, 
                  amount, gas_fee, tx_type, timestamp, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?), ?)
                ON DUPLICATE KEY UPDATE
                  block_number = VALUES(block_number),
                  block_hash = VALUES(block_hash),
                  timestamp = VALUES(timestamp),
                  status = VALUES(status)`,
                [
                  tx.hash,
                  tx.blockNumber,
                  tx.blockHash,
                  tx.from,
                  tx.to,
                  tx.value,
                  tx.gasPrice,
                  tx.type,
                  tx.timestamp,
                  tx.status === 'confirmed' ? 1 : 0
                ]
              );
              
              // Update sender address - subtract from balance
              if (tx.from) {
                await db.query(
                  `INSERT INTO addresses (address, balance, total_sent, total_received, tx_count) 
                   VALUES (?, ?, ?, 0, 1) 
                   ON DUPLICATE KEY UPDATE 
                     total_sent = total_sent + ?,
                     balance = balance - ?,
                     tx_count = tx_count + 1`,
                  [tx.from, -tx.value, tx.value, tx.value, tx.value]
                );
              }
              
              // Update receiver address - add to balance
              if (tx.to) {
                await db.query(
                  `INSERT INTO addresses (address, balance, total_received, total_sent, tx_count) 
                   VALUES (?, ?, ?, 0, 1) 
                   ON DUPLICATE KEY UPDATE 
                     total_received = total_received + ?,
                     balance = balance + ?,
                     tx_count = tx_count + 1`,
                  [tx.to, tx.value, tx.value, tx.value, tx.value]
                );
              }
            }
          }
        }
      }
    } catch (rpcError) {
      console.error('Error fetching transactions from RPC:', rpcError);
      // Continue with DB results if RPC fails
    }
    
    // Merge and deduplicate transactions from DB and RPC
    const allTransactions = [...dbTransactions];
    const existingTxHashes = new Set(dbTransactions.map(tx => tx.hash));
    
    // Add RPC transactions that don't exist in DB result
    for (const tx of rpcTransactions) {
      if (!existingTxHashes.has(tx.hash)) {
        allTransactions.push(tx);
      }
    }
    
    // Sort by block number and timestamp (descending)
    allTransactions.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) {
        return b.blockNumber - a.blockNumber;
      }
      return b.timestamp - a.timestamp;
    });
    
    // Apply pagination
    const paginatedTransactions = allTransactions.slice(0, limit);
    
    // Get total count for pagination
    let total = allTransactions.length;
    try {
      // This now becomes an estimate since we're merging with RPC data
      const [totalResult] = await db.query(
        'SELECT COUNT(*) as total FROM transactions WHERE sender = ? OR receiver = ?',
        [address, address]
      );
      // Use the higher value between DB count and our merged count
      total = Math.max(totalResult ? totalResult.total : 0, total);
    } catch (countError) {
      console.error('Error getting transaction count:', countError);
    }
    
    // Return the merged results
    res.json({
      transactions: paginatedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: (page * limit) < total
      }
    });
  } catch (error) {
    console.error('Error fetching address transactions:', error);
    // Even on error, return a valid response structure to avoid frontend errors
    res.json({
      transactions: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false
      }
    });
  }
});

// GET /api/address/:address/blocks - Get blocks validated by an address (for validators)
router.get('/:address/blocks', async (req, res) => {
  try {
    const { address } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Get blocks validated by this address
    const blocks = await db.query(
      `SELECT 
        number, hash, previous_hash as parentHash, 
        UNIX_TIMESTAMP(timestamp) as timestamp, 
        difficulty, size, gas_used as gasUsed,
        (SELECT COUNT(*) FROM transactions WHERE block_number = blocks.number) as txCount
      FROM blocks
      WHERE validated_by = ? OR mined_by = ?
      ORDER BY number DESC
      LIMIT ? OFFSET ?`,
      [address, address, limit, offset]
    );
    
    // Get total count for pagination
    const [totalResult] = await db.query(
      'SELECT COUNT(*) as total FROM blocks WHERE validated_by = ? OR mined_by = ?',
      [address, address]
    );
    const total = totalResult.total;
    
    // Get validator stats if applicable
    const [validator] = await db.query(
      'SELECT * FROM validators WHERE address = ?',
      [address]
    );
    
    res.json({
      blocks,
      validator: validator || null,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching address blocks:', error);
    res.status(500).json({ error: 'Failed to fetch address blocks' });
  }
});

module.exports = router; 