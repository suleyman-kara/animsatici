import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'monitors.json');

/**
 * Ensures that the local data directory and JSON file exist.
 */
function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ monitors: [] }, null, 2), 'utf-8');
  }
}

/**
 * Reads local monitors from JSON storage.
 * @returns {Array<Object>}
 */
function readLocalData() {
  ensureDataFile();
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.monitors) ? parsed.monitors : [];
  } catch {
    return [];
  }
}

/**
 * Writes local monitors to JSON storage.
 * @param {Array<Object>} monitors
 */
function writeLocalData(monitors) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify({ monitors }, null, 2), 'utf-8');
}

/**
 * Portable Database Adapter.
 * Currently uses Local JSON Storage by default (great for local tests & self-hosting),
 * and provides a drop-in contract for Firestore / PostgreSQL / SQLite.
 */
export class DatabaseAdapter {
  constructor(mode = process.env.DB_MODE || 'local') {
    this.mode = mode;
  }

  /**
   * Retrieves all active monitors that need checking.
   * @returns {Promise<Array<Object>>}
   */
  async getActiveMonitors() {
    const all = readLocalData();
    return all.filter(m => m.isActive !== false);
  }

  /**
   * Retrieves all monitors, optionally filtered by userId.
   * @param {string} [userId]
   * @returns {Promise<Array<Object>>}
   */
  async getAllMonitors(userId = null) {
    const all = readLocalData();
    if (userId) {
      return all.filter(m => m.userId === userId || m.userId === 'default_user');
    }
    return all;
  }

  /**
   * Retrieves a monitor by ID.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getMonitorById(id) {
    const all = readLocalData();
    return all.find(m => m.id === id) || null;
  }

  /**
   * Adds a new monitor.
   *
   * @param {Object} data
   * @param {string} data.userId
   * @param {string} data.userEmail
   * @param {string} data.title
   * @param {string} data.url
   * @param {boolean} [data.isActive=true]
   * @returns {Promise<Object>} The created monitor
   */
  async addMonitor({
    userId = 'anonymous',
    userEmail,
    title,
    url,
    isActive = true
  }) {
    if (!userEmail) throw new Error('userEmail is required.');
    if (!url) throw new Error('url is required.');

    const monitors = readLocalData();
    const newMonitor = {
      id: `mon_${crypto.randomUUID().slice(0, 8)}`,
      userId,
      userEmail,
      title: title || 'Takip Edilen Sayfa',
      url,
      lastContentHash: '',
      lastCheckedAt: null,
      lastChangeDetectedAt: null,
      isActive,
      createdAt: new Date().toISOString()
    };

    monitors.push(newMonitor);
    writeLocalData(monitors);
    return newMonitor;
  }

  /**
   * Updates an existing monitor's state.
   *
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<Object|null>} Updated monitor or null
   */
  async updateMonitor(id, updates) {
    const monitors = readLocalData();
    const index = monitors.findIndex(m => m.id === id);
    if (index === -1) return null;

    monitors[index] = {
      ...monitors[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    writeLocalData(monitors);
    return monitors[index];
  }

  /**
   * Deletes a monitor by ID.
   * @param {string} id
   * @returns {Promise<boolean>} True if deleted
   */
  async deleteMonitor(id) {
    const monitors = readLocalData();
    const filtered = monitors.filter(m => m.id !== id);
    if (filtered.length === monitors.length) return false;

    writeLocalData(filtered);
    return true;
  }
}

// Singleton instance for general use
export const db = new DatabaseAdapter();
