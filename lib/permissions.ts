import type { AppSettings, ContextPack, ItemType, PersonalItem } from './context-types.ts';

export type PermissionCode =
  | 'WEBMCP_DISABLED'
  | 'NO_ACTIVE_CONTEXT'
  | 'READ_PERMISSION_DENIED'
  | 'WRITE_PERMISSION_DENIED'
  | 'TYPE_PERMISSION_DENIED'
  | 'ITEM_NOT_FOUND';

export function itemIsInPack(item: PersonalItem, pack: ContextPack) {
  return (pack.spaceIds.includes(item.spaceId) || pack.itemIds.includes(item.id)) && pack.allowedTypes.includes(item.type);
}

export function permittedTypes(settings: AppSettings, pack?: ContextPack): ItemType[] {
  if (!pack) return [];
  return pack.allowedTypes.filter((type) => settings.permissions.allowedTypes[type]);
}

export function assertAgentAccess(
  settings: AppSettings | undefined,
  pack: ContextPack | undefined,
  mode: 'read' | 'write',
  type?: ItemType,
) {
  if (!settings?.permissions.webmcpEnabled) return 'WEBMCP_DISABLED' as const;
  if (!pack) return 'NO_ACTIVE_CONTEXT' as const;
  if (mode === 'read' && !settings.permissions.readEnabled) return 'READ_PERMISSION_DENIED' as const;
  if (mode === 'write' && !settings.permissions.writeEnabled) return 'WRITE_PERMISSION_DENIED' as const;
  if (type && (!settings.permissions.allowedTypes[type] || !pack.allowedTypes.includes(type))) return 'TYPE_PERMISSION_DENIED' as const;
  return null;
}
