import { Graph } from '../../src/graph.js';
import { loadGraphFromJson, addSongCreditsToGraph, addAlbumsToGraph } from '../../src/graph.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { cwd } from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the project root directory
 * Tries multiple methods to find the data directory
 */
function getProjectRoot(): string {
  // Method 1: Try relative to this file (server/src/datasource.ts -> project root)
  const relativePath = join(__dirname, '../../');
  const dataPath1 = join(relativePath, 'data/artists.json');
  
  if (existsSync(dataPath1)) {
    console.log(`Found data files at: ${relativePath}`);
    return relativePath;
  }
  
  // Method 2: Try from current working directory
  const cwdPath = cwd();
  const dataPath2 = join(cwdPath, 'data/artists.json');
  
  if (existsSync(dataPath2)) {
    console.log(`Found data files at: ${cwdPath}`);
    return cwdPath;
  }
  
  // Method 3: Try from process.cwd() with resolved path
  const resolvedPath = resolve(cwdPath);
  const dataPath3 = join(resolvedPath, 'data/artists.json');
  
  if (existsSync(dataPath3)) {
    console.log(`Found data files at: ${resolvedPath}`);
    return resolvedPath;
  }
  
  // Fallback to relative path and let it throw if file doesn't exist
  console.warn(`Could not find data files. Trying: ${relativePath}`);
  return relativePath;
}

/**
 * Data source that loads and manages the music graph
 */
export class MusicGraphDataSource {
  private graph: Graph | null = null;
  private initialized: boolean = false;

  /**
   * Initialize the graph by loading all data sources
   */
  async initialize(): Promise<Graph> {
    if (this.graph && this.initialized) {
      return this.graph;
    }

    console.log('Initializing music graph data source...');

    try {
      // Get the project root directory
      const projectRoot = getProjectRoot();
      
      // Load base graph from artists.json
      const artistsPath = join(projectRoot, 'data/artists.json');
      
      if (!existsSync(artistsPath)) {
        throw new Error(`Artists data file not found at: ${artistsPath}`);
      }
      
      console.log(`Loading artists from: ${artistsPath}`);
      const artistsData = JSON.parse(readFileSync(artistsPath, 'utf-8'));
      
      // Create graph from artists
      this.graph = new Graph();
      for (const node of artistsData.nodes) {
        this.graph.addNode({ ...node, nodeType: 'artist' });
      }
      for (const edge of artistsData.edges) {
        this.graph.addEdge(edge.source, edge.target, edge.weight ?? 1, edge);
      }

      console.log(`Loaded ${artistsData.nodes.length} artists`);

      // Add song credits
      try {
        const songCreditsPath = join(projectRoot, 'data/song-credits.json');
        if (!existsSync(songCreditsPath)) {
          console.warn(`Song credits file not found at: ${songCreditsPath}`);
        } else {
          console.log(`Loading song credits from: ${songCreditsPath}`);
          const songCredits = JSON.parse(readFileSync(songCreditsPath, 'utf-8'));
          addSongCreditsToGraph(this.graph, songCredits);
          console.log(`Added ${songCredits.songs.length} songs`);
        }
      } catch (error) {
        console.warn('Failed to load song credits:', error);
      }

      // Add albums
      try {
        const albumsPath = join(projectRoot, 'data/albums.json');
        if (!existsSync(albumsPath)) {
          console.warn(`Albums file not found at: ${albumsPath}`);
        } else {
          console.log(`Loading albums from: ${albumsPath}`);
          const albums = JSON.parse(readFileSync(albumsPath, 'utf-8'));
          addAlbumsToGraph(this.graph, albums);
          console.log(`Added ${albums.albums.length} albums`);
        }
      } catch (error) {
        console.warn('Failed to load albums:', error);
      }

      // Assign communities
      this.graph.assignCommunities();
      const components = this.graph.connectedComponents();
      console.log(`Found ${components.length} communities`);

      this.initialized = true;
      console.log('Graph initialization complete');
      
      return this.graph;
    } catch (error) {
      console.error('Failed to initialize graph:', error);
      throw error;
    }
  }

  /**
   * Get the graph instance
   */
  getGraph(): Graph {
    if (!this.graph || !this.initialized) {
      throw new Error('Graph not initialized. Call initialize() first.');
    }
    return this.graph;
  }

  /**
   * Check if the graph is initialized
   */
  isInitialized(): boolean {
    return this.initialized && this.graph !== null;
  }

  /**
   * Reload the graph (useful for development)
   */
  async reload(): Promise<Graph> {
    this.graph = null;
    this.initialized = false;
    return this.initialize();
  }
}

