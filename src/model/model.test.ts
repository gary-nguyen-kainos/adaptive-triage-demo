import { describe, expect, it } from 'vitest';
import { ACUITY_PARENTS, BY_ID, NETWORK, QUESTION_IDS, conditional, urgencyFloor, validateNetwork, type Evidence, type Variable } from './network';
import { entropy, infer, PRIOR } from './inference';
import { evaluateQuestions } from './questions';
import { applySafety, disposition, safetyOverride } from './policy';
import { evidenceFrom, setAnswer } from './assessment';
import { SCENARIOS } from './scenarios';

const scenarioEvidence = (index: number): Evidence => Object.fromEntries(SCENARIOS[index].answers.map(a => [a.id, a.state]));
function expectNoLowerUrgency(before: number[], after: number[]) {
  for (let end = 1; end <= 3; end++) {
    expect(after.slice(0, end).reduce((a, b) => a + b, 0) + 1e-12)
      .toBeGreaterThanOrEqual(before.slice(0, end).reduce((a, b) => a + b, 0));
  }
}

describe('Fixed, synthetic network', () => {
  it('has a DAG and complete, normalised conditional probability tables', () => {
    expect(() => validateNetwork()).not.toThrow();
  });
  it('rejects cycles, missing CPTs and invalid probabilities', () => {
    const cycle = NETWORK.map(v => v.id === 'age' ? { ...v, parents: ['acuity'] } : v) as Variable[];
    expect(() => validateNetwork(cycle)).toThrow('cycle');
    expect(() => validateNetwork(NETWORK.map(v => v.id === 'age' ? { ...v, cpt: {} } : v))).toThrow('distribution');
    expect(() => validateNetwork(NETWORK.map(v => v.id === 'age' ? { ...v, cpt: { '': [0.4, 0.4, 0.4] } } : v))).toThrow('distribution');
  });
});

describe('Exact Bayesian inference', () => {
  it('normalises each node and makes observed evidence a point distribution', () => {
    const posterior = infer({ breathing_difficulty: 'present' });
    Object.values(posterior).forEach(p => expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10));
    expect(posterior.breathing_difficulty[1]).toBeCloseTo(1, 10);
    expect(posterior.abscess[1]).toBeGreaterThan(PRIOR.abscess[1]);
    expect(posterior.acuity[0]).toBeGreaterThan(0.93);
  });
  it('matches a directly calculated Bayes posterior for a condition from cough evidence', () => {
    const pViral = PRIOR.viral[1];
    const expected = 0.52 * pViral / (0.52 * pViral + 0.48 * (1 - pViral));
    expect(infer({ cough: 'present' }).viral[1]).toBeCloseTo(expected, 12);
  });
  it('matches the acuity CPT when all its parents are fixed by risk/condition enumeration', () => {
    const evidence: Evidence = {
      age: 'adult', immunocompromised: 'absent', difficulty_swallowing: 'severe',
      breathing_difficulty: 'absent', drooling: 'absent', unable_to_swallow_fluids: 'absent',
    };
    let denominator = 0;
    const expected = [0, 0, 0, 0];
    for (const viral of BY_ID.viral.states) for (const strep of BY_ID.strep.states) for (const abscess of BY_ID.abscess.states) {
      const a = { ...evidence, viral, strep, abscess };
      let weight = 1;
      for (const id of ['viral', 'strep', 'abscess', ...ACUITY_PARENTS.filter(id => BY_ID[id].role === 'feature')] as const) {
        weight *= conditional(id, a)[BY_ID[id].states.indexOf(a[id]!)];
      }
      denominator += weight;
      conditional('acuity', a).forEach((p, i) => { expected[i] += weight * p; });
    }
    infer(evidence).acuity.forEach((p, i) => expect(p).toBeCloseTo(expected[i] / denominator, 12));
  });
  it('corrects from the complete current evidence and resets to the priors', () => {
    const fixedModel = JSON.stringify(NETWORK);
    let answers = setAnswer([], 'sore_throat', 'present');
    answers = setAnswer(answers, 'breathing_difficulty', 'present');
    const high = infer(evidenceFrom(answers)).acuity[0];
    answers = setAnswer(answers, 'breathing_difficulty', 'absent');
    expect(answers).toHaveLength(2);
    expect(answers[1].revision).toBe(1);
    expect(infer(evidenceFrom(answers))).toEqual(infer({ sore_throat: 'present', breathing_difficulty: 'absent' }));
    expect(infer(evidenceFrom(answers)).acuity[0]).toBeLessThan(high);
    expect(infer(evidenceFrom([]))).toEqual(PRIOR);
    expect(JSON.stringify(NETWORK)).toBe(fixedModel);
  });
  it('rejects invalid evidence rather than silently falling back', () => {
    expect(() => infer({ fever: 'perhaps' })).toThrow('Invalid patient evidence');
    expect(() => infer({ acuity: 'Immediate' })).toThrow('Invalid patient evidence');
  });
  it('produces the three required scenario directions', () => {
    const low = infer(scenarioEvidence(0));
    expect(low.abscess[1]).toBeLessThan(PRIOR.abscess[1]);
    expect(low.strep[1]).toBeLessThan(PRIOR.strep[1]);
    expect(low.acuity[0] + low.acuity[1]).toBeLessThan(PRIOR.acuity[0] + PRIOR.acuity[1]);
    expect(low.acuity[3]).toBeGreaterThan(PRIOR.acuity[3]);
    const swallowing = infer(scenarioEvidence(1));
    expect(swallowing.abscess[1]).toBeGreaterThan(PRIOR.abscess[1]);
    expect(swallowing.acuity[0] + swallowing.acuity[1]).toBeGreaterThan(0.9);
    expect(infer(scenarioEvidence(2)).acuity[0]).toBeGreaterThan(0.93);
  });
});

