import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore, Message } from '../../store/chatStore';
import Loader from '../ui/Loader';

const MessageBubble: React.FC<{ message: Message; isCurrentUser: boolean }> = ({ 
  message, 
  isCurrentUser 
}) => {
  const time = new Date(message.createdAt).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return (
    <div className={`flex mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`
          max-w-[75%] rounded-lg px-4 py-2 
          ${isCurrentUser 
            ? 'bg-primary-600 text-white rounded-br-none' 
            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none'
          }
        `}
      >
        {!isCurrentUser && (
          <div className="text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
            {message.sender.username}
          </div>
        )}
        <div>{message.content}</div>
        <div 
          className={`
            text-xs mt-1 text-right 
            ${isCurrentUser ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'}
          `}
        >
          {time} {isCurrentUser && message.read && '✓✓'}
        </div>
      </div>
    </div>
  );
};

const DateDivider: React.FC<{ date: string }> = ({ date }) => (
  <div className="flex items-center my-3">
    <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
    <div className="mx-4 text-xs text-gray-500 dark:text-gray-400">{date}</div>
    <div className="flex-grow border-t border-gray-300 dark:border-gray-700"></div>
  </div>
);

const ChatMessages: React.FC = () => {
  const { messages, isLoading, selectedChat } = useChatStore();
  const { user } = useAuthStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  if (!selectedChat) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <p className="mb-2">Select a chat to start messaging</p>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader />
      </div>
    );
  }
  
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const date = new Date(message.createdAt).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      messages,
    }));
  };
  
  const messageGroups = groupMessagesByDate(messages);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };
  
  return (
    <div className="p-4 overflow-y-auto h-full">
      {messageGroups.map((group, i) => (
        <div key={i}>
          <DateDivider date={formatDate(group.date)} />
          {group.messages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              isCurrentUser={message.sender._id === user?._id}
            />
          ))}
        </div>
      ))}
      
      {messages.length === 0 && (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 dark:text-gray-400">No messages yet. Start the conversation!</p>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;