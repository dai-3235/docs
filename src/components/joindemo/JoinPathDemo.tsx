import { useMemo, useState } from 'react';
import Workflow from '../workflow/Workflow';
import { joinRules } from '../../data/adJoinModel.mjs';
import { joinDemoScenarios } from '../../data/joinDemoScenarios.mjs';
import { traceScenario, describeRoute } from '../../lib/routeSteps.mjs';
import { flowFromTrace } from '../../lib/joinDemoFlow.mjs';
import './joindemo.css';

export default function JoinPathDemo() {
  const [scenarioId, setScenarioId] = useState(joinDemoScenarios[0].id);
  const scenario = joinDemoScenarios.find((candidate) => candidate.id === scenarioId) ?? joinDemoScenarios[0];
  const trace = useMemo(() => traceScenario(scenario, joinRules), [scenario]);
  const flow = useMemo(() => flowFromTrace(trace), [trace]);

  return (
    <section className="jd" aria-label="Join route demo">
      <div className="jd-picker" role="group" aria-label="Scenario">
        {joinDemoScenarios.map((candidate) => (
          <button key={candidate.id} type="button" aria-pressed={candidate.id === scenario.id} onClick={() => setScenarioId(candidate.id)}>
            {candidate.title}
          </button>
        ))}
      </div>
      <p className="jd-question">{scenario.question}</p>
      <Workflow key={scenario.id} flow={flow} title={scenario.title} height={300} />
      <p className="jd-result" aria-live="polite">
        {describeRoute(trace)}
      </p>
      <p className="jd-lesson">{scenario.lesson}</p>
    </section>
  );
}
