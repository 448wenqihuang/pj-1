// Simple Express server that exposes a MongoDB-backed playlist API
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const fetch = (...args) => import('node-fetch').then(({ default: nodeFetch }) => nodeFetch(...args));

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'lastfm_playlists';
const COLLECTION_NAME = process.env.MONGODB_COLLECTION || 'playlists';
const LASTFM_API_KEY = process.env.LASTFM_API_KEY || '958653bf9d201a3a91283c3303fb5a9c';
const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI. Please set it in your environment or .env file.');
  process.exit(1);
}

const app = express();
const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
let playlists;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const normalizeOwner = (owner = '') => owner.trim().toLowerCase();

async function fetchLastFm(params) {
  const url = `${LASTFM_API_URL}?${params}&api_key=${LASTFM_API_KEY}&format=json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Last.fm error ${response.status}`);
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(data.message || 'Last.fm returned an error');
  }
  return data;
}
// Quick health check for deployment diagnostics
app.get('/api/health', async (req, res) => {
  try {
    await client.db(DB_NAME).command({ ping: 1 });
    res.json({ ok: true });
  } catch (error) {
    res.status(503).json({ ok: false, error: error.message });
  }
});

// Return a playlist by owner name (stored case-insensitively)
app.get('/api/playlists/:owner', async (req, res) => {
  const rawOwner = req.params.owner || '';
  const ownerKey = normalizeOwner(rawOwner);

  if (!ownerKey) {
    res.status(400).json({ error: 'Owner is required.' });
    return;
  }

  try {
    const doc = await playlists.findOne({ ownerKey });
    res.json({
      owner: doc?.owner || rawOwner.trim(),
      tracks: doc?.tracks || [],
    });
  } catch (error) {
    console.error('GET /api/playlists error:', error);
    res.status(500).json({ error: 'Failed to load playlist.' });
  }
});

// Add a track to an owner's playlist
app.post('/api/playlists/:owner/tracks', async (req, res) => {
  const rawOwner = req.params.owner || '';
  const owner = rawOwner.trim();
  const ownerKey = normalizeOwner(rawOwner);
  const { title, artist, url, tag, notes, imageUrl } = req.body || {};

  if (!ownerKey) {
    res.status(400).json({ error: 'Owner is required.' });
    return;
  }

  if (!title || !artist) {
    res.status(400).json({ error: 'Track title and artist are required.' });
    return;
  }

  const track = {
    _id: new ObjectId(),
    title: String(title).trim(),
    artist: String(artist).trim(),
    url: (url || '').trim(),
    tag: (tag || '').trim(),
    notes: (notes || '').trim(),
    imageUrl: (imageUrl || '').trim(),
    addedAt: new Date().toISOString(),
  };

  try {
    await playlists.updateOne(
      { ownerKey },
      {
        $setOnInsert: {
          owner,
          ownerKey,
          createdAt: new Date().toISOString(),
        },
        $push: { tracks: track },
      },
      { upsert: true },
    );
    res.status(201).json({ track });
  } catch (error) {
    console.error('POST /api/playlists error:', error);
    res.status(500).json({ error: 'Failed to save track.' });
  }
});

// Remove a track from an owner's playlist
app.delete('/api/playlists/:owner/tracks/:trackId', async (req, res) => {
  const rawOwner = req.params.owner || '';
  const ownerKey = normalizeOwner(rawOwner);
  const { trackId } = req.params;

  if (!ownerKey) {
    res.status(400).json({ error: 'Owner is required.' });
    return;
  }

  if (!trackId || !ObjectId.isValid(trackId)) {
    res.status(400).json({ error: 'A valid track ID is required.' });
    return;
  }

  try {
    const result = await playlists.updateOne(
      { ownerKey },
      { $pull: { tracks: { _id: new ObjectId(trackId) } } },
    );

    if (!result.modifiedCount) {
      res.status(404).json({ error: 'Track not found for this owner.' });
      return;
    }

    res.json({ removed: trackId });
  } catch (error) {
    console.error('DELETE /api/playlists error:', error);
    res.status(500).json({ error: 'Failed to remove track.' });
  }
});

// Proxy Last.fm: tag top tracks
app.get('/api/lastfm/tagTopTracks', async (req, res) => {
  const { tag, limit = 6 } = req.query;
  if (!tag) {
    res.status(400).json({ error: 'tag is required' });
    return;
  }
  try {
    const data = await fetchLastFm(`method=tag.gettoptracks&tag=${encodeURIComponent(tag)}&limit=${limit}`);
    res.json(data);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

// Proxy Last.fm: trending artist (chart top 1)
app.get('/api/lastfm/trendingArtist', async (req, res) => {
  try {
    const data = await fetchLastFm('method=chart.gettopartists&limit=1');
    res.json(data);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

// Proxy Last.fm: artist top tracks
app.get('/api/lastfm/artistTopTracks', async (req, res) => {
  const { artist, limit = 10 } = req.query;
  if (!artist) {
    res.status(400).json({ error: 'artist is required' });
    return;
  }
  try {
    const data = await fetchLastFm(`method=artist.gettoptracks&artist=${encodeURIComponent(artist)}&limit=${limit}`);
    res.json(data);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});

// Proxy Last.fm: track info (for stats + album art)
app.get('/api/lastfm/trackInfo', async (req, res) => {
  const { artist, track } = req.query;
  if (!artist || !track) {
    res.status(400).json({ error: 'artist and track are required' });
    return;
  }
  try {
    const data = await fetchLastFm(`method=track.getInfo&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`);
    res.json(data);
  } catch (error) {
    res.status(502).json({ error: error.message });
  }
});
async function start() {
  try {
    await client.connect();
    playlists = client.db(DB_NAME).collection(COLLECTION_NAME);
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Could not start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  try {
    await client.close();
  } finally {
    process.exit(0);
  }
});

start();









