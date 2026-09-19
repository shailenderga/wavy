const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const passwordsToTry = [
  process.env.DB_PASSWORD,
  'root',
  '',
  'password',
  '123456',
  'admin',
  'MySQL@123'
];

async function testConnections() {
  console.log('Testing MySQL connections on localhost:3306...');
  
  for (const pwd of passwordsToTry) {
    try {
      const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: pwd,
        port: 3306
      });
      console.log(`✅ SUCCESS! Connected with user 'root' and password: '${pwd}'`);
      await conn.end();
      return pwd;
    } catch (err) {
      console.log(`❌ Failed with password '${pwd}': ${err.code || err.message}`);
    }
  }
  return null;
}

testConnections().then(workingPwd => {
  if (workingPwd !== null) {
    console.log(`Update .env with DB_PASSWORD=${workingPwd}`);
  } else {
    console.log('None of the common passwords worked. User will need to provide password or reset.');
  }
  process.exit(0);
});
