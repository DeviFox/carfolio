"use client";

// Keeps a signed-in owner's garage on the server.
//
// The UI keeps writing to the local store (lib/store.ts) exactly as before:
// instant, and working offline. This module watches the store, turns every
// change into per-record upserts and deletes, and sends them in batches.
// Unsent changes wait in an outbox in localStorage, so a closed tab or a
// lost connection only delays them. The server is the source of truth: on
// sign-in and whenever the tab comes back, the store is refreshed from it,
// with the outbox laid on top.
//
// A guest's garage stays in this browser only. On the first sign-in it is
// added to the account (merged, never overwriting what the account has).

import { create } from "zustand";
import { ApiError, api, type GarageChanges, type GarageCollection, type GarageSnapshot, type User } from "./api";
import { useAuth } from "./auth";
import { newId, useGarage } from "./store";
import type { ID } from "./types";

const COLLECTIONS: GarageCollection[] = [
  "vehicles",
  "systems",
  "components",
  "installedParts",
  "events",
  "mileageHistory",
  "inspections",
  "reminders",
];

const OUTBOX_KEY = "carvisio.outbox.v1";
// A guest garage the owner chose not to add to the account. It comes back
// on sign-out, so declining loses nothing.
const GUEST_KEY = "carvisio.guest-garage.v1";
// The garage as it was before each time this module replaced records on
// screen with the server's copy: a way back from any sync bug.
const BACKUPS_KEY = "carvisio.backups.v1";
const BACKUPS_KEPT = 3;

const IMPORT_TIMEOUT_MS = 60_000;
const FLUSH_DELAY_MS = 500;
const MAX_RETRY_MS = 60_000;
// Coming back to the tab refreshes from the server, at most this often.
const PULL_EVERY_MS = 15_000;

type Rec = { id: ID };

// What the UI shows about syncing, and the one question it may ask.
type SyncState = {
  // The last attempt to reach the server failed; changes are waiting.
  offline: boolean;
  // Changes the server refused. They stay in this browser, on screen, and
  // are offered to the server again on the next visit.
  refused: number;
  // A guest garage meets an account that already has cars: add them?
  offer: { newCars: number; accountCars: number } | null;
};

export const useSync = create<SyncState>(() => ({ offline: false, refused: 0, offer: null }));

// ---- outbox ---------------------------------------------------------------

// One pending write per record: a later change to the same record replaces
// the earlier one. item null means delete. Entries are replaced, never
// mutated, so a flush can tell whether one changed while it was in flight.
// refused holds the server's reason when it would not take this write; such
// an entry is kept, never dropped, and not resent until the next page load
// or the next edit of the same record.
type Entry = { c: GarageCollection; id: ID; item: Rec | null; refused?: string };

let outbox = new Map<string, Entry>();
let outboxOwner: ID | null = null;

function put(c: GarageCollection, id: ID, item: Rec | null) {
  outbox.set(`${c}:${id}`, { c, id, item });
}

function saveOutbox() {
  try {
    if (outbox.size === 0) localStorage.removeItem(OUTBOX_KEY);
    else localStorage.setItem(OUTBOX_KEY, JSON.stringify({ owner: outboxOwner, entries: [...outbox.values()] }));
  } catch {
    // Storage full or blocked: the changes still go out from memory.
  }
}

function loadOutbox() {
  try {
    const saved = JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "null") as
      | { owner: ID; entries: Entry[] }
      | null;
    outboxOwner = saved?.owner ?? null;
    // A new page load gives refused writes another try: the server may have
    // been fixed since.
    outbox = new Map((saved?.entries ?? []).map((e) => [`${e.c}:${e.id}`, { c: e.c, id: e.id, item: e.item }]));
  } catch {
    outboxOwner = null;
    outbox = new Map();
  }
}

// The writes that turn prev into next. The store never mutates a record in
// place, so a record whose object changed is a record that changed.
function diffInto(c: GarageCollection, prev: Rec[], next: Rec[]) {
  const before = new Map(prev.map((r) => [r.id, r]));
  for (const r of next) {
    if (before.get(r.id) !== r) put(c, r.id, r);
    before.delete(r.id);
  }
  for (const id of before.keys()) put(c, id, null);
}

