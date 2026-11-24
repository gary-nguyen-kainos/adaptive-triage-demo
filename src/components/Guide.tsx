import { ArrowLeft, ArrowRight, RotateCcw, X } from 'lucide-react';

export const GUIDE_STEPS = [
  { title: 'Meet the fixed network', text: 'Every node is a random variable, not a category in a hierarchy. The arrows describe probabilistic dependencies. This model stays fixed throughout the assessment.' },
  { title: 'Start with prior beliefs', text: 'Before answers are entered, the synthetic tables define prior distributions. States within each node sum to 100%; probabilities across nodes do not.' },
  { title: 'Ask one patient question', text: 'The guided example asks about breathing difficulty. In normal selection this is the first mandatory safety check, regardless of information gain.' },
  { title: 'Turn the answer into evidence', text: 'The example answer is No. The model receives breathing_difficulty = absent. An observable feature has become observed evidence.' },
  { title: 'Recalculate for this patient', text: 'Exact Bayesian inference conditions on the complete evidence set. The model has not changed. Its beliefs for this patient have changed because new evidence was entered.' },
  { title: 'See what changed', text: 'Breathing difficulty is now observed as absent. Serious hidden-condition probabilities and immediate acuity decrease. Beliefs update in reverse along arrows. A high probability is not a confirmed diagnosis.' },
  { title: 'Evaluate possible questions', text: 'Open Inspect question ranking below. Every unanswered question has predicted answers and an expected reduction in acuity entropy. The near-balanced cough question provides little useful acuity information.' },
  { title: 'Choose safely, then informatively', text: 'Safety comes before information gain. The next question asks about swallowing fluids because it is still a mandatory safety check. Once safety checks are answered, ordinary questions are ranked by expected information gain.' },
  { title: 'Estimate acuity, not diagnosis', text: 'Acuity describes urgency of clinical need. Review all four Bayesian acuity states. Try the airway-concern scenario later to see a safety override and a separate safety-adjusted distribution.' },
  { title: 'Apply a separate policy', text: 'The Bayesian network estimates acuity. A separately governed policy maps acuity probabilities to a service, action or time band. All thresholds and time bands here are synthetic and illustrative.' },
] as const;

export function Guide({ step, onNext, onBack, onReplay, onExit }: {
  step: number; onNext: () => void; onBack: () => void; onReplay: () => void; onExit: () => void;
}) {
  return (
    <section className="guide" aria-label="Guided demonstration">
      <div className="guide-progress"><span>{String(step + 1).padStart(2, '0')}</span><small>OF 10</small></div>
      <div className="guide-copy"><span className="eyebrow">GUIDED DEMO</span><h2>{GUIDE_STEPS[step].title}</h2><p>{GUIDE_STEPS[step].text}</p>
        <div className="guide-dots">{GUIDE_STEPS.map((s, i) => <span key={s.title} className={i <= step ? 'complete' : ''} />)}</div>
      </div>
      <div className="guide-controls">
        <div><button className="icon-button" onClick={onReplay} aria-label="Replay guided demo"><RotateCcw size={16} /></button><button className="text-button" onClick={onExit}>Exit<X size={14} /></button></div>
        <div><button className="secondary-button" onClick={onBack} disabled={step === 0}><ArrowLeft size={15} />Back</button><button className="primary-button" onClick={onNext}>{step === 9 ? 'Finish' : 'Next'}<ArrowRight size={15} /></button></div>
      </div>
    </section>
  );
}