describe('Information gain and safety-first selection', () => {
  it('uses Shannon entropy, handling zero-probability states', () => {
    expect(entropy([0.5, 0.5])).toBe(1);
    expect(entropy([1, 0])).toBe(0);
    expect(() => entropy([0.4, 0.4])).toThrow();
  });
  it('prioritises mandatory unanswered safety questions and excludes answered ones', () => {
    expect(evaluateQuestions({}).selected).toBe('breathing_difficulty');
    const selection = evaluateQuestions({ breathing_difficulty: 'absent' });
    expect(selection.selected).toBe('unable_to_swallow_fluids');
    expect(selection.candidates.some(c => c.id === 'breathing_difficulty')).toBe(false);
    expect(selection.candidates.find(c => c.selected)?.reason).toContain('not information gain');
  });
  it('ranks ordinary questions by expected acuity entropy reduction, not answer balance', () => {
    const evidence: Evidence = { breathing_difficulty: 'absent', unable_to_swallow_fluids: 'absent', drooling: 'absent' };
    const result = evaluateQuestions(evidence);
    const maximum = Math.max(...result.candidates.map(c => c.gain));
    expect(result.candidates.find(c => c.selected)!.gain).toBeCloseTo(maximum, 12);
    const cough = result.candidates.find(c => c.id === 'cough')!;
    expect(cough.answers[1]).toBeGreaterThan(0.48);
    expect(cough.answers[1]).toBeLessThan(0.52);
    expect(cough.gain).toBeLessThan(0.001);
    for (const c of result.candidates) {
      const expected = c.answers.reduce((total, p, i) => total + p * entropy(infer({ ...evidence, [c.id]: BY_ID[c.id].states[i] }).acuity), 0);
      expect(c.expectedEntropy).toBeCloseTo(expected, 12);
      expect(c.gain).toBeCloseTo(c.currentEntropy - expected, 12);
      expect(c.gain).toBeLessThanOrEqual(entropy(c.answers) + 1e-10);
    }
    const baseline = evaluateQuestions({});
    expect(baseline.candidates.find(c => c.id === 'breathing_difficulty')!.gain)
      .toBeGreaterThan(baseline.candidates.find(c => c.id === 'cough')!.gain);
  });
  it('stops ordinary optimisation after an override; only remaining safety checks may continue', () => {
    expect(evaluateQuestions(scenarioEvidence(2))).toEqual({ candidates: [], stopped: true });
    const fluids = evaluateQuestions(scenarioEvidence(1));
    expect(fluids.stopped).toBe(true);
    expect(fluids.selected).toBe('drooling');
    expect(fluids.candidates.filter(c => !c.mandatory).every(c => c.reason.includes('Not eligible'))).toBe(true);
  });
  it('cannot lower urgency at any cumulative boundary, including already high-risk distributions', () => {
    for (const id of ['breathing_difficulty', 'unable_to_swallow_fluids', 'drooling'] as const) {
      for (const p of [[0.99, 0.005, 0.004, 0.001], [0.01, 0.7, 0.2, 0.09], [0, 0, 0, 1], PRIOR.acuity]) {
        const after = applySafety(p, { [id]: 'present' });
        expectNoLowerUrgency(p, after);
        expect(after.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
        expect(after.every(n => n >= 0)).toBe(true);
      }
    }
    expect(urgencyFloor([0, 0, 0, 1], [0.98, 0.015, 0.004, 0.001])[0]).toBe(0.98);
  });
  it('keeps policy separate from inference and honours synthetic threshold boundaries', () => {
    expect(disposition([0.2, 0, 0, 0.8], {}).band).toBe('Immediate');
    expect(disposition([0.1, 0.25, 0, 0.65], {}).band).toBe('Urgent');
    expect(disposition([0.1, 0.1, 0.2, 0.6], {}).band).toBe('Soon');
    expect(disposition([0, 0, 0.1, 0.9], {}).band).toBe('Routine or self-care');
    const evidence = scenarioEvidence(2);
    const before = [...infer(evidence).acuity];
    expect(safetyOverride(evidence)?.source).toBe('breathing_difficulty');
    applySafety(infer(evidence).acuity, evidence);
    expect(infer(evidence).acuity).toEqual(before);
    expect(QUESTION_IDS.includes('acuity')).toBe(false);
  });
});
