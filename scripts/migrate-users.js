const db = require('./db');

async function migrate() {
    try {
        console.log('Starting migration...');
        
        await db.query('ALTER TABLE users ADD COLUMN first_name VARCHAR(100) DEFAULT NULL');
        await db.query('ALTER TABLE users ADD COLUMN last_name VARCHAR(100) DEFAULT NULL');
        await db.query('ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255) DEFAULT NULL');
        
        console.log('Migration successful: Columns added to users table.');
        process.exit(0);
    } catch (err) {
        if (err.code === 'ER_DUP_COLUMN_NAME') {
            console.log('Migration skipped: Columns already exist.');
            process.exit(0);
        } else {
            console.error('Migration failed:', err.message);
            process.exit(1);
        }
    }
}

migrate();
