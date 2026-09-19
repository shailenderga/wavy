const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const dbName = (process.env.DB_NAME || 'chatapp_db').trim();

const dbConfig = {
  host: (process.env.DB_HOST || 'localhost').trim(),
  user: (process.env.DB_USER || 'root').trim(),
  password: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.trim() : '',
  port: parseInt((process.env.DB_PORT || '3306').trim(), 10),
  multipleStatements: true,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
};

let pool = null;

async function initializeDatabase() {
  try {
    console.log(`🔍 Connecting to DB at ${dbConfig.host}:${dbConfig.port} (DB: ${dbName}, SSL: ${Boolean(dbConfig.ssl)})...`);

    let connection;
    try {
      // 1. Try connecting directly to dbName (standard for cloud MySQL like TiDB/Aiven)
      connection = await mysql.createConnection({
        ...dbConfig,
        database: dbName,
        connectTimeout: 20000
      });
    } catch (directErr) {
      // 2. If DB doesn't exist, try connecting to root to create it
      connection = await mysql.createConnection({
        ...dbConfig,
        connectTimeout: 20000
      });
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
      await connection.query(`USE \`${dbName}\`;`);
    }

    // Run schema migrations in this database
    const schemaPath = path.join(__dirname, '../../schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await connection.query(schemaSql);
      console.log(`✅ Database tables initialized successfully in '${dbName}'`);
    }

    await connection.end();

    // 3. Initialize connection pool pointing to the target database
    pool = mysql.createPool({
      ...dbConfig,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 20000
    });

    return pool;
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    throw err;
  }
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...dbConfig,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

module.exports = {
  initializeDatabase,
  getPool
};
