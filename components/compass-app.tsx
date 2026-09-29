'use client';

import {
  useId,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  Activity,
  Bot,
  Bookmark,
  Boxes,
  Check,
  ChevronRight,
  CircleAlert,
  CircleDot,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderKanban,
  Import,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  Menu,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  SquareCheckBig,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { liveQuery } from 'dexie';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  ITEM_TYPES,
  type AgentPermissions,
  type ContextPack,
  type ItemType,
  type PersonalItem,
  type Space,
  type WorkspaceSnapshot,
} from '@/lib/context-types';
import {
  getSnapshot,
  activatePack,
  clearAllLocalData,
  completeTask,
  createItem,
  createPack,
  createSpace,
  exportWorkspace,
  getOrInitializeDemoSnapshot,
  importWorkspace,
  linkItems,
  loadDemoWorkspace,
  renameSpace,
  undoActivity,
  updateItem,
  updateSettings,
} from '@/lib/repository';
import { rankItems } from '@/lib/search';
import {
  exposedToolInfo,
  registerCompassTools,
  TOOL_INFO,
  unregisterCompassTools,
} from '@/lib/webmcp';

type View = 'dashboard' | 'spaces' | 'packs' | 'activity' | 'settings';
type DialogName =
  | 'item'
  | 'pack'
  | 'tools'
  | 'demo'
  | 'space'
  | 'clear'
  | 'reset'
  | 'import'
  | null;
const typeIcons = {
  note: FileText,
  task: SquareCheckBig,
  bookmark: Bookmark,
  snippet: Code2,
};
const typeTone = {
  note: 'text-cyan-200 bg-cyan-300/10',
  task: 'text-amber-200 bg-amber-300/10',
  bookmark: 'text-emerald-200 bg-emerald-300/10',
  snippet: 'text-violet-200 bg-violet-300/10',
};
const primaryPrompt =
  'Search my active Context Pack for unresolved launch blockers. Tell me what you find, then create one high-priority task for the most important unresolved blocker. Finally, tell me exactly what you changed.';
const accessibilityPrompt =
  'Review the open tasks and notes in my active context. Find anything related to accessibility, summarize the relevant information, and create a task for the missing next step.';

