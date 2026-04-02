import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { renderAsync } from 'docx-preview';
import Chat from './Chat';
import Tickets from './Tickets';
import { 
  Folder, File, FileText, Image as ImageIcon, Video, Play, 
  MoreVertical, Download, Edit2, Trash2, Share2, 
  ChevronRight, ChevronDown, Grid, List, Search,
  Upload, X, Copy, Check, ZoomIn, ZoomOut, HardDrive, Loader2, Maximize, Plus,
  Clock, Users, Trash, Info, LayoutGrid, List as ListIcon, ChevronLeft, ExternalLink,
  FileSpreadsheet, FileArchive, FileCode, Presentation, FileDigit, FileType, CheckSquare, Square,
  RotateCcw, ShieldAlert, AlertCircle, CheckCircle2, FolderPlus, FilePlus, FileUp, FolderUp,
  Database, Cpu, ShieldCheck, Lock, Settings2, CloudLightning, Briefcase, BookOpen, Music, Camera,
  User, Palette, MessageSquare, Shield, Zap, Cloud
} from 'lucide-react';

const API_BASE = 'http://localhost:3000';

const getAuthenticatedUrl = (path) => {
  const token = localStorage.getItem('token');
  return `${API_BASE}${path}${path.includes('?') ? '&' : '?'}token=${token}`;
};

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleDateString('bg-BG', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
};

const getFileIcon = (mimeType, name) => {
  const fileName = name?.toLowerCase() || '';
  if (mimeType?.startsWith('image/')) return <ImageIcon size={20} className="text-gray-400" />;
  if (mimeType?.startsWith('video/')) return <Video size={20} className="text-gray-400" />;
  if (/\.(zip|7z|rar|tar|gz)$/.test(fileName)) return <FileArchive size={20} className="text-gray-400" />;
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) return <FileSpreadsheet size={20} className="text-gray-400" />;
  if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) return <FileText size={20} className="text-gray-400" />;
  if (fileName.endsWith('.pdf')) return <FileDigit size={20} className="text-gray-400" />;
  if (/\.(js|ts|py|c|sql|json|html|css)$/.test(fileName)) return <FileCode size={20} className="text-gray-400" />;
  return <File size={20} className="text-gray-400" />;
};

