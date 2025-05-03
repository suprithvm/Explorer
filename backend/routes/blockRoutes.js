const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getBlockByHash, getBlockByNumber } = require('../blockchain/rpcClient');

// GET /api/blocks - Get latest blocks with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Check if blocks table exists
    try {
      const blocks = await db.query(
        `SELECT 
          number, hash, previous_hash as parentHash, 
          UNIX_TIMESTAMP(timestamp) as timestamp, 
          mined_by as miner, validated_by as validator,
          difficulty, is_pow as isPow, size, gas_used as gasUsed, gas_limit as gasLimit,
          merkle_root as merkleRoot, state_root as stateRoot, receipts_root as receiptsRoot,
          nonce,
          (SELECT COUNT(*) FROM transactions WHERE block_number = blocks.number) as txCount
        FROM blocks
        ORDER BY number DESC
        LIMIT ? OFFSET ?`,
        [parseInt(limit), parseInt(offset)] // Explicitly parse as integers
      );

      // Get total count for pagination
      const totalResult = await db.query('SELECT COUNT(*) as total FROM blocks');
      const total = totalResult[0]?.total || 0;

      res.json({
        blocks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (tableError) {
      // Table may not exist yet
      console.warn('Blocks table may not exist yet:', tableError.message);
      res.json({
        blocks: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0
        }
      });
    }
  } catch (error) {
    console.error('Error fetching blocks:', error);
    res.status(500).json({ error: 'Failed to fetch blocks' });
  }
});

