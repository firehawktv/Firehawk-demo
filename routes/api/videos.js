const express = require('express');
const router = express.Router();
const Video = require('../../models/Video');

// GET /api/videos - Get all videos
router.get('/', async (req, res) => {
  try {
    const { client, tag, search, limit = 50, skip = 0 } = req.query;

    let query = {};

    if (client) {
      query.client = new RegExp(client, 'i');
    }

    if (tag) {
      query.tags = { $in: Array.isArray(tag) ? tag : [tag] };
    }

    if (search) {
      query.$text = { $search: search };
    }

    const videos = await Video.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Video.countDocuments(query);

    res.json({
      success: true,
      data: videos,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + videos.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/videos/clients - Get unique client names
router.get('/clients', async (req, res) => {
  try {
    const clients = await Video.distinct('client');
    res.json({ success: true, data: clients.sort() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/videos/tags - Get all unique tags
router.get('/tags', async (req, res) => {
  try {
    const tags = await Video.distinct('tags');
    res.json({ success: true, data: tags.sort() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/videos/:id - Get single video
router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    res.json({ success: true, data: video });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/videos - Create new video
router.post('/', async (req, res) => {
  try {
    const { client, project, date, tags, embedId, title, description, thumbnail, duration } = req.body;

    // Parse tags if it's a string
    let parsedTags = tags;
    if (typeof tags === 'string') {
      parsedTags = tags.split(',').map(t => t.trim()).filter(t => t);
    }

    const video = await Video.create({
      client,
      project,
      date: date || new Date(),
      tags: parsedTags,
      embedId,
      title,
      description,
      thumbnail,
      duration
    });

    res.status(201).json({ success: true, data: video });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'A video with this embed ID already exists' });
    }
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/videos/:id - Update video
router.put('/:id', async (req, res) => {
  try {
    const { client, project, date, tags, embedId, title, description, thumbnail, duration, isActive } = req.body;

    // Parse tags if it's a string
    let parsedTags = tags;
    if (typeof tags === 'string') {
      parsedTags = tags.split(',').map(t => t.trim()).filter(t => t);
    }

    const video = await Video.findByIdAndUpdate(
      req.params.id,
      {
        client,
        project,
        date,
        tags: parsedTags,
        embedId,
        title,
        description,
        thumbnail,
        duration,
        isActive
      },
      { new: true, runValidators: true }
    );

    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    res.json({ success: true, data: video });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'A video with this embed ID already exists' });
    }
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/videos/:id - Delete video
router.delete('/:id', async (req, res) => {
  try {
    const video = await Video.findByIdAndDelete(req.params.id);

    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    res.json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
