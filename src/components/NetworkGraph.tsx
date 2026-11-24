import { useEffect, useRef, type RefObject } from 'react';
import { Background, Controls, Handle, MarkerType, Position, ReactFlow, getViewportForBounds, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { Circle, Eye, GitBranch, ShieldAlert } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import { BY_ID, NETWORK, answerLabel, type Evidence, type NodeId, type Posteriors } from '../model/network';
import { percent } from './DistributionChart';

type VariableData = {
  id: NodeId;
  evidence: Evidence;
  posterior: Posteriors;
  changed: boolean;
  fresh: boolean;
  onSelect: (id: NodeId) => void;
};
type VariableNode = Node<VariableData, 'variable'>;
const positions: Record<NodeId, { x: number; y: number }> = {
  age: { x: 0, y: 145 }, immunocompromised: { x: 0, y: 275 },
  viral: { x: 220, y: 90 }, strep: { x: 220, y: 230 }, abscess: { x: 220, y: 370 },
  sore_throat: { x: 450, y: 15 }, fever: { x: 450, y: 145 },
  cough: { x: 450, y: 275 }, unilateral: { x: 450, y: 405 },
  difficulty_swallowing: { x: 670, y: 15 }, unable_to_swallow_fluids: { x: 670, y: 145 },
  drooling: { x: 670, y: 275 }, breathing_difficulty: { x: 670, y: 405 },
  acuity: { x: 915, y: 230 },
};
const roleLabels = { risk: 'Risk factor', condition: 'Hidden condition', feature: 'Clinical feature', target: 'Target' };
function VariableCard({ data }: NodeProps<VariableNode>) {
  const v = BY_ID[data.id];
  const observed = data.evidence[data.id] !== undefined;
  const p = data.posterior[data.id];
  const stateIndex = p.indexOf(Math.max(...p));
  const headline = v.role === 'condition' ? `Present ${percent(p[1])}`
    : observed ? answerLabel(data.evidence[data.id]!)
      : `${answerLabel(v.states[stateIndex])} ${percent(p[stateIndex])}`;
  return (
    <button className={`variable-node role-${v.role} ${observed ? 'observed' : ''} ${data.changed ? 'affected' : ''} ${data.fresh ? 'fresh' : ''}`}
      onClick={() => data.onSelect(data.id)} aria-label={`Inspect ${v.label}, ${observed ? 'observed' : 'unobserved or inferred'}, ${headline}`}>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <span className="node-role">{v.mandatory ? <ShieldAlert size={10} /> : <GitBranch size={10} />}{roleLabels[v.role]}</span>
      <strong>{v.label}</strong>
      <span className="node-value">{observed ? <Eye size={11} /> : <Circle size={9} />}{headline}</span>
      <div className="node-distribution">{p.map((probability, i) => <span key={i} style={{ width: `${probability * 100}%`, opacity: 1 - i * 0.16 }} />)}</div>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </button>
  );
}
const nodeTypes = { variable: VariableCard };

function FitViewport({ container }: { container: RefObject<HTMLDivElement | null> }) {
  const { getNodes, getNodesBounds, setViewport, viewportInitialized: ready } = useReactFlow();
  useEffect(() => {
    if (!ready || !container.current) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const element = container.current;
        if (!element) return;
        const bounds = getNodesBounds(getNodes());
        void setViewport(getViewportForBounds(bounds, element.clientWidth, element.clientHeight, 0.2, 1.8, 0.06));
      });
    });
    observer.observe(container.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [ready, container, getNodes, getNodesBounds, setViewport]);
  return null;
}

export function NetworkGraph({ evidence, posterior, changed, fresh, onSelect, focused }: {
  evidence: Evidence; posterior: Posteriors; changed: readonly NodeId[]; fresh?: NodeId;
  onSelect: (id: NodeId) => void; focused: NodeId | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const nodes: VariableNode[] = NETWORK.map(v => ({
    id: v.id, type: 'variable', position: positions[v.id],
    width: 165, height: 94,
    data: { id: v.id, evidence, posterior, changed: changed.includes(v.id), fresh: fresh === v.id, onSelect },
    draggable: false, selectable: false,
  }));
  const edges = NETWORK.flatMap(v => v.parents.map(parent => {
    const highlight = focused ? focused === parent || focused === v.id : fresh === parent || fresh === v.id;
    return {
      id: `${parent}-${v.id}`, source: parent, target: v.id,
      type: 'default', markerEnd: { type: MarkerType.ArrowClosed, width: 10, height: 10, color: highlight ? '#15796f' : '#abbdb9' },
      style: { stroke: highlight ? '#15796f' : '#a8bbb7', strokeWidth: highlight ? 1.7 : 0.9, opacity: highlight ? 0.9 : 0.28 },
    };
  }));
  return (
    <div ref={container} className="network-canvas" aria-label="Fixed directed acyclic Bayesian network. Select a node to inspect its distribution and relationships.">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes}
        minZoom={0.2} maxZoom={1.8} nodesDraggable={false} nodesConnectable={false} edgesFocusable={false}>
        <FitViewport container={container} />
        <Background gap={22} size={1} color="#dce7e2" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
