import React, { useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { MessageSquare, Users } from 'lucide-react';
import Loader from '../ui/Loader';

const ChatList: React.FC = () => {
  const { chats, fetchChats, selectChat, selectedChat, isLoading } = useChatStore();
  const { user } = useAuthStore();
  
  useEffect(() => {
    fetchChats();
  }, [fetchChats]);
  
  if (isLoading && chats.length === 0) {
    return <div className="p-4"><Loader /></div>;
  }
  
  const getChatName = (chat: any) => {
    if (chat.isGroupChat) return chat.name;
    return chat.users.find((u: any) => u._id !== user?._id)?.username || 'Chat';
  };
  
  const getLastMessagePreview = (chat: any) => {
    if (!chat.latestMessage) return 'No messages yet';
    const message = chat.latestMessage.content;
    return message.length > 30 ? message.substring(0, 27) + '...' : message;
  };
  
  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today: show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      // Yesterday
      return 'Yesterday';
    } else if (diffDays < 7) {
      // Last week: show day name
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      // Older: show date
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };
  
  return (
    <div className="overflow-y-auto h-full">
      <h2 className="font-semibold text-lg px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        Chats
      </h2>
      
      {chats.length === 0 ? (
        <div className="p-4 text-center text-gray-500">
          No chats yet. Start a new conversation!
        </div>
      ) : (
        <ul>
          {chats.map((chat) => (
            <li 
              key={chat._id}
              className={`
                px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 
                cursor-pointer transition-colors duration-150 relative
                ${selectedChat?._id === chat._id ? 'bg-gray-100 dark:bg-gray-800' : ''}
              `}
              onClick={() => selectChat(chat._id)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-700 dark:text-primary-300">
                  {chat.isGroupChat ? (
                    <Users size={20} />
                  ) : (
                    <MessageSquare size={20} />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-sm font-medium truncate">{getChatName(chat)}</h3>
                    {chat.latestMessage && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(chat.latestMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {getLastMessagePreview(chat)}
                  </p>
                </div>
              </div>
              
              {chat.unreadCount && chat.unreadCount > 0 && (
                <span className="absolute top-3 right-3 bg-primary-600 text-white text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                  {chat.unreadCount}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChatList;