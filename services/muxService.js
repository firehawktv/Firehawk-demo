const Mux = require('@mux/mux-node');

/**
 * Get Mux client instance
 */
const getMuxClient = () => {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;

  if (!tokenId || !tokenSecret) {
    throw new Error('Mux API credentials not configured. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET in .env');
  }

  return new Mux({ tokenId, tokenSecret });
};

/**
 * Fetch all video assets from Mux (handles pagination)
 * @returns {Promise<Array>} Array of Mux asset objects
 */
const fetchAllAssets = async () => {
  const mux = getMuxClient();
  const assets = [];
  let page = undefined;

  do {
    const params = { limit: 100 };
    if (page) params.page = page;

    const response = await mux.video.assets.list(params);
    assets.push(...response.data);

    // Check if there are more pages
    page = response.data.length === 100 ? response.data[response.data.length - 1].id : null;
  } while (page);

  return assets;
};

/**
 * Get playback ID from a Mux asset
 * @param {Object} asset - Mux asset object
 * @returns {string|null} Playback ID or null
 */
const getPlaybackId = (asset) => {
  if (!asset.playback_ids || asset.playback_ids.length === 0) {
    return null;
  }
  // Prefer public playback ID
  const publicId = asset.playback_ids.find(p => p.policy === 'public');
  return publicId ? publicId.id : asset.playback_ids[0].id;
};

/**
 * Sync Mux assets with local database
 * @param {Model} VideoModel - Mongoose Video model
 * @returns {Promise<Object>} Sync results
 */
const syncWithDatabase = async (VideoModel) => {
  const results = {
    total: 0,
    new: 0,
    existing: 0,
    skipped: 0,
    errors: []
  };

  try {
    // Fetch all assets from Mux
    const muxAssets = await fetchAllAssets();
    results.total = muxAssets.length;

    // Get existing embedIds from database
    const existingVideos = await VideoModel.find({}, 'embedId');
    const existingEmbedIds = new Set(existingVideos.map(v => v.embedId));

    // Process each Mux asset
    for (const asset of muxAssets) {
      // Skip assets that aren't ready
      if (asset.status !== 'ready') {
        results.skipped++;
        continue;
      }

      const playbackId = getPlaybackId(asset);
      if (!playbackId) {
        results.skipped++;
        continue;
      }

      // Check if already exists
      if (existingEmbedIds.has(playbackId)) {
        results.existing++;
        continue;
      }

      // Create new video record
      try {
        await VideoModel.create({
          embedId: playbackId,
          client: 'Unassigned',
          project: asset.passthrough || `Mux Asset ${asset.id.substring(0, 8)}`,
          title: asset.passthrough || null,
          duration: asset.duration || null,
          date: asset.created_at ? new Date(asset.created_at * 1000) : new Date(),
          tags: [],
          category: null,
          isActive: true
        });
        results.new++;
      } catch (err) {
        results.errors.push({
          assetId: asset.id,
          playbackId,
          error: err.message
        });
      }
    }
  } catch (err) {
    results.errors.push({ error: err.message });
  }

  return results;
};

/**
 * Check if Mux credentials are configured
 * @returns {boolean}
 */
const isConfigured = () => {
  return !!(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);
};

module.exports = {
  fetchAllAssets,
  getPlaybackId,
  syncWithDatabase,
  isConfigured
};
