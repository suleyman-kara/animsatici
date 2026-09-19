import { fetchPageContent, cleanHtml } from './scraper.js';
import { computeHash, hasChanged } from './hasher.js';
import { formatCalendarDate, generateGoogleCalendarUrl } from './calendar.js';
import { analyzeChangeWithAI } from './aiAnalyzer.js';

export {
  fetchPageContent,
  cleanHtml,
  computeHash,
  hasChanged,
  formatCalendarDate,
  generateGoogleCalendarUrl,
  analyzeChangeWithAI
};

/**
 * High-level orchestration function to check a URL, detect changes,
 * run AI analysis if changed, and generate a calendar URL if an event is detected.
 *
 * @param {Object} params
 * @param {string} params.url - URL to monitor
 * @param {string} [params.oldHash] - Previous SHA-256 content hash
 * @param {string} [params.oldText] - Previous page text
 * @param {string} [params.apiKey] - Gemini API key
 * @param {string} [params.currentDate] - Reference date (YYYY-MM-DD)
 * @returns {Promise<{
 *   url: string,
 *   title: string,
 *   currentHash: string,
 *   hasChanged: boolean,
 *   cleanText: string,
 *   aiAnalysis: Object|null,
 *   calendarUrl: string|null
 * }>}
 */
export async function checkUrlForUpdates({
  url,
  oldHash = '',
  oldText = '',
  apiKey = process.env.GEMINI_API_KEY,
  currentDate = new Date().toISOString().split('T')[0]
}) {
  // Step 1: Fetch and clean page content
  const { title, text } = await fetchPageContent(url);

  // Step 2: Compute hash
  const currentHash = computeHash(text);
  const changed = hasChanged(oldHash, currentHash);

  // If no change detected, skip AI analysis to keep costs at $0
  if (!changed) {
    return {
      url,
      title,
      currentHash,
      hasChanged: false,
      cleanText: text,
      aiAnalysis: null,
      calendarUrl: null
    };
  }

  // Step 3: Analyze changes with Gemini
  let aiAnalysis = null;
  let calendarUrl = null;

  if (apiKey) {
    aiAnalysis = await analyzeChangeWithAI({
      newText: text,
      oldText,
      pageTitle: title,
      url,
      currentDate,
      apiKey
    });

    // Step 4: If AI found an event with a date, build the 1-click Google Calendar URL
    if (aiAnalysis?.hasEvent && aiAnalysis.eventDetails?.startDate) {
      calendarUrl = generateGoogleCalendarUrl({
        title: aiAnalysis.eventDetails.title || title || 'Yeni Etkinlik',
        startDate: aiAnalysis.eventDetails.startDate,
        endDate: aiAnalysis.eventDetails.endDate || undefined,
        isAllDay: Boolean(aiAnalysis.eventDetails.isAllDay),
        details: `${aiAnalysis.changeSummary}\n\nKaynak: ${url}`,
        location: url
      });
    }
  }

  return {
    url,
    title,
    currentHash,
    hasChanged: true,
    cleanText: text,
    aiAnalysis,
    calendarUrl
  };
}
