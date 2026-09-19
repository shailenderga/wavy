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

    // 1. My active stories
    const [myStories] = await pool.query(
      `SELECT s.id, s.user_id, s.content, s.background_color, s.media_url, s.media_type, s.caption, s.created_at,
              u.username, u.avatar_url
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

module.exports = {
  createStory,
  getStories
};
