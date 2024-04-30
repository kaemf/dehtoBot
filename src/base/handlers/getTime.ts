process.env.TZ = 'Europe/Kiev';

export default function DateRecord(): string{
  const date : Date = new Date(),
    monthFormat = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1),
    dateFormat = (date.getDate() < 10 ? '0' : '') + (date.getDate());
  return `${dateFormat}.${monthFormat}.${date.getFullYear()}`;
}

export function DateHistory() {
  const date = new Date();
  const monthFormat = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1);
  const dayFormat = (date.getDate() < 10 ? '0' : '') + date.getDate();
  const hoursFormat = (date.getHours() < 10 ? '0' : '') + date.getHours();
  const minutesFormat = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();

  return `${dayFormat}.${monthFormat}.${date.getFullYear()} ${hoursFormat}:${minutesFormat}`;
}

export function Time() {
  const date = new Date();
  const hoursFormat = (date.getHours() < 10 ? '0' : '') + date.getHours();
  const minutesFormat = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
  return `${hoursFormat}:${minutesFormat}`;
}