import axios from 'axios';
import * as cheerio from 'cheerio';

const DEFAULT_TIMEOUT_MS = 10000;

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

/**
 * Strips noisy and dynamic elements from HTML (scripts, styles, headers, footers, cookie banners)
 * and extracts clean, meaningful text content.
 *
 * @param {string} html - Raw HTML string
 * @returns {{ title: string, text: string }} Extracted title and cleaned text
 */
export function cleanHtml(html) {
  if (!html || typeof html !== 'string') {
    return { title: '', text: '' };
  }

  const $ = cheerio.load(html);

  // Extract page title before stripping
  const title = $('title').text().trim() || $('h1').first().text().trim() || '';

  // Remove noisy, non-content, or dynamic elements
  $(
    'script, style, noscript, nav, footer, header, iframe, svg, canvas, ' +
    'select, option, button, form, dialog, aside, ' +
    '[role="dialog"], [aria-modal="true"], ' +
    '.cookie-banner, #cookie-banner, .cookie-consent, #cookie-consent, ' +
    '.popup, .modal, .ad, .advertisement'
  ).remove();

  // Add line breaks after common block-level tags so text doesn't collapse together
  $('p, div, h1, h2, h3, h4, h5, h6, li, tr, br, section, article').each((_, el) => {
    $(el).append('\n');
  });

  // Extract text and normalize whitespace
  const rawText = $('body').text() || $.root().text();
  const lines = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Deduplicate consecutive identical lines (e.g. repeated navigation anchors)
  const deduped = [];
  for (let i = 0; i < lines.length; i++) {
    if (i === 0 || lines[i] !== lines[i - 1]) {
      deduped.push(lines[i]);
    }
  }

  const cleanText = deduped.join('\n');
  return { title, text: cleanText };
}

/**
 * Fetches a web page by URL, handles realistic browser headers and timeouts,
 * and returns cleaned text content.
 *
 * @param {string} url - Target web URL
 * @param {Object} [options]
 * @param {number} [options.timeout=10000] - Request timeout in ms
 * @param {Object} [options.headers] - Additional custom HTTP headers
 * @returns {Promise<{ url: string, title: string, text: string, status: number }>}
 */
export async function fetchPageContent(url, options = {}) {
  const timeout = options.timeout || DEFAULT_TIMEOUT_MS;
  const headers = { ...DEFAULT_HEADERS, ...(options.headers || {}) };

  try {
    const response = await axios.get(url, {
      timeout,
      headers,
      maxRedirects: 5,
      responseType: 'text',
      validateStatus: (status) => status >= 200 && status < 400
    });

    const { title, text } = cleanHtml(response.data);

    return {
      url,
      title,
      text,
      status: response.status
    };
  } catch (error) {
    const status = error.response ? error.response.status : null;
    const message = error.message || 'Unknown network error';
    throw new Error(`Failed to fetch URL "${url}" (Status: ${status || 'N/A'}): ${message}`);
  }
}
