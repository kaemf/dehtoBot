export default function DateRecord(): string{
    const date : Date = new Date(),
      monthFormat = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1),
      dateFormat = (date.getDate() < 10 ? '0' : '') + (date.getDate());
    return `${dateFormat}.${monthFormat}.${date.getFullYear()}`;
}