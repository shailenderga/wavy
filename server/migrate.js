const { getPool } = require('./src/config/db');

async function migrate() {
  const pool = getPool();
  try {
    // Check and add columns to stories table
    try {
      await pool.query("ALTER TABLE stories ADD COLUMN media_url LONGTEXT;");
    } catch (e) { /* column may already exist */ }

    try {
      await pool.query("ALTER TABLE stories ADD COLUMN media_type ENUM('text', 'image', 'video') DEFAULT 'text';");
    } catch (e) { /* column may already exist */ }

    try {
      await pool.query("ALTER TABLE stories ADD COLUMN caption TEXT;");
    } catch (e) { /* column may already exist */ }

    // Check and add columns to messages table
    try {
      await pool.query("ALTER TABLE messages ADD COLUMN message_type ENUM('text', 'image', 'audio') DEFAULT 'text';");
    } catch (e) { /* column may already exist */ }

    try {
      await pool.query("ALTER TABLE messages ADD COLUMN media_url LONGTEXT;");
    } catch (e) { /* column may already exist */ }

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
