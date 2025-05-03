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

    if (/^0x[0-9a-fA-F]{64}$/.test(identifier)) {
      // It's a hash
      block = await db.query(
        `SELECT 
          number, hash, previous_hash as parentHash, 
          UNIX_TIMESTAMP(timestamp) as timestamp, 
          mined_by as miner, validated_by as validator,
          difficulty, is_pow as isPow, size, gas_used as gasUsed, gas_limit as gasLimit
        FROM blocks
        WHERE hash = ?`,
        [identifier]
      );
    } else {
      // It's a number
      const blockNumber = parseInt(identifier);
      if (isNaN(blockNumber)) {
        return res.status(400).json({ error: 'Invalid block identifier' });
      }
      
      block = await db.query(
        `SELECT 
          number, hash, previous_hash as parentHash, 
          UNIX_TIMESTAMP(timestamp) as timestamp, 
          mined_by as miner, validated_by as validator,
          difficulty, is_pow as isPow, size, gas_used as gasUsed, gas_limit as gasLimit
        FROM blocks
        WHERE number = ?`,
        [blockNumber]
      );
    }

    if (!block || block.length === 0) {
      return res.status(404).json({ error: 'Block not found' });
    }

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

    res.json(block[0]);
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