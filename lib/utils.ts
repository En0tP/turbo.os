// Общие мелкие помощники.

/** Разрешаем только внутренние пути вида /account — защита от open redirect (//evil.com, https://...). */
export function safeNext(next: string | null | undefined, fallback = '/account'): string {
  if (!next) return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  return next;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}

/** Подписи статусов обращения: для администратора и для пользователя. */
export const TICKET_LABEL_ADMIN: Record<string, string> = {
  open: 'Новое / ждёт ответа',
  waiting: 'Ответ отправлен',
  closed: 'Закрыто'
};
export const TICKET_LABEL_USER: Record<string, string> = {
  open: 'На рассмотрении',
  waiting: 'Есть ответ поддержки',
  closed: 'Закрыто'
};
