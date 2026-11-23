import { describeStep } from './routeSteps.mjs'

export function flowFromTrace(trace) {
  const lastIndex = trace.steps.length - 1
  const nodes = trace.steps.map((step, index) => ({
    id: `step-${index}`,
    title: step.table,
    subtitle: index === 0 ? 'Start' : `${step.rule}${step.role === 'default' ? '' : ` (${step.role})`}`,
    detail: describeStep(step, index),
    kind: index === 0 ? 'human' : step.causesFanOut ? 'risk' : index === lastIndex ? 'core' : 'service',
    icon: 'folder',
  }))
  const edges = trace.steps.slice(1).map((step, offset) => ({
    from: `step-${offset}`,
    to: `step-${offset + 1}`,
    label: `cost ${step.stepCost}${step.causesFanOut ? ', fan-out' : ''}`,
  }))
  return { nodes, edges }
}
