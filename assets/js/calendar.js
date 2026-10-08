/* Island Braids & Beauty confirmed-appointment calendar integration.
   No calendar event is created automatically from an unconfirmed request.
   A browser-generated ICS file is imported/saved by the customer on their device. */
(() => {
  'use strict';
  const form = document.getElementById('ib-calendar-form');
  if (!form) return;
  const request = document.getElementById('ib-booking');
  const status = document.getElementById('ib-calendar-status');
  const zone = 'America/New_York';

  const escapeICS = input => String(input ?? '')
    .replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;').replace(/,/g, '\\,');
  const formatICSDate = (date, time) => date.replaceAll('-', '') + 'T' + time.replace(':', '') + '00';
  const isRealDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const check = new Date(Date.UTC(y, m - 1, d));
    return check.getUTCFullYear() === y && check.getUTCMonth() + 1 === m && check.getUTCDate() === d;
  };
  const clearStatus = () => {
    status.textContent = '';
    status.classList.remove('ib-calendar-error');
  };
  const showStatus = (message, error = false) => {
    status.textContent = message;
    status.classList.toggle('ib-calendar-error', error);
  };
  const values = () => {
    const data = new FormData(form);
    const date = String(data.get('date') || '');
    const start = String(data.get('start') || '');
    const end = String(data.get('end') || '');
    if (!form.reportValidity()) return null;
    if (!isRealDate(date) || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
      showStatus('Please enter a valid date and times.', true);
      return null;
    }
    if (end <= start) {
      showStatus('The confirmed finish time must be after the start time.', true);
      return null;
    }
    return {
      service: String(data.get('service')).trim(),
      date, start, end,
      location: String(data.get('location') || '').trim().slice(0, 200)
    };
  };
  const reminderNote = 'Appointment confirmed by Shana. Please arrive with washed, blow-dried, product-free hair. For changes call +1 (407) 590-9478. Verify the location with Shana.';
  const details = v => ({
    title: 'Island Braids & Beauty - ' + v.service,
    start: formatICSDate(v.date, v.start),
    end: formatICSDate(v.date, v.end),
    description: reminderNote
  });
  const makeICS = v => {
    const event = details(v);
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(36).slice(2);
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Island Braids and Beauty//Confirmed Appointment//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Island Braids & Beauty',
      'X-WR-TIMEZONE:' + zone,
      'BEGIN:VTIMEZONE',
      'TZID:' + zone,
      'BEGIN:DAYLIGHT',
      'TZOFFSETFROM:-0500',
      'TZOFFSETTO:-0400',
      'TZNAME:EDT',
      'DTSTART:20070311T020000',
      'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
      'END:DAYLIGHT',
      'BEGIN:STANDARD',
      'TZOFFSETFROM:-0400',
      'TZOFFSETTO:-0500',
      'TZNAME:EST',
      'DTSTART:20071104T020000',
      'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
      'END:STANDARD',
      'END:VTIMEZONE',
      'BEGIN:VEVENT',
      'UID:' + id + '@islandbraidsbeauty',
      'DTSTAMP:' + stamp,
      'DTSTART;TZID=' + zone + ':' + event.start,
      'DTEND;TZID=' + zone + ':' + event.end,
      'SUMMARY:' + escapeICS(event.title),
      'DESCRIPTION:' + escapeICS(event.description),
      'LOCATION:' + escapeICS(v.location || 'Confirm salon location with Shana'),
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Island Braids & Beauty appointment tomorrow',
      'TRIGGER:-P1D',
      'END:VALARM',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Island Braids & Beauty appointment in 2 hours',
      'TRIGGER:-PT2H',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    // RFC 5545 requires folded content lines (75 octets maximum).
    const encoder = new TextEncoder();
    const fold = line => {
      let output = '';
      let column = 0;
      for (const character of line) {
        const bytes = encoder.encode(character).length;
        if (column + bytes > 73) {
          output += '\r\n ';
          column = 1;
        }
        output += character;
        column += bytes;
      }
      return output;
    };
    return lines.map(fold).join('\r\n') + '\r\n';
  };
  document.getElementById('ib-calendar-copy').addEventListener('click', () => {
    if (!request) return;
    const requestData = new FormData(request);
    const service = String(requestData.get('service') || '');
    const date = String(requestData.get('date') || '');
    const time = String(requestData.get('time') || '');
    if (service) form.elements.service.value = service;
    if (date) form.elements.date.value = date;
    if (time) form.elements.start.value = time;
    form.elements.confirmed.checked = false;
    clearStatus();
    if (!service || !date || !time) {
      showStatus('Please select a service, date and time in your booking request first.', true);
      return;
    }
    form.elements.end.focus();
    showStatus('Request details copied. Enter the confirmed finish time, then tick the confirmation box.');
  });
  form.addEventListener('input', clearStatus);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const v = values();
    if (!v) return;
    try {
      const data = new Blob([makeICS(v)], { type: 'text/calendar;charset=utf-8' });
      const href = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = href;
      link.download = 'Island-Braids-Appointment-' + v.date + '.ics';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(href), 12000);
      showStatus('Calendar invitation prepared. Open the downloaded file and tap Add or Save in your phone calendar.');
    } catch (error) {
      showStatus('The calendar file could not be prepared. Please try Google Calendar instead.', true);
    }
  });
  document.getElementById('ib-google-calendar').addEventListener('click', () => {
    const v = values();
    if (!v) return;
    const event = details(v);
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: event.start + '/' + event.end,
      ctz: zone,
      details: event.description + '\nSuggested reminders: one day before and two hours before. Check the Google Calendar reminder settings before saving.',
      location: v.location || ''
    });
    const url = 'https://calendar.google.com/calendar/render?' + params.toString();
    // Same-tab navigation avoids mobile popup blockers; Back returns to the site.
    window.location.assign(url);
  });
})();