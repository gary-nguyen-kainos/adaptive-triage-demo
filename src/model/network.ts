export const MODEL_VERSION = 'SYNTHETIC-ST-1.0';
export const DISCLAIMER = 'Educational demonstration only. Uses synthetic probabilities and is not clinically approved or suitable for patient care.';
export const IDS = [
  'age', 'immunocompromised', 'viral', 'strep', 'abscess',
  'sore_throat', 'fever', 'cough', 'difficulty_swallowing',
  'unable_to_swallow_fluids', 'drooling', 'breathing_difficulty', 'unilateral', 'acuity',
] as const;
export type NodeId = typeof IDS[number];
export type Role = 'risk' | 'condition' | 'feature' | 'target';
export type Evidence = Partial<Record<NodeId, string>>;
export type Distribution = number[];
export type Posteriors = Record<NodeId, Distribution>;
export interface Variable {
  id: NodeId;
  label: string;
  role: Role;
  states: readonly string[];
  parents: readonly NodeId[];
  cpt: Record<string, Distribution>;
  description: string;
  question?: string;
  mandatory?: boolean;
  burden: number;
}
export const CONDITIONS: readonly NodeId[] = ['viral', 'strep', 'abscess'];
export const FEATURES: readonly NodeId[] = [
  'sore_throat', 'fever', 'cough', 'difficulty_swallowing',
  'unable_to_swallow_fluids', 'drooling', 'breathing_difficulty', 'unilateral',
];
export const ACUITY_PARENTS: readonly NodeId[] = [
  ...CONDITIONS, 'difficulty_swallowing', 'unable_to_swallow_fluids', 'drooling', 'breathing_difficulty',
];
export const ACUITY_LABELS = ['Immediate', 'Urgent', 'Soon', 'Routine or self-care'] as const;
const binary = ['absent', 'present'] as const;
const variables: Variable[] = [];

function add(
  definition: Omit<Variable, 'cpt' | 'burden'> & { burden?: number },
  probabilities: (assignment: Evidence) => Distribution,
) {
  const cpt: Record<string, Distribution> = {};
  const visit = (index: number, assignment: Evidence) => {
    if (index === definition.parents.length) {
      cpt[definition.parents.map(id => assignment[id]).join('|')] = probabilities(assignment);
      return;
    }
    const parent = definition.parents[index];
    const variable = variables.find(v => v.id === parent);
    if (!variable) throw new Error(`Parent ${parent} must be defined before ${definition.id}`);
    for (const state of variable.states) visit(index + 1, { ...assignment, [parent]: state });
  };
  visit(0, {});
  variables.push({ ...definition, burden: definition.burden ?? 1, cpt });
}
const yes = (a: Evidence, id: NodeId) => a[id] === 'present';
const bernoulli = (p: number): Distribution => [1 - p, p];

// Cumulative floors shift mass towards greater urgency, never towards lower urgency.
export function urgencyFloor(distribution: Distribution, floor: Distribution): Distribution {
  let current = 0;
  let minimum = 0;
  let previous = 0;
  return distribution.map((p, i) => {
    current += p;
    minimum += floor[i];
    const cumulative = i === distribution.length - 1 ? 1 : Math.max(current, minimum);
    const result = cumulative - previous;
    previous = cumulative;
    return result;
  });
}

add({
  id: 'age', label: 'Age group', role: 'risk', states: ['child', 'adult', 'older_adult'], parents: [],
  description: 'A categorical risk variable. These age bands and priors are illustrative.',
  question: 'Which age group describes this synthetic patient?',
}, () => [0.25, 0.6, 0.15]);
add({
  id: 'immunocompromised', label: 'Immunocompromised', role: 'risk', states: binary, parents: [],
  description: 'A risk factor that changes hidden-condition priors, not a diagnosis.',
  question: 'Is the synthetic patient immunocompromised?',
}, () => bernoulli(0.08));

for (const [id, label, base] of [
  ['viral', 'Viral pharyngitis', [0.65, 0.48, 0.38]],
  ['strep', 'Streptococcal infection', [0.24, 0.13, 0.09]],
  ['abscess', 'Peritonsillar abscess', [0.012, 0.025, 0.035]],
] as const) {
  add({
    id, label, role: 'condition', states: binary, parents: ['age', 'immunocompromised'],
    description: 'A possible hidden condition, inferred rather than confirmed. Conditions may coexist; these three nodes are not an exhaustive diagnosis list.',
  }, a => {
    const index = ['child', 'adult', 'older_adult'].indexOf(a.age!);
    return bernoulli(Math.min(0.95, base[index] * (yes(a, 'immunocompromised') ? (id === 'abscess' ? 3 : 1.2) : 1)));
  });
}

