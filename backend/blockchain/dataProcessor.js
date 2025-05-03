const { getBlockByHash, getTransactionByHash } = require('./rpcClient');
const db = require('../db/database');

// Process a new block and store it in the database
async function processBlock(blockHash) {
  try {
    console.log(`Processing block with hash: ${blockHash}`);
    const blockData = await getBlockByHash(blockHash);
    
    if (!blockData) {
      console.error(`Block not found with hash: ${blockHash}`);
      return null;
    }

    console.log(`getBlockByHash returned data for hash ${blockHash}:`, 
                typeof blockData === 'object' ? 'object' : typeof blockData);
    
    // Log the block format to understand structure
    console.log('Block data structure:', JSON.stringify(blockData).substring(0, 500) + '...');
    
    // Check if the block has a result property (Supereum RPC format)
    if (blockData.result && typeof blockData.result === 'object') {
      console.log('Block data is wrapped in a result property, extracting...');
      const blockResult = blockData.result;
      
      // Normalize Supereum block format
      const block = normalizeBlockData(blockResult);
      
      // Rest of processing code remains the same...
      const blockNumber = typeof block.number === 'string' && block.number.startsWith('0x') ?
        parseInt(block.number, 16) : parseInt(block.number);

      // Skip if block number is invalid
      if (isNaN(blockNumber)) {
        console.error(`Invalid block number for hash ${blockHash}: ${block.number}`);
        return null;
      }

      await db.withTransaction(async (connection) => {
        // Insert block
        await connection.execute(
          `INSERT INTO blocks (
            number, hash, previous_hash, timestamp, mined_by, validated_by, 
            difficulty, total_difficulty, is_pow, size, gas_used, gas_limit,
            nonce, merkle_root, state_root, receipts_root
          ) VALUES (?, ?, ?, FROM_UNIXTIME(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            previous_hash = VALUES(previous_hash),
            timestamp = VALUES(timestamp),
            mined_by = VALUES(mined_by),
            validated_by = VALUES(validated_by),
            difficulty = VALUES(difficulty),
            total_difficulty = VALUES(total_difficulty),
            is_pow = VALUES(is_pow),
            size = VALUES(size),
            gas_used = VALUES(gas_used),
            gas_limit = VALUES(gas_limit),
            nonce = VALUES(nonce),
            merkle_root = VALUES(merkle_root),
            state_root = VALUES(state_root),
            receipts_root = VALUES(receipts_root)`,
          [
            blockNumber,
            block.hash,
            block.parentHash,
            typeof block.timestamp === 'string' && block.timestamp.startsWith('0x') ? 
              parseInt(block.timestamp, 16) : parseInt(block.timestamp),
            block.miner, // PoW miner
            block.validator || null, // PoS validator if available
            typeof block.difficulty === 'string' && block.difficulty.startsWith('0x') ? 
              parseInt(block.difficulty, 16) : parseInt(block.difficulty || '0'),
            typeof block.totalDifficulty === 'string' && block.totalDifficulty.startsWith('0x') ?
              parseInt(block.totalDifficulty, 16) : parseInt(block.totalDifficulty || '0'),
            !block.validator, // is_pow true if no validator
            typeof block.size === 'string' && block.size.startsWith('0x') ? 
              parseInt(block.size, 16) : parseInt(block.size || '0'),
            typeof block.gasUsed === 'string' && block.gasUsed.startsWith('0x') ? 
              parseInt(block.gasUsed, 16) : parseInt(block.gasUsed || '0'),
            typeof block.gasLimit === 'string' && block.gasLimit.startsWith('0x') ? 
              parseInt(block.gasLimit, 16) : parseInt(block.gasLimit || '0'),
            block.nonce || null,
            block.merkleRoot || null,
            block.stateRoot || null,
            block.receiptsRoot || null
          ]
        );

        // Process transactions
        if (block.transactions && block.transactions.length) {
          for (const tx of block.transactions) {
            await processTransaction(tx, block, connection);
          }
        }
        
        // Update validator stats if it's a PoS block
        if (block.validator) {
          // First ensure the validator address exists in addresses table
          await connection.execute(
            `INSERT INTO addresses (address, balance, total_received, total_sent, tx_count)
             VALUES (?, 0, 0, 0, 0)
             ON DUPLICATE KEY UPDATE address = VALUES(address)`, 
            [block.validator]
          );
          
          // Now it's safe to update validators table
          await connection.execute(
            `INSERT INTO validators (address, blocks_validated) 
             VALUES (?, 1) 
             ON DUPLICATE KEY UPDATE blocks_validated = blocks_validated + 1`,
            [block.validator]
          );
        }

        // Update network stats
        await updateNetworkStats(connection);
      });

      console.log(`Successfully processed block ${block.number} (${blockHash})`);
      return block;
    } else {
      // Normalize Supereum block format
      const block = normalizeBlockData(blockData);
      
      // Add totalDifficulty if not present
      if (block.totalDifficulty === undefined) {
        block.totalDifficulty = block.difficulty || '0';
        console.log(`Added missing totalDifficulty to block ${block.number}`);
      }
      
      // Convert block number to integer - handle both hex and decimal formats
      const blockNumber = typeof block.number === 'string' && block.number.startsWith('0x') ?
        parseInt(block.number, 16) : parseInt(block.number);

      // Skip if block number is invalid
      if (isNaN(blockNumber)) {
        console.error(`Invalid block number for hash ${blockHash}: ${block.number}`);
        return null;
      }

      await db.withTransaction(async (connection) => {
        // Insert block
        await connection.execute(
          `INSERT INTO blocks (
            number, hash, previous_hash, timestamp, mined_by, validated_by, 
            difficulty, total_difficulty, is_pow, size, gas_used, gas_limit,
            nonce, merkle_root, state_root, receipts_root
          ) VALUES (?, ?, ?, FROM_UNIXTIME(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            previous_hash = VALUES(previous_hash),
            timestamp = VALUES(timestamp),
            mined_by = VALUES(mined_by),
            validated_by = VALUES(validated_by),
            difficulty = VALUES(difficulty),
            total_difficulty = VALUES(total_difficulty),
            is_pow = VALUES(is_pow),
            size = VALUES(size),
            gas_used = VALUES(gas_used),
            gas_limit = VALUES(gas_limit),
            nonce = VALUES(nonce),
            merkle_root = VALUES(merkle_root),
            state_root = VALUES(state_root),
            receipts_root = VALUES(receipts_root)`,
          [
            blockNumber,
            block.hash,
            block.parentHash,
            typeof block.timestamp === 'string' && block.timestamp.startsWith('0x') ? 
              parseInt(block.timestamp, 16) : parseInt(block.timestamp),
            block.miner, // PoW miner
            block.validator || null, // PoS validator if available
            typeof block.difficulty === 'string' && block.difficulty.startsWith('0x') ? 
              parseInt(block.difficulty, 16) : parseInt(block.difficulty || '0'),
            typeof block.totalDifficulty === 'string' && block.totalDifficulty.startsWith('0x') ?
              parseInt(block.totalDifficulty, 16) : parseInt(block.totalDifficulty || '0'),
            !block.validator, // is_pow true if no validator
            typeof block.size === 'string' && block.size.startsWith('0x') ? 
              parseInt(block.size, 16) : parseInt(block.size || '0'),
            typeof block.gasUsed === 'string' && block.gasUsed.startsWith('0x') ? 
              parseInt(block.gasUsed, 16) : parseInt(block.gasUsed || '0'),
            typeof block.gasLimit === 'string' && block.gasLimit.startsWith('0x') ? 
              parseInt(block.gasLimit, 16) : parseInt(block.gasLimit || '0'),
            block.nonce || null,
            block.merkleRoot || null,
            block.stateRoot || null,
            block.receiptsRoot || null
          ]
        );

        // Process transactions
        if (block.transactions && block.transactions.length) {
          for (const tx of block.transactions) {
            await processTransaction(tx, block, connection);
          }
        }
        
        // Update validator stats if it's a PoS block
        if (block.validator) {
          // First ensure the validator address exists in addresses table
          await connection.execute(
            `INSERT INTO addresses (address, balance, total_received, total_sent, tx_count)
             VALUES (?, 0, 0, 0, 0)
             ON DUPLICATE KEY UPDATE address = VALUES(address)`, 
            [block.validator]
          );
          
          // Now it's safe to update validators table
          await connection.execute(
            `INSERT INTO validators (address, blocks_validated) 
             VALUES (?, 1) 
             ON DUPLICATE KEY UPDATE blocks_validated = blocks_validated + 1`,
            [block.validator]
          );
        }

        // Update network stats
        await updateNetworkStats(connection);
      });

      console.log(`Successfully processed block ${block.number} (${blockHash})`);
      return block;
    }
  } catch (error) {
    console.error(`Error processing block ${blockHash}:`, error);
    throw error;
  }
}

