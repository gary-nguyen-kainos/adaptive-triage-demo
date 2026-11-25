# Adaptive Triage learning lab

This onboarding demo shows how a Bayesian network can update estimates as answers are entered for a **sore-throat example**. It is designed to help technical and non-technical onboarders explore how evidence, uncertainty, and question selection fit together.

> **Educational demonstration only.** This is not a clinical tool and must not be used to make healthcare decisions. Do not enter real patient information.

## Where the data comes from

All probabilities, safety rules, time bands, and example scenarios are synthetic examples written for this demonstration. They are not taken from patient records or clinical research, and have not been clinically validated. The model is not trained on data; its example values stay fixed while answers update the estimates.

The demonstration is limited to a small sore-throat example. Its conditions, questions, and rules do not cover everything that matters in real care.

## Try the demo

- **Explore network:** enter or change an answer and see how estimates elsewhere in the network change. Select a node to inspect it.
- **Guided demo:** follow a short walkthrough of the main ideas.
- **Pathway comparison:** compare the network's question selection with a set of fixed example pathways.
- **Model principles:** review the key concepts and limitations.

The network shows relationships between variables; its arrows do not prescribe question order. Hidden conditions are estimates, not confirmed diagnoses. The urgency output and all time bands are illustrative examples, not recommendations.

## Run it locally

To run the demo on your computer, install Node.js 22.12 or later and npm. In a terminal, from the project folder, run:

```sh
npm ci
npm run dev
```

Open the local address printed by the command, normally `http://localhost:5173`.

For development checks:

```sh
npm test
npm run build
```

The app does not need an account, backend, or external API. Answers stay in browser memory and are cleared when the page is refreshed. The app does not send answers to a server.
