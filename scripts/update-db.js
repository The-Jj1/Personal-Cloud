const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'personal_cloud'
    });
    try {
        console.log('Updating file paths in DB...');
        const [files] = await connection.query('SELECT id, storage_path FROM files');
        for (const file of files) {
            if (file.storage_path.startsWith('uploads/')) {
                const newPath = file.storage_path.replace('uploads/', 'cloud/00000000-0000-0000-0000-000000000001/');
                await connection.query('UPDATE files SET storage_path = ? WHERE id = ?', [newPath, file.id]);
                console.log(`Updated: ${file.storage_path} -> ${newPath}`);
            }
        }
        console.log('All paths updated successfully!');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await connection.end();
    }
}
run();
