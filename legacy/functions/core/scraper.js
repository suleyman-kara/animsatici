import axios from 'axios';
import * as cheerio from 'cheerio';

const DEFAULT_TIMEOUT_MS = 15000;

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

export function cleanHtml(html) {
  if (!html || typeof html !== 'string') {
    return { title: '', text: '' };
  }

  const $ = cheerio.load(html);
  const title = $('title').text().trim() || $('h1').first().text().trim() || '';

  $(
    'script, style, noscript, nav, footer, header, iframe, svg, canvas, ' +
    'select, option, button, form, dialog, aside, ' +
    '[role="dialog"], [aria-modal="true"], ' +
    '.cookie-banner, #cookie-banner, .cookie-consent, #cookie-consent, ' +
    '.popup, .modal, .ad, .advertisement'
  ).remove();

  $('p, div, h1, h2, h3, h4, h5, h6, li, tr, br, section, article').each((_, el) => {
    $(el).append('\n');
  });

  const rawText = $('body').text() || $.root().text();
  const lines = rawText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const deduped = [];
  for (let i = 0; i < lines.length; i++) {
    if (i === 0 || lines[i] !== lines[i - 1]) {
      deduped.push(lines[i]);
    }
  }

  const cleanText = deduped.join('\n');
  return { title, text: cleanText };
}

export async function fetchPageContent(url, options = {}) {
  if (!url || typeof url !== 'string') {
    throw new TypeError('Valid URL string is required.');
  }

  try {
    const response = await axios.get(url, {
      timeout: options.timeout || DEFAULT_TIMEOUT_MS,
      headers: { ...DEFAULT_HEADERS, ...(options.headers || {}) },
      maxRedirects: 5,
      validateStatus: status => status >= 200 && status < 400
    });

    const { title, text } = cleanHtml(response.data);
    return {
      url,
      title,
      text,
      statusCode: response.status,
      fetchedAt: new Date().toISOString()
    };
  } catch (err) {
    if (err.response) {
      throw new Error(`Failed to fetch ${url}: HTTP ${err.response.status} ${err.response.statusText}`);
    } else if (err.code === 'ECONNABORTED') {
      throw new Error(`Connection timed out while fetching ${url}`);
    } else {
      throw new Error(`Network error fetching ${url}: ${err.message}`);
    }
  }
}