export function CompassApp() {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot>();
  const [view, setView] = useState<View>('dashboard');
  const [dialog, setDialog] = useState<DialogName>(null);
  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<PersonalItem>();
  const [navOpen, setNavOpen] = useState(false);
  const [renamingSpace, setRenamingSpace] = useState<Space>();
  const [importText, setImportText] = useState('');
  const [storageError, setStorageError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [webmcp, setWebmcp] = useState({
    supported: false,
    registered: [] as string[],
    ready: false,
    error: undefined as string | undefined,
  });
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | undefined;
    let cancelled = false;
    const failed = (error: unknown) =>
      setStorageError(
        error instanceof Error
          ? error.message
          : 'Local storage is unavailable.',
      );
    void getOrInitializeDemoSnapshot()
      .then(() => {
        if (!cancelled)
          subscription = liveQuery(getSnapshot).subscribe({
            next: setSnapshot,
            error: failed,
          });
      })
      .catch(failed);
    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  const settings = snapshot?.settings;
  const registrationSettings = settings ? JSON.stringify(settings) : undefined;
  useEffect(() => {
    if (!registrationSettings) return;
    const settings = JSON.parse(registrationSettings) as NonNullable<
      WorkspaceSnapshot['settings']
    >;
    let cancelled = false;
    void registerCompassTools(settings, {
      contextTimeoutMs: 8_000,
      pollIntervalMs: 100,
    }).then((state) => {
      if (!cancelled)
        setWebmcp({
          supported: state.supported,
          registered: state.registered,
          ready: true,
          error: state.error,
        });
    });
    return () => {
      cancelled = true;
      unregisterCompassTools();
    };
  }, [registrationSettings]);

  const activePack =
    snapshot?.packs.find((pack) => pack.id === settings?.activePackId) ??
    snapshot?.packs.find((pack) => pack.active);
  const activeSpace =
    snapshot?.spaces.find((space) => space.id === settings?.activeSpaceId) ??
    snapshot?.spaces[0];
  const accessibleItems = useMemo(() => {
    if (!snapshot || !activePack || !settings) return [];
    return snapshot.items.filter(
      (item) =>
        (activePack.spaceIds.includes(item.spaceId) ||
          activePack.itemIds.includes(item.id)) &&
        activePack.allowedTypes.includes(item.type) &&
        settings.permissions.allowedTypes[item.type],
    );
  }, [snapshot, activePack, settings]);
  const visibleItems = useMemo(() => {
    if (!snapshot) return [];
    const base = activeSpace
      ? snapshot.items.filter((item) => item.spaceId === activeSpace.id)
      : snapshot.items;
    return rankItems(base, snapshot.spaces, { query, limit: 5000 }).map(
      ({ item }) => item,
    );
  }, [snapshot, activeSpace, query]);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(undefined), 3500);
  };
  const setPermissions = async (patch: Partial<AgentPermissions>) => {
    if (!settings) return;
    try {
      await updateSettings({
        permissions: {
          ...settings.permissions,
          ...patch,
          allowedTypes: patch.allowedTypes ?? settings.permissions.allowedTypes,
        },
      });
    } catch (error) {
      flash(
        error instanceof Error ? error.message : 'Permission change failed.',
      );
    }
  };
  const toggleType = async (type: ItemType) => {
    if (!settings) return;
    await setPermissions({
      allowedTypes: {
        ...settings.permissions.allowedTypes,
        [type]: !settings.permissions.allowedTypes[type],
      },
    });
  };
  const openItem = (item?: PersonalItem) => {
    setSelectedItem(item);
    setDialog('item');
  };
  const handleExport = async () => {
    try {
      const data = await exportWorkspace();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `compass-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      flash('Workspace exported.');
    } catch (error) {
      flash(error instanceof Error ? error.message : 'Export failed.');
    }
  };
  const handleImport = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error('Import exceeds the 20 MB limit.');
      setImportText(await file.text());
      setDialog('import');
    } catch (error) {
      flash(error instanceof Error ? error.message : 'Import failed.');
    }
    if (importRef.current) importRef.current.value = '';
  };

  if (storageError)
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-xl font-semibold">
          Local storage could not be opened
        </h1>
        <p role="alert" className="mt-4">
          {storageError}
        </p>
        <p className="my-4">
          Allow browser storage for this site, then retry. Existing data has not
          been reset.
        </p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </main>
    );
  if (!snapshot)
    return (
      <main className="grid min-h-screen place-items-center bg-background text-sm text-slate-400">
        <span>Opening your local workspace…</span>
      </main>
    );
  if (!settings?.initialized)
    return (
      <main className="grid min-h-screen place-items-center bg-background text-sm text-slate-400">
        <span>Preparing your workspace…</span>
      </main>
    );

  const openTasks = snapshot.items.filter(
    (item) => item.type === 'task' && !item.completed,
  ).length;
  const actionsToday = snapshot.activity.filter(
    (entry) =>
      entry.actor === 'agent' &&
      entry.timestamp.slice(0, 10) === new Date().toISOString().slice(0, 10),
  ).length;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/8 bg-background/90 px-3 backdrop-blur-xl lg:px-6">
        <button
          className="grid size-9 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 xl:hidden"
          aria-label="Open navigation"
          aria-expanded={navOpen}
          onClick={() => setNavOpen(!navOpen)}
        >
          <Menu className="size-4" />
        </button>
        <button
          onClick={() => setView('dashboard')}
          className="flex min-w-fit items-center gap-2.5 text-left"
        >
          <Logo />
          <div className="hidden sm:block">
            <div className="text-sm font-semibold">Compass</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Personal control plane
            </div>
          </div>
        </button>
        <div className="flex flex-1 items-center justify-center">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search your context"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 border-white/8 bg-white/[0.035] pl-9"
              placeholder="Search your context…"
            />
          </div>
        </div>
        <Badge
          variant="outline"
          className={`hidden h-7 sm:inline-flex ${webmcp.supported && settings.permissions.webmcpEnabled ? 'border-emerald-300/15 bg-emerald-300/8 text-emerald-200' : 'border-slate-500/20 text-slate-400'}`}
        >
          <CircleDot className="size-3" />{' '}
          {statusLabel(
            webmcp.supported,
            settings.permissions.webmcpEnabled,
            settings.permissions.writeEnabled,
            activePack,
          )}
        </Badge>
        <Button
          aria-label="Add item"
          disabled={!snapshot.spaces.length}
          onClick={() => openItem()}
          className="h-9 bg-cyan-300 text-slate-950 hover:bg-cyan-200"
        >
          <Plus />
          <span className="hidden sm:inline">Add item</span>
        </Button>
      </header>
      {navOpen && (
        <nav
          aria-label="Mobile navigation"
          className="flex flex-wrap gap-2 border-b border-white/10 p-3 xl:hidden"
        >
          {(
            ['dashboard', 'spaces', 'packs', 'activity', 'settings'] as const
          ).map((key) => (
            <Button
              key={key}
              variant="outline"
              onClick={() => {
                setView(key);
                setNavOpen(false);
              }}
            >
              {key === 'packs'
                ? 'Context Packs'
                : key[0].toUpperCase() + key.slice(1)}
            </Button>
          ))}
        </nav>
      )}
      {webmcp.error && (
        <p role="alert" className="p-3 text-amber-200">
          {webmcp.error} Reload to retry registration.
        </p>
      )}
      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 xl:grid-cols-[226px_minmax(0,1fr)_326px]">
        <Sidebar
          snapshot={snapshot}
          activeSpace={activeSpace}
          view={view}
          setView={setView}
          onSpace={(id) => {
            void updateSettings({ activeSpaceId: id });
            setView('dashboard');
          }}
        />
        <section className="min-w-0 px-4 py-5 lg:px-6 lg:py-6">
          <div className="mx-auto max-w-5xl">
            {view === 'dashboard' && (
              <Dashboard
                key={`${activeSpace?.id}-${query}`}
                snapshot={snapshot}
                activeSpace={activeSpace}
                activePack={activePack}
                accessibleItems={accessibleItems}
                visibleItems={visibleItems}
                openTasks={openTasks}
                actionsToday={actionsToday}
                query={query}
                onItem={openItem}
                onDemo={() => setDialog('demo')}
              />
            )}
            {view === 'spaces' && (
              <SpacesView
                snapshot={snapshot}
                activeSpace={activeSpace}
                onSelect={(id) => {
                  void updateSettings({ activeSpaceId: id });
                  setView('dashboard');
                }}
                onCreate={() => {
                  setRenamingSpace(undefined);
                  setDialog('space');
                }}
                onRename={(space) => {
                  setRenamingSpace(space);
                  setDialog('space');
                }}
              />
            )}
            {view === 'packs' && (
              <PacksView
                snapshot={snapshot}
                activePack={activePack}
                onActivate={(id) => {
                  void activatePack(id).catch((error: Error) =>
                    flash(error.message),
                  );
                }}
                onCreate={() => setDialog('pack')}
              />
            )}
            {view === 'activity' && (
              <ActivityView
                snapshot={snapshot}
                onUndo={async (id) => {
                  try {
                    await undoActivity(id);
                    flash('Agent action undone.');
                  } catch (error) {
                    flash(
                      error instanceof Error ? error.message : 'Undo failed.',
                    );
                  }
                }}
              />
            )}
            {view === 'settings' && (
              <SettingsView
                onExport={() => void handleExport()}
                onImport={() => importRef.current?.click()}
                onReset={() => setDialog('reset')}
                onClear={() => setDialog('clear')}
              />
            )}
          </div>
        </section>
        <AgentRail
          snapshot={snapshot}
          activePack={activePack}
          accessibleItems={accessibleItems}
          supported={webmcp.supported}
          registered={webmcp.registered}
          onPermissions={setPermissions}
          onToggleType={toggleType}
          onTools={() => setDialog('tools')}
          onActivity={() => setView('activity')}
          onUndo={async (id) => {
            try {
              await undoActivity(id);
              flash('Agent action undone.');
            } catch (error) {
              flash(error instanceof Error ? error.message : 'Undo failed.');
            }
          }}
        />
      </div>
      <input
        ref={importRef}
        className="hidden"
        type="file"
        accept="application/json,.json"
        onChange={(event) => void handleImport(event.target.files?.[0])}
      />
      {dialog === 'item' && (
        <ItemDialog
          snapshot={snapshot}
          item={selectedItem}
          onClose={() => setDialog(null)}
          onSaved={(message) => {
            setDialog(null);
            flash(message);
          }}
        />
      )}
      {dialog === 'pack' && (
        <PackDialog
          snapshot={snapshot}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            flash('Context Pack created.');
          }}
        />
      )}
      {dialog === 'space' && (
        <SpaceDialog
          space={renamingSpace}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            flash(renamingSpace ? 'Space renamed.' : 'Space created.');
          }}
        />
      )}
      {dialog === 'tools' && (
        <ToolsDialog
          settings={settings}
          registered={webmcp.registered}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'demo' && (
        <DemoDialog
          onClose={() => setDialog(null)}
          onCopy={(text) => {
            void navigator.clipboard
              .writeText(text)
              .then(() => flash('Prompt copied.'))
              .catch(() =>
                flash(
                  'Clipboard unavailable. Select and copy the prompt text.',
                ),
              );
          }}
        />
      )}
      {dialog === 'reset' && (
        <ConfirmDialog
          title="Replace with sample workspace?"
          action="Replace workspace"
          description="This replaces all current data with fictional Project Atlas content and enables its WebMCP tools. Export a backup first."
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await loadDemoWorkspace();
            setDialog(null);
          }}
        />
      )}
      {dialog === 'import' && (
        <ConfirmDialog
          title="Replace from backup?"
          action="Import backup"
          description="This replaces all content and clears activity and undo history. Export your current workspace first. Imported agent access stays off until you enable it."
          onClose={() => {
            setImportText('');
            setDialog(null);
          }}
          onConfirm={async () => {
            await importWorkspace(importText);
            setImportText('');
            setDialog(null);
            flash('Workspace imported. Agent access is off.');
          }}
        />
      )}
      {dialog === 'clear' && (
        <ConfirmDialog
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await clearAllLocalData();
            setDialog(null);
          }}
        />
      )}
      {notice && (
        <output className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm shadow-2xl">
          {notice}
        </output>
      )}
    </main>
  );
}

function Logo() {
  return (
    <div className="grid size-9 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,.12)]">
      <Boxes className="size-[18px]" />
    </div>
  );
}

function Sidebar({
  snapshot,
  activeSpace,
  view,
  setView,
  onSpace,
}: {
  snapshot: WorkspaceSnapshot;
  activeSpace?: Space;
  view: View;
  setView: (view: View) => void;
  onSpace: (id: string) => void;
}) {
  const nav = [
    [LayoutDashboard, 'Dashboard', 'dashboard'],
    [FolderKanban, 'Spaces', 'spaces'],
    [Boxes, 'Context Packs', 'packs'],
    [Activity, 'Activity', 'activity'],
    [Settings, 'Settings', 'settings'],
  ] as const;
  return (
    <aside className="hidden border-r border-white/8 px-3 py-5 xl:block">
      <nav aria-label="Primary navigation" className="space-y-1">
        {nav.map(([Icon, label, key]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm ${view === key ? 'bg-white/7 text-white' : 'text-muted-foreground hover:bg-white/5 hover:text-white'}`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>
      <div className="mt-8 px-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-muted-foreground">
        Spaces
      </div>
      <div className="mt-2 space-y-1">
        {snapshot.spaces.map((space) => (
          <button
            key={space.id}
            onClick={() => onSpace(space.id)}
            className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm ${space.id === activeSpace?.id ? 'bg-cyan-300/8 text-cyan-100' : 'text-muted-foreground hover:bg-white/5'}`}
          >
            <span
              className={`size-1.5 rounded-full ${space.id === activeSpace?.id ? 'bg-cyan-300' : 'bg-slate-600'}`}
            />
            <span className="flex-1 truncate">{space.name}</span>
            <span className="font-mono text-[10px] opacity-60">
              {
                snapshot.items.filter((item) => item.spaceId === space.id)
                  .length
              }
            </span>
          </button>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-white/8 bg-white/[0.025] p-3">
        <div className="flex items-center gap-2 text-xs font-medium">
          <LockKeyhole className="size-3.5 text-cyan-300" /> Local-first
        </div>
        <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
          Your workspace stays in this browser.
        </p>
      </div>
    </aside>
  );
}

function Dashboard({
  snapshot,
  activeSpace,
  activePack,
  accessibleItems,
  visibleItems,
  openTasks,
  actionsToday,
  query,
  onItem,
  onDemo,
}: {
  snapshot: WorkspaceSnapshot;
  activeSpace?: Space;
  activePack?: ContextPack;
  accessibleItems: PersonalItem[];
  visibleItems: PersonalItem[];
  openTasks: number;
  actionsToday: number;
  query: string;
  onItem: (item: PersonalItem) => void;
  onDemo: () => void;
}) {
  const [visibleCount, setVisibleCount] = useState(30);
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {activeSpace?.name ?? 'Workspace'}{' '}
            <ChevronRight className="size-3" /> Dashboard
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
            {query ? 'Search results' : 'Your workspace'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The same live context, controlled by you and available to your
            agent.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={onDemo}
          className="border-cyan-300/20 bg-cyan-300/5 text-cyan-100"
        >
          <Sparkles className="text-cyan-300" /> Use with an agent
        </Button>
      </div>
      <section className="mt-6 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.045] p-5">
        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-start gap-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">
                Active agent context
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">
                  {activePack?.name ?? 'No active Context Pack'}
                </h2>
                <Badge
                  variant="outline"
                  className="border-white/10 bg-white/5 text-slate-300"
                >
                  {accessibleItems.length} accessible items
                </Badge>
              </div>
              <p className="mt-1.5 text-sm leading-5 text-slate-400">
                {activePack?.description ??
                  'Create and activate a Context Pack before sharing context.'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-emerald-300/10 text-emerald-200">
              Read scoped
            </Badge>
            <Badge className="bg-cyan-300/10 text-cyan-200">Write gated</Badge>
          </div>
        </div>
      </section>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Total items"
          value={snapshot.items.length}
          detail={`Across ${snapshot.spaces.length} spaces`}
        />
        <Metric
          label="Open tasks"
          value={openTasks}
          detail="Derived from live state"
        />
        <Metric
          label="Active pack"
          value={activePack?.name.split(' ')[0] ?? 'None'}
          detail={`${accessibleItems.length} accessible`}
        />
        <Metric label="Agent actions" value={actionsToday} detail="Today" />
      </div>
      <div className="mt-7">
        <h2 className="text-sm font-semibold">
          {query ? `Results for “${query}”` : 'Current workspace'}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {visibleItems.length} matching items
        </p>
      </div>
      {visibleItems.length ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {visibleItems.slice(0, visibleCount).map((item) => (
            <ItemCard key={item.id} item={item} onOpen={() => onItem(item)} />
          ))}
        </div>
      ) : (
        <Empty
          icon={Search}
          title="No search results"
          body={
            snapshot.spaces.length
              ? 'Try fewer terms, another Space, or add an item.'
              : 'Open Spaces in the navigation and create your first Space.'
          }
        />
      )}
      {visibleItems.length > visibleCount && (
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => setVisibleCount(visibleCount + 30)}
        >
          Show more items
        </Button>
      )}
    </>
  );
}
function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3.5">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-mono text-xl font-semibold">
        {value}
      </div>
      <div className="text-[10px] text-slate-500">{detail}</div>
    </div>
  );
}
function ItemCard({
  item,
  onOpen,
}: {
  item: PersonalItem;
  onOpen: () => void;
}) {
  const Icon = typeIcons[item.type];
  return (
    <button
      onClick={onOpen}
      className="rounded-xl border border-white/8 bg-card/70 p-4 text-left hover:border-white/14 hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-cyan-300"
    >
      <div className="flex items-center justify-between">
        <div
          className={`grid size-8 place-items-center rounded-lg ${typeTone[item.type]}`}
        >
          <Icon className="size-4" />
        </div>
        <span className="text-[10px] text-slate-500">
          {item.createdBy === 'agent'
            ? 'Agent created'
            : item.createdBy === 'demo'
              ? 'Demo data'
              : 'Human created'}
        </span>
      </div>
      <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {item.type}
        {item.type === 'task' && item.completed ? ' · completed' : ''}
      </div>
      <h3 className="mt-1 text-sm font-semibold">{item.title}</h3>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">
        {item.body || 'No details yet.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {item.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded-md bg-white/5 px-2 py-1 text-[10px] text-slate-400"
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}

function SpacesView({
  snapshot,
  activeSpace,
  onSelect,
  onCreate,
  onRename,
}: {
  snapshot: WorkspaceSnapshot;
  activeSpace?: Space;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (space: Space) => void;
}) {
  return (
    <>
      <Heading
        eyebrow="Organization"
        title="Spaces"
        body="High-level homes for every note, task, bookmark, and snippet."
        action={
          <Button onClick={onCreate} className="bg-cyan-300 text-slate-950">
            <Plus /> Create Space
          </Button>
        }
      />
      {snapshot.spaces.length ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {snapshot.spaces.map((space) => (
            <article
              key={space.id}
              className={`rounded-2xl border p-5 ${space.id === activeSpace?.id ? 'border-cyan-300/25 bg-cyan-300/5' : 'border-white/8 bg-white/[0.025]'}`}
            >
              <div className="flex justify-between">
                <div className="grid size-10 place-items-center rounded-xl bg-white/5">
                  <FolderKanban className="size-5" />
                </div>
                <button
                  onClick={() => onRename(space)}
                  aria-label={`Rename ${space.name}`}
                  className="rounded-lg p-2 text-slate-500 hover:bg-white/5"
                >
                  <Pencil className="size-4" />
                </button>
              </div>
              <h2 className="mt-4 font-semibold">{space.name}</h2>
              <p className="mt-1 min-h-10 text-xs leading-5 text-slate-400">
                {space.description || 'No description.'}
              </p>
              <div className="mt-4 flex justify-between text-xs">
                <span className="text-slate-500">
                  {
                    snapshot.items.filter((item) => item.spaceId === space.id)
                      .length
                  }{' '}
                  items
                </span>
                <button
                  onClick={() => onSelect(space.id)}
                  className="text-cyan-300"
                >
                  Open Space →
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          icon={FolderKanban}
          title="No Spaces yet"
          body="Create a Space to start organizing context."
        />
      )}
    </>
  );
}

function PacksView({
  snapshot,
  activePack,
  onActivate,
  onCreate,
}: {
  snapshot: WorkspaceSnapshot;
  activePack?: ContextPack;
  onActivate: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <>
      <Heading
        eyebrow="Agent scope"
        title="Context Packs"
        body="Temporary, understandable bundles of information the agent may work with."
        action={
          <Button onClick={onCreate} className="bg-cyan-300 text-slate-950">
            <Plus /> Create Pack
          </Button>
        }
      />
      {snapshot.packs.length ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {snapshot.packs.map((pack) => {
            const count = snapshot.items.filter(
              (item) =>
                (pack.spaceIds.includes(item.spaceId) ||
                  pack.itemIds.includes(item.id)) &&
                pack.allowedTypes.includes(item.type),
            ).length;
            return (
              <article
                key={pack.id}
                className={`rounded-2xl border p-5 ${pack.id === activePack?.id ? 'border-cyan-300/25 bg-cyan-300/5' : 'border-white/8 bg-white/[0.025]'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="grid size-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200">
                    <Boxes className="size-5" />
                  </div>
                  {pack.id === activePack?.id && (
                    <Badge className="bg-cyan-300 text-slate-950">Active</Badge>
                  )}
                </div>
                <h2 className="mt-4 font-semibold">{pack.name}</h2>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {pack.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {pack.allowedTypes.map((type) => (
                    <span
                      key={type}
                      className="rounded-md bg-white/5 px-2 py-1 text-[10px] capitalize text-slate-400"
                    >
                      {type}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {count} accessible items
                  </span>
                  {pack.id !== activePack?.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onActivate(pack.id)}
                    >
                      Activate
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty
          icon={Boxes}
          title="No Context Packs"
          body="Create a Pack to define what the agent can use right now."
        />
      )}
    </>
  );
}

function ActivityView({
  snapshot,
  onUndo,
}: {
  snapshot: WorkspaceSnapshot;
  onUndo: (id: string) => void;
}) {
  return (
    <>
      <Heading
        eyebrow="Transparent collaboration"
        title="Activity"
        body="A readable audit trail of human, demo, and agent operations."
      />
      {snapshot.activity.length ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/8">
          {snapshot.activity.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-3 border-b border-white/8 bg-white/[0.02] p-4 last:border-0 sm:flex-row sm:items-center"
            >
              <div
                className={`grid size-9 place-items-center rounded-xl ${entry.status === 'denied' ? 'bg-rose-300/10 text-rose-200' : 'bg-cyan-300/10 text-cyan-200'}`}
              >
                {entry.status === 'denied' ? (
                  <CircleAlert className="size-4" />
                ) : (
                  <Activity className="size-4" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{entry.result}</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {entry.actor} · {entry.tool} ·{' '}
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
              </div>
              {entry.undoId &&
                entry.status === 'success' &&
                entry.actor === 'agent' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUndo(entry.id)}
                  >
                    <Undo2 /> Undo
                  </Button>
                )}
            </div>
          ))}
        </div>
      ) : (
        <Empty
          icon={Activity}
          title="No activity yet"
          body="Human and agent operations appear here."
        />
      )}
    </>
  );
}

function SettingsView({
  onExport,
  onImport,
  onReset,
  onClear,
}: {
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
  onClear: () => void;
}) {
  return (
    <>
      <Heading
        eyebrow="Local data controls"
        title="Settings"
        body="Move, reset, or remove the browser-local workspace without an account."
      />
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <SettingCard
          icon={Download}
          title="Export JSON"
          body="Download a portable, versioned backup."
          action="Export workspace"
          onClick={onExport}
        />
        <SettingCard
          icon={Import}
          title="Import JSON"
          body="Validate and replace from a Compass backup, up to 20 MB."
          action="Choose file"
          onClick={onImport}
        />
        <SettingCard
          icon={RotateCcw}
          title="Reset Demo Data"
          body="Replace state with fictional Project Atlas."
          action="Reset demo"
          onClick={onReset}
        />
        <SettingCard
          icon={Trash2}
          title="Clear All Local Data"
          body="Remove all Compass data from this browser."
          action="Clear data"
          onClick={onClear}
          danger
        />
      </div>
      <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.025] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4 text-cyan-300" /> Trust boundary
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          Stored content is untrusted data. Compass never evaluates snippets,
          executes note text, or lets item content change permissions.
        </p>
      </div>
    </>
  );
}
function SettingCard({
  icon: Icon,
  title,
  body,
  action,
  onClick,
  danger,
}: {
  icon: typeof Download;
  title: string;
  body: string;
  action: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
      <div
        className={`grid size-10 place-items-center rounded-xl ${danger ? 'bg-rose-300/10 text-rose-200' : 'bg-cyan-300/10 text-cyan-200'}`}
      >
        <Icon className="size-5" />
      </div>
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mt-1 min-h-10 text-xs leading-5 text-slate-400">{body}</p>
      <Button className="mt-4" variant="outline" onClick={onClick}>
        {action}
      </Button>
    </article>
  );
}

function AgentRail({
  snapshot,
  activePack,
  accessibleItems,
  supported,
  registered,
  onPermissions,
  onToggleType,
  onTools,
  onActivity,
  onUndo,
}: {
  snapshot: WorkspaceSnapshot;
  activePack?: ContextPack;
  accessibleItems: PersonalItem[];
  supported: boolean;
  registered: string[];
  onPermissions: (patch: Partial<AgentPermissions>) => Promise<void>;
  onToggleType: (type: ItemType) => Promise<void>;
  onTools: () => void;
  onActivity: () => void;
  onUndo: (id: string) => void;
}) {
  const settings = snapshot.settings!;
  return (
    <aside className="border-t border-white/8 px-4 py-5 lg:px-6 xl:border-l xl:border-t-0">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-cyan-300" />
            <h2 className="text-sm font-semibold">Agent Access</h2>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Rules are enforced inside every tool.
          </p>
        </div>
        <span
          className={`size-2 rounded-full ${supported && settings.permissions.webmcpEnabled ? 'bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.7)]' : 'bg-slate-600'}`}
        />
      </div>
      <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.025] p-3.5">
        <AccessRow
          label="WebMCP enabled"
          description={
            supported ? 'Tools available to agents' : 'Browser API unavailable'
          }
          checked={settings.permissions.webmcpEnabled}
          onChange={(value) => onPermissions({ webmcpEnabled: value })}
        />
        <AccessRow
          label="Allow read"
          description="Search and retrieve context"
          checked={settings.permissions.readEnabled}
          onChange={(value) => onPermissions({ readEnabled: value })}
        />
        <AccessRow
          label="Allow write"
          description="Create and update items"
          checked={settings.permissions.writeEnabled}
          onChange={(value) => onPermissions({ writeEnabled: value })}
        />
        <div className="my-3 border-t border-white/8" />
        <div className="grid grid-cols-2 gap-2">
          {ITEM_TYPES.map((type) => {
            const Icon = typeIcons[type];
            const allowed = settings.permissions.allowedTypes[type];
            return (
              <button
                key={type}
                aria-pressed={allowed}
                onClick={() => void onToggleType(type)}
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] capitalize ${allowed ? 'border-cyan-300/10 bg-cyan-300/5 text-cyan-100' : 'border-white/8 text-slate-500'}`}
              >
                <Icon className="size-3.5" /> {type}s
              </button>
            );
          })}
        </div>
        <div className="mt-3 rounded-lg bg-white/[0.025] p-2.5">
          <div className="text-[9px] uppercase tracking-[0.14em] text-slate-600">
            Active Context Pack
          </div>
          <div className="mt-1 flex justify-between text-xs">
            <span>{activePack?.name ?? 'None'}</span>
            <span className="font-mono text-[10px] text-slate-500">
              {accessibleItems.length} items
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          className="mt-3 h-8 w-full text-xs"
          onClick={onTools}
        >
          View {registered.length} exposed tools
        </Button>
      </div>
      <div className="mt-7 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Agent Activity</h2>
        <button onClick={onActivity} className="text-[11px] text-cyan-300">
          View all
        </button>
      </div>
      <div className="mt-3 space-y-1">
        {snapshot.activity.slice(0, 4).map((entry) => (
          <div key={entry.id} className="flex gap-3 py-2.5">
            <div
              className={`grid size-7 shrink-0 place-items-center rounded-lg ${entry.status === 'denied' ? 'bg-rose-300/10 text-rose-200' : 'bg-white/5'}`}
            >
              <Activity className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-medium">{entry.operation}</div>
              <div className="line-clamp-2 text-[10px] text-slate-500">
                {entry.result}
              </div>
              {entry.actor === 'agent' &&
                entry.undoId &&
                entry.status === 'success' && (
                  <button
                    onClick={() => onUndo(entry.id)}
                    className="mt-1 text-[10px] text-cyan-300"
                  >
                    Undo
                  </button>
                )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-violet-300/10 bg-violet-300/5 p-3.5">
        <div className="flex items-center gap-2 text-[11px] font-medium text-violet-200">
          <Sparkles className="size-3.5" /> Human remains in control
        </div>
        <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
          Agent writes are logged and recent changes can be undone.
        </p>
      </div>
    </aside>
  );
}
function AccessRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void | Promise<void>;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <div className="text-[11px] font-medium">{label}</div>
        <div className="text-[9px] text-slate-500">{description}</div>
      </div>
      <Switch
        aria-label={label}
        checked={checked}
        onCheckedChange={onChange}
        size="sm"
      />
    </div>
  );
}

function ItemDialog({
  snapshot,
  item,
  onClose,
  onSaved,
}: {
  snapshot: WorkspaceSnapshot;
  item?: PersonalItem;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [editing, setEditing] = useState(!item);
  const [linking, setLinking] = useState(false);
  const [targetId, setTargetId] = useState('');
  const [relationType, setRelationType] = useState<
    'related' | 'supports' | 'blocks' | 'references' | 'follow_up'
  >('related');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const relations = item
    ? snapshot.relations.filter(
        (relation) =>
          relation.sourceId === item.id || relation.targetId === item.id,
      )
    : [];
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const type = item?.type ?? (String(data.get('type')) as ItemType);
    const input = {
      type,
      spaceId: String(data.get('spaceId')),
      title: String(data.get('title')),
      body: String(data.get('body')),
      tags: String(data.get('tags'))
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      dueDate: String(data.get('dueDate') || '') || undefined,
      priority: String(data.get('priority') || '') as
        | 'low'
        | 'medium'
        | 'high'
        | '',
      url: String(data.get('url') || '') || undefined,
      language: String(data.get('language') || '') || undefined,
      completed: item?.completed ?? false,
    };
    if (saving) return;
    setSaving(true);
    try {
      if (item) {
        const { type: _type, ...patch } = input;
        await updateItem(
          item.id,
          {
            ...patch,
            priority: input.priority || null,
            dueDate: input.dueDate || null,
            url: input.url || null,
            language: input.language || null,
          },
          'human',
          'human_update_item',
          item,
        );
      } else
        await createItem(
          { ...input, priority: input.priority || undefined },
          'human',
        );
      onSaved(item ? 'Item updated.' : 'Item created.');
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Could not save item.',
      );
    } finally {
      setSaving(false);
    }
  };
  const link = async () => {
    if (!item || !targetId) return;
    try {
      await linkItems(item.id, targetId, relationType, 'human');
      onSaved('Items linked.');
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Could not link items.',
      );
    }
  };
  return (
    <Dialog
      title={item?.title ?? 'Add personal item'}
      subtitle={
        item
          ? `${item.type} · ${item.createdBy} created`
          : 'Human-created and browser-local'
      }
      onClose={onClose}
      wide
    >
      {editing ? (
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <select
              name="type"
              defaultValue={item?.type ?? 'note'}
              disabled={Boolean(item)}
              className="control"
            >
              {ITEM_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </Field>
          <Field label="Space">
            <select
              name="spaceId"
              defaultValue={item?.spaceId ?? snapshot.settings?.activeSpaceId}
              className="control"
            >
              {snapshot.spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title" className="sm:col-span-2">
            <Input
              name="title"
              defaultValue={item?.title}
              required
              maxLength={160}
            />
          </Field>
          <Field label="Body" className="sm:col-span-2">
            <textarea
              name="body"
              defaultValue={item?.body}
              rows={7}
              maxLength={20000}
              className="control"
            />
          </Field>
          <Field label="Tags">
            <Input
              name="tags"
              defaultValue={item?.tags.join(', ')}
              placeholder="launch, blocker"
            />
          </Field>
          <Field label="Priority">
            <select
              name="priority"
              defaultValue={item?.priority ?? ''}
              className="control"
            >
              <option value="">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>
          <Field label="Due date">
            <Input name="dueDate" type="date" defaultValue={item?.dueDate} />
          </Field>
          <Field label="Bookmark URL">
            <Input name="url" type="url" defaultValue={item?.url} />
          </Field>
          <Field label="Snippet language">
            <Input name="language" defaultValue={item?.language} />
          </Field>
          {error && (
            <p className="sm:col-span-2 text-xs text-rose-300">{error}</p>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => (item ? setEditing(false) : onClose())}
            >
              Cancel
            </Button>
            <Button disabled={saving} className="bg-cyan-300 text-slate-950">
              {saving ? 'Saving…' : 'Save item'}
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
            {item?.body || 'No body text.'}
          </p>
          {item?.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300"
            >
              Open bookmark <ExternalLink className="size-3.5" />
            </a>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {item?.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
          {relations.length > 0 && (
            <div className="mt-5 border-t border-white/8 pt-4">
              <h3 className="text-xs font-semibold text-slate-500">
                RELATED ITEMS
              </h3>
              {relations.map((relation) => {
                const otherId =
                  relation.sourceId === item?.id
                    ? relation.targetId
                    : relation.sourceId;
                return (
                  <div key={relation.id} className="mt-2 flex gap-2 text-xs">
                    <Link2 className="size-3.5 text-cyan-300" />{' '}
                    {relation.relation.replace('_', ' ')} ·{' '}
                    {snapshot.items.find(
                      (candidate) => candidate.id === otherId,
                    )?.title ?? 'Unavailable'}
                  </div>
                );
              })}
            </div>
          )}
          {linking && (
            <div className="mt-5 space-y-3 rounded-xl border border-white/10 p-3">
              <Field label="Link to item">
                <select
                  className="control"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                >
                  <option value="">Choose an item</option>
                  {snapshot.items
                    .filter((candidate) => candidate.id !== item?.id)
                    .map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.title}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Relation">
                <select
                  className="control"
                  value={relationType}
                  onChange={(e) =>
                    setRelationType(e.target.value as typeof relationType)
                  }
                >
                  {[
                    'related',
                    'supports',
                    'blocks',
                    'references',
                    'follow_up',
                  ].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </Field>
              <Button disabled={!targetId} onClick={() => void link()}>
                Save link
              </Button>
            </div>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            {item?.type === 'task' && (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await completeTask(item.id, !item.completed, 'human');
                    onSaved(
                      item.completed ? 'Task reopened.' : 'Task completed.',
                    );
                  } catch (reason) {
                    setError(
                      reason instanceof Error
                        ? reason.message
                        : 'Task change failed.',
                    );
                  }
                }}
              >
                {item.completed ? (
                  'Reopen task'
                ) : (
                  <>
                    <Check /> Complete task
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={() => setLinking(!linking)}>
              <Link2 /> Link item
            </Button>
            <Button
              onClick={() => setEditing(true)}
              className="bg-cyan-300 text-slate-950"
            >
              <Pencil /> Edit
            </Button>
          </div>
          {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
        </div>
      )}
    </Dialog>
  );
}

function PackDialog({
  snapshot,
  onClose,
  onSaved,
}: {
  snapshot: WorkspaceSnapshot;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string>();
  return (
    <Dialog
      title="Create Context Pack"
      subtitle="New Packs are never activated automatically"
      onClose={onClose}
      wide
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          try {
            await createPack(
              {
                name: String(data.get('name')),
                description: String(data.get('description')),
                spaceIds: data.getAll('spaceIds').map(String),
                itemIds: data.getAll('itemIds').map(String),
                allowedTypes: data
                  .getAll('allowedTypes')
                  .map(String) as ItemType[],
              },
              false,
            );
            onSaved();
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : 'Could not create Pack.',
            );
          }
        }}
      >
        <Field label="Pack name">
          <Input name="name" required maxLength={160} />
        </Field>
        <Field label="Description">
          <textarea
            name="description"
            className="control"
            rows={3}
            maxLength={1000}
            required
          />
        </Field>
        <fieldset>
          <legend className="text-xs font-medium">Entire Spaces</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {snapshot.spaces.map((space) => (
              <label
                key={space.id}
                className="flex items-center gap-2 rounded-lg border border-white/8 p-2.5 text-xs"
              >
                <input type="checkbox" name="spaceIds" value={space.id} />{' '}
                {space.name}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-xs font-medium">Allowed types</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ITEM_TYPES.map((type) => (
              <label
                key={type}
                className="flex items-center gap-2 rounded-lg border border-white/8 p-2.5 text-xs capitalize"
              >
                <input
                  type="checkbox"
                  name="allowedTypes"
                  value={type}
                  defaultChecked
                />{' '}
                {type}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-xs font-medium">
            Individual items{' '}
            <span className="font-normal text-slate-500">(optional)</span>
          </legend>
          <div className="mt-2 max-h-40 space-y-1 overflow-auto rounded-xl border border-white/8 p-2">
            {snapshot.items.map((item) => (
              <label
                key={item.id}
                className="flex items-center gap-2 rounded-lg p-2 text-xs hover:bg-white/5"
              >
                <input type="checkbox" name="itemIds" value={item.id} />
                <span className="capitalize text-slate-500">{item.type}</span>
                <span className="truncate">{item.title}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p className="text-xs text-rose-300">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="bg-cyan-300 text-slate-950">Create Pack</Button>
        </div>
      </form>
    </Dialog>
  );
}
function SpaceDialog({
  space,
  onClose,
  onSaved,
}: {
  space?: Space;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string>();
  return (
    <Dialog
      title={space ? 'Rename Space' : 'Create Space'}
      subtitle="A high-level home for related context"
      onClose={onClose}
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          try {
            if (space) await renameSpace(space.id, String(data.get('name')));
            else
              await createSpace(
                String(data.get('name')),
                String(data.get('description')),
              );
            onSaved();
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : 'Could not create Space.',
            );
          }
        }}
      >
        <Field label="Name">
          <Input
            name="name"
            defaultValue={space?.name}
            required
            maxLength={160}
          />
        </Field>
        <Field label="Description">
          <textarea
            name="description"
            defaultValue={space?.description}
            disabled={Boolean(space)}
            rows={3}
            className="control"
            maxLength={500}
          />
        </Field>
        {error && <p className="text-xs text-rose-300">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="bg-cyan-300 text-slate-950">
            {space ? 'Save name' : 'Create Space'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ToolsDialog({
  settings,
  registered,
  onClose,
}: {
  settings: NonNullable<WorkspaceSnapshot['settings']>;
  registered: string[];
  onClose: () => void;
}) {
  const exposed = exposedToolInfo(settings);
  return (
    <Dialog
      title="Exposed WebMCP tools"
      subtitle={`${registered.length} registered in this browser right now`}
      onClose={onClose}
      wide
    >
      <div className="space-y-2">
        {TOOL_INFO.map(([name, mode, description]) => {
          const active = exposed.some(([tool]) => tool === name);
          return (
            <div
              key={name}
              className={`rounded-xl border p-3.5 ${active ? 'border-cyan-300/15 bg-cyan-300/[0.04]' : 'border-white/8 opacity-45'}`}
            >
              <div className="flex justify-between">
                <code className="text-xs font-semibold">{name}</code>
                <Badge
                  variant="outline"
                  className={
                    mode === 'write'
                      ? 'border-amber-300/15 text-amber-200'
                      : 'border-emerald-300/15 text-emerald-200'
                  }
                >
                  {mode}
                </Badge>
              </div>
              <p className="mt-2 text-[11px] leading-4 text-slate-400">
                {description}
              </p>
              {!active && (
                <div className="mt-2 text-[10px] text-rose-300">
                  Not exposed under current permission toggles.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Dialog>
  );
}
function DemoDialog({
  onClose,
  onCopy,
}: {
  onClose: () => void;
  onCopy: (text: string) => void;
}) {
  return (
    <Dialog
      title="Use with an agent"
      subtitle="Start with the fictional Atlas sample, or your own active Pack"
      onClose={onClose}
      wide
    >
      <ol className="space-y-2 text-sm text-slate-300">
        {[
          'Confirm the fictional Atlas Launch demo is active.',
          'Leave WebMCP, Read, and Write enabled.',
          'Open this site in ChatGPT’s in-app browser or another browser that provides WebMCP.',
          'Give the agent the primary prompt and watch the UI update live.',
          'Disable Write and try the permission-denial prompt.',
        ].map((step, index) => (
          <li key={step} className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-cyan-300/10 font-mono text-xs text-cyan-200">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <Prompt title="Example prompt" value={primaryPrompt} onCopy={onCopy} />
      <Prompt
        title="Accessibility follow-up"
        value={accessibilityPrompt}
        onCopy={onCopy}
      />
      <Prompt
        title="Permission denial"
        value="Create a task called Publish final release."
        note="Disable Write first. Write tools disappear. A previously retained tool call is also denied."
        onCopy={onCopy}
      />
    </Dialog>
  );
}
function Prompt({
  title,
  value,
  note,
  onCopy,
}: {
  title: string;
  value: string;
  note?: string;
  onCopy: (value: string) => void;
}) {
  return (
    <div className="mt-4 rounded-xl border border-white/8 bg-black/20 p-4">
      <div className="flex justify-between gap-3">
        <h3 className="text-xs font-semibold">{title}</h3>
        <Button size="sm" variant="outline" onClick={() => onCopy(value)}>
          <Copy /> Copy
        </Button>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">“{value}”</p>
      {note && <p className="mt-2 text-[10px] text-amber-200">{note}</p>}
    </div>
  );
}
function ConfirmDialog({
  title = 'Clear all local data?',
  action = 'Clear local data',
  description = 'This removes every Space, item, Context Pack, relation, and activity entry. Export first if you need a backup.',
  onClose,
  onConfirm,
}: {
  title?: string;
  action?: string;
  description?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      title={title}
      subtitle="This affects only this browser"
      onClose={onClose}
    >
      <p className="text-sm leading-6 text-slate-400">{description}</p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-300">
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } catch (reason) {
              setError(
                reason instanceof Error ? reason.message : 'Operation failed.',
              );
            } finally {
              setBusy(false);
            }
          }}
          className="bg-rose-300 text-slate-950"
        >
          {action}
        </Button>
      </div>
    </Dialog>
  );
}

function Dialog({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      aria-labelledby="dialog-title"
      className={`fixed m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950 p-5 text-foreground shadow-2xl backdrop:bg-black/70 ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
    >
      <div className="mb-5 flex justify-between gap-4">
        <div>
          <h2 id="dialog-title" className="font-semibold">
            {title}
          </h2>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="rounded-lg p-2 text-slate-500 hover:bg-white/5"
        >
          <X className="size-4" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-medium text-slate-300"
      >
        {label}
      </label>
      {isValidElement<{ id?: string }>(children)
        ? cloneElement(children, { id })
        : children}
    </div>
  );
}

function Heading({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
          {eyebrow}
        </div>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{body}</p>
      </div>
      {action}
    </div>
  );
}
function Empty({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Search;
  title: string;
  body: string;
}) {
  return (
    <div className="mt-6 grid min-h-56 place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-6 text-center">
      <div>
        <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-white/5">
          <Icon className="size-5" />
        </div>
        <h3 className="mt-4 text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">{body}</p>
      </div>
    </div>
  );
}
function statusLabel(
  supported: boolean,
  enabled: boolean,
  write: boolean,
  pack?: ContextPack,
) {
  if (!supported) return 'WebMCP unavailable';
  if (!enabled) return 'Disabled by user';
  if (!pack) return 'No active context';
  if (!write) return 'Write restricted';
  return 'WebMCP ready';
}
