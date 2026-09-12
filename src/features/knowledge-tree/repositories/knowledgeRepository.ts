import type { KnowledgeData } from '../types/knowledge.ts'

const DB_NAME = 'shangan-library-knowledge'
const DB_VERSION = 1
const STORE_NAME = 'state'
const STATE_KEY = 'knowledge-v2'

export interface KnowledgeRepository {
  load(): Promise<KnowledgeData | null>
  save(data: KnowledgeData): Promise<void>
  clear(): Promise<void>
}

const openDatabase = (databaseName: string) => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(databaseName, DB_VERSION)
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error ?? new Error('无法打开知识库数据库'))
})

const transact = async <T>(databaseName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) => {
  const database = await openDatabase(databaseName)
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode)
    const request = run(transaction.objectStore(STORE_NAME))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('知识库本地存储失败'))
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error('知识库事务失败')) }
  })
}

export const createKnowledgeRepository = (databaseName = DB_NAME): KnowledgeRepository => ({
  load: () => transact<KnowledgeData | undefined>(databaseName, 'readonly', (store) => store.get(STATE_KEY)).then((data) => data ?? null),
  save: async (data) => { await transact<IDBValidKey>(databaseName, 'readwrite', (store) => store.put(data, STATE_KEY)) },
  clear: async () => { await transact<undefined>(databaseName, 'readwrite', (store) => store.clear()) },
})

export const knowledgeRepository = createKnowledgeRepository()
