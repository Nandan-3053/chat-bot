import express from 'express';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Chat from '../models/Chat.js';

const router = express.Router();

// @route   GET /api/message/:chatId
// @desc    Get all messages for a chat
// @access  Private
router.get('/:chatId', async (req, res) => {
  const { chatId } = req.params;
  
  try {
    // Verify the user is part of this chat
    const chat = await Chat.findOne({
      _id: chatId,
      users: { $elemMatch: { $eq: req.user.id } }
    });
    
    if (!chat) {
      return res.status(403).json({ message: 'Not authorized to access this chat' });
    }
    
    // Get messages
    const messages = await Message.find({ chatId })
      .populate('sender', 'username email')
      .sort({ createdAt: 1 });
    
    // Mark messages as read
    await Message.updateMany(
      {
        chatId,
        readBy: { $ne: req.user.id },
        sender: { $ne: req.user.id }
      },
      { $push: { readBy: req.user.id } }
    );
    
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/message
// @desc    Create a new message
// @access  Private
router.post('/', async (req, res) => {
  const { content, chatId } = req.body;
  
  if (!content || !chatId) {
    return res.status(400).json({ message: 'Content and chatId are required' });
  }
  
  try {
    // Verify the user is part of this chat
    const chat = await Chat.findOne({
      _id: chatId,
      users: { $elemMatch: { $eq: req.user.id } }
    });
    
    if (!chat) {
      return res.status(403).json({ message: 'Not authorized to message in this chat' });
    }
    
    // Create new message
    let newMessage = await Message.create({
      sender: req.user.id,
      content,
      chatId,
      readBy: [req.user.id] // Sender has already seen the message
    });
    
    // Populate sender info
    newMessage = await newMessage.populate('sender', 'username email');
    
    // Update chat's latestMessage
    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: newMessage._id
    });
    
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;