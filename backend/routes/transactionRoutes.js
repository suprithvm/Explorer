const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getTransactionByHash } = require('../blockchain/rpcClient');

// GET /api/transactions - Get latest transactions with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Check if transactions table exists
    try {
      // Fix: Escape reserved SQL keywords with backticks
      const transactions = await db.query(
        `SELECT 
          id as hash, block_number as blockNumber, block_hash as blockHash,
          sender as \`from\`, receiver as \`to\`, amount as value,
          gas_fee as gasPrice, tx_type as type, UNIX_TIMESTAMP(timestamp) as timestamp, status
        FROM transactions
        ORDER BY block_number DESC, id
        LIMIT ? OFFSET ?`,
        [parseInt(limit), parseInt(offset)] // Fix: Ensure parameters are integers
      );

      // Get total count for pagination
      const totalResult = await db.query('SELECT COUNT(*) as total FROM transactions');
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
    } catch (tableError) {
      // Table may not exist yet
      console.warn('Transactions table may not exist yet:', tableError.message);
      res.json({
        transactions: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0
        }
      });
    }
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/transactions/:hash - Get a specific transaction by hash
router.get('/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    
    const transaction = await db.query(
      `SELECT 
        id as hash, block_number as blockNumber, block_hash as blockHash,
        sender as \`from\`, receiver as \`to\`, amount as value,
        gas_fee as gasPrice, tx_type as type, UNIX_TIMESTAMP(timestamp) as timestamp, status
      FROM transactions
      WHERE id = ?`,
      [hash]
    );

    if (!transaction || transaction.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Get block info
    const block = await db.query(
      `SELECT 
        number, hash, UNIX_TIMESTAMP(timestamp) as timestamp,
        mined_by as miner, is_pow as isPow
      FROM blocks
      WHERE number = ?`,
      [transaction[0].blockNumber]
    );

    transaction[0].block = block.length > 0 ? block[0] : null;

    res.json(transaction[0]);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// GET /api/transactions/search - Search transactions
router.get('/search', async (req, res) => {
  try {
    const { sender, receiver, min_amount, max_amount } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Fix: Escape reserved SQL keywords with backticks
    let query = `
      SELECT 
        id as hash, block_number as blockNumber, block_hash as blockHash,
        sender as \`from\`, receiver as \`to\`, amount as value,
        gas_fee as gasPrice, tx_type as type, UNIX_TIMESTAMP(timestamp) as timestamp, status
      FROM transactions
      WHERE 1=1
    `;
    
    const queryParams = [];
    
    if (sender) {
      query += ' AND sender = ?';
      queryParams.push(sender);
    }
    
    if (receiver) {
      query += ' AND receiver = ?';
      queryParams.push(receiver);
    }
    
    if (min_amount) {
      query += ' AND amount >= ?';
      queryParams.push(parseFloat(min_amount));
    }
    
    if (max_amount) {
      query += ' AND amount <= ?';
      queryParams.push(parseFloat(max_amount));
    }
    
    query += ' ORDER BY block_number DESC, id LIMIT ? OFFSET ?';
    queryParams.push(parseInt(limit), parseInt(offset));

    const transactions = await db.query(query, queryParams);

    // Count query for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM transactions
      WHERE 1=1
    `;
    
    const countParams = [];
    
    if (sender) {
      countQuery += ' AND sender = ?';
      countParams.push(sender);
    }
    
    if (receiver) {
      countQuery += ' AND receiver = ?';
      countParams.push(receiver);
    }
    
    if (min_amount) {
      countQuery += ' AND amount >= ?';
      countParams.push(parseFloat(min_amount));
    }
    
    if (max_amount) {
      countQuery += ' AND amount <= ?';
      countParams.push(parseFloat(max_amount));
    }

    const totalResult = await db.query(countQuery, countParams);
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
    console.error('Error searching transactions:', error);
    res.status(500).json({ error: 'Failed to search transactions' });
  }
});

module.exports = router; 