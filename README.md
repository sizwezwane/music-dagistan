# music-dagistan

Explore artist relationships using graph theory. This is a static web app that visualizes an artist graph with a force-directed layout. It includes search, highlighting neighbors, community filtering (connected components), degree centrality via node size, and unweighted shortest path between two artists using BFS.

## Run locally

This project uses TypeScript and esbuild.

1) Install deps

```bash
npm install
```

2) Build once

```bash
npm run build
```

3) Serve the folder (any static server). Examples:

- Python:

```bash
python3 -m http.server 5500
```

- Node:

```bash
npx serve . -l 5500 --single --no-request-logging
```

Open `http://localhost:5500/`.

For iterative dev with auto-rebuild and local web server, use:

```bash
npm run dev
```

## Files

- `index.html`: App shell and UI controls
- `styles.css`: Minimal theming
- `src/graph.ts`: Graph model, BFS shortest path, degree centrality, connected components, JSON loader
- `src/app.ts`: D3 force-directed visualization and UI wiring
- `dist/app.js`: Bundled output
- `data/artists.json`: Sample dataset (edit/replace with your own)

## Data format

```json
{
  "nodes": [{ "id": "tswift", "name": "Taylor Swift" }],
  "edges": [{ "source": "tswift", "target": "edsheeran", "relation": "collab" }]
}
```

`id` must be unique per artist. `relation` is free-form.

## Features powered by graph theory

- Degree centrality: node radius ∝ degree
- Connected components: used as simple community detection, selectable in the UI
- Unweighted shortest path (BFS): highlights the minimal hop path between two artists

## Customize

- Edit `data/artists.json` to add your artists and edges
- Adjust force parameters in `src/app.js` for different layouts

