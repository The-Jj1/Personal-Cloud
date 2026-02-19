const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'personal_cloud',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
});

module.exports = {
    query: async (sql, params) => {
        // Използваме .query() за по-добра поддръжка на IN (?) клаузи
        const [results] = await pool.query(sql, params);
        return { rows: results };
    }
};
