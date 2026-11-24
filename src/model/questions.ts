import { BY_ID, QUESTION_IDS, type Distribution, type Evidence, type NodeId } from './network';
import { entropy, infer } from './inference';
import { SAFETY_ORDER, safetyOverride } from './policy';

export interface Candidate {
  id: NodeId;
  answers: Distribution;
  currentEntropy: number;
  expectedEntropy: number;
  gain: number;
  mandatory: boolean;
  selected: boolean;
  reason: string;
}
export interface QuestionSelection {
  candidates: Candidate[];
  selected?: NodeId;
  stopped: boolean;
}

export function evaluateQuestions(evidence: Evidence): QuestionSelection {
  const posterior = infer(evidence);
  const currentEntropy = entropy(posterior.acuity);
  const override = safetyOverride(evidence);
  if (override?.source === 'breathing_difficulty' || override?.source === 'drooling') {
    return { candidates: [], stopped: true };
  }
  const unanswered = QUESTION_IDS.filter(id => evidence[id] === undefined);
  const candidates: Candidate[] = unanswered.map(id => {
    const v = BY_ID[id];
    const answers = posterior[id];
    const expectedEntropy = answers.reduce((total, p, index) => {
      if (p === 0) return total;
      return total + p * entropy(infer({ ...evidence, [id]: v.states[index] }).acuity);
    }, 0);
    const gain = currentEntropy - expectedEntropy;
    if (gain < -1e-9) throw new Error(`Negative expected information gain for ${id}`);
    return {
      id, answers, currentEntropy, expectedEntropy, gain: Math.max(0, gain),
      mandatory: Boolean(v.mandatory), selected: false, reason: '',
    };
  });
  candidates.sort((a, b) => {
    if (a.mandatory !== b.mandatory) return a.mandatory ? -1 : 1;
    if (a.mandatory && b.mandatory) return SAFETY_ORDER.indexOf(a.id) - SAFETY_ORDER.indexOf(b.id);
    if (Math.abs(a.gain - b.gain) > 1e-8) return b.gain - a.gain;
    return BY_ID[a.id].burden - BY_ID[b.id].burden || QUESTION_IDS.indexOf(a.id) - QUESTION_IDS.indexOf(b.id);
  });
  const eligible = override ? candidates.filter(c => c.mandatory) : candidates;
  const selected = eligible[0]?.id;
  candidates.forEach(c => {
    c.selected = c.id === selected;
    c.reason = c.selected
      ? c.mandatory ? 'Selected by mandatory safety order, not information gain.'
        : 'Highest expected reduction in acuity uncertainty; burden breaks ties.'
      : c.mandatory ? 'Mandatory safety check; another safety question comes first.'
        : override ? 'Not eligible: safety override has stopped ordinary optimisation.'
          : 'Not selected: lower information gain about acuity, or higher burden on a tie.';
  });
  return { candidates, selected, stopped: Boolean(override) };
}