const sendable = () => [...outbox.entries()].filter(([, e]) => !e.refused);

function publish() {
  let refused = 0;
  for (const e of outbox.values()) if (e.refused) refused++;
  useSync.setState({ offline: false, refused });
}

// Server order for single writes: parents' upserts first, children's
// deletes first, as Store.Apply does for a batch.
function rank(e: Entry): number {
  const i = COLLECTIONS.indexOf(e.c);
  return e.item ? i : 2 * COLLECTIONS.length - i;
}

// The server refused the batch as a whole (400/409), which says nothing
// about which records are at fault. Sending them one by one lets every good
// record through and pins the refusal on the bad ones.
const isRefusal = (err: unknown) =>
  err instanceof ApiError && (err.status === 400 || err.status === 409 || err.status === 413);

function toChanges(entries: Entry[]): GarageChanges {
  const changes: GarageChanges = { upsert: {}, delete: {} };
  for (const e of entries) {
    if (e.item) ((changes.upsert[e.c] ??= []) as Rec[]).push(e.item);
    else (changes.delete[e.c] ??= []).push(e.id);
  }
  return changes;
}

// ---- store access ---------------------------------------------------------

// The account whose garage the store holds and whose changes are being sent.
let session: { userId: ID } | null = null;
// Set while this module writes to the store, so its own writes aren't
// mistaken for the owner's edits.
let applyingRemote = false;

function snapshotOf(state: GarageSnapshot): GarageSnapshot {
  const out = {} as GarageSnapshot;
  for (const c of COLLECTIONS) (out as Record<GarageCollection, Rec[]>)[c] = state[c];
  return out;
}

const emptySnapshot = (): GarageSnapshot =>
  Object.fromEntries(COLLECTIONS.map((c) => [c, []])) as unknown as GarageSnapshot;

const hasRecords = (g: GarageSnapshot) => COLLECTIONS.some((c) => g[c].length > 0);

// Replace the store's garage with data owned by ownerId. A collection that
// came back unchanged keeps its old array, so screens don't re-render for
// nothing on every refresh.
function backup(reason: string, data: unknown, ownerId: ID | null) {
  try {
    const list = JSON.parse(localStorage.getItem(BACKUPS_KEY) ?? "[]") as unknown[];
    list.push({ at: new Date().toISOString(), reason, ownerId, data });
    localStorage.setItem(BACKUPS_KEY, JSON.stringify(list.slice(-BACKUPS_KEPT)));
  } catch {
    // Out of space: better no backup than a broken sync.
  }
}

// Whether replacing current with data takes any record off this browser.
function drops(current: GarageSnapshot, data: GarageSnapshot): boolean {
  return COLLECTIONS.some((c) => {
    const kept = new Set((data[c] as Rec[]).map((r) => r.id));
    return (current[c] as Rec[]).some((r) => !kept.has(r.id));
  });
}

function applyRemote(data: GarageSnapshot, ownerId: ID | null) {
  const current = useGarage.getState();
  if (drops(current, data)) backup("replaced by the server copy", snapshotOf(current), current.ownerId);
  applyingRemote = true;
  try {
    useGarage.setState((s) => {
      const next: Record<string, unknown> = { ownerId };
      for (const c of COLLECTIONS) {
        next[c] = JSON.stringify(s[c]) === JSON.stringify(data[c]) ? s[c] : data[c];
      }
      const lastViewed = s.lastViewedVehicleId;
      next.lastViewedVehicleId = data.vehicles.some((v) => v.id === lastViewed) ? lastViewed : null;
      return next;
    });
  } finally {
    applyingRemote = false;
  }
}

// The server's garage with the unsent changes laid on top.
function withOutbox(data: GarageSnapshot): GarageSnapshot {
  if (outbox.size === 0) return data;
  const out = {} as Record<GarageCollection, Rec[]>;
  for (const c of COLLECTIONS) {
    const byId = new Map((data[c] as Rec[]).map((r) => [r.id, r]));
    for (const e of outbox.values()) {
      if (e.c !== c) continue;
      if (e.item) byId.set(e.id, e.item);
      else byId.delete(e.id);
    }
    out[c] = [...byId.values()];
  }
  return out as unknown as GarageSnapshot;
}

