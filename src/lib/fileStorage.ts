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

export const saveAttachmentBlob = async (id: string, file: File) => {
  await withStore('readwrite', (store) => store.put(file, id))
}

export const getAttachmentBlob = async (file: FileAttachment) => {
  if (file.dataUrl) {
    return fetch(file.dataUrl).then((response) => response.blob())
  }
  const storageKey = file.storageKey
  if (!storageKey) throw new Error('附件文件不存在')
  const blob = await withStore<Blob | undefined>('readonly', (store) => store.get(storageKey))
  if (!blob) throw new Error('附件文件不存在')
  return blob
}

export const deleteAttachmentBlob = async (file: FileAttachment) => {
  const storageKey = file.storageKey
  if (!storageKey) return
  await withStore('readwrite', (store) => store.delete(storageKey))
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
