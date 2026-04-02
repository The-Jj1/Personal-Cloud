import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Send, Users, User, Plus, Search, X, 
  MessageSquare, Hash, MoreVertical, Trash2, 
  CheckCircle2, Loader2, ChevronLeft
} from 'lucide-react';

const API_BASE = 'http://localhost:3000';

const getAuthenticatedUrl = (path) => {
  const token = localStorage.getItem('token');
  return `${API_BASE}${path}${path.includes('?') ? '&' : '?'}token=${token}`;
};

const Chat = ({ currentUser, addNotify }) => {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null); // { type: 'user'|'group', id, name }
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchData = async () => {
    try {
      const [uRes, gRes, fRes] = await Promise.all([
        axios.get(`${API_BASE}/users/all`),
        axios.get(`${API_BASE}/groups`),
        axios.get(`${API_BASE}/friends`)
      ]);
      setUsers(uRes.data);
      setGroups(gRes.data);
      setFriends(fRes.data.friends);
      setPendingRequests(fRes.data.pending);
    } catch (e) {
      console.error('Fetch error', e);
    }
  };

  const fetchMessages = async () => {
    if (!selectedChat) return;
    try {
      const endpoint = selectedChat.type === 'user' 
        ? `/messages/chat/${selectedChat.id}` 
        : `/messages/group/${selectedChat.id}`;
      const res = await axios.get(`${API_BASE}${endpoint}`);
      setMessages(res.data);
    } catch (e) {
      console.error('Fetch messages error', e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Fetch users/friends every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Polling every 3s
    return () => clearInterval(interval);
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendRequest = async (friendId) => {
    try {
      await axios.post(`${API_BASE}/friends/request`, { friend_id: friendId });
      addNotify('success', 'Request Sent', 'Friend request has been sent');
      fetchData();
    } catch (e) {
      addNotify('error', 'Error', e.response?.data?.error || 'Failed to send request');
    }
  };

  const handleAcceptRequest = async (friendshipId) => {
    try {
      await axios.post(`${API_BASE}/friends/accept`, { id: friendshipId });
      addNotify('success', 'Accepted', 'You are now friends!');
      fetchData();
    } catch (e) {
      addNotify('error', 'Error', 'Failed to accept');
    }
  };

  const handleRemoveFriend = async (friendshipId) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await axios.delete(`${API_BASE}/friends/${friendshipId}`);
      addNotify('info', 'Removed', 'Friendship removed');
      fetchData();
    } catch (e) {
      addNotify('error', 'Error', 'Failed to remove');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      const payload = {
        content: newMessage,
        [selectedChat.type === 'user' ? 'recipient_id' : 'group_id']: selectedChat.id
      };
      await axios.post(`${API_BASE}/messages`, payload);
      setNewMessage('');
      fetchMessages();
    } catch (e) {
      addNotify('error', 'Message Error', 'Failed to send message');
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await axios.post(`${API_BASE}/groups`, {
        name: newGroupName,
        member_ids: selectedMembers
      });
      setNewGroupName('');
      setSelectedMembers([]);
      setIsNewGroupModalOpen(false);
      fetchData();
      addNotify('success', 'Group Created', `Group ${newGroupName} is ready`);
    } catch (e) {
      addNotify('error', 'Group Error', 'Failed to create group');
    }
  };

  const toggleMember = (userId) => {
    setSelectedMembers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-white dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r dark:border-gray-800 flex flex-col shrink-0">
        <div className="p-4 border-b dark:border-gray-800 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-black text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">Network</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsAddFriendModalOpen(true)}
                className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                title="Add Friend"
              >
                <Plus size={18} />
              </button>
              <button 
                onClick={() => setIsNewGroupModalOpen(true)}
                className="p-2 bg-accent-50 text-accent-600 rounded-lg hover:bg-accent-100 transition-colors"
                title="New Group"
              >
                <Users size={18} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-950 border dark:border-gray-800 rounded-xl outline-none text-sm font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2 space-y-1">
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div className="px-3 py-2">
              <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                Pending Requests <span className="w-4 h-4 bg-amber-500 text-white rounded-full flex items-center justify-center text-[8px]">{pendingRequests.length}</span>
              </h3>
              {pendingRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                      <User size={14}/>
                    </div>
                    <span className="font-bold text-xs truncate">{req.username}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleAcceptRequest(req.id)} className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600"><CheckCircle2 size={14}/></button>
                    <button onClick={() => handleRemoveFriend(req.id)} className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"><X size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Groups Section */}
          <div className="px-3 py-2">
            <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Groups</h3>
            {groups.map(g => (
              <button 
                key={g.id}
                onClick={() => setSelectedChat({ type: 'group', id: g.id, name: g.name })}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedChat?.id === g.id ? 'bg-accent-50 text-accent-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Hash size={20} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{g.name}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Friends Section */}
          <div className="px-3 py-2">
            <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Friends</h3>
            {friends.map(u => (
              <button 
                key={u.user_id}
                onClick={() => setSelectedChat({ type: 'user', id: u.user_id, name: u.username })}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selectedChat?.id === u.user_id ? 'bg-accent-50 text-accent-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden">
                  {u.profile_picture ? (
                    <img src={getAuthenticatedUrl(`/users/avatar/${u.user_id}`)} className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className="text-gray-400" />
                  )}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{u.username}</p>
                  <p className="text-[10px] opacity-60 truncate">Online</p>
                </div>
              </button>
            ))}
            {friends.length === 0 && (
              <p className="text-[10px] text-center text-gray-400 py-4 italic">No friends yet. Add some people!</p>
            )}
          </div>
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900">
        {selectedChat ? (
          <>
            <header className="h-16 border-b dark:border-gray-800 flex items-center justify-between px-6 bg-white dark:bg-gray-900 shrink-0">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedChat.type === 'group' ? 'bg-indigo-100 text-indigo-600' : 'bg-accent-100 text-accent-600'}`}>
                  {selectedChat.type === 'group' ? <Hash size={20} /> : <User size={20} />}
                </div>
                <div>
                  <h3 className="font-black text-sm">{selectedChat.name}</h3>
                  <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Active Chat</p>
                </div>
              </div>
              {selectedChat.type === 'user' && (
                <button 
                  onClick={() => {
                    const friendship = friends.find(f => f.user_id === selectedChat.id);
                    if (friendship) handleRemoveFriend(friendship.id);
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  title="Remove Friend"
                >
                  <Trash2 size={18}/>
                </button>
              )}
            </header>

            <div className="flex-1 overflow-auto p-6 space-y-4">
              {messages.map((m, idx) => {
                const amISender = m.sender_name === localStorage.getItem('username');

                return (
                  <div key={m.id} className={`flex ${amISender ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${amISender ? 'order-1' : 'order-2'}`}>
                      {!amISender && selectedChat.type === 'group' && (
                        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-1 ml-2">{m.sender_name}</p>
                      )}
                      <div className={`p-4 rounded-2xl shadow-sm ${amISender ? 'bg-accent-600 text-white rounded-tr-none' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none'}`}>
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">
                          {m.content.split(/(\s+)/).map((part, i) => {
                            if (part.match(/^https?:\/\//)) {
                              return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 break-all">{part}</a>;
                            }
                            return part;
                          })}
                        </p>
                        <p className={`text-[9px] mt-2 opacity-60 font-bold ${amISender ? 'text-right' : 'text-left'}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  className="flex-1 px-6 py-3 bg-gray-50 dark:bg-gray-950 rounded-2xl outline-none focus:ring-2 focus:ring-accent-100 font-medium transition-all"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 bg-accent-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-accent-900/20 hover:bg-accent-700 transition-all active:scale-90 disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-6">
            <div className="w-24 h-24 bg-accent-50 text-accent-600 rounded-[2rem] flex items-center justify-center shadow-inner animate-bounce duration-[2000ms]">
              <MessageSquare size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100">Connect with Friends</h3>
              <p className="text-gray-400 dark:text-gray-500 max-w-sm mx-auto font-medium">Add people to your network to start private conversations or create groups.</p>
              <button 
                onClick={() => setIsAddFriendModalOpen(true)}
                className="mt-4 px-6 py-3 bg-accent-600 text-white rounded-xl font-bold hover:bg-accent-700 transition-all"
              >
                Find People
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Friend Modal */}
      {isAddFriendModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[4px] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-md flex flex-col overflow-hidden border">
            <div className="px-8 py-6 border-b dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Add Friend</h3>
              <button onClick={() => setIsAddFriendModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 rounded-full"><X size={20}/></button>
            </div>
            <div className="p-8 space-y-4">
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search by name or email..." 
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-950 border dark:border-gray-800 rounded-xl outline-none text-sm font-bold"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="space-y-2 max-h-80 overflow-auto pr-2">
                {filteredUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center overflow-hidden">
                        {u.profile_picture ? <img src={getAuthenticatedUrl(`/users/avatar/${u.id}`)} className="w-full h-full object-cover" /> : <User size={18}/>}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm">{u.username}</p>
                        <p className="text-[10px] opacity-60">{u.email}</p>
                      </div>
                    </div>
                    {u.friend_status === 'accepted' ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase">Friends</span>
                    ) : u.friend_status === 'pending' ? (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase">Pending</span>
                    ) : (
                      <button 
                        onClick={() => handleSendRequest(u.id)}
                        className="p-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-all"
                      >
                        <Plus size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Group Modal */}
      {isNewGroupModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[4px] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-md flex flex-col overflow-hidden border">
            <div className="px-8 py-6 border-b dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Create New Group</h3>
              <button onClick={() => setIsNewGroupModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 dark:bg-gray-800 rounded-full"><X size={20}/></button>
            </div>
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block text-center">Group Name</label>
                <input 
                  autoFocus 
                  type="text" 
                  value={newGroupName} 
                  onChange={(e) => setNewGroupName(e.target.value)} 
                  className="w-full border-b  border-gray-100 dark:border-gray-800/50 focus:border-accent-500 py-3 text-2xl font-black outline-none text-center transition-all bg-transparent" 
                  placeholder="Marketing Team..." 
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Add Members (from Friends)</label>
                <div className="space-y-2 max-h-60 overflow-auto pr-2">
                  {friends.map(u => (
                    <button 
                      key={u.user_id}
                      onClick={() => toggleMember(u.user_id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${selectedMembers.includes(u.user_id) ? 'bg-accent-50 border-accent-200 text-accent-700' : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                          {u.profile_picture ? <img src={getAuthenticatedUrl(`/users/avatar/${u.user_id}`)} className="w-full h-full object-cover" /> : <User size={14}/>}
                        </div>
                        <span className="font-bold text-sm">{u.username}</span>
                      </div>
                      {selectedMembers.includes(u.user_id) ? <CheckCircle2 size={18} /> : <Plus size={18} />}
                    </button>
                  ))}
                  {friends.length === 0 && (
                    <p className="text-[10px] text-center text-gray-400">You need friends to create a group.</p>
                  )}
                </div>
              </div>

              <button 
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || selectedMembers.length === 0}
                className="w-full py-4 bg-accent-600 text-white rounded-2xl font-black shadow-xl shadow-accent-900/20 hover:bg-accent-700 transition-all active:scale-95 disabled:opacity-50"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
