import { ArrowLeft, ArrowRight, RotateCcw, X } from 'lucide-react';

export const GUIDE_STEPS = [
  { title: 'Look at the network', text: 'Each box is a feature or possible condition. Arrows show how they may be connected. They do not show the order of questions. The network itself stays the same during the demo.' },
  { title: 'See the starting estimates', text: 'Before any answers, the network shows its starting probabilities. These are made-up example numbers. Each box has its own probabilities, so numbers in different boxes do not need to add up to 100%.' },
  { title: 'Look at the first question', text: 'The example asks whether the patient has trouble breathing. This is a safety question, so it comes first. Click Next to record the example answer, “No”.' },
  { title: 'The answer is recorded', text: 'The example answer is now in the patient’s answer list. It tells the network that breathing difficulty is absent.' },
  { title: 'See the estimates update', text: 'The network has not changed. It has recalculated its estimates using the new answer. Look at the updated probabilities for this patient.' },
  { title: 'Notice what changed', text: 'Breathing difficulty is marked as absent. Some estimates for serious conditions and urgent care go down. These are estimates, not confirmed diagnoses.' },
  { title: 'Review the question list', text: 'Scroll down to “Inspect question ranking”. It compares the unanswered questions and how much each may help estimate urgency. A balanced answer is not always useful.' },
  { title: 'Safety questions come first', text: 'The next example question is about swallowing fluids. It comes before ordinary questions because it is a safety check. After safety checks, questions are ranked by how useful their answers may be.' },
  { title: 'Look at urgency, not diagnosis', text: 'The chart shows four levels of urgency, with uncertainty across them. Try the airway-concern scenario later to see how a safety rule can raise the urgency estimate.' },
  { title: 'See how the example policy works', text: 'The network estimates urgency. A separate example policy turns those estimates into an action or time band. Its rules and numbers are made up for this demo.' },
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
