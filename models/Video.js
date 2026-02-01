const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
  client: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true,
    index: true
  },
  project: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  embedId: {
    type: String,
    required: [true, 'Mux embed ID is required'],
    trim: true,
    unique: true
  },
  category: {
    type: String,
    trim: true,
    index: true
  },
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  thumbnail: {
    type: String,
    trim: true
  },
  duration: {
    type: Number // Duration in seconds
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for searching
VideoSchema.index({ client: 'text', project: 'text', tags: 'text', title: 'text' });

// Virtual for Mux playback URL
VideoSchema.virtual('playbackUrl').get(function() {
  return `https://stream.mux.com/${this.embedId}.m3u8`;
});

// Virtual for Mux thumbnail URL
VideoSchema.virtual('thumbnailUrl').get(function() {
  if (this.thumbnail) return this.thumbnail;
  return `https://image.mux.com/${this.embedId}/thumbnail.jpg`;
});

// Virtual for Mux poster URL
VideoSchema.virtual('posterUrl').get(function() {
  return `https://image.mux.com/${this.embedId}/thumbnail.jpg?time=0`;
});

// Ensure virtuals are included in JSON output
VideoSchema.set('toJSON', { virtuals: true });
VideoSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Video', VideoSchema);
