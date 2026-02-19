const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const CURRENT_USER_ID = '00000000-0000-0000-0000-000000000001';
const UPLOAD_DIR = path.resolve('uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage: storage });

// Helper for Recursive IDs
const getDescendantFolderIds = async (parentId) => {
    let ids = [parentId];
    try {
        const sub = await db.query('SELECT id FROM folders WHERE parent_id = ?', [parentId]);
        for (const s of sub.rows) {
            const d = await getDescendantFolderIds(s.id);
            ids = [...ids, ...d];
        }
    } catch (e) {}
    return ids;
};

// 1. Upload - Ultra Resilient
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file' });

        let { folder_id, relative_path } = req.body;
        let name = req.file.originalname;
        try { name = Buffer.from(req.file.originalname, 'latin1').toString('utf8'); } catch (e) {}

        // Folder Reconstruction Logic
        if (relative_path && relative_path !== 'undefined' && relative_path !== 'null') {
            const parts = relative_path.split('/').slice(0, -1);
            let pId = (folder_id && folder_id !== 'null') ? folder_id : null;
            
            for (const part of parts) {
                try {
                    const q = pId ? 'SELECT id FROM folders WHERE user_id=? AND parent_id=? AND name=?' : 'SELECT id FROM folders WHERE user_id=? AND parent_id IS NULL AND name=?';
                    const p = pId ? [CURRENT_USER_ID, pId, part] : [CURRENT_USER_ID, part];
                    const existing = await db.query(q, p);
                    
                    if (existing.rows.length > 0) pId = existing.rows[0].id;
                    else {
                        const nid = uuidv4();
                        await db.query('INSERT INTO folders (id, user_id, parent_id, name) VALUES (?,?,?,?)', [nid, CURRENT_USER_ID, pId, part]);
                        pId = nid;
                    }
                } catch (err) {
                    // Critical: Try to find the folder again if parallel insert failed
                    const retry = await db.query(pId ? 'SELECT id FROM folders WHERE user_id=? AND parent_id=? AND name=?' : 'SELECT id FROM folders WHERE user_id=? AND parent_id IS NULL AND name=?', pId ? [CURRENT_USER_ID, pId, part] : [CURRENT_USER_ID, part]);
                    if (retry.rows.length > 0) pId = retry.rows[0].id;
                }
            }
            folder_id = pId;
        }

        const fid = uuidv4();
        const target = (folder_id && folder_id !== 'null') ? folder_id : null;
        await db.query('INSERT INTO files (id, user_id, folder_id, name, storage_path, size, mime_type) VALUES (?,?,?,?,?,?,?)', 
            [fid, CURRENT_USER_ID, target, name, `uploads/${req.file.filename}`, req.file.size, req.file.mimetype]);
        
        res.status(201).json({ id: fid, name });
    } catch (err) {
        console.error('UPLOAD ERROR:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. List
app.get('/list', async (req, res) => {
    try {
        const fid = (req.query.folder_id && req.query.folder_id !== 'null') ? req.query.folder_id : null;
        const trash = req.query.trash === 'true';
        const p = fid ? [CURRENT_USER_ID, fid, trash] : [CURRENT_USER_ID, trash];
        const folders = await db.query(fid ? 'SELECT * FROM folders WHERE user_id=? AND parent_id=? AND is_deleted=?' : 'SELECT * FROM folders WHERE user_id=? AND parent_id IS NULL AND is_deleted=?', p);
        const files = await db.query(fid ? 'SELECT * FROM files WHERE user_id=? AND folder_id=? AND is_deleted=?' : 'SELECT * FROM files WHERE user_id=? AND folder_id IS NULL AND is_deleted=?', p);
        res.json({ folders: folders.rows, files: files.rows });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Batch Action
app.post('/batch-action', async (req, res) => {
    try {
        const { ids, action } = req.body;
        if (!ids?.length) return res.json({ message: 'Empty' });

        const fileCheck = await db.query('SELECT id FROM files WHERE id IN (?)', [ids]);
        const fIds = fileCheck.rows.map(f => f.id);
        const foldIds = ids.filter(id => !fIds.includes(id));

        if (action === 'trash') {
            if (fIds.length) await db.query('UPDATE files SET is_deleted=TRUE, deleted_at=NOW() WHERE id IN (?)', [fIds]);
            for (const id of foldIds) {
                const desc = await getDescendantFolderIds(id);
                await db.query('UPDATE folders SET is_deleted=TRUE, deleted_at=NOW() WHERE id IN (?)', [desc]);
                await db.query('UPDATE files SET is_deleted=TRUE, deleted_at=NOW() WHERE folder_id IN (?)', [desc]);
            }
        } else if (action === 'restore') {
            if (fIds.length) await db.query('UPDATE files SET is_deleted=FALSE, deleted_at=NULL WHERE id IN (?)', [fIds]);
            for (const id of foldIds) {
                const desc = await getDescendantFolderIds(id);
                await db.query('UPDATE folders SET is_deleted=FALSE, deleted_at=NULL WHERE id IN (?)', [desc]);
                await db.query('UPDATE files SET is_deleted=FALSE, deleted_at=NULL WHERE folder_id IN (?)', [desc]);
            }
        } else if (action === 'delete') {
            if (fIds.length) {
                const results = await db.query('SELECT storage_path FROM files WHERE id IN (?)', [fIds]);
                results.rows.forEach(f => { try { fs.unlinkSync(path.resolve(f.storage_path)); } catch(e){} });
                await db.query('DELETE FROM files WHERE id IN (?)', [fIds]);
            }
            for (const id of foldIds) {
                const desc = await getDescendantFolderIds(id);
                const files = await db.query('SELECT storage_path FROM files WHERE folder_id IN (?)', [desc]);
                files.rows.forEach(f => { try { fs.unlinkSync(path.resolve(f.storage_path)); } catch(e){} });
                await db.query('DELETE FROM folders WHERE id IN (?)', [desc]);
            }
        }
        res.json({ message: 'Success' });
    } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
});

// Extra routes
app.get('/stats', async (req, res) => {
    try {
        const r = await db.query('SELECT SUM(size) as total_size FROM files WHERE user_id=? AND is_deleted=FALSE', [CURRENT_USER_ID]);
        const s = r.rows[0].total_size || 0;
        res.json({ used_mb: (s / (1024 * 1024)).toFixed(2) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/files/view/:id', async (req, res) => {
    try {
        const r = await db.query('SELECT storage_path, mime_type FROM files WHERE id=?', [req.params.id]);
        if (!r.rows.length) return res.status(404).send('No');
        res.setHeader('Content-Type', r.rows[0].mime_type);
        res.sendFile(path.resolve(r.rows[0].storage_path));
    } catch (e) { res.status(500).send(e.message); }
});

app.get('/files/download/:id', async (req, res) => {
    try {
        const r = await db.query('SELECT storage_path, name FROM files WHERE id=?', [req.params.id]);
        if (r.rows.length) res.download(path.resolve(r.rows[0].storage_path), r.rows[0].name);
    } catch (e) { res.status(500).send(e.message); }
});

app.put('/files/content/:id', async (req, res) => {
    try {
        const r = await db.query('SELECT storage_path FROM files WHERE id=?', [req.params.id]);
        if (r.rows.length) fs.writeFileSync(path.resolve(r.rows[0].storage_path), req.body.content, 'utf8');
        res.json({ ok: true });
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/folders', async (req, res) => {
    try {
        const id = uuidv4();
        await db.query('INSERT INTO folders (id, user_id, parent_id, name) VALUES (?,?,?,?)', [id, CURRENT_USER_ID, req.body.parent_id || null, req.body.name]);
        res.status(201).json({ id, name: req.body.name });
    } catch (e) { res.status(500).send(e.message); }
});

app.post('/files/create', async (req, res) => {
    try {
        const filename = `${Date.now()}-${uuidv4()}.txt`;
        const p = path.join(UPLOAD_DIR, filename);
        fs.writeFileSync(p, '', 'utf8');
        const id = uuidv4();
        await db.query('INSERT INTO files (id, user_id, folder_id, name, storage_path, size, mime_type) VALUES (?,?,?,?,?,?,?)', [id, CURRENT_USER_ID, req.body.folder_id || null, req.body.name, `uploads/${filename}`, 0, 'text/plain']);
        res.status(201).json({ id, name: req.body.name });
    } catch (e) { res.status(500).send(e.message); }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server: ${PORT}`));
