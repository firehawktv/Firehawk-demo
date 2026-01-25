const express = require('express');
const router = express.Router();
const Presentation = require('../models/Presentation');

// GET /p/:slug - View presentation
router.get('/:slug', async (req, res) => {
  try {
    const presentation = await Presentation.findBySlugWithVideos(req.params.slug);

    if (!presentation) {
      return res.status(404).render('404', {
        title: 'Presentation Not Found'
      });
    }

    // Check if expired
    if (presentation.isExpired()) {
      return res.status(410).render('presentation/expired', {
        title: 'Presentation Expired',
        client: presentation.client
      });
    }

    // Record view
    await presentation.recordView();

    // Render based on layout
    const template = presentation.layout === 'reel'
      ? 'presentation/reel'
      : 'presentation/grid';

    res.render(template, {
      title: `${presentation.client} - Video Presentation`,
      presentation,
      videos: presentation.videos
    });
  } catch (error) {
    console.error('Presentation error:', error);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Unable to load presentation'
    });
  }
});

module.exports = router;
