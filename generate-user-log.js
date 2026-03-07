const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function exportUserData(email) {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'personal_cloud'
    });

    try {
        console.log(`Fetching data for user: ${email}...`);
        
        // 1. Get user profile
        const [users] = await connection.query('SELECT id, username, email, password_hash, created_at FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            console.log('User not found.');
            return;
        }
        const user = users[0];

        // 2. Get all files (uploaded items)
        const [files] = await connection.query('SELECT name, size, mime_type, storage_path, is_deleted, created_at FROM files WHERE user_id = ?', [user.id]);

        // 3. Get all folders
        const [folders] = await connection.query('SELECT name, is_deleted, created_at FROM folders WHERE user_id = ?', [user.id]);

        // 4. Construct the JSON structure
        const userDataLog = {
            profile: {
                id: user.id,
                username: user.username,
                email: user.email,
                password_hash: user.password_hash,
                account_created_at: user.created_at
            },
            activity_summary: {
                total_files_uploaded: files.length,
                total_folders_created: folders.length,
                total_storage_used_bytes: files.reduce((acc, f) => acc + parseInt(f.size || 0), 0)
            },
            uploads: files.map(f => ({
                file_name: f.name,
                size_bytes: f.size,
                size_formatted: (f.size / 1024).toFixed(2) + ' KB',
                type: f.mime_type,
                status: f.is_deleted ? 'In Trash' : 'Active',
                uploaded_at: f.created_at
            })),
            folders: folders.map(f => ({
                folder_name: f.name,
                status: f.is_deleted ? 'In Trash' : 'Active',
                created_at: f.created_at
            }))
        };

        // 5. Save to file
        const fileName = `user_log_${user.username}.json`;
        fs.writeFileSync(fileName, JSON.stringify(userDataLog, null, 4), 'utf8');
        
        console.log(`==========================================`);
        console.log(`SUCCESS: Log file created: ${fileName}`);
        console.log(`Total Files: ${files.length}`);
        console.log(`==========================================`);

    } catch (err) {
        console.error('Export failed:', err.message);
    } finally {
        await connection.end();
    }
}

// Заменяме с имейла на потребителя, който искаме да експортнем
const targetEmail = process.argv[2] || 'demo@example.com';
exportUserData(targetEmail);
