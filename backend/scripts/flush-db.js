/**
 * Script to flush all database tables to remove sample data
 */
require('dotenv').config();
const { initializeDatabase } = require('../db/database');

async function flushDatabase() {
  try {
    console.log('Connecting to database...');
    const db = await initializeDatabase();

    console.log('Connected to database. Flushing tables...');

    // Tables to truncate - in order to avoid foreign key constraint issues
    const tables = [
      'transactions',
      'blocks',
      'addresses',
      'validators',
      'network_stats'
    ];

    for (const table of tables) {
      try {
        console.log(`Truncating table: ${table}`);
        await db.execute(`DELETE FROM ${table}`);
        console.log(`Table ${table} flushed successfully`);
      } catch (error) {
        console.error(`Error flushing table ${table}:`, error.message);
      }
    }

    // Reset network stats
    try {
      console.log('Resetting network stats...');
      await db.execute(
        `INSERT INTO network_stats (id, total_blocks, total_transactions, average_block_time) 
         VALUES (1, 0, 0, 0) 
         ON DUPLICATE KEY UPDATE 
         total_blocks = 0, 
         total_transactions = 0, 
         average_block_time = 0`
      );
      console.log('Network stats reset successfully');
    } catch (error) {
      console.error('Error resetting network stats:', error.message);
    }

    console.log('Database flush completed');
    process.exit(0);
  } catch (error) {
    console.error('Error flushing database:', error);
    process.exit(1);
  }
}

// Run the flush operation
flushDatabase(); 