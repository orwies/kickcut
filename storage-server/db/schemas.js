'use strict';
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
});

const highlightSchema = new mongoose.Schema({
  homeTeam: { type: String, required: true, trim: true },
  awayTeam: { type: String, required: true, trim: true },
  competition: { type: String, required: true, trim: true },
  matchStage: { type: String, default: '' },
  date: { type: Date, required: true },
  score: {
    home: { type: Number, required: true, min: 0 },
    away: { type: Number, required: true, min: 0 },
  },
  thumbnailPath: { type: String, default: '' },
  videoPath: { type: String, default: '' },
  likes: [{ type: String }],
  status: { type: String, enum: ['pending', 'approved'], default: 'pending' },
  uploadedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
highlightSchema.index({ competition: 1 });
highlightSchema.index({ date: -1 });
highlightSchema.index({ status: 1 });

const chatMessageSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  text: { type: String, required: true, maxlength: 1000 },
  channel: { type: String, default: 'general' },
  isBot: { type: Boolean, default: false },
  ownerId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

const channelSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // lowercase slug
  label: { type: String, required: true },
  icon: { type: String, default: '#' },
  desc: { type: String, default: '' },
  adminOnly: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Highlight = mongoose.model('Highlight', highlightSchema);
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
const Channel = mongoose.model('Channel', channelSchema);

module.exports = { User, Highlight, ChatMessage, Channel };
