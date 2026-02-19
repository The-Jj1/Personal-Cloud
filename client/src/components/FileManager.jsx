import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { renderAsync } from 'docx-preview';
import { 
  Folder, File, FileText, Image as ImageIcon, Video, Play, 
  MoreVertical, Download, Edit2, Trash2, Share2, 
  ChevronRight, ChevronDown, Grid, List, Search,
  Upload, X, Copy, Check, ZoomIn, ZoomOut, HardDrive, Loader2, Maximize, Plus,
  Clock, Users, Trash, Info, LayoutGrid, List as ListIcon, ChevronLeft, ExternalLink,
  FileSpreadsheet, FileArchive, FileCode, Presentation, FileDigit, FileType, CheckSquare, Square,
  RotateCcw, ShieldAlert, AlertCircle, CheckCircle2
} from 'lucide-react';

const API_BASE = 'http://localhost:3000';

const getFileIcon = (mimeType, name) => {
  const fileName = name?.toLowerCase() || '';
  if (mimeType?.startsWith('image/')) return <ImageIcon className="text-blue-500" />;
  if (mimeType?.startsWith('video/')) return <Video className="text-purple-500" />;
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return <FileSpreadsheet className="text-green-600" />;
  if (fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) return <Presentation className="text-orange-600" />;
  if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) return <FileText className="text-blue-600" />;
  if (fileName.endsWith('.pdf')) return <FileDigit className="text-red-500" />;
  return <File className="text-blue-400" />;
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

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[4px]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white shrink-0">
          <h3 className="text-lg font-bold text-gray-900 truncate pr-4">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-hidden bg-white">{children}</div>
      </div>
    </div>
  );
};

