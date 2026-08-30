export const ITEM_TYPES = ['note', 'task', 'bookmark', 'snippet'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];
export type Creator = 'human' | 'agent' | 'demo';

export interface Space {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalItem {
  id: string;
  spaceId: string;
  type: ItemType;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  source: string;
  createdBy: Creator;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
  url?: string;
  language?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ContextPack {
  id: string;
  name: string;
  description: string;
  spaceIds: string[];
  itemIds: string[];
  allowedTypes: ItemType[];
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export interface AgentPermissions {
  webmcpEnabled: boolean;
  readEnabled: boolean;
  writeEnabled: boolean;
  allowedTypes: Record<ItemType, boolean>;
}

export interface AppSettings {
  id: 'settings';
  initialized: boolean;
  permissions: AgentPermissions;
  activeSpaceId?: string;
  activePackId?: string;
}

export interface ActivityEntry {
  id: string;
  timestamp: string;
  actor: Creator;
  tool: string;
  operation: string;
  itemId?: string;
  itemTitle?: string;
  result: string;
  status: 'success' | 'denied' | 'error' | 'undone';
  undoId?: string;
}

export interface Relation {
  id: string;
  sourceId: string;
  targetId: string;
  relation: 'related' | 'supports' | 'blocks' | 'references' | 'follow_up';
  createdAt: string;
  createdBy: Creator;
}

export interface UndoRecord {
  id: string;
  activityId: string;
  kind: 'create' | 'update' | 'complete' | 'link';
  itemId?: string;
  relationId?: string;
  before?: PersonalItem;
  consumed: boolean;
  createdAt: string;
}

export interface WorkspaceSnapshot {
  settings?: AppSettings;
  spaces: Space[];
  items: PersonalItem[];
  packs: ContextPack[];
  activity: ActivityEntry[];
  relations: Relation[];
}

export interface ExportBundle {
  version: 1;
  exportedAt: string;
  spaces: Space[];
  items: PersonalItem[];
  packs: ContextPack[];
  relations: Relation[];
  settings: AppSettings;
}

export const DEFAULT_PERMISSIONS: AgentPermissions = {
  webmcpEnabled: true,
  readEnabled: true,
  writeEnabled: true,
  allowedTypes: { note: true, task: true, bookmark: true, snippet: true },
};

