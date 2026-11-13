/**
 * Web bell notifications are a client-side feed: they arrive over Socket.IO and
 * are cached in localStorage. The cache must never outlive the tenant or the
 * user that received it — a shared browser would otherwise show another
 * company's staff activity in the bell.
 *
 * Every entry is stored under `tapin:notifications:<companyId>:<userId>`.
 */

export type NotificationType = 'geofence' | 'leave' | 'correction' | 'notice';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: NotificationType;
  read: boolean;
}

export interface NotificationScope {
  companyId?: string | null;
  userId?: string | null;
}

/** Pre-scope key. It held every tenant's events; it is purged, never read. */
const LEGACY_KEY = 'tapin_notifications';
const PREFIX = 'tapin:notifications:';

/** Keep the bell bounded so stale events cannot accumulate forever. */
export const MAX_NOTIFICATIONS = 50;

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function notificationStorageKey(scope: NotificationScope): string | null {
  if (!scope.companyId || !scope.userId) return null;
  return `${PREFIX}${scope.companyId}:${scope.userId}`;
}

/**
 * Delete the untenanted cache written by older builds. It can contain another
 * organisation's notifications and must never be displayed again.
 */
export function purgeLegacyNotificationCache(): void {
  storage()?.removeItem(LEGACY_KEY);
}

function isNotificationItem(value: unknown): value is NotificationItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.message === 'string' &&
    typeof item.timestamp === 'string' &&
    typeof item.type === 'string' &&
    typeof item.read === 'boolean'
  );
}

export function loadNotifications(scope: NotificationScope): NotificationItem[] {
  purgeLegacyNotificationCache();
  const key = notificationStorageKey(scope);
  const store = storage();
  if (!key || !store) return [];

  try {
    const parsed = JSON.parse(store.getItem(key) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isNotificationItem).slice(0, MAX_NOTIFICATIONS);
  } catch {
    return [];
  }
}

export function saveNotifications(
  scope: NotificationScope,
  items: NotificationItem[]
): void {
  const key = notificationStorageKey(scope);
  const store = storage();
  if (!key || !store) return;

  try {
    store.setItem(key, JSON.stringify(items.slice(0, MAX_NOTIFICATIONS)));
  } catch {
    // A full or disabled localStorage must not break the bell.
  }
}

/** Remove every cached tenant feed. Called on logout. */
export function clearNotificationCaches(): void {
  const store = storage();
  if (!store) return;

  purgeLegacyNotificationCache();

  const keys: string[] = [];
  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index);
    if (key && key.startsWith(PREFIX)) keys.push(key);
  }
  keys.forEach((key) => store.removeItem(key));
}
