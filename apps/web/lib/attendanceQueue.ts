const DB_NAME = "uychibinokor";
const STORE = "attendance";

type QueuedAttendance = {
  id: string;
  groupId: string;
  body: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueAttendance(item: QueuedAttendance): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function readQueue(): Promise<QueuedAttendance[]> {
  const db = await openDb();
  const rows = await new Promise<QueuedAttendance[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as QueuedAttendance[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return rows;
}

export async function dropQueued(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function flushAttendance(): Promise<number> {
  const rows = await readQueue();
  let sent = 0;
  for (const row of rows) {
    const response = await fetch(`/api/v1/learning/groups/${row.groupId}/attendance`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "Idempotency-Key": row.id },
      body: row.body,
    });
    if (response.ok) {
      await dropQueued(row.id);
      sent += 1;
    }
  }
  return sent;
}
