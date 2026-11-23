import { findRoute, causesFanOut, DEFAULT_HOP_LIMIT, DEFAULT_ROLE } from './routeFinding.mjs'

export function applyRuleOverrides(joinRules, ruleOverrides = {}) {
  return joinRules.map((rule) => (ruleOverrides[rule.id] ? { ...rule, ...ruleOverrides[rule.id] } : rule))
}

function travelDirection(rule, previousTable, table) {
  return rule.from === previousTable && rule.to === table ? 'forward' : 'backward'
}

export function traceScenario(scenario, baseRules) {
  const joinRules = applyRuleOverrides(baseRules, scenario.ruleOverrides)
  const hopLimit = scenario.hopLimit ?? DEFAULT_HOP_LIMIT
  const result = findRoute({ joinRules, from: scenario.from, to: scenario.to, hopLimit })

  const steps = [
    { table: scenario.from, role: DEFAULT_ROLE, rule: null, direction: null, cardinality: null, stepCost: 0, causesFanOut: false, runningCost: 0, runningFanOut: 0 },
  ]
  if (result) {
    let previousTable = scenario.from
    let runningCost = 0
    let runningFanOut = 0
    for (const hop of result.route) {
      const rule = joinRules.find((candidate) => candidate.id === hop.rule)
      const direction = travelDirection(rule, previousTable, hop.table)
      const fansOut = causesFanOut(rule, direction)
      runningCost += rule.cost ?? 1
      runningFanOut += fansOut ? 1 : 0
      steps.push({
        table: hop.table,
        role: hop.role,
        rule: rule.id,
        direction,
        cardinality: rule.cardinality ?? 'many-to-one',
        stepCost: rule.cost ?? 1,
        causesFanOut: fansOut,
        runningCost,
        runningFanOut,
      })
      previousTable = hop.table
    }
  }

  return {
    scenario,
    hopLimit,
    found: result !== null,
    steps,
    totalCost: result?.totalCost ?? null,
    fanOutCount: result?.fanOutCount ?? null,
    hopCount: result?.hopCount ?? null,
  }
}

export function describeStep(step, index) {
  if (index === 0) {
    return `Start at ${step.table}. Running cost 0, fan-outs 0.`
  }
  const role = step.role === DEFAULT_ROLE ? '' : ` as ${step.role}`
  const fanOut = step.causesFanOut ? 'this join fans out' : 'no fan-out'
  return `Join ${step.table}${role} by rule ${step.rule} (${step.direction}, ${step.cardinality}, cost ${step.stepCost}, ${fanOut}). Running cost ${step.runningCost}, fan-outs ${step.runningFanOut}.`
}

export function describeRoute(trace) {
  if (!trace.found) {
    return `No route from ${trace.scenario.from} to ${trace.scenario.to} within ${trace.hopLimit} joins.`
  }
  const path = trace.steps.map((step) => step.table).join(', then ')
  return `Final route: ${path}. Total cost ${trace.totalCost}, ${trace.hopCount} joins, ${trace.fanOutCount} fan-outs.`
}