// GET /api/blocks/:identifier - Get a specific block by hash or number
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    let block;
    let blockFromRPC = null;

    console.log(`Fetching block with identifier: ${identifier}`);

    if (/^0x[0-9a-fA-F]{64}$/.test(identifier)) {
      // It's a hash
      console.log(`Identifier is a hash: ${identifier}`);
      block = await db.query(
        `SELECT 
          number, hash, previous_hash as parentHash, 
          UNIX_TIMESTAMP(timestamp) as timestamp, 
          mined_by as miner, validated_by as validator,
          difficulty, is_pow as isPow, size, gas_used as gasUsed, gas_limit as gasLimit,
          merkle_root as merkleRoot, state_root as stateRoot, receipts_root as receiptsRoot,
          nonce
        FROM blocks
        WHERE hash = ?`,
        [identifier]
      );
      
      // If not found in DB, try to get it from the blockchain node
      if (!block || block.length === 0) {
        console.log(`Block with hash ${identifier} not found in DB, fetching from node...`);
        blockFromRPC = await getBlockByHash(identifier);
      }
    } else {
      // It's a number
      const blockNumber = parseInt(identifier);
      console.log(`Identifier is a number: ${blockNumber}`);
      
      if (isNaN(blockNumber)) {
        console.error(`Invalid block identifier (not a number): ${identifier}`);
        return res.status(400).json({ error: 'Invalid block identifier' });
      }
      
      block = await db.query(
        `SELECT 
          number, hash, previous_hash as parentHash, 
          UNIX_TIMESTAMP(timestamp) as timestamp, 
          mined_by as miner, validated_by as validator,
          difficulty, is_pow as isPow, size, gas_used as gasUsed, gas_limit as gasLimit,
          merkle_root as merkleRoot, state_root as stateRoot, receipts_root as receiptsRoot,
          nonce
        FROM blocks
        WHERE number = ?`,
        [blockNumber]
      );

      console.log(`Query result for block number ${blockNumber}:`, block ? `Found ${block.length} blocks` : 'No result');

      // If not found in DB, try to get it from the blockchain node
    if (!block || block.length === 0) {
        console.log(`Block with number ${blockNumber} not found in DB, fetching from node...`);
        blockFromRPC = await getBlockByNumber(blockNumber);
        
        // Log RPC result
        if (blockFromRPC) {
          console.log(`Successfully fetched block ${blockNumber} from RPC`);
        } else {
          console.log(`Failed to fetch block ${blockNumber} from RPC`);
        }
      }
    }

    // If we found the block in the database
    if (block && block.length > 0) {
      console.log(`Returning block from database: ${block[0].number}`);

    // Get transactions for this block
    const transactions = await db.query(
      `SELECT 
        id as hash, sender as \`from\`, receiver as \`to\`, amount as value,
        gas_fee as gasPrice, tx_type as type, UNIX_TIMESTAMP(timestamp) as timestamp, status
      FROM transactions
      WHERE block_number = ?`,
      [block[0].number]
    );

    block[0].transactions = transactions;
      block[0].txCount = transactions.length;

      return res.json(block[0]);
    }
    
    // If we got the block from RPC, format it for the frontend
    if (blockFromRPC) {
      console.log(`Formatting RPC block data:`, JSON.stringify(blockFromRPC).substring(0, 200));
      
      // Store block in database for future requests
      try {
        // First check if block already exists in DB to avoid duplicates
        const existingBlock = await db.query('SELECT number FROM blocks WHERE number = ?', 
          [blockFromRPC.number || blockFromRPC.block_number || 0]);
        
        if (!existingBlock || existingBlock.length === 0) {
          console.log(`Storing new block in database`);
          
          // Format block data
          const blockData = {
            number: blockFromRPC.number || blockFromRPC.block_number || 0,
            hash: blockFromRPC.hash || '',
            previous_hash: blockFromRPC.parent_hash || blockFromRPC.parentHash || '',
            timestamp: blockFromRPC.timestamp || Math.floor(Date.now() / 1000),
            mined_by: blockFromRPC.miner || blockFromRPC.mined_by || '',
            validated_by: blockFromRPC.validator || blockFromRPC.validated_by || null,
            difficulty: blockFromRPC.difficulty || '0',
            total_difficulty: blockFromRPC.totalDifficulty || blockFromRPC.total_difficulty || '0',
            is_pow: blockFromRPC.is_pow || !blockFromRPC.validator,
            size: blockFromRPC.size || 0,
            gas_used: blockFromRPC.gas_used || blockFromRPC.gasUsed || 0,
            gas_limit: blockFromRPC.gas_limit || blockFromRPC.gasLimit || 0,
            nonce: blockFromRPC.nonce || (blockFromRPC.header?.Nonce) || (blockFromRPC.result?.header?.Nonce) || 0,
            merkle_root: blockFromRPC.merkleRoot || 
                         (blockFromRPC.header?.MerkleRoot) || 
                         (blockFromRPC.body?.transactions?.rootHash) || 
                         (blockFromRPC.result?.header?.MerkleRoot) || 
                         (blockFromRPC.result?.body?.transactions?.rootHash) || '',
            state_root: blockFromRPC.stateRoot || 
                        (blockFromRPC.header?.StateRoot) || 
                        (blockFromRPC.result?.header?.StateRoot) || '',
            receipts_root: blockFromRPC.receiptsRoot || 
                           (blockFromRPC.header?.ReceiptsRoot) || 
                           (blockFromRPC.result?.header?.ReceiptsRoot) || ''
          };
          
          // Insert block into database
          await db.query(
            `INSERT INTO blocks (
              number, hash, previous_hash, timestamp, mined_by, validated_by,
              difficulty, total_difficulty, is_pow, size, gas_used, gas_limit,
              merkle_root, state_root, receipts_root, nonce
            ) VALUES (?, ?, ?, FROM_UNIXTIME(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              hash = VALUES(hash),
              previous_hash = VALUES(previous_hash),
              timestamp = FROM_UNIXTIME(VALUES(timestamp)),
              nonce = VALUES(nonce)`,
            [
              blockData.number,
              blockData.hash,
              blockData.previous_hash,
              blockData.timestamp,
              blockData.mined_by,
              blockData.validated_by,
              blockData.difficulty,
              blockData.total_difficulty,
              blockData.is_pow ? 1 : 0,
              blockData.size,
              blockData.gas_used,
              blockData.gas_limit,
              blockData.merkle_root,
              blockData.state_root,
              blockData.receipts_root,
              blockData.nonce
            ]
          );
        }
      } catch (dbError) {
        console.error(`Error storing block in database:`, dbError);
        // Continue even if DB storage fails
      }
      
      // Format the block data to match our API's expected format
      const formattedBlock = {
        number: blockFromRPC.number || blockFromRPC.block_number || 0,
        hash: blockFromRPC.hash || '',
        parentHash: blockFromRPC.parent_hash || blockFromRPC.parentHash || '',
        timestamp: blockFromRPC.timestamp || Math.floor(Date.now() / 1000),
        miner: blockFromRPC.miner || blockFromRPC.mined_by || '',
        validator: blockFromRPC.validator || blockFromRPC.validated_by || '',
        difficulty: blockFromRPC.difficulty || 0,
        isPow: blockFromRPC.is_pow || false,
        size: blockFromRPC.size || 0,
        gasUsed: blockFromRPC.gas_used || blockFromRPC.gasUsed || 0,
        gasLimit: blockFromRPC.gas_limit || blockFromRPC.gasLimit || 0,
        nonce: blockFromRPC.nonce || (blockFromRPC.header?.Nonce) || (blockFromRPC.result?.header?.Nonce) || 0,
        merkleRoot: blockFromRPC.merkleRoot || 
                   (blockFromRPC.header?.MerkleRoot) || 
                   (blockFromRPC.body?.transactions?.rootHash) || 
                   (blockFromRPC.result?.header?.MerkleRoot) || 
                   (blockFromRPC.result?.body?.transactions?.rootHash) || '',
        stateRoot: blockFromRPC.stateRoot || 
                  (blockFromRPC.header?.StateRoot) || 
                  (blockFromRPC.result?.header?.StateRoot) || '',
        receiptsRoot: blockFromRPC.receiptsRoot || 
                     (blockFromRPC.header?.ReceiptsRoot) || 
                     (blockFromRPC.result?.header?.ReceiptsRoot) || '',
        transactions: blockFromRPC.transactions || [],
        txCount: blockFromRPC.transactions ? blockFromRPC.transactions.length : 0
      };
      
      console.log(`Returning formatted block from RPC: ${formattedBlock.number}`);
      return res.json(formattedBlock);
    }

    console.log(`Block not found for identifier: ${identifier}`);
    return res.status(404).json({ error: 'Block not found' });
  } catch (error) {
    console.error('Error fetching block:', error);
    res.status(500).json({ error: 'Failed to fetch block' });
  }
});

