const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

let dbHost = (process.env.DB_HOST || process.env.MYSQLHOST || 'localhost').trim();
let dbUser = (process.env.DB_USER || process.env.MYSQLUSER || 'root').trim();
let dbPassword = (process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '').trim();
let dbPort = parseInt((process.env.DB_PORT || process.env.MYSQLPORT || '3306').toString().trim(), 10);
let dbName = (process.env.DB_NAME || process.env.MYSQLDATABASE || 'chatapp_db').trim();

// Support Railway single connection string (MYSQL_URL or DATABASE_URL)
const connectionUri = process.env.MYSQL_URL || process.env.DATABASE_URL;
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
