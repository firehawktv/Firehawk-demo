const express = require('express');
const router = express.Router();
const Presentation = require('../models/Presentation');
const { notifyPresentationView } = require('../services/notify');

// GET /hello/:slug - View presentation
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
    notifyPresentationView(presentation);

    // Render based on layout
    const template = presentation.layout === 'reel'
      ? 'presentation/reel'
      : 'presentation/grid';

    // Stored colors from before the rebrand (form/model defaults) mean "not customised"
    const legacyDefaults = ['#6a94c7', '#ef4444'];
    const custom = presentation.primaryColor;
    const accent = custom && !legacyDefaults.includes(custom.toLowerCase()) ? custom : '#c8932a';

    res.render(template, {
      accent,
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
