import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import messageRoutes from './routes/message.js';
import { verifyToken } from './middleware/auth.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173', // Update with your frontend URL
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', verifyToken, chatRoutes);
app.use('/api/message', verifyToken, messageRoutes);

// Socket.io middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    // You can use your JWT verification logic from auth middleware
    // For simplicity, we'll just accept the token for now
    socket.userId = 'user_id_from_token'; // Replace with actual user ID extraction
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);
  
  // Join user to their personal room for direct messages
  socket.join(socket.userId);
  
  // Notify others that user is online
  socket.broadcast.emit('user:online', socket.userId);
  
  // Handle chat messages
  socket.on('message:send', async (messageData) => {
    try {
      // Save message to database (handled by your API)
      // Then broadcast to recipients
      
      // For group chats, emit to the chat room
      if (messageData.isGroupChat) {
        io.to(messageData.chatId).emit('message:received', messageData);
      } else {
        // For direct messages, emit to the specific recipient
        const recipientId = messageData.recipients[0];
        io.to(recipientId).emit('message:received', messageData);
      }
    } catch (error) {
      console.error('Message handling error:', error);
    }
  });
  
  // Join a chat room (for group chats)
  socket.on('chat:join', (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.userId} joined chat ${chatId}`);
  });
  
  // Leave a chat room
  socket.on('chat:leave', (chatId) => {
    socket.leave(chatId);
    console.log(`User ${socket.userId} left chat ${chatId}`);
  });
  
  // Handle typing indicators
  socket.on('typing:start', (chatId) => {
    socket.to(chatId).emit('typing:start', {
      chatId,
      userId: socket.userId
    });
  });
  
  socket.on('typing:stop', (chatId) => {
    socket.to(chatId).emit('typing:stop', {
      chatId,
      userId: socket.userId
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
    io.emit('user:offline', socket.userId);
  });
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});