// Helper function to normalize Supereum block format to our expected format
function normalizeBlockData(blockData) {
  // Debug the structure
  console.log('Normalizing block data, structure type:', typeof blockData);
  
  // Handle Supereum's specific block format
  if (blockData.header) {
    console.log('Block has header, processing Supereum format');
    // Extract data from header
    const header = blockData.header;
    const txList = blockData.body?.transactions?.txList || [];
    
    console.log(`Found ${txList.length} transactions in the block`);
    
    // Map transactions to our expected format
    const transactions = txList.map(tx => {
      console.log(`Processing transaction: ${tx.TransactionID}`);
      return {
        hash: tx.TransactionID,
        from: tx.Sender,
        to: tx.Receiver,
        value: tx.Amount,
        gas: tx.GasLimit || 0,
        gasPrice: tx.GasPrice || 0,
        gasUsed: tx.GasUsed || 0,
        timestamp: tx.Timestamp,
        type: tx.TxType,
        data: tx.Data,
        confirmed: true // Add confirmed status for transactions in block
      };
    });
    
    // Create normalized block format
    const normalizedBlock = {
      hash: blockData.hash,
      number: header.BlockNumber,
      parentHash: header.PreviousHash,
      timestamp: header.Timestamp,
      miner: header.MinedBy,
      validator: header.ValidatedBy,
      difficulty: header.Difficulty,
      totalDifficulty: blockData.cumulativeDifficulty || '0',
      size: blockData.size || 1000, // Default if not provided
      gasUsed: header.GasUsed,
      gasLimit: header.GasLimit,
      nonce: header.Nonce,
      merkleRoot: header.MerkleRoot,
      stateRoot: header.StateRoot,
      receiptsRoot: header.ReceiptsRoot,
      transactions: transactions
    };
    
    console.log(`Normalized block ${normalizedBlock.number} with hash ${normalizedBlock.hash} with nonce: ${normalizedBlock.nonce}, merkleRoot: ${normalizedBlock.merkleRoot}`);
    return normalizedBlock;
  }
  
  // If it's already in our expected format, return as is
  console.log('Block is in unknown format, returning as is');
  return blockData;
}

