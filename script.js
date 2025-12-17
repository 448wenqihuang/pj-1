// CHANGE: Replace Spotify integration with Last.fm tag-based explorer
const API_KEY = "958653bf9d201a3a91283c3303fb5a9c"; // CHANGE: Insert your Last.fm API key
const API_URL = "https://ws.audioscrobbler.com/2.0/"; // CHANGE: Base endpoint for Last.fm
const DEFAULT_ARTWORK_URL = "https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png"; // CHANGE: Fallback cover art

const form = document.querySelector('#tag-form');
const tagInput = document.querySelector('#tag-input');
const songsSection = document.querySelector('#songs');
const topArtistSection = document.querySelector('#top-artist'); // CHANGE: Sidebar top artist container
const artistTracksSection = document.querySelector('#artist-tracks'); // CHANGE: Wrapper for artist tracks
const topTracksList = document.querySelector('#top-tracks'); // CHANGE: Ordered list for artist top tracks
const artistTracksHeading = artistTracksSection ? artistTracksSection.querySelector('h2') : null; // CHANGE: Heading for artist tracks
const playlistForm = document.querySelector('#playlist-form');
const playlistNameInput = document.querySelector('#playlist-name');
const playlistStatus = document.querySelector('#playlist-status');
const playlistList = document.querySelector('#playlist-list');
const playlistHeadline = document.querySelector('#playlist-headline');
const manualSongForm = document.querySelector('#manual-song-form');
const manualTitleInput = document.querySelector('#manual-title');
const manualArtistInput = document.querySelector('#manual-artist');
const manualTagInput = document.querySelector('#manual-tag');
const manualUrlInput = document.querySelector('#manual-url');
const manualNotesInput = document.querySelector('#manual-notes');
const manualImageInput = document.querySelector('#manual-image');

const PLAYLIST_API_BASE = '/api/playlists';
const cache = new Map(); // CHANGE: Cache for fetched results
const TRACK_LIMIT = 6; // CHANGE: Number of tracks to display per tag
const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
let currentTag = tagInput?.value.trim() || '';

const playlistState = {
  owner: localStorage.getItem('playlistOwner') || '',
  tracks: [],
};


// CHANGE: Pick the largest available image URL from a Last.fm image array
function pickImage(imageList) {
  if (!Array.isArray(imageList)) return DEFAULT_ARTWORK_URL;
  const match = [...imageList].reverse().find((img) => img && img['#text']);
  const url = match?.['#text'];
  return url && typeof url === 'string' && url.trim().length > 0 ? url : DEFAULT_ARTWORK_URL;
}

