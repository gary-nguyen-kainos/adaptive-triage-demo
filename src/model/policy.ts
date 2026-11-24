import { urgencyFloor, type Distribution, type Evidence, type NodeId } from './network';

export const SAFETY_ORDER: readonly NodeId[] = ['breathing_difficulty', 'unable_to_swallow_fluids', 'drooling'];
export interface SafetyOverride {
  source: NodeId;
  title: string;
  explanation: string;
  floor: Distribution;
}
export function safetyOverride(evidence: Evidence): SafetyOverride | undefined {
  if (evidence.breathing_difficulty === 'present') return {
    source: 'breathing_difficulty', title: 'Possible airway concern',
    explanation: 'Breathing difficulty is an illustrative immediate safety concern. Safety has taken priority; ordinary question optimisation is stopped.',
    floor: [0.98, 0.015, 0.004, 0.001],
  };
  if (evidence.drooling === 'present') return {
    source: 'drooling', title: 'Possible swallowing safety concern',
    explanation: 'Drooling because swallowing is difficult triggers an illustrative escalation. Ordinary question optimisation is stopped.',
    floor: [0.65, 0.34, 0.009, 0.001],
  };
  if (evidence.unable_to_swallow_fluids === 'present') return {
    source: 'unable_to_swallow_fluids', title: 'Unable to swallow fluids',
    explanation: 'Inability to swallow fluids triggers an illustrative urgent safety concern. Ordinary question optimisation is stopped; unanswered safety checks remain available.',
    floor: [0.35, 0.64, 0.009, 0.001],
  };
  return undefined;
}
export function applySafety(distribution: Distribution, evidence: Evidence): Distribution {
  const override = safetyOverride(evidence);
  return override ? urgencyFloor(distribution, override.floor) : [...distribution];
}
export interface Disposition { band: string; action: string; reason: string }
export function disposition(distribution: Distribution, evidence: Evidence): Disposition {
  const override = safetyOverride(evidence);
  if (override?.source === 'breathing_difficulty' || override?.source === 'drooling' || distribution[0] >= 0.2) {
    return { band: 'Immediate', action: 'Illustrative immediate assessment', reason: override ? 'Safety escalation and / or immediate probability threshold.' : 'Immediate probability is at least 20%.' };
  }
  if (override || distribution[0] + distribution[1] >= 0.35) {
    return { band: 'Urgent', action: 'Illustrative same-day assessment', reason: 'Safety escalation or combined immediate + urgent probability is at least 35%.' };
  }
  if (distribution[0] + distribution[1] + distribution[2] >= 0.4) {
    return { band: 'Soon', action: 'Illustrative assessment within 48 hours', reason: 'Combined immediate + urgent + soon probability is at least 40%.' };
  }
  return { band: 'Routine or self-care', action: 'Illustrative routine / self-care information', reason: 'No safety override and all escalation thresholds are below their synthetic cut-offs.' };
}
