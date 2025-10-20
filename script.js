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

const cache = new Map(); // CHANGE: Cache for fetched results
const TRACK_LIMIT = 6; // CHANGE: Number of tracks to display per tag
const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));


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

// CHANGE: Show loading/errors inside the results section
function renderStatus(message, type = 'info') {
  if (!songsSection) return;
  songsSection.setAttribute('aria-busy', 'true');
  songsSection.innerHTML = '';
  const status = document.createElement('p');
  status.className = `status-message ${type}`;
  status.textContent = message;
  songsSection.appendChild(status);
  if (type !== 'loading') {
    songsSection.removeAttribute('aria-busy');
  }
}

// CHANGE: Create a card for each track and inject into the page
function renderTracks(tracks = []) {
  if (!songsSection) return;
  songsSection.innerHTML = '';

  tracks.forEach((track) => {
    const card = document.createElement('article');
    card.className = 'track-card fade-in';

    const imageUrl = track.displayImage || pickImage(track.image);
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = `${track.name} cover art`;
    img.loading = 'lazy';
    card.appendChild(img);

    const info = document.createElement('div');
    info.className = 'track-info';

    const title = document.createElement('h3');
    title.textContent = track.name || 'Untitled';

    const artist = document.createElement('p');
    artist.className = 'artist';
    artist.textContent = track.artist?.name || 'Unknown artist';

    const metrics = document.createElement('div');
    metrics.className = 'track-metrics';

    const listeners = document.createElement('div');
    listeners.className = 'metric';
    listeners.innerHTML = `
      <span class="metric-label">Listeners</span>
      <span class="metric-value">${formatCount(track.listeners)}</span>
    `;

    const scrobbles = document.createElement('div');
    scrobbles.className = 'metric';
    scrobbles.innerHTML = `
      <span class="metric-label">Scrobbles</span>
      <span class="metric-value">${formatCount(track.playcount)}</span>
    `;

    const link = document.createElement('a');
    link.href = track.url || '#';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'View on Last.fm';

    metrics.append(listeners, scrobbles);
    info.append(title, artist, metrics, link);
    card.appendChild(info);
    songsSection.appendChild(card);
  });
  songsSection.removeAttribute('aria-busy');
}

function renderTrendingStatus(message, type = 'info') {
  if (!topArtistSection) return;
  topArtistSection.setAttribute('aria-busy', 'true');
  topArtistSection.innerHTML = '';
  const status = document.createElement('p');
  status.className = `status-message ${type}`;
  status.textContent = message;
  topArtistSection.appendChild(status);
  if (type !== 'loading') {
    topArtistSection.removeAttribute('aria-busy');
  }
}

function renderTopTracksStatus(message, type = 'info') {
  if (!topTracksList) return;
  topTracksList.setAttribute('aria-busy', 'true');
  topTracksList.innerHTML = '';
  const statusItem = document.createElement('li');
  statusItem.className = `track-status ${type}`;
  statusItem.textContent = message;
  topTracksList.appendChild(statusItem);
}

function renderSongSkeletons(count = 6) {
  if (!songsSection) return;
  const status = songsSection.querySelector('.status-message');
  songsSection.innerHTML = '';
  if (status) {
    songsSection.appendChild(status);
  } else {
    songsSection.setAttribute('aria-busy', 'true');
  }
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i += 1) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-card';
    skeleton.innerHTML = `
      <div class="skeleton-thumb"></div>
      <div class="skeleton-line wide"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    `;
    fragment.appendChild(skeleton);
  }
  songsSection.appendChild(fragment);
}

function renderArtistSkeleton() {
  if (!topArtistSection) return;
  const skeleton = document.createElement('article');
  skeleton.className = 'skeleton-artist';
  skeleton.innerHTML = `
    <div class="skeleton-thumb tall"></div>
    <div class="skeleton-line wide"></div>
    <div class="skeleton-line short"></div>
  `;
  topArtistSection.appendChild(skeleton);
}

function renderTrackListSkeleton(count = 5) {
  if (!topTracksList) return;
  const status = topTracksList.querySelector('.track-status');
  topTracksList.innerHTML = '';
  if (status) {
    topTracksList.appendChild(status);
  }
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i += 1) {
    const row = document.createElement('li');
    row.className = 'artist-track skeleton-row';

    const badge = document.createElement('span');
    badge.className = 'rank skeleton-badge';

    const meta = document.createElement('div');
    meta.className = 'artist-track-meta';
    meta.innerHTML = `
      <div class="skeleton-line wide"></div>
      <div class="skeleton-line short"></div>
    `;

    row.append(badge, meta);
    fragment.appendChild(row);
  }
  topTracksList.appendChild(fragment);
}

