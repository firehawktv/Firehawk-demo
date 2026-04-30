const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const Video = require('../models/Video');
const Presentation = require('../models/Presentation');
const muxService = require('../services/muxService');

// ==================== AUTH ====================

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  res.redirect('/admin/login');
}

// Protect all routes except /login
router.use((req, res, next) => {
  if (req.path === '/login') return next();
  requireAuth(req, res, next);
});

// GET /admin/login
router.get('/login', (req, res) => {
  if (req.session && req.session.authenticated) return res.redirect('/admin');
  res.render('admin/login', { title: 'Login', error: req.query.error });
});

// POST /admin/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const validUser = username === process.env.ADMIN_USERNAME;
  const validPass = process.env.ADMIN_PASSWORD_HASH
    ? await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH)
    : false;

  if (validUser && validPass) {
    req.session.authenticated = true;
    return res.redirect('/admin');
  }
  res.redirect('/admin/login?error=Invalid+username+or+password');
});

// POST /admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: './public/uploads/logos',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Admin dashboard
router.get('/', async (req, res) => {
  try {
    const videoCount = await Video.countDocuments();
    const presentationCount = await Presentation.countDocuments();
    const recentVideos = await Video.find().sort({ createdAt: -1 }).limit(5);
    const recentPresentations = await Presentation.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('videos', 'title');

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      videoCount,
      presentationCount,
      recentVideos,
      recentPresentations
    });
  } catch (error) {
    res.render('error', { title: 'Error', message: error.message });
  }
});

// ==================== VIDEOS ====================

// List all videos
router.get('/videos', async (req, res) => {
  try {
    const { client, tag, search, page = 1 } = req.query;
    const limit = 20;
    const skip = (page - 1) * limit;

    let query = {};
    if (client) query.client = new RegExp(client, 'i');
    if (tag) query.tags = tag;
    if (search) query.$text = { $search: search };

    const videos = await Video.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Video.countDocuments(query);
    const clients = await Video.distinct('client');
    const tags = await Video.distinct('tags');
    const categories = await Video.distinct('category');

    res.render('admin/videos/index', {
      title: 'Manage Videos',
      videos,
      clients,
      tags,
      categories,
      filters: { client, tag, search },
      pagination: {
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.render('error', { title: 'Error', message: error.message });
  }
});

// New video form
router.get('/videos/new', async (req, res) => {
  const clients = await Video.distinct('client');
  const tags = await Video.distinct('tags');
  const categories = await Video.distinct('category');
  const agencies = await Video.distinct('agency');
  res.render('admin/videos/form', {
    title: 'Add Video',
    video: null,
    clients,
    tags,
    categories,
    agencies,
    action: '/admin/videos',
    method: 'POST'
  });
});

// Create video
router.post('/videos', async (req, res) => {
  try {
    const { client, project, date, tags, embedId, title, description, category, agency } = req.body;

    let parsedTags = tags;
    if (typeof tags === 'string') {
      parsedTags = tags.split(',').map(t => t.trim()).filter(t => t);
    }

    await Video.create({
      client,
      project,
      date: date || new Date(),
      tags: parsedTags,
      embedId,
      title,
      description,
      category: category || null,
      agency: agency || null
    });

    res.redirect('/admin/videos?success=Video created successfully');
  } catch (error) {
    const clients = await Video.distinct('client');
    const tags = await Video.distinct('tags');
    const categories = await Video.distinct('category');
    const agencies = await Video.distinct('agency');
    const { client, project, date, tags: rawTags, embedId, title, description, category, agency } = req.body;
    let parsedTags = rawTags;
    if (typeof rawTags === 'string') {
      parsedTags = rawTags.split(',').map(t => t.trim()).filter(t => t);
    }
    const friendlyError = error.code === 11000
      ? 'A video with that Mux Playback ID already exists.'
      : error.message;
    res.render('admin/videos/form', {
      title: 'Add Video',
      video: { client, project, date, tags: parsedTags, embedId, title, description, category, agency },
      clients, tags, categories, agencies,
      action: '/admin/videos',
      method: 'POST',
      error: friendlyError
    });
  }
});

// Sync videos from Mux (must be before :id routes)
router.post('/videos/sync-mux', async (req, res) => {
  console.log('[Mux Sync] Starting sync...');
  try {
    // Check if Mux is configured
    if (!muxService.isConfigured()) {
      console.log('[Mux Sync] Error: Mux credentials not configured');
      return res.redirect('/admin/videos?error=' + encodeURIComponent('Mux API credentials not configured. Add MUX_TOKEN_ID and MUX_TOKEN_SECRET to your environment.'));
    }

    console.log('[Mux Sync] Credentials found, fetching assets from Mux...');
    // Perform sync
    const results = await muxService.syncWithDatabase(Video);
    console.log('[Mux Sync] Results:', results);

    // Build success message
    let message = `Mux sync complete: ${results.new} new videos added`;
    if (results.existing > 0) {
      message += `, ${results.existing} already existed`;
    }
    if (results.skipped > 0) {
      message += `, ${results.skipped} skipped (not ready)`;
    }
    if (results.errors.length > 0) {
      console.log('[Mux Sync] Errors:', results.errors);
      message += `, ${results.errors.length} errors`;
    }

    console.log('[Mux Sync] Success:', message);
    res.redirect('/admin/videos?success=' + encodeURIComponent(message));
  } catch (error) {
    console.error('[Mux Sync] Failed:', error);
    res.redirect('/admin/videos?error=' + encodeURIComponent('Mux sync failed: ' + error.message));
  }
});

// Edit video form
router.get('/videos/:id/edit', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.redirect('/admin/videos?error=Video not found');
    }

    const clients = await Video.distinct('client');
    const tags = await Video.distinct('tags');
    const categories = await Video.distinct('category');
    const agencies = await Video.distinct('agency');

    res.render('admin/videos/form', {
      title: 'Edit Video',
      video,
      clients,
      tags,
      categories,
      agencies,
      action: `/admin/videos/${video._id}?_method=PUT`,
      method: 'POST'
    });
  } catch (error) {
    res.redirect(`/admin/videos?error=${encodeURIComponent(error.message)}`);
  }
});

