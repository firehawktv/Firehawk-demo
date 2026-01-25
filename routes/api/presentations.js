const express = require('express');
const router = express.Router();
const Presentation = require('../../models/Presentation');

// GET /api/presentations - Get all presentations
router.get('/', async (req, res) => {
  try {
    const { client, active, limit = 50, skip = 0 } = req.query;

    let query = {};

    if (client) {
      query.client = new RegExp(client, 'i');
    }

    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    const presentations = await Presentation.find(query)
      .populate('videos', 'title embedId client project thumbnail')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Presentation.countDocuments(query);

    res.json({
      success: true,
      data: presentations,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + presentations.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/presentations/:id - Get single presentation
router.get('/:id', async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id)
      .populate('videos');

    if (!presentation) {
      return res.status(404).json({ success: false, error: 'Presentation not found' });
    }

    res.json({ success: true, data: presentation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/presentations - Create new presentation
router.post('/', async (req, res) => {
  try {
    const {
      client,
      clientLogo,
      date,
      message,
      videos,
      layout,
      theme,
      primaryColor,
      backgroundColor,
      password,
      expiresAt
    } = req.body;

    // Parse videos if it's a string (comma-separated IDs)
    let parsedVideos = videos;
    if (typeof videos === 'string') {
      parsedVideos = videos.split(',').map(v => v.trim()).filter(v => v);
    }

    const presentation = await Presentation.create({
      client,
      clientLogo,
      date: date || new Date(),
      message,
      videos: parsedVideos,
      layout: layout || 'grid',
      theme: theme || 'dark',
      primaryColor,
      backgroundColor,
      password,
      expiresAt
    });

    // Populate videos for the response
    await presentation.populate('videos');

    res.status(201).json({ success: true, data: presentation });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/presentations/:id - Update presentation
router.put('/:id', async (req, res) => {
  try {
    const {
      client,
      clientLogo,
      date,
      message,
      videos,
      layout,
      theme,
      primaryColor,
      backgroundColor,
      password,
      expiresAt,
      isActive
    } = req.body;

    // Parse videos if it's a string
    let parsedVideos = videos;
    if (typeof videos === 'string') {
      parsedVideos = videos.split(',').map(v => v.trim()).filter(v => v);
    }

    const updateData = {
      client,
      clientLogo,
      date,
      message,
      videos: parsedVideos,
      layout,
      theme,
      primaryColor,
      backgroundColor,
      expiresAt,
      isActive
    };

    // Only update password if provided
    if (password) {
      updateData.password = password;
    }

    const presentation = await Presentation.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('videos');

    if (!presentation) {
      return res.status(404).json({ success: false, error: 'Presentation not found' });
    }

    res.json({ success: true, data: presentation });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/presentations/:id - Delete presentation
router.delete('/:id', async (req, res) => {
  try {
    const presentation = await Presentation.findByIdAndDelete(req.params.id);

    if (!presentation) {
      return res.status(404).json({ success: false, error: 'Presentation not found' });
    }

    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/presentations/:id/duplicate - Duplicate a presentation
router.post('/:id/duplicate', async (req, res) => {
  try {
    const original = await Presentation.findById(req.params.id);

    if (!original) {
      return res.status(404).json({ success: false, error: 'Presentation not found' });
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

    await duplicate.populate('videos');

    res.status(201).json({ success: true, data: duplicate });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
