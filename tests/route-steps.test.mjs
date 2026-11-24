import { test } from 'node:test'
import assert from 'node:assert/strict'
import { joinRules } from '../src/data/adJoinModel.mjs'
import { joinDemoScenarios } from '../src/data/joinDemoScenarios.mjs'
import { traceScenario, describeStep, describeRoute } from '../src/lib/routeSteps.mjs'
import { flowFromTrace } from '../src/lib/joinDemoFlow.mjs'

const traceOf = (id) => traceScenario(joinDemoScenarios.find((scenario) => scenario.id === id), joinRules)
const ruleIds = (trace) => trace.steps.slice(1).map((step) => step.rule)

const expectedByScenario = [
  {
    id: 'cheapest-over-fewest',
    rules: ['event_to_placement', 'placement_to_promotion', 'promotion_to_sponsor'],
    totalCost: 3,
    fanOutCount: 0,
  },
  {
    id: 'fan-out-tie',
    rules: ['placement_to_banner_rotation'],
    totalCost: 2,
    fanOutCount: 0,
  },
  {
    id: 'disabled-shortcut',
    rules: ['event_to_placement', 'placement_to_promotion', 'promotion_to_sponsor'],
    totalCost: 3,
    fanOutCount: 0,
  },
  {
    id: 'two-roles',
    rules: ['sponsor_to_billing_partner'],
    totalCost: 0.5,
    fanOutCount: 0,
  },
  {
    id: 'hop-limit',
    rules: ['event_to_sponsor_shortcut'],
    totalCost: 4,
    fanOutCount: 0,
  },
]

for (const { id, rules, totalCost, fanOutCount } of expectedByScenario) {
  test(`scenario ${id} picks the expected route`, () => {
    const trace = traceOf(id)
    assert.equal(trace.found, true)
    assert.deepEqual(ruleIds(trace), rules)
    assert.equal(trace.totalCost, totalCost)
    assert.equal(trace.fanOutCount, fanOutCount)
    assert.equal(trace.steps.at(-1).runningCost, totalCost)
    assert.equal(trace.steps.at(-1).runningFanOut, fanOutCount)
  })
}

test('the five named scenarios exist', () => {
  assert.deepEqual(joinDemoScenarios.map((scenario) => scenario.id), [
    'cheapest-over-fewest',
    'fan-out-tie',
    'disabled-shortcut',
    'two-roles',
    'hop-limit',
  ])
})

test('the fan-out tie is a real tie on cost that fan-out breaks', () => {
  const trace = traceOf('fan-out-tie')
  const chainCost = 2
  assert.equal(trace.totalCost, chainCost)
  assert.equal(trace.scenario.ruleOverrides.placement_to_banner_rotation.cost, chainCost)
})

test('running cost and fan-out accumulate per step', () => {
  const trace = traceScenario(
    { from: 'banner_dim', to: 'placement_dim', ruleOverrides: { placement_to_banner_rotation: { enabled: false } } },
    joinRules,
  )
  assert.deepEqual(trace.steps.map((step) => step.runningCost), [0, 1, 2])
  assert.deepEqual(trace.steps.map((step) => step.runningFanOut), [0, 1, 1])
  assert.deepEqual(trace.steps.map((step) => step.causesFanOut), [false, true, false])
  assert.deepEqual(trace.steps.map((step) => step.direction), [null, 'backward', 'forward'])
})

test('the role taken is recorded on the step', () => {
  assert.equal(traceOf('two-roles').steps[1].role, 'billing_partner')
})

test('the hop limit scenario is cheaper without the limit', () => {
  const limited = traceOf('hop-limit')
  const unlimited = traceScenario({ ...limited.scenario, hopLimit: undefined }, joinRules)
  assert.equal(limited.hopCount, 1)
  assert.equal(unlimited.hopCount, 3)
  assert.ok(unlimited.totalCost < limited.totalCost)
})

test('a scenario with no route reports it without steps beyond the start', () => {
  const trace = traceScenario({ from: 'ad_event_fact', to: 'partner_dim', hopLimit: 1 }, joinRules)
  assert.equal(trace.found, false)
  assert.equal(trace.steps.length, 1)
  assert.equal(trace.totalCost, null)
  assert.match(describeRoute(trace), /No route from ad_event_fact to partner_dim within 1 joins/)
})

test('step text names the table, rule, running cost and fan-out count', () => {
  const trace = traceOf('fan-out-tie')
  const text = describeStep(trace.steps[1], 1)
  assert.match(text, /placement_dim/)
  assert.match(text, /placement_to_banner_rotation/)
  assert.match(text, /Running cost 2/)
  assert.match(text, /fan-outs 0/)
})

test('route text lists every table in order with totals', () => {
  const text = describeRoute(traceOf('disabled-shortcut'))
  assert.match(text, /ad_event_fact, then placement_dim, then promotion_dim, then sponsor_dim/)
  assert.match(text, /Total cost 3, 3 joins, 0 fan-outs/)
})

test('flow has one node per step and one edge per join', () => {
  const trace = traceOf('cheapest-over-fewest')
  const flow = flowFromTrace(trace)
  assert.equal(flow.nodes.length, trace.steps.length)
  assert.equal(flow.edges.length, trace.steps.length - 1)
  assert.equal(new Set(flow.nodes.map((node) => node.id)).size, flow.nodes.length)
  assert.equal(flow.nodes.at(-1).kind, 'core')
})

test('traces never mutate the shared model', () => {
  const before = JSON.stringify(joinRules)
  joinDemoScenarios.forEach((scenario) => traceScenario(scenario, joinRules))
  assert.equal(JSON.stringify(joinRules), before)
})
