const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'personal_cloud'
    });
    try {
        const [rows] = await connection.query('SELECT name, color, icon_type FROM folders LIMIT 5');
        console.log('Folders Data:', JSON.stringify(rows, null, 2));
    } catch (e) {
        console.log('Error:', e.message);
    } finally {
        await connection.end();
    }
}
run();
