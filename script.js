// CHANGE: Replace Spotify integration with Last.fm tag-based explorer
const API_KEY = "958653bf9d201a3a91283c3303fb5a9c"; // CHANGE: Insert your Last.fm API key
const API_URL = "https://ws.audioscrobbler.com/2.0/"; // CHANGE: Base endpoint for Last.fm

const form = document.querySelector('#tag-form');
const tagInput = document.querySelector('#tag-input');
const songsSection = document.querySelector('#songs');
const topArtistSection = document.querySelector('#top-artist'); // CHANGE: Sidebar top artist container
const artistTracksSection = document.querySelector('#artist-tracks'); // CHANGE: Wrapper for artist tracks
const topTracksList = document.querySelector('#top-tracks'); // CHANGE: Ordered list for artist top tracks
const artistTracksHeading = artistTracksSection ? artistTracksSection.querySelector('h2') : null; // CHANGE: Heading for artist tracks


// CHANGE: Pick the largest available image URL from a Last.fm image array
function pickImage(imageList) {
  if (!Array.isArray(imageList)) return '';
  const match = [...imageList].reverse().find((img) => img && img['#text']);
  return match?.['#text'] || '';
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
  songsSection.innerHTML = '';
  const status = document.createElement('p');
  status.className = `status-message ${type}`;
  status.textContent = message;
  songsSection.appendChild(status);
}

// CHANGE: Create a card for each track and inject into the page
function renderTracks(tracks = []) {
  if (!songsSection) return;
  songsSection.innerHTML = '';

  tracks.forEach((track) => {
    const card = document.createElement('article');
    card.className = 'track-card';

    const imageUrl = track.displayImage || pickImage(track.image);

    if (imageUrl) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = `${track.name} cover art`;
      img.loading = 'lazy';
      card.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'track-placeholder';
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.textContent = 'No art';
      card.appendChild(placeholder);
    }

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
}

function renderTrendingStatus(message, type = 'info') {
  if (!topArtistSection) return;
  topArtistSection.innerHTML = '';
  const status = document.createElement('p');
  status.className = `status-message ${type}`;
  status.textContent = message;
  topArtistSection.appendChild(status);
}

function renderTopTracksStatus(message, type = 'info') {
  if (!topTracksList) return;
  topTracksList.innerHTML = '';
  const statusItem = document.createElement('li');
  statusItem.className = `track-status ${type}`;
  statusItem.textContent = message;
  topTracksList.appendChild(statusItem);
}

function renderTopArtistCard(artist) {
  if (!topArtistSection) return;
  topArtistSection.innerHTML = '';

  const card = document.createElement('article');
  card.className = 'artist-card';

  const imageUrl = pickImage(artist.image);

  if (imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = `${artist.name} portrait`;
    img.loading = 'lazy';
    card.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'artist-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.textContent = 'No image';
    card.appendChild(placeholder);
  }

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

  if (artistTracksHeading) {
    artistTracksHeading.textContent = `Top Tracks - ${artist.name}`;
  }
}

function renderArtistTopTracks(tracks = []) {
  if (!topTracksList) return;
  topTracksList.innerHTML = '';

  tracks.forEach((track, index) => {
    const item = document.createElement('li');
    item.className = 'artist-track';

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
}

async function fetchTrendingArtist() {
  if (!topArtistSection) return;

  renderTrendingStatus("Loading today's hottest artist...", 'loading');
  if (topTracksList) {
    topTracksList.innerHTML = '';
  }
  if (artistTracksHeading) {
    artistTracksHeading.textContent = 'Top Tracks';
  }

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

// CHANGE: Request top tracks for the given tag via Last.fm API
async function fetchTopTracks(tag) {
  if (!tag) {
    renderStatus('Please enter a music tag to search.', 'error');
    return;
  }

  renderStatus(`Loading top tracks for "${tag}"...`, 'loading');

  try {
    const url = `${API_URL}?method=tag.gettoptracks&tag=${encodeURIComponent(tag)}&limit=12&api_key=${API_KEY}&format=json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Network error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.message || 'Last.fm returned an error.');
    }

    const tracks = data.tracks?.track;

    if (!Array.isArray(tracks) || tracks.length === 0) {
      renderStatus('No tracks found for that tag. Try another keyword.', 'error');
      return;
    }

    const detailedResults = await Promise.allSettled(tracks.map(fetchTrackStats));
    const enrichedTracks = tracks.map((track, index) => {
      const result = detailedResults[index];
      const baseImage = pickImage(track.image);
      if (result.status === 'fulfilled' && result.value) {
        const { listeners, playcount, imageUrl } = result.value;
        return {
          ...track,
          listeners,
          playcount,
          displayImage: imageUrl || baseImage,
        };
      }
      return {
        ...track,
        listeners: Number(track.listeners) || 0,
        playcount: Number(track.playcount) || 0,
        displayImage: baseImage,
      };
    });

    renderTracks(enrichedTracks);
  } catch (error) {
    console.error('Error fetching Last.fm API:', error);
    renderStatus('Unable to load tracks right now. Please try again later.', 'error');
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