// Process a transaction and store it in the database
async function processTransaction(tx, block, connection) {
  try {
    // Convert block number to integer - handle both hex and decimal formats
    const blockNumber = typeof block.number === 'string' && block.number.startsWith('0x') ?
      parseInt(block.number, 16) : parseInt(block.number);
    
    // Convert timestamp to integer - handle both hex and decimal formats
    const timestamp = typeof block.timestamp === 'string' && block.timestamp.startsWith('0x') ?
      parseInt(block.timestamp, 16) : parseInt(block.timestamp);
    
    // Safely convert transaction value
    let txValue = 0;
    try {
      // First try to get value from tx.value, if not available, try tx.Amount (used in Supereum format)
      txValue = parseFloat(tx.value) || parseFloat(tx.Amount) || 0;
      console.log(`Parsed transaction value: ${txValue} from input: ${tx.value || tx.Amount}`);
    } catch (e) {
      console.warn(`Could not parse transaction value: ${tx.value || tx.Amount}`);
    }
    
    // Calculate gas fee safely
    let gasFee = 0;
    try {
      const gasPrice = parseFloat(tx.gasPrice) || 0;
      const gas = parseFloat(tx.gas) || 0;
      gasFee = (gasPrice * gas) / 1e9;
    } catch (e) {
      console.warn(`Could not calculate gas fee for transaction ${tx.hash}`);
    }
    
    // Create or update address records first to avoid foreign key issues
    // Add both sender and receiver addresses to ensure they exist
    if (tx.from) {
      await connection.execute(
        `INSERT INTO addresses (address, balance, total_sent, total_received, tx_count) 
         VALUES (?, 0, ?, 0, 1) 
         ON DUPLICATE KEY UPDATE 
           total_sent = total_sent + ?,
           tx_count = tx_count + 1`,
        [tx.from, txValue, txValue]
      );
    }

    if (tx.to) {
      await connection.execute(
        `INSERT INTO addresses (address, balance, total_received, total_sent, tx_count) 
         VALUES (?, ?, ?, 0, 1) 
         ON DUPLICATE KEY UPDATE 
           total_received = total_received + ?,
           tx_count = tx_count + 1`,
        [tx.to, txValue, txValue, txValue]
      );
    }
    
    // Determine transaction status
    // Check for status in tx.status, tx.confirmed, or default to 'confirmed'
    let status = 'unknown';
    if (tx.status) {
      status = tx.status;
    } else if (tx.confirmed !== undefined) {
      status = tx.confirmed === true ? 'confirmed' : 'failed';
    } else {
      // Default to confirmed for transactions in blocks
      status = 'confirmed';
    }
    
    console.log(`Setting transaction ${tx.hash} status to: ${status}`);
    
    // Now that addresses exist, insert transaction
    await connection.execute(
      `INSERT INTO transactions (
        id, block_number, block_hash, sender, receiver, amount, 
        gas_fee, tx_type, timestamp, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?), ?)
      ON DUPLICATE KEY UPDATE
        block_number = VALUES(block_number),
        block_hash = VALUES(block_hash),
        sender = VALUES(sender),
        receiver = VALUES(receiver),
        amount = VALUES(amount),
        gas_fee = VALUES(gas_fee),
        tx_type = VALUES(tx_type),
        timestamp = VALUES(timestamp),
        status = VALUES(status)`,
      [
        tx.hash,
        blockNumber,
        block.hash,
        tx.from,
        tx.to,
        txValue, // Do not divide by 1e18 - Supereum amounts are already in the correct units
        gasFee, // Calculated gas fee
        tx.type || 0,
        timestamp,
        status
      ]
    );

    console.log(`Processed transaction ${tx.hash}`);
    return true;
  } catch (error) {
    console.error(`Error processing transaction ${tx?.hash || 'unknown'}:`, error);
    return false;
  }
}

