import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { renderAsync } from 'docx-preview';
import { 
  Folder, File, FileText, Image as ImageIcon, Video, Play, 
  MoreVertical, Download, Edit2, Trash2, Share2, 
  ChevronRight, ChevronDown, Grid, List, Search,
  Upload, X, Copy, Check, ZoomIn, ZoomOut, HardDrive, Loader2, Maximize, Plus,
  Clock, Users, Trash, Info, LayoutGrid, List as ListIcon, ChevronLeft, ExternalLink,
  FileSpreadsheet, FileArchive, FileCode, Presentation, FileDigit, FileType, CheckSquare, Square,
  RotateCcw, ShieldAlert, AlertCircle, CheckCircle2, FolderPlus, FilePlus, FileUp, FolderUp,
  Database, Cpu, ShieldCheck, Lock, Settings2, CloudLightning, Briefcase, BookOpen, Music, Camera,
  User, Palette
} from 'lucide-react';

const API_BASE = 'http://localhost:3000';

const getAuthenticatedUrl = (path) => {
  const token = localStorage.getItem('token');
  return `${API_BASE}${path}${path.includes('?') ? '&' : '?'}token=${token}`;
};

const getFileIcon = (mimeType, name) => {
  const fileName = name?.toLowerCase() || '';
  if (mimeType?.startsWith('image/')) return <ImageIcon className="text-accent-500" />;
  if (mimeType?.startsWith('video/')) return <Video className="text-purple-500" />;
  
  // Archives
  if (/\.(zip|7z|rar|tar|gz|bz2|iso|xz)$/.test(fileName)) return <FileArchive className="text-amber-600" />;
  
  // Spreadsheets
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) return <FileSpreadsheet className="text-green-600" />;
  
  // Presentations
  if (fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) return <Presentation className="text-orange-600" />;
  
  // Documents
  if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) return <FileText className="text-accent-600" />;
  
  // PDF
  if (fileName.endsWith('.pdf')) return <FileDigit className="text-red-500" />;
  
  // Code & Data (Common in research/devops)
  if (/\.(js|ts|py|c|cpp|cs|go|rs|php|html|css|sql|json|yaml|yml|xml|env|docker|kube|data|model|net|cloud|sec|iot)$/.test(fileName)) return <FileCode className="text-indigo-500" />;
  
  // Executables/System
  if (/\.(exe|msi|bin|sh|bat|cmd|jar|app|deb|rpm)$/.test(fileName)) return <ShieldAlert className="text-gray-700 dark:text-gray-300" />;

  return <File className="text-accent-400" />;
};