// CHANGE: Format listener/scrobble counts for display
function formatCount(rawValue) {
  const value = Number(rawValue) || 0;
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

// CHANGE: Try to fetch a higher quality artist image; fall back to default
async function fetchArtistImageUrl(artistName) {
  return DEFAULT_ARTWORK_URL;
}

// CHANGE: Load the current trending artist and their top tracks
async function fetchTrendingArtist() {
  if (!topArtistSection) return;

  renderTrendingStatus("Loading today's hottest artist...", 'loading');
  renderArtistSkeleton();
  if (artistTracksHeading) {
    artistTracksHeading.textContent = 'Top Tracks';
  }
  renderTopTracksStatus('Loading top tracks...', 'loading');
  renderTrackListSkeleton(5);

  try {
    const response = await fetch('/api/lastfm/trendingArtist');
    if (!response.ok) {
      throw new Error(`Network error: ${response.status}`);
    }

    const data = await response.json();

    const artists = data.artists?.artist;
    const artist = Array.isArray(artists) ? artists[0] : artists;

    if (!artist) {
      renderTrendingStatus('No trending artist data available.', 'error');
      renderTopTracksStatus('No track data available.', 'error');
      return;
    }

    let imageUrl = pickImage(artist.image);
    if (!imageUrl || imageUrl === DEFAULT_ARTWORK_URL) {
      imageUrl = await fetchArtistImageUrl(artist.name);
    }
    const artistWithImage = { ...artist, image: [{ '#text': imageUrl }] };

    renderTopArtistCard(artistWithImage);
    await fetchArtistTopTracks(artist.name);
  } catch (error) {
    console.error('Error fetching Last.fm top artist:', error);
    renderTrendingStatus('Unable to load trending artist right now.', 'error');
    renderTopTracksStatus('Unable to load top tracks.', 'error');
  }
}
async function fetchArtistTopTracks(artistName) {
  if (!topTracksList) return;

  if (!artistName) {
    renderTopTracksStatus('No artist selected.', 'error');
    return;
  }

  renderTopTracksStatus(`Loading ${artistName}'s top tracks...`, 'loading');

  try {
    const response = await fetch(`/api/lastfm/artistTopTracks?artist=${encodeURIComponent(artistName)}&limit=10`);
    if (!response.ok) {
      throw new Error(`Network error: ${response.status}`);
    }

    const data = await response.json();

    const tracks = data.toptracks?.track;

    if (!Array.isArray(tracks) || tracks.length === 0) {
      renderTopTracksStatus('No top tracks found for this artist.', 'error');
      return;
    }

    renderArtistTopTracks(tracks.slice(0, 10));
  } catch (error) {
    console.error('Error fetching artist top tracks:', error);
    renderTopTracksStatus('Unable to load top tracks.', 'error');
  }
}

// CHANGE: Fetch detailed stats for a track (listeners & scrobbles)// CHANGE: Fetch detailed stats for a track (listeners & scrobbles)
// CHANGE: Fetch detailed stats for a track (listeners & scrobbles)
async function fetchTrackStats(track) {
  const artistName = track.artist?.name || '';
  const trackName = track.name || '';
  const fallbackImage = pickImage(track.image);

  if (!artistName || !trackName) {
    return {
      listeners: Number(track.listeners) || 0,
      playcount: Number(track.playcount) || 0,
      imageUrl: fallbackImage,
    };
  }

  const url = `/api/lastfm/trackInfo?artist=${encodeURIComponent(artistName)}&track=${encodeURIComponent(trackName)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Network error: ${response.status}`);
    }

    const data = await response.json();
    const trackInfo = data.track || {};
    const stats = trackInfo.stats || trackInfo;
    const imageUrl = pickImage(trackInfo.album?.image) || pickImage(trackInfo.image) || fallbackImage;

    return {
      listeners: Number(stats.listeners ?? track.listeners) || 0,
      playcount: Number(stats.playcount ?? track.playcount) || 0,
      imageUrl,
    };
  } catch (error) {
    console.warn(`Failed to load stats for ${artistName} - ${trackName}:`, error);
    return {
      listeners: Number(track.listeners) || 0,
      playcount: Number(track.playcount) || 0,
      imageUrl: fallbackImage,
    };
  }
}
// Request top tracks for the given tag via Last.fm API
async function fetchTopTracks(tag) {
  if (!tag) {
    renderStatus('Please enter a music tag to search.', 'error');
    return;
  }

  currentTag = tag;
  const cacheKey = `tag:${tag}:getTopTracks`;
  const cached = cache.get(cacheKey);

  if (cached) {
    renderTracks(cached);
    return;
  }

  renderStatus(`Loading top tracks for "${tag}"...`, 'loading');
  renderSongSkeletons(6);

  try {
    const url = `/api/lastfm/tagTopTracks?tag=${encodeURIComponent(tag)}&limit=${TRACK_LIMIT}`;
    const response = await fetch(url);

    if (response.status === 429) {
      const error = new Error('Rate limit');
      error.status = 429;
      throw error;
    }

    if (!response.ok) {
      const error = new Error(`Network error: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();

    if (data.error) {
      const apiError = new Error(data.message || 'Last.fm returned an error.');
      if (data.error === 29 || String(data.message || '').includes('429')) {
        apiError.status = 429;
      }
      throw apiError;
    }

    const rawTracks = data.tracks?.track;
    const tracks = Array.isArray(rawTracks) ? rawTracks.slice(0, TRACK_LIMIT) : [];

    if (tracks.length === 0) {
      renderStatus('No tracks found for that tag. Try another keyword.', 'error');
      return;
    }

    const enrichedTracks = [];

    for (let i = 0; i < tracks.length; i += 1) {
      const track = tracks[i];
      const baseImage = pickImage(track.image);
      const detail = await fetchTrackStats(track);

      const listeners = detail.listeners ?? (Number(track.listeners) || 0);
      const playcount = detail.playcount ?? (Number(track.playcount) || 0); 

      enrichedTracks.push({
        ...track,
        listeners,
        playcount,
        displayImage: detail.imageUrl || baseImage,
      });

      if (i < tracks.length - 1) {
        await wait(180);
      }
    }

    cache.set(cacheKey, enrichedTracks);
    renderTracks(enrichedTracks);
  } catch (error) {
    console.error('Error fetching Last.fm API:', error);
    const message = String(error?.message || '');
    if ((error && error.status === 429) || message.includes('429')) {
      renderStatus('Rate limit hit. Please retry in a moment.', 'error');
    } else {
      renderStatus('Unable to load tracks right now. Please try again later.', 'error');
    }
  }
}

if (form && tagInput) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    fetchTopTracks(tagInput.value.trim());
  });

  // CHANGE: Trigger an initial fetch based on the default tag value
  const defaultTag = tagInput.value.trim();
  if (defaultTag) {
    fetchTopTracks(defaultTag);
  }
} else {
  console.warn('Tag form elements were not found in the DOM.');
}

if (playlistForm && playlistNameInput) {
  playlistForm.addEventListener('submit', (event) => {
    event.preventDefault();
    setPlaylistOwner(playlistNameInput.value || '');
  });
}

if (manualSongForm) {
  manualSongForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      title: manualTitleInput?.value.trim() || '',
      artist: manualArtistInput?.value.trim() || '',
      tag: (manualTagInput?.value.trim() || currentTag || ''),
      url: manualUrlInput?.value.trim() || '',
      notes: manualNotesInput?.value.trim() || '',
    };
    const saved = await addTrackToPlaylist(payload);
    if (saved) {
      manualSongForm.reset();
      if (manualTagInput && currentTag) {
        manualTagInput.value = currentTag;
      }
    }
  });
}

if (playlistState.owner) {
  setPlaylistOwner(playlistState.owner);
} else {
  renderPlaylistTracks([]);
}

// CHANGE: Load global trending artist and their top tracks on startup
fetchTrendingArtist();



























// -------------- UI helpers (restored) ----------------
function renderStatus(message, type = 'info') {
  if (!songsSection) return;
  songsSection.innerHTML = `<div class="status ${type}">${message}</div>`;
}

function renderSongSkeletons(count = 6) {
  if (!songsSection) return;
  const cards = Array.from({ length: count }, () => `
    <article class="song-card skeleton">
      <div class="song-cover"></div>
      <div class="song-meta">
        <div class="line short"></div>
        <div class="line long"></div>
      </div>
    </article>
  `);
  songsSection.innerHTML = cards.join('');
}

function renderTracks(tracks) {
  if (!songsSection) return;
  if (!Array.isArray(tracks) || tracks.length === 0) {
    renderStatus('No tracks found for that tag. Try another keyword.', 'error');
    return;
  }

  const cards = tracks.map((track, index) => {
    const image = track.displayImage || pickImage(track.image);
    const listeners = formatCount(track.listeners || 0);
    const scrobbles = formatCount(track.playcount || 0);
    const artist = track.artist?.name || track.artist || 'Unknown';
    const title = track.name || track.title || 'Untitled';
    return `
      <article class="song-card" data-index="${index}">
        <img class="song-cover" src="${image}" alt="${title} cover" loading="lazy">
        <div class="song-meta">
          <h3>${title}</h3>
          <p class="artist">${artist}</p>
          <p class="stats"><span>${listeners} listeners</span> ? <span>${scrobbles} scrobbles</span></p>
          <div class="song-actions">
            <a class="listen-link" href="${track.url || '#'}" target="_blank" rel="noopener">Open on Last.fm</a>
          </div>
        </div>
      </article>
    `;
  });

  songsSection.innerHTML = cards.join('');
}

// ---------- Trending artist helpers ----------
function renderTrendingStatus(message, type = 'info') {
  if (!topArtistSection) return;
  topArtistSection.innerHTML = `<div class="status ${type}">${message}</div>`;
}

function renderArtistSkeleton() {
  if (!topArtistSection) return;
  topArtistSection.innerHTML = `
    <article class="artist-card skeleton">
      <div class="artist-cover"></div>
      <div class="artist-meta">
        <div class="line long"></div>
        <div class="line short"></div>
      </div>
    </article>
  `;
}

function renderTopArtistCard(artist) {
  if (!topArtistSection) return;
  const image = pickImage(artist.image);
  const listeners = formatCount(artist.listeners || artist.playcount || 0);
  const name = artist.name || 'Trending artist';
  topArtistSection.innerHTML = `
    <article class="artist-card">
      <img class="artist-cover" src="${image}" alt="${name}" loading="lazy">
      <div class="artist-meta">
        <p class="eyebrow">Trending artist</p>
        <h3>${name}</h3>
        <p class="stats">${listeners} listeners</p>
        <a class="listen-link" href="${artist.url || '#'}" target="_blank" rel="noopener">View on Last.fm</a>
      </div>
    </article>
  `;
}

function renderTopTracksStatus(message, type = 'info') {
  if (!topTracksList) return;
  topTracksList.innerHTML = `<li class="status ${type}">${message}</li>`;
}

function renderTrackListSkeleton(count = 5) {
  if (!topTracksList) return;
  const items = Array.from({ length: count }, () => `
    <li class="track-item skeleton">
      <div class="line long"></div>
      <div class="line short"></div>
    </li>
  `);
  topTracksList.innerHTML = items.join('');
}

function renderArtistTopTracks(tracks) {
  if (!topTracksList) return;
  if (!Array.isArray(tracks) || tracks.length === 0) {
    renderTopTracksStatus('No top tracks found for this artist.', 'error');
    return;
  }
  const items = tracks.map((track, idx) => {
    const title = track.name || 'Untitled';
    const scrobbles = formatCount(track.playcount || track.listeners || 0);
    return `<li class="track-item"><span class="rank">${idx + 1}</span><span class="track-title">${title}</span><span class="track-plays">${scrobbles} scrobbles</span></li>`;
  });
  topTracksList.innerHTML = items.join('');
}

// ---------- Playlist helpers ----------
async function setPlaylistOwner(owner) {
  const clean = (owner || '').trim();
  playlistState.owner = clean;
  localStorage.setItem('playlistOwner', clean);
  if (playlistHeadline) {
    playlistHeadline.textContent = clean ? `${clean}'s playlist` : 'Your playlist';
  }
  if (playlistStatus) {
    playlistStatus.textContent = clean
      ? `Active playlist: ${clean}. Click a track to save.`
      : 'Add a nickname, then click any track card to save.';
  }
  await loadPlaylist();
}

async function loadPlaylist() {
  if (!playlistState.owner) {
    renderPlaylistTracks([]);
    return;
  }
  try {
    playlistStatus.textContent = 'Loading playlist...';
    const res = await fetch(`${PLAYLIST_API_BASE}/${encodeURIComponent(playlistState.owner)}`);
    if (!res.ok) throw new Error(`Network error ${res.status}`);
    const data = await res.json();
    playlistState.tracks = data.tracks || [];
    renderPlaylistTracks(playlistState.tracks);
    playlistStatus.textContent = `Playlist loaded for ${data.owner || playlistState.owner}.`;
  } catch (err) {
    console.error('Error loading playlist:', err);
    playlistStatus.textContent = 'Unable to load playlist right now.';
  }
}

async function addTrackToPlaylist(track) {
  if (!playlistState.owner) {
    playlistStatus.textContent = 'Please enter a nickname first.';
    return null;
  }
  try {
    playlistStatus.textContent = 'Saving track...';
    const res = await fetch(`${PLAYLIST_API_BASE}/${encodeURIComponent(playlistState.owner)}/tracks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(track),
    });
    if (!res.ok) throw new Error(`Save error ${res.status}`);
    const data = await res.json();
    const saved = data.track || track;
    playlistState.tracks = [...playlistState.tracks, saved];
    renderPlaylistTracks(playlistState.tracks);
    playlistStatus.textContent = 'Saved to playlist.';
    return saved;
  } catch (err) {
    console.error('Error saving track:', err);
    playlistStatus.textContent = 'Save request failed.';
    return null;
  }
}

async function removeTrackFromPlaylist(trackId) {
  if (!playlistState.owner || !trackId) return;
  try {
    const res = await fetch(`${PLAYLIST_API_BASE}/${encodeURIComponent(playlistState.owner)}/tracks/${trackId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Delete error ${res.status}`);
    playlistState.tracks = playlistState.tracks.filter((t) => String(t._id) !== String(trackId));
    renderPlaylistTracks(playlistState.tracks);
  } catch (err) {
    console.error('Error removing track:', err);
  }
}

function renderPlaylistTracks(tracks) {
  if (!playlistList) return;
  if (!Array.isArray(tracks) || tracks.length === 0) {
    playlistList.innerHTML = '<li class="status info">No tracks saved yet.</li>';
    return;
  }
  playlistList.innerHTML = tracks
    .map((track) => {
      const title = track.title || track.name || 'Untitled';
      const artist = track.artist || 'Unknown';
      const image = track.imageUrl || pickImage(track.image);
      const notes = track.notes ? `<span class="pill">${track.notes}</span>` : '';
      const date = track.addedAt ? new Date(track.addedAt).toLocaleDateString() : '';
      const tag = track.tag ? `<span class="pill subtle">${track.tag}</span>` : '';
      return `
        <li class="playlist-item" data-id="${track._id || ''}">
          <img class="playlist-cover" src="${image}" alt="${title}" loading="lazy">
          <div class="playlist-meta">
            <h4>${title}</h4>
            <p class="artist">${artist}</p>
            <div class="meta-line">${tag} ${notes} ${date ? `<span class="pill subtle">Saved on ${date}</span>` : ''}</div>
          </div>
          <div class="playlist-actions">
            ${track.url ? `<a class="listen-link" href="${track.url}" target="_blank" rel="noopener">Open</a>` : ''}
            <button class="delete-btn" type="button">Remove</button>
          </div>
        </li>
      `;
    })
    .join('');

  playlistList.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', (evt) => {
      const li = evt.currentTarget.closest('.playlist-item');
      const id = li?.dataset.id;
      if (id) {
        removeTrackFromPlaylist(id);
      }
    });
  });
}
