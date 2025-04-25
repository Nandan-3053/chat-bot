import express from 'express';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import Message from '../models/Message.js';

const router = express.Router();

// @route   GET /api/chat
// @desc    Get all chats for a user
// @access  Private
router.get('/', async (req, res) => {
  try {
    // Find all chats that the user is part of
    const chats = await Chat.find({
      users: { $elemMatch: { $eq: req.user.id } }
    })
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });
    
    // Populate sender info in latestMessage
    const populatedChats = await User.populate(chats, {
      path: 'latestMessage.sender',
      select: 'username email'
    });
    
    // Get unread message counts for each chat
    const chatsWithUnreadCount = await Promise.all(
      populatedChats.map(async (chat) => {
        const unreadCount = await Message.countDocuments({
          chatId: chat._id,
          readBy: { $ne: req.user.id },
          sender: { $ne: req.user.id }
        });
        
        return {
          ...chat.toObject(),
          unreadCount
        };
      })
    );
    
    res.json(chatsWithUnreadCount);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/chat
// @desc    Create or access a one-on-one chat
// @access  Private
router.post('/', async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ message: 'UserId is required' });
  }
  
  try {
    // Check if chat already exists
    const existingChat = await Chat.findOne({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user.id } } },
        { users: { $elemMatch: { $eq: userId } } }
      ]
    })
      .populate('users', '-password')
      .populate('latestMessage');
    
    if (existingChat) {
      return res.json(existingChat);
    }
    
    // Create new chat
    const chatData = {
      name: 'sender',
      isGroupChat: false,
      users: [req.user.id, userId]
    };
    
    const newChat = await Chat.create(chatData);
    
    // Get full chat with user details
    const fullChat = await Chat.findById(newChat._id)
      .populate('users', '-password');
    
    res.status(201).json(fullChat);
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/chat/group
// @desc    Create a group chat
// @access  Private
router.post('/group', async (req, res) => {
  const { name, users } = req.body;
  
  if (!name || !users || users.length < 2) {
    return res.status(400).json({ 
      message: 'Please provide a name and at least 2 users for the group chat' 
    });
  }
  
  // Add current user to the group
  users.push(req.user.id);
  
  try {
    const groupChat = await Chat.create({
      name,
      isGroupChat: true,
      users,
      groupAdmin: req.user.id
    });
    
    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate('users', '-password')
      .populate('groupAdmin', '-password');
    
    res.status(201).json(fullGroupChat);
  } catch (error) {
    console.error('Create group chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/chat/group/rename
// @desc    Rename a group chat
// @access  Private
router.put('/group/rename', async (req, res) => {
  const { chatId, name } = req.body;
  
  if (!chatId || !name) {
    return res.status(400).json({ message: 'Chat ID and name are required' });
  }
  
  try {
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { name },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');
    
    if (!updatedChat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    res.json(updatedChat);
  } catch (error) {
    console.error('Rename group chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/chat/group/add
// @desc    Add user to a group
// @access  Private
router.put('/group/add', async (req, res) => {
  const { chatId, userId } = req.body;
  
  if (!chatId || !userId) {
    return res.status(400).json({ message: 'Chat ID and user ID are required' });
  }
  
  try {
    // Check if the user making the request is the admin
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    if (chat.groupAdmin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admins can add users' });
    }
    
    // Add user to the group
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $push: { users: userId } },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');
    
    res.json(updatedChat);
  } catch (error) {
    console.error('Add to group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/chat/group/remove
// @desc    Remove user from a group
// @access  Private
router.put('/group/remove', async (req, res) => {
  const { chatId, userId } = req.body;
  
  if (!chatId || !userId) {
    return res.status(400).json({ message: 'Chat ID and user ID are required' });
  }
  
  try {
    // Check if the user making the request is the admin
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    if (chat.groupAdmin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only admins can remove users' });
    }
    
    // Remove user from the group
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { users: userId } },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');
    
    res.json(updatedChat);
  } catch (error) {
    console.error('Remove from group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/chat/:chatId/read
// @desc    Mark all messages in a chat as read
// @access  Private
router.put('/:chatId/read', async (req, res) => {
  const { chatId } = req.params;
  
  try {
    // Find all unread messages in this chat sent by others
    await Message.updateMany(
      {
        chatId,
        readBy: { $ne: req.user.id },
        sender: { $ne: req.user.id }
      },
      { $push: { readBy: req.user.id } }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;