const Toast = ({ notifications, remove }) => (
  <div className="fixed bottom-10 right-10 z-[250] flex flex-col gap-3 max-w-sm w-full">
    {notifications.map(n => (
      <div key={n.id} className={`flex items-start gap-4 p-6 rounded-[2rem] shadow-2xl border-4 border-white animate-in slide-in-from-right-10 duration-300 ${n.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
        {n.type === 'error' ? <AlertCircle size={24} className="text-red-500" /> : <CheckCircle2 size={24} className="text-green-500" />}
        <div className="flex-1 overflow-hidden"><p className="font-black text-xs uppercase tracking-widest">{n.title}</p><p className="text-[11px] font-bold opacity-70 truncate">{n.message}</p></div>
        <button onClick={() => remove(n.id)} className="opacity-40 hover:opacity-100 transition-opacity"><X size={16}/></button>
      </div>
    ))}
  </div>
);

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-6xl', height = 'h-[90vh]' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[4px] animate-in fade-in duration-200">
      <div className={`bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full ${maxWidth} ${height} flex flex-col overflow-hidden transition-all duration-300 border-4 border-white dark:border-gray-800`}>
        <div className="px-10 py-6 border-b dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 shrink-0">
          <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] truncate pr-4 italic">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 rounded-full transition-all text-gray-400"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-auto bg-white dark:bg-gray-900">{children}</div>
      </div>
    </div>
  );
};

const FilePreviewer = ({ file, isOpen, onClose, onSave, addNotify }) => {
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const docxRef = useRef(null);

  useEffect(() => {
    if (isOpen && file) {
      const fn = file.name.toLowerCase();
      if (fn.endsWith('.docx')) renderDocx();
      else if (file.mime_type?.startsWith('text/') || /\.(js|py|sql|txt|md|json)$/.test(fn)) fetchText();
    } else { setContent(''); setIsEditing(false); }
  }, [isOpen, file]);

  const fetchText = async () => {
    setLoading(true);
    try { 
      const r = await axios.get(`${API_BASE}/files/view/${file.id}`); 
      setContent(typeof r.data === 'object' ? JSON.stringify(r.data, null, 2) : r.data); 
    } 
    catch (e) { 
      setContent('Load error'); 
      addNotify('error', 'Preview Error', `Could not load ${file.name}`);
    } finally { setLoading(false); }
  };

  const renderDocx = async () => {
    setLoading(true);
    try { 
      const r = await axios.get(`${API_BASE}/files/view/${file.id}`, { responseType: 'blob' }); 
      setTimeout(() => docxRef.current && renderAsync(r.data, docxRef.current), 100); 
    } 
    catch (e) {
      addNotify('error', 'Preview Error', `Could not render ${file.name}`);
    } finally { setLoading(false); }
  };

  if (!file) return null;
  const fn = file.name.toLowerCase();
  const isBinaryMedia = file.mime_type?.startsWith('image/') || 
                         file.mime_type?.startsWith('video/') || 
                         /\.(pdf|docx|doc|xlsx|xls|pptx|ppt|zip|7z|rar|exe|bin|apk|jar|deb|rpm|iso)$/.test(fn);
  const isText = !isBinaryMedia || file.mime_type?.startsWith('text/');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? `Editing: ${file.name}` : file.name}>
      <div className="flex flex-col h-full">
        <div className="px-8 py-4 border-b dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 shrink-0">
           <div className="flex gap-4">
              {isText && !isEditing && <button onClick={() => setIsEditing(true)} className="px-6 py-2 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Edit Document</button>}
              {isEditing && <button onClick={async () => { await axios.put(`${API_BASE}/files/content/${file.id}`, { content }); setIsEditing(false); onSave(); }} className="px-6 py-2 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Save Changes</button>}
           </div>
           <a href={getAuthenticatedUrl(`/files/download/${file.id}`)} className="flex items-center gap-2 px-6 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 rounded-xl text-gray-900 dark:text-white text-[10px] font-black uppercase tracking-widest transition-all border border-gray-100 shadow-sm"><Download size={16} /> Download Copy</a>
        </div>
        <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-gray-50 dark:bg-gray-950">
           {loading ? <Loader2 size={40} className="animate-spin text-accent-500" /> :
            file.mime_type?.startsWith('image/') ? <img src={getAuthenticatedUrl(`/files/view/${file.id}`)} className="max-w-[90%] max-h-[90%] shadow-2xl rounded-2xl border-8 border-white" /> :
            file.mime_type?.startsWith('video/') ? <video controls className="w-full h-full bg-black" src={getAuthenticatedUrl(`/files/view/${file.id}`)} /> :
            fn.endsWith('.pdf') ? <iframe src={getAuthenticatedUrl(`/files/view/${file.id}`)} className="w-full h-full border-none" /> :
            fn.endsWith('.docx') ? <div className="w-full h-full overflow-auto p-10"><div ref={docxRef} className="mx-auto max-w-3xl bg-white dark:bg-gray-900 shadow-xl p-10 rounded-2xl" /></div> :
            isText ? (isEditing ? <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full h-full p-10 font-mono text-sm outline-none bg-transparent" spellCheck="false" /> : <div className="w-full h-full p-10 overflow-auto font-mono text-sm whitespace-pre-wrap">{content}</div>) :
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-gray-100 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner"><ShieldAlert size={40} className="text-gray-400" /></div>
              <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Preview not supported</p>
              <button onClick={() => { setContent(''); fetchText(); }} className="px-8 py-3 bg-white text-gray-900 border-4 border-gray-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all">Force Text View</button>
            </div>}
        </div>
      </div>
    </Modal>
  );
};

const ContextMenu = ({ x, y, visible, onClose, items }) => {
  if (!visible) return null;
  return (
    <div 
      className="fixed z-[300] bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl shadow-2xl py-2 min-w-[200px] animate-in fade-in zoom-in duration-150"
      style={{ left: x, top: y }}
      onMouseLeave={onClose}
    >
      {items.map((item, i) => (
        item.type === 'separator' ? 
          <div key={i} className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-3" /> :
          <button
            key={i}
            onClick={() => { item.onClick(); onClose(); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all ${item.danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            {item.icon}
            {item.label}
          </button>
      ))}
    </div>
  );
};

const FileManager = ({ userRole, onLogout, theme, setTheme, accentColor, setAccentColor }) => {
  const [viewMode, setViewMode] = useState('list');
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(userRole === 'admin');
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [newAdminFormData, setNewAdminFormData] = useState({ username: '', email: '', password: '', first_name: '', last_name: '' });
  const [userEditFormData, setUserEditFormData] = useState({ id: '', username: '', email: '', first_name: '', last_name: '', role: 'user', storage_quota: 1073741824, password: '' });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsFormData, setSettingsFormData] = useState({ username: '', email: '', password: '', first_name: '', last_name: '' });
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [path, setPath] = useState([{ id: null, name: 'My files' }]);
  const [stats, setStats] = useState({ used_mb: '0', percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [isTrashView, setIsTrashView] = useState(false);
  const [isChatView, setIsChatView] = useState(false);
  const [isTicketsView, setIsTicketsView] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sidePanelItem, setSidePanelItem] = useState(null);
  const [activeSettingsTab, setActiveSettingsTab] = useState('profile');
  const [userData, setUserData] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [serverStatus, setServerStatus] = useState({ apache: false, mysql: false });
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [isRenamingFile, setIsRenamingFile] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFileId, setEditingFileId] = useState(null);
  const [editingFileExt, setEditingFileExt] = useState('');
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [isNewDropdownOpen, setIsNewDropdownOpen] = useState(false);
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareSearchQuery, setShareSearchQuery] = useState('');
  const [shareSearchResults, setShareSearchResults] = useState([]);
  const [selectedShareUsers, setSelectedShareUsers] = useState([]);
  const [shareAccessLevel, setShareAccessLevel] = useState('view');
  const [itemsToShare, setItemsToShare] = useState([]);
  const [newName, setNewName] = useState('');
  const [ctxMenu, setCtxMenu] = useState({ visible: false, x: 0, y: 0, items: [] });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const profilePicRef = useRef(null);

  const handleContextMenu = (e, item, isFolder) => {
    e.preventDefault();
    const items = [
      { label: 'Open', icon: <Maximize size={14} />, onClick: () => isFolder ? setCurrentFolderId(item.id) : (setSelectedFile(item), setIsPreviewOpen(true)) },
      { label: 'Rename', icon: <Edit2 size={14} />, onClick: () => { 
          if (isFolder) { setEditingFolderId(item.id); setNewName(item.name); setIsEditingFolder(true); } 
          else { setEditingFileId(item.id); setNewName(item.name.split('.').slice(0, -1).join('.')); setEditingFileExt(item.name.split('.').pop()); setIsRenamingFile(true); }
      }},
      { label: 'Share', icon: <Share2 size={14} />, onClick: () => { setItemsToShare([item.id]); setIsShareModalOpen(true); } },
      { type: 'separator' },
      { label: isTrashView ? 'Restore' : 'Move to Trash', icon: isTrashView ? <RotateCcw size={14} /> : <Trash2 size={14} />, onClick: () => handleBatchAction(isTrashView ? 'restore' : 'trash', [item.id]) },
      { label: 'Delete Permanently', icon: <ShieldAlert size={14} />, danger: true, onClick: () => handleBatchAction('delete', [item.id]) },
    ];
    setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, items });
  };

  const getColorHex = (color) => {
    const map = { blue: '#3b82f6', indigo: '#6366f1', sky: '#0ea5e9', cyan: '#06b6d4', teal: '#14b8a6', emerald: '#10b981', green: '#22c55e', lime: '#84cc16', amber: '#f59e0b', orange: '#f97316', red: '#ef4444', rose: '#f43f5e', pink: '#ec4899', fuchsia: '#d946ef', purple: '#a855f7', violet: '#8b5cf6', gray: '#6b7280' };
    return map[color] || map.blue;
  };

  const getFolderIcon = (iconType, color) => {
    const hex = getColorHex(color);
    const iconProps = { size: 24, style: { color: hex } };
    const wrap = (icon) => (<div className="relative flex items-center justify-center w-10 h-10 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-50">{icon}</div>);
    switch(iconType) {
      case 'database': return wrap(<Database {...iconProps} />);
      case 'cpu': return wrap(<Cpu {...iconProps} />);
      case 'shield': return wrap(<ShieldCheck {...iconProps} />);
      case 'lock': return wrap(<Lock {...iconProps} />);
      case 'settings': return wrap(<Settings2 {...iconProps} />);
      case 'cloud': return wrap(<CloudLightning {...iconProps} />);
      case 'work': return wrap(<Briefcase {...iconProps} />);
      case 'book': return wrap(<BookOpen {...iconProps} />);
      case 'music': return wrap(<Music {...iconProps} />);
      case 'camera': return wrap(<Camera {...iconProps} />);
      default: return wrap(<Folder {...iconProps} />);
    }
  };

  const getFolderIconLarge = (iconType, color) => {
    const hex = getColorHex(color);
    const iconProps = { size: 64, style: { color: hex } };
    const wrap = (icon) => (<div className="relative flex items-center justify-center"><div className="absolute inset-0 scale-110 blur-xl opacity-10" style={{ backgroundColor: hex }} />{icon}</div>);
    switch(iconType) {
      case 'database': return wrap(<Database {...iconProps} />);
      case 'cpu': return wrap(<Cpu {...iconProps} />);
      case 'shield': return wrap(<ShieldCheck {...iconProps} />);
      case 'lock': return wrap(<Lock {...iconProps} />);
      case 'settings': return wrap(<Settings2 {...iconProps} />);
      case 'cloud': return wrap(<CloudLightning {...iconProps} />);
      case 'work': return wrap(<Briefcase {...iconProps} />);
      case 'book': return wrap(<BookOpen {...iconProps} />);
      case 'music': return wrap(<Music {...iconProps} />);
      case 'camera': return wrap(<Camera {...iconProps} />);
      default: return wrap(<Folder {...iconProps} />);
    }
  };

  const addNotify = (type, title, message) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 6000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const l = await axios.get(`${API_BASE}/list`, { params: { folder_id: currentFolderId, trash: isTrashView } });
      const s = await axios.get(`${API_BASE}/stats`);
      setFiles(l.data.files); setFolders(l.data.folders);
      const usedBytes = parseFloat(s.data.used_bytes || 0);
      const usedMB = (usedBytes / (1024 * 1024));
      setStats({ used_mb: usedMB.toFixed(1), percentage: (usedMB / 1024) * 100 });
      setSelectedIds(new Set());
    } catch (e) { addNotify('error', 'Sync Error', 'Cannot reach server'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); fetchUserData(); }, [currentFolderId, isTrashView]);
  useEffect(() => { if (userRole === 'admin' && isAdminPanelOpen) fetchAdminUsers(); }, [userRole, isAdminPanelOpen]);

  const filteredItems = useMemo(() => {
    let combined = [...folders.map(f => ({ ...f, isFolder: true })), ...files.map(f => ({ ...f, isFolder: false }))];
    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      combined = combined.filter(item => item.name.toLowerCase().includes(lowSearch));
    }
    combined.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') return (b.size || 0) - (a.size || 0);
      if (sortBy === 'date') return new Date(b.created_at) - new Date(a.created_at);
      return 0;
    });
    return combined;
  }, [files, folders, searchTerm, sortBy]);

  const handleUpload = async (e, isFolder = false) => {
    const sFiles = Array.from(e.target.files);
    if (!sFiles.length) return;
    setLoading(true); setIsUploadDropdownOpen(false);
    let ok = 0;
    for (const f of sFiles) {
      try {
        const formData = new FormData();
        formData.append('file', f);
        if (currentFolderId) formData.append('folder_id', currentFolderId);
        if (isFolder && f.webkitRelativePath) formData.append('relative_path', f.webkitRelativePath);
        await axios.post(`${API_BASE}/upload`, formData);
        ok++;
      } catch (e) { addNotify('error', 'Upload Error', `${f.name} failed`); }
    }
    if (ok > 0) addNotify('success', 'Upload Complete', `${ok} items uploaded.`);
    fetchData();
  };

  const handleBatch = async (action) => {
    if (!selectedIds.size) return;
    try {
      let idsToProcess = Array.from(selectedIds);
      if (action === 'delete' || action === 'trash') {
        const selectedItems = filteredItems.filter(i => selectedIds.has(i.id));
        const sharedCount = selectedItems.filter(i => i.is_shared).length;
        if (sharedCount > 0) {
          if (sharedCount === selectedIds.size) { addNotify('error', 'Action Denied', 'Shared items cannot be deleted'); return; }
          idsToProcess = selectedItems.filter(i => !i.is_shared).map(i => i.id);
          addNotify('info', 'Note', `Skipped ${sharedCount} shared items`);
        }
      }
      await axios.post(`${API_BASE}/batch-action`, { ids: idsToProcess, action: isTrashView && action === 'delete' ? 'delete' : (action === 'delete' ? 'trash' : 'restore') });
      addNotify('success', 'Done', 'Action successful');
      fetchData();
    } catch (e) { addNotify('error', 'Error', 'Action failed'); }
  };

  const handleAction = async (id, action) => {
    try {
      const act = action === 'restore' ? 'restore' : (isTrashView ? 'delete' : 'trash');
      await axios.post(`${API_BASE}/batch-action`, { ids: [id], action: act });
      addNotify('success', 'Success', 'Action completed');
      fetchData();
    } catch (e) { addNotify('error', 'Error', 'Action failed'); }
  };

  const toggleSelection = (id, e) => {
    if (e) e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === (files.length + folders.length)) setSelectedIds(new Set());
    else setSelectedIds(new Set([...files.map(f => f.id), ...folders.map(f => f.id)]));
  };

  const navigateTo = (f) => {
    if (isTrashView) return;
    setCurrentFolderId(f.id);
    if (f.id === null) setPath([{ id: null, name: 'My files' }]);
    else {
      const idx = path.findIndex(p => p.id === f.id);
      if (idx !== -1) setPath(path.slice(0, idx + 1));
      else setPath([...path, { id: f.id, name: f.name }]);
    }
  };

  const searchUsers = async (q) => {
    setShareSearchQuery(q);
    if (q.length < 2) { setShareSearchResults([]); return; }
    try {
      const res = await axios.get(`${API_BASE}/users/search?q=${q}`);
      setShareSearchResults(res.data);
    } catch (e) { console.error('Search error', e); }
  };

  const [publicUrl, setPublicUrl] = useState('');

  const generatePublicLink = async () => {
    if (!itemsToShare.length) return;
    try {
      const item = itemsToShare[0];
      const res = await axios.post(`${API_BASE}/share/public`, { item_id: item.id, type: item.isFolder ? 'folder' : 'file' });
      setPublicUrl(res.data.public_url);
      addNotify('success', 'Public Link Ready', 'Link generated successfully');
    } catch (e) { addNotify('error', 'Error', 'Could not generate public link'); }
  };

  const handleShare = async () => {
    if (!itemsToShare.length || !selectedShareUsers.length) { addNotify('error', 'Validation', 'Select at least one item and one user'); return; }
    try {
      const itemTypes = {};
      itemsToShare.forEach(item => { itemTypes[item.id] = item.isFolder ? 'folder' : 'file'; });
      await axios.post(`${API_BASE}/share`, { item_ids: itemsToShare.map(i => i.id), item_types: itemTypes, target_user_ids: selectedShareUsers.map(u => u.id), access_level: shareAccessLevel });
      addNotify('success', 'Shared', `Access granted to ${selectedShareUsers.length} users`);
      setIsShareModalOpen(false); setItemsToShare([]); setSelectedShareUsers([]); setShareSearchQuery('');
    } catch (e) { addNotify('error', 'Share Error', 'Could not share items'); }
  };

  const openShareModal = (itemOrSelection) => {
    if (Array.isArray(itemOrSelection)) setItemsToShare(itemOrSelection);
    else setItemsToShare([itemOrSelection]);
    setIsShareModalOpen(true);
  };

  const fetchAdminUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/users`);
      setAdminUsers(res.data);
    } catch (e) { addNotify('error', 'Admin Error', 'Failed to load users'); }
  };

  const fetchUserData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/users/me`);
      setUserData(res.data);
      setSettingsFormData({ username: res.data.username, email: res.data.email, first_name: res.data.first_name || '', last_name: res.data.last_name || '', password: '' });
    } catch (e) { addNotify('error', 'Profile Error', 'Failed to load user profile'); }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure? This will delete the user and ALL their files forever!')) return;
    try {
      await axios.delete(`${API_BASE}/admin/users/${id}`);
      addNotify('success', 'User Deleted', 'Account and files removed.');
      fetchAdminUsers();
    } catch (e) { addNotify('error', 'Admin Error', 'Could not delete user'); }
  };

  const fetchServerStatus = async () => {
    if (userRole !== 'admin') return;
    try {
      const res = await axios.get(`${API_BASE}/admin/server/status`);
      setServerStatus(res.data);
    } catch (e) { console.error('Status fetch failed'); }
  };

  const handleServerAction = async (service, action) => {
    try {
      addNotify('info', 'System', `Sending ${action} command to ${service}...`);
      await axios.post(`${API_BASE}/admin/server/action`, { service, action });
      setTimeout(fetchServerStatus, 3000);
    } catch (e) { addNotify('error', 'Server Error', `Failed to ${action} ${service}`); }
  };

  useEffect(() => {
    if (isSettingsModalOpen && activeSettingsTab === 'server') {
      fetchServerStatus();
      const interval = setInterval(fetchServerStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isSettingsModalOpen, activeSettingsTab]);

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setIsUpdatingSettings(true);
    try {
      await axios.put(`${API_BASE}/users/settings`, settingsFormData);
      if (profilePicRef.current && profilePicRef.current.files.length > 0) {
        const formData = new FormData();
        formData.append('avatar', profilePicRef.current.files[0]);
        await axios.post(`${API_BASE}/users/profile-picture`, formData);
      }
      addNotify('success', 'Settings Updated', 'Your profile has been updated.');
      localStorage.setItem('username', settingsFormData.username);
      setAvatarPreview(null); fetchUserData(); setIsSettingsModalOpen(false);
    } catch (e) { addNotify('error', 'Update Error', e.response?.data?.error || 'Failed to update settings'); } finally { setIsUpdatingSettings(false); }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/admin/create-admin`, newAdminFormData);
      addNotify('success', 'Admin Created', `New administrator ${newAdminFormData.username} has been added.`);
      setIsCreatingAdmin(false); setNewAdminFormData({ username: '', email: '', password: '', first_name: '', last_name: '' }); fetchAdminUsers();
    } catch (e) { addNotify('error', 'Creation Error', e.response?.data?.error || 'Failed to create admin'); }
  };

  const handleAdminUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE}/admin/users/${userEditFormData.id}`, userEditFormData);
      addNotify('success', 'User Updated', `Account for ${userEditFormData.username} has been modified.`);
      setIsEditingUser(false); fetchAdminUsers();
    } catch (e) { addNotify('error', 'Update Error', e.response?.data?.error || 'Failed to update user'); }
  };

  const handleCreate = async (type) => {
    if (!newName.trim()) { addNotify('error', 'Validation Error', 'Name cannot be empty'); return; }
    try {
      if (type === 'folder') {
        await axios.post(`${API_BASE}/folders`, { name: newName, parent_id: currentFolderId, color: selectedColor, icon_type: selectedIcon });
        setNewName(''); setIsNewFolderModalOpen(false); fetchData();
        addNotify('success', 'Folder Created', `Folder "${newName}" is ready.`);
      } else {
        const res = await axios.post(`${API_BASE}/files/create`, { name: newName.includes('.') ? newName : newName + '.txt', folder_id: currentFolderId });
        setNewName(''); setIsNewFileModalOpen(false); await fetchData();
        if (res.data && res.data.id) { setSelectedFile({ id: res.data.id, name: res.data.name, mime_type: 'text/plain' }); setIsPreviewOpen(true); }
      }
    } catch (err) { addNotify('error', 'Error', 'Operation failed'); }
  };

  const handleUpdateFolder = async () => {
    if (!newName.trim()) { addNotify('error', 'Validation Error', 'Name cannot be empty'); return; }
    try {
      await axios.put(`${API_BASE}/folders/${editingFolderId}`, { name: newName, color: selectedColor, icon_type: selectedIcon });
      if (sidePanelItem && sidePanelItem.id === editingFolderId) setSidePanelItem(prev => ({ ...prev, name: newName, color: selectedColor, icon_type: selectedIcon }));
      setNewName(''); setIsEditingFolder(false); setEditingFolderId(null); fetchData(); addNotify('success', 'Folder Updated', 'Changes saved successfully.');
    } catch (e) { addNotify('error', 'Error', 'Update failed'); }
  };

  const handleRenameFile = async () => {
    if (!newName.trim()) { addNotify('error', 'Validation Error', 'Name cannot be empty'); return; }
    try {
      const finalName = newName.trim() + (editingFileExt ? '.' + editingFileExt : '');
      await axios.put(`${API_BASE}/files/${editingFileId}`, { name: finalName });
      if (sidePanelItem && sidePanelItem.id === editingFileId) setSidePanelItem(prev => ({ ...prev, name: finalName }));
      setNewName(''); setIsRenamingFile(false); setEditingFileId(null); setEditingFileExt(''); fetchData(); addNotify('success', 'Asset Renamed', 'New identity applied successfully.');
    } catch (e) { addNotify('error', 'Error', 'Rename failed'); }
  };

  const startEditFolder = (f) => { setEditingFolderId(f.id); setNewName(f.name); setSelectedColor(f.color || 'blue'); setSelectedIcon(f.icon_type || 'folder'); setIsEditingFolder(true); };
  const startRenameFile = (f) => { 
    setEditingFileId(f.id); 
    const lastDot = f.name.lastIndexOf('.');
    if (lastDot !== -1) {
      setNewName(f.name.substring(0, lastDot));
      setEditingFileExt(f.name.substring(lastDot + 1));
    } else {
      setNewName(f.name);
      setEditingFileExt('');
    }
    setIsRenamingFile(true); 
  };

  const { myItems, sharedItems, showSeparated } = useMemo(() => {
    const isRoot = !currentFolderId && !isTrashView;
    if (!isRoot) return { myItems: filteredItems, sharedItems: [], showSeparated: false };
    return { myItems: filteredItems.filter(i => !i.is_shared), sharedItems: filteredItems.filter(i => i.is_shared), showSeparated: filteredItems.some(i => i.is_shared) };
  }, [filteredItems, currentFolderId, isTrashView]);

  const renderListItem = (item) => {
    const isF = item.isFolder;
    return (
      <tr key={item.id} 
         className={`group hover:bg-gray-50/80 dark:hover:bg-accent-900/20 cursor-pointer transition-all ${selectedIds.has(item.id) ? 'bg-accent-50/50' : ''} ${sidePanelItem?.id === item.id ? 'bg-gray-50' : ''}`} 
         onClick={() => setSidePanelItem(item)}
         onContextMenu={(e) => handleContextMenu(e, item, isF)}
         onDoubleClick={() => { if (!isTrashView && isF) navigateTo(item); else if (!isTrashView && !isF) { setSelectedFile(item); setIsPreviewOpen(true); } }}>
         <td className="px-6 py-5 text-center" onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}>{selectedIds.has(item.id) ? <CheckSquare size={18} className="text-gray-900"/> : <Square size={18} className="text-gray-200 group-hover:text-gray-400" />}</td>
         <td className="px-4 py-5 flex items-center gap-4">
           {isF ? getFolderIcon(item.icon_type, item.color) : <div className="w-10 h-10 bg-white border border-gray-50 rounded-xl shadow-sm flex items-center justify-center">{getFileIcon(item.mime_type, item.name)}</div>}
           <div className="flex flex-col">
             <span className="font-black text-gray-900 dark:text-gray-100 leading-none">{item.name}</span>
             {item.is_shared && item.owner_email && <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1.5">Shared by {item.owner_email}</span>}
           </div>
         </td>
         <td className="text-center text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest whitespace-nowrap px-4">{formatDate(item.created_at)}</td>
         <td className="text-center text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{isF ? '—' : formatSize(item.size)}</td>
         <td className="text-right px-6">{isTrashView && <button onClick={(e) => { e.stopPropagation(); handleAction(item.id, 'restore'); }} className="p-3 bg-white text-gray-900 border-2 border-gray-50 rounded-xl shadow-sm hover:scale-110 transition-transform"><RotateCcw size={18}/></button>}</td>
      </tr>
    );
  };

  const renderGridItem = (item) => {
    const isF = item.isFolder;
    return (
      <div key={item.id} 
           className={`group p-6 rounded-[2.5rem] bg-white dark:bg-gray-900 border-4 transition-all cursor-pointer relative shadow-sm hover:shadow-xl hover:scale-[1.02] ${selectedIds.has(item.id) ? 'border-gray-900 dark:border-accent-500 shadow-xl' : 'border-white dark:border-gray-800'} ${sidePanelItem?.id === item.id ? 'ring-4 ring-gray-100 dark:ring-gray-800' : ''}`} 
           onClick={() => setSidePanelItem(item)}
           onContextMenu={(e) => handleContextMenu(e, item, isF)}
           onDoubleClick={() => { if (isTrashView) toggleSelection(item.id); else if (isF) navigateTo(item); else { setSelectedFile(item); setIsPreviewOpen(true); } }}>
         <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => toggleSelection(item.id, e)}>{selectedIds.has(item.id) ? <CheckSquare size={22} className="text-gray-900 dark:text-accent-400"/> : <Square size={22} className="text-gray-300" />}</div>
         <div className="aspect-square bg-gray-50 dark:bg-gray-950 rounded-[2rem] flex items-center justify-center mb-5 overflow-hidden border-2 border-white dark:border-gray-800 shadow-inner">{isF ? getFolderIconLarge(item.icon_type, item.color) : (item.mime_type?.startsWith('image/') ? <img src={getAuthenticatedUrl(`/files/view/${item.id}`)} className="w-full h-full object-cover" /> : <div className="scale-125 opacity-40">{getFileIcon(item.mime_type, item.name)}</div>)}</div>
         <p className="text-xs font-black text-center truncate italic tracking-tight text-gray-900 dark:text-gray-100">{item.name}</p>
         <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-center mt-2">{item.is_shared ? `by ${item.owner_email.split('@')[0]}` : formatDate(item.created_at)}</p>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors font-sans overflow-hidden text-sm p-4">
      <Toast notifications={notifications} remove={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />
      
      <aside className="w-72 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl flex flex-col shrink-0 z-20 rounded-[2.5rem] border-4 border-white dark:border-gray-800 mr-4 shadow-xl">
        <div className="p-8 flex items-center gap-3 mb-6 cursor-pointer group" onClick={() => { setIsTrashView(false); setCurrentFolderId(null); }}>
           <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform border border-gray-100">
             <Cloud className="text-gray-900" size={24} />
           </div>
           <span className="font-black text-gray-900 dark:text-white text-xl tracking-tighter italic">Cloud</span>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {userRole !== 'admin' && (
            <>
              <button onClick={() => { setIsTrashView(false); setIsChatView(false); setIsAdminPanelOpen(false); setIsTicketsView(false); setCurrentFolderId(null); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.15em] transition-all ${!isTrashView && !isChatView && !isAdminPanelOpen && !isTicketsView ? 'bg-gray-900 text-white shadow-2xl scale-105' : 'text-gray-400 hover:bg-white dark:hover:bg-gray-800'}`}><Folder size={18} /> My files</button>
              <button onClick={() => { setIsChatView(true); setIsTrashView(false); setIsAdminPanelOpen(false); setIsTicketsView(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.15em] transition-all ${isChatView ? 'bg-gray-900 text-white shadow-2xl scale-105' : 'text-gray-400 hover:bg-white dark:hover:bg-gray-800'}`}><MessageSquare size={18} /> Chat</button>
              <button onClick={() => { setIsTrashView(true); setIsChatView(false); setIsAdminPanelOpen(false); setIsTicketsView(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.15em] transition-all ${isTrashView ? 'bg-red-600 text-white shadow-2xl scale-105' : 'text-gray-400 hover:bg-red-50'}`}><Trash size={18} /> Recycle bin</button>
            </>
          )}
          {userRole === 'admin' && (
            <>
              <button onClick={() => { setIsAdminPanelOpen(true); setIsChatView(false); setIsTrashView(false); setIsTicketsView(false); fetchAdminUsers(); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.15em] transition-all ${isAdminPanelOpen ? 'bg-indigo-600 text-white shadow-2xl scale-105' : 'text-gray-400 hover:bg-white dark:hover:bg-gray-800'}`}>
                <ShieldCheck size={18} /> Admin Panel
              </button>
              <button onClick={() => { setIsTicketsView(true); setIsAdminPanelOpen(false); setIsChatView(false); setIsTrashView(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.15em] transition-all ${isTicketsView ? 'bg-gray-900 text-white shadow-2xl scale-105' : 'text-gray-400 hover:bg-white dark:hover:bg-gray-800'}`}>
                <MessageSquare size={18} /> Support Tickets
              </button>
            </>
          )}
          <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-800/50">
            <button onClick={() => { fetchUserData(); setIsSettingsModalOpen(true); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.15em] transition-all ${isSettingsModalOpen ? 'bg-gray-900 text-white shadow-2xl scale-105' : 'text-gray-400 hover:bg-white dark:hover:bg-gray-800'}`}>
              <Settings2 size={18} /> Settings
            </button>
          </div>
        </nav>
        {userRole !== 'admin' && (
          <div className="px-4 pb-4 mt-auto">
            {!isTicketsView && <button onClick={() => { setIsTicketsView(true); setIsChatView(false); setIsTrashView(false); setIsAdminPanelOpen(false); }} className="w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.15em] text-gray-400 hover:bg-white transition-all mb-4"><AlertCircle size={18} /> Support</button>}
            <div className="p-6 bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-sm border-4 border-white dark:border-gray-700">
              <div className="w-full bg-gray-100 dark:bg-gray-900 rounded-full h-1.5 mb-3 overflow-hidden"><div className="bg-gray-900 dark:bg-accent-500 h-full transition-all duration-1000" style={{ width: `${userData?.storage_quota ? (userData.storage_used / userData.storage_quota) * 100 : 0}%` }} /></div>
              <div className="flex justify-between items-center"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{stats.used_mb} MB</span><span className="text-[9px] font-black text-gray-900 dark:text-accent-400 uppercase tracking-widest">{userData?.storage_quota ? (userData.storage_quota / (1024 * 1024 * 1024)).toFixed(0) : '1'} GB</span></div>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900 rounded-[3rem] overflow-hidden relative shadow-2xl border-4 border-white dark:border-gray-800">
        <header className="h-24 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between px-10 shrink-0 z-10">
          {userRole !== 'admin' ? (
            <>
              <div className="flex-1 max-w-xl group">
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} /><input type="text" placeholder="Search your cloud..." className="w-full pl-14 pr-6 py-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border-2 border-transparent focus:border-gray-200 outline-none transition-all font-bold text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex bg-gray-50 dark:bg-gray-950 p-1.5 rounded-xl border border-gray-100 text-[9px] font-black uppercase tracking-widest text-gray-400"><button onClick={() => setSortBy('name')} className={`px-4 py-2 rounded-lg transition-all ${sortBy === 'name' ? 'bg-white dark:bg-gray-900 shadow-md text-gray-900 dark:text-white' : ''}`}>Name</button><button onClick={() => setSortBy('size')} className={`px-4 py-2 rounded-lg transition-all ${sortBy === 'size' ? 'bg-white dark:bg-gray-900 shadow-md text-gray-900 dark:text-white' : ''}`}>Size</button><button onClick={() => setSortBy('date')} className={`px-4 py-2 rounded-lg transition-all ${sortBy === 'date' ? 'bg-white dark:bg-gray-900 shadow-md text-gray-900 dark:text-white' : ''}`}>Date</button></div>
                <div className="flex items-center gap-4 pl-6 border-l border-gray-100 dark:border-gray-800">
                  <div className="flex flex-col items-end leading-none hidden sm:flex"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">User Account</span><span className="text-sm font-black italic text-gray-900 dark:text-white">{userData?.first_name ? `${userData.first_name}` : userData?.username || 'User'}</span></div>
                  <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center text-white font-black shadow-xl uppercase ring-4 ring-gray-50 overflow-hidden">{userData?.profile_picture ? <img src={getAuthenticatedUrl(`/users/avatar/${userData.id}`)} className="w-full h-full object-cover" /> : (userData?.first_name ? userData.first_name[0] : (userData?.username || 'U')[0])}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex justify-between items-center px-4">
               <div><h2 className="text-2xl font-black italic tracking-tighter leading-none">Control Center</h2><p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Root Administration</p></div>
               <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end leading-none"><span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">System Master</span><span className="text-sm font-black italic text-gray-900 dark:text-white">{userData?.username}</span></div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black shadow-xl uppercase ring-4 ring-indigo-50">{userData?.username?.substring(0, 2).toUpperCase()}</div>
               </div>
            </div>
          )}
        </header>

        {userRole !== 'admin' && (
          <div className="h-20 flex items-center px-10 gap-6 bg-white dark:bg-gray-900 border-b border-gray-50">
            {selectedIds.size > 0 ? (
              <>
                <span className={`${isTrashView ? 'text-red-600' : 'text-gray-900'} font-black text-xs uppercase tracking-widest`}>{selectedIds.size} Items Ready</span>
                <div className="h-8 w-px bg-gray-100 mx-2" />
                {!isTrashView && <button onClick={() => openShareModal(filteredItems.filter(i => selectedIds.has(i.id)))} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all active:scale-95"><Share2 size={14}/> Share Selected</button>}
                <button onClick={() => handleBatch('delete')} className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95">{isTrashView ? 'Delete Permanently' : 'Move to Trash'}</button>
                {isTrashView && <button onClick={() => handleBatch('restore')} className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95">Restore All</button>}
                <button onClick={() => setSelectedIds(new Set())} className="ml-auto font-black text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-900">Cancel Selection</button>
              </>
            ) : (
              <>
                {!isTrashView && (
                  <div className="flex gap-4">
                    <div className="relative">
                      <button onClick={() => { setIsNewDropdownOpen(!isNewDropdownOpen); setIsUploadDropdownOpen(false); }} className="px-8 py-3 bg-white text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-gray-50 transition-all border-4 border-gray-50 shadow-sm">
                        <Plus size={16} /> Create New <ChevronDown size={14}/>
                      </button>
                      {isNewDropdownOpen && <div className="absolute top-full left-0 mt-3 w-60 bg-white dark:bg-gray-900 shadow-2xl border-4 border-white rounded-[2rem] p-3 z-[110] animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={() => { setIsNewFolderModalOpen(true); setIsNewDropdownOpen(false); }} className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-4 transition-all">
                          <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center shadow-lg"><FolderPlus size={18}/></div> Folder
                        </button>
                        <button onClick={() => { setIsNewFileModalOpen(true); setIsNewDropdownOpen(false); }} className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-4 transition-all">
                          <div className="w-10 h-10 bg-green-600 text-white rounded-xl flex items-center justify-center shadow-lg"><FilePlus size={18}/></div> Text File
                        </button>
                      </div>}
                    </div>
                    <div className="relative">
                      <button onClick={() => { setIsUploadDropdownOpen(!isUploadDropdownOpen); setIsNewDropdownOpen(false); }} className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-2xl hover:bg-black transition-all active:scale-95 border-4 border-white">
                        <Upload size={16} /> Fast Upload <ChevronDown size={14}/>
                      </button>
                      {isUploadDropdownOpen && <div className="absolute top-full left-0 mt-3 w-60 bg-white dark:bg-gray-900 shadow-2xl border-4 border-white rounded-[2rem] p-3 z-[110] animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={() => { fileInputRef.current.click(); setIsUploadDropdownOpen(false); }} className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-4 transition-all">
                          <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center shadow-lg"><FileUp size={18}/></div> Upload Files
                        </button>
                        <button onClick={() => { folderInputRef.current.click(); setIsUploadDropdownOpen(false); }} className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-4 transition-all">
                          <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg"><FolderUp size={18}/></div> Entire Folder
                        </button>
                      </div>}
                      <input type="file" multiple className="hidden" ref={fileInputRef} onChange={(e) => handleUpload(e, false)} />
                      <input type="file" webkitdirectory="true" className="hidden" ref={folderInputRef} onChange={(e) => handleUpload(e, true)} />
                    </div>
                  </div>
                )}
                <div className="ml-auto flex bg-gray-50 p-1.5 rounded-xl border-2 border-white shadow-inner">
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-md text-gray-900' : 'text-gray-400'}`}><ListIcon size={18} /></button>
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-md text-gray-900' : 'text-gray-400'}`}><LayoutGrid size={18} /></button>
                </div>
              </>
            )}
          </div>
        )}

        <nav className="px-10 py-6 shrink-0 flex items-center font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 bg-white dark:bg-gray-900">
           {isTrashView ? <span className="text-red-600 italic">Recycle Bin Archive</span> : path.map((p, idx) => (
              <React.Fragment key={idx}>{idx > 0 && <ChevronRight size={14} className="mx-3 opacity-30" />}<button onClick={() => navigateTo(p)} className={idx === path.length - 1 ? 'text-gray-900 dark:text-gray-100 cursor-default italic' : 'hover:text-gray-900 transition-colors'}>{p.name}</button></React.Fragment>
           ))}
        </nav>

        <div className="flex-1 flex overflow-hidden">
          {isAdminPanelOpen ? (
            <div className="flex-1 overflow-auto p-10 bg-gray-50/30 dark:bg-gray-950/30">
              <div className="mb-8 flex justify-between items-end">
                <div><h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 italic">Control Center</h2><p className="text-gray-400 dark:text-gray-500 font-black uppercase tracking-[0.2em] text-[10px] mt-1">Global User & Resource Governance</p></div>
                <div className="flex gap-4">
                   <button onClick={() => setIsCreatingAdmin(true)} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-2"><Plus size={18} /> Create New Administrator</button>
                   <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border shadow-sm flex items-center gap-4"><div className="w-10 h-10 bg-accent-50 text-accent-600 rounded-xl flex items-center justify-center"><Users size={20}/></div><div><p className="text-[10px] font-black text-gray-400 uppercase">Total Users</p><p className="text-xl font-black">{adminUsers.length}</p></div></div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] border shadow-xl overflow-hidden border-4 border-white">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="border-b  border-gray-100 dark:border-gray-800/50 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest bg-gray-50/50 dark:bg-gray-800/20"><th className="py-6 px-8">User Identity</th><th className="py-6 px-2">Storage Usage</th><th className="py-6 px-2">Support Activity</th><th className="py-6 px-8 text-right">Administrative Actions</th></tr></thead>
                  <tbody>
                    {adminUsers.map(user => (
                      <tr key={user.id} className="border-b dark:border-gray-800 border-gray-50 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors group">
                        <td className="py-6 px-8"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-accent-50 text-accent-600 flex items-center justify-center font-black text-xl overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm">{user.profile_picture ? <img src={getAuthenticatedUrl(`/users/avatar/${user.id}`)} className="w-full h-full object-cover" /> : user.username[0].toUpperCase()}</div><div><div className="flex items-center gap-2"><p className="font-black text-gray-900 dark:text-gray-100">{user.username}</p><span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>{user.role}</span></div><p className="text-xs font-bold text-gray-400 dark:text-gray-500">{user.email}</p></div></div></td>
                        <td className="py-6 px-2">{user.role !== 'admin' ? (<div className="space-y-1.5 w-40"><div className="flex justify-between text-[9px] font-black uppercase"><span className="text-accent-600">{(user.storage_used / (1024*1024)).toFixed(1)} MB</span><span className="text-gray-400">Limit: {(user.storage_quota / (1024*1024*1024)).toFixed(0)}GB</span></div><div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden"><div className="bg-accent-500 h-full rounded-full" style={{ width: `${Math.min(100, (user.storage_used / user.storage_quota) * 100)}%` }} /></div></div>) : (<span className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">System Resource</span>)}</td>
                        <td className="py-6 px-2">{user.role !== 'admin' ? (<div className="flex items-center gap-3"><div className="text-center bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-xl border"><p className="text-[8px] font-black text-gray-400 uppercase">Total</p><p className="text-xs font-black">{user.total_tickets}</p></div><div className={`text-center px-3 py-1 rounded-xl border ${user.active_tickets > 0 ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-gray-50 dark:bg-gray-800 text-gray-400'}`}><p className="text-[8px] font-black uppercase">Active</p><p className="text-xs font-black">{user.active_tickets}</p></div></div>) : (<span className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">Staff Activity</span>)}</td>
                        <td className="py-6 px-8 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setUserEditFormData({ id: user.id, username: user.username, email: user.email, first_name: user.first_name || '', last_name: user.last_name || '', role: user.role, storage_quota: user.storage_quota, password: '' }); setIsEditingUser(true); }} className="p-3 text-accent-500 hover:text-accent-700 hover:bg-accent-50 dark:hover:bg-accent-900/20 rounded-2xl transition-all" title="Edit User Details"><Edit2 size={20} /></button>{user.role !== 'admin' && (<button onClick={() => handleDeleteUser(user.id)} className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all" title="Delete User & Files"><Trash2 size={20} /></button>)}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {adminUsers.length === 0 && <div className="py-32 text-center"><Users size={48} className="mx-auto text-gray-200 mb-4" /><div className="text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest text-xs">No registered users found</div></div>}
              </div>
            </div>
          ) : isChatView ? (
            <div className="flex-1 overflow-hidden"><Chat currentUser={userData} addNotify={addNotify} /></div>
          ) : isTicketsView ? (
            <div className="flex-1 overflow-hidden"><Tickets userRole={userRole} addNotify={addNotify} /></div>
          ) : (
            <div className="flex-1 overflow-auto px-10 pb-20 relative">
               {loading ? <div className="py-32 text-center"><Loader2 className="animate-spin inline text-gray-200" size={60} /></div> : (
                  viewMode === 'list' ? (
                  <table className="w-full text-left border-separate border-spacing-y-2">
                     <thead><tr className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]"><th className="px-6 py-4 w-12 text-center"><button onClick={selectAll} className="p-2 hover:bg-gray-100 rounded-lg transition-all">{selectedIds.size > 0 ? <CheckSquare size={18} className="text-gray-900" /> : <Square size={18} />}</button></th><th className="px-4">Name</th><th className="text-center">Date Modified</th><th className="text-center">Size</th><th className="w-12 text-right pr-6"></th></tr></thead>
                     <tbody>
                        {showSeparated ? (
                           <>
                              {myItems.length > 0 && (
                                 <>
                                    <tr><td colSpan="4" className="pt-6 pb-2"><span className="px-4 py-1.5 bg-gray-900 text-white rounded-full text-[8px] font-black uppercase tracking-widest italic shadow-lg shadow-gray-900/20">Private Vault</span></td></tr>
                                    {myItems.map(item => renderListItem(item))}
                                 </>
                              )}
                              {sharedItems.length > 0 && (
                                 <>
                                    <tr><td colSpan="4" className="pt-10 pb-2"><span className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest italic shadow-lg shadow-indigo-900/20">Shared Network</span></td></tr>
                                    {sharedItems.map(item => renderListItem(item))}
                                 </>
                              )}
                           </>
                        ) : (
                           filteredItems.map(item => renderListItem(item))
                        )}
                     </tbody>
                  </table>
                ) : (
                  <div className="pt-8">
                     {showSeparated ? (
                        <div className="space-y-16">
                           {myItems.length > 0 && (
                              <section>
                                 <div className="mb-8"><span className="px-6 py-2.5 bg-gray-900 text-white rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest italic shadow-xl">Private Vault</span></div>
                                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-10">
                                    {myItems.map(item => renderGridItem(item))}
                                 </div>
                              </section>
                           )}
                           {sharedItems.length > 0 && (
                              <section>
                                 <div className="mb-8"><span className="px-6 py-2.5 bg-indigo-600 text-white rounded-[1.5rem] text-[9px] font-black uppercase tracking-widest italic shadow-xl">Shared Network</span></div>
                                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-10">
                                    {sharedItems.map(item => renderGridItem(item))}
                                 </div>
                              </section>
                           )}
                        </div>
                     ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-10">
                           {filteredItems.map(item => renderGridItem(item))}
                        </div>
                     )}
                  </div>
                )
             )}
            </div>
          )}

          {sidePanelItem && !isChatView && (
            <aside className="w-80 border-l border-gray-50 bg-white dark:bg-gray-900 p-8 flex flex-col gap-8 animate-in slide-in-from-right duration-300 shadow-2xl z-20 overflow-auto">
              <div className="flex justify-between items-center"><h4 className="font-black text-[10px] uppercase tracking-widest text-gray-400 italic">Item Inspector</h4><button onClick={() => setSidePanelItem(null)} className="p-2 hover:bg-gray-50 rounded-full transition-all text-gray-400"><X size={18}/></button></div>
              <div className="aspect-square bg-gray-50 dark:bg-gray-950 rounded-[3rem] flex items-center justify-center border-4 border-white shadow-inner overflow-hidden relative group">
                <div className="absolute inset-0 bg-gray-900/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                {sidePanelItem.isFolder ? getFolderIconLarge(sidePanelItem.icon_type, sidePanelItem.color) : (sidePanelItem.mime_type?.startsWith('image/') ? <img src={getAuthenticatedUrl(`/files/view/${sidePanelItem.id}`)} className="w-full h-full object-cover" /> : <div className="scale-125 opacity-40">{getFileIcon(sidePanelItem.mime_type, sidePanelItem.name)}</div>)}
              </div>
              <div className="space-y-6">
                <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Identity</p><p className="font-black text-xl italic tracking-tighter text-gray-900 dark:text-gray-100 break-all leading-tight">{sidePanelItem.name}</p></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Timeline</p><p className="font-bold text-[10px] text-gray-900 dark:text-gray-100">{formatDate(sidePanelItem.created_at)}</p></div>
                  {!sidePanelItem.isFolder && <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Size</p><p className="font-bold text-xs text-gray-900 dark:text-gray-100">{formatSize(sidePanelItem.size)}</p></div>}
                </div>
                {!sidePanelItem.isFolder && (
                  <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Format</p><p className="font-bold text-[10px] text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded inline-block">{sidePanelItem.mime_type?.split('/')[1]?.toUpperCase() || 'DATA'}</p></div>
                )}
                <div className="pt-6 flex flex-col gap-3">
                  {!isTrashView && <button onClick={() => openShareModal(sidePanelItem)} className="w-full bg-white text-gray-900 border-4 border-gray-50 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-3"><Share2 size={16}/> Collaboration</button>}
                  {sidePanelItem.isFolder ? (
                    <button onClick={() => startEditFolder(sidePanelItem)} className="w-full bg-white text-gray-900 border-4 border-gray-50 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-3"><Edit2 size={16}/> Modify Style</button>
                  ) : (
                    <button onClick={() => startRenameFile(sidePanelItem)} className="w-full bg-white text-gray-900 border-4 border-gray-50 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-3"><Edit2 size={16}/> Rename Asset</button>
                  )}
                  {!sidePanelItem.isFolder && <a href={getAuthenticatedUrl(`/files/download/${sidePanelItem.id}`)} className="w-full bg-gray-900 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95"><Download size={16}/> Download</a>}
                  {!sidePanelItem.is_shared && <button onClick={() => handleAction(sidePanelItem.id, 'trash')} className="w-full p-4 bg-red-50 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-3 italic"><Trash size={16}/> Discard Item</button>}
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>

      <FilePreviewer file={selectedFile} isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} onSave={fetchData} addNotify={addNotify} />
      
      <Modal isOpen={isNewFolderModalOpen || isEditingFolder} onClose={() => { setIsNewFolderModalOpen(false); setIsEditingFolder(false); setNewName(''); }} title={isEditingFolder ? "Edit Folder Identity" : "Create New Directory"} maxWidth="max-w-xl" height="h-auto">
        <div className="p-10 space-y-10 flex flex-col items-center">
          <div className="w-28 h-28 bg-gray-50 rounded-[2.5rem] flex items-center justify-center shadow-inner border-4 border-white">{getFolderIconLarge(selectedIcon, selectedColor)}</div>
          <div className="w-full space-y-4 text-center">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Directory Name</label>
            <input autoFocus type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (isEditingFolder ? handleUpdateFolder() : handleCreate('folder'))} className="w-full border-b-4 border-gray-50 focus:border-gray-900 py-4 text-3xl font-black outline-none text-center transition-all bg-transparent italic" placeholder="Untitled Folder" />
          </div>
          <div className="w-full space-y-8">
            <div className="space-y-4"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-center">Brand Color</label><div className="flex flex-wrap justify-center gap-3 px-4">{["blue","indigo","sky","cyan","teal","emerald","green","lime","amber","orange","red","rose","pink","fuchsia","purple","violet","gray"].map(c => (<button key={c} onClick={() => setSelectedColor(c)} className={`w-8 h-8 rounded-full border-4 transition-all ${selectedColor === c ? 'border-white ring-4 ring-gray-900 scale-125' : 'border-transparent opacity-40 hover:opacity-100'}`} style={{ backgroundColor: getColorHex(c) }} />))}</div></div>
            <div className="space-y-4"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block text-center">Visual Symbol</label><div className="grid grid-cols-6 gap-4 max-h-48 overflow-auto p-4 bg-gray-50 rounded-[2rem] border-4 border-white shadow-inner">{[{ id: 'folder', Icon: Folder }, { id: 'database', Icon: Database }, { id: 'cpu', Icon: Cpu }, { id: 'shield', Icon: ShieldCheck }, { id: 'lock', Icon: Lock }, { id: 'settings', Icon: Settings2 }, { id: 'cloud', Icon: CloudLightning }, { id: 'work', Icon: Briefcase }, { id: 'book', Icon: BookOpen }, { id: 'music', Icon: Music }, { id: 'camera', Icon: Camera }].map(item => (<button key={item.id} onClick={() => setSelectedIcon(item.id)} className={`p-4 rounded-2xl flex items-center justify-center transition-all ${selectedIcon === item.id ? 'bg-gray-900 text-white shadow-xl scale-110' : 'text-gray-400 hover:text-gray-900 hover:bg-white'}`}><item.Icon size={24} /></button>))}</div></div>
          </div>
          <button onClick={() => isEditingFolder ? handleUpdateFolder() : handleCreate('folder')} className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95 border-4 border-white">{isEditingFolder ? "Save Modifications" : "Deploy Directory"}</button>
        </div>
      </Modal>

      <Modal isOpen={isRenamingFile} onClose={() => { setIsRenamingFile(false); setEditingFileId(null); setNewName(''); }} title="Rename Cloud Asset" maxWidth="max-w-md" height="h-auto">
        <div className="p-10 text-center space-y-8 flex flex-col items-center">
          <div className="w-24 h-24 bg-gray-50 text-gray-900 rounded-[2.5rem] flex items-center justify-center shadow-inner border-4 border-white"><Edit2 size={40} /></div>
          <div className="w-full space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">New Asset Identity</label>
            <input autoFocus type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleRenameFile()} className="w-full border-b-4 border-gray-50 focus:border-gray-900 py-4 text-3xl font-black outline-none text-center transition-all bg-transparent italic" placeholder="filename.ext" />
          </div>
          <button onClick={handleRenameFile} className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95 border-4 border-white">Apply New Name</button>
        </div>
      </Modal>

      <Modal isOpen={isNewFileModalOpen} onClose={() => setIsNewFileModalOpen(false)} title="Generate Document" maxWidth="max-w-md" height="h-auto">
        <div className="p-10 text-center space-y-8 flex flex-col items-center">
          <div className="w-24 h-24 bg-gray-50 text-gray-900 rounded-[2.5rem] flex items-center justify-center shadow-inner border-4 border-white"><FilePlus size={40} /></div>
          <div className="w-full space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Document Name</label>
            <input autoFocus type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate('file')} className="w-full border-b-4 border-gray-50 focus:border-gray-900 py-4 text-3xl font-black outline-none text-center transition-all bg-transparent italic" placeholder="notes.txt" />
          </div>
          <button onClick={() => handleCreate('file')} className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95 border-4 border-white">Initialize File</button>
        </div>
      </Modal>

      <Modal isOpen={isShareModalOpen} onClose={() => { setIsShareModalOpen(false); setShareSearchQuery(''); setShareSearchResults([]); setSelectedShareUsers([]); setPublicUrl(''); }} title={`Authorize Collaboration`} maxWidth="max-w-md" height="h-auto">
        <div className="p-10 space-y-8">
          <div className="space-y-3"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Selected Assets</label><div className="flex flex-wrap gap-2">{itemsToShare.map(item => (<div key={item.id} className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border-2 border-white shadow-sm font-black text-[10px] uppercase italic tracking-tighter">{item.isFolder ? <Folder size={14} className="text-gray-900" /> : <File size={14} className="text-gray-400" />} {item.name}</div>))}</div></div>
          
          <div className="p-6 bg-indigo-50/50 rounded-3xl border-2 border-dashed border-indigo-100 space-y-4">
             <div className="flex justify-between items-center"><label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Public Link Access</label>{!publicUrl && <button onClick={generatePublicLink} className="text-[9px] font-black uppercase text-indigo-600 hover:underline">Generate Link</button>}</div>
             {publicUrl ? (
               <div className="flex gap-2">
                 <input readOnly value={publicUrl} className="flex-1 bg-white border-2 border-white px-4 py-2 rounded-xl text-[10px] font-bold outline-none shadow-sm" />
                 <button onClick={() => { navigator.clipboard.writeText(publicUrl); addNotify('success', 'Copied', 'URL copied to clipboard'); }} className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg"><Copy size={16}/></button>
               </div>
             ) : (
               <p className="text-[9px] text-gray-400 font-bold italic text-center">No active public link for these items.</p>
             )}
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Find Collaborator</label>
            <div className="relative"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} /><input autoFocus type="text" value={shareSearchQuery} onChange={(e) => searchUsers(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-gray-50 rounded-2xl outline-none focus:bg-white border-2 border-transparent focus:border-gray-100 transition-all font-bold" placeholder="Email or Username..." /></div>
            <div className="space-y-2 max-h-48 overflow-auto px-2">
              {shareSearchResults.map(user => (
                <button key={user.id} onClick={() => toggleShareUser(user)} className={`w-full flex items-center justify-between p-4 rounded-2xl border-4 transition-all ${selectedShareUsers.find(u => u.id === user.id) ? 'bg-gray-900 border-gray-900 text-white shadow-xl' : 'bg-gray-50 border-white hover:border-gray-100'}`}>
                  <div className="text-left leading-tight"><p className="font-black text-sm">{user.username}</p><p className={`text-[10px] font-bold ${selectedShareUsers.find(u => u.id === user.id) ? 'opacity-60' : 'text-gray-400'}`}>{user.email}</p></div>
                  {selectedShareUsers.find(u => u.id === user.id) ? <Check size={20} /> : <Plus size={20} />}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => setShareAccessLevel('view')} className={`p-4 rounded-2xl border-4 font-black text-[10px] uppercase tracking-widest flex flex-col items-center gap-2 transition-all ${shareAccessLevel === 'view' ? 'bg-gray-900 text-white border-gray-900 shadow-xl' : 'bg-gray-50 border-white text-gray-400'}`}><Search size={18} /> Read Only</button>
            <button onClick={() => setShareAccessLevel('edit')} className={`p-4 rounded-2xl border-4 font-black text-[10px] uppercase tracking-widest flex flex-col items-center gap-2 transition-all ${shareAccessLevel === 'edit' ? 'bg-gray-900 text-white border-gray-900 shadow-xl' : 'bg-gray-50 border-white text-gray-400'}`}><Edit2 size={18} /> Full Access</button>
          </div>
          <button onClick={handleShare} disabled={!selectedShareUsers.length} className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-black transition-all border-4 border-white disabled:opacity-20">Secure Collaboration</button>
        </div>
      </Modal>

      <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Cloud Governance" maxWidth="max-w-4xl" height="h-[80vh]">
        <div className="flex h-full">
          <div className="w-72 border-r border-gray-50 bg-gray-50/50 p-8 space-y-3 shrink-0">
            <button onClick={() => setActiveSettingsTab('profile')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeSettingsTab === 'profile' ? 'bg-white shadow-xl text-gray-900 scale-105' : 'text-gray-400 hover:text-gray-900'}`}><User size={18} /> Profile</button>
            <button onClick={() => setActiveSettingsTab('security')} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${activeSettingsTab === 'security' ? 'bg-white shadow-xl text-gray-900 scale-105' : 'text-gray-400 hover:text-gray-900'}`}><ShieldCheck size={18} /> Security</button>
            <div className="pt-8 mt-8 border-t border-gray-100"><button onClick={onLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-red-500 hover:bg-red-50 transition-all italic"><ExternalLink size={18} /> Terminate Session</button></div>
          </div>
          <div className="flex-1 overflow-auto p-12 bg-white">{activeSettingsTab === 'profile' ? (
            <form onSubmit={handleUpdateSettings} className="space-y-10 max-w-lg mx-auto">
              <div className="text-center space-y-2"><h4 className="text-3xl font-black italic tracking-tighter">Account Identity</h4><p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Update your digital presence</p></div>
              <div className="flex flex-col items-center gap-6"><div className="relative group"><div className="w-32 h-32 rounded-[2.5rem] bg-gray-50 border-8 border-white shadow-2xl overflow-hidden flex items-center justify-center">{avatarPreview ? <img src={avatarPreview} className="w-full h-full object-cover" /> : userData?.profile_picture ? <img src={getAuthenticatedUrl(`/users/avatar/${userData.id}`) + `&t=${Date.now()}`} className="w-full h-full object-cover" /> : <User size={48} className="text-gray-200" />}</div><button type="button" onClick={() => profilePicRef.current.click()} className="absolute -bottom-2 -right-2 bg-gray-900 text-white p-3 rounded-2xl shadow-2xl hover:scale-110 transition-all border-4 border-white"><ImageIcon size={20} /></button><input type="file" ref={profilePicRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && setAvatarPreview(URL.createObjectURL(e.target.files[0]))} /></div></div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">First Name</label><input type="text" value={settingsFormData.first_name} onChange={(e) => setSettingsFormData({ ...settingsFormData, first_name: e.target.value })} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-gray-100 outline-none font-bold" /></div>
                <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Last Name</label><input type="text" value={settingsFormData.last_name} onChange={(e) => setSettingsFormData({ ...settingsFormData, last_name: e.target.value })} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-gray-100 outline-none font-bold" /></div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Username</label><input type="text" value={settingsFormData.username} onChange={(e) => setSettingsFormData({ ...settingsFormData, username: e.target.value })} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-gray-100 outline-none font-bold" required /></div>
                <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Email Address</label><input type="email" value={settingsFormData.email} onChange={(e) => setSettingsFormData({ ...settingsFormData, email: e.target.value })} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-gray-100 outline-none font-bold" required /></div>
              </div>
              <div className="pt-6 border-t border-gray-50"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">New Security Key</label><input type="password" value={settingsFormData.password} onChange={(e) => setSettingsFormData({ ...settingsFormData, password: e.target.value })} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-gray-100 outline-none font-bold" placeholder="Leave blank to keep current..." /></div>
              <button type="submit" disabled={isUpdatingSettings} className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-black transition-all border-4 border-white">{isUpdatingSettings ? 'Processing...' : 'Apply Modifications'}</button>
            </form>
          ) : (
            <div className="space-y-12 max-w-lg mx-auto">
              <div className="text-center space-y-2"><h4 className="text-3xl font-black italic tracking-tighter">Security Guard</h4><p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">End-to-end data sovereignty</p></div>
              <div className="p-10 bg-gray-900 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group"><div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform duration-700 text-white"><ShieldCheck size={200} /></div><div className="relative z-10 space-y-6"><div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest"><Lock size={14}/> Protection Active</div><h5 className="text-4xl font-black italic tracking-tighter leading-none">AES-256 Armed</h5><p className="text-gray-400 font-bold text-sm leading-relaxed">Your entire drive is currently encrypted with military-grade standards. Real-time decryption only occurs during an active authorized session.</p></div></div>
              <div className="space-y-4"><h6 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-4">System Highlights</h6><div className="grid grid-cols-1 gap-4">
                <div className="p-6 bg-gray-50 rounded-[1.5rem] border-4 border-white shadow-sm flex items-center gap-5 transition-all hover:scale-[1.02]"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg"><Check size={24} className="text-green-600"/></div><div><p className="font-black text-sm italic">Real-time Decryption</p><p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Verified Online</p></div></div>
                <div className="p-6 bg-gray-50 rounded-[1.5rem] border-4 border-white shadow-sm flex items-center gap-5 transition-all hover:scale-[1.02]"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg"><Shield size={24} className="text-indigo-600"/></div><div><p className="font-black text-sm italic">Database Integrity</p><p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">System Check OK</p></div></div>
                <div className="p-6 bg-gray-50 rounded-[1.5rem] border-4 border-white shadow-sm flex items-center gap-5 transition-all hover:scale-[1.02]"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg"><Zap size={24} className="text-amber-500"/></div><div><p className="font-black text-sm italic">Physical Security</p><p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Encrypted at Rest</p></div></div>
              </div></div>
            </div>
          )}</div>
        </div>
      </Modal>

      <Modal isOpen={isEditingUser} onClose={() => setIsEditingUser(false)} title="Administrative Override" maxWidth="max-w-xl" height="h-auto">
        <div className="p-10"><form onSubmit={handleAdminUpdateUser} className="space-y-10">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">First Name</label><input type="text" value={userEditFormData.first_name} onChange={(e) => setUserEditFormData({ ...userEditFormData, first_name: e.target.value })} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-gray-100 outline-none font-bold" /></div>
              <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Last Name</label><input type="text" value={userEditFormData.last_name} onChange={(e) => setUserEditFormData({ ...userEditFormData, last_name: e.target.value })} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-gray-100 outline-none font-bold" /></div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Username</label><input type="text" value={userEditFormData.username} onChange={(e) => setUserEditFormData({ ...userEditFormData, username: e.target.value })} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-gray-100 outline-none font-bold" required /></div>
              <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Email Address</label><input type="email" value={userEditFormData.email} onChange={(e) => setUserEditFormData({ ...userEditFormData, email: e.target.value })} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-gray-100 outline-none font-bold" required /></div>
            </div>
            {userEditFormData.role !== 'admin' && (<div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Drive Quota (GB)</label><input type="number" value={userEditFormData.storage_quota / (1024*1024*1024)} onChange={(e) => setUserEditFormData({ ...userEditFormData, storage_quota: parseFloat(e.target.value) * 1024 * 1024 * 1024 })} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-gray-100 outline-none font-bold" /></div>)}
            <div className="pt-6 border-t border-gray-50"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Manual Password Reset</label><input type="password" value={userEditFormData.password} onChange={(e) => setUserEditFormData({ ...userEditFormData, password: e.target.value })} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-gray-100 outline-none font-bold" placeholder="New secure key..." /></div>
          </div>
          <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 border-4 border-white">Save Record Overrides</button>
        </form></div>
      </Modal>

      <Modal isOpen={isCreatingAdmin} onClose={() => setIsCreatingAdmin(false)} title="Administrative Enrollment" maxWidth="max-w-xl" height="h-auto">
        <div className="p-10"><form onSubmit={handleCreateAdmin} className="space-y-10">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">First Name</label><input type="text" value={newAdminFormData.first_name} onChange={(e) => setNewAdminFormData({ ...newAdminFormData, first_name: e.target.value })} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-gray-100 outline-none font-bold" /></div>
              <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Last Name</label><input type="text" value={newAdminFormData.last_name} onChange={(e) => setNewAdminFormData({ ...newAdminFormData, last_name: e.target.value })} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-gray-100 outline-none font-bold" /></div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Username</label><input type="text" value={newAdminFormData.username} onChange={(e) => setNewAdminFormData({ ...newAdminFormData, username: e.target.value })} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-gray-100 outline-none font-bold" required /></div>
              <div className="space-y-2"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Email Address</label><input type="email" value={newAdminFormData.email} onChange={(e) => setNewAdminFormData({ ...newAdminFormData, email: e.target.value })} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-gray-100 outline-none font-bold" required /></div>
            </div>
            <div className="pt-6 border-t border-gray-50"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Initial Security Key</label><input type="password" value={newAdminFormData.password} onChange={(e) => setNewAdminFormData({ ...newAdminFormData, password: e.target.value })} className="w-full px-6 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-gray-100 outline-none font-bold" placeholder="Secure password..." required /></div>
          </div>
          <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 border-4 border-white">Authorize & Enroll Administrator</button>
        </form></div>
      </Modal>
    </div>
  );
};

export default FileManager;
