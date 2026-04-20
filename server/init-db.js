const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDB() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    multipleStatements: true,
  });
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  try {
    await connection.query(sql);
    console.log('DB 스키마 적용 완료!');
  } catch (err) {
    console.error('오류:', err.message);
  } finally {
    await connection.end();
  }
}

initDB();
