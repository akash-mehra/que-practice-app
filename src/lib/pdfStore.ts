import type { PdfSourceMeta } from "@/types/question";

/**
 * Persists uploaded PDFs across sessions using IndexedDB rather than
 * localStorage. localStorage has a hard ~5-10MB ceiling shared across the
 * ENTIRE app (qbank, progress, modules, API key all live there too) — a
 * single real PDF can approach or exceed that on its own. IndexedDB is a
 * separate, much larger, purpose-built store for exactly this kind of
 * binary/file data.
 *
 * NOTE ON VERIFICATION: unlike the rest of this app's logic, this file
 * cannot be exercised in a Node build sandbox — IndexedDB only exists in a
 * real browser. It has been reviewed carefully against the standard IDB
 * API, but this is the one module that genuinely needs its first real test
 * on-device. If PDFs aren't persisting/listing correctly, check the
 * browser console for errors here first.
 */

const DB_NAME = "que_practice_pdf_store";
const DB_VERSION = 1;
const STORE_NAME = "pdfs";

interface StoredPdfRecord {
  id: string;
  name: string;
  createdAt: string;
  extractedCount: number;
  sizeBytes: number;
  blob: Blob;
}

function isSupported() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isSupported()) {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open PDF store."));
  });
}

function toMeta(record: StoredPdfRecord): PdfSourceMeta {
  return {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    extractedCount: record.extractedCount,
    sizeBytes: record.sizeBytes,
  };
}

/** Saves a newly-uploaded PDF and returns its metadata (not the blob itself). */
export async function savePdfSource(file: File): Promise<PdfSourceMeta> {
  const db = await openDb();
  const record: StoredPdfRecord = {
    id: `pdf-${Date.now()}`,
    name: file.name,
    createdAt: new Date().toISOString(),
    extractedCount: 0,
    sizeBytes: file.size,
    blob: file,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to save PDF."));
  });
  db.close();
  return toMeta(record);
}

/** Lists metadata for every persisted PDF source (no blob data, kept light for a library UI). */
export async function listPdfSources(): Promise<PdfSourceMeta[]> {
  if (!isSupported()) return [];
  const db = await openDb();
  const records = await new Promise<StoredPdfRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as StoredPdfRecord[]);
    request.onerror = () => reject(request.error ?? new Error("Failed to list PDFs."));
  });
  db.close();
  return records
    .map(toMeta)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Retrieves the actual PDF file bytes for re-extraction ("Add More"). */
export async function getPdfFile(id: string): Promise<File | null> {
  const db = await openDb();
  const record = await new Promise<StoredPdfRecord | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as StoredPdfRecord | undefined);
    request.onerror = () => reject(request.error ?? new Error("Failed to read PDF."));
  });
  db.close();
  if (!record) return null;
  return new File([record.blob], record.name, { type: "application/pdf" });
}

/** Updates how many questions have been extracted from this source so far. */
export async function updateExtractedCount(id: string, newCount: number): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const record = getRequest.result as StoredPdfRecord | undefined;
      if (record) {
        record.extractedCount = newCount;
        store.put(record);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to update PDF progress."));
  });
  db.close();
}

export async function deletePdfSource(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Failed to delete PDF."));
  });
  db.close();
}

