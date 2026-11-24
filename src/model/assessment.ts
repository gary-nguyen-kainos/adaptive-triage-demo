import { BY_ID, type Evidence, type NodeId } from './network';
import { validateEvidence } from './inference';

export interface Answer { id: NodeId; state: string; revision: number }
export function evidenceFrom(answers: readonly Answer[]): Evidence {
  return Object.fromEntries(answers.map(answer => [answer.id, answer.state]));
}
export function setAnswer(answers: readonly Answer[], id: NodeId, state: string): Answer[] {
  validateEvidence({ [id]: state });
  if (!BY_ID[id].question) throw new Error('Only observable questions accept evidence');
  const previous = answers.find(a => a.id === id);
  if (previous) return answers.map(a => a.id === id ? { id, state, revision: a.revision + 1 } : a);
  return [...answers, { id, state, revision: 0 }];
}
