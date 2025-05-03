const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getAddressBalance } = require('../blockchain/rpcClient');

// GET /api/address/:address - Get address details
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Get address from database
    const [addressData] = await db.query(
      'SELECT address, balance, total_received, total_sent, tx_count FROM addresses WHERE address = ?',
      [address]
    );
    
    if (!addressData) {
      // Try to get live balance from blockchain node
      try {
        const balance = await getAddressBalance(address);
        // Address exists on chain but not in our db yet
        return res.json({
          address,
          balance: balance / 1e18, // Convert to SUP
          total_received: 0,
          total_sent: 0,
          tx_count: 0
        });
      } catch (error) {
        console.error('Error fetching address balance from node:', error);
        return res.status(404).json({ error: 'Address not found' });
      }
    }
    
    res.json(addressData);
  } catch (error) {
    console.error('Error fetching address:', error);
    res.status(500).json({ error: 'Failed to fetch address' });
  }
});

// GET /api/address/:address/transactions - Get transactions for an address
router.get('/:address/transactions', async (req, res) => {
  try {
    const { address } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Get transactions where address is sender or receiver
    const transactions = await db.query(
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
    
    // Get total count for pagination
    const [totalResult] = await db.query(
      'SELECT COUNT(*) as total FROM transactions WHERE sender = ? OR receiver = ?',
      [address, address]
    );
    const total = totalResult.total;
    
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
    console.error('Error fetching address transactions:', error);
    res.status(500).json({ error: 'Failed to fetch address transactions' });
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