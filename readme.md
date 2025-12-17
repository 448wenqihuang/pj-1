# Last.fm Tag Explorer + MongoDB Playlists

Search by Last.fm tag and save your favorite tracks into a MongoDB-backed personal playlist.

## Quick start
1. Install dependencies
   ```bash
   npm install
   ```
2. Copy env template and set your MongoDB connection string
   ```bash
   cp .env.example .env
   # edit .env and set MONGODB_URI=your-connection-string
   ```
   Optional overrides: `MONGODB_DB`, `MONGODB_COLLECTION`, `PORT`.
3. Run the server
   ```bash
   npm start
   ```
4. Open http://localhost:3000

## Using the UI
- Nickname = playlist id. Set it to load or create your playlist.
- Click "Save to my playlist" on any track card to persist it.
- Or use the manual form to add any song (title + artist required; tag/link/notes optional).

## API summary
- `GET /api/health` - health check.
- `GET /api/playlists/:owner` - read a playlist.
- `POST /api/playlists/:owner/tracks` - add a song.
  ```json
  {
    "title": "song name",
    "artist": "artist name",
    "url": "https://...",
    "tag": "pop",
    "notes": "any note",
    "imageUrl": "https://cover"
  }
  ```
- `DELETE /api/playlists/:owner/tracks/:trackId` - remove a song.
