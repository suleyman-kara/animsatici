/**
 * Formats a Date instance or ISO date string into Google Calendar URL date format.
 * Format for timed events: YYYYMMDDTHHmmssZ (UTC)
 * Format for all-day events: YYYYMMDD
 *
 * @param {string|Date} dateInput - Date object or date string
 * @param {boolean} [isAllDay=false] - Whether this is an all-day event
 * @returns {string} Formatted date string
 */
export function formatCalendarDate(dateInput, isAllDay = false) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);

  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date provided: ${dateInput}`);
  }

  const pad = (n) => String(n).padStart(2, '0');

  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());

  if (isAllDay) {
    return `${year}${month}${day}`;
  }

  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Generates a direct "Add to Google Calendar" URL.
 * Works seamlessly in any browser without needing OAuth or API scopes.
 *
 * @param {Object} options
 * @param {string} options.title - Event title
 * @param {string|Date} options.startDate - Event start date/time
 * @param {string|Date} [options.endDate] - Event end date/time (defaults to 1 hour after start)
 * @param {boolean} [options.isAllDay=false] - Whether the event is an all-day event
 * @param {string} [options.details] - Event description or summary
 * @param {string} [options.location] - Event location or source web URL
 * @returns {string} Direct Google Calendar creation link
 */
export function generateGoogleCalendarUrl({
  title,
  startDate,
  endDate,
  isAllDay = false,
  details = '',
  location = ''
}) {
  if (!title) {
    throw new Error('Event title is required.');
  }
  if (!startDate) {
    throw new Error('Event start date is required.');
  }

  const startFormatted = formatCalendarDate(startDate, isAllDay);

  let endFormatted;
  if (endDate) {
    endFormatted = formatCalendarDate(endDate, isAllDay);
  } else {
    // Default end date: +1 hour for timed events, +1 day for all-day events
    const startObj = startDate instanceof Date ? startDate : new Date(startDate);
    const endObj = new Date(startObj.getTime());
    if (isAllDay) {
      endObj.setUTCDate(endObj.getUTCDate() + 1);
      endFormatted = formatCalendarDate(endObj, true);
    } else {
      endObj.setUTCHours(endObj.getUTCHours() + 1);
      endFormatted = formatCalendarDate(endObj, false);
    }
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startFormatted}/${endFormatted}`
  });

  if (details) {
    params.set('details', details);
  }
  if (location) {
    params.set('location', location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
