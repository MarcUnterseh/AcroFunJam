const calendarDay = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris',
});

/**
 * « 3 novembre 2026 »: a day of the life of AcroFunJam (submission, decision), to the day, without time, in the
 * time zone of Paris whatever the device (decision Q21, story 5).
 */
export const dayLabel = (date: Date): string => calendarDay.format(date);
