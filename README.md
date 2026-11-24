# Adaptive Triage learning lab

A self-contained React and TypeScript onboarding application illustrating a Bayesian network for the **sore-throat use case only**.

**Educational demonstration only. Uses synthetic probabilities and is not clinically approved or suitable for patient care.**

All priors, conditional probabilities, safety floors, disposition thresholds and time bands are synthetic and illustrative. They are not derived from clinical evidence or real patients. The final graph structure, node states, probabilities, acuity definitions and clinical rules require clinical agreement and validation. Do not enter real patient information.

## Run, test and build

Requires Node.js 22.12+ (or a current supported version) and npm.

```sh
cd adaptive-triage-demo
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

```sh
npm test          # focused probability and safety tests
npm run build    # strict TypeScript check and production build
npm run preview  # serve the production build, normally port 4173
```

The app requires no backend, credentials or external APIs. Patient answers live only in React state and disappear on refresh. Libraries are installed at development time; the running application does not request remote services, fonts or model data.

## File structure

```text
adaptive-triage-demo/
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── README.md
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── styles.css
    ├── components/
    │   ├── NetworkGraph.tsx
    │   ├── DistributionChart.tsx
    │   ├── QuestionRanking.tsx
    │   ├── NodeInspector.tsx
    │   ├── Comparison.tsx
    │   └── Guide.tsx
    └── model/
        ├── network.ts       # model version, variables, CPTs and validation
        ├── inference.ts     # exact sum-product inference and Shannon entropy
        ├── questions.ts     # expected information gain and safety-first ranking
        ├── policy.ts        # separate safety escalation and disposition policy
        ├── assessment.ts    # current evidence, corrections and revision tracking
        ├── scenarios.ts     # three scripted, one-answer-at-a-time presentations
        └── model.test.ts    # probability, scenario, correction and safety tests
```

## Using the demonstration

- **Explore:** submit one answer at a time, inspect a node, add/correct/remove observable evidence, reset, and inspect question ranking. Hidden conditions are inferred, not entered as patient answers.
- **Guided demo:** Next, Back, Replay and Exit walk through ten teaching steps using a No answer to breathing difficulty. Next at step four enters the example answer and inference occurs immediately. The next mandatory safety question and candidate entropy calculations can then be inspected; the preset scenarios separately demonstrate safety overrides.
- **Scenarios:** choose an uncomplicated presentation, significant difficulty swallowing, or possible airway concern; enter each scripted answer individually. A scenario's script is explicitly separate from the live question-selection recommendation.
- **Pathway comparison:** fixed branches use the same evidence as the Bayesian assessment, but select questions with predefined logic. A pathway branch does not automatically become a graph edge.
- **Node inspector:** see complete prior/current state distributions, parents, children and evidence status. Entropy and full conditional probability tables are collapsed by default.

React Flow uses fixed node coordinates. Evidence and probability changes animate without relaying out the graph. Recharts displays probability distributions and information-gain charts, with numerical tables for inspection and accessible equivalents. Colour is supplemented by role labels, observed ticks, changed borders and explicit safety messages. The disclaimer stays visible, including while a node inspector is open.

## Bayesian inference

The fixed network contains two risk variables, three binary hidden-condition variables, eight observable-feature variables and a four-state acuity variable. Hidden conditions may coexist: their individual presence probabilities are **not** a mutually exclusive diagnosis distribution. Each individual node's states do sum to 100%.

Risk factors influence conditions. Conditions influence features, and important features and conditions influence acuity. Cough depends only on viral pharyngitis and is deliberately near a 50/50 split with little acuity relevance. Age categories are illustrative and do not specify clinical cut-offs.

`network.ts` deterministically expands synthetic parameter definitions into complete CPTs at module initialisation. It validates the DAG, state definitions and all required normalised rows. Those definitions and tables are not trained or changed by patient answers.

`inference.ts` performs **exact discrete sum-product inference**, not sampling or simulated probability changes:

1. Enumerate the 48 age, immune-status and binary-condition combinations.
2. Multiply the risk/condition probabilities by the likelihood of all observed features, restricting any observed risk states.
3. Accumulate and normalise the posterior distributions for risks, hidden conditions and observable features.
4. For acuity, exactly sum over unobserved severity-feature parent states, multiplying their conditional probabilities by the acuity CPT.

This marginalisation is exact for this network because feature variables are conditionally independent given their hidden-condition parents and acuity is an unobserved terminal target. Acuity cannot be entered as patient evidence. Changing the graph to include symptom-to-symptom dependencies, new acuity parents or observed acuity would require revising the inference algorithm.

All answers are conditioned on together: a correction replaces the old evidence value, and removal or reset recalculates from the remaining set. Invalid evidence or missing probability rows throw explicit errors. A bounded memoisation cache avoids repeated exact calculations; no online learning occurs.

## Next-question selection

For each unanswered question, the model predicts every possible answer and recalculates the acuity distribution conditional on that answer:

```text
H(acuity) = -sum(p * log2(p))
Expected H after question = sum(P(answer | evidence) * H(acuity | evidence, answer))
Information gain = current H - expected H after question
```

Selection follows this broad order:

1. Mandatory unanswered safety checks: breathing difficulty, inability to swallow fluids, then drooling.
2. Exclude answered questions and questions made ineligible by a safety override. All other questions remain relevant in this limited sore-throat demonstration.
3. Rank ordinary candidates by expected information gain about **Bayesian acuity**, before applying separate policy.
4. Prefer lower question burden on information-gain ties; use stable definition order for remaining exact ties.

The question table shows answer probabilities, current and expected target entropy, gain, safety priority and a selection/non-selection reason. Answer balance and diagnosis-count elimination are not ranking criteria. The deliberately balanced cough question illustrates why high answer entropy need not produce useful target information.

## Safety and disposition are separate

Red-flag evidence increases immediate/urgent probabilities through the synthetic acuity CPT. In addition, `policy.ts` applies **separate, clearly displayed** cumulative urgency floors. Taking the maximum of the existing and minimum cumulative urgency probabilities at each boundary ensures first-order stochastic dominance: a safety override cannot lower urgency, even when the Bayesian estimate is already higher than a floor.

Breathing difficulty or drooling stops candidate optimisation. Inability to swallow fluids stops ordinary optimisation but permits remaining mandatory safety checks. The unmodified Bayesian acuity distribution and safety-adjusted distribution are displayed separately. Correcting a red flag from Yes to No removes that evidence and its current override; urgency may then decrease because the patient evidence changed, not because a safety override reduced it.

A separately governed, **synthetic illustrative policy** maps the safety-adjusted distribution to an action/time band:

| Band | Synthetic rule |
| --- | --- |
| Immediate | Immediate probability at least 20%, or breathing/drooling override |
| Urgent | Immediate + urgent at least 35%, or fluids override |
| Soon | Immediate + urgent + soon at least 40% |
| Routine or self-care | No escalation rule applies |

The displayed time bands are educational placeholders, not clinical recommendations.

## Automated validation

Tests cover DAG/CPT validity and rejection, exact Bayes and CPT calculations, node normalisation, reverse-direction updates, reset and corrected evidence, invalid evidence, all three scenario directions, Shannon entropy, expected-information-gain ranking, mandatory safety priority, optimisation stopping, cumulative urgency monotonicity and separate policy boundaries.
