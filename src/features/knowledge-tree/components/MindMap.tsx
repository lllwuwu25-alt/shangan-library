import { Handle, Panel, Position, ReactFlow, type Node, type NodeProps, type ReactFlowInstance } from '@xyflow/react'
import { ArrowRight, ChevronRight, Maximize2, Minimize2, Plus, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { KnowledgeNode, ResourceFile } from '../types/knowledge'
import { directoryNodeTypes, type TreeIndex } from '../utils/tree'
import { layoutMindMap } from '../utils/mindMap'
import { mapNodeAction, toggleMapBranch } from '../utils/mindMapState'
import { NodeIcon } from './NodeIcon'
import { nodeTypeLabels } from './nodePresentation'
import '@xyflow/react/dist/style.css'
import './mindMap.css'

type MapData = {
  node: KnowledgeNode
  childCount: number
  collapsed: boolean
  active: boolean
  onActivate: (node: KnowledgeNode) => void
  onOpen: (id: string) => void
  onToggle: (id: string) => void
}
type MapNode = Node<MapData, 'knowledge'>

function KnowledgeMapNode({ data }: NodeProps<MapNode>) {
  const { node } = data
  return <div className={`knowledge-map-node ${data.active ? 'knowledge-map-node--selected' : ''}`}>
    <Handle type="target" position={Position.Left} isConnectable={false} />
    <button type="button" className="knowledge-map-label nodrag nopan" onClick={() => data.onActivate(node)} title={node.title} aria-pressed={data.active}>
      <span className="knowledge-map-kind"><NodeIcon type={node.type} size={17} />{nodeTypeLabels[node.type]}</span>
      <span className="knowledge-map-title">{node.title}</span>
    </button>
    <div className="knowledge-map-actions nodrag nopan">
      {data.childCount > 0 && <button type="button" onClick={() => data.onToggle(node.id)} aria-expanded={!data.collapsed} aria-label={`${data.collapsed ? '展开' : '收起'} ${node.title}`} title={data.collapsed ? '展开分支' : '收起分支'}><ChevronRight size={14} style={{ transform: data.collapsed ? undefined : 'rotate(90deg)' }} /><span>{data.childCount}</span></button>}
      <button type="button" className="knowledge-map-open" onClick={() => data.onOpen(node.id)} aria-label={`${directoryNodeTypes.has(node.type) ? '打开子树' : '查看详情'} ${node.title}`} title={directoryNodeTypes.has(node.type) ? '打开子树' : '查看详情'}><ArrowRight size={15} /></button>
    </div>
    <Handle type="source" position={Position.Right} isConnectable={false} />
  </div>
}

const nodeTypes = { knowledge: KnowledgeMapNode }

export function MindMap({ index, rootId, files, onSelect, onPreview }: { index: TreeIndex; rootId: string; files: ResourceFile[]; onSelect: (id: string) => void; onPreview: (file: ResourceFile) => void }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [activeId, setActiveId] = useState(rootId)
  const [flow, setFlow] = useState<ReactFlowInstance<MapNode> | null>(null)
  const [zoom, setZoom] = useState(1)
  const layout = useMemo(() => layoutMindMap(index, rootId, collapsed), [index, rootId, collapsed])
  const fileMap = useMemo(() => new Map(files.map((file) => [file.id, file])), [files])
  const activate = (node: KnowledgeNode) => {
    setActiveId(node.id)
    const action = mapNodeAction(node)
    if (action.type === 'preview') {
      const file = fileMap.get(action.fileId)
      if (file) onPreview(file)
    }
  }
  const nodes: MapNode[] = layout.nodes.map((item) => ({
    id: item.id, type: 'knowledge', position: item.position, width: item.width, height: item.height,
    style: { width: item.width, height: item.height, pointerEvents: 'all' },
    data: { node: item.node, childCount: item.childCount, collapsed: collapsed.has(item.id), active: activeId === item.id, onActivate: activate, onOpen: onSelect, onToggle: (id) => setCollapsed((current) => toggleMapBranch(current, id)) },
  }))
  const fit = () => { void flow?.fitView({ padding: 0.12, maxZoom: 1, duration: 0 }) }
  const reset = () => {
    const root = layout.nodes[0]
    if (root) void flow?.setCenter(root.position.x + root.width / 2, root.position.y + root.height / 2, { zoom: 1, duration: 0 })
  }
  return <div className="knowledge-map" aria-label="知识导图">
    <ReactFlow<MapNode> nodes={nodes} edges={layout.edges} nodeTypes={nodeTypes} onInit={setFlow} onMove={(_, viewport) => setZoom(viewport.zoom)} fitView fitViewOptions={{ padding: 0.12, maxZoom: 1 }} minZoom={0.1} maxZoom={2} nodesDraggable={false} nodesConnectable={false} edgesReconnectable={false} elementsSelectable={false} deleteKeyCode={null} panOnDrag zoomOnPinch preventScrolling defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: 'var(--map-edge)', strokeWidth: 1.5 } }}>
      <Panel position="top-left"><div className="knowledge-map-summary">{layout.nodes.length} 个节点</div></Panel>
      <Panel position="bottom-left"><div className="knowledge-map-controls">
        <button type="button" title="放大" aria-label="放大导图" onClick={() => void flow?.zoomIn()}><Plus size={17} /></button>
        <button type="button" title="缩小" aria-label="缩小导图" onClick={() => void flow?.zoomOut()}><Minimize2 size={17} /></button>
        <output aria-label="缩放比例">{Math.round(zoom * 100)}%</output>
        <button type="button" title="适应画布" aria-label="适应画布" onClick={fit}><Maximize2 size={17} /></button>
        <button type="button" title="重置视角" aria-label="重置视角" onClick={reset}><RotateCcw size={17} /></button>
      </div></Panel>
    </ReactFlow>
  </div>
}
