# Data Loading in GraphQL Server

The GraphQL server automatically loads data from JSON files in the `data/` directory.

## Data Files

The server loads the following data files from the project root `data/` directory:

1. **`data/artists.json`** - Base artist nodes and relationships
2. **`data/song-credits.json`** - Song nodes and their credits
3. **`data/albums.json`** - Album nodes and their relationships

## Path Resolution

The server uses multiple methods to find the data directory:

1. **Relative to server file** - Tries `../../data/` from `server/src/datasource.ts`
2. **Current working directory** - Tries `./data/` from where the server is run
3. **Resolved path** - Uses `process.cwd()` with resolved absolute path

The server will log which path it's using when it starts:

```
Found data files at: /path/to/project/
Loading artists from: /path/to/project/data/artists.json
```

## Running the Server

**Important**: Always run the server from the project root directory:

```bash
# From project root
npm run server
```

Or if running directly:

```bash
# From project root
tsx server/src/index.ts
```

## Data File Structure

### artists.json
```json
{
  "nodes": [
    { "id": "artist-id", "name": "Artist Name" }
  ],
  "edges": [
    { "source": "artist1", "target": "artist2", "relation": "collab" }
  ]
}
```

### song-credits.json
```json
{
  "songs": [
    {
      "id": "song-id",
      "title": "Song Title",
      "artistIds": ["artist-id"],
      "year": 2020,
      "credits": {
        "writers": ["artist-id"],
        "producers": ["artist-id"],
        "performers": ["artist-id"]
      }
    }
  ]
}
```

### albums.json
```json
{
  "albums": [
    {
      "id": "album-id",
      "title": "Album Title",
      "artistIds": ["artist-id"],
      "year": 2020,
      "songIds": ["song-id"]
    }
  ]
}
```

## Troubleshooting

### Data files not found

If you see an error like:
```
Artists data file not found at: /path/to/data/artists.json
```

**Solutions:**
1. Make sure you're running the server from the project root
2. Verify the `data/` directory exists in the project root
3. Check that all three JSON files exist:
   - `data/artists.json`
   - `data/song-credits.json`
   - `data/albums.json`

### Port already in use

If you see:
```
Error: listen EADDRINUSE: address already in use :::4000
```

**Solutions:**
1. Stop the existing server (Ctrl+C)
2. Kill the process using port 4000:
   ```bash
   lsof -ti:4000 | xargs kill -9
   ```
3. Use a different port:
   ```bash
   PORT=4001 npm run server
   ```

## Verifying Data Load

When the server starts successfully, you should see:

```
🚀 Starting GraphQL server...
Initializing music graph data source...
Found data files at: /path/to/project/
Loading artists from: /path/to/project/data/artists.json
Loaded 12 artists
Loading song credits from: /path/to/project/data/song-credits.json
Added 12 songs
Loading albums from: /path/to/project/data/albums.json
Added 11 albums
Found 4 communities
Graph initialization complete
✅ GraphQL server ready at http://localhost:4000/graphql
```

If you see all these messages, the data is loaded correctly!

