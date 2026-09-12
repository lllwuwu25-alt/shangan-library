import type { ResourceFile } from '../types/knowledge.ts'

export type KnowledgeStructureSuggestion = { nodes: Array<{ title: string; children?: KnowledgeStructureSuggestion['nodes'] }> }
export interface KnowledgeOrganizer { suggestStructure(resources: ResourceFile[]): Promise<KnowledgeStructureSuggestion> }