// Every edit of an account's garage goes to the outbox at once, signed in
// or not yet: the first seconds of a visit, before /api/me answers, are
// edits like any other. Only sending waits for the session.
function onStoreChange(next: GarageSnapshot & { ownerId: ID | null }, prev: GarageSnapshot) {
  if (applyingRemote || next.ownerId === null) return;
  if (outboxOwner !== next.ownerId) {
    // Unsent changes of another account: set them aside, never just drop.
    if (outbox.size > 0) backup("unsent changes of another account", [...outbox.values()], outboxOwner);
    outbox = new Map();
    outboxOwner = next.ownerId;
  }
  let changed = false;
  for (const c of COLLECTIONS) {
    if (next[c] === prev[c]) continue;
    diffInto(c, prev[c], next[c]);
    changed = true;
  }
  if (!changed) return;
  saveOutbox();
  if (session?.userId === next.ownerId) scheduleFlush(FLUSH_DELAY_MS);
}

// ---- sending and refreshing -----------------------------------------------

let flushTimer: ReturnType<typeof setTimeout> | undefined;
let flushing: Promise<void> | null = null;
let flushAgain = false;
let retryMs = 0;
// Counts batches the server accepted; a refresh that overlaps one is stale.
let accepted = 0;
let lastPull = 0;

function scheduleFlush(ms: number) {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flush(), ms);
}

