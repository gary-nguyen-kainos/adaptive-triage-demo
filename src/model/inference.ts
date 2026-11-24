import {
  ACUITY_PARENTS, BY_ID, CONDITIONS, FEATURES, NETWORK, QUESTION_IDS, conditional,
  type Distribution, type Evidence, type NodeId, type Posteriors,
} from './network';

const LATENT: readonly NodeId[] = ['age', 'immunocompromised', ...CONDITIONS];
const SEVERITY = ACUITY_PARENTS.filter(id => !CONDITIONS.includes(id));
const cache = new Map<string, Posteriors>();

export function validateEvidence(evidence: Evidence) {
  for (const [key, state] of Object.entries(evidence)) {
    const id = key as NodeId;
    if (!QUESTION_IDS.includes(id) || !BY_ID[id].states.includes(state)) {
      throw new Error(`Invalid patient evidence: ${key} = ${state}`);
    }
  }
}

/** Exact sum-product inference: enumerate risk/condition combinations; marginalise feature leaves. */
export function infer(evidence: Evidence): Posteriors {
  validateEvidence(evidence);
  const key = QUESTION_IDS.filter(id => evidence[id] !== undefined).map(id => `${id}:${evidence[id]}`).join('|');
  const cached = cache.get(key);
  if (cached) return cached;
  const result = Object.fromEntries(NETWORK.map(v => [v.id, v.states.map(() => 0)])) as Posteriors;
  let normaliser = 0;

  function accumulate(assignment: Evidence, latentWeight: number) {
    let weight = latentWeight;
    for (const id of FEATURES) {
      if (evidence[id] !== undefined) {
        weight *= conditional(id, assignment)[BY_ID[id].states.indexOf(evidence[id]!)];
      }
    }
    if (weight === 0) return;
    normaliser += weight;
    for (const id of LATENT) result[id][BY_ID[id].states.indexOf(assignment[id]!)] += weight;
    for (const id of FEATURES) {
      const distribution = evidence[id] !== undefined
        ? BY_ID[id].states.map(state => state === evidence[id] ? 1 : 0)
        : conditional(id, assignment);
      distribution.forEach((p, i) => { result[id][i] += weight * p; });
    }
    function sumSeverity(index: number, full: Evidence, probability: number) {
      if (index === SEVERITY.length) {
        conditional('acuity', full).forEach((p, i) => { result.acuity[i] += weight * probability * p; });
        return;
      }
      const id = SEVERITY[index];
      const v = BY_ID[id];
      if (evidence[id] !== undefined) {
        sumSeverity(index + 1, { ...full, [id]: evidence[id] }, probability);
      } else {
        conditional(id, assignment).forEach((p, i) => {
          sumSeverity(index + 1, { ...full, [id]: v.states[i] }, probability * p);
        });
      }
    }
    sumSeverity(0, assignment, 1);
  }
  function enumerate(index: number, assignment: Evidence, weight: number) {
    if (index === LATENT.length) {
      accumulate(assignment, weight);
      return;
    }
    const id = LATENT[index];
    conditional(id, assignment).forEach((p, i) => {
      const state = BY_ID[id].states[i];
      if (evidence[id] === undefined || evidence[id] === state) {
        enumerate(index + 1, { ...assignment, [id]: state }, weight * p);
      }
    });
  }
  enumerate(0, {}, 1);
  if (normaliser <= 0 || !Number.isFinite(normaliser)) throw new Error('Evidence has zero or invalid probability');
  for (const v of NETWORK) {
    result[v.id] = result[v.id].map(p => p / normaliser);
    Object.freeze(result[v.id]);
  }
  Object.freeze(result);
  // Bounded memoisation is an optimisation only; every cache miss is exact inference.
  if (cache.size >= 512) cache.clear();
  cache.set(key, result);
  return result;
}

export function entropy(distribution: Distribution): number {
  if (distribution.some(p => !Number.isFinite(p) || p < 0 || p > 1)
    || Math.abs(distribution.reduce((a, b) => a + b, 0) - 1) > 1e-8) {
    throw new Error('Entropy requires a valid probability distribution');
  }
  return distribution.reduce((total, p) => total - (p === 0 ? 0 : p * Math.log2(p)), 0);
}
export const PRIOR = infer({});