// GET /api/blocks/:hash/transactions - Get transactions for a specific block
router.get('/:identifier/transactions', async (req, res) => {
  try {
    const { identifier } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    let blockNumber;
    
    if (/^0x[0-9a-fA-F]{64}$/.test(identifier)) {
      // It's a hash
      const block = await db.query(
        'SELECT number FROM blocks WHERE hash = ?',
        [identifier]
      );
      
      if (!block || block.length === 0) {
        return res.status(404).json({ error: 'Block not found' });
      }
      
      blockNumber = block[0].number;
    } else {
      // It's a number
      blockNumber = parseInt(identifier);
      if (isNaN(blockNumber)) {
        return res.status(400).json({ error: 'Invalid block identifier' });
      }
      
      const block = await db.query(
        'SELECT number FROM blocks WHERE number = ?',
        [blockNumber]
      );
      
      if (!block || block.length === 0) {
        return res.status(404).json({ error: 'Block not found' });
      }
    }
    
    // Get transactions
    const transactions = await db.query(
      `SELECT 
        id as hash, block_number as blockNumber, sender as \`from\`, receiver as \`to\`,
        amount as value, gas_fee as gasPrice, tx_type as type, 
        UNIX_TIMESTAMP(timestamp) as timestamp, status
      FROM transactions
      WHERE block_number = ?
      LIMIT ? OFFSET ?`,
      [blockNumber, parseInt(limit), parseInt(offset)]
    );
    
    // Get total count for pagination
    const totalResult = await db.query(
      'SELECT COUNT(*) as total FROM transactions WHERE block_number = ?',
      [blockNumber]
    );
    const total = totalResult[0]?.total || 0;

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching block transactions:', error);
    res.status(500).json({ error: 'Failed to fetch block transactions' });
  }
});

module.exports = router; 