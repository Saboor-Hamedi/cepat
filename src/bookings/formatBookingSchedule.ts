const MONTH_SHORT: Record<'en' | 'id', string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
};

export function formatBookingSchedule(iso: string, language: 'en' | 'id'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return language === 'en' ? 'Schedule to be confirmed' : 'Jadwal akan dikonfirmasi';
  }
  const month = MONTH_SHORT[language][date.getMonth()];
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${month} ${date.getDate()}, ${date.getFullYear()} • ${hour}:${minute} WIB`;
}

export function formatShortDate(iso: string, language: 'en' | 'id'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return language === 'en' ? 'Date to be confirmed' : 'Tanggal akan dikonfirmasi';
  }
  const month = MONTH_SHORT[language][date.getMonth()];
  return `${month} ${date.getDate()}, ${date.getFullYear()}`;
}
