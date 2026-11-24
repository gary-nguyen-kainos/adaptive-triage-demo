import { useMemo, useState } from 'react';
import {
  ArrowRight, BookOpen, Check, ChevronRight, CircleHelp, ClipboardList, FlaskConical,
  GitCompareArrows, Layers, LockKeyhole, Network, Play, RotateCcw, ShieldAlert, Sparkles, X,
} from 'lucide-react';
import { BY_ID, CONDITIONS, DISCLAIMER, MODEL_VERSION, NETWORK, answerLabel, type NodeId, type Posteriors } from './model/network';
import { PRIOR, entropy, infer } from './model/inference';
import { applySafety, disposition, safetyOverride } from './model/policy';
import { evaluateQuestions } from './model/questions';
import { evidenceFrom, setAnswer, type Answer } from './model/assessment';
import { SCENARIOS } from './model/scenarios';
import { NetworkGraph } from './components/NetworkGraph';
import { DistributionChart, percent } from './components/DistributionChart';
import { QuestionRanking } from './components/QuestionRanking';
import { NodeInspector } from './components/NodeInspector';
import { Comparison } from './components/Comparison';
import { Guide } from './components/Guide';

type Tab = 'workspace' | 'comparison' | 'principles';
function App() {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [previous, setPrevious] = useState<Posteriors>(PRIOR);
  const [fresh, setFresh] = useState<NodeId>();
  const [tab, setTab] = useState<Tab>('workspace');
  const [mode, setMode] = useState<'explore' | 'guided'>('explore');
  const [guideStep, setGuideStep] = useState(0);
  const [scenario, setScenario] = useState<number | null>(null);
  const [scenarioStep, setScenarioStep] = useState(0);
  const [inspect, setInspect] = useState<NodeId | null>(null);
  const [editing, setEditing] = useState<NodeId | null>(null);
  const [pendingAnswer, setPendingAnswer] = useState<string | null>(null);
  const evidence = useMemo(() => evidenceFrom(answers), [answers]);
  const posterior = useMemo(() => infer(evidence), [evidence]);
  const selection = useMemo(() => evaluateQuestions(evidence), [evidence]);
  const override = safetyOverride(evidence);
  const adjusted = applySafety(posterior.acuity, evidence);
  const outcome = disposition(adjusted, evidence);
  const changed = NETWORK.filter(v => posterior[v.id].some((p, i) => Math.abs(p - previous[v.id][i]) > 1e-7)).map(v => v.id);
  const activeScenario = scenario === null ? null : SCENARIOS[scenario];
  const scenarioAnswer = activeScenario?.answers[scenarioStep];
  const currentQuestion = editing ?? (mode === 'guided' && guideStep === 2 ? 'breathing_difficulty' : scenarioAnswer?.id ?? (activeScenario ? undefined : selection.selected));
  const question = currentQuestion ? BY_ID[currentQuestion] : null;

  function commit(id: NodeId, state: string) {
    setPrevious(posterior);
    setAnswers(old => setAnswer(old, id, state));
    setFresh(id);
    setEditing(null);
    setPendingAnswer(null);
  }
  function remove(id: NodeId) {
    setPrevious(posterior);
    setAnswers(old => old.filter(answer => answer.id !== id));
    setFresh(undefined);
    setPendingAnswer(null);
  }
  function reset() {
    setAnswers([]);
    setPrevious(PRIOR);
    setFresh(undefined);
    setScenario(null);
    setScenarioStep(0);
    setEditing(null);
    setPendingAnswer(null);
    setInspect(null);
  }
  function startScenario(index: number) {
    reset();
    setMode('explore');
    setTab('workspace');
    setScenario(index);
  }
  function playAnswer() {
    if (!scenarioAnswer) return;
    commit(scenarioAnswer.id, scenarioAnswer.state);
    setScenarioStep(scenarioStep + 1);
  }
  function startGuide() {
    reset();
    setTab('workspace');
    setGuideStep(0);
    setMode('guided');
  }
  function goGuide(step: number) {
    const nextEvidence = step >= 3 ? [{ id: 'breathing_difficulty' as const, state: 'absent', revision: 0 }] : [];
    setPrevious(posterior);
    setAnswers(nextEvidence);
    setFresh(step >= 3 ? 'breathing_difficulty' : undefined);
    setGuideStep(step);
    setPendingAnswer(null);
  }
  return (
    <div className="app">
      <aside className="rail" aria-label="Primary navigation">
        <a className="brand-mark" href="#main" aria-label="Adaptive Triage learning lab"><Network size={26} /></a>
        <div className="rail-links">
          <button onClick={() => setTab('workspace')} className={tab === 'workspace' ? 'active' : ''} aria-label="Network workspace" title="Network workspace"><Layers size={21} /><span>Explore</span></button>
          <button onClick={startGuide} className={mode === 'guided' ? 'active' : ''} aria-label="Start guided demo" title="Guided demo"><BookOpen size={21} /><span>Guide</span></button>
          <button onClick={() => setTab('comparison')} className={tab === 'comparison' ? 'active' : ''} aria-label="Pathway comparison" title="Pathway comparison"><GitCompareArrows size={21} /><span>Compare</span></button>
        </div>
        <button className={`rail-help ${tab === 'principles' ? 'active' : ''}`} onClick={() => setTab('principles')} aria-label="Modelling principles"><CircleHelp size={21} /><span>About</span></button>
        <span className="rail-bottom">LAB<br />01</span>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="wordmark">adaptive<span>triage</span><span className="wordmark-divider" /><small>Learning lab</small></div>
          <div className="topbar-right"><span className="prototype-label"><FlaskConical size={14} />Educational prototype</span><span className="avatar" title="For new project joiners">AT</span></div>
        </header>
        <main id="main">
          <div className="page-heading">
            <div><div className="breadcrumb">ONBOARDING <ChevronRight size={12} /> BAYESIAN NETWORKS <ChevronRight size={12} /> SORE THROAT</div><h1>A sore throat. A connected picture.</h1><p>Explore how evidence changes beliefs — without changing the model.</p></div>
            <div className="mode-switch" aria-label="Viewing mode"><button className={mode === 'explore' ? 'selected' : ''} onClick={() => setMode('explore')}><Layers size={15} />Explore</button><button className={mode === 'guided' ? 'selected' : ''} onClick={startGuide}><Play size={14} />Guided demo</button></div>
          </div>

          {mode === 'guided' && <Guide step={guideStep} onBack={() => goGuide(guideStep - 1)} onNext={() => guideStep === 9 ? setMode('explore') : goGuide(guideStep + 1)} onReplay={startGuide} onExit={() => setMode('explore')} />}

          <div className="workspace-tabs">
            <div><button className={tab === 'workspace' ? 'active' : ''} onClick={() => setTab('workspace')}><Network size={16} />Network workspace</button><button className={tab === 'comparison' ? 'active' : ''} onClick={() => setTab('comparison')}><GitCompareArrows size={16} />Pathway comparison</button><button className={tab === 'principles' ? 'active' : ''} onClick={() => setTab('principles')}><CircleHelp size={16} />Model principles</button></div>
            <span className="synthetic-label"><span />ALL PROBABILITIES ARE SYNTHETIC</span>
          </div>

          {tab === 'workspace' && <div className="workspace-grid">
            <div className="model-column">
              <section className="card network-card">
                <div className="card-heading">
                  <div><span className="eyebrow"><LockKeyhole size={11} />01 / FIXED MODEL</span><h2>The sore-throat network</h2></div>
                  <span className="version"><span />{MODEL_VERSION}</span>
                </div>
                <div className="graph-context"><span>Risk factors</span><span>Possible hidden conditions</span><span>Observable clinical features</span><span>Acuity</span></div>
                <NetworkGraph evidence={evidence} posterior={posterior} changed={changed} fresh={fresh} onSelect={setInspect} focused={inspect} />
                <div className="mobile-node-picker"><label htmlFor="inspect-node">Inspect a variable</label><select id="inspect-node" value="" onChange={event => setInspect(event.target.value as NodeId)}><option value="" disabled>Select a network node</option>{NETWORK.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</select></div>
                <div className="graph-footer"><div className="legend"><span><i className="risk-dot" />Risk factor</span><span><i className="condition-dot" />Hidden condition</span><span><i className="feature-dot" />Clinical feature</span><span><i className="target-dot" />Acuity</span></div><span><span className="observed-icon">✓</span> Observed <span className="affected-icon" /> Changed</span></div>
                <p className="graph-note">Arrows show probabilistic dependencies, <strong>not question order</strong>. Select any node to explore its states and relationships.</p>
              </section>

              <section className="card probabilities">
                <div className="card-heading"><div><span className="eyebrow"><Sparkles size={11} />03 / CALCULATED PATIENT-SPECIFIC PROBABILITIES</span><h2>Current beliefs for this patient</h2></div><div className="legend"><span><i className="prior-swatch" />Prior</span><span><i className="current-swatch" />Current</span></div></div>
                <div className="probability-grid">
                  <div className="conditions-panel"><h3>Possible hidden conditions</h3><p className="small">Probability of presence · not a confirmed diagnosis</p>
                    {CONDITIONS.map(id => <button className={`condition-summary ${changed.includes(id) ? 'probability-changed' : ''}`} key={id} onClick={() => setInspect(id)}>
                      <div><span>{BY_ID[id].label}</span><strong><small>{percent(PRIOR[id][1])}</small><ArrowRight size={12} />{percent(posterior[id][1])}</strong></div>
                      <div className="mini-bar"><span className="mini-prior" style={{ width: percent(PRIOR[id][1]) }} /><span className="mini-current" style={{ width: percent(posterior[id][1]) }} /></div>
                      <span className="condition-states">Absent {percent(posterior[id][0])} · Present {percent(posterior[id][1])}</span>
                    </button>)}
                    <p className="small">Conditions may coexist. Their probabilities do not add up to 100%.</p>
                  </div>
                  <div className={`acuity-panel ${changed.includes('acuity') ? 'probability-changed' : ''}`}>
                    <div className="acuity-heading"><h3>Bayesian acuity estimate</h3><span className="badge">{entropy(posterior.acuity).toFixed(2)} bits uncertainty</span></div>
                    <DistributionChart labels={BY_ID.acuity.states} prior={PRIOR.acuity} posterior={posterior.acuity} />
                    <div className="acuity-values">{BY_ID.acuity.states.map((state, i) => <span key={state}>{state}<strong>{percent(PRIOR.acuity[i])} → {percent(posterior.acuity[i])}</strong></span>)}</div>
                  </div>
                </div>
                <div className="belief-note"><span className="note-mark"><Sparkles size={14} /></span>{answers.length ? 'The model has not changed. Its beliefs for this patient have changed because new evidence was entered.' : 'No evidence yet. These are the fixed model’s prior beliefs, before any patient answers.'}</div>
              </section>
              <QuestionRanking evidence={evidence} />
            </div>
            <aside className="patient-column">
              <section className="card assessment">
                <div className="card-heading"><div><span className="eyebrow"><ClipboardList size={11} />02 / CURRENT PATIENT EVIDENCE</span><h2>Synthetic assessment</h2></div><button className="icon-button" title="Reset assessment" aria-label="Reset assessment" onClick={reset}><RotateCcw size={17} /></button></div>
                <div className="scenario-picker"><label htmlFor="scenario">TRY A PRESET SCENARIO</label><select id="scenario" value={scenario ?? ''} onChange={event => event.target.value === '' ? reset() : startScenario(Number(event.target.value))}><option value="">Free exploration</option>{SCENARIOS.map((s, i) => <option key={s.name} value={i}>{i + 1}. {s.name}</option>)}</select></div>
                {activeScenario && <div className="scenario-progress"><span>{activeScenario.subtitle}</span><strong>{scenarioStep} / {activeScenario.answers.length} answers</strong><div><span style={{ width: `${scenarioStep / activeScenario.answers.length * 100}%` }} /></div><p>Scripted learning sequence; not the live question ranking.</p></div>}
                {override && <div className="safety-alert" role="alert"><div><ShieldAlert size={19} /><strong>Safety override active</strong></div><h3>{override.title}</h3><p>{override.explanation}</p></div>}
                <div className="question-box">
                  {question ? <>
                    <span className="eyebrow">{editing ? 'CORRECT AN EARLIER ANSWER' : activeScenario ? 'NEXT SCENARIO ANSWER' : 'ONE QUESTION AT A TIME'}{question.mandatory && <span className="safety-tag"><ShieldAlert size={11} />Safety</span>}</span>
                    <h3>{question.question}</h3>
                    {activeScenario && !editing ? <><p className="scripted-answer">Scripted answer: <strong>{answerLabel(scenarioAnswer!.state)}</strong></p><button className="primary-button full-width" onClick={playAnswer}><Play size={14} />Enter next answer</button></>
                      : <><div className="answer-buttons">{question.states.map(state => <button key={state} className={pendingAnswer === state ? 'chosen' : ''} aria-pressed={pendingAnswer === state} onClick={() => setPendingAnswer(state)}>{answerLabel(state)}</button>)}</div>
                        <button className="primary-button full-width" disabled={!pendingAnswer || (mode === 'guided' && !editing)} onClick={() => { if (currentQuestion && pendingAnswer) commit(currentQuestion, pendingAnswer); }}>Submit evidence<ArrowRight size={15} /></button>
                        {mode === 'guided' && <p className="small">Use the guide’s Next control to enter the example answer.</p>}
                      </>}
                    {editing && <button className="text-button" onClick={() => { setEditing(null); setPendingAnswer(null); }}>Cancel correction</button>}
                    {!activeScenario && !editing && <p className="selection-reason">{question.mandatory ? 'Mandatory safety check — selected before information gain.' : 'Selected for expected reduction in acuity uncertainty.'}</p>}
                  </> : <div className="assessment-complete"><Check size={24} /><h3>{activeScenario ? 'Scenario complete' : override ? 'Ordinary questions paused' : 'All questions answered'}</h3><p>{override ? 'Safety has taken priority. Review the complete acuity estimate and separate illustrative policy below.' : 'Review the current beliefs or select a graph node to add or correct evidence.'}</p>{activeScenario && <button className="secondary-button" onClick={() => startScenario(scenario!)}><RotateCcw size={14} />Replay scenario</button>}</div>}
                </div>
                <div className="timeline-heading"><h3>Evidence timeline</h3><span>{answers.length} observed</span></div>
                <div className="evidence-timeline" aria-live="polite">
                  {answers.length === 0 ? <div className="empty-evidence"><span className="empty-ring" /><p>No patient answers yet.<br /><small>The network is showing prior probabilities.</small></p></div>
                    : answers.map((a, i) => <div className={`timeline-item ${fresh === a.id ? 'new-evidence' : ''}`} key={a.id}><span className="timeline-dot">{i + 1}</span><div><strong>{BY_ID[a.id].label}</strong><span>{answerLabel(a.state)}{a.revision > 0 && <small> · corrected</small>}</span></div><button className="text-button" onClick={() => { setEditing(a.id); setPendingAnswer(a.state); }}>Edit</button><button className="icon-button" aria-label={`Remove ${BY_ID[a.id].label} evidence`} onClick={() => remove(a.id)}><X size={13} /></button></div>)}
                </div>
                <button className="new-assessment text-button" onClick={reset}><RotateCcw size={13} />Start a new assessment</button>
                <p className="privacy-note"><LockKeyhole size={11} />Local demonstration only. Do not enter real patient data.</p>
              </section>

              <section className={`card disposition ${override ? 'escalated' : ''}`}>
                <span className="eyebrow">SEPARATE / ILLUSTRATIVE POLICY</span><h2>From acuity to action</h2><p className="small">Acuity is urgency of need — not the diagnosis.</p>
                {override && <div className="adjusted-distribution"><h3>Safety-adjusted acuity</h3><p>Separate cumulative urgency floors can only increase urgency, never reduce it.</p>{BY_ID.acuity.states.map((state, i) => <div key={state}><span>{state}</span><strong>{percent(adjusted[i])}</strong></div>)}</div>}
                <div className="disposition-result"><span className="badge">{outcome.band}</span><h3>{outcome.action}</h3><p>{outcome.reason}</p></div>
                <p className="small">The Bayesian network estimates acuity. A separately governed policy maps acuity probabilities to a service, action or time band.</p>
                <details className="technical-details"><summary>Synthetic thresholds &amp; safety floors</summary><p>Immediate: immediate ≥20%, or breathing / drooling override.<br />Urgent: immediate + urgent ≥35%, or fluids override.<br />Soon: immediate + urgent + soon ≥40%.<br />Otherwise: routine / self-care.</p><p>Safety floors (Immediate / Urgent / Soon / Routine): breathing 98 / 1.5 / 0.4 / 0.1%; fluids 35 / 64 / 0.9 / 0.1%; drooling 65 / 34 / 0.9 / 0.1%. Floors are applied cumulatively, never as a replacement that lowers urgency.</p><p>All definitions, thresholds, safety rules and time bands are illustrative, not care recommendations.</p></details>
              </section>
            </aside>
          </div>}

          {tab === 'comparison' && <Comparison evidence={evidence} />}
          {tab === 'principles' && <section className="card principles">
            <span className="eyebrow">A SHARED UNDERSTANDING</span><h2>What the demonstration represents</h2>
            <div className="principles-grid">
              <article><Network size={24} /><h3>A model of dependencies</h3><p>Every node is mathematically a random variable. “Risk factor”, “hidden condition”, “symptom” and “severity modifier” describe a variable’s role. A feature can be both a symptom and an indicator of severity.</p><p>This directed acyclic graph is not a category hierarchy. Arrows are probabilistic dependencies, not question order. Bayesian inference lets observed evidence update beliefs in the reverse direction of an arrow.</p></article>
              <article><LockKeyhole size={24} /><h3>Fixed model, changing assessment</h3><p><strong>Fixed:</strong> graph structure, node states, conditional probability tables, evidence mappings and model version.</p><p><strong>Changing:</strong> patient evidence, posterior probabilities, uncertainty, next-question ranking and estimated acuity distribution.</p><p>Live answers do not update or train this model. Corrections trigger a fresh calculation from the full current evidence set.</p></article>
              <article><ShieldAlert size={24} /><h3>Urgency is not diagnosis</h3><p>Two patients can both have a sore throat. One may be able to drink normally with low acuity. Another may have high acuity because of breathing difficulty or inability to swallow fluids.</p><p>A high condition probability is not a confirmed diagnosis. The full acuity distribution represents uncertainty, not clinical approval.</p></article>
              <article><FlaskConical size={24} /><h3>Deliberately synthetic</h3><p>The final network structure, node states, probabilities, acuity definitions and clinical rules would require clinical agreement and validation.</p><p>These numbers are constructed for onboarding, not derived from patient data. Other causes of sore throat, clinical context and real-world safeguards are outside this prototype.</p><p>Age categories are illustrative; no actual patient age boundaries are claimed.</p></article>
            </div>
            <div className="info-note"><strong>Example:</strong> “Breathing difficulty” is an observable clinical feature. Once the patient answers the relevant question, that node becomes observed evidence. The answer may then change probability distributions for hidden conditions and acuity.</div>
          </section>}

          <footer className="content-footer"><span><FlaskConical size={12} />Synthetic model · sore-throat use case only</span><span>Clinical structure, probabilities and rules require agreement and validation.</span></footer>
        </main>
      </div>
      <div className="permanent-disclaimer" role="note"><ShieldAlert size={16} /><span>{DISCLAIMER}</span></div>
      {inspect && <NodeInspector key={inspect} id={inspect} evidence={evidence} posterior={posterior} onClose={() => setInspect(null)} onAnswer={commit} onRemove={remove} />}
    </div>
  );
}
export default App;
