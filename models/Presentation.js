const mongoose = require('mongoose');
const crypto = require('crypto');

const PresentationSchema = new mongoose.Schema({
  // Unique URL slug for the presentation
  slug: {
    type: String,
    unique: true,
    index: true
  },
  client: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  clientLogo: {
    type: String,
    trim: true // URL to client logo
  },
  date: {
    type: Date,
    default: Date.now
  },
  message: {
    type: String,
    trim: true // Long message/description for the client
  },
  videos: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video'
  }],
  layout: {
    type: String,
    enum: ['grid', 'reel'],
    default: 'grid'
  },
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'dark'
  },
  // Custom branding options
  primaryColor: {
    type: String,
    default: '#ef4444' // Tailwind red-500
  },
  backgroundColor: {
    type: String,
    default: '#111827' // Tailwind gray-900
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Track views
  viewCount: {
    type: Number,
    default: 0
  },
  lastViewed: {
    type: Date
  },
  // Optional password protection
  password: {
    type: String,
    select: false // Don't include in queries by default
  },
  expiresAt: {
    type: Date // Optional expiration date
  }
}, {
  timestamps: true
});

// Generate unique slug before saving
PresentationSchema.pre('save', function(next) {
  if (!this.slug) {
    // Generate a URL-friendly slug: client-name-random
    const clientSlug = this.client
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const randomPart = crypto.randomBytes(4).toString('hex');
    this.slug = `${clientSlug}-${randomPart}`;
  }
  next();
});

// Method to check if presentation is expired
PresentationSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Method to increment view count
PresentationSchema.methods.recordView = async function() {
  this.viewCount += 1;
  this.lastViewed = new Date();
  await this.save();
};

// Static method to find by slug with videos populated
PresentationSchema.statics.findBySlugWithVideos = function(slug) {
  return this.findOne({ slug, isActive: true })
    .populate({
      path: 'videos',
      match: { isActive: true }
    });
};

module.exports = mongoose.model('Presentation', PresentationSchema);