// Update video
router.post('/videos/:id', async (req, res) => {
  try {
    const { client, project, date, tags, embedId, title, description, isActive, category, agency } = req.body;

    let parsedTags = tags;
    if (typeof tags === 'string') {
      parsedTags = tags.split(',').map(t => t.trim()).filter(t => t);
    }

    await Video.findByIdAndUpdate(req.params.id, {
      client,
      project,
      date,
      tags: parsedTags,
      embedId,
      title,
      description,
      isActive: isActive === 'on' || isActive === 'true',
      category: category || null,
      agency: agency || null
    });

    res.redirect('/admin/videos?success=Video updated successfully');
  } catch (error) {
    const friendlyError = error.code === 11000
      ? 'A video with that Mux Playback ID already exists.'
      : error.message;
    res.redirect(`/admin/videos/${req.params.id}/edit?error=${encodeURIComponent(friendlyError)}`);
  }
});

// Delete video
router.post('/videos/:id/delete', async (req, res) => {
  try {
    await Video.findByIdAndDelete(req.params.id);
    res.redirect('/admin/videos?success=Video deleted successfully');
  } catch (error) {
    res.redirect(`/admin/videos?error=${encodeURIComponent(error.message)}`);
  }
});

// ==================== PRESENTATIONS ====================

// List all presentations
router.get('/presentations', async (req, res) => {
  try {
    const { client, page = 1 } = req.query;
    const limit = 20;
    const skip = (page - 1) * limit;

    let query = {};
    if (client) query.client = new RegExp(client, 'i');

    const presentations = await Presentation.find(query)
      .populate('videos', 'title embedId')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Presentation.countDocuments(query);

    res.render('admin/presentations/index', {
      title: 'Manage Presentations',
      presentations,
      filters: { client },
      pagination: {
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.render('error', { title: 'Error', message: error.message });
  }
});

// New presentation form
router.get('/presentations/new', async (req, res) => {
  const videos = await Video.find({ isActive: true }).sort({ client: 1, createdAt: -1 });
  const categories = await Video.distinct('category');
  const tags = await Video.distinct('tags');
  res.render('admin/presentations/form', {
    title: 'Create Presentation',
    presentation: null,
    videos,
    categories: categories.filter(c => c),
    tags: tags.filter(t => t),
    action: '/admin/presentations',
    method: 'POST'
  });
});

// Create presentation
router.post('/presentations', upload.single('clientLogoFile'), async (req, res) => {
  try {
    const {
      client,
      clientLogo,
      message,
      videos,
      layout,
      theme,
      primaryColor,
      backgroundColor,
      expiresAt
    } = req.body;

    // Handle videos array from form
    let videoIds = videos;
    if (!Array.isArray(videos)) {
      videoIds = videos ? [videos] : [];
    }

    // Use uploaded file path or URL
    const logoPath = req.file
      ? `/uploads/logos/${req.file.filename}`
      : clientLogo;

    const presentation = await Presentation.create({
      client,
      clientLogo: logoPath || null,
      message,
      videos: videoIds,
      layout: layout || 'grid',
      theme: theme || 'dark',
      primaryColor: primaryColor || '#6a94c7',
      backgroundColor: backgroundColor || '#111827',
      expiresAt: expiresAt || null
    });

    res.redirect(`/admin/presentations?success=Presentation created! URL: /hello/${presentation.slug}`);
  } catch (error) {
    res.redirect(`/admin/presentations/new?error=${encodeURIComponent(error.message)}`);
  }
});

// Edit presentation form
router.get('/presentations/:id/edit', async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id).populate('videos');
    if (!presentation) {
      return res.redirect('/admin/presentations?error=Presentation not found');
    }

    const videos = await Video.find({ isActive: true }).sort({ client: 1, createdAt: -1 });
    const categories = await Video.distinct('category');
    const tags = await Video.distinct('tags');

    res.render('admin/presentations/form', {
      title: 'Edit Presentation',
      presentation,
      videos,
      categories: categories.filter(c => c),
      tags: tags.filter(t => t),
      action: `/admin/presentations/${presentation._id}`,
      method: 'POST'
    });
  } catch (error) {
    res.redirect(`/admin/presentations?error=${encodeURIComponent(error.message)}`);
  }
});

