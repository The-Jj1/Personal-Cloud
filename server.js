const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configuration for XAMPP paths based on run.bat
const XAMPP_PATH = 'C:\\xampp';
const APACHE_BIN = `${XAMPP_PATH}\\apache\\bin\\httpd.exe`;
const MYSQL_BIN = `${XAMPP_PATH}\\mysql\\bin\\mysqld.exe`;

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const ENCRYPTION_KEY = crypto.scryptSync(JWT_SECRET, 'salt', 32); // 256-bit key
const IV_LENGTH = 16; 

const UPLOAD_DIR = path.resolve('cloud');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Encryption Helpers
const encryptBuffer = (buffer) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
};

const decryptBuffer = (buffer) => {
    const iv = buffer.slice(0, IV_LENGTH);
    const encryptedData = buffer.slice(IV_LENGTH);
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
};

// Helper to build physical path from DB hierarchy
const getFolderPathString = async (folderId) => {
    if (!folderId || folderId === 'null') return '';
    const [folder] = (await db.query('SELECT name, parent_id FROM folders WHERE id = ?', [folderId])).rows;
    if (!folder) return '';
    const parentPath = await getFolderPathString(folder.parent_id);
    return path.join(parentPath, folder.name);
};

// Helper to get all subfolder IDs recursively
const getDescendantFolderIds = async (folderId) => {
    let ids = [folderId];
    const subfolders = await db.query('SELECT id FROM folders WHERE parent_id = ?', [folderId]);
    for (const f of subfolders.rows) {
        const subIds = await getDescendantFolderIds(f.id);
        ids = ids.concat(subIds);
    }
    return ids;
};

// Middleware for JWT Authentication
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Allow token from Header OR Query (for images/downloads)
    const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;
    
    if (!token || token === 'null' || token === 'undefined') {
        console.log('AUTH ERROR: No token provided');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log('AUTH ERROR: Invalid token', err.message);
            return res.status(403).json({ error: 'Forbidden' });
        }
        req.user = user;
        console.log(`AUTH OK: User ${user.username} (${user.id}) [${user.role}]`);
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') next();
    else res.status(403).json({ error: 'Admin access required' });
};

// Admin Server Control Routes
app.post('/admin/server/action', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    
    const { service, action } = req.body; // service: 'apache'|'mysql', action: 'restart'|'start'|'stop'
    
    try {
        if (service === 'apache') {
            if (action === 'restart') {
                exec(`"${APACHE_BIN}" -k restart`, (err) => {
                    if (err) return res.status(500).json({ error: 'Apache restart failed' });
                    res.json({ message: 'Apache restart signal sent' });
                });
            } else if (action === 'start') {
                exec(`start "" "${XAMPP_PATH}\\apache_start.bat"`, (err) => {
                    if (err) return res.status(500).json({ error: 'Apache start failed' });
                    res.json({ message: 'Apache start signal sent' });
                });
            }
        } else if (service === 'mysql') {
            if (action === 'restart') {
                exec('taskkill /IM mysqld.exe /F', () => {
                    setTimeout(() => {
                        exec(`start /b "" "${MYSQL_BIN}" --defaults-file="${XAMPP_PATH}\\mysql\\bin\\my.ini" --standalone`);
                        res.json({ message: 'MySQL restart initiated' });
                    }, 2000);
                });
            }
        } else {
            res.status(400).json({ error: 'Invalid service' });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/admin/server/status', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    
    exec('tasklist', (err, stdout) => {
        if (err) return res.status(500).json({ error: 'Could not fetch status' });
        res.json({
            apache: stdout.toLowerCase().includes('httpd.exe'),
            mysql: stdout.toLowerCase().includes('mysqld.exe')
        });
    });
});

// Logger Helper
const logUserActivity = async (userId, action, details) => {
    try {
        const logPath = path.join(UPLOAD_DIR, userId, 'activity_log.json');
        let logData = { user_info: {}, history: [] };

        if (fs.existsSync(logPath)) {
            logData = JSON.parse(fs.readFileSync(logPath, 'utf8'));
        } else {
            // If new file, try to get user info from DB
            const [user] = (await db.query('SELECT username, email, password_hash FROM users WHERE id=?', [userId])).rows;
            if (user) logData.user_info = user;
        }

        logData.history.push({
            timestamp: new Date().toISOString(),
            action,
            details
        });

        fs.writeFileSync(logPath, JSON.stringify(logData, null, 4), 'utf8');
    } catch (e) { console.error('Logging error:', e.message); }
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, TEMP_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage: storage });

