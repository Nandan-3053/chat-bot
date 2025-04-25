import { create } from 'zustand';
import axios from 'axios';
import { API_URL } from '../config';

export type Message = {
  _id: string;
  sender: {
    _id: string;
    username: string;
  };
  content: string;
  chatId: string;
  createdAt: string;
  read: boolean;
};

export type Chat = {
  _id: string;
  name: string;
  isGroupChat: boolean;
  users: {
    _id: string;
    username: string;
    email: string;
  }[];
  latestMessage?: Message;
  createdAt: string;
  unreadCount?: number;
};

type ChatState = {
  chats: Chat[];
  selectedChat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  
  fetchChats: () => Promise<void>;
  createChat: (userId: string) => Promise<void>;
  createGroupChat: (name: string, userIds: string[]) => Promise<void>;
  selectChat: (chatId: string) => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  addMessage: (message: Message) => void;
  markAsRead: (chatId: string) => Promise<void>;
};

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  selectedChat: null,
  messages: [],
  isLoading: false,
  error: null,
  
  fetchChats: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/chat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ chats: response.data, isLoading: false });
    } catch (error) {
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : 'Failed to fetch chats. Please try again.';
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  createChat: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/chat`, 
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Add to chats if it doesn't exist already
      const currentChats = get().chats;
      const chatExists = currentChats.some(chat => chat._id === response.data._id);
      
      if (!chatExists) {
        set({ 
          chats: [response.data, ...currentChats],
          selectedChat: response.data,
          isLoading: false 
        });
      } else {
        set({ 
          selectedChat: response.data,
          isLoading: false 
        });
      }
      
      // Fetch messages for this chat
      get().fetchMessages(response.data._id);
      
    } catch (error) {
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : 'Failed to create chat. Please try again.';
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  createGroupChat: async (name, userIds) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/chat/group`, 
        { name, users: userIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      set({ 
        chats: [response.data, ...get().chats],
        selectedChat: response.data,
        isLoading: false 
      });
      
    } catch (error) {
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : 'Failed to create group chat. Please try again.';
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  selectChat: async (chatId) => {
    const chat = get().chats.find(c => c._id === chatId);
    if (chat) {
      set({ selectedChat: chat });
      await get().fetchMessages(chatId);
      await get().markAsRead(chatId);
    }
  },
  
  fetchMessages: async (chatId) => {
    set({ isLoading: true, error: null, messages: [] });
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/message/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ messages: response.data, isLoading: false });
    } catch (error) {
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : 'Failed to fetch messages. Please try again.';
      set({ error: errorMessage, isLoading: false });
    }
  },
  
  sendMessage: async (content) => {
    const { selectedChat } = get();
    if (!selectedChat) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/message`, 
        { content, chatId: selectedChat._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      set({ messages: [...get().messages, response.data] });
      
      // Update latest message in chat list
      const updatedChats = get().chats.map(chat => 
        chat._id === selectedChat._id 
          ? { ...chat, latestMessage: response.data }
          : chat
      );
      
      set({ chats: updatedChats });
      
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  },
  
  addMessage: (message) => {
    const { messages, chats, selectedChat } = get();
    
    // Add message to the current chat if it belongs there
    if (selectedChat && message.chatId === selectedChat._id) {
      set({ messages: [...messages, message] });
    }
    
    // Update latest message and potentially unread count
    const updatedChats = chats.map(chat => {
      if (chat._id === message.chatId) {
        const unreadCount = 
          selectedChat && selectedChat._id === chat._id 
            ? 0 // If this is currently selected chat, no unread
            : (chat.unreadCount || 0) + 1;
        
        return { 
          ...chat, 
          latestMessage: message,
          unreadCount
        };
      }
      return chat;
    });
    
    // Move this chat to the top
    const chatToUpdate = updatedChats.find(c => c._id === message.chatId);
    if (chatToUpdate) {
      const otherChats = updatedChats.filter(c => c._id !== message.chatId);
      set({ chats: [chatToUpdate, ...otherChats] });
    }
  },
  
  markAsRead: async (chatId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/chat/${chatId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update unread count in UI
      const updatedChats = get().chats.map(chat => 
        chat._id === chatId 
          ? { ...chat, unreadCount: 0 }
          : chat
      );
      
      set({ chats: updatedChats });
      
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }
}));