// Process a transaction by hash
async function processTransactionByHash(txHash) {
  try {
    console.log(`Processing transaction with hash: ${txHash}`);
    const tx = await getTransactionByHash(txHash);
    
    if (!tx) {
      console.error(`Transaction not found with hash: ${txHash}`);
      return null;
    }

    // Get the block this transaction belongs to
    const block = await getBlockByHash(tx.blockHash);
    
    if (!block) {
      console.error(`Block not found for transaction ${txHash}`);
      return null;
    }

    await db.withTransaction(async (connection) => {
      await processTransaction(tx, block, connection);
    });

    console.log(`Successfully processed transaction ${txHash}`);
    return tx;
  } catch (error) {
    console.error(`Error processing transaction ${txHash}:`, error);
    throw error;
  }
}

// Update network statistics
async function updateNetworkStats(connection) {
  try {
    // Get total blocks and transactions
    const [blockCountResult] = await connection.execute(
      'SELECT COUNT(*) as count FROM blocks'
    );
    const totalBlocks = blockCountResult[0].count;

    const [txCountResult] = await connection.execute(
      'SELECT COUNT(*) as count FROM transactions'
    );
    const totalTransactions = txCountResult[0].count;

    // Calculate average block time (based on last 100 blocks)
    const [blockTimesResult] = await connection.execute(
      `SELECT AVG(TIMESTAMPDIFF(SECOND, 
        (SELECT timestamp FROM blocks b2 WHERE b2.number = b1.number - 1), 
        b1.timestamp)) AS avg_time
      FROM blocks b1
      WHERE b1.number > 0
      ORDER BY b1.number DESC
      LIMIT 100`
    );
    const avgBlockTime = blockTimesResult[0].avg_time || 0;

    // Update network stats
    await connection.execute(
      `UPDATE network_stats 
       SET total_blocks = ?,
           total_transactions = ?,
           average_block_time = ?,
           last_updated = CURRENT_TIMESTAMP 
       WHERE id = 1`,
      [totalBlocks, totalTransactions, avgBlockTime]
    );

    console.log('Network stats updated');
  } catch (error) {
    console.error('Error updating network stats:', error);
    throw error;
  }
}

module.exports = {
  processBlock,
  processTransactionByHash
}; 