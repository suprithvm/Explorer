const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { getChainInfo, getValidators } = require('../blockchain/rpcClient');

// Cache for validators data
let validatorsCache = {
  data: null,
  lastUpdated: null
};

// Update interval in milliseconds (2 minutes)
const VALIDATOR_UPDATE_INTERVAL = 2 * 60 * 1000;

// Function to sync validators to the database
async function syncValidatorsToDb(validatorsRPC) {
  if (!validatorsRPC || !validatorsRPC.validators || !validatorsRPC.validators.length) {
    console.log('No validators to sync');
    return;
  }

  console.log(`Found ${validatorsRPC.validators.length} validators from RPC, syncing to database`);
  
  try {
    await db.withTransaction(async (connection) => {
      for (const validator of validatorsRPC.validators) {
        // Update or insert validator
        await connection.execute(
          `INSERT INTO validators (
            address, status, total_stake, blocks_validated, blocks_proposed,
            missed_validations, uptime, score, host_id, is_validator,
            last_active, last_reward_time, start_time, last_updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            total_stake = VALUES(total_stake),
            blocks_validated = VALUES(blocks_validated),
            blocks_proposed = VALUES(blocks_proposed),
            missed_validations = VALUES(missed_validations),
            uptime = VALUES(uptime),
            score = VALUES(score),
            host_id = VALUES(host_id),
            is_validator = VALUES(is_validator),
            last_active = VALUES(last_active),
            last_reward_time = VALUES(last_reward_time),
            last_updated = NOW()`,
          [
            validator.address,
            validator.status || 0,
            validator.stake?.amount || 0,
            validator.performance?.blocksValidated || 0,
            validator.performance?.blocksProposed || 0,
            validator.performance?.missedValidations || 0,
            validator.performance?.uptimePercentage || 100,
            validator.score || 0,
            validator.stake?.hostID || null,
            validator.stake?.isValidator || true,
            validator.lastActive ? new Date(validator.lastActive) : null,
            validator.stake?.lastRewardTime ? new Date(validator.stake.lastRewardTime) : null,
            validator.stake?.startTime ? new Date(validator.stake.startTime) : null
          ]
        );
      }
      
      // Calculate voting power percentages
      await connection.execute(
        `UPDATE validators
         SET voting_power = (total_stake / (SELECT SUM(total_stake) FROM validators)) * 100`
      );
    });
    
    console.log('Successfully updated validators in the database');
    return true;
  } catch (dbError) {
    console.error('Error updating validators in database:', dbError);
    return false;
  }
}

// Function to refresh validators data
async function refreshValidatorsData() {
  try {
    // Check if cache needs updating (expired or null)
    const now = Date.now();
    if (!validatorsCache.lastUpdated || (now - validatorsCache.lastUpdated > VALIDATOR_UPDATE_INTERVAL)) {
      console.log('Validators cache expired, refreshing data...');
      
      // Fetch current validators from the blockchain
      const validatorsRPC = await getValidators();
      
      // If we got data from the RPC, sync it to the database
      if (validatorsRPC && validatorsRPC.validators) {
        // Sync to database
        await syncValidatorsToDb(validatorsRPC);
        
        // Update the cache
        validatorsCache = {
          data: validatorsRPC,
          lastUpdated: now
        };
        
        console.log('Validators cache updated at', new Date(now).toISOString());
      }
    }
  } catch (error) {
    console.error('Error refreshing validators data:', error);
  }
}

// Schedule periodic refresh
setInterval(refreshValidatorsData, VALIDATOR_UPDATE_INTERVAL);

// Immediate first refresh on server start
refreshValidatorsData();

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
      const validatorsResult = await db.query('SELECT COUNT(*) as count FROM validators WHERE status = 0');
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
    
    // Trigger a refresh only if cache is expired
    if (!validatorsCache.lastUpdated || (Date.now() - validatorsCache.lastUpdated > VALIDATOR_UPDATE_INTERVAL)) {
      await refreshValidatorsData();
    }
    
    // Get validators from database with pagination
    try {
      const validators = await db.query(
        `SELECT 
          v.address, 
          v.status,
          v.total_stake as stake, 
          v.voting_power as votingPower,
          v.blocks_validated as blocksValidated,
          v.blocks_proposed as blocksProposed,
          v.missed_validations as missedValidations,
          v.score,
          v.uptime,
          v.host_id as hostId,
          v.is_validator as isValidator,
          v.last_active as lastActive,
          v.last_updated as lastUpdated
        FROM validators v
        ORDER BY v.blocks_validated DESC, v.total_stake DESC
        LIMIT ? OFFSET ?`,
        [parseInt(limit), parseInt(offset)]
      );
      
      // Format the response data
      const formattedValidators = validators.map(v => ({
        address: v.address,
        status: v.status,
        stake: v.stake || 0,
        votingPower: parseFloat(v.votingPower) || 0,
        blocksValidated: v.blocksValidated || 0,
        blocksProposed: v.blocksProposed || 0,
        missedValidations: v.missedValidations || 0,
        score: v.score || 0,
        uptime: v.uptime || 100,
        hostId: v.hostId,
        isValidator: Boolean(v.isValidator),
        lastActive: v.lastActive,
        lastUpdated: v.lastUpdated
      }));
      
      // Get total count for pagination
      const totalResult = await db.query('SELECT COUNT(*) as total FROM validators');
      const total = totalResult[0]?.total || 0;
      
      res.json({
        data: formattedValidators,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + limit < total
        },
        lastUpdated: validatorsCache.lastUpdated ? new Date(validatorsCache.lastUpdated).toISOString() : null
      });
    } catch (err) {
      // Table may not exist yet, return empty result
      console.warn('Validators table may not exist yet:', err.message);
      
      // If we have RPC cache data but no table, we can still return that
      if (validatorsCache.data && validatorsCache.data.validators) {
        const formattedValidators = validatorsCache.data.validators.slice(offset, offset + limit).map(v => ({
          address: v.address,
          status: v.status || 0,
          stake: v.stake?.amount || 0,
          votingPower: 0, // Can't calculate without total
          blocksValidated: v.performance?.blocksValidated || 0,
          blocksProposed: v.performance?.blocksProposed || 0,
          missedValidations: v.performance?.missedValidations || 0,
          score: v.score || 0,
          uptime: v.performance?.uptimePercentage || 100,
          hostId: v.stake?.hostID || null,
          isValidator: v.stake?.isValidator || true,
          lastActive: v.lastActive,
          lastUpdated: validatorsCache.lastUpdated ? new Date(validatorsCache.lastUpdated).toISOString() : null
        }));
        
        res.json({
          data: formattedValidators,
          pagination: {
            page,
            limit,
            total: validatorsCache.data.total || validatorsCache.data.validators.length,
            totalPages: Math.ceil((validatorsCache.data.total || validatorsCache.data.validators.length) / limit),
            hasNext: offset + limit < (validatorsCache.data.total || validatorsCache.data.validators.length)
          },
          lastUpdated: validatorsCache.lastUpdated ? new Date(validatorsCache.lastUpdated).toISOString() : null
        });
        return;
      }
      
      res.json({
        data: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false
        },
        lastUpdated: null
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
// Export refreshValidatorsData for use in server.js
module.exports.refreshValidatorsData = refreshValidatorsData; 