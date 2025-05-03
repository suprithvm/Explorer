const db = require('../db/database');

async function clearSampleData() {
  console.log('Clearing sample data from blocks and transactions tables...');
  
  try {
    await db.withTransaction(async (connection) => {
      // Disable foreign key checks temporarily to allow deletion in any order
      await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
      
      // Delete all records from transactions table
      const [txResult] = await connection.execute('DELETE FROM transactions');
      console.log(`Deleted ${txResult.affectedRows} records from transactions table`);
      
      // Delete all records from blocks table
      const [blockResult] = await connection.execute('DELETE FROM blocks');
      console.log(`Deleted ${blockResult.affectedRows} records from blocks table`);
      
      // Reset auto-increment counters if any
      await connection.execute('ALTER TABLE blocks AUTO_INCREMENT = 1');
      
      // Re-enable foreign key checks
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      
      console.log('Sample data cleared successfully');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error clearing sample data:', error);
    process.exit(1);
  }
}

// Execute the function
clearSampleData(); 