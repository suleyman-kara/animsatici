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
  } else if (isAllDay) {
    const startObj = new Date(startDate);
    const nextDay = new Date(Date.UTC(startObj.getUTCFullYear(), startObj.getUTCMonth(), startObj.getUTCDate() + 1));
    endFormatted = formatCalendarDate(nextDay, true);
  } else {
    const startObj = new Date(startDate);
    const oneHourLater = new Date(startObj.getTime() + 60 * 60 * 1000);
    endFormatted = formatCalendarDate(oneHourLater, false);
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