const featureDefinitions: {
  id: NodeId; label: string; question: string; baseline: number;
  viral: number; strep: number; abscess: number; mandatory?: boolean;
}[] = [
  { id: 'sore_throat', label: 'Sore throat', question: 'Does the patient have a sore throat?', baseline: 0.12, viral: 0.88, strep: 0.95, abscess: 0.98 },
  { id: 'fever', label: 'Fever', question: 'Does the patient have a fever?', baseline: 0.08, viral: 0.3, strep: 0.7, abscess: 0.78 },
  { id: 'cough', label: 'Cough', question: 'Does the patient have a cough?', baseline: 0.48, viral: 0.52, strep: 0.48, abscess: 0.48 },
  { id: 'unable_to_swallow_fluids', label: 'Unable to swallow fluids', question: 'Are you unable to swallow fluids?', baseline: 0.008, viral: 0.012, strep: 0.045, abscess: 0.5, mandatory: true },
  { id: 'drooling', label: 'Drooling', question: 'Is the patient drooling because swallowing is difficult?', baseline: 0.003, viral: 0.005, strep: 0.015, abscess: 0.28, mandatory: true },
  { id: 'breathing_difficulty', label: 'Breathing difficulty', question: 'Is the patient having difficulty breathing?', baseline: 0.002, viral: 0.004, strep: 0.008, abscess: 0.12, mandatory: true },
  { id: 'unilateral', label: 'Unilateral pain / swelling', question: 'Is there one-sided throat pain or swelling?', baseline: 0.04, viral: 0.06, strep: 0.14, abscess: 0.88 },
];
for (const feature of featureDefinitions) {
  const { id, label, question, mandatory } = feature;
  add({
    id, label, question, mandatory, role: 'feature', states: binary,
    parents: id === 'cough' ? ['viral'] : CONDITIONS,
    description: mandatory
      ? 'An observable feature and severity indicator. A Yes answer also triggers a separate illustrative safety rule.'
      : id === 'cough'
        ? 'Deliberately close to a 50/50 answer split, with little relevance to acuity in this synthetic model.'
        : 'An observable clinical feature. Its answer becomes evidence and can update hidden-condition beliefs in reverse along arrows.',
  }, a => bernoulli(Math.max(feature.baseline,
    yes(a, 'viral') ? feature.viral : 0,
    yes(a, 'strep') ? feature.strep : 0,
    yes(a, 'abscess') ? feature.abscess : 0,
  )));
}
add({
  id: 'difficulty_swallowing', label: 'Difficulty swallowing', role: 'feature',
  states: ['none', 'mild', 'severe'], parents: CONDITIONS,
  description: 'Both a symptom and a severity modifier. The three states form one probability distribution.',
  question: 'How much difficulty is the patient having swallowing?', burden: 1.2,
}, a => yes(a, 'abscess') ? [0.03, 0.22, 0.75]
  : yes(a, 'strep') ? [0.3, 0.55, 0.15]
    : yes(a, 'viral') ? [0.6, 0.37, 0.03] : [0.89, 0.1, 0.01]);
add({
  id: 'acuity', label: 'Acuity', role: 'target', states: ACUITY_LABELS, parents: ACUITY_PARENTS,
  description: 'Urgency of clinical need, not a diagnosis or disposition. All four states must be considered.',
}, a => {
  let p = yes(a, 'abscess') ? [0.03, 0.68, 0.26, 0.03]
    : yes(a, 'strep') ? [0.003, 0.1, 0.52, 0.377]
      : yes(a, 'viral') ? [0.001, 0.012, 0.1, 0.887] : [0.002, 0.025, 0.13, 0.843];
  if (a.difficulty_swallowing === 'severe') p = urgencyFloor(p, [0.05, 0.55, 0.3, 0.1]);
  if (yes(a, 'unable_to_swallow_fluids')) p = urgencyFloor(p, [0.26, 0.65, 0.08, 0.01]);
  if (yes(a, 'drooling')) p = urgencyFloor(p, [0.55, 0.4, 0.045, 0.005]);
  if (yes(a, 'breathing_difficulty')) p = urgencyFloor(p, [0.94, 0.05, 0.009, 0.001]);
  return p;
});

export const NETWORK: readonly Variable[] = variables;
export const BY_ID = Object.fromEntries(NETWORK.map(v => [v.id, v])) as Record<NodeId, Variable>;
export const QUESTION_IDS = NETWORK.filter(v => v.question).map(v => v.id);
export function conditional(id: NodeId, assignment: Evidence): Distribution {
  const v = BY_ID[id];
  const key = v.parents.map(parent => assignment[parent]).join('|');
  const row = v.cpt[key];
  if (!row) throw new Error(`Missing conditional probability row for ${id}: ${key}`);
  return row;
}
export function answerLabel(state: string): string {
  const labels: Record<string, string> = {
    present: 'Yes', absent: 'No', child: 'Child', adult: 'Adult', older_adult: 'Older adult',
    none: 'None', mild: 'Mild', severe: 'Severe',
  };
  return labels[state] ?? state;
}

export function validateNetwork(network: readonly Variable[] = NETWORK): void {
  const lookup = new Map(network.map(v => [v.id, v]));
  if (lookup.size !== network.length) throw new Error('Duplicate node ID');
  const visiting = new Set<NodeId>();
  const visited = new Set<NodeId>();
  function visit(id: NodeId) {
    if (visiting.has(id)) throw new Error('Directed cycle detected');
    if (visited.has(id)) return;
    const v = lookup.get(id);
    if (!v) throw new Error(`Unknown parent ${id}`);
    visiting.add(id);
    v.parents.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  network.forEach(v => visit(v.id));
  network.forEach(v => {
    if (v.states.length < 2 || new Set(v.states).size !== v.states.length) throw new Error(`Invalid states: ${v.id}`);
    const checkRow = (index: number, states: string[]) => {
      if (index < v.parents.length) {
        lookup.get(v.parents[index])!.states.forEach(state => checkRow(index + 1, [...states, state]));
        return;
      }
      const row = v.cpt[states.join('|')];
      if (!row || row.length !== v.states.length || row.some(p => !Number.isFinite(p) || p < 0 || p > 1)
        || Math.abs(row.reduce((a, b) => a + b, 0) - 1) > 1e-10) {
        throw new Error(`Invalid conditional probability distribution: ${v.id}`);
      }
    };
    checkRow(0, []);
  });
}
validateNetwork();
