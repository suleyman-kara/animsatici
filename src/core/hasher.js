import crypto from 'node:crypto';

/**
 * Normalizes text content and calculates a SHA-256 hash.
 * Whitespace is trimmed and multiple consecutive whitespaces are collapsed
 * to avoid false positive change detections caused by minor formatting differences.
 *
 * @param {string} text - Raw or cleaned text content
 * @returns {string} SHA-256 hex digest
 */
export function computeHash(text) {
  if (typeof text !== 'string') {
    throw new TypeError('Text to hash must be a string.');
  }

  const normalized = text.trim().replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Checks if content has changed by comparing two hashes.
 *
 * @param {string} oldHash - Previous SHA-256 hash
 * @param {string} newHash - Current SHA-256 hash
 * @returns {boolean} True if hashes differ or oldHash is empty
 */
export function hasChanged(oldHash, newHash) {
  if (!oldHash) return true;
  return oldHash !== newHash;
}
