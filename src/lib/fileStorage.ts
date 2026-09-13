import type { FileAttachment } from '../types'

const DB_NAME = 'shangan-library-files'
const DB_VERSION = 1
const STORE_NAME = 'attachments'

const openDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION)

  request.onupgradeneeded = () => {
    const db = request.result
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME)
    }
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

const withStore = async <T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) => {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode)
    const request = action(transaction.objectStore(STORE_NAME))

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

export const saveAttachmentBlob = async (id: string, file: Blob) => {
  await withStore('readwrite', (store) => store.put(file, id))
}

export const getAttachmentBlob = async (file: FileAttachment) => {
  if (file.dataUrl) {
    return fetch(file.dataUrl).then((response) => response.blob())
  }
  const storageKey = file.storageKey
  if (storageKey) {
    const blob = await withStore<Blob | undefined>('readonly', (store) => store.get(storageKey))
    if (blob) return blob
  }
  if (file.sourcePath && typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    const { readFile } = await import('@tauri-apps/plugin-fs')
    const bytes = await readFile(file.sourcePath)
    return new Blob([bytes], { type: file.type })
  }
  throw new Error('附件文件不存在')
}

export const deleteAttachmentBlob = async (file: FileAttachment) => {
  const storageKey = file.storageKey
  if (!storageKey) return
  await withStore('readwrite', (store) => store.delete(storageKey))
}

export const clearAttachmentBlobs = async () => {
  await withStore('readwrite', (store) => store.clear())
}

export const getAllAttachmentBlobs = async () => {
  const db = await openDb()
  return new Promise<Map<string, Blob>>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const keysRequest = store.getAllKeys()
    const valuesRequest = store.getAll()
    transaction.oncomplete = () => {
      db.close()
      const blobs = new Map<string, Blob>()
      keysRequest.result.forEach((key, index) => {
        const value = valuesRequest.result[index]
        if (value instanceof Blob) blobs.set(String(key), value)
      })
      resolve(blobs)
    }
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error('读取附件存储失败')) }
    transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error('读取附件存储已中止')) }
  })
}

export const replaceAttachmentBlobs = async (blobs: ReadonlyMap<string, Blob>) => {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    store.clear()
    for (const [key, blob] of blobs) store.put(blob, key)
    transaction.oncomplete = () => { db.close(); resolve() }
    transaction.onerror = () => { db.close(); reject(transaction.error ?? new Error('写入附件存储失败')) }
    transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error('写入附件存储已中止')) }
  })
}

export const attachmentToObjectUrl = async (file: FileAttachment) => {
  const blob = await getAttachmentBlob(file)
  return URL.createObjectURL(blob)
}

export const attachmentToArrayBuffer = async (file: FileAttachment) => {
  const blob = await getAttachmentBlob(file)
  return blob.arrayBuffer()
}

export const downloadAttachment = async (file: FileAttachment) => {
  const objectUrl = await attachmentToObjectUrl(file)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = file.name
  link.click()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}
