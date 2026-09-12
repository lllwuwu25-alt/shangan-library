import { create } from 'zustand'
import type { FileAttachment, ResourceItem } from '../../../types.ts'
import { createKnowledgeRepository } from '../repositories/knowledgeRepository.ts'
import { KnowledgeService } from '../services/knowledgeService.ts'
import { emptyKnowledgeData, type KnowledgeData, type KnowledgeNode, type KnowledgeNodeType, type KnowledgeViewMode, type KnowledgeVirtualView, type LearningStatus, type NodeRelationType } from '../types/knowledge.ts'
import { buildTreeIndex, getAncestors } from '../utils/tree.ts'

export const isKnowledgeDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'
const service = new KnowledgeService(createKnowledgeRepository(isKnowledgeDemoMode ? 'shangan-library-knowledge-demo' : undefined))
type State = KnowledgeData & {
  initialized: boolean
  loading: boolean
  error: string | null
  searchQuery: string
  initialize: (resources: ResourceItem[]) => Promise<void>
  selectNode: (id: string) => Promise<void>
  toggleNode: (id: string) => Promise<void>
  createNode: (parentId: string, input: { title: string; type: KnowledgeNodeType; description?: string; metadata?: KnowledgeNode['metadata']; learningStatus?: LearningStatus }) => Promise<KnowledgeNode>
  addAttachments: (parentId: string, files: FileAttachment[]) => Promise<void>
  updateNode: (id: string, patch: Partial<Pick<KnowledgeNode, 'title' | 'description' | 'learningStatus' | 'favorite' | 'metadata'>>) => Promise<void>
  moveNode: (id: string, parentId: string, beforeId?: string | null) => Promise<void>
  reorderNode: (id: string, parentId: string, beforeId?: string | null) => Promise<void>
  archiveNode: (id: string) => Promise<void>
  setNodeTags: (id: string, tags: string[]) => Promise<void>
  addRelation: (sourceNodeId: string, targetNodeId: string, type: NodeRelationType) => Promise<void>
  revealNode: (id: string) => Promise<void>
  setViewMode: (mode: KnowledgeViewMode) => Promise<void>
  setVirtualView: (view: KnowledgeVirtualView) => Promise<void>
  setSearchQuery: (query: string) => void
  replaceData: (data: KnowledgeData) => Promise<void>
  clearKnowledge: () => Promise<void>
}

const initial = emptyKnowledgeData()
const apply = (data: KnowledgeData) => ({ ...data, error: null })
const message = (error: unknown) => error instanceof Error ? error.message : '知识库操作失败'

export const useKnowledgeStore = create<State>((set, get) => ({
  ...initial, initialized: false, loading: false, error: null, searchQuery: '',
  initialize: async (resources) => {
    if (get().initialized || get().loading) return
    set({ loading: true, error: null })
    try {
      if (isKnowledgeDemoMode) {
        const { createDemoKnowledgeBundle, persistDemoFileBodies } = await import('../services/demoData.ts')
        const demo = createDemoKnowledgeBundle()
        await persistDemoFileBodies(demo)
        set({ ...apply(await service.initialize([], demo.data)), initialized: true, loading: false })
      } else {
        set({ ...apply(await service.initialize(resources)), initialized: true, loading: false })
      }
    }
    catch (error) { set({ loading: false, error: message(error) }) }
  },
  selectNode: async (id) => { try { set(apply(await service.selectNode(id))) } catch (error) { set({ error: message(error) }) } },
  toggleNode: async (id) => {
    const expanded = new Set(get().expandedNodeIds)
    if (expanded.has(id)) expanded.delete(id); else expanded.add(id)
    try { set(apply(await service.setExpanded([...expanded]))) } catch (error) { set({ error: message(error) }) }
  },
  createNode: async (parentId, input) => { const created = await service.createNode(parentId, input); set(apply(service.getData())); return created },
  addAttachments: async (parentId, files) => { await service.addAttachments(parentId, files); set(apply(service.getData())) },
  updateNode: async (id, patch) => { try { await service.updateNode(id, patch); set(apply(service.getData())) } catch (error) { set({ error: message(error) }) } },
  moveNode: async (id, parentId, beforeId) => { try { set(apply(await service.moveNode(id, parentId, beforeId))) } catch (error) { set({ error: message(error) }); throw error } },
  reorderNode: async (id, parentId, beforeId) => { try { set(apply(await service.reorderNode(id, parentId, beforeId))) } catch (error) { set({ error: message(error) }); throw error } },
  archiveNode: async (id) => { try { set(apply(await service.archiveNode(id))) } catch (error) { set({ error: message(error) }) } },
  setNodeTags: async (id, tags) => { try { set(apply(await service.setNodeTags(id, tags))) } catch (error) { set({ error: message(error) }) } },
  addRelation: async (sourceNodeId, targetNodeId, type) => { try { set(apply(await service.addRelation(sourceNodeId, targetNodeId, type))) } catch (error) { set({ error: message(error) }) } },
  revealNode: async (id) => {
    const index = buildTreeIndex(get().nodes)
    const expanded = new Set(get().expandedNodeIds)
    getAncestors(index, id).forEach((node) => expanded.add(node.id))
    try {
      await service.setExpanded([...expanded])
      set(apply(await service.selectNode(id)))
    } catch (error) { set({ error: message(error) }) }
  },
  setViewMode: async (mode) => { try { set(apply(await service.setViewMode(mode))) } catch (error) { set({ error: message(error) }) } },
  setVirtualView: async (view) => { try { set(apply(await service.setVirtualView(view))) } catch (error) { set({ error: message(error) }) } },
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  replaceData: async (data) => { set(apply(await service.replace(data))) },
  clearKnowledge: async () => { set({ ...apply(await service.clear()), initialized: true }) },
}))

export const getKnowledgeData = () => useKnowledgeStore.getState()

export const knowledgeSnapshot = (state = useKnowledgeStore.getState()): KnowledgeData => ({
  schemaVersion: state.schemaVersion,
  nodes: state.nodes,
  files: state.files,
  tags: state.tags,
  nodeTags: state.nodeTags,
  relations: state.relations,
  selectedNodeId: state.selectedNodeId,
  expandedNodeIds: state.expandedNodeIds,
  viewMode: state.viewMode,
  virtualView: state.virtualView,
  updatedAt: state.updatedAt,
})