function flush(): Promise<void> {
  if (!session || outbox.size === 0) return Promise.resolve();
  if (flushing) {
    flushAgain = true;
    return flushing;
  }
  flushing = (async () => {
    try {
      do {
        flushAgain = false;
        if (!(await sendOnce())) break;
      } while (flushAgain && session && outbox.size > 0);
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

async function sendOnce(): Promise<boolean> {
  clearTimeout(flushTimer);
  const sent = sendable();
  if (sent.length === 0) return true;
  try {
    await api.applyGarageChanges(toChanges(sent.map(([, e]) => e)));
  } catch (err) {
    if (isRefusal(err)) return sendOneByOne(sent);
    onSendError(err);
    return false;
  }
  for (const [key, e] of sent) if (outbox.get(key) === e) outbox.delete(key);
  accepted++;
  retryMs = 0;
  saveOutbox();
  publish();
  return true;
}

async function sendOneByOne(sent: [string, Entry][]): Promise<boolean> {
  const ordered = [...sent].sort(([, a], [, b]) => rank(a) - rank(b));
  for (const [key, e] of ordered) {
    try {
      await api.applyGarageChanges(toChanges([e]));
      if (outbox.get(key) === e) outbox.delete(key);
    } catch (err) {
      if (!isRefusal(err)) {
        saveOutbox();
        onSendError(err);
        return false;
      }
      console.error(`garage sync: the server refused ${e.c}/${e.id}, kept in this browser:`, err);
      if (outbox.get(key) === e) outbox.set(key, { ...e, refused: err instanceof Error ? err.message : "refused" });
    }
  }
  accepted++;
  retryMs = 0;
  saveOutbox();
  publish();
  return true;
}

function onSendError(err: unknown) {
  const status = err instanceof ApiError ? err.status : 0;
  if (status === 401) {
    useAuth.getState().sessionLost();
    return;
  }
  // Offline, a server hiccup or rate limiting: keep the changes, try later.
  useSync.setState({ offline: true });
  retryMs = Math.min(Math.max(retryMs * 2, 2_000), MAX_RETRY_MS);
  scheduleFlush(retryMs);
}

async function pull(): Promise<void> {
  if (!session) return;
  const { userId } = session;
  const seen = accepted;
  lastPull = Date.now();
  let data: GarageSnapshot;
  try {
    data = await api.garage();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) useAuth.getState().sessionLost();
    return;
  }
  if (session?.userId !== userId) return;
  // A batch landed while this was being read: the copy may predate it.
  if (accepted !== seen) return pull();
  applyRemote(withOutbox(data), userId);
}

// Before sign-out: the outbox belongs to the account and is not sent
// without its session, so get it out first.
export async function flushBeforeLogout(): Promise<void> {
  await flush();
  // Refused writes don't hold the owner here: they stay in the outbox
  // through sign-out and are offered again on the next sign-in.
  if (session && sendable().length > 0) {
    throw new Error("unsent changes");
  }
}

// ---- entering and leaving an account --------------------------------------

// Guards against a sign-in flow still running when the account changes.
let entering: ID | null = null;

async function enterAccount(user: User) {
  if (session?.userId === user.id || entering === user.id) return;
  entering = user.id;
  try {
    if (outboxOwner !== user.id) {
      // Unsent changes of another account can't go out under this one.
      if (outbox.size > 0) backup("unsent changes of another account", [...outbox.values()], outboxOwner);
      outbox = new Map();
      outboxOwner = user.id;
      saveOutbox();
    }

    const st = useGarage.getState();
    if (st.ownerId === user.id) {
      session = { userId: user.id };
      await flush();
      await pull();
      return;
    }

    const local = snapshotOf(st);
    if (st.ownerId !== null || !hasRecords(local)) {
      // Nothing of the guest's to keep: an empty garage, or a copy of
      // another account's that must not leak into this one.
      // Offline: start from the outbox alone; coming back to the tab refreshes.
      const server = await api.garage().catch(() => emptySnapshot());
      if (entering !== user.id) return;
      session = { userId: user.id };
      applyRemote(withOutbox(server), user.id);
      void flush();
      return;
    }

    let server: GarageSnapshot;
    try {
      server = await api.garage();
    } catch {
      // Offline: the guest garage stays on screen; the next visit retries.
      return;
    }
    if (entering !== user.id) return;
    const accountCars = new Set(server.vehicles.map((v) => v.id));
    const newCars = local.vehicles.filter((v) => !accountCars.has(v.id)).length;
    if (server.vehicles.length === 0 || newCars === 0) {
      await importGuest(user, server.vehicles.length === 0 && local.vehicles.length > 0);
    } else {
      pendingOffer = { user, server };
      useSync.setState({ offer: { newCars, accountCars: server.vehicles.length } });
    }
  } finally {
    if (entering === user.id) entering = null;
  }
}

let pendingOffer: { user: User; server: GarageSnapshot } | null = null;

// The owner's answer to the offer.
export async function answerOffer(add: boolean): Promise<void> {
  const pending = pendingOffer;
  pendingOffer = null;
  useSync.setState({ offer: null });
  if (!pending || useAuth.getState().user?.id !== pending.user.id) return;
  const { user, server } = pending;
  if (add) {
    await importGuest(user, true);
    return;
  }
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(snapshotOf(useGarage.getState())));
  } catch {
    // Can't set it aside safely: keep showing it rather than lose it.
    return;
  }
  session = { userId: user.id };
  applyRemote(withOutbox(server), user.id);
  void flush();
  await pull();
}

// Adds the guest garage to the account. merge: true means a record the
// account already has stays as the account has it.
async function importGuest(user: User, announce: boolean) {
  const fixed = withUuids(snapshotOf(useGarage.getState()));
  if (fixed) {
    applyingRemote = true;
    try {
      useGarage.setState(fixed);
    } finally {
      applyingRemote = false;
    }
  }
  const sent = snapshotOf(useGarage.getState());
  try {
    await api.applyGarageChanges({ merge: true, upsert: sent, delete: {} }, IMPORT_TIMEOUT_MS);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      useAuth.getState().sessionLost();
      return;
    }
    useAuth.getState().setNotice(
      err instanceof ApiError && err.status === 0
        ? "Не удалось перенести машины в аккаунт: нет связи с сервером. Они остаются в этом браузере, попробуем снова при следующем входе."
        : "Не удалось перенести машины в аккаунт. Они остаются в этом браузере.",
    );
    return;
  }
  if (useAuth.getState().user?.id !== user.id) return;
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {}

  session = { userId: user.id };
  applyingRemote = true;
  try {
    useGarage.setState({ ownerId: user.id });
  } finally {
    applyingRemote = false;
  }
  // Edits made while the import was on its way go out as ordinary changes.
  const now = snapshotOf(useGarage.getState());
  for (const c of COLLECTIONS) if (now[c] !== sent[c]) diffInto(c, sent[c], now[c]);
  saveOutbox();
  void flush();
  await pull();
  if (announce) useAuth.getState().setNotice("Машины из этого браузера перенесены в аккаунт.");
}

