const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setup() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        multipleStatements: true // Allow multiple queries
    });

    try {
        console.log('1. Creating database if not exists...');
        await connection.query('CREATE DATABASE IF NOT EXISTS personal_cloud CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        await connection.query('USE personal_cloud');

        console.log('2. Running schema queries...');
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
        await connection.query(schema);

        console.log('3. Inserting default user...');
        const userId = '00000000-0000-0000-0000-000000000001';
        await connection.execute(`
            INSERT IGNORE INTO users (id, username, email, password_hash)
            VALUES (?, ?, ?, ?)
        `, [userId, 'demo_user', 'demo@example.com', 'hashed_password']);

        console.log('Setup complete! MySQL is ready.');
    } catch (err) {
        console.error('Setup failed:', err.message);
    } finally {
        await connection.end();
    }
}

setup();