// AUTH ROUTES
app.post('/register', async (req, res) => {
    try {
        const { username, email, password, first_name, last_name } = req.body;
        if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });

        const userId = uuidv4();
        const hash = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (id, username, email, password_hash, first_name, last_name) VALUES (?,?,?,?,?,?)', 
            [userId, username, email, hash, first_name || null, last_name || null]);
        
        // Auto-create user cloud folders
        const activeDir = path.join(UPLOAD_DIR, userId, 'active');
        const trashDir = path.join(UPLOAD_DIR, userId, 'trash');
        if (!fs.existsSync(activeDir)) fs.mkdirSync(activeDir, { recursive: true });
        if (!fs.existsSync(trashDir)) fs.mkdirSync(trashDir, { recursive: true });

        // Initialize log
        await logUserActivity(userId, 'ACCOUNT_CREATED', { username, email });

        res.status(201).json({ message: 'User created' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, id: user.id, username: user.username, role: user.role });
    } catch (err) { 
        console.error('LOGIN ERROR:', err);
        res.status(500).json({ error: err.message }); 
    }
});

app.put('/users/settings', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, email, password, first_name, last_name } = req.body;

        let query = 'UPDATE users SET username = ?, email = ?, first_name = ?, last_name = ?';
        let params = [username, email, first_name || null, last_name || null];

        if (password) {
            const hash = await bcrypt.hash(password, 10);
            query += ', password_hash = ?';
            params.push(hash);
        }

        query += ' WHERE id = ?';
        params.push(userId);

        await db.query(query, params);
        await logUserActivity(userId, 'SETTINGS_UPDATED', { username, email, first_name, last_name, password_changed: !!password });

        res.json({ message: 'Settings updated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/users/profile-picture', authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        const userId = req.user.id;
        if (!req.file) return res.status(400).json({ error: 'No image file' });

        const filename = req.file.filename;
        const userDir = path.join(UPLOAD_DIR, userId);
        const profilePath = `cloud/${userId}/${filename}`;
        const absPath = path.resolve(profilePath);

        if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

        // No encryption for profile pictures to simplify direct display
        fs.renameSync(req.file.path, absPath);

        await db.query('UPDATE users SET profile_picture = ? WHERE id = ?', [profilePath, userId]);
        await logUserActivity(userId, 'PROFILE_PICTURE_UPDATED', { filename });

        res.json({ message: 'Profile picture updated', path: profilePath });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/users/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userResult = await db.query('SELECT id, username, email, role, first_name, last_name, profile_picture, storage_quota, created_at FROM users WHERE id = ?', [userId]);
        const user = userResult.rows && userResult.rows[0];

        if (!user) return res.status(404).json({ error: 'User not found' });

        const storageResult = await db.query('SELECT SUM(size) as total_size FROM files WHERE user_id = ? AND is_deleted = 0', [userId]);
        const storage = storageResult.rows && storageResult.rows[0];

        res.json({
            ...user,
            storage_used: (storage && storage.total_size) || 0,
            storage_quota: user.role === 'admin' ? 0 : (user.storage_quota || 1073741824)
        });

    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/users/avatar/:id', authenticateToken, async (req, res) => {
    try {
        const [user] = (await db.query('SELECT profile_picture FROM users WHERE id = ?', [req.params.id])).rows;
        if (!user || !user.profile_picture) return res.status(404).send('Not found');
        res.sendFile(path.resolve(user.profile_picture));
    } catch (e) { res.status(500).send(e.message); }
});
// SHARE ROUTES
app.get('/users/search', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json([]);
        const result = await db.query('SELECT id, username, email FROM users WHERE (email LIKE ? OR username LIKE ?) AND id != ? LIMIT 5', [`%${q}%`, `%${q}%`, req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/share', authenticateToken, async (req, res) => {
    try {
        const { item_ids, item_types, target_user_ids, access_level } = req.body;
        
        if (!item_ids?.length || !target_user_ids?.length) {
            return res.status(400).json({ error: 'Missing items or users' });
        }

        for (const itemId of item_ids) {
            const type = item_types[itemId]; 
            const col = type === 'folder' ? 'folder_id' : 'file_id';
            
            for (const targetId of target_user_ids) {
                const id = uuidv4();
                await db.query(`INSERT INTO permissions (id, ${col}, user_id, access_level) VALUES (?,?,?,?) 
                               ON DUPLICATE KEY UPDATE access_level = VALUES(access_level)`, 
                               [id, itemId, targetId, access_level || 'view']);
            }
        }
        
        res.json({ message: 'Shared successfully with all users' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUBLIC LINKS
app.post('/share/public', authenticateToken, async (req, res) => {
    try {
        const { item_id, type } = req.body;
        const share_token = uuidv4().replace(/-/g, '');
        const id = uuidv4();
        
        const col = type === 'folder' ? 'folder_id' : 'file_id';
        await db.query(`INSERT INTO shared_links (id, share_token, ${col}) VALUES (?,?,?)`, [id, share_token, item_id]);
        
        res.json({ public_url: `http://localhost:3000/public/view/${share_token}` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/public/view/:token', async (req, res) => {
    try {
        const r = await db.query('SELECT file_id, folder_id FROM shared_links WHERE share_token = ?', [req.params.token]);
        if (!r.rows.length) return res.status(404).send('Link expired or invalid');
        
        const { file_id } = r.rows[0];
        if (file_id) {
            const fr = await db.query('SELECT storage_path, mime_type, name FROM files WHERE id = ?', [file_id]);
            const file = fr.rows[0];
            const encryptedData = fs.readFileSync(path.resolve(file.storage_path));
            const decryptedData = decryptBuffer(encryptedData);
            res.setHeader('Content-Type', file.mime_type);
            res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
            res.send(decryptedData);
        } else {
            res.status(400).send('Folder public links not yet fully implemented');
        }
    } catch (e) { res.status(500).send(e.message); }
});

app.get('/public/download/:token', async (req, res) => {
    try {
        const r = await db.query('SELECT file_id FROM shared_links WHERE share_token = ?', [req.params.token]);
        if (!r.rows.length) return res.status(404).send('Invalid link');
        
        const fr = await db.query('SELECT storage_path, name, mime_type FROM files WHERE id = ?', [r.rows[0].file_id]);
        const file = fr.rows[0];
        const encryptedData = fs.readFileSync(path.resolve(file.storage_path));
        const decryptedData = decryptBuffer(encryptedData);
        
        res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
        res.send(decryptedData);
    } catch (e) { res.status(500).send(e.message); }
});

// ADMIN ROUTES
app.get('/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.id, u.username, u.email, u.role, u.first_name, u.last_name, u.profile_picture, u.storage_quota, u.created_at,
            (SELECT COUNT(*) FROM tickets WHERE user_id = u.id) as total_tickets,
            (SELECT COUNT(*) FROM tickets WHERE user_id = u.id AND status = 'open') as active_tickets,
            (SELECT COALESCE(SUM(size), 0) FROM files WHERE user_id = u.id AND is_deleted = 0) as storage_used
            FROM users u 
            ORDER BY CASE WHEN u.role = 'admin' THEN 0 ELSE 1 END ASC, u.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/admin/create-admin', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { username, email, password, first_name, last_name } = req.body;
        if (!username || !email || !password) return res.status(400).json({ error: 'Required fields missing' });

        const [existing] = (await db.query('SELECT id FROM users WHERE email = ?', [email])).rows;
        if (existing) return res.status(400).json({ error: 'User with this email already exists' });

        const hash = await bcrypt.hash(password, 10);
        const userId = uuidv4();

        await db.query('INSERT INTO users (id, username, email, password_hash, role, first_name, last_name, storage_quota) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
            [userId, username, email, hash, 'admin', first_name || null, last_name || null, 0]);

        const userDir = path.join(UPLOAD_DIR, userId);
        const activeDir = path.join(userDir, 'active');
        const trashDir = path.join(userDir, 'trash');
        if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
        if (!fs.existsSync(activeDir)) fs.mkdirSync(activeDir, { recursive: true });
        if (!fs.existsSync(trashDir)) fs.mkdirSync(trashDir, { recursive: true });

        res.status(201).json({ message: 'Admin created successfully', id: userId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, first_name, last_name, role, storage_quota, password } = req.body;
        
        const [targetUser] = (await db.query('SELECT role FROM users WHERE id = ?', [id])).rows;
        if (targetUser && targetUser.role === 'admin' && role === 'user') {
            return res.status(400).json({ error: 'Cannot demote an administrator to a standard user' });
        }

        let query = 'UPDATE users SET username=?, email=?, first_name=?, last_name=?, role=?, storage_quota=?';
        let params = [username, email, first_name, last_name, role, storage_quota];

        if (password) {
            const hash = await bcrypt.hash(password, 10);
            query += ', password_hash=?';
            params.push(hash);
        }

        query += ' WHERE id=?';
        params.push(id);

        await db.query(query, params);
        res.json({ message: 'User updated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
        
        const userDir = path.resolve(UPLOAD_DIR, id);
        if (fs.existsSync(userDir)) fs.rmSync(userDir, { recursive: true, force: true });
        
        await db.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'User deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// TICKET ROUTES
app.post('/tickets', authenticateToken, async (req, res) => {
    try {
        const { subject, content } = req.body;
        if (!subject || !content) return res.status(400).json({ error: 'Subject and content are required' });
        
        const ticketId = uuidv4();
        await db.query('INSERT INTO tickets (id, user_id, subject) VALUES (?, ?, ?)', [ticketId, req.user.id, subject]);
        
        const messageId = uuidv4();
        await db.query('INSERT INTO ticket_messages (id, ticket_id, sender_id, content) VALUES (?, ?, ?, ?)', 
            [messageId, ticketId, req.user.id, content]);
            
        res.status(201).json({ id: ticketId, subject });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/tickets', authenticateToken, async (req, res) => {
    try {
        let query = 'SELECT t.*, u.username FROM tickets t JOIN users u ON t.user_id = u.id';
        let params = [];
        
        if (req.user.role !== 'admin') {
            query += ' WHERE t.user_id = ?';
            params.push(req.user.id);
        }
        
        query += ' ORDER BY t.created_at DESC';
        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/tickets/:id', authenticateToken, async (req, res) => {
    try {
        const [ticket] = (await db.query('SELECT t.*, u.username FROM tickets t JOIN users u ON t.user_id = u.id WHERE t.id = ?', [req.params.id])).rows;
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        
        if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
        
        const messages = await db.query(`
            SELECT tm.*, u.username as sender_name, u.role as sender_role
            FROM ticket_messages tm
            JOIN users u ON tm.sender_id = u.id
            WHERE tm.ticket_id = ?
            ORDER BY tm.created_at ASC
        `, [req.params.id]);
        
        res.json({ ...ticket, messages: messages.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/tickets/:id/messages', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        const [ticket] = (await db.query('SELECT user_id, status FROM tickets WHERE id = ?', [req.params.id])).rows;
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        
        if (req.user.role !== 'admin' && ticket.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
        if (ticket.status === 'closed') return res.status(400).json({ error: 'Ticket is closed' });

        const messageId = uuidv4();
        await db.query('INSERT INTO ticket_messages (id, ticket_id, sender_id, content) VALUES (?, ?, ?, ?)', 
            [messageId, req.params.id, req.user.id, content]);
            
        res.status(201).json({ id: messageId });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/tickets/:id/status', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can change status' });
        
        await db.query('UPDATE tickets SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: 'Status updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/groups', authenticateToken, async (req, res) => {
    try {
        const { name, member_ids } = req.body;
        if (!name) return res.status(400).json({ error: 'Group name is required' });
        
        const groupId = uuidv4();
        await db.query('INSERT INTO `groups` (id, name, created_by) VALUES (?, ?, ?)', [groupId, name, req.user.id]);
        
        await db.query('INSERT INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?)', 
            [uuidv4(), groupId, req.user.id, 'admin']);
            
        if (member_ids && Array.isArray(member_ids)) {
            for (const memberId of member_ids) {
                if (memberId !== req.user.id) {
                    await db.query('INSERT IGNORE INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?)', 
                        [uuidv4(), groupId, memberId, 'member']);
                }
            }
        }
        
        res.status(201).json({ id: groupId, name });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/groups', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT g.* FROM \`groups\` g
            JOIN group_members gm ON g.id = gm.group_id
            WHERE gm.user_id = ?
            ORDER BY g.created_at DESC
        `, [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/groups/:id/members', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.id, u.username, u.email, gm.role, gm.joined_at
            FROM users u
            JOIN group_members gm ON u.id = gm.user_id
            WHERE gm.group_id = ?
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/groups/:id/members', authenticateToken, async (req, res) => {
    try {
        const { user_id, role } = req.body;
        const [adminCheck] = (await db.query('SELECT role FROM group_members WHERE group_id = ? AND user_id = ?', [req.params.id, req.user.id])).rows;
        if (!adminCheck || adminCheck.role !== 'admin') return res.status(403).json({ error: 'Only admins can add members' });
        
        await db.query('INSERT IGNORE INTO group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?)', 
            [uuidv4(), req.params.id, user_id, role || 'member']);
        res.json({ message: 'Member added' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// MESSAGE ROUTES
app.post('/messages', authenticateToken, async (req, res) => {
    try {
        const { recipient_id, group_id, content } = req.body;
        if (!content) return res.status(400).json({ error: 'Content is required' });
        if (!recipient_id && !group_id) return res.status(400).json({ error: 'Recipient or Group is required' });
        
        const messageId = uuidv4();
        await db.query('INSERT INTO messages (id, sender_id, recipient_id, group_id, content) VALUES (?, ?, ?, ?, ?)', 
            [messageId, req.user.id, recipient_id || null, group_id || null, content]);
        
        res.status(201).json({ id: messageId, sender_id: req.user.id, content, created_at: new Date() });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/messages/chat/:targetId', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT m.*, u.username AS sender_name FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE (m.sender_id = ? AND m.recipient_id = ?)
               OR (m.sender_id = ? AND m.recipient_id = ?)
            ORDER BY m.created_at ASC
        `, [req.user.id, req.params.targetId, req.params.targetId, req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/messages/group/:groupId', authenticateToken, async (req, res) => {
    try {
        const [memberCheck] = (await db.query('SELECT id FROM group_members WHERE group_id = ? AND user_id = ?', [req.params.groupId, req.user.id])).rows;
        if (!memberCheck) return res.status(403).json({ error: 'Not a member of this group' });
        
        const result = await db.query(`
            SELECT m.*, u.username AS sender_name FROM messages m
            JOIN users u ON m.sender_id = u.id
            WHERE m.group_id = ?
            ORDER BY m.created_at ASC
        `, [req.params.groupId]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// FRIENDS ROUTES
app.post('/friends/request', authenticateToken, async (req, res) => {
    try {
        const { friend_id } = req.body;
        if (req.user.id === friend_id) return res.status(400).json({ error: 'Cannot add yourself' });
        
        const [existing] = (await db.query('SELECT id FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', 
            [req.user.id, friend_id, friend_id, req.user.id])).rows;
            
        if (existing) return res.status(400).json({ error: 'Request already exists or already friends' });

        await db.query('INSERT INTO friends (id, user_id, friend_id, status) VALUES (?, ?, ?, ?)', 
            [uuidv4(), req.user.id, friend_id, 'pending']);
        res.json({ message: 'Request sent' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/friends', authenticateToken, async (req, res) => {
    try {
        const friends = await db.query(`
            SELECT f.id, u.id as user_id, u.username, u.email, u.profile_picture 
            FROM friends f
            JOIN users u ON (f.user_id = u.id OR f.friend_id = u.id)
            WHERE (f.user_id = ? OR f.friend_id = ?) 
              AND f.status = 'accepted'
              AND u.id != ?
        `, [req.user.id, req.user.id, req.user.id]);

        const pending = await db.query(`
            SELECT f.id, u.id as user_id, u.username, u.email, u.profile_picture
            FROM friends f
            JOIN users u ON f.user_id = u.id
            WHERE f.friend_id = ? AND f.status = 'pending'
        `, [req.user.id]);

        res.json({ friends: friends.rows, pending: pending.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/friends/accept', authenticateToken, async (req, res) => {
    try {
        const { id } = req.body; 
        await db.query('UPDATE friends SET status = ? WHERE id = ? AND friend_id = ?', ['accepted', id, req.user.id]);
        res.json({ message: 'Friend request accepted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/friends/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM friends WHERE id = ? AND (user_id = ? OR friend_id = ?)', 
            [req.params.id, req.user.id, req.user.id]);
        res.json({ message: 'Friendship removed' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/users/all', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.id, u.username, u.email, u.profile_picture,
            (SELECT status FROM friends WHERE (user_id = ? AND friend_id = u.id) OR (user_id = u.id AND friend_id = ?)) as friend_status,
            (SELECT user_id FROM friends WHERE (user_id = ? AND friend_id = u.id) OR (user_id = u.id AND friend_id = ?)) as request_sender
            FROM users u WHERE u.id != ?
        `, [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 1. Upload - Protected & Encrypted
app.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const userId = req.user.id;
        if (!req.file) return res.status(400).json({ error: 'No file' });

        let { folder_id, relative_path } = req.body;
        let originalName = req.file.originalname;
        try { originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8'); } catch (e) {}

        if (relative_path && relative_path !== 'undefined' && relative_path !== 'null') {
            const parts = relative_path.split('/').slice(0, -1);
            let pId = (folder_id && folder_id !== 'null') ? folder_id : null;
            for (const part of parts) {
                const q = pId ? 'SELECT id FROM folders WHERE user_id=? AND parent_id=? AND name=? AND is_deleted=FALSE' : 'SELECT id FROM folders WHERE user_id=? AND parent_id IS NULL AND name=? AND is_deleted=FALSE';
                const p = pId ? [userId, pId, part] : [userId, part];
                const existing = await db.query(q, p);
                if (existing.rows.length > 0) pId = existing.rows[0].id;
                else {
                    const nid = uuidv4();
                    await db.query('INSERT INTO folders (id, user_id, parent_id, name) VALUES (?,?,?,?)', [nid, userId, pId, part]);
                    pId = nid;
                }
            }
            folder_id = pId;
        }

        const folderPath = await getFolderPathString(folder_id);
        const targetDir = path.join(UPLOAD_DIR, userId, 'active', folderPath);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const diskFilename = req.file.filename;
        const finalRelPath = path.join('cloud', userId, 'active', folderPath, diskFilename).replace(/\\/g, '/');
        const finalAbsPath = path.resolve(finalRelPath);

        // Encrypt file before saving
        const fileData = fs.readFileSync(req.file.path);
        const encryptedData = encryptBuffer(fileData);
        fs.writeFileSync(finalAbsPath, encryptedData);
        fs.unlinkSync(req.file.path); // Remove temp file

        const fid = uuidv4();
        const target = (folder_id && folder_id !== 'null') ? folder_id : null;
        await db.query('INSERT INTO files (id, user_id, folder_id, name, storage_path, size, mime_type) VALUES (?,?,?,?,?,?,?)', 
            [fid, userId, target, originalName, finalRelPath, req.file.size, req.file.mimetype]);
        
        await logUserActivity(userId, 'UPLOAD', { file_name: originalName, size: req.file.size });
        res.status(201).json({ id: fid, name: originalName });
    } catch (err) {
        console.error('UPLOAD ERROR:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. List - Protected
app.get('/list', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const fid = (req.query.folder_id && req.query.folder_id !== 'null') ? req.query.folder_id : null;
        const trash = req.query.trash === 'true';
        
        let folders, files;

        if (fid) {
            const access = await db.query(`
                SELECT id FROM folders WHERE id=? AND user_id=?
                UNION
                SELECT folder_id FROM permissions WHERE folder_id=? AND user_id=?
            `, [fid, userId, fid, userId]);

            if (access.rows.length === 0) return res.status(403).json({ error: 'Access denied' });

            folders = await db.query('SELECT *, 0 AS is_shared FROM folders WHERE parent_id=? AND is_deleted=?', [fid, trash]);
            files = await db.query('SELECT *, 0 AS is_shared FROM files WHERE folder_id=? AND is_deleted=?', [fid, trash]);
        } else if (trash) {
            folders = await db.query('SELECT *, 0 AS is_shared FROM folders WHERE user_id=? AND is_deleted=TRUE', [userId]);
            files = await db.query('SELECT *, 0 AS is_shared FROM files WHERE user_id=? AND is_deleted=TRUE', [userId]);
        } else {
            folders = await db.query(`
                SELECT *, 0 AS is_shared, NULL AS owner_email FROM folders WHERE user_id=? AND parent_id IS NULL AND is_deleted=FALSE
                UNION
                SELECT f.*, 1 AS is_shared, u.email AS owner_email FROM folders f 
                INNER JOIN permissions p ON f.id = p.folder_id 
                INNER JOIN users u ON f.user_id = u.id
                WHERE p.user_id=? AND f.is_deleted=FALSE
            `, [userId, userId]);

            files = await db.query(`
                SELECT *, 0 AS is_shared, NULL AS owner_email FROM files WHERE user_id=? AND folder_id IS NULL AND is_deleted=FALSE
                UNION
                SELECT f.*, 1 AS is_shared, u.email AS owner_email FROM files f 
                INNER JOIN permissions p ON f.id = p.file_id 
                INNER JOIN users u ON f.user_id = u.id
                WHERE p.user_id=? AND f.is_deleted=FALSE
            `, [userId, userId]);
        }
        
        res.json({ folders: folders.rows, files: files.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Batch Action - Protected & Physical Move
app.post('/batch-action', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { ids, action } = req.body;
        if (!ids?.length) return res.json({ message: 'Empty' });

        const fileCheck = await db.query('SELECT id, name FROM files WHERE id IN (?) AND user_id=?', [ids, userId]);
        const fIds = fileCheck.rows.map(f => f.id);
        const fNames = fileCheck.rows.map(f => f.name);
        const foldIds = ids.filter(id => !fIds.includes(id));

        const moveFilePhysically = async (fileId, targetSubDir) => {
            const [file] = (await db.query('SELECT storage_path FROM files WHERE id=?', [fileId])).rows;
            if (!file) return;

            const oldPath = path.resolve(file.storage_path);
            const fileName = path.basename(oldPath);
            const newRelPath = `cloud/${userId}/${targetSubDir}/${fileName}`;
            const newAbsPath = path.resolve(newRelPath);

            const targetDir = path.dirname(newAbsPath);
            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            if (fs.existsSync(oldPath)) {
                fs.renameSync(oldPath, newAbsPath);
                await db.query('UPDATE files SET storage_path=? WHERE id=?', [newRelPath, fileId]);
            }
        };

        if (action === 'trash') {
            if (fIds.length) {
                await db.query('UPDATE files SET is_deleted=TRUE, deleted_at=NOW() WHERE id IN (?) AND user_id=?', [fIds, userId]);
                for (const fid of fIds) await moveFilePhysically(fid, 'trash');
                await logUserActivity(userId, 'TRASH', { items: fNames });
            }
            for (const id of foldIds) {
                const desc = await getDescendantFolderIds(id);
                const [folder] = (await db.query('SELECT name FROM folders WHERE id=?', [id])).rows;
                await db.query('UPDATE folders SET is_deleted=TRUE, deleted_at=NOW() WHERE id IN (?) AND user_id=?', [desc, userId]);
                const filesInFolders = await db.query('SELECT id FROM files WHERE folder_id IN (?) AND user_id=?', [desc, userId]);
                await db.query('UPDATE files SET is_deleted=TRUE, deleted_at=NOW() WHERE folder_id IN (?) AND user_id=?', [desc, userId]);
                for (const f of filesInFolders.rows) await moveFilePhysically(f.id, 'trash');
                await logUserActivity(userId, 'TRASH_FOLDER', { folder_name: folder?.name });
            }
        } else if (action === 'restore') {
            if (fIds.length) {
                await db.query('UPDATE files SET is_deleted=FALSE, deleted_at=NULL WHERE id IN (?) AND user_id=?', [fIds, userId]);
                for (const fid of fIds) await moveFilePhysically(fid, 'active');
                await logUserActivity(userId, 'RESTORE', { items: fNames });
            }
            for (const id of foldIds) {
                const desc = await getDescendantFolderIds(id);
                const [folder] = (await db.query('SELECT name FROM folders WHERE id=?', [id])).rows;
                await db.query('UPDATE folders SET is_deleted=FALSE, deleted_at=NULL WHERE id IN (?) AND user_id=?', [desc, userId]);
                const filesInFolders = await db.query('SELECT id FROM files WHERE folder_id IN (?) AND user_id=?', [desc, userId]);
                await db.query('UPDATE files SET is_deleted=FALSE, deleted_at=NULL WHERE folder_id IN (?) AND user_id=?', [desc, userId]);
                for (const f of filesInFolders.rows) await moveFilePhysically(f.id, 'active');
                await logUserActivity(userId, 'RESTORE_FOLDER', { folder_name: folder?.name });
            }
        } else if (action === 'delete') {
            if (fIds.length) {
                const results = await db.query('SELECT storage_path FROM files WHERE id IN (?) AND user_id=?', [fIds, userId]);
                results.rows.forEach(f => { try { fs.unlinkSync(path.resolve(f.storage_path)); } catch(e){} });
                await db.query('DELETE FROM files WHERE id IN (?) AND user_id=?', [fIds, userId]);
                await logUserActivity(userId, 'PERMANENT_DELETE', { items: fNames });
            }
            for (const id of foldIds) {
                const desc = await getDescendantFolderIds(id);
                const [folder] = (await db.query('SELECT name FROM folders WHERE id=?', [id])).rows;
                const files = await db.query('SELECT storage_path FROM files WHERE folder_id IN (?) AND user_id=?', [desc, userId]);
                files.rows.forEach(f => { try { fs.unlinkSync(path.resolve(f.storage_path)); } catch(e){} });
                await db.query('DELETE FROM folders WHERE id IN (?) AND user_id=?', [desc, userId]);
                await logUserActivity(userId, 'PERMANENT_DELETE_FOLDER', { folder_name: folder?.name });
            }
        }
        res.json({ message: 'Success' });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

app.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const r = await db.query('SELECT SUM(size) as total_size FROM files WHERE user_id=? AND is_deleted=FALSE', [userId]);
        const s = r.rows[0].total_size || 0;
        res.json({ used_bytes: s });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/files/view/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const r = await db.query(`
            SELECT storage_path, mime_type FROM files 
            WHERE id=? AND (user_id=? OR id IN (SELECT file_id FROM permissions WHERE user_id=?))
        `, [req.params.id, userId, userId]);
        if (!r.rows.length) return res.status(404).send('No access or not found');
        
        const encryptedData = fs.readFileSync(path.resolve(r.rows[0].storage_path));
        const decryptedData = decryptBuffer(encryptedData);
        
        res.setHeader('Content-Type', r.rows[0].mime_type);
        res.send(decryptedData);
    } catch (e) { res.status(500).send(e.message); }
});

app.get('/files/download/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const r = await db.query(`
            SELECT storage_path, name FROM files 
            WHERE id=? AND (user_id=? OR id IN (SELECT file_id FROM permissions WHERE user_id=?))
        `, [req.params.id, userId, userId]);
        if (r.rows.length) {
            const encryptedData = fs.readFileSync(path.resolve(r.rows[0].storage_path));
            const decryptedData = decryptBuffer(encryptedData);
            res.setHeader('Content-Disposition', `attachment; filename="${r.rows[0].name}"`);
            res.send(decryptedData);
        } else res.status(404).send('No access');
    } catch (e) { res.status(500).send(e.message); }
});

app.put('/files/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        await db.query('UPDATE files SET name = ? WHERE id = ? AND user_id = ?', [name, req.params.id, userId]);
        res.json({ ok: true });
    } catch (e) { res.status(500).send(e.message); }
});

app.put('/files/content/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const r = await db.query('SELECT storage_path FROM files WHERE id=? AND user_id=?', [req.params.id, userId]);
        if (r.rows.length) {
            const encryptedData = encryptBuffer(Buffer.from(req.body.content, 'utf8'));
            fs.writeFileSync(path.resolve(r.rows[0].storage_path), encryptedData);
            res.json({ ok: true });
        } else res.status(404).send('No access');
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/folders', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const id = uuidv4();
        const { parent_id, name, color, icon_type } = req.body;
        await db.query('INSERT INTO folders (id, user_id, parent_id, name, color, icon_type) VALUES (?,?,?,?,?,?)', 
            [id, userId, parent_id || null, name, color || 'blue', icon_type || 'folder']);
        
        const folderPath = await getFolderPathString(id);
        const absPath = path.resolve(UPLOAD_DIR, userId, 'active', folderPath);
        if (!fs.existsSync(absPath)) fs.mkdirSync(absPath, { recursive: true });

        res.status(201).json({ id, name, color: color || 'blue', icon_type: icon_type || 'folder' });
    } catch (e) { res.status(500).send(e.message); }
});

app.put('/folders/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, color, icon_type } = req.body;
        
        const oldFolderPath = await getFolderPathString(req.params.id);
        const oldAbsPath = path.resolve(UPLOAD_DIR, userId, 'active', oldFolderPath);
        
        await db.query('UPDATE folders SET name=?, color=?, icon_type=? WHERE id=? AND user_id=?', 
            [name, color, icon_type, req.params.id, userId]);
            
        const newFolderPath = await getFolderPathString(req.params.id);
        const newAbsPath = path.resolve(UPLOAD_DIR, userId, 'active', newFolderPath);
        
        if (fs.existsSync(oldAbsPath) && oldAbsPath !== newAbsPath) {
            fs.renameSync(oldAbsPath, newAbsPath);
            const updateChildPaths = async (parentId) => {
                const files = await db.query('SELECT id, storage_path FROM files WHERE folder_id = ?', [parentId]);
                for (const f of files.rows) {
                    const fileName = path.basename(f.storage_path);
                    const currentFolderRel = await getFolderPathString(parentId);
                    const newPath = path.join('cloud', userId, 'active', currentFolderRel, fileName).replace(/\\/g, '/');
                    await db.query('UPDATE files SET storage_path = ? WHERE id = ?', [newPath, f.id]);
                }
                const subfolders = await db.query('SELECT id FROM folders WHERE parent_id = ?', [parentId]);
                for (const sf of subfolders.rows) await updateChildPaths(sf.id);
            };
            await updateChildPaths(req.params.id);
        }

        res.json({ ok: true });
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/files/create', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const activeDir = path.join(UPLOAD_DIR, userId, 'active');
        if (!fs.existsSync(activeDir)) fs.mkdirSync(activeDir, { recursive: true });
        const filename = `${Date.now()}-${uuidv4()}.txt`;
        const p = path.join(activeDir, filename);
        
        // Save encrypted empty file
        const encryptedData = encryptBuffer(Buffer.from('', 'utf8'));
        fs.writeFileSync(p, encryptedData);
        
        const id = uuidv4();
        await db.query('INSERT INTO files (id, user_id, folder_id, name, storage_path, size, mime_type) VALUES (?,?,?,?,?,?,?)', 
            [id, userId, req.body.folder_id || null, req.body.name, `cloud/${userId}/active/${filename}`, 0, 'text/plain']);
        
        await logUserActivity(userId, 'DOCUMENT_CREATED', { name: req.body.name });

        res.status(201).json({ id, name: req.body.name });
    } catch (e) { res.status(500).send(e.message); }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server: ${PORT}`));
