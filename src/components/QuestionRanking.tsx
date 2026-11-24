import { useState } from 'react';
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronDown, ChevronUp, ShieldCheck, Sparkles } from 'lucide-react';
import { BY_ID, answerLabel, type Evidence } from '../model/network';
import { evaluateQuestions } from '../model/questions';
import { percent } from './DistributionChart';

export function QuestionRanking({ evidence }: { evidence: Evidence }) {
  const [expanded, setExpanded] = useState(false);
  const selection = evaluateQuestions(evidence);
  const selected = selection.candidates.find(c => c.selected);
  const cough = selection.candidates.find(c => c.id === 'cough');
  const chart = selection.candidates.slice(0, 6).map(c => ({
    name: BY_ID[c.id].label, 'Current entropy': c.currentEntropy,
    'Expected entropy': c.expectedEntropy, 'Information gain': c.gain,
  }));
  return (
    <section className="card question-ranking">
      <div className="card-heading">
        <div><span className="eyebrow">THE NEXT QUESTION</span><h2>Safe first. Informative next.</h2></div>
        <button className="text-button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          {expanded ? 'Hide calculations' : 'Inspect question ranking'}{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      <div className="selection-summary">
        <span className={`selection-icon ${selected?.mandatory ? 'safety' : ''}`}>{selected?.mandatory ? <ShieldCheck size={20} /> : <Sparkles size={20} />}</span>
        <div><strong>{selected ? BY_ID[selected.id].question : selection.stopped ? 'Safety has taken priority' : 'All questions answered'}</strong>
          <p>{selected?.reason ?? (selection.stopped ? 'Ordinary optimisation is paused. Review the illustrative safety escalation.' : 'No unanswered questions remain.')}</p>
        </div>
        {selected && <span className="badge">{selected.mandatory ? 'Safety rule' : `${selected.gain.toFixed(3)} bits gain`}</span>}
      </div>
      {expanded && <div className="ranking-details">
        <div className="explanation-grid">
          <div>
            <h3>What are we trying to learn?</h3>
            <p>Reduce uncertainty about <strong>acuity</strong>, not simply support the most likely condition or eliminate diagnoses.</p>
            <code>H(X) = -Σ p(x) log₂ p(x)</code>
            <code>Information gain = current entropy − expected entropy after asking</code>
            <p>A Yes/No question can provide at most one bit of information. A balanced Yes/No split has high answer entropy, but it is only useful if the possible answers are expected to reduce uncertainty about the target that matters.</p>
          </div>
          <div className="entropy-chart">
            <span className="eyebrow">ACUITY ENTROPY &amp; INFORMATION GAIN · BITS</span>
            {chart.length > 0 ? <ResponsiveContainer width="100%" height={230} minWidth={1}>
              <BarChart data={chart} layout="vertical" margin={{ right: 10, left: 0 }}>
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} />
                <Tooltip formatter={value => `${Number(value).toFixed(4)} bits`} />
                <Legend wrapperStyle={{ fontSize: 9 }} iconSize={7} />
                <Bar dataKey="Current entropy" fill="#c7d7d3" radius={[0, 3, 3, 0]} barSize={5} />
                <Bar dataKey="Expected entropy" fill="#15796f" radius={[0, 3, 3, 0]} barSize={5} />
                <Bar dataKey="Information gain" fill="#cda55e" radius={[0, 3, 3, 0]} barSize={5} />
              </BarChart>
            </ResponsiveContainer> : <p>No candidate calculations: safety stopped optimisation, or all questions are answered.</p>}
          </div>
        </div>
        <div className="rule-order"><span>01 Mandatory safety checks</span><span>02 Exclude answered / irrelevant</span><span>03 Rank by acuity information gain</span><span>04 Lower burden breaks ties</span></div>
        <p className="small">All unanswered questions remain relevant within this sore-throat demonstration, except ordinary questions when safety pauses optimisation. No diagnosis-count or answer-balance heuristic is used.</p>
        {cough && <div className="info-note"><strong>The 50/50 trap:</strong> cough is {percent(cough.answers[1])} Yes / {percent(cough.answers[0])} No, but provides only {cough.gain.toFixed(5)} bits about acuity. A less balanced breathing question has greater clinical importance and is mandatory irrespective of its information gain.</div>}
        <div className="table-scroll">
          <table className="ranking-table">
            <caption>Synthetic candidate answers and exact expected information gain about Bayesian acuity (before separate policy)</caption>
            <thead><tr><th>Unanswered question</th><th>Expected answers</th><th>Current H</th><th>Expected H</th><th>Gain</th><th>Priority / reason</th></tr></thead>
            <tbody>{selection.candidates.map(c => <tr key={c.id} className={c.selected ? 'selected-row' : ''}>
              <th>{BY_ID[c.id].label}{c.selected && <span className="tiny-tag">Selected</span>}</th>
              <td>{c.answers.map((p, i) => <span className="answer-probability" key={i}>{answerLabel(BY_ID[c.id].states[i])}: {percent(p)}</span>)}</td>
              <td>{c.currentEntropy.toFixed(4)}</td><td>{c.expectedEntropy.toFixed(4)}</td><td>{c.gain.toFixed(4)}</td>
              <td><strong>{c.mandatory ? 'Mandatory safety' : 'Information gain'}</strong><br />{c.reason}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>}
    </section>
  );
}