const FilePreviewer = ({ file, isOpen, onClose, onSave }) => {
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
    try { const r = await axios.get(`${API_BASE}/files/view/${file.id}`); setContent(typeof r.data === 'object' ? JSON.stringify(r.data, null, 2) : r.data); } 
    catch (e) { setContent('Load error'); } finally { setLoading(false); }
  };

  const renderDocx = async () => {
    setLoading(true);
    try { const r = await axios.get(`${API_BASE}/files/view/${file.id}`, { responseType: 'blob' }); setTimeout(() => docxRef.current && renderAsync(r.data, docxRef.current), 100); } 
    catch (e) {} finally { setLoading(false); }
  };

  if (!file) return null;
  const fn = file.name.toLowerCase();
  const isText = file.mime_type?.startsWith('text/') || /\.(js|py|sql|txt|md|json)$/.test(fn);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? `Editing: ${file.name}` : file.name}>
      <div className="flex flex-col h-full">
        <div className="px-4 py-2 border-b flex justify-between items-center bg-white shrink-0">
           <div className="flex gap-2">
              {isText && !isEditing && <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-[#0078d4] font-bold text-sm">Edit</button>}
              {isEditing && <button onClick={async () => { await axios.put(`${API_BASE}/files/content/${file.id}`, { content }); setIsEditing(false); onSave(); }} className="px-4 py-2 bg-[#0078d4] text-white rounded font-bold text-sm">Save</button>}
           </div>
           <a href={`${API_BASE}/files/download/${file.id}`} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-bold transition-all"><Download size={16} /> Изтегли</a>
        </div>
        <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-gray-50">
           {loading ? <Loader2 size={40} className="animate-spin text-blue-500" /> :
            file.mime_type?.startsWith('image/') ? <img src={`${API_BASE}/files/view/${file.id}`} className="max-w-full max-h-full shadow-lg" /> :
            file.mime_type?.startsWith('video/') ? <video controls className="w-full h-full bg-black" src={`${API_BASE}/files/view/${file.id}`} /> :
            fn.endsWith('.pdf') ? <iframe src={`${API_BASE}/files/view/${file.id}`} className="w-full h-full border-none" /> :
            fn.endsWith('.docx') ? <div className="w-full h-full overflow-auto p-10"><div ref={docxRef} className="mx-auto max-w-3xl bg-white shadow-xl p-10" /></div> :
            isText ? (isEditing ? <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full h-full p-10 font-mono text-sm" spellCheck="false" /> : <div className="w-full h-full p-10 overflow-auto font-mono text-sm whitespace-pre-wrap">{content}</div>) :
            <p className="text-gray-400 font-bold">No Preview</p>}
        </div>
      </div>
    </Modal>
  );
};

const PersonalCloud = () => {
  const [viewMode, setViewMode] = useState('list');
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [path, setPath] = useState([{ id: null, name: 'My files' }]);
  const [stats, setStats] = useState({ used_mb: '0', percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [isTrashView, setIsTrashView] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [notifications, setNotifications] = useState([]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);
  const [isNewDropdownOpen, setIsNewDropdownOpen] = useState(false);
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const addNotify = (type, title, message) => {
    const id = Date.now();
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

  const handleCreate = async (type) => {
    if (!newName.trim()) return;
    try {
      if (type === 'folder') await axios.post(`${API_BASE}/folders`, { name: newName, parent_id: currentFolderId });
      else await axios.post(`${API_BASE}/files/create`, { name: newName.includes('.') ? newName : newName + '.txt', folder_id: currentFolderId });
      setNewName(''); setIsNewFolderModalOpen(false); setIsNewFileModalOpen(false); fetchData();
    } catch (err) { addNotify('error', 'Error', 'Create failed'); }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 overflow-hidden text-sm">
      <Toast notifications={notifications} remove={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />
      <aside className="w-64 bg-white border-r flex flex-col shrink-0 z-20">
        <div className="p-6 flex items-center gap-3 mb-4 cursor-pointer" onClick={() => { setIsTrashView(false); setCurrentFolderId(null); }}>
           <div className="w-10 h-10 bg-[#0078d4] rounded-lg flex items-center justify-center shadow-lg"><HardDrive className="text-white" size={24} /></div>
           <span className="font-black text-[#0078d4] text-xl">Personal Cloud</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          <button onClick={() => { setIsTrashView(false); setCurrentFolderId(null); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${!isTrashView ? 'bg-blue-50 text-[#0078d4]' : 'hover:bg-gray-50'}`}><Folder size={20} /> My files</button>
          <button onClick={() => setIsTrashView(true)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${isTrashView ? 'bg-red-50 text-red-600' : 'hover:bg-gray-50'}`}><Trash size={20} /> Recycle bin</button>
        </nav>
        <div className="p-6 border-t font-bold text-gray-400 text-[11px]"><div className="w-full bg-gray-100 rounded-full h-1.5 mb-2 overflow-hidden"><div className="bg-[#0078d4] h-full transition-all duration-1000 shadow-[0_0_8px_rgba(0,120,212,0.4)]" style={{ width: `${stats.percentage}%` }} /></div><span>{stats.used_mb} MB of 50 GB used</span></div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden relative shadow-2xl">
        <header className="h-16 border-b flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex-1 max-w-xl group"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} /><input type="text" placeholder="Search..." className="w-full pl-12 pr-6 py-2.5 bg-gray-50 rounded-xl outline-none" /></div></div>
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black">GU</div>
        </header>

        <div className="h-14 border-b flex items-center px-6 gap-3 bg-white/80 backdrop-blur-md">
          {selectedIds.size > 0 ? (
            <>
              <span className={`${isTrashView ? 'text-red-600' : 'text-[#0078d4]'} font-black px-4`}>{selectedIds.size} selected</span>
              <button onClick={() => handleBatch('delete')} className="px-4 py-2 text-red-600 font-bold">Delete</button>
              {isTrashView && <button onClick={() => handleBatch('restore')} className="px-4 py-2 text-green-600 font-bold">Restore</button>}
              <button onClick={() => setSelectedIds(new Set())} className="ml-auto font-bold text-gray-400">Clear</button>
            </>
          ) : (
            <>
              {!isTrashView && (
                <div className="flex gap-2">
                  <div className="relative">
                    <button onClick={() => setIsNewDropdownOpen(!isNewDropdownOpen)} className="px-4 py-2 text-[#0078d4] font-bold flex items-center gap-2">New <ChevronDown size={14}/></button>
                    {isNewDropdownOpen && <div className="absolute top-full left-0 mt-2 w-48 bg-white shadow-xl border rounded-xl p-2 z-[110]">
                      <button onClick={() => { setIsNewFolderModalOpen(true); setIsNewDropdownOpen(false); }} className="w-full text-left p-2 hover:bg-gray-50 rounded font-bold">Folder</button>
                      <button onClick={() => { setIsNewFileModalOpen(true); setIsNewDropdownOpen(false); }} className="w-full text-left p-2 hover:bg-gray-50 rounded font-bold">Text Document</button>
                    </div>}
                  </div>
                  <div className="relative">
                    <button onClick={() => setIsUploadDropdownOpen(!isUploadDropdownOpen)} className="px-4 py-2 bg-[#0078d4] text-white rounded-lg font-bold flex items-center gap-2 shadow-lg">Upload <ChevronDown size={14}/></button>
                    {isUploadDropdownOpen && <div className="absolute top-full left-0 mt-2 w-48 bg-white shadow-xl border rounded-xl p-2 z-[110]">
                      <button onClick={() => { fileInputRef.current.click(); setIsUploadDropdownOpen(false); }} className="w-full text-left p-2 hover:bg-gray-50 rounded font-bold">Files</button>
                      <button onClick={() => { folderInputRef.current.click(); setIsUploadDropdownOpen(false); }} className="w-full text-left p-2 hover:bg-gray-50 rounded font-bold">Folder</button>
                    </div>}
                    <input type="file" multiple className="hidden" ref={fileInputRef} onChange={(e) => handleUpload(e, false)} />
                    <input type="file" webkitdirectory="true" className="hidden" ref={folderInputRef} onChange={(e) => handleUpload(e, true)} />
                  </div>
                </div>
              )}
              <div className="ml-auto flex bg-gray-50 p-1 rounded-lg shadow-inner"><button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow text-[#0078d4]' : 'text-gray-400'}`}><ListIcon size={18} /></button><button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow text-[#0078d4]' : 'text-gray-400'}`}><LayoutGrid size={18} /></button></div>
            </>
          )}
        </div>

        <nav className="px-8 py-4 shrink-0 flex items-center font-bold text-xs uppercase tracking-widest text-gray-400 bg-white">
           {isTrashView ? <span className="text-red-600">Recycle bin</span> : path.map((p, idx) => (
              <React.Fragment key={idx}>{idx > 0 && <ChevronRight size={14} className="mx-2" />}<button onClick={() => navigateTo(p)} className={idx === path.length - 1 ? 'text-gray-900 cursor-default' : 'hover:underline'}>{p.name}</button></React.Fragment>
           ))}
        </nav>

        <div className="flex-1 overflow-auto px-8 pb-20">
           {loading ? <div className="py-20 text-center"><Loader2 className="animate-spin inline text-blue-500" size={40} /></div> : (
              viewMode === 'list' ? (
                <table className="w-full text-left">
                   <thead><tr className="border-b text-[10px] font-black text-gray-400 uppercase tracking-widest"><th className="px-4 py-4 w-12 text-center"><button onClick={selectAll}>{selectedIds.size > 0 ? <CheckSquare size={18} /> : <Square size={18} />}</button></th><th>Name</th><th className="text-center">Size</th><th className="w-12 text-right"></th></tr></thead>
                   <tbody>
                      {[...folders, ...files].map(item => {
                         const isF = folders.includes(item);
                         return (
                           <tr key={item.id} className={`group hover:bg-blue-50/20 cursor-pointer transition-all ${selectedIds.has(item.id) ? 'bg-blue-50/50 border-b-blue-100' : ''}`} onClick={() => isTrashView ? toggleSelection(item.id) : (isF ? navigateTo(item) : (setSelectedFile(item), setIsPreviewOpen(true)))}>
                              <td className="px-4 py-4 text-center" onClick={(e) => toggleSelection(item.id, e)}>{selectedIds.has(item.id) ? <CheckSquare size={18} className="text-blue-600"/> : <Square size={18} className="text-gray-200 group-hover:text-gray-400" />}</td>
                              <td className="px-4 py-5 flex items-center gap-4">{isF ? <Folder size={28} className="text-blue-400 fill-blue-50" /> : <div className="w-7 h-7 flex items-center justify-center">{getFileIcon(item.mime_type, item.name)}</div>}<span className="font-bold">{item.name}</span></td>
                              <td className="text-center text-xs font-bold text-gray-400">{item.size ? (item.size/1048576).toFixed(2)+'MB' : '—'}</td>
                              <td className="text-right">{isTrashView && <button onClick={(e) => { e.stopPropagation(); handleAction(item.id, 'restore'); }} className="p-2 text-[#0078d4] hover:bg-white rounded shadow-sm"><RotateCcw size={18}/></button>}</td>
                           </tr>
                         )
                      })}
                   </tbody>
                </table>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 pt-6">
                   {[...folders, ...files].map(item => {
                      const isF = folders.includes(item);
                      return (
                        <div key={item.id} className={`group p-5 rounded-3xl hover:bg-blue-50/30 transition-all cursor-pointer relative ${selectedIds.has(item.id) ? 'bg-blue-50/50 shadow-lg border border-blue-100' : ''}`} onClick={() => isTrashView ? toggleSelection(item.id) : (isF ? navigateTo(item) : (setSelectedFile(item), setIsPreviewOpen(true)))}>
                           <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => toggleSelection(item.id, e)}>{selectedIds.has(item.id) ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20} className="text-gray-300" />}</div>
                           <div className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center mb-4 overflow-hidden border border-white shadow-inner">{isF ? <Folder size={72} className="text-blue-400 fill-blue-50 shadow-sm" /> : (item.mime_type?.startsWith('image/') ? <img src={`${API_BASE}/files/view/${item.id}`} className="w-full h-full object-cover" /> : <div className="scale-150">{getFileIcon(item.mime_type, item.name)}</div>)}</div>
                           <p className="text-xs font-bold text-center truncate">{item.name}</p>
                        </div>
                      )
                   })}
                </div>
              )
           )}
        </div>
      </main>

      <FilePreviewer file={selectedFile} isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} onSave={fetchData} />
      <Modal isOpen={isNewFolderModalOpen} onClose={() => setIsNewFolderModalOpen(false)} title="New Folder"><div className="p-10 text-center space-y-6"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</label><input autoFocus type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate('folder')} className="w-full border-b-4 border-gray-100 focus:border-[#0078d4] py-4 text-3xl font-black outline-none text-center" /><button onClick={() => handleCreate('folder')} className="px-12 py-4 bg-[#0078d4] text-white rounded-2xl font-bold shadow-xl">Create</button></div></Modal>
      <Modal isOpen={isNewFileModalOpen} onClose={() => setIsNewFileModalOpen(false)} title="New Document"><div className="p-10 text-center space-y-6"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">File Name</label><input autoFocus type="text" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate('file')} className="w-full border-b-4 border-gray-100 focus:border-[#0078d4] py-4 text-3xl font-black outline-none text-center" /><button onClick={() => handleCreate('file')} className="px-12 py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-xl">Create</button></div></Modal>
    </div>
  );
};

export default PersonalCloud;
