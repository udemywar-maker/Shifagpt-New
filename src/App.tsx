/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageCircle, 
  User, 
  Send, 
  Heart, 
  Coffee, 
  Gamepad2, 
  Menu, 
  X,
  ArrowLeft,
  Sparkles,
  Plus,
  Star,
  Settings,
  Trash2,
  AlertTriangle,
  Smile,
  Music,
  Book,
  Camera,
  Pizza,
  Sun,
  Moon,
  Cat,
  Dog
} from 'lucide-react';
import { FamilyMember, Message, getFamilyResponse, getFamilyResponseStream, INITIAL_MEMBERS } from './services/geminiService';
import { formatDistanceToNow, format } from 'date-fns';

const ICON_MAP = {
  Heart: <Heart className="w-5 h-5" />,
  Coffee: <Coffee className="w-5 h-5" />,
  Gamepad2: <Gamepad2 className="w-5 h-5" />,
  User: <User className="w-5 h-5" />,
  Star: <Star className="w-5 h-5" />,
  Smile: <Smile className="w-5 h-5" />,
  Music: <Music className="w-5 h-5" />,
  Book: <Book className="w-5 h-5" />,
  Camera: <Camera className="w-5 h-5" />,
  Pizza: <Pizza className="w-5 h-5" />,
  Sun: <Sun className="w-5 h-5" />,
  Moon: <Moon className="w-5 h-5" />,
  Cat: <Cat className="w-5 h-5" />,
  Dog: <Dog className="w-5 h-5" />,
};

