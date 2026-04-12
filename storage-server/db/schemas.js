'use strict';

const mongoose = require('mongoose');

// ─── User Schema ─────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
});

// ─── Highlight Schema ─────────────────────────────────────────────────────────
const highlightSchema = new mongoose.Schema({
  homeTeam: { type: String, required: true, trim: true },
  awayTeam: { type: String, required: true, trim: true },
  competition: { type: String, required: true, trim: true },
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

// Indexes for filtering performance
highlightSchema.index({ competition: 1 });
highlightSchema.index({ date: -1 });
highlightSchema.index({ status: 1 });

// ─── Chat Message Schema ──────────────────────────────────────────────────────
const chatMessageSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  text: { type: String, required: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Highlight = mongoose.model('Highlight', highlightSchema);
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = { User, Highlight, ChatMessage };
