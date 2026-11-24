import { ArrowDown, ArrowRight, GitBranch, Network, ShieldCheck } from 'lucide-react';
import { BY_ID, answerLabel, type Evidence, type NodeId } from '../model/network';
import { evaluateQuestions } from '../model/questions';

const fixedSequence: readonly NodeId[] = ['breathing_difficulty', 'unable_to_swallow_fluids', 'drooling', 'fever', 'cough'];
export function Comparison({ evidence }: { evidence: Evidence }) {
  const stop = fixedSequence.findIndex(id => BY_ID[id].mandatory && evidence[id] === 'present');
  const nextIndex = stop >= 0 ? stop : fixedSequence.findIndex(id => evidence[id] === undefined);
  const adaptive = evaluateQuestions(evidence);
  return (
    <section className="card comparison">
      <div className="card-heading"><div><span className="eyebrow">TWO WAYS TO REASON</span><h2>A pathway is not a probability model.</h2></div><span className="badge">Illustrative comparison</span></div>
      <p>Both approaches can use the same patient answers. They differ in how those answers are represented and how the next question is chosen.</p>
      <div className="comparison-columns">
        <div className="pathway-pane"><h3><GitBranch size={19} />Deterministic pathway</h3><p>A predefined order and fixed branches.</p>
          {fixedSequence.map((id, index) => <div key={id}>
            <div className={`pathway-step ${index === nextIndex ? 'current-branch' : ''} ${stop >= 0 && index > stop ? 'inactive-branch' : ''}`}>
              <span className="step-number">{index + 1}</span><div><strong>{BY_ID[id].label}?</strong><small>{evidence[id] !== undefined ? `Answer: ${answerLabel(evidence[id]!)}${BY_ID[id].mandatory && evidence[id] === 'present' ? ' → escalation branch' : ' → continue'}` : 'No → next fixed question'}{evidence[id] === undefined && BY_ID[id].mandatory ? ' · Yes → escalation' : ''}</small></div>
              {index === nextIndex && <span className="tiny-tag">{stop >= 0 ? 'Escalate' : 'Next'}</span>}
            </div>{index < fixedSequence.length - 1 && <ArrowDown className="pathway-arrow" size={16} />}
          </div>)}
          <div className="info-note">The next question follows fixed pathway logic, even if a different question would reduce more uncertainty.</div>
        </div>
        <div className="adaptive-pane"><h3><Network size={19} />Adaptive Bayesian network</h3><p>One answer updates several connected beliefs.</p>
          <div className="adaptive-step"><span>01</span><div><strong>Observe evidence</strong><p>Keep the complete set of current answers; corrections replace evidence, not the model.</p></div></div>
          <div className="adaptive-step"><span>02</span><div><strong>Infer patient-specific probabilities</strong><p>Recalculate hidden-condition and acuity distributions using Bayes' rule.</p></div></div>
          <div className="adaptive-step"><span>03</span><div><strong>Evaluate unanswered questions</strong><p>Estimate how each possible answer would change acuity entropy.</p></div></div>
          <div className="adaptive-step"><span><ShieldCheck size={16} /></span><div><strong>Apply safety-first selection</strong><p>{adaptive.selected ? `Next: ${BY_ID[adaptive.selected].label}. ${BY_ID[adaptive.selected].mandatory ? 'Chosen by mandatory safety order.' : 'Chosen by expected information gain.'}` : adaptive.stopped ? 'Safety override: ordinary optimisation stopped.' : 'All candidate questions answered.'}</p></div></div>
          <div className="info-note">Arrows represent probabilistic dependencies, not question order. Evidence can update beliefs in the reverse direction of an arrow.</div>
        </div>
      </div>
      <div className="mapping-example"><span className="eyebrow">FROM PATHWAY ANSWER TO EVIDENCE</span><div><span>“Are you unable to swallow fluids?”<small>Pathway question</small></span><ArrowRight size={20} /><span>“Yes”<small>Patient answer</small></span><ArrowRight size={20} /><code>unable_to_swallow_fluids = present<small>Bayesian-network evidence</small></code></div></div>
      <p className="small">Existing pathways may provide clinically relevant questions, possible answers, clinical concepts, safety rules, and historical episodes and outcomes. A pathway branch should <strong>not</strong> automatically become an edge in the Bayesian network; dependencies require modelling and clinical agreement.</p>
    </section>
  );
}
