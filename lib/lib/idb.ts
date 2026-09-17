/**
 * IndexedDB 封装：把本地上传的音频 Blob 持久化到浏览器，规避 localStorage 容量限制。
 * 键为歌曲 id，值为 Blob（可跨会话、支持较大文件、无跨域/防盗链问题）。
 * 仅客户端使用。
 */

const DB_NAME = 'openear';
const STORE = 'audio';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('no indexedDB'));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE, { keyPath: 'k' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('open db failed'));
    });
  }
  return dbPromise;
}

export async function saveAudioBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ k: key, blob });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('save blob failed'));
  });
}

export async function getAudioBlob(key: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const get = tx.objectStore(STORE).get(key);
    get.onsuccess = () => resolve(get.result?.blob ?? null);
    get.onerror = () => reject(get.error ?? new Error('get blob failed'));
  });
}

export async function deleteAudioBlob(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('delete blob failed'));
  });
}