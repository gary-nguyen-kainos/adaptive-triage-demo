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
      <div className="card-heading"><div><span className="eyebrow">PATHWAY VS NETWORK</span><h2>How is a fixed pathway different from the probability network?</h2></div><span className="badge">Example comparison</span></div>
      <p>A pathway asks questions in a set order. A probability network updates its estimates and picks the next question based on the answers so far.</p>
      <div className="comparison-columns">
        <div className="pathway-pane"><h3><GitBranch size={19} />Fixed pathway</h3><p>Questions follow a set order and set of branches.</p>
          {fixedSequence.map((id, index) => <div key={id}>
            <div className={`pathway-step ${index === nextIndex ? 'current-branch' : ''} ${stop >= 0 && index > stop ? 'inactive-branch' : ''}`}>
              <span className="step-number">{index + 1}</span><div><strong>{BY_ID[id].label}?</strong><small>{evidence[id] !== undefined ? `Answer: ${answerLabel(evidence[id]!)}${BY_ID[id].mandatory && evidence[id] === 'present' ? ' → safety action' : ' → continue'}` : 'No → continue'}{evidence[id] === undefined && BY_ID[id].mandatory ? ' · Yes → safety action' : ''}</small></div>
              {index === nextIndex && <span className="tiny-tag">{stop >= 0 ? 'Safety action' : 'Next'}</span>}
            </div>{index < fixedSequence.length - 1 && <ArrowDown className="pathway-arrow" size={16} />}
          </div>)}
          <div className="info-note">It asks the next question in its set order, even if another question might tell us more about urgency.</div>
        </div>
        <div className="adaptive-pane"><h3><Network size={19} />Probability network</h3><p>One answer can update estimates for several connected features and conditions.</p>
          <div className="adaptive-step"><span>01</span><div><strong>Add answers</strong><p>Keep all current answers. Changing one updates estimates, not the network.</p></div></div>
          <div className="adaptive-step"><span>02</span><div><strong>Update estimates</strong><p>Recalculate possible conditions and urgency from the answers so far.</p></div></div>
          <div className="adaptive-step"><span>03</span><div><strong>Compare remaining questions</strong><p>Estimate which answers may make the urgency estimate clearer.</p></div></div>
          <div className="adaptive-step"><span><ShieldCheck size={16} /></span><div><strong>Choose the next question</strong><p>{adaptive.selected ? `Next: ${BY_ID[adaptive.selected].label}. ${BY_ID[adaptive.selected].mandatory ? 'Asked first as a safety question.' : 'Expected to clarify urgency most.'}` : adaptive.stopped ? 'A safety rule is active. Regular questions are paused.' : 'No questions remain unanswered.'}</p></div></div>
          <div className="info-note">Arrows show possible links, not question order. An answer can update estimates for related items either way.</div>
        </div>
      </div>
      <div className="mapping-example"><span className="eyebrow">TURN AN ANSWER INTO NETWORK INPUT</span><div><span>“Are you unable to swallow fluids?”<small>Pathway question</small></span><ArrowRight size={20} /><span>“Yes”<small>Patient answer</small></span><ArrowRight size={20} /><code>unable_to_swallow_fluids = present<small>What the network records</small></code></div></div>
      <p className="small">A pathway can suggest useful questions, answers, and safety rules. Its branches do not automatically become links in the network; those links need separate modelling and clinical agreement.</p>
    </section>
  );
}
