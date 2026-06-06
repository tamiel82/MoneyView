const mysql = require('mysql2/promise');

async function test() {
  try {
    console.log('Connecting to MySQL at 210.104.186.158...');
    const conn = await mysql.createConnection({
      host: '210.104.186.158',
      port: 3306,
      user: 'Master',
      password: '0000',
      database: 'store'
    });
    console.log('Successfully connected to MySQL store DB!');
    
    const [rows] = await conn.execute('SELECT COUNT(*) as count FROM 주문리스트');
    console.log(`Successfully read 주문리스트. Row count: ${rows[0].count}`);
    
    await conn.end();
  } catch (err) {
    console.error('MySQL connection failed:', err.message);
  }
}
test();
