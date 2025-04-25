import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import ChatList from '../components/chat/ChatList';
import ChatMessages from '../components/chat/ChatMessages';
import MessageInput from '../components/chat/MessageInput';
import { LogOut, Users, Plus, Menu, X } from 'lucide-react';
import Button from '../components/ui/Button';

const Chat: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { selectedChat, addMessage } = useChatStore();
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // On larger screens, always show sidebar
      if (!mobile) {
        setShowSidebar(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    if (!user) return;
    
    const token = localStorage.getItem('token');
    const socket = io(SOCKET_URL, {
      auth: { token }
    });
    
    socket.on('connect', () => {
      console.log('Connected to socket server');
    });
    
    socket.on('message:received', (message) => {
      console.log('Received message:', message);
      addMessage(message);
    });
    
    socket.on('user:online', (userId) => {
      console.log(`User ${userId} is online`);
      // Update online status in your UI
    });
    
    socket.on('user:offline', (userId) => {
      console.log(`User ${userId} is offline`);
      // Update offline status in your UI
    });
    
    return () => {
      socket.disconnect();
    };
  }, [user, addMessage]);
  
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };
  
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isMobile && (
              <button 
                onClick={toggleSidebar}
                className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {showSidebar ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
            <h1 className="text-xl font-bold text-primary-600">ChatApp</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Open new chat modal (to be implemented)
                alert('Create new chat functionality to be implemented');
              }}
            >
              <Plus size={18} className="mr-1" /> New Chat
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
            >
              <LogOut size={18} className="mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar / Chat list */}
        <aside 
          className={`
            ${isMobile ? 'absolute inset-y-0 left-0 z-30' : 'relative'}
            ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
            w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 
            transition-transform duration-300 ease-in-out
          `}
        >
          <ChatList />
        </aside>
        
        {/* Overlay for mobile */}
        {isMobile && showSidebar && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20"
            onClick={toggleSidebar}
          ></div>
        )}
        
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          {selectedChat && (
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 flex items-center">
              <div className="mr-3 flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300">
                {selectedChat.isGroupChat ? (
                  <Users size={20} />
                ) : (
                  <div className="font-medium text-lg">
                    {selectedChat.users.find(u => u._id !== user?._id)?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
              
              <div>
                <h2 className="font-medium">
                  {selectedChat.isGroupChat
                    ? selectedChat.name
                    : selectedChat.users.find(u => u._id !== user?._id)?.username || 'Chat'}
                </h2>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedChat.isGroupChat 
                    ? `${selectedChat.users.length} members` 
                    : 'Online'}
                </div>
              </div>
            </div>
          )}
          
          {/* Messages area */}
          <div className="flex-1 overflow-hidden">
            <ChatMessages />
          </div>
          
          {/* Message input */}
          <MessageInput />
        </div>
      </main>
    </div>
  );
};

export default Chat;