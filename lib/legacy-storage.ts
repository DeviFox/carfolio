// The app was called carfolio; browsers that used it keep their garage under
// "carfolio.*" keys. Move them to "carvisio.*" once, before the store hydrates,
// so the rename doesn't empty anyone's garage. A key already present under the
// new name wins and the old copy is dropped.
const OLD = "carfolio.";
const NEW = "carvisio.";

export function moveLegacyStorage(storage: Storage): void {
  try {
    const oldKeys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(OLD)) oldKeys.push(key);
    }
    for (const key of oldKeys) {
      const next = NEW + key.slice(OLD.length);
      const value = storage.getItem(key);
      if (value !== null && storage.getItem(next) === null) storage.setItem(next, value);
      // Only drop the old copy once the new one is surely there.
      if (storage.getItem(next) !== null) storage.removeItem(key);
    }
  } catch {
    // Storage blocked or full: the old keys stay put and nothing is lost.
  }
}
