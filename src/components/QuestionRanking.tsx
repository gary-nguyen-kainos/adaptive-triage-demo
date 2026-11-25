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
    name: BY_ID[c.id].label, 'Uncertainty now': c.currentEntropy,
    'After asking': c.expectedEntropy, 'Uncertainty reduced': c.gain,
  }));
  return (
    <section className="card question-ranking">
      <div className="card-heading">
        <div><span className="eyebrow">CHOOSING THE NEXT QUESTION</span><h2>How do we choose the next best question?</h2></div>
        <button className="text-button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          {expanded ? 'Hide details' : 'See how questions are ranked'}{expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      <p className="question-summary">Safety questions come first. Then we choose an unanswered question expected to make the urgency estimate clearer.</p>
      <div className="selection-summary">
        <span className={`selection-icon ${selected?.mandatory ? 'safety' : ''}`}>{selected?.mandatory ? <ShieldCheck size={20} /> : <Sparkles size={20} />}</span>
        <div><strong>{selected ? BY_ID[selected.id].question : selection.stopped ? 'Safety has taken priority' : 'All questions answered'}</strong>
          <p>{selected ? selected.mandatory ? 'This safety question is asked first.' : 'This question is expected to clarify urgency more than the other available questions.' : selection.stopped ? 'A safety rule is active, so regular question ranking is paused.' : 'No unanswered questions remain.'}</p>
        </div>
        {selected && <span className="badge">{selected.mandatory ? 'Safety question' : 'Top-ranked question'}</span>}
      </div>
      {expanded && <div className="ranking-details">
        <div className="explanation-grid">
          <div>
            <h3>What makes a question useful?</h3>
            <p>We want to make the estimate of <strong>urgency</strong> clearer, not guess a diagnosis.</p>
            <p>We compare the estimate now with what it may look like after each possible answer. A question is more useful when its answers are expected to reduce uncertainty about urgency.</p>
            <p>An even split between “Yes” and “No” does not automatically make a question useful. The answers must help clarify urgency.</p>
          </div>
          <div className="entropy-chart">
            <span className="eyebrow">HOW MUCH EACH QUESTION MAY CLARIFY URGENCY</span>
            {chart.length > 0 ? <ResponsiveContainer width="100%" height={230} minWidth={1}>
              <BarChart data={chart} layout="vertical" margin={{ right: 10, left: 0 }}>
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} />
                <Tooltip formatter={value => Number(value).toFixed(3)} />
                <Legend wrapperStyle={{ fontSize: 9 }} iconSize={7} />
                <Bar dataKey="Uncertainty now" fill="#c7d7d3" radius={[0, 3, 3, 0]} barSize={5} />
                <Bar dataKey="After asking" fill="#15796f" radius={[0, 3, 3, 0]} barSize={5} />
                <Bar dataKey="Uncertainty reduced" fill="#cda55e" radius={[0, 3, 3, 0]} barSize={5} />
              </BarChart>
            </ResponsiveContainer> : <p>There are no regular questions to rank right now. A safety rule may have paused them, or all questions may be answered.</p>}
          </div>
        </div>
        <div className="rule-order"><span>01 Ask safety questions first</span><span>02 Skip questions already answered</span><span>03 Prefer questions that clarify urgency</span><span>04 If tied, prefer the easier question</span></div>
        <p className="small">In this example, a safety rule can pause regular questions. Otherwise, each unanswered question is considered.</p>
        {cough && <div className="info-note"><strong>An even split is not enough:</strong> cough is expected to get a Yes/No split of {percent(cough.answers[1])} / {percent(cough.answers[0])}, but that does not necessarily make it useful for estimating urgency. Safety questions still come first.</div>}
        <div className="table-scroll">
          <table className="ranking-table">
            <caption>Example estimates for each unanswered question</caption>
            <thead><tr><th>Question</th><th>Possible answers</th><th>Uncertainty now</th><th>After asking</th><th>Expected change</th><th>Priority and reason</th></tr></thead>
            <tbody>{selection.candidates.map(c => <tr key={c.id} className={c.selected ? 'selected-row' : ''}>
              <th>{BY_ID[c.id].label}{c.selected && <span className="tiny-tag">Selected</span>}</th>
              <td>{c.answers.map((p, i) => <span className="answer-probability" key={i}>{answerLabel(BY_ID[c.id].states[i])}: {percent(p)}</span>)}</td>
              <td>{c.currentEntropy.toFixed(4)}</td><td>{c.expectedEntropy.toFixed(4)}</td><td>{c.gain.toFixed(4)}</td>
              <td><strong>{c.mandatory ? 'Safety question' : 'Usefulness'}</strong><br />{c.selected ? c.mandatory ? 'Asked first for safety.' : 'Expected to clarify urgency most.' : c.mandatory ? 'Another safety question comes first.' : 'Expected to clarify urgency less, or be harder to answer if tied.'}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>}
    </section>
  );
}
