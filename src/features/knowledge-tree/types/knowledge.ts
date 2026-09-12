export type KnowledgeNodeType = 'root' | 'folder' | 'subject' | 'chapter' | 'topic' | 'document' | 'note' | 'image' | 'video' | 'link' | 'mistake' | 'collection'
export type LearningStatus = 'unlearned' | 'learning' | 'completed' | 'review' | 'mastered'
export type NodeRelationType = 'related' | 'reference' | 'derived' | 'mistake' | 'note' | 'course'
export type KnowledgeViewMode = 'grid' | 'list'
export type KnowledgeVirtualView = 'tree' | 'recent' | 'favorite' | LearningStatus

export type KnowledgeMetadata = {
  fileId?: string
  url?: string
  noteContent?: string
  mistakeId?: string
  legacyResourceId?: string
  [key: string]: unknown
}

export interface KnowledgeNode {
  id: string
  parentId: string | null
  title: string
  type: KnowledgeNodeType
  order: number
  icon?: string
  color?: string
  description?: string
  learningStatus?: LearningStatus
  favorite?: boolean
  archived?: boolean
  createdAt: number
  updatedAt: number
  lastOpenedAt?: number
  lastStudiedAt?: number
  reviewCount?: number
  nextReviewAt?: number
  metadata?: KnowledgeMetadata
}

export interface ResourceFile {
  id: string
  name: string
  mimeType: string
  size: number
  localPath?: string
  storageKey?: string
  sha256?: string
  createdAt: number
  updatedAt: number
}

export interface Tag {
  id: string
  name: string
  color?: string
  createdAt: number
}

export interface NodeTagRelation { nodeId: string; tagId: string }

export interface NodeRelation {
  id: string
  sourceNodeId: string
  targetNodeId: string
  type: NodeRelationType
  createdAt: number
}

export interface KnowledgeData {
  schemaVersion: number
  nodes: KnowledgeNode[]
  files: ResourceFile[]
  tags: Tag[]
  nodeTags: NodeTagRelation[]
  relations: NodeRelation[]
  selectedNodeId: string | null
  expandedNodeIds: string[]
  viewMode: KnowledgeViewMode
  virtualView: KnowledgeVirtualView
  updatedAt: number
}

export const KNOWLEDGE_SCHEMA_VERSION = 2
export const KNOWLEDGE_ROOT_ID = 'knowledge-root'
export const knowledgeNodeTypes: KnowledgeNodeType[] = ['root', 'folder', 'subject', 'chapter', 'topic', 'document', 'note', 'image', 'video', 'link', 'mistake', 'collection']

export const emptyKnowledgeData = (now = Date.now()): KnowledgeData => ({
  schemaVersion: KNOWLEDGE_SCHEMA_VERSION,
  nodes: [{ id: KNOWLEDGE_ROOT_ID, parentId: null, title: '我的资料', type: 'root', order: 1000, createdAt: now, updatedAt: now }],
  files: [], tags: [], nodeTags: [], relations: [], selectedNodeId: KNOWLEDGE_ROOT_ID,
  expandedNodeIds: [KNOWLEDGE_ROOT_ID], viewMode: 'grid', virtualView: 'tree', updatedAt: now,
})
