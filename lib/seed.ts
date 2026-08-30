import type { AppSettings, ContextPack, PersonalItem, Space } from './context-types.ts';
import { DEFAULT_PERMISSIONS } from './context-types.ts';

const now = '2026-08-29T18:00:00.000Z';
const atlas = 'space-atlas';

export const demoSpaces: Space[] = [
  { id: atlas, name: 'Project Atlas', description: 'Launch operations for a fictional developer platform.', createdAt: now, updatedAt: now },
  { id: 'space-personal', name: 'Personal', description: 'Private ideas and personal planning.', createdAt: now, updatedAt: now },
  { id: 'space-learning', name: 'Learning', description: 'Reading notes and experiments.', createdAt: now, updatedAt: now },
  { id: 'space-home', name: 'Home', description: 'Household projects and references.', createdAt: now, updatedAt: now },
];

const base = (id: string, type: PersonalItem['type'], title: string, body: string, tags: string[], extra: Partial<PersonalItem> = {}): PersonalItem => ({
  id, spaceId: atlas, type, title, body, tags, createdAt: now, updatedAt: now, source: 'fictional demo workspace', createdBy: 'demo', ...extra,
});

export const demoItems: PersonalItem[] = [
  base('note-readiness', 'note', 'Launch Readiness', 'Production deployment is mostly complete. The unresolved items are DNS validation, production WebMCP testing, and final accessibility verification.', ['launch', 'blockers', 'production']),
  base('note-rollout', 'note', 'Rollout Sequence', 'Validate DNS before inviting external testers. After DNS is stable, run the WebMCP browser flow and capture the final accessibility evidence.', ['launch', 'sequence', 'dns']),
  base('note-accessibility', 'note', 'Accessibility Review Notes', 'Keyboard navigation is complete for the dashboard. The exposed tools dialog and mobile permission controls still need a final focus-order check.', ['accessibility', 'quality']),
  base('note-webmcp', 'note', 'WebMCP Test Plan', 'Search the Atlas Launch pack for blockers, create a high-priority task, verify live UI refresh, disable writes, and confirm a second create is denied.', ['webmcp', 'testing', 'launch']),
  base('note-incident', 'note', 'Launch Risk Register', 'DNS propagation is the highest operational risk. Accessibility is a release-quality gate. No customer data is used in this fictional workspace.', ['risk', 'dns', 'accessibility']),
  base('note-brief', 'note', 'Final Demo Brief', 'The demo should emphasize temporary context, reversible agent actions, and the difference between structured tools and simulated clicks.', ['demo', 'webmcp', 'story']),
  base('task-hosting', 'task', 'Configure production hosting', 'Create the production deployment and verify HTTPS.', ['launch', 'deployment'], { priority: 'high', completed: true }),
  base('task-dns', 'task', 'Verify DNS configuration', 'Confirm the production hostname resolves and the certificate is active.', ['launch', 'dns', 'blocker'], { priority: 'high', completed: false, dueDate: '2026-09-01' }),
  base('task-a11y', 'task', 'Run accessibility audit', 'Check keyboard flow, labels, focus visibility, contrast, and reduced motion.', ['accessibility', 'quality'], { priority: 'high', completed: false }),
  base('task-webmcp-prod', 'task', 'Test WebMCP in production', 'Run every exposed tool against the deployed Atlas Launch pack.', ['webmcp', 'testing', 'launch'], { priority: 'high', completed: false }),
  base('task-video', 'task', 'Record two-minute demo', 'Capture the search, task creation, denied write, activity trail, and undo flow.', ['demo', 'launch'], { priority: 'medium', completed: false }),
  base('task-copy', 'task', 'Review submission copy', 'Check every claim against the final tested build.', ['submission', 'quality'], { priority: 'medium', completed: false }),
  base('task-security', 'task', 'Review security boundaries', 'Verify imported text cannot alter permissions or execute scripts.', ['security', 'review'], { priority: 'medium', completed: true }),
  base('task-screens', 'task', 'Capture final screenshots', 'Capture dashboard, tools panel, activity trail, and permission denial.', ['submission', 'demo'], { priority: 'low', completed: false }),
  base('bookmark-spec', 'bookmark', 'WebMCP Specification', 'Primary specification source for the page-side ModelContext API.', ['webmcp', 'reference'], { url: 'https://github.com/webmachinelearning/webmcp' }),
  base('bookmark-chrome', 'bookmark', 'Chrome WebMCP Documentation', 'Developer guidance for registering and securing WebMCP tools.', ['webmcp', 'security'], { url: 'https://developer.chrome.com/docs/ai/webmcp' }),
  base('bookmark-deploy', 'bookmark', 'Deployment Documentation', 'Production hosting checklist for Project Atlas.', ['deployment', 'reference'], { url: 'https://developers.cloudflare.com/workers/' }),
  base('bookmark-wcag', 'bookmark', 'Accessibility Quick Reference', 'Reference used by the fictional quality team.', ['accessibility', 'reference'], { url: 'https://www.w3.org/WAI/WCAG22/quickref/' }),
  base('snippet-register', 'snippet', 'webmcp-registration-example', "const controller = new AbortController();\nawait document.modelContext.registerTool(tool, { signal: controller.signal });", ['webmcp', 'code'], { language: 'typescript' }),
  base('snippet-search', 'snippet', 'deterministic-search-score', 'exactTitle * 120 + tagMatch * 80 + titleToken * 24 + bodyToken * 6', ['search', 'ranking'], { language: 'text' }),
  base('snippet-denial', 'snippet', 'structured-permission-error', "{ ok: false, code: 'WRITE_PERMISSION_DENIED', message: 'Write access is disabled by the user.' }", ['security', 'webmcp'], { language: 'json' }),
];

export const atlasPack: ContextPack = {
  id: 'pack-atlas-launch', name: 'Atlas Launch', description: 'Only the fictional launch notes, tasks, bookmarks, and snippets needed for the final release.',
  spaceIds: [atlas], itemIds: [], allowedTypes: ['note', 'task', 'bookmark', 'snippet'], createdAt: now, updatedAt: now, active: true,
};

export const demoSettings: AppSettings = {
  id: 'settings', initialized: true, permissions: DEFAULT_PERMISSIONS, activeSpaceId: atlas, activePackId: atlasPack.id,
};
