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
const UPLOAD_DIR = path.resolve('cloud');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Helper to build physical path from DB hierarchy
const getFolderPathString = async (folderId) => {
    if (!folderId || folderId === 'null') return '';
    const [folder] = (await db.query('SELECT name, parent_id FROM folders WHERE id = ?', [folderId])).rows;
    if (!folder) return '';
    const parentPath = await getFolderPathString(folder.parent_id);
    return path.join(parentPath, folder.name);
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
        const { username, email, password } = req.body;
        if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });

        const userId = uuidv4();
        const hash = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (id, username, email, password_hash) VALUES (?,?,?,?)', [userId, username, email, hash]);
        
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
        res.json({ token, username: user.username, role: user.role });
    } catch (err) { res.status(500).json({ error: err.message }); }
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
        const profilePath = `cloud/${userId}/${filename}`;
        const absPath = path.resolve(profilePath);

        // Move from temp to user root
        fs.renameSync(req.file.path, absPath);

        await db.query('UPDATE users SET profile_picture = ? WHERE id = ?', [profilePath, userId]);
        await logUserActivity(userId, 'PROFILE_PICTURE_UPDATED', { filename });

        res.json({ message: 'Profile picture updated', path: profilePath });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/users/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [user] = (await db.query('SELECT id, username, email, role, first_name, last_name, profile_picture, created_at FROM users WHERE id = ?', [userId])).rows;

        if (!user) return res.status(404).json({ error: 'User not found' });

        const [storage] = (await db.query('SELECT SUM(size) as total_size FROM files WHERE user_id = ? AND is_deleted = 0', [userId])).rows;

        res.json({
            ...user,
            storage_used: storage.total_size || 0,
            storage_quota: 5 * 1024 * 1024 * 1024 // 5GB mock quota
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
        const { item_id, item_type, target_user_id, access_level } = req.body;
        const id = uuidv4();
        const col = item_type === 'folder' ? 'folder_id' : 'file_id';
        await db.query(`INSERT INTO permissions (id, ${col}, user_id, access_level) VALUES (?,?,?,?) 
                       ON DUPLICATE KEY UPDATE access_level = VALUES(access_level)`, 
                       [id, item_id, target_user_id, access_level || 'view']);
        res.json({ message: 'Shared successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ADMIN ROUTES
app.get('/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const result = await db.query('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/admin/users/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
        
        // Delete user's physical cloud folder
        const userDir = path.resolve(UPLOAD_DIR, id);
        if (fs.existsSync(userDir)) fs.rmSync(userDir, { recursive: true, force: true });
        
        await db.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'User deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 1. Upload - Protected & Hierarchical
app.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const userId = req.user.id;
        if (!req.file) return res.status(400).json({ error: 'No file' });

        let { folder_id, relative_path } = req.body;
        let originalName = req.file.originalname;
        try { originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8'); } catch (e) {}

        // Folder Reconstruction (if uploading a folder)
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

        // 1. Determine final physical path
        const folderPath = await getFolderPathString(folder_id);
        const targetDir = path.join(UPLOAD_DIR, userId, 'active', folderPath);
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        // 2. Move file from temp to final destination
        const diskFilename = req.file.filename; // Use the unique filename from multer
        const finalRelPath = path.join('cloud', userId, 'active', folderPath, diskFilename).replace(/\\/g, '/');
        const finalAbsPath = path.resolve(finalRelPath);
        fs.renameSync(req.file.path, finalAbsPath);

        // 3. Save to DB
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
            // Content of a specific folder (owned by user)
            folders = await db.query('SELECT * FROM folders WHERE user_id=? AND parent_id=? AND is_deleted=?', [userId, fid, trash]);
            files = await db.query('SELECT * FROM files WHERE user_id=? AND folder_id=? AND is_deleted=?', [userId, fid, trash]);
        } else if (trash) {
            // Only user's trash
            folders = await db.query('SELECT * FROM folders WHERE user_id=? AND is_deleted=TRUE', [userId]);
            files = await db.query('SELECT * FROM files WHERE user_id=? AND is_deleted=TRUE', [userId]);
        } else {
            // Root: Own items + Shared items
            folders = await db.query(`
                SELECT * FROM folders WHERE user_id=? AND parent_id IS NULL AND is_deleted=FALSE
                UNION
                SELECT f.* FROM folders f 
                INNER JOIN permissions p ON f.id = p.folder_id 
                WHERE p.user_id=? AND f.is_deleted=FALSE
            `, [userId, userId]);

            files = await db.query(`
                SELECT * FROM files WHERE user_id=? AND folder_id IS NULL AND is_deleted=FALSE
                UNION
                SELECT f.* FROM files f 
                INNER JOIN permissions p ON f.id = p.file_id 
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

// Extra routes - Protected
app.get('/stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const r = await db.query('SELECT SUM(size) as total_size FROM files WHERE user_id=? AND is_deleted=FALSE', [userId]);
        const s = r.rows[0].total_size || 0;
        res.json({ used_mb: (s / (1024 * 1024)).toFixed(2) });
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
        res.setHeader('Content-Type', r.rows[0].mime_type);
        res.sendFile(path.resolve(r.rows[0].storage_path));
    } catch (e) { res.status(500).send(e.message); }
});

app.get('/files/download/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const r = await db.query(`
            SELECT storage_path, name FROM files 
            WHERE id=? AND (user_id=? OR id IN (SELECT file_id FROM permissions WHERE user_id=?))
        `, [req.params.id, userId, userId]);
        if (r.rows.length) res.download(path.resolve(r.rows[0].storage_path), r.rows[0].name);
        else res.status(404).send('No access');
    } catch (e) { res.status(500).send(e.message); }
});

app.put('/files/content/:id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const r = await db.query('SELECT storage_path FROM files WHERE id=? AND user_id=?', [req.params.id, userId]);
        if (r.rows.length) {
            fs.writeFileSync(path.resolve(r.rows[0].storage_path), req.body.content, 'utf8');
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
        
        // Physical mkdir
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
        
        // Physical rename
        const oldFolderPath = await getFolderPathString(req.params.id);
        const oldAbsPath = path.resolve(UPLOAD_DIR, userId, 'active', oldFolderPath);
        
        await db.query('UPDATE folders SET name=?, color=?, icon_type=? WHERE id=? AND user_id=?', 
            [name, color, icon_type, req.params.id, userId]);
            
        const newFolderPath = await getFolderPathString(req.params.id);
        const newAbsPath = path.resolve(UPLOAD_DIR, userId, 'active', newFolderPath);
        
        if (fs.existsSync(oldAbsPath) && oldAbsPath !== newAbsPath) {
            fs.renameSync(oldAbsPath, newAbsPath);
            // Update all child files paths in DB (recursive update)
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
        fs.writeFileSync(p, '', 'utf8');
        const id = uuidv4();
        await db.query('INSERT INTO files (id, user_id, folder_id, name, storage_path, size, mime_type) VALUES (?,?,?,?,?,?,?)', 
            [id, userId, req.body.folder_id || null, req.body.name, `cloud/${userId}/active/${filename}`, 0, 'text/plain']);
        
        await logUserActivity(userId, 'DOCUMENT_CREATED', { name: req.body.name });

        res.status(201).json({ id, name: req.body.name });
    } catch (e) { res.status(500).send(e.message); }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server: ${PORT}`));