const Typewriter = ({ text, active }: { text: string; active: boolean }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (!active) {
      setDisplayedText(text);
      return;
    }

    if (displayedText.length < text.length) {
      // Calculate speed: if we're far behind the actual text, speed up significantly
      const diff = text.length - displayedText.length;
      const delay = diff > 30 ? 2 : diff > 10 ? 10 : 25;
      
      const timeout = setTimeout(() => {
        // Take more characters at once if we're really far behind
        const increment = diff > 50 ? 5 : diff > 20 ? 2 : 1;
        setDisplayedText(text.slice(0, displayedText.length + increment));
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [displayedText, text, active]);

  return (
    <span className={active && displayedText.length < text.length ? "typewriter-cursor" : ""}>
      {displayedText}
    </span>
  );
};

export default function App() {
  const [members, setMembers] = useState<FamilyMember[]>(() => {
    try {
      const savedMembers = localStorage.getItem('family_members');
      if (savedMembers) return JSON.parse(savedMembers);
    } catch (e) {
      console.error("Failed to parse family_members from localStorage", e);
    }
    return INITIAL_MEMBERS;
  });
  const [activeMemberId, setActiveMemberId] = useState<string>('Ammu');
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
    try {
      const savedMessages = localStorage.getItem('chat_messages');
      if (savedMessages) return JSON.parse(savedMessages);
    } catch (e) {
      console.error("Failed to parse chat_messages from localStorage", e);
    }

    return {
      Ammu: [{ id: '1', role: 'model', content: 'Assalamu Alaikum beti! Have you eaten anything yet?', timestamp: Date.now() }],
      Abbu: [{ id: '1', role: 'model', content: 'Beti, how is your work going?', timestamp: Date.now() }],
      Bhai: [{ id: '1', role: 'model', content: 'Yo apu! Did you see the match last night?', timestamp: Date.now() }],
      Husband: [{ id: '1', role: 'model', content: 'Jaan, how was your day? I missed you.', timestamp: Date.now() }],
    };
  });

  // Persist members
  useEffect(() => {
    if (members.length > 0) {
      localStorage.setItem('family_members', JSON.stringify(members));
    }
  }, [members]);

  // Persist messages
  useEffect(() => {
    localStorage.setItem('chat_messages', JSON.stringify(messages));
  }, [messages]);

  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatViewMobile, setIsChatViewMobile] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  
  // New member form state
  const [newMember, setNewMember] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    iconType: 'Star' as keyof typeof ICON_MAP,
  });

  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const activeMember = members.find(m => m.id === activeMemberId) || members[0] || INITIAL_MEMBERS[0];

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeMemberId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
    };

    const currentHistory = [...(messages[activeMemberId] || []), userMessage];
    
    setMessages(prev => ({
      ...prev,
      [activeMemberId]: currentHistory
    }));
    setInputValue('');
    setIsTyping(true);

    try {
      const modelMessageId = (Date.now() + 1).toString();
      const modelMessage: Message = {
        id: modelMessageId,
        role: 'model',
        content: '',
        timestamp: Date.now(),
      };

      // Add empty model message first
      setMessages(prev => ({
        ...prev,
        [activeMemberId]: [...(prev[activeMemberId] || []), modelMessage]
      }));

      const stream = getFamilyResponseStream(activeMember, currentHistory);
      let fullText = '';
      
      for await (const chunk of stream) {
        fullText += chunk;
        setMessages(prev => ({
          ...prev,
          [activeMemberId]: (prev[activeMemberId] || []).map(msg => 
            msg.id === modelMessageId ? { ...msg, content: fullText } : msg
          )
        }));
      }
    } catch (error) {
      console.error("Failed to get response:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.systemPrompt) return;

    const id = newMember.name.replace(/\s+/g, '');
    const member: FamilyMember = {
      id,
      name: newMember.name,
      description: newMember.description || `A new family member named ${newMember.name}`,
      systemPrompt: newMember.systemPrompt,
      iconType: newMember.iconType,
      color: 'bg-amber-100 text-amber-700',
    };

    setMembers(prev => [...prev, member]);
    setMessages(prev => ({
      ...prev,
      [id]: [{ id: '1', role: 'model', content: `Hi! I'm ${newMember.name}. Let's chat!`, timestamp: Date.now() }]
    }));
    setIsModalOpen(false);
    setNewMember({ name: '', description: '', systemPrompt: '', iconType: 'Star' });
    setActiveMemberId(id);
  };

  const handleEditMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    setMembers(prev => prev.map(m => m.id === editingMember.id ? editingMember : m));
    setIsEditModalOpen(false);
    setEditingMember(null);
  };
  
  const handleClearChat = () => {
    const initialMessage = messages[activeMemberId]?.[0] || { 
      id: '1', 
      role: 'model', 
      content: `Chat cleared. Let's start over!`, 
      timestamp: Date.now() 
    };
    
    setMessages(prev => ({
      ...prev,
      [activeMemberId]: [initialMessage]
    }));
    setIsClearConfirmOpen(false);
  };

  const handleSelectMember = (id: string) => {
    setActiveMemberId(id);
    setIsChatViewMobile(true);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-cozy-brown/5 flex items-center justify-between">
        <div>
          <h1 className="serif text-3xl font-bold text-cozy-brown flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-cozy-tan" />
            {window.innerWidth < 1024 ? 'Chats' : 'Shifagpt'}
          </h1>
          <p className="text-xs uppercase tracking-widest text-cozy-brown/50 mt-1 font-semibold">
            {window.innerWidth < 1024 ? 'Recent Conversations' : 'Roleplay Chat'}
          </p>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="hidden lg:block p-2 hover:bg-cozy-tan/10 rounded-full text-cozy-brown"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {members.map((member) => (
          <button
            key={member.id}
            onClick={() => handleSelectMember(member.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group ${
              activeMemberId === member.id 
                ? 'bg-cozy-brown text-cozy-beige shadow-lg' 
                : 'hover:bg-cozy-tan/10 text-cozy-brown'
            }`}
          >
            <div className={`p-2 rounded-xl flex-shrink-0 ${activeMemberId === member.id ? 'bg-white/20' : member.color}`}>
              {ICON_MAP[member.iconType]}
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="font-semibold truncate">{member.name}</p>
              <p className={`text-xs truncate ${activeMemberId === member.id ? 'text-cozy-beige/70' : 'text-cozy-brown/50'}`}>
                {member.description}
              </p>
            </div>
          </button>
        ))}
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-cozy-brown/10 text-cozy-brown/50 hover:border-cozy-brown/30 hover:text-cozy-brown transition-all"
        >
          <div className="p-2 bg-cozy-tan/10 rounded-xl">
            <Plus className="w-5 h-5" />
          </div>
          <p className="font-semibold">Add Member</p>
        </button>
      </nav>

      <div className="p-6 border-t border-cozy-brown/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-cozy-brown flex items-center justify-center text-cozy-beige">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">You</p>
              <p className="text-xs text-cozy-brown/50">User</p>
            </div>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('family_members');
              localStorage.removeItem('chat_messages');
              window.location.reload();
            }}
            className="text-[10px] uppercase font-bold text-cozy-brown/30 hover:text-cozy-brown transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-cozy-beige relative">
      {/* Desktop Sidebar / Mobile List View */}
      <AnimatePresence>
        {(isSidebarOpen || !isChatViewMobile) && (
          <motion.div 
            initial={window.innerWidth < 1024 ? { opacity: 0 } : { width: 0, opacity: 0 }}
            animate={window.innerWidth < 1024 ? { opacity: 1 } : { width: 288, opacity: 1 }}
            exit={window.innerWidth < 1024 ? { opacity: 0 } : { width: 0, opacity: 0 }}
            className={`
              ${isChatViewMobile ? 'hidden lg:flex' : 'flex'} 
              w-full lg:w-72 bg-cozy-cream border-r border-cozy-brown/10 flex-col z-10 overflow-hidden
            `}
          >
            <div className="w-72 flex flex-col h-full">
              <SidebarContent />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <main className={`
        ${isChatViewMobile ? 'flex' : 'hidden lg:flex'} 
        flex-1 flex flex-col relative min-w-0
      `}>
        <header className="h-16 sm:h-20 bg-cozy-cream/80 backdrop-blur-md border-b border-cozy-brown/10 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            {/* Back Button for Mobile */}
            <button 
              onClick={() => setIsChatViewMobile(false)} 
              className="lg:hidden p-2 hover:bg-cozy-tan/10 rounded-lg text-cozy-brown"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            {/* Sidebar Toggle for Desktop */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="hidden lg:block p-2 hover:bg-cozy-tan/10 rounded-lg text-cozy-brown"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
              <div className={`p-1.5 sm:p-2 rounded-xl flex-shrink-0 ${activeMember.color}`}>
                {ICON_MAP[activeMember.iconType]}
              </div>
              <div className="min-w-0">
                <h2 className="serif text-base sm:text-xl font-bold truncate leading-tight">{activeMember.name}</h2>
                <p className="text-[9px] sm:text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              onClick={() => setIsClearConfirmOpen(true)}
              className="p-2 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors"
              title="Clear Chat"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button 
              onClick={() => {
                setEditingMember(activeMember);
                setIsEditModalOpen(true);
              }}
              className="p-2 hover:bg-cozy-tan/10 rounded-lg text-cozy-brown flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span className="hidden md:inline">Customize</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
            {(messages[activeMemberId] || []).map((msg, index) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[92%] sm:max-w-[80%]">
                  <div className={`p-3 sm:p-4 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-cozy-brown text-cozy-beige rounded-tr-sm' : 'bg-white text-cozy-brown rounded-tl-sm border border-cozy-brown/5'}`}>
                    <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                      {msg.role === 'model' && index === (messages[activeMemberId] || []).length - 1 ? (
                        <Typewriter text={msg.content} active={isTyping} />
                      ) : (
                        msg.content
                      )}
                    </div>
                    <span 
                      title={format(msg.timestamp, 'PPPP p')}
                      className={`text-[9px] sm:text-[10px] mt-1.5 block opacity-40 cursor-help ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
                    >
                      {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
            {isTyping && (!messages[activeMemberId] || messages[activeMemberId][messages[activeMemberId].length - 1].content === '') && (
              <div className="flex justify-start">
                <div className="bg-white p-3 sm:p-4 rounded-2xl rounded-tl-none border border-cozy-brown/5 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-cozy-brown/20 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-cozy-brown/20 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-cozy-brown/20 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-cozy-beige">
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative group">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Message ${activeMember.name}...`}
              className="w-full bg-white border border-cozy-brown/10 rounded-2xl px-4 sm:px-6 py-3 sm:py-4 pr-14 sm:pr-16 focus:outline-none focus:ring-2 focus:ring-cozy-brown/20 transition-all shadow-sm text-sm sm:text-base"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 p-2 bg-cozy-brown text-cozy-beige rounded-xl disabled:opacity-50 shadow-lg"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </main>

      {/* Add Member Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-cozy-cream w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-cozy-brown/5 flex justify-between items-center">
                <h3 className="serif text-2xl font-bold">New Shifagpt Member</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-cozy-tan/10 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddMember} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-cozy-brown/50 mb-1 block">Name</label>
                  <input
                    type="text"
                    required
                    value={newMember.name}
                    onChange={e => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white border border-cozy-brown/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cozy-brown/20"
                    placeholder="e.g. Dadi, Chacha"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-cozy-brown/50 mb-1 block">Description</label>
                  <input
                    type="text"
                    value={newMember.description}
                    onChange={e => setNewMember(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-white border border-cozy-brown/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cozy-brown/20"
                    placeholder="e.g. Wise and storytelling"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-cozy-brown/50 mb-1 block">Personality (System Prompt)</label>
                  <textarea
                    required
                    rows={3}
                    value={newMember.systemPrompt}
                    onChange={e => setNewMember(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    className="w-full bg-white border border-cozy-brown/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cozy-brown/20"
                    placeholder="How should they act? (e.g. You are Dadi, very old and kind...)"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-cozy-brown/50 mb-1 block">Icon</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                    {(Object.keys(ICON_MAP) as Array<keyof typeof ICON_MAP>).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewMember(prev => ({ ...prev, iconType: type }))}
                        className={`p-3 rounded-xl border-2 transition-all ${newMember.iconType === type ? 'border-cozy-brown bg-cozy-brown/5' : 'border-transparent bg-white shadow-sm'}`}
                        title={type}
                      >
                        {ICON_MAP[type]}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-cozy-brown text-cozy-beige py-4 rounded-2xl font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Create Member
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Member Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-cozy-cream w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-cozy-brown/5 flex justify-between items-center">
                <h3 className="serif text-2xl font-bold">Customize {editingMember.name}</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-cozy-tan/10 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleEditMember} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-cozy-brown/50 mb-1 block">Name</label>
                  <input
                    type="text"
                    required
                    value={editingMember.name}
                    onChange={e => setEditingMember(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                    className="w-full bg-white border border-cozy-brown/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cozy-brown/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-cozy-brown/50 mb-1 block">Description</label>
                  <input
                    type="text"
                    value={editingMember.description}
                    onChange={e => setEditingMember(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                    className="w-full bg-white border border-cozy-brown/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cozy-brown/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-cozy-brown/50 mb-1 block">Personality (System Prompt)</label>
                  <textarea
                    required
                    rows={5}
                    value={editingMember.systemPrompt}
                    onChange={e => setEditingMember(prev => prev ? ({ ...prev, systemPrompt: e.target.value }) : null)}
                    className="w-full bg-white border border-cozy-brown/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cozy-brown/20 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-cozy-brown/50 mb-1 block">Icon</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                    {(Object.keys(ICON_MAP) as Array<keyof typeof ICON_MAP>).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEditingMember(prev => prev ? ({ ...prev, iconType: type }) : null)}
                        className={`p-3 rounded-xl border-2 transition-all ${editingMember.iconType === type ? 'border-cozy-brown bg-cozy-brown/5' : 'border-transparent bg-white shadow-sm'}`}
                        title={type}
                      >
                        {ICON_MAP[type]}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-cozy-brown text-cozy-beige py-4 rounded-2xl font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Save Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear Chat Confirmation Modal */}
      <AnimatePresence>
        {isClearConfirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-8 text-center"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="serif text-2xl font-bold text-cozy-brown mb-2">Clear Chat?</h3>
              <p className="text-cozy-brown/60 mb-8">
                Are you sure you want to clear your conversation with <span className="font-bold">{activeMember.name}</span>? This action cannot be undone.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setIsClearConfirmOpen(false)}
                  className="py-3 px-6 rounded-xl font-bold text-cozy-brown bg-cozy-tan/10 hover:bg-cozy-tan/20 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearChat}
                  className="py-3 px-6 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all"
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
