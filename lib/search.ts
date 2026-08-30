import type { PersonalItem, Space } from './context-types.ts';

export interface SearchFilters {
  query: string;
  types?: PersonalItem['type'][];
  tags?: string[];
  limit?: number;
  spaceId?: string;
}

export function scoreItem(item: PersonalItem, spaceName: string, rawQuery: string): number {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return 1;
  const title = item.title.toLowerCase();
  const tags = item.tags.map((tag) => tag.toLowerCase());
  const body = item.body.toLowerCase();
  const url = (item.url ?? '').toLowerCase();
  const space = spaceName.toLowerCase();
  const tokens = query.split(/\s+/).filter(Boolean);
  let score = 0;
  if (title === query) score += 120;
  if (tags.includes(query)) score += 80;
  if (title.includes(query)) score += 55;
  if (body.includes(query)) score += 24;
  if (url.includes(query)) score += 18;
  if (space.includes(query)) score += 14;
  for (const token of tokens) {
    if (title.split(/\W+/).includes(token)) score += 24;
    if (tags.some((tag) => tag.includes(token))) score += 18;
    if (body.includes(token)) score += 6;
    if (space.includes(token)) score += 4;
  }
  return score;
}

export function rankItems(items: PersonalItem[], spaces: Space[], filters: SearchFilters) {
  const spaceNames = new Map(spaces.map((space) => [space.id, space.name]));
  const wantedTags = filters.tags?.map((tag) => tag.toLowerCase()) ?? [];
  return items
    .filter((item) => !filters.spaceId || item.spaceId === filters.spaceId)
    .filter((item) => !filters.types?.length || filters.types.includes(item.type))
    .filter((item) => !wantedTags.length || wantedTags.every((tag) => item.tags.some((itemTag) => itemTag.toLowerCase() === tag)))
    .map((item) => ({ item, score: scoreItem(item, spaceNames.get(item.spaceId) ?? '', filters.query) }))
    .filter(({ score }) => !filters.query.trim() || score > 0)
    .sort((a, b) => b.score - a.score || b.item.updatedAt.localeCompare(a.item.updatedAt))
    .slice(0, Math.min(Math.max(filters.limit ?? 12, 1), 50));
}