const Toast = ({ notifications, remove }) => (
  <div className="fixed bottom-6 right-6 z-[250] flex flex-col gap-3 max-w-sm w-full">
    {notifications.map(n => (
      <div key={n.id} className={`flex items-start gap-3 p-4 rounded-xl shadow-2xl border animate-in slide-in-from-right-10 duration-300 ${n.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-green-50 border-green-100 text-green-800'}`}>
        {n.type === 'error' ? <AlertCircle size={18} className="text-red-500" /> : <CheckCircle2 size={18} className="text-green-500" />}
        <div className="flex-1 overflow-hidden"><p className="font-bold text-xs">{n.title}</p><p className="text-[11px] opacity-80 truncate">{n.message}</p></div>
        <button onClick={() => remove(n.id)}><X size={14}/></button>
      </div>
    ))}
  </div>
);

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-6xl', height = 'h-[90vh]' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[4px] animate-in fade-in duration-200">
      <div className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full ${maxWidth} ${height} flex flex-col overflow-hidden transition-all duration-300 border border-white dark:border-gray-700/20 dark:border-gray-800`}>
        <div className="px-6 py-4 border-b dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 shrink-0">
          <h3 className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate pr-4">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 rounded-full transition-all text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-gray-100"><X size={20}/></button>
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
  
  // Is it a known binary that we CANNOT read as text?
  const isBinaryMedia = file.mime_type?.startsWith('image/') || 
                         file.mime_type?.startsWith('video/') || 
                         /\.(pdf|docx|doc|xlsx|xls|pptx|ppt|zip|7z|rar|exe|bin|apk|jar|deb|rpm|iso)$/.test(fn);
  
  // Everything else is treated as potential text (config, code, data, logs, research formats)
  const isText = !isBinaryMedia || file.mime_type?.startsWith('text/');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? `Editing: ${file.name}` : file.name}>
      <div className="flex flex-col h-full">
        <div className="px-4 py-2 border-b dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 shrink-0">
           <div className="flex gap-2">
              {isText && !isEditing && <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-accent-600 font-bold text-sm">Edit</button>}
              {isEditing && <button onClick={async () => { await axios.put(`${API_BASE}/files/content/${file.id}`, { content }); setIsEditing(false); onSave(); }} className="px-4 py-2 bg-accent-600 text-white rounded font-bold text-sm">Save</button>}
           </div>
           <a href={getAuthenticatedUrl(`/files/download/${file.id}`)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 text-sm font-bold transition-all"><Download size={16} /> Изтегли</a>
        </div>
        <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-gray-50 dark:bg-gray-950">
           {loading ? <Loader2 size={40} className="animate-spin text-accent-500" /> :
            file.mime_type?.startsWith('image/') ? <img src={getAuthenticatedUrl(`/files/view/${file.id}`)} className="max-w-full max-h-full shadow-lg" onError={() => addNotify('error', 'Preview Error', `Could not load image ${file.name}`)} /> :
            file.mime_type?.startsWith('video/') ? <video controls className="w-full h-full bg-black" src={getAuthenticatedUrl(`/files/view/${file.id}`)} onError={() => addNotify('error', 'Preview Error', `Could not load video ${file.name}`)} /> :
            fn.endsWith('.pdf') ? <iframe src={getAuthenticatedUrl(`/files/view/${file.id}`)} className="w-full h-full border-none" /> :
            fn.endsWith('.docx') ? <div className="w-full h-full overflow-auto p-10"><div ref={docxRef} className="mx-auto max-w-3xl bg-white dark:bg-gray-900 shadow-xl p-10" /></div> :
            isText ? (isEditing ? <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full h-full p-10 font-mono text-sm" spellCheck="false" /> : <div className="w-full h-full p-10 overflow-auto font-mono text-sm whitespace-pre-wrap">{content}</div>) :
            <div className="text-center space-y-4">
              <ShieldAlert size={48} className="mx-auto text-gray-400 dark:text-gray-500" />
              <p className="text-gray-400 dark:text-gray-500 font-bold">Preview not available for binary/archive files.</p>
              <button onClick={() => { setContent(''); fetchText(); }} className="px-6 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 dark:bg-gray-700 rounded-lg font-bold text-gray-700 dark:text-gray-300">Try viewing as text anyway</button>
            </div>}
        </div>
      </div>
    </Modal>
  );
};

const PersonalCloud = ({ userRole, onLogout, theme, setTheme, accentColor, setAccentColor }) => {
  const [viewMode, setViewMode] = useState('list');
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsFormData, setSettingsFormData] = useState({ username: '', email: '', password: '', first_name: '', last_name: '' });
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [path, setPath] = useState([{ id: null, name: 'My files' }]);
  const [stats, setStats] = useState({ used_mb: '0', percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [isTrashView, setIsTrashView] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'size', 'date'
  const [sidePanelItem, setSidePanelItem] = useState(null);

  const [activeSettingsTab, setActiveSettingsTab] = useState('profile');
  const [userData, setUserData] = useState(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  const [serverStatus, setServerStatus] = useState({ apache: false, mysql: false });
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [isNewDropdownOpen, setIsNewDropdownOpen] = useState(false);
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareSearchQuery, setShareSearchQuery] = useState('');
  const [shareSearchResults, setShareSearchResults] = useState([]);
  const [itemToShare, setItemToShare] = useState(null);
  const [newName, setNewName] = useState('');
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const profilePicRef = useRef(null);
  const getColorHex = (color) => {
    const map = {
      blue: '#3b82f6', indigo: '#6366f1', sky: '#0ea5e9', cyan: '#06b6d4', teal: '#14b8a6', emerald: '#10b981', green: '#22c55e', lime: '#84cc16', amber: '#f59e0b', orange: '#f97316', red: '#ef4444', rose: '#f43f5e', pink: '#ec4899', fuchsia: '#d946ef', purple: '#a855f7', violet: '#8b5cf6', gray: '#6b7280'
    };
    return map[color] || map.blue;
  };

  const getFolderIcon = (iconType, color) => {
    const hex = getColorHex(color);
    const cls = "fill-current opacity-20";
    const iconProps = { size: 28, style: { color: hex } };
    
    // Wrapper to add a subtle background fill
    const wrap = (icon) => (
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 scale-75 blur-sm opacity-20" style={{ backgroundColor: hex }} />
        {icon}
      </div>
    );

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
    const iconProps = { size: 72, style: { color: hex } };
    
    const wrap = (icon) => (
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 scale-110 blur-xl opacity-10" style={{ backgroundColor: hex }} />
        {icon}
      </div>
    );

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
      const usedMB = parseFloat(s.data.used_mb);
      setStats({ used_mb: usedMB.toFixed(1), percentage: (usedMB / 51200) * 100 });
      setSelectedIds(new Set());
    } catch (e) { addNotify('error', 'Sync Error', 'Cannot reach server'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [currentFolderId, isTrashView]);

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
      } catch (e) {
        addNotify('error', 'Upload Error', `${f.name} failed`);
      }
    }
    if (ok > 0) addNotify('success', 'Upload Complete', `${ok} items uploaded.`);
    fetchData();
  };

  const handleBatch = async (action) => {
    if (!selectedIds.size) return;
    try {
      await axios.post(`${API_BASE}/batch-action`, { ids: Array.from(selectedIds), action: isTrashView && action === 'delete' ? 'delete' : (action === 'delete' ? 'trash' : 'restore') });
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

  const [isEditingFolder, setIsEditingFolder] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState(null);

  const searchUsers = async (q) => {
    setShareSearchQuery(q);
    if (q.length < 2) { setShareSearchResults([]); return; }
    try {
      const res = await axios.get(`${API_BASE}/users/search?q=${q}`);
      setShareSearchResults(res.data);
    } catch (e) { console.error('Search error', e); }
  };

  const handleShare = async (targetUserId) => {
    if (!itemToShare) return;
    try {
      await axios.post(`${API_BASE}/share`, {
        item_id: itemToShare.id,
        item_type: itemToShare.isFolder ? 'folder' : 'file',
        target_user_id: targetUserId,
        access_level: 'view'
      });
      addNotify('success', 'Shared', `Access granted to ${itemToShare.name}`);
      setIsShareModalOpen(false);
      setItemToShare(null);
      setShareSearchQuery('');
      setShareSearchResults([]);
    } catch (e) {
      addNotify('error', 'Share Error', 'Could not share item');
    }
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
      setSettingsFormData({
        username: res.data.username,
        email: res.data.email,
        first_name: res.data.first_name || '',
        last_name: res.data.last_name || '',
        password: ''
      });
    } catch (e) {
      addNotify('error', 'Profile Error', 'Failed to load user profile');
    }
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
    } catch (e) {
      addNotify('error', 'Server Error', `Failed to ${action} ${service}`);
    }
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
      
      // Handle avatar upload if exists
      if (profilePicRef.current && profilePicRef.current.files.length > 0) {
        const formData = new FormData();
        formData.append('avatar', profilePicRef.current.files[0]);
        await axios.post(`${API_BASE}/users/profile-picture`, formData);
      }

      addNotify('success', 'Settings Updated', 'Your profile has been updated.');
      localStorage.setItem('username', settingsFormData.username);
      fetchUserData(); // Refresh with new data
      setIsSettingsModalOpen(false);
    } catch (e) {
      addNotify('error', 'Update Error', e.response?.data?.error || 'Failed to update settings');
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleCreate = async (type) => {
    if (!newName.trim()) {
      addNotify('error', 'Validation Error', 'Name cannot be empty');
      return;
    }
    try {
      if (type === 'folder') {
        console.log('Creating folder with:', { name: newName, color: selectedColor, icon: selectedIcon });
        await axios.post(`${API_BASE}/folders`, { 
          name: newName, 
          parent_id: currentFolderId,
          color: selectedColor,
          icon_type: selectedIcon
        });
        setNewName(''); setIsNewFolderModalOpen(false); fetchData();
        addNotify('success', 'Folder Created', `Folder "${newName}" is ready.`);
      } else {
        const res = await axios.post(`${API_BASE}/files/create`, { name: newName.includes('.') ? newName : newName + '.txt', folder_id: currentFolderId });
        setNewName(''); setIsNewFileModalOpen(false); 
        await fetchData();
        if (res.data && res.data.id) {
          setSelectedFile({ id: res.data.id, name: res.data.name, mime_type: 'text/plain' });
          setIsPreviewOpen(true);
        }
      }
    } catch (err) { addNotify('error', 'Error', 'Operation failed'); }
  };

  const handleUpdateFolder = async () => {
    if (!newName.trim()) {
      addNotify('error', 'Validation Error', 'Name cannot be empty');
      return;
    }
    try {
      console.log('Updating folder with:', { name: newName, color: selectedColor, icon: selectedIcon });
      await axios.put(`${API_BASE}/folders/${editingFolderId}`, {
        name: newName,
        color: selectedColor,
        icon_type: selectedIcon
      });
      if (sidePanelItem && sidePanelItem.id === editingFolderId) {
        setSidePanelItem(prev => ({ ...prev, name: newName, color: selectedColor, icon_type: selectedIcon }));
      }
      setNewName(''); setIsEditingFolder(false); setEditingFolderId(null);
      fetchData();
      addNotify('success', 'Folder Updated', 'Changes saved successfully.');
    } catch (e) { addNotify('error', 'Error', 'Update failed'); }
  };

  const startEditFolder = (f) => {
    setEditingFolderId(f.id);
    setNewName(f.name);
    setSelectedColor(f.color || 'blue');
    setSelectedIcon(f.icon_type || 'folder');
    setIsEditingFolder(true);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors font-sans overflow-hidden text-sm">
      <Toast notifications={notifications} remove={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />
      <aside className="w-64 bg-white dark:bg-gray-900 border-r dark:border-gray-800 flex flex-col shrink-0 z-20">
        <div className="p-6 flex items-center gap-3 mb-4 cursor-pointer" onClick={() => { setIsTrashView(false); setCurrentFolderId(null); }}>
           <div className="w-10 h-10 bg-accent-600 rounded-lg flex items-center justify-center shadow-lg"><HardDrive className="text-white" size={24} /></div>
           <span className="font-black text-accent-600 text-xl">Personal Cloud</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          <button onClick={() => { setIsTrashView(false); setCurrentFolderId(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${!isTrashView && !isAdminPanelOpen ? 'bg-accent-50 text-accent-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}><Folder size={20} /> My files</button>
          <button onClick={() => setIsTrashView(true)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${isTrashView ? 'bg-red-50 text-red-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}><Trash size={20} /> Recycle bin</button>
          
          {userRole === 'admin' && (
            <button onClick={() => { setIsAdminPanelOpen(true); fetchAdminUsers(); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${isAdminPanelOpen ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              <ShieldCheck size={20} /> Admin Panel
            </button>
          )}

          <button 
            onClick={() => {
              fetchUserData();
              setIsSettingsModalOpen(true);
            }} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${isSettingsModalOpen ? 'bg-accent-50 text-accent-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <Settings2 size={20} /> Settings
          </button>
        </nav>
        <div className="p-6 border-t dark:border-gray-800 font-bold text-gray-400 dark:text-gray-500 text-[11px]"><div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mb-2 overflow-hidden"><div className="bg-accent-600 h-full transition-all duration-1000 shadow-accent-500/20" style={{ width: `${stats.percentage}%` }} /></div><span>{stats.used_mb} MB of 50 GB used</span></div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900 overflow-hidden relative shadow-2xl">
        <header className="h-16 border-b dark:border-gray-800 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex-1 max-w-xl group">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input 
                type="text" 
                placeholder="Search by name or extension..." 
                className="w-full pl-12 pr-6 py-2.5 bg-gray-50 dark:bg-gray-950 rounded-xl outline-none focus:ring-2 focus:ring-accent-100 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-gray-50 dark:bg-gray-950 p-1 rounded-lg border text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
               <button onClick={() => setSortBy('name')} className={`px-3 py-1.5 rounded ${sortBy === 'name' ? 'bg-white dark:bg-gray-900 shadow text-accent-600' : ''}`}>Name</button>
               <button onClick={() => setSortBy('size')} className={`px-3 py-1.5 rounded ${sortBy === 'size' ? 'bg-white dark:bg-gray-900 shadow text-accent-600' : ''}`}>Size</button>
               <button onClick={() => setSortBy('date')} className={`px-3 py-1.5 rounded ${sortBy === 'date' ? 'bg-white dark:bg-gray-900 shadow text-accent-600' : ''}`}>Date</button>
            </div>
            <div className="flex items-center gap-3 pl-4 border-l dark:border-gray-800 border-gray-100 dark:border-gray-800/50">
              <div className="flex flex-col items-end leading-tight hidden sm:flex">
                <span className="text-[10px] font-black text-accent-600 uppercase tracking-widest">{userRole}</span>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}` : userData?.username || 'User'}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center text-white font-black shadow-lg shadow-accent-900/20 uppercase ring-2 ring-white overflow-hidden">
                {userData?.profile_picture ? (
                  <img src={getAuthenticatedUrl(`/users/avatar/${userData.id}`)} className="w-full h-full object-cover" />
                ) : (
                  (userData?.first_name ? userData.first_name[0] + (userData.last_name?.[0] || '') : (userData?.username || 'U').substring(0, 2))
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="h-14 border-b dark:border-gray-800 flex items-center px-6 gap-3 bg-white dark:bg-gray-900">
          {selectedIds.size > 0 ? (
            <>
              <span className={`${isTrashView ? 'text-red-600' : 'text-accent-600'} font-black px-4`}>{selectedIds.size} selected</span>
              <button onClick={() => handleBatch('delete')} className="px-4 py-2 text-red-600 font-bold">Delete</button>
              {isTrashView && <button onClick={() => handleBatch('restore')} className="px-4 py-2 text-green-600 font-bold">Restore</button>}
              <button onClick={() => setSelectedIds(new Set())} className="ml-auto font-bold text-gray-400 dark:text-gray-500">Clear</button>
            </>
          ) : (
            <>
              {!isTrashView && (
                <div className="flex gap-2">
                  <div className="relative">
                    <button onClick={() => { setIsNewDropdownOpen(!isNewDropdownOpen); setIsUploadDropdownOpen(false); }} className="px-4 py-2 text-accent-600 font-bold flex items-center gap-2 hover:bg-accent-50 dark:hover:bg-accent-900/20 rounded-lg transition-colors">
                      <Plus size={18} /> New <ChevronDown size={14}/>
                    </button>
                    {isNewDropdownOpen && <div className="absolute top-full left-0 mt-2 w-52 bg-white dark:bg-gray-900 shadow-2xl border rounded-2xl p-2 z-[110] animate-in fade-in zoom-in-95 duration-200">
                      <button onClick={() => { setIsNewFolderModalOpen(true); setIsNewDropdownOpen(false); }} className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-bold flex items-center gap-3 text-gray-700 dark:text-gray-300 transition-colors">
                        <div className="w-8 h-8 bg-accent-50 text-accent-600 rounded-lg flex items-center justify-center"><FolderPlus size={18}/></div>
                        Folder
                      </button>
                      <button onClick={() => { setIsNewFileModalOpen(true); setIsNewDropdownOpen(false); }} className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-bold flex items-center gap-3 text-gray-700 dark:text-gray-300 transition-colors">
                        <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center"><FilePlus size={18}/></div>
                        Text Document
                      </button>
                    </div>}
                  </div>
                  <div className="relative">
                    <button onClick={() => { setIsUploadDropdownOpen(!isUploadDropdownOpen); setIsNewDropdownOpen(false); }} className="px-5 py-2 bg-accent-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-accent-900/20 hover:bg-accent-700 transition-all active:scale-95">
                      <Upload size={18} /> Upload <ChevronDown size={14}/>
                    </button>
                    {isUploadDropdownOpen && <div className="absolute top-full left-0 mt-2 w-52 bg-white dark:bg-gray-900 shadow-2xl border rounded-2xl p-2 z-[110] animate-in fade-in zoom-in-95 duration-200">
                      <button onClick={() => { fileInputRef.current.click(); setIsUploadDropdownOpen(false); }} className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-bold flex items-center gap-3 text-gray-700 dark:text-gray-300 transition-colors">
                        <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center"><FileUp size={18}/></div>
                        Files
                      </button>
                      <button onClick={() => { folderInputRef.current.click(); setIsUploadDropdownOpen(false); }} className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-bold flex items-center gap-3 text-gray-700 dark:text-gray-300 transition-colors">
                        <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center"><FolderUp size={18}/></div>
                        Folder
                      </button>
                    </div>}
                    <input type="file" multiple className="hidden" ref={fileInputRef} onChange={(e) => handleUpload(e, false)} />
                    <input type="file" webkitdirectory="true" className="hidden" ref={folderInputRef} onChange={(e) => handleUpload(e, true)} />
                  </div>
                </div>
              )}
              <div className="ml-auto flex bg-gray-50 dark:bg-gray-950 p-1 rounded-lg shadow-inner"><button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white dark:bg-gray-900 shadow text-accent-600' : 'text-gray-400 dark:text-gray-500'}`}><ListIcon size={18} /></button><button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white dark:bg-gray-900 shadow text-accent-600' : 'text-gray-400 dark:text-gray-500'}`}><LayoutGrid size={18} /></button></div>
            </>
          )}
        </div>

        <nav className="px-8 py-4 shrink-0 flex items-center font-bold text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900">
           {isTrashView ? <span className="text-red-600">Recycle bin</span> : path.map((p, idx) => (
              <React.Fragment key={idx}>{idx > 0 && <ChevronRight size={14} className="mx-2" />}<button onClick={() => navigateTo(p)} className={idx === path.length - 1 ? 'text-gray-900 dark:text-gray-100 cursor-default' : 'hover:underline'}>{p.name}</button></React.Fragment>
           ))}
        </nav>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto px-8 pb-20 relative">
             {loading ? <div className="py-20 text-center"><Loader2 className="animate-spin inline text-accent-500" size={40} /></div> : (
                viewMode === 'list' ? (
                  <table className="w-full text-left">
                     <thead><tr className="border-b dark:border-gray-800 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest"><th className="px-4 py-4 w-12 text-center"><button onClick={selectAll}>{selectedIds.size > 0 ? <CheckSquare size={18} /> : <Square size={18} />}</button></th><th>Name</th><th className="text-center">Size</th><th className="w-12 text-right"></th></tr></thead>
                     <tbody>
                        {filteredItems.map(item => {
                           const isF = item.isFolder;
                           return (
                             <tr key={item.id} 
                                className={`group hover:bg-accent-50/50 dark:hover:bg-accent-900/20 cursor-pointer transition-all ${selectedIds.has(item.id) ? 'bg-accent-50/50 border-b dark:border-gray-800' : ''} ${sidePanelItem?.id === item.id ? 'bg-accent-50/30' : ''}`}                                onClick={() => setSidePanelItem(item)}
                                onDoubleClick={() => {
                                  if (!isTrashView && isF) navigateTo(item);
                                  else if (!isTrashView && !isF) { setSelectedFile(item); setIsPreviewOpen(true); }
                                }}>
                                <td className="px-4 py-4 text-center" onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}>{selectedIds.has(item.id) ? <CheckSquare size={18} className="text-accent-600"/> : <Square size={18} className="text-gray-200 group-hover:text-gray-400 dark:text-gray-500" />}</td>
                                <td className="px-4 py-5 flex items-center gap-4">{isF ? getFolderIcon(item.icon_type, item.color) : <div className="w-7 h-7 flex items-center justify-center">{getFileIcon(item.mime_type, item.name)}</div>}<span className="font-bold">{item.name}</span></td>
                                <td className="text-center text-xs font-bold text-gray-400 dark:text-gray-500">{item.size ? (item.size/1048576).toFixed(2)+'MB' : '—'}</td>
                                <td className="text-right">{isTrashView && <button onClick={(e) => { e.stopPropagation(); handleAction(item.id, 'restore'); }} className="p-2 text-accent-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 rounded shadow-sm"><RotateCcw size={18}/></button>}</td>
                             </tr>
                           )
                        })}
                     </tbody>
                  </table>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 pt-6">
                     {filteredItems.map(item => {
                        const isF = item.isFolder;
                        return (
                          <div key={item.id} 
                               className={`group p-5 rounded-3xl hover:bg-accent-50/30 dark:hover:bg-accent-900/20 transition-all cursor-pointer relative ${selectedIds.has(item.id) ? 'bg-accent-50/50 shadow-lg border border-accent-100' : ''} ${sidePanelItem?.id === item.id ? 'ring-2 ring-accent-400 ring-offset-2' : ''}`} 
                               onClick={() => setSidePanelItem(item)}
                               onDoubleClick={() => {
                                 if (isTrashView) toggleSelection(item.id);
                                 else if (isF) navigateTo(item);
                                 else { setSelectedFile(item); setIsPreviewOpen(true); }
                               }}>
                             <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => toggleSelection(item.id, e)}>{selectedIds.has(item.id) ? <CheckSquare size={20} className="text-accent-600"/> : <Square size={20} className="text-gray-300" />}</div>
                             <div className="aspect-square bg-gray-50 dark:bg-gray-950 rounded-2xl flex items-center justify-center mb-4 overflow-hidden border border-white dark:border-gray-700 shadow-inner">{isF ? getFolderIconLarge(item.icon_type, item.color) : (item.mime_type?.startsWith('image/') ? <img src={getAuthenticatedUrl(`/files/view/${item.id}`)} className="w-full h-full object-cover" /> : <div className="scale-150">{getFileIcon(item.mime_type, item.name)}</div>)}</div>
                             <p className="text-xs font-bold text-center truncate">{item.name}</p>
                          </div>
                        )
                     })}
                  </div>
                )
             )}
          </div>

          {sidePanelItem && (
            <aside className="w-80 border-l dark:border-gray-800 bg-white dark:bg-gray-900 p-6 flex flex-col gap-6 animate-in slide-in-from-right duration-300 shadow-2xl z-20 overflow-auto">
              <div className="flex justify-between items-center">
                <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">Details</h4>
                <button onClick={() => setSidePanelItem(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 rounded-full"><X size={16}/></button>
              </div>
              <div className="aspect-square bg-gray-50 dark:bg-gray-950 rounded-3xl flex items-center justify-center border shadow-inner overflow-hidden">
                {sidePanelItem.isFolder ? getFolderIconLarge(sidePanelItem.icon_type, sidePanelItem.color) : (sidePanelItem.mime_type?.startsWith('image/') ? <img src={getAuthenticatedUrl(`/files/view/${sidePanelItem.id}`)} className="w-full h-full object-cover" /> : getFileIcon(sidePanelItem.mime_type, sidePanelItem.name))}
              </div>
              <div className="space-y-4">
                <div><p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase">Name</p><p className="font-bold text-lg break-all leading-tight">{sidePanelItem.name}</p></div>
                {!sidePanelItem.isFolder && (
                  <>
                    <div><p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase">Size</p><p className="font-bold">{sidePanelItem.size ? (sidePanelItem.size/1048576).toFixed(2)+' MB' : '0 MB'} ({sidePanelItem.size} bytes)</p></div>
                    <div><p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase">MIME Type</p><p className="font-bold text-accent-600 bg-accent-50 px-2 py-1 rounded inline-block text-[11px]">{sidePanelItem.mime_type || 'Unknown'}</p></div>
                  </>
                )}
                <div><p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase">Created At</p><p className="font-bold">{new Date(sidePanelItem.created_at).toLocaleString()}</p></div>
                <div className="pt-4 flex flex-col gap-2">
                  {!isTrashView && (
                    <button onClick={() => { setItemToShare(sidePanelItem); setIsShareModalOpen(true); }} className="w-full bg-indigo-50 text-indigo-600 p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors">
                      <Share2 size={16}/> Share with others
                    </button>
                  )}
                  {sidePanelItem.isFolder ? (
                    <button onClick={() => startEditFolder(sidePanelItem)} className="w-full bg-accent-50 text-accent-600 p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent-100 transition-colors">
                      <Edit2 size={16}/> Edit Style & Name
                    </button>
                  ) : (
                    <a href={getAuthenticatedUrl(`/files/download/${sidePanelItem.id}`)} className="w-full bg-accent-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-accent-900/20 hover:bg-accent-700 transition-colors">
                      <Download size={16}/> Download
                    </a>
                  )}
                  <button onClick={() => handleAction(sidePanelItem.id, 'trash')} className="w-full p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors font-bold flex items-center justify-center gap-2">
                    <Trash size={18}/> Move to Trash
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>

      <FilePreviewer file={selectedFile} isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} onSave={fetchData} addNotify={addNotify} />
      
      <Modal isOpen={isNewFolderModalOpen || isEditingFolder} onClose={() => { setIsNewFolderModalOpen(false); setIsEditingFolder(false); setNewName(''); }} title={isEditingFolder ? "Edit Folder" : "New Folder"} maxWidth="max-w-xl" height="h-auto">
        <div className="p-8 space-y-8 flex flex-col items-center">
          <div className="w-24 h-24 bg-gray-50 dark:bg-gray-950 rounded-3xl flex items-center justify-center shadow-inner transition-all duration-300">
            {getFolderIconLarge(selectedIcon, selectedColor)}
          </div>
          
          <div className="w-full space-y-4">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] block text-center">Folder Name</label>
            <input autoFocus type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (isEditingFolder ? handleUpdateFolder() : handleCreate('folder'))} className="w-full border-b  border-gray-100 dark:border-gray-800/50 focus:border-accent-500 py-3 text-2xl font-black outline-none text-center transition-all bg-transparent" placeholder="Folder Name" />
          </div>

          <div className="w-full space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block text-center">Select Color</label>
              <div className="flex flex-wrap justify-center gap-2 px-4">
                {["blue","indigo","sky","cyan","teal","emerald","green","lime","amber","orange","red","rose","pink","fuchsia","purple","violet","gray"].map(c => (
                  <button key={c} onClick={() => setSelectedColor(c)} className={`w-8 h-8 rounded-full border-4 transition-all ${selectedColor === c ? 'border-white dark:border-gray-700 ring-2 ring-accent-500 scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`} style={{ backgroundColor: getColorHex(c) }} />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block text-center">Select Icon Style</label>
              <div className="grid grid-cols-5 gap-3 max-h-40 overflow-auto p-2">
                {[
                  { id: 'folder', Icon: Folder },
                  { id: 'database', Icon: Database },
                  { id: 'cpu', Icon: Cpu },
                  { id: 'shield', Icon: ShieldCheck },
                  { id: 'lock', Icon: Lock },
                  { id: 'settings', Icon: Settings2 },
                  { id: 'cloud', Icon: CloudLightning },
                  { id: 'work', Icon: Briefcase },
                  { id: 'book', Icon: BookOpen },
                  { id: 'music', Icon: Music },
                  { id: 'camera', Icon: Camera }
                ].map(item => (
                  <button key={item.id} onClick={() => setSelectedIcon(item.id)} className={`p-3 rounded-xl flex items-center justify-center transition-all ${selectedIcon === item.id ? 'bg-accent-500 text-white shadow-lg' : 'bg-gray-50 dark:bg-gray-950 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800'}`}>
                    <item.Icon size={24} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={() => isEditingFolder ? handleUpdateFolder() : handleCreate('folder')} className="w-full py-4 bg-accent-600 text-white rounded-2xl font-black shadow-xl shadow-accent-900/20 hover:bg-accent-700 transition-all active:scale-95">
            {isEditingFolder ? "Save Changes" : "Create Styled Folder"}
          </button>
        </div>
      </Modal>

      <Modal isOpen={isNewFileModalOpen} onClose={() => setIsNewFileModalOpen(false)} title="New Document" maxWidth="max-w-md" height="h-auto">
        <div className="p-8 text-center space-y-6 flex flex-col items-center">
          <div className="w-20 h-20 bg-green-50 text-green-500 rounded-3xl flex items-center justify-center shadow-inner">
            <FilePlus size={40} />
          </div>
          <div className="w-full space-y-4">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Document Name</label>
            <input autoFocus type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate('file')} className="w-full border-b  border-gray-100 dark:border-gray-800/50 focus:border-green-500 py-3 text-2xl font-black outline-none text-center transition-all bg-transparent" placeholder="notes.txt" />
          </div>
          <button onClick={() => handleCreate('file')} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all active:scale-95">Create Document</button>
        </div>
      </Modal>

      <Modal isOpen={isShareModalOpen} onClose={() => { setIsShareModalOpen(false); setShareSearchQuery(''); setShareSearchResults([]); }} title={`Share "${itemToShare?.name}"`} maxWidth="max-w-md" height="h-auto">
        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Find User (Email or Name)</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
              <input 
                autoFocus 
                type="text" 
                value={shareSearchQuery} 
                onChange={(e) => searchUsers(e.target.value)} 
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-950 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 border transition-all font-bold" 
                placeholder="Type email..." 
              />
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-auto">
            {shareSearchResults.map(user => (
              <button 
                key={user.id} 
                onClick={() => handleShare(user.id)} 
                className="w-full flex items-center justify-between p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl border border-transparent hover:border-indigo-100 transition-all group"
              >
                <div className="text-left">
                  <p className="font-bold text-gray-900 dark:text-gray-100">{user.username}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{user.email}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 bg-indigo-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full transition-all">Share</div>
              </button>
            ))}
            {shareSearchQuery.length >= 2 && shareSearchResults.length === 0 && (
              <p className="text-center py-4 text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-widest">No users found</p>
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Settings" maxWidth="max-w-4xl" height="h-[80vh]">
        <div className="flex h-full">
          {/* Sidebar Tabs */}
          <div className="w-64 border-r dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 p-4 space-y-2 shrink-0">
            <button onClick={() => setActiveSettingsTab('profile')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeSettingsTab === 'profile' ? 'bg-white dark:bg-gray-900 shadow-sm text-accent-600' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800'}`}>
              <User size={18} /> Profile
            </button>
            <button onClick={() => setActiveSettingsTab('theme')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeSettingsTab === 'theme' ? 'bg-white dark:bg-gray-900 shadow-sm text-accent-600' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800'}`}>
              <Palette size={18} /> Theme
            </button>
            <button onClick={() => setActiveSettingsTab('personalization')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeSettingsTab === 'personalization' ? 'bg-white dark:bg-gray-900 shadow-sm text-accent-600' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800'}`}>
              <LayoutGrid size={18} /> Personalization
            </button>
            {userRole === 'admin' && (
              <button onClick={() => setActiveSettingsTab('server')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${activeSettingsTab === 'server' ? 'bg-white dark:bg-gray-900 shadow-sm text-indigo-600' : 'text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800'}`}>
                <Cpu size={18} /> Server Control
              </button>
            )}
            
            <div className="pt-8 mt-8 border-t dark:border-gray-800 border-gray-100 dark:border-gray-800/50">
              <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                <ExternalLink size={18} /> Sign Out
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-10">
            {activeSettingsTab === 'profile' && (
              <form onSubmit={handleUpdateSettings} className="space-y-8 max-w-lg">
                <div className="space-y-2">
                  <h4 className="text-xl font-black text-gray-900 dark:text-gray-100">Profile Settings</h4>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">Manage your account identity and security credentials.</p>
                </div>
                
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-3xl bg-gray-50 dark:bg-gray-950 border-4 border-white dark:border-gray-800 shadow-xl overflow-hidden flex items-center justify-center">
                      {userData?.profile_picture ? (
                        <img src={getAuthenticatedUrl(`/users/avatar/${userData.id}`)} className="w-full h-full object-cover" />
                      ) : (
                        <User size={40} className="text-gray-300" />
                      )}
                    </div>
                    <button 
                      type="button"
                      onClick={() => profilePicRef.current.click()}
                      className="absolute -bottom-2 -right-2 bg-accent-600 text-white p-2 rounded-xl shadow-lg hover:bg-accent-700 transition-all active:scale-90"
                    >
                      <ImageIcon size={16} />
                    </button>
                    <input type="file" ref={profilePicRef} className="hidden" accept="image/*" />
                  </div>
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Change Profile Picture</p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">First Name</label>
                      <input 
                        type="text" 
                        value={settingsFormData.first_name} 
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, first_name: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 rounded-xl border focus:ring-2 focus:ring-accent-100 outline-none font-bold transition-all"
                        placeholder="e.g. John"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Last Name</label>
                      <input 
                        type="text" 
                        value={settingsFormData.last_name} 
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, last_name: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 rounded-xl border focus:ring-2 focus:ring-accent-100 outline-none font-bold transition-all"
                        placeholder="e.g. Doe"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Username</label>
                      <input 
                        type="text" 
                        value={settingsFormData.username} 
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, username: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 rounded-xl border focus:ring-2 focus:ring-accent-100 outline-none font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Email</label>
                      <input 
                        type="email" 
                        value={settingsFormData.email} 
                        onChange={(e) => setSettingsFormData({ ...settingsFormData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 rounded-xl border focus:ring-2 focus:ring-accent-100 outline-none font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t dark:border-gray-800 border-gray-100 dark:border-gray-800/50">
                    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-2">Change Password</label>
                    <input 
                      type="password" 
                      value={settingsFormData.password} 
                      onChange={(e) => setSettingsFormData({ ...settingsFormData, password: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-950 rounded-xl border focus:ring-2 focus:ring-accent-100 outline-none font-bold"
                      placeholder="Enter new password to change..."
                    />
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 italic">Leave empty to keep your current password.</p>
                  </div>
                </div>

                <button type="submit" disabled={isUpdatingSettings} className="px-8 py-3 bg-accent-600 text-white rounded-xl font-black shadow-lg shadow-accent-900/20 hover:bg-accent-700 transition-all active:scale-95 disabled:opacity-50">
                  {isUpdatingSettings ? 'Updating...' : 'Save Profile Changes'}
                </button>
              </form>
            )}

            {activeSettingsTab === 'theme' && (
              <div className="space-y-10 max-w-lg">
                <div className="space-y-2">
                  <h4 className="text-xl font-black text-gray-900 dark:text-gray-100">Interface Theme</h4>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">Choose how Personal Cloud looks on your screen.</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <button onClick={() => setTheme('light')} className={`p-4 rounded-2xl border-2 transition-all text-left space-y-3 ${theme === 'light' ? 'border-accent-500 bg-white ring-4 ring-accent-50' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                    <div className="w-full h-20 bg-white rounded-xl border border-gray-200 shadow-sm" />
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900">Light Mode</span>
                      {theme === 'light' && <CheckCircle2 size={18} className="text-accent-500" />}
                    </div>
                  </button>
                  <button onClick={() => setTheme('dark')} className={`p-4 rounded-2xl border-2 transition-all text-left space-y-3 ${theme === 'dark' ? 'border-accent-500 bg-gray-900 ring-4 ring-accent-900/10' : 'bg-gray-800 border-gray-700 hover:border-gray-600'}`}>
                    <div className="w-full h-20 bg-gray-800 rounded-xl border border-gray-700" />
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">Dark Mode</span>
                      {theme === 'dark' && <CheckCircle2 size={18} className="text-accent-500" />}
                    </div>
                  </button>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Accent Color</label>
                  <div className="flex flex-wrap gap-3">
                    {[{"name":"blue","hex":"#3b82f6"},{"name":"indigo","hex":"#6366f1"},{"name":"sky","hex":"#0ea5e9"},{"name":"cyan","hex":"#06b6d4"},{"name":"teal","hex":"#14b8a6"},{"name":"emerald","hex":"#10b981"},{"name":"green","hex":"#22c55e"},{"name":"lime","hex":"#84cc16"},{"name":"amber","hex":"#f59e0b"},{"name":"orange","hex":"#f97316"},{"name":"red","hex":"#ef4444"},{"name":"rose","hex":"#f43f5e"},{"name":"pink","hex":"#ec4899"},{"name":"fuchsia","hex":"#d946ef"},{"name":"purple","hex":"#a855f7"},{"name":"violet","hex":"#8b5cf6"},{"name":"gray","hex":"#6b7280"}].map(c => (
                      <button key={c.name} onClick={() => setAccentColor(c.name)} className={`w-12 h-12 rounded-full border-4 shadow-md transition-transform hover:scale-110 active:scale-90 ${accentColor === c.name ? 'scale-110 border-accent-500' : 'border-white dark:border-gray-800'}`} style={{ backgroundColor: c.hex }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSettingsTab === 'personalization' && (
              <div className="space-y-10">
                <div className="space-y-2">
                  <h4 className="text-xl font-black text-gray-900 dark:text-gray-100">Personalization</h4>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">Customize your storage and interface behavior.</p>
                </div>

                {/* Storage Card */}
                <div className="p-8 bg-gray-50 dark:bg-gray-950 rounded-3xl border border-gray-100 dark:border-gray-800/50 space-y-6">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-accent-600">
                        <HardDrive size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Cloud Storage</span>
                      </div>
                      <p className="text-3xl font-black text-gray-900 dark:text-gray-100">{(userData?.storage_used / (1024 * 1024)).toFixed(2)} <span className="text-sm font-bold text-gray-400 dark:text-gray-500">MB Used</span></p>
                    </div>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500">Limit: 5.00 GB</p>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-accent-600 h-full transition-all duration-1000" 
                      style={{ width: `${(userData?.storage_used / userData?.storage_quota) * 100}%` }} 
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-1">Files</p>
                      <p className="font-bold text-gray-700 dark:text-gray-300">{files.length}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-1">Folders</p>
                      <p className="font-bold text-gray-700 dark:text-gray-300">{folders.length}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-1">Role</p>
                      <p className="font-black text-accent-600 uppercase text-[10px]">{userData?.role}</p>
                    </div>
                  </div>
                </div>

                {/* UI Preferences */}
                <div className="space-y-4">
                  <h5 className="font-black text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">Interface Preferences</h5>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/50 rounded-2xl">
                      <div className="space-y-0.5">
                        <p className="font-bold text-gray-800 dark:text-gray-200">Default View Mode</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">Choose how files are shown when you log in.</p>
                      </div>
                      <select className="bg-gray-50 dark:bg-gray-950 font-bold px-3 py-1.5 rounded-lg outline-none border">
                        <option>List View</option>
                        <option>Grid View</option>
                      </select>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800/50 rounded-2xl">
                      <div className="space-y-0.5">
                        <p className="font-bold text-gray-800 dark:text-gray-200">Auto-refresh</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">Automatically sync changes from other devices.</p>
                      </div>
                      <div className="w-12 h-6 bg-accent-600 rounded-full flex items-center px-1 shadow-inner cursor-pointer">
                        <div className="w-4 h-4 bg-white dark:bg-gray-900 rounded-full shadow-sm ml-auto" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSettingsTab === 'server' && userRole === 'admin' && (
              <div className="space-y-10">
                <div className="space-y-2">
                  <h4 className="text-xl font-black text-gray-900 dark:text-gray-100">Server Management</h4>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">Control core services like Apache and MySQL directly from the cloud.</p>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  {/* Apache Card */}
                  <div className="p-8 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800/50 rounded-[2.5rem] space-y-6 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                        <CloudLightning size={32} />
                      </div>
                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${serverStatus.apache ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {serverStatus.apache ? '● Online' : '○ Offline'}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-2xl font-black text-gray-900 dark:text-gray-100">Apache HTTP</h5>
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Web Server & Reverse Proxy</p>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button 
                        onClick={() => handleServerAction('apache', 'start')}
                        className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95"
                      >
                        Start
                      </button>
                      <button 
                        onClick={() => handleServerAction('apache', 'restart')}
                        className="flex-1 py-3 border-2 border-gray-100 dark:border-gray-800/50 text-gray-900 dark:text-gray-100 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95"
                      >
                        Restart
                      </button>
                    </div>
                  </div>

                  {/* MySQL Card */}
                  <div className="p-8 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800/50 rounded-[2.5rem] space-y-6 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="w-14 h-14 bg-accent-50 text-accent-600 rounded-2xl flex items-center justify-center">
                        <Database size={32} />
                      </div>
                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${serverStatus.mysql ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {serverStatus.mysql ? '● Online' : '○ Offline'}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-2xl font-black text-gray-900 dark:text-gray-100">MySQL / MariaDB</h5>
                      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Relational Database Service</p>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button 
                        onClick={() => handleServerAction('mysql', 'restart')}
                        className="w-full py-3 bg-accent-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-accent-700 shadow-lg shadow-accent-900/20 transition-all active:scale-95"
                      >
                        Full Service Restart
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex gap-4 items-center">
                   <ShieldAlert className="text-amber-600 shrink-0" size={24} />
                   <div className="text-xs font-medium text-amber-800">
                      <p className="font-black uppercase tracking-widest text-[10px] mb-1">Warning</p>
                      Restarting services will temporarily disconnect all active users. Use with caution during peak hours.
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} title="System Administration - User Management" maxWidth="max-w-4xl" height="h-[80vh]">
        <div className="p-8">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b  border-gray-100 dark:border-gray-800/50 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                <th className="py-4 px-2">Username</th>
                <th className="py-4 px-2">Email</th>
                <th className="py-4 px-2">Role</th>
                <th className="py-4 px-2">Joined</th>
                <th className="py-4 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminUsers.map(user => (
                <tr key={user.id} className="border-b dark:border-gray-800 border-gray-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
                  <td className="py-4 px-2 font-bold text-gray-900 dark:text-gray-100">{user.username}</td>
                  <td className="py-4 px-2 text-gray-600 dark:text-gray-400 dark:text-gray-500">{user.email}</td>
                  <td className="py-4 px-2">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 dark:text-gray-500'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-gray-400 dark:text-gray-500 text-xs">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="py-4 px-2 text-right">
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Delete User & Files"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {adminUsers.length === 0 && (
            <div className="py-20 text-center text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">No users found</div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default PersonalCloud;
