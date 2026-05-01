'use strict';

// Database schemas for Users, Highlights, Chat Messages, and Channels.
// This is the source of truth for how data looks in MongoDB.

const mongoose = require('mongoose');

// ─── User ─────────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  passwordHash: { type: String, required: true }, // bcrypt hash — never store plain text
  role:         { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt:    { type: Date, default: Date.now },
});

// ─── Highlight ────────────────────────────────────────────────────────────────
const highlightSchema = new mongoose.Schema({
  homeTeam:      { type: String, required: true, trim: true },
  awayTeam:      { type: String, required: true, trim: true },
  competition:   { type: String, required: true, trim: true },
  matchStage:    { type: String, default: '' },  // e.g. "Matchweek 32", "Final"
  date:          { type: Date, required: true },
  score: {
    home: { type: Number, required: true, min: 0 },
    away: { type: Number, required: true, min: 0 },
  },
  thumbnailPath: { type: String, default: '' },  // relative URL like /uploads/thumbnails/…
  videoPath:     { type: String, default: '' },   // relative URL like /uploads/videos/…
  likes:         [{ type: String }],             // array of user IDs who liked this clip
  status:        { type: String, enum: ['pending', 'approved'], default: 'pending' },
  uploadedBy:    { type: String, required: true },
  createdAt:     { type: Date, default: Date.now },
});
// Indexes for the most common queries (filter by competition, sort by date, admin queue)
highlightSchema.index({ competition: 1 });
highlightSchema.index({ date: -1 });
highlightSchema.index({ status: 1 });

// ─── ChatMessage ──────────────────────────────────────────────────────────────
const chatMessageSchema = new mongoose.Schema({
  userId:    { type: String, required: true },
  username:  { type: String, required: true },
  text:      { type: String, required: true, maxlength: 1000 },
  channel:   { type: String, default: 'general' },
  isBot:     { type: Boolean, default: false },  // true for KickBot replies
  ownerId:   { type: String, default: null },    // for kickbot: who this conversation belongs to
  createdAt: { type: Date, default: Date.now },
});

// ─── Channel ──────────────────────────────────────────────────────────────────
const channelSchema = new mongoose.Schema({
  id:        { type: String, required: true, unique: true }, // lowercase slug, e.g. "vip-chat"
  label:     { type: String, required: true },               // display name shown in the sidebar
  icon:      { type: String, default: '#' },
  desc:      { type: String, default: '' },
  adminOnly: { type: Boolean, default: false },              // if true, only admins can write
  createdAt: { type: Date, default: Date.now },
});

const User        = mongoose.model('User',        userSchema);
const Highlight   = mongoose.model('Highlight',   highlightSchema);
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
const Channel     = mongoose.model('Channel',     channelSchema);

module.exports = { User, Highlight, ChatMessage, Channel };
