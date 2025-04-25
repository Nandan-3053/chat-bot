import React, { useState } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

const MessageInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const { sendMessage, selectedChat } = useChatStore();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedChat) return;
    
    sendMessage(message.trim());
    setMessage('');
  };
  
  if (!selectedChat) return null;
  
  return (
    <form 
      onSubmit={handleSubmit} 
      className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
    >
      <div className="flex items-center gap-2">
        <button 
          type="button"
          className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <Paperclip size={20} />
        </button>
        
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 py-2 px-3 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
        />
        
        <button
          type="submit"
          disabled={!message.trim()}
          className={`p-2 rounded-full bg-primary-600 text-white ${!message.trim() ? 'opacity-50' : 'hover:bg-primary-700'}`}
        >
          <Send size={20} />
        </button>
      </div>
    </form>
  );
};

export default MessageInput;