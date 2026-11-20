import { fa } from "../i18n/interface";
export interface LocalRecord<T> {
  revision: number;
  data: T;
}
export class LocalSave<T> {
  private db: IDBDatabase;
  private slot: string;
  private revision = 0;
  private writes: Promise<void> = Promise.resolve();
  private constructor(db: IDBDatabase, slot: string) {
    this.db = db;
    this.slot = slot;
  }
  static open<T>(account: string | null = null): Promise<LocalSave<T>> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("f7-apartment", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("game");
      request.onerror = () => reject(request.error);
      request.onblocked = () =>
        reject(new Error(fa.CloseOtherF7TabsToUpdateLocalStorage));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(new LocalSave<T>(db, account ? `account:${account}` : "slot"));
      };
    });
  }
  // A verified guest keeps their player UUID. Move the legacy slot only when
  // that exact owner matches, and never replace an existing account checkpoint.
  adoptGuest(owner: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction("game", "readwrite");
      const store = tx.objectStore("game");
      const guest = store.get("slot"),
        destination = store.get(this.slot);
      destination.onsuccess = () => {
        const record = guest.result;
        if (record?.data?.progress?.player?.player_id !== owner) return;
        if (!destination.result) {
          store.put(record, this.slot);
          store.delete("slot");
        }
      };
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
  }
  read(): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      const req = this.db
        .transaction("game")
        .objectStore("game")
        .get(this.slot);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const record = req.result as LocalRecord<T> | undefined;
        this.revision = record?.revision ?? 0;
        resolve(record?.data);
      };
    });
  }
  save(data: T): Promise<void> {
    const copy = structuredClone(data);
    this.writes = this.writes.then(
      () =>
        new Promise<void>((resolve, reject) => {
          const tx = this.db.transaction("game", "readwrite"),
            store = tx.objectStore("game");
          const req = store.get(this.slot);
          let conflict = false;
          req.onsuccess = () => {
            if ((req.result?.revision ?? 0) !== this.revision) {
              conflict = true;
              tx.abort();
              return;
            }
            store.put({ revision: this.revision + 1, data: copy }, this.slot);
          };
          tx.oncomplete = () => {
            this.revision++;
            resolve();
          };
          tx.onabort = () =>
            reject(
              new Error(
                conflict
                  ? fa.AnotherTabSavedNewerProgressReloadToContinueSaving
                  : fa.LocalStorageWriteFailed,
              ),
            );
        }),
    );
    return this.writes;
  }
}
