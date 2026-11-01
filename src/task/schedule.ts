export const BOOKING_TIME_SLOTS = ['09:00', '11:00', '14:00', '16:00'];

export function createUpcomingScheduleDates() {
  return Array.from({ length: 3 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index + 1);
    const value = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
    return {
      value,
      labelId: date.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
      labelEn: date.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
    };
  });
}

export function toIndonesiaDateTime(date: string, time: string) {
  return `${date}T${time}:00+07:00`;
}

export function formatSchedule(value: string, language: 'id' | 'en') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(language === 'en' ? 'en-US' : 'id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
