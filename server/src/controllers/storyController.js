const { getPool } = require('../config/db');

// Create a new story/status (supports text, photo, and video)
async function createStory(req, res) {
  try {
    const userId = req.user.id;
    const { content, backgroundColor, mediaUrl, mediaType, caption } = req.body;

    const type = ['image', 'video'].includes(mediaType) ? mediaType : 'text';
    const textContent = (content || caption || (type !== 'text' ? `${type} status` : '')).trim();

    if (type === 'text' && !textContent) {
      return res.status(400).json({ error: 'Story content cannot be empty' });
    }

    if (type !== 'text' && !mediaUrl) {
      return res.status(400).json({ error: 'Media URL or file is required for photo/video story' });
    }

    const pool = getPool();
    const bg = (backgroundColor || '#005c4b').trim();

    const [result] = await pool.query(
      `INSERT INTO stories (user_id, content, background_color, media_url, media_type, caption) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, textContent, bg, mediaUrl || null, type, caption || null]
    );

    const [newStory] = await pool.query(
      `SELECT s.id, s.user_id, s.content, s.background_color, s.media_url, s.media_type, s.caption, s.created_at,
              u.username, u.avatar_url
       FROM stories s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [result.insertId]
    );

    // Emit socket event if io is available
    const io = req.app.get('io');
    if (io) {
      io.emit('new_story_posted', {
        userId,
        story: newStory[0]
      });
    }

    return res.status(201).json({
      success: true,
      story: newStory[0]
    });
  } catch (err) {
    console.error('createStory error:', err);
    return res.status(500).json({ error: 'Failed to create story' });
  }
}

// Get all active stories from the last 24 hours
async function getStories(req, res) {
  try {
    const currentUserId = req.user.id;
    const pool = getPool();

    // 1. My active stories (with view_count)
    const [myStories] = await pool.query(
      `SELECT s.id, s.user_id, s.content, s.background_color, s.media_url, s.media_type, s.caption, s.created_at,
              u.username, u.avatar_url,
              (SELECT COUNT(*) FROM story_views sv WHERE sv.story_id = s.id) AS view_count
       FROM stories s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ? AND s.created_at >= NOW() - INTERVAL 24 HOUR
       ORDER BY s.created_at DESC`,
      [currentUserId]
    );

    // 2. Contacts active stories (only accepted contacts)
    const [contactStories] = await pool.query(
      `SELECT s.id, s.user_id, s.content, s.background_color, s.media_url, s.media_type, s.caption, s.created_at,
              u.username, u.avatar_url
       FROM stories s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id IN (
         SELECT receiver_id FROM contact_requests WHERE sender_id = ? AND status = 'accepted'
         UNION
         SELECT sender_id FROM contact_requests WHERE receiver_id = ? AND status = 'accepted'
       )
       AND s.created_at >= NOW() - INTERVAL 24 HOUR
       ORDER BY s.created_at DESC`,
      [currentUserId, currentUserId]
    );

    // Group contact stories by user
    const groupedMap = new Map();
    for (const story of contactStories) {
      if (!groupedMap.has(story.user_id)) {
        groupedMap.set(story.user_id, {
          userId: story.user_id,
          username: story.username,
          avatar_url: story.avatar_url,
          lastStoryAt: story.created_at,
          stories: []
        });
      }
      groupedMap.get(story.user_id).stories.push(story);
    }

    return res.json({
      myStories,
      contactStories: Array.from(groupedMap.values())
    });
  } catch (err) {
    console.error('getStories error:', err);
    return res.status(500).json({ error: 'Failed to fetch stories' });
  }
}

// Record a view for a story
async function recordStoryView(req, res) {
  try {
    const storyId = req.params.id;
    const viewerId = req.user.id;
    const pool = getPool();

    const [storyRows] = await pool.query('SELECT user_id FROM stories WHERE id = ?', [storyId]);
    if (storyRows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Only record if viewer is not the story creator
    if (storyRows[0].user_id !== viewerId) {
      await pool.query(
        'INSERT IGNORE INTO story_views (story_id, viewer_id) VALUES (?, ?)',
        [storyId, viewerId]
      );

      const io = req.app.get('io');
      if (io) {
        io.emit('story_viewed', {
          storyId: parseInt(storyId, 10),
          authorId: storyRows[0].user_id,
          viewerId,
          viewerUsername: req.user.username
        });
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('recordStoryView error:', err);
    return res.status(500).json({ error: 'Failed to record story view' });
  }
}

// Get list of viewers for a story (only accessible by story owner)
async function getStoryViewers(req, res) {
  try {
    const storyId = req.params.id;
    const currentUserId = req.user.id;
    const pool = getPool();

    const [storyRows] = await pool.query('SELECT user_id FROM stories WHERE id = ?', [storyId]);
    if (storyRows.length === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    if (Number(storyRows[0].user_id) !== Number(currentUserId)) {
      return res.status(403).json({ error: 'Only the story owner can see viewers' });
    }

    const [viewers] = await pool.query(
      `SELECT u.id, u.username, u.avatar_url, sv.viewed_at
       FROM story_views sv
       JOIN users u ON sv.viewer_id = u.id
       WHERE sv.story_id = ?
       ORDER BY sv.viewed_at DESC`,
      [storyId]
    );

    return res.json({ viewers });
  } catch (err) {
    console.error('getStoryViewers error:', err);
    return res.status(500).json({ error: 'Failed to get story viewers: ' + err.message });
  }
}

// Delete a story (only by owner)
async function deleteStory(req, res) {
  try {
    const storyId = Number(req.params.id);
    const userId = Number(req.user.id);
    const pool = getPool();

    const [storyRows] = await pool.query('SELECT id, user_id FROM stories WHERE id = ?', [storyId]);
    if (storyRows.length === 0) {
      return res.json({ success: true, message: 'Story already deleted' });
    }

    if (Number(storyRows[0].user_id) !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this story' });
    }

    // Safely delete story views first (in case cascading is missing on remote DB)
    try {
      await pool.query('DELETE FROM story_views WHERE story_id = ?', [storyId]);
    } catch (viewErr) {
      console.warn('Could not clean up story_views:', viewErr.message);
    }

    await pool.query('DELETE FROM stories WHERE id = ?', [storyId]);

    const io = req.app.get('io');
    if (io) {
      io.emit('story_deleted', {
        storyId: parseInt(storyId, 10),
        userId
      });
    }

    return res.json({ success: true, message: 'Story deleted successfully' });
  } catch (err) {
    console.error('deleteStory error:', err);
    return res.status(500).json({ error: 'Failed to delete story: ' + err.message });
  }
}

module.exports = {
  createStory,
  getStories,
  recordStoryView,
  getStoryViewers,
  deleteStory
};
