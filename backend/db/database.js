const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'explorer',
  password: process.env.DB_PASSWORD || 'Suprith@123',
  database: process.env.DB_NAME || 'supereum_explorer',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Use plain text query - safer for our use case since we control the parameters
  namedPlaceholders: true
});

// Helper function to execute SQL queries
async function query(sql, params = []) {
  try {
    // If params is an array and contains LIMIT/OFFSET params, we need to transform the query
    if (Array.isArray(params) && params.length > 0 && sql.includes('LIMIT ? OFFSET ?')) {
      // Replace placeholders with actual values for LIMIT and OFFSET
      const limit = parseInt(params[params.length - 2]) || 10;
      const offset = parseInt(params[params.length - 1]) || 0;
      
      // Replace the placeholders with actual values
      sql = sql.replace('LIMIT ? OFFSET ?', `LIMIT ${limit} OFFSET ${offset}`);
      
      // Remove the limit and offset from params
      params = params.slice(0, -2);
    }

    if (params.length === 0) {
      // If no parameters, use query instead of execute
      const [rows] = await pool.query(sql);
      return rows;
    } else {
      // Use execute for parameterized queries
      const [rows] = await pool.execute(sql, params);
      return rows;
    }
  } catch (error) {
    console.error('Database query error:', error);
    // Return empty array for most queries instead of throwing to prevent crashes
    if (sql.toLowerCase().includes('select')) {
      console.warn('Returning empty result set due to database error');
      return [];
    }
    throw error;
  }
}

// Transaction helper
async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Check if tables exist and initialize database if needed
async function initializeDatabase() {
  try {
    console.log('Checking database connection...');
    
    // Check if database exists and is accessible
    const [result] = await pool.query('SELECT 1 as dbConnected');
    
    if (result && result[0] && result[0].dbConnected === 1) {
      console.log('Database connection successful!');
      
      // Check if network_stats table exists
      try {
        const [statsResult] = await pool.query('SELECT COUNT(*) as count FROM network_stats');
        console.log('Database tables already exist.');
      } catch (tableError) {
        console.log('Tables not found. Creating initial database schema...');
        
        // Create schema from the schema.sql file
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.join(__dirname, 'schema.sql');
        
        try {
          if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            const statements = schemaSql.split(';')
              .map(statement => statement.trim())
              .filter(statement => statement.length > 0);
            
            for (const statement of statements) {
              await pool.query(statement);
            }
            console.log('Database schema created successfully!');
          } else {
            console.error('Schema file not found:', schemaPath);
          }
        } catch (schemaError) {
          console.error('Error creating database schema:', schemaError);
        }
      }
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

module.exports = {
  query,
  withTransaction,
  pool,
  initializeDatabase
}; 