function renderTopArtistCard(artist) {
  if (!topArtistSection) return;
  topArtistSection.innerHTML = '';

  const card = document.createElement('article');
  card.className = 'artist-card fade-in';

  const imageUrl = pickImage(artist.image);
  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = `${artist.name} portrait`;
  img.loading = 'lazy';
  card.appendChild(img);

  const info = document.createElement('div');
  info.className = 'artist-info';

  const title = document.createElement('h2');
  title.textContent = artist.name || 'Top Artist';

  const stats = document.createElement('div');
  stats.className = 'artist-stats';
  stats.innerHTML = `
    <div class="metric">
      <span class="metric-label">Listeners</span>
      <span class="metric-value">${formatCount(artist.listeners)}</span>
    </div>
    <div class="metric">
      <span class="metric-label">Scrobbles</span>
      <span class="metric-value">${formatCount(artist.playcount)}</span>
    </div>
  `;

  const link = document.createElement('a');
  link.href = artist.url || '#';
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = 'View artist on Last.fm';

  info.append(title, stats, link);
  card.appendChild(info);
  topArtistSection.appendChild(card);
  topArtistSection.removeAttribute('aria-busy');

  if (artistTracksHeading) {
    artistTracksHeading.textContent = `Top Tracks - ${artist.name}`;
  }
}

function renderArtistTopTracks(tracks = []) {
  if (!topTracksList) return;
  topTracksList.innerHTML = '';

  tracks.forEach((track, index) => {
    const item = document.createElement('li');
    item.className = 'artist-track fade-in';

    const rank = document.createElement('span');
    rank.className = 'rank';
    rank.textContent = String(index + 1).padStart(2, '0');

    const meta = document.createElement('div');
    meta.className = 'artist-track-meta';

    const name = document.createElement('p');
    name.className = 'track-title';
    name.textContent = track.name || 'Untitled';

    const stats = document.createElement('p');
    stats.className = 'track-stats';
    const listeners = formatCount(track.listeners);
    const scrobbles = formatCount(track.playcount);
    stats.textContent = `${listeners} listeners - ${scrobbles} scrobbles`;

    const link = document.createElement('a');
    link.href = track.url || '#';
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Open on Last.fm';

    meta.append(name, stats, link);
    item.append(rank, meta);
    topTracksList.appendChild(item);
  });
  topTracksList.removeAttribute('aria-busy');
}

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
    const params = new URLSearchParams({
      method: 'chart.gettopartists',
      limit: '1',
      api_key: API_KEY,
      format: 'json',
    });

    const response = await fetch(`${API_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Network error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.message || 'Last.fm returned an error.');
    }

    const artists = data.artists?.artist;
    const artist = Array.isArray(artists) ? artists[0] : artists;

    if (!artist) {
      renderTrendingStatus('No trending artist data available.', 'error');
      renderTopTracksStatus('No track data available.', 'error');
      return;
    }

    renderTopArtistCard(artist);
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
    const params = new URLSearchParams({
      method: 'artist.gettoptracks',
      artist: artistName,
      limit: '10',
      api_key: API_KEY,
      format: 'json',
    });

    const response = await fetch(`${API_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Network error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.message || 'Last.fm returned an error.');
    }

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

  const params = new URLSearchParams({
    method: 'track.getInfo',
    artist: artistName,
    track: trackName,
    api_key: API_KEY,
    format: 'json',
  });

  try {
    const response = await fetch(`${API_URL}?${params.toString()}`);
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

  const cacheKey = `tag:${tag}:getTopTracks`;
  const cached = cache.get(cacheKey);

  if (cached) {
    renderTracks(cached);
    return;
  }

  renderStatus(`Loading top tracks for "${tag}"...`, 'loading');
  renderSongSkeletons(6);

  try {
    const url = `${API_URL}?method=tag.gettoptracks&tag=${encodeURIComponent(tag)}&limit=${TRACK_LIMIT}&api_key=${API_KEY}&format=json`;
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

// CHANGE: Load global trending artist and their top tracks on startup
fetchTrendingArtist();
