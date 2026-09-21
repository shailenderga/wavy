const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Log any DB-related env keys present in the environment (for debugging without exposing passwords)
const dbEnvKeys = Object.keys(process.env).filter(k => 
  k.startsWith('DB_') || k.startsWith('MYSQL') || k.includes('DATABASE')
);
console.log('🔍 Detected DB Environment Keys in process.env:', dbEnvKeys);

// Support Railway single connection string variations
const connectionUri = 
  process.env.MYSQL_URL || 
  process.env.MYSQL_PUBLIC_URL || 
  process.env.DATABASE_URL || 
  process.env.DATABASE_PUBLIC_URL;

let dbHost = (process.env.DB_HOST || process.env.MYSQLHOST || process.env.MYSQL_HOST || 'localhost').trim();
let dbUser = (process.env.DB_USER || process.env.MYSQLUSER || process.env.MYSQL_USER || 'root').trim();
let dbPassword = (process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '').trim();
let dbPort = parseInt((process.env.DB_PORT || process.env.MYSQLPORT || process.env.MYSQL_PORT || '3306').toString().trim(), 10);
let dbName = (process.env.DB_NAME || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'chatapp_db').trim();

if (connectionUri) {
  try {
    const parsed = new URL(connectionUri);
    dbHost = parsed.hostname;
    dbPort = parseInt(parsed.port || '3306', 10);
    dbUser = decodeURIComponent(parsed.username);
    dbPassword = decodeURIComponent(parsed.password);
    if (parsed.pathname && parsed.pathname.length > 1) {
      dbName = decodeURIComponent(parsed.pathname.slice(1));
    }
  } catch (e) {
    console.warn('⚠️ Could not parse connection URL, falling back to individual env variables');
  }
}

const dbConfig = {
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  port: dbPort,
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

    // Ensure full_name column exists on users table
    try {
      await connection.query('ALTER TABLE users ADD COLUMN full_name VARCHAR(100) DEFAULT NULL');
      console.log('✅ Added full_name column to users table');
    } catch (alterErr) {
      // Column already exists or table doesn't exist yet, ignore
    }

    // Ensure sender_name, receiver_id, receiver_name columns exist on messages table
    try {
      await connection.query('ALTER TABLE messages ADD COLUMN sender_name VARCHAR(100) DEFAULT NULL');
      console.log('✅ Added sender_name column to messages table');
    } catch (e) {}

    try {
      await connection.query('ALTER TABLE messages ADD COLUMN receiver_id INT DEFAULT NULL');
      console.log('✅ Added receiver_id column to messages table');
    } catch (e) {}

    try {
      await connection.query('ALTER TABLE messages ADD COLUMN receiver_name VARCHAR(100) DEFAULT NULL');
      console.log('✅ Added receiver_name column to messages table');
    } catch (e) {}

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
    console.error('❌ Database initialization error:', err.message || err);
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
