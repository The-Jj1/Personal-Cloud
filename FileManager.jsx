import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  File, 
  Upload, 
  ChevronRight, 
  ChevronDown, 
  HardDrive, 
  MoreVertical, 
  Search,
  Plus
} from 'lucide-react';

const FileManager = () => {
  // Mock State - В реално приложение тук ще са данните от API-то
  const [currentFolder, setCurrentFolder] = useState(null);
  const [files, setFiles] = useState([
    { id: '1', name: 'Project-Proposal.pdf', size: '2.4 MB', type: 'PDF', updated: '2024-02-15' },
    { id: '2', name: 'Vacation-Photo.jpg', size: '4.1 MB', type: 'Image', updated: '2024-02-18' },
    { id: '3', name: 'Budget-2024.xlsx', size: '1.2 MB', type: 'Excel', updated: '2024-02-19' },
  ]);

  const [folders, setFolders] = useState([
    { id: 'f1', name: 'Documents', children: ['f3'] },
    { id: 'f2', name: 'Images', children: [] },
    { id: 'f3', name: 'Work', children: [] },
  ]);

  const storageStats = {
    used: 4.2, // GB
    total: 10,  // GB
    percentage: 42
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      
      {/* 1. Sidebar with Tree Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <HardDrive size={24} /> Personal Cloud
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
            My Storage
          </div>
          
          {/* Recursive Tree View Logic (Simplified) */}
          <div className="space-y-1">
            <button className="w-full flex items-center gap-2 px-2 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg">
              <ChevronDown size={16} />
              <Folder size={18} />
              Root Directory
            </button>
            <div className="ml-4 space-y-1 border-l border-gray-100 pl-2">
              {folders.map(folder => (
                <button key={folder.id} className="w-full flex items-center gap-2 px-2 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronRight size={14} className="text-gray-400" />
                  <Folder size={18} className="text-yellow-500" />
                  {folder.name}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* 3. Progress Bar (Storage Info) */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Storage Used</span>
            <span className="font-semibold text-gray-700">{storageStats.used} GB / {storageStats.total} GB</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${storageStats.percentage}%` }}
            ></div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 italic">You're using {storageStats.percentage}% of your capacity.</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header / Top Bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search files and folders..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-lg text-sm transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            {/* 4. Upload Button */}
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95">
              <Upload size={18} />
              Upload File
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <Plus size={20} />
            </button>
          </div>
        </header>

        {/* 2. Files Table */}
        <div className="flex-1 overflow-auto p-8">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Root Directory</h2>
              <p className="text-sm text-gray-500">Manage your files and cloud assets</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Modified</th>
                  <th className="px-6 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-200 transition-colors">
                          <File size={20} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{file.size}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium uppercase tracking-tight">
                        {file.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{file.updated}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {files.length === 0 && (
              <div className="p-12 text-center">
                <div className="inline-flex p-4 bg-gray-50 rounded-full text-gray-300 mb-4">
                  <Folder size={48} />
                </div>
                <p className="text-gray-500">This folder is empty.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FileManager;
