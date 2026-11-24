import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { BY_ID, DISCLAIMER, NETWORK, answerLabel, type Evidence, type NodeId, type Posteriors } from '../model/network';
import { PRIOR, entropy } from '../model/inference';
import { DistributionChart, percent } from './DistributionChart';

export function NodeInspector({ id, evidence, posterior, onClose, onAnswer, onRemove }: {
  id: NodeId; evidence: Evidence; posterior: Posteriors; onClose: () => void;
  onAnswer: (id: NodeId, state: string) => void; onRemove: (id: NodeId) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  const v = BY_ID[id];
  const status = evidence[id] !== undefined ? 'Observed evidence' : Object.keys(evidence).length ? 'Inferred / unobserved' : 'Unobserved · prior';
  const relationships = (ids: readonly NodeId[]) => ids.length ? ids.map(parent => BY_ID[parent].label).join(', ') : 'None';
  return (
    <dialog ref={dialog} className="inspector" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="inspector-content">
        <div className="card-heading"><span className="eyebrow">VARIABLE INSPECTOR · SYNTHETIC</span><button className="icon-button" aria-label="Close node inspector" onClick={onClose}><X size={20} /></button></div>
        <h2>{v.label}</h2><span className="badge">{status}</span><p>{v.description}</p>
        <p className="small">Every node is a random variable. Its states sum to 100%; probabilities across different nodes do not need to sum to 100%.</p>
        <div className="legend"><span><i className="prior-swatch" />Prior</span><span><i className="current-swatch" />Current patient</span></div>
        <DistributionChart labels={v.states.map(answerLabel)} prior={PRIOR[id]} posterior={posterior[id]} />
        <div className="state-list">{v.states.map((state, i) => <div key={state}><span>{answerLabel(state)}</span><strong>{percent(PRIOR[id][i])} → {percent(posterior[id][i])}</strong></div>)}</div>
        <dl className="relationships"><dt>Parents</dt><dd>{relationships(v.parents)}</dd><dt>Children</dt><dd>{relationships(NETWORK.filter(child => child.parents.includes(id)).map(child => child.id))}</dd></dl>
        {v.question && <section className="inspector-evidence">
          <h3>{evidence[id] === undefined ? 'Add synthetic patient evidence' : 'Correct this answer'}</h3><p>{v.question}</p>
          <div className="answer-buttons">{v.states.map(state => <button key={state} className={evidence[id] === state ? 'chosen' : ''} onClick={() => onAnswer(id, state)}>{answerLabel(state)}</button>)}</div>
          {evidence[id] !== undefined && <button className="text-button danger" onClick={() => onRemove(id)}>Remove this evidence</button>}
        </section>}
        <details className="technical-details"><summary>Technical detail: entropy and fixed conditional probabilities</summary>
          <p>Current entropy: <strong>{entropy(posterior[id]).toFixed(5)} bits</strong>. These CPTs never change during an assessment.</p>
          <div className="table-scroll cpt-scroll"><table>
            <caption>Synthetic CPT · parent order: {v.parents.join(', ') || 'No parents (prior)'}</caption>
            <thead><tr><th>Parent states</th>{v.states.map(state => <th key={state}>{answerLabel(state)}</th>)}</tr></thead>
            <tbody>{Object.entries(v.cpt).map(([key, row]) => <tr key={key}><th>{key || 'Unconditional'}</th>{row.map((p, i) => <td key={i}>{percent(p)}</td>)}</tr>)}</tbody>
          </table></div>
        </details>
      </div>
      <div className="inspector-disclaimer">{DISCLAIMER}</div>
    </dialog>
  );
}