function enterGuest() {
  session = null;
  entering = null;
  pendingOffer = null;
  clearTimeout(flushTimer);
  useSync.setState({ offline: false, refused: 0, offer: null });
  if (useGarage.getState().ownerId === null) return;
  // The account's copy leaves the browser; its unsent changes stay in the
  // outbox for the next sign-in. A guest garage set aside comes back.
  let guest: GarageSnapshot | null = null;
  try {
    guest = JSON.parse(localStorage.getItem(GUEST_KEY) ?? "null");
    localStorage.removeItem(GUEST_KEY);
  } catch {}
  applyRemote(guest ?? emptySnapshot(), null);
}

// ---- legacy ids -----------------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Browsers without crypto.randomUUID once made ids like "id-169…-x7k2";
// the server keys records by UUID. Gives such records UUIDs, rewriting every
// reference to them. Returns null when there is nothing to fix.
function withUuids(g: GarageSnapshot): (GarageSnapshot & { lastViewedVehicleId: ID | null }) | null {
  const map = new Map<ID, ID>();
  const all = COLLECTIONS.flatMap((c) => g[c] as Rec[]);
  for (const r of all) if (!UUID.test(r.id)) map.set(r.id, newId());
  if (map.size === 0) return null;

  const fix = (id: ID) => map.get(id) ?? id;
  const fixOpt = (id: ID | undefined) => (id === undefined ? undefined : fix(id));
  const lastViewed = useGarage.getState().lastViewedVehicleId;
  return {
    vehicles: g.vehicles.map((x) => ({ ...x, id: fix(x.id) })),
    systems: g.systems.map((x) => ({ ...x, id: fix(x.id), vehicleId: fix(x.vehicleId) })),
    components: g.components.map((x) => ({ ...x, id: fix(x.id), vehicleId: fix(x.vehicleId), systemId: fix(x.systemId) })),
    installedParts: g.installedParts.map((x) => ({ ...x, id: fix(x.id), componentId: fix(x.componentId) })),
    events: g.events.map((x) => ({
      ...x,
      id: fix(x.id),
      vehicleId: fix(x.vehicleId),
      componentIds: x.componentIds.map(fix),
      installedPartId: fixOpt(x.installedPartId),
    })),
    mileageHistory: g.mileageHistory.map((x) => ({ ...x, id: fix(x.id), vehicleId: fix(x.vehicleId) })),
    inspections: g.inspections.map((x) => ({ ...x, id: fix(x.id), componentId: fix(x.componentId) })),
    reminders: g.reminders.map((x) => ({
      ...x,
      id: fix(x.id),
      vehicleId: fix(x.vehicleId),
      componentId: fixOpt(x.componentId),
    })),
    lastViewedVehicleId: lastViewed === null ? null : fix(lastViewed),
  };
}

// ---- start ----------------------------------------------------------------

// Wires everything up; returns the cleanup. Mounted once, by <GarageSync />.
export function startSync(): () => void {
  const onAuth = () => {
    const { status, user } = useAuth.getState();
    if (status === "user" && user) {
      if (session && session.userId !== user.id) enterGuest();
      void enterAccount(user);
    } else if (status === "guest") {
      enterGuest();
    }
  };
  const onVisible = () => {
    if (document.visibilityState !== "visible" || !session) return;
    void flush();
    if (Date.now() - lastPull > PULL_EVERY_MS) void pull();
  };
  const onOnline = () => {
    retryMs = 0;
    void flush();
  };

  loadOutbox();
  const unsubStore = useGarage.subscribe(onStoreChange);
  const unsubAuth = useAuth.subscribe((s, prev) => {
    if (s.status !== prev.status || s.user?.id !== prev.user?.id) onAuth();
  });
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);
  onAuth();
  useAuth.getState().load();

  return () => {
    unsubStore();
    unsubAuth();
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", onOnline);
    clearTimeout(flushTimer);
  };
}