// Update presentation
router.post('/presentations/:id', upload.single('clientLogoFile'), async (req, res) => {
  try {
    const {
      client,
      clientLogo,
      message,
      videos,
      layout,
      theme,
      primaryColor,
      backgroundColor,
      expiresAt,
      isActive
    } = req.body;

    // Handle videos array from form
    let videoIds = videos;
    if (!Array.isArray(videos)) {
      videoIds = videos ? [videos] : [];
    }

    // Build update object
    const updateData = {
      client,
      message,
      videos: videoIds,
      layout,
      theme,
      primaryColor,
      backgroundColor,
      expiresAt: expiresAt || null,
      isActive: isActive === 'on' || isActive === 'true'
    };

    // Only update logo if new file uploaded or URL provided
    if (req.file) {
      updateData.clientLogo = `/uploads/logos/${req.file.filename}`;
    } else if (clientLogo) {
      updateData.clientLogo = clientLogo;
    }

    await Presentation.findByIdAndUpdate(req.params.id, updateData);

    res.redirect('/admin/presentations?success=Presentation updated successfully');
  } catch (error) {
    res.redirect(`/admin/presentations/${req.params.id}/edit?error=${encodeURIComponent(error.message)}`);
  }
});

// Delete presentation
router.post('/presentations/:id/delete', async (req, res) => {
  try {
    await Presentation.findByIdAndDelete(req.params.id);
    res.redirect('/admin/presentations?success=Presentation deleted successfully');
  } catch (error) {
    res.redirect(`/admin/presentations?error=${encodeURIComponent(error.message)}`);
  }
});

// Duplicate presentation
router.post('/presentations/:id/duplicate', async (req, res) => {
  try {
    const original = await Presentation.findById(req.params.id);
    if (!original) {
      return res.redirect('/admin/presentations?error=Presentation not found');
    }

    const duplicate = await Presentation.create({
      client: `${original.client} (Copy)`,
      clientLogo: original.clientLogo,
      message: original.message,
      videos: original.videos,
      layout: original.layout,
      theme: original.theme,
      primaryColor: original.primaryColor,
      backgroundColor: original.backgroundColor
    });

    res.redirect(`/admin/presentations/${duplicate._id}/edit?success=Presentation duplicated`);
  } catch (error) {
    res.redirect(`/admin/presentations?error=${encodeURIComponent(error.message)}`);
  }
});

module.exports = router;
