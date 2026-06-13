export interface LibraryEntry {
  id: string;
  name: string;
  content: string;
  slug: string;
  savedAt: string;
}

const KEY = 'typemorph_library';
const MAX = 50;

export function loadLibrary(): LibraryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveToLibrary(entry: Omit<LibraryEntry, 'id' | 'savedAt'>): LibraryEntry {
  const lib = loadLibrary();
  const newEntry: LibraryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify([newEntry, ...lib].slice(0, MAX)));
  return newEntry;
}

export function deleteFromLibrary(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(loadLibrary().filter(e => e.id !== id)));
}

export function renameInLibrary(id: string, name: string): void {
  localStorage.setItem(
    KEY,
    JSON.stringify(loadLibrary().map(e => (e.id === id ? { ...e, name } : e)))
  );
}

export function autoName(content: string, slug: string): string {
  try {
    const obj = JSON.parse(content);
    const keys = Object.keys(obj);
    if (keys.length > 0) return keys.slice(0, 3).join(', ');
  } catch {}
  const firstLine = content.trim().split('\n')[0].replace(/[^a-zA-Z0-9_\s]/g, '').trim();
  if (firstLine.length > 3) return firstLine.slice(0, 40);
  return slug;
}
