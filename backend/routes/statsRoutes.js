const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getChainInfo } = require('../blockchain/rpcClient');

// GET /api/stats/network - Get network statistics
router.get('/network', async (req, res) => {
  try {
    // Get cached stats from database
    const stats = await db.query('SELECT * FROM network_stats WHERE id = 1');
    const statsData = stats[0] || { 
      total_blocks: 0, 
      total_transactions: 0,
      average_block_time: 0,
      active_validators: 0
    };
    
    // Get live chain info from node
    const chainInfo = await getChainInfo();
    const blockNumber = chainInfo?.blockNumber || chainInfo?.blocks || 0;
    
    // If the block count from the chain is higher than what we have in the DB,
    // we should update our local copy
    if (blockNumber > statsData.total_blocks) {
      try {
        await db.query(
          'UPDATE network_stats SET total_blocks = ? WHERE id = 1',
          [blockNumber]
        );
        // Update the local variable too
        statsData.total_blocks = blockNumber;
      } catch (err) {
        console.warn('Failed to update block count in database:', err.message);
      }
    }
    
    // Get active validators count
    let activeValidators = 0;
    try {
      const validatorsResult = await db.query('SELECT COUNT(*) as count FROM validators WHERE status = "active"');
      activeValidators = validatorsResult[0]?.count || 0;
    } catch (err) {
      console.warn('Failed to get active validators count:', err.message);
    }
    
    // Combine data - Handle Supereum's response format
    const networkStats = {
      blockNumber: blockNumber,
      difficulty: chainInfo?.difficulty || '0',
      // Ensure average_block_time is always a number
      average_block_time: parseFloat(statsData.average_block_time) || 15.0,
      total_blocks: parseInt(statsData.total_blocks) || 0,
      total_transactions: parseInt(statsData.total_transactions) || 0,
      active_validators: parseInt(activeValidators) || 0
    };
    
    res.json(networkStats);
  } catch (error) {
    console.error('Error fetching network stats:', error);
    res.status(500).json({ 
      blockNumber: 0,
      difficulty: '0',
      average_block_time: 15.0,
      total_blocks: 0,
      total_transactions: 0,
      active_validators: 0,
      error: 'Failed to fetch network stats'
    });
  }
});

// GET /api/stats/validators - Get validators list with stats
router.get('/validators', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // First check if validators table exists
    try {
      // Get validators sorted by blocks validated
      const validators = await db.query(
        `SELECT 
          validators.address, 
          validators.total_stake, 
          validators.blocks_validated,
          addresses.balance,
          addresses.tx_count
        FROM validators
        LEFT JOIN addresses ON validators.address = addresses.address
        ORDER BY validators.blocks_validated DESC
        LIMIT ? OFFSET ?`,
        [parseInt(limit), parseInt(offset)]
      );
      
      // Get total count for pagination
      const totalResult = await db.query('SELECT COUNT(*) as total FROM validators');
      const total = totalResult[0]?.total || 0;
      
      res.json({
        validators,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (err) {
      // Table may not exist yet, return empty result
      console.warn('Validators table may not exist yet:', err.message);
      res.json({
        validators: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0
        }
      });
    }
  } catch (error) {
    console.error('Error fetching validators:', error);
    res.status(500).json({ error: 'Failed to fetch validators' });
  }
});

// GET /api/stats/search - Unified search for blocks, transactions, or addresses
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const results = {
      type: null,
      data: null
    };
    
    try {
      // Check if query is a block hash
      if (/^0x[0-9a-fA-F]{64}$/.test(query)) {
        // Look for block hash
        const block = await db.query('SELECT number, hash FROM blocks WHERE hash = ?', [query]);
        
        if (block && block.length > 0) {
          results.type = 'block';
          results.data = block[0];
          return res.json(results);
        }
        
        // If not a block, check if it's a transaction
        const transaction = await db.query('SELECT id as hash FROM transactions WHERE id = ?', [query]);
        
        if (transaction && transaction.length > 0) {
          results.type = 'transaction';
          results.data = transaction[0];
          return res.json(results);
        }
      }
      
      // Check if query is a block number
      if (/^\d+$/.test(query)) {
        const blockNumber = parseInt(query);
        const block = await db.query('SELECT number, hash FROM blocks WHERE number = ?', [blockNumber]);
        
        if (block && block.length > 0) {
          results.type = 'block';
          results.data = block[0];
          return res.json(results);
        }
      }
      
      // Check if query is an address
      if (/^0x[0-9a-fA-F]{40}$/.test(query)) {
        const address = await db.query('SELECT address FROM addresses WHERE address = ?', [query]);
        
        if (address && address.length > 0) {
          results.type = 'address';
          results.data = address[0];
          return res.json(results);
        }
      }
    } catch (err) {
      // Tables may not exist yet
      console.warn('Search tables may not exist yet:', err.message);
    }
    
    // If we reach here, no results were found
    res.json({
      type: null,
      data: null,
      message: 'No results found'
    });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
});

module.exports = router; 