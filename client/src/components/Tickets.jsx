import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  MessageSquare, Plus, Send, Clock, 
  CheckCircle2, AlertCircle, ChevronLeft,
  User, ShieldCheck, X, Loader2
} from 'lucide-react';

const API_BASE = 'http://localhost:3000';

const Tickets = ({ userRole, addNotify }) => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketContent, setNewTicketContent] = useState('');
  const [replyContent, setNewReplyContent] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  const fetchTickets = async () => {
    try {
      const res = await axios.get(`${API_BASE}/tickets`);
      setTickets(res.data);
    } catch (e) {
      console.error('Fetch tickets error', e);
    }
  };

  const fetchTicketDetails = async (id) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/tickets/${id}`);
      setSelectedTicket(res.data);
      setMessages(res.data.messages);
    } catch (e) {
      addNotify('error', 'Error', 'Could not load ticket details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      const interval = setInterval(() => {
        axios.get(`${API_BASE}/tickets/${selectedTicket.id}`).then(res => {
          setMessages(res.data.messages);
        });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketContent.trim()) return;

    try {
      await axios.post(`${API_BASE}/tickets`, {
        subject: newTicketSubject,
        content: newTicketContent
      });
      setNewTicketSubject('');
      setNewTicketContent('');
      setIsCreateModalOpen(false);
      fetchTickets();
      addNotify('success', 'Ticket Created', 'Support team will review it soon.');
    } catch (e) {
      addNotify('error', 'Error', 'Failed to create ticket');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim() || !selectedTicket) return;

    try {
      await axios.post(`${API_BASE}/tickets/${selectedTicket.id}/messages`, {
        content: replyContent
      });
      setNewReplyContent('');
      fetchTicketDetails(selectedTicket.id);
    } catch (e) {
      addNotify('error', 'Error', 'Failed to send reply');
    }
  };

  const toggleStatus = async () => {
    if (!selectedTicket || userRole !== 'admin') return;
    const newStatus = selectedTicket.status === 'open' ? 'closed' : 'open';
    try {
      await axios.put(`${API_BASE}/tickets/${selectedTicket.id}/status`, { status: newStatus });
      fetchTicketDetails(selectedTicket.id);
      fetchTickets();
      addNotify('info', 'Status Updated', `Ticket is now ${newStatus}`);
    } catch (e) {
      addNotify('error', 'Error', 'Failed to update status');
    }
  };

  return (
    <div className="flex h-full bg-white dark:bg-gray-900 overflow-hidden">
      {/* Tickets List */}
      <div className="w-80 border-r dark:border-gray-800 flex flex-col shrink-0">
        <div className="p-6 border-b dark:border-gray-800 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black">Support</h2>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Help Center</p>
          </div>
          {userRole !== 'admin' && (
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="p-2 bg-accent-600 text-white rounded-xl shadow-lg shadow-accent-900/20 hover:bg-accent-700 transition-all active:scale-90"
            >
              <Plus size={20} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-2">
          {tickets.map(t => (
            <button 
              key={t.id}
              onClick={() => fetchTicketDetails(t.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedTicket?.id === t.id ? 'bg-accent-50 border-accent-200 shadow-sm' : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${t.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {t.status}
                </span>
                <span className="text-[9px] text-gray-400 font-bold">{new Date(t.created_at).toLocaleDateString()}</span>
              </div>
              <p className="font-black text-sm truncate">{t.subject}</p>
              {userRole === 'admin' && <p className="text-[10px] font-bold text-accent-600">User: {t.username}</p>}
            </button>
          ))}
          {tickets.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <MessageSquare className="mx-auto text-gray-200" size={40} />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No tickets found</p>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Details */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedTicket ? (
          <>
            <header className="h-20 border-b dark:border-gray-800 px-8 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedTicket.status === 'open' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="font-black text-lg leading-none">{selectedTicket.subject}</h3>
                  <p className="text-xs text-gray-400 font-bold mt-1">Ticket ID: {selectedTicket.id.substring(0, 8)}</p>
                </div>
              </div>
              {userRole === 'admin' && (
                <button 
                  onClick={toggleStatus}
                  className={`px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${selectedTicket.status === 'open' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                >
                  {selectedTicket.status === 'open' ? 'Close Ticket' : 'Reopen Ticket'}
                </button>
              )}
            </header>

            <div className="flex-1 overflow-auto p-8 space-y-6">
              {messages.map((m, idx) => {
                const isSystem = m.sender_role === 'admin';
                return (
                  <div key={m.id} className={`flex ${isSystem ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] ${isSystem ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100' : 'bg-accent-600 text-white'} p-5 rounded-2xl shadow-sm relative`}>
                      <div className="flex items-center gap-2 mb-2">
                        {isSystem ? <ShieldCheck size={14} className="text-accent-600" /> : <User size={14} />}
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{m.sender_name} {isSystem && '(Staff)'}</span>
                      </div>
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">
                        {m.content.split(/(\s+)/).map((part, i) => {
                          if (part.match(/^https?:\/\//)) {
                            return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 break-all">{part}</a>;
                          }
                          return part;
                        })}
                      </p>
                      <p className="text-[9px] mt-3 font-bold opacity-40 text-right">{new Date(m.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {selectedTicket.status === 'open' ? (
              <form onSubmit={handleReply} className="p-6 border-t dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
                <div className="flex items-center gap-4">
                  <input 
                    type="text" 
                    placeholder="Type your response..." 
                    className="flex-1 px-6 py-4 bg-gray-50 dark:bg-gray-950 rounded-2xl border dark:border-gray-800 outline-none focus:ring-2 focus:ring-accent-100 font-bold transition-all"
                    value={replyContent}
                    onChange={(e) => setNewReplyContent(e.target.value)}
                  />
                  <button 
                    type="submit"
                    disabled={!replyContent.trim()}
                    className="w-14 h-14 bg-accent-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-accent-900/20 hover:bg-accent-700 transition-all active:scale-90 disabled:opacity-50"
                  >
                    <Send size={24} />
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-8 text-center bg-gray-50 dark:bg-gray-950 border-t dark:border-gray-800 shrink-0">
                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">This ticket is closed. No further replies allowed.</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-6">
            <div className="w-32 h-32 bg-accent-50 text-accent-600 rounded-[3rem] flex items-center justify-center shadow-inner animate-pulse">
              <MessageSquare size={64} />
            </div>
            <div className="space-y-2">
              <h3 className="text-3xl font-black">Ticket System</h3>
              <p className="text-gray-400 max-w-sm mx-auto font-bold uppercase tracking-widest text-[10px]">Select a ticket from the sidebar to view conversation or create a new one to get help.</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[4px] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg border overflow-hidden">
            <div className="px-8 py-6 border-b dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">New Support Request</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all"><X size={20}/></button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-10 space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</label>
                <input 
                  autoFocus 
                  type="text" 
                  value={newTicketSubject} 
                  onChange={(e) => setNewTicketSubject(e.target.value)} 
                  className="w-full border-b  border-gray-100 focus:border-accent-500 py-3 text-2xl font-black outline-none transition-all bg-transparent" 
                  placeholder="Describe your issue..." 
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Details</label>
                <textarea 
                  value={newTicketContent} 
                  onChange={(e) => setNewTicketContent(e.target.value)} 
                  className="w-full h-40 p-6 bg-gray-50 rounded-2xl border outline-none focus:ring-2 focus:ring-accent-100 font-bold transition-all resize-none" 
                  placeholder="Provide more information so we can help you better..." 
                />
              </div>
              <button 
                type="submit"
                disabled={!newTicketSubject.trim() || !newTicketContent.trim()}
                className="w-full py-5 bg-accent-600 text-white rounded-2xl font-black shadow-xl shadow-accent-900/20 hover:bg-accent-700 transition-all active:scale-95 disabled:opacity-50"
              >
                Submit Ticket
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
