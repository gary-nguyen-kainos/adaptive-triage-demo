import type { NodeId } from './network';

export interface Scenario {
  name: string;
  subtitle: string;
  answers: readonly { id: NodeId; state: string }[];
}
export const SCENARIOS: readonly Scenario[] = [
  {
    name: 'Uncomplicated presentation', subtitle: 'Able to drink; no red flags',
    answers: [
      { id: 'sore_throat', state: 'present' }, { id: 'breathing_difficulty', state: 'absent' },
      { id: 'unable_to_swallow_fluids', state: 'absent' }, { id: 'drooling', state: 'absent' },
      { id: 'fever', state: 'absent' }, { id: 'cough', state: 'present' },
    ],
  },
  {
    name: 'Significant difficulty swallowing', subtitle: 'A safety-led escalation',
    answers: [
      { id: 'sore_throat', state: 'present' }, { id: 'breathing_difficulty', state: 'absent' },
      { id: 'difficulty_swallowing', state: 'severe' }, { id: 'unable_to_swallow_fluids', state: 'present' },
    ],
  },
  {
    name: 'Possible airway concern', subtitle: 'Safety takes priority',
    answers: [{ id: 'sore_throat', state: 'present' }, { id: 'breathing_difficulty', state: 'present' }],
  },
];
