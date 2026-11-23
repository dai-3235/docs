import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findRoute } from '../src/lib/routeFinding.mjs'
import { joinRules as modelRules } from '../src/data/adJoinModel.mjs'

const rule = (id, from, to, extra = {}) => ({
  id,
  from,
  to,
  cost: 1,
  cardinality: 'many-to-one',
  enabled: true,
  ...extra,
})

const ruleIds = (result) => result.route.map((hop) => hop.rule)

const chosenRouteCases = [
  {
    name: 'cheapest route wins over fewest joins',
    joinRules: [
      rule('direct', 'a', 'c', { cost: 5 }),
      rule('a_b', 'a', 'b', { cost: 1 }),
      rule('b_c', 'b', 'c', { cost: 1 }),
    ],
    from: 'a',
    to: 'c',
    expected: { rules: ['a_b', 'b_c'], totalCost: 2, fanOutCount: 0, hopCount: 2 },
  },
  {
    name: 'fewest joins wins when it is also cheapest',
    joinRules: [
      rule('direct', 'a', 'c', { cost: 1.5 }),
      rule('a_b', 'a', 'b', { cost: 1 }),
      rule('b_c', 'b', 'c', { cost: 1 }),
    ],
    from: 'a',
    to: 'c',
    expected: { rules: ['direct'], totalCost: 1.5, fanOutCount: 0, hopCount: 1 },
  },
  {
    name: 'equal cost prefers the route with fewer fan-outs',
    joinRules: [
      rule('a_b_fans', 'a', 'b', { cardinality: 'one-to-many' }),
      rule('b_d', 'b', 'd'),
      rule('a_c', 'a', 'c'),
      rule('c_d', 'c', 'd'),
    ],
    from: 'a',
    to: 'd',
    expected: { rules: ['a_c', 'c_d'], totalCost: 2, fanOutCount: 0, hopCount: 2 },
  },
  {
    name: 'equal cost and fan-outs prefers fewer hops',
    joinRules: [
      rule('long_1', 'a', 'b', { cost: 0.5 }),
      rule('long_2', 'b', 'c', { cost: 0.5 }),
      rule('long_3', 'c', 'd', { cost: 1 }),
      rule('short', 'a', 'd', { cost: 2 }),
    ],
    from: 'a',
    to: 'd',
    expected: { rules: ['short'], totalCost: 2, fanOutCount: 0, hopCount: 1 },
  },
  {
    name: 'disabled shortcut is never used',
    joinRules: [
      rule('shortcut', 'a', 'c', { cost: 1, enabled: false }),
      rule('a_b', 'a', 'b', { cost: 2 }),
      rule('b_c', 'b', 'c', { cost: 2 }),
    ],
    from: 'a',
    to: 'c',
    expected: { rules: ['a_b', 'b_c'], totalCost: 4, fanOutCount: 0, hopCount: 2 },
  },
  {
    name: 'many-to-many always fans out in both directions',
    joinRules: [rule('m2m', 'a', 'b', { cardinality: 'many-to-many' })],
    from: 'b',
    to: 'a',
    expected: { rules: ['m2m'], totalCost: 1, fanOutCount: 1, hopCount: 1 },
  },
  {
    name: 'many-to-one travelled backward fans out',
    joinRules: [rule('m2o', 'a', 'b')],
    from: 'b',
    to: 'a',
    expected: { rules: ['m2o'], totalCost: 1, fanOutCount: 1, hopCount: 1 },
  },
  {
    name: 'one-to-many travelled forward fans out and backward does not',
    joinRules: [rule('o2m', 'a', 'b', { cardinality: 'one-to-many' })],
    from: 'a',
    to: 'b',
    expected: { rules: ['o2m'], totalCost: 1, fanOutCount: 1, hopCount: 1 },
  },
  {
    name: 'one-to-many travelled backward does not fan out',
    joinRules: [rule('o2m', 'a', 'b', { cardinality: 'one-to-many' })],
    from: 'b',
    to: 'a',
    expected: { rules: ['o2m'], totalCost: 1, fanOutCount: 0, hopCount: 1 },
  },
  {
    name: 'missing cardinality is treated as many-to-one',
    joinRules: [{ id: 'bare', from: 'a', to: 'b', cost: 1 }],
    from: 'b',
    to: 'a',
    expected: { rules: ['bare'], totalCost: 1, fanOutCount: 1, hopCount: 1 },
  },
  {
    name: 'cycles are not re-entered',
    joinRules: [
      rule('a_b', 'a', 'b'),
      rule('b_c', 'b', 'c'),
      rule('c_a', 'c', 'a'),
      rule('c_d', 'c', 'd'),
    ],
    from: 'a',
    to: 'd',
    expected: { rules: ['c_a', 'c_d'], totalCost: 2, fanOutCount: 1, hopCount: 2 },
  },
  {
    name: 'target equal to start needs no joins',
    joinRules: [rule('a_b', 'a', 'b')],
    from: 'a',
    to: 'a',
    expected: { rules: [], totalCost: 0, fanOutCount: 0, hopCount: 0 },
  },
]

for (const { name, joinRules, from, to, expected } of chosenRouteCases) {
  test(name, () => {
    const result = findRoute({ joinRules, from, to })
    assert.deepEqual(ruleIds(result), expected.rules)
    assert.equal(result.totalCost, expected.totalCost)
    assert.equal(result.fanOutCount, expected.fanOutCount)
    assert.equal(result.hopCount, expected.hopCount)
  })
}

const noRouteCases = [
  { name: 'empty graph has no route', joinRules: [], from: 'a', to: 'b' },
  {
    name: 'unreachable target has no route',
    joinRules: [rule('a_b', 'a', 'b'), rule('c_d', 'c', 'd')],
    from: 'a',
    to: 'd',
  },
  {
    name: 'only disabled rules lead to the target',
    joinRules: [rule('a_b', 'a', 'b', { enabled: false })],
    from: 'a',
    to: 'b',
  },
]

for (const { name, joinRules, from, to } of noRouteCases) {
  test(name, () => {
    assert.equal(findRoute({ joinRules, from, to }), null)
  })
}

const chainTables = ['a', 'b', 'c', 'd', 'e']
const chain = chainTables.slice(0, -1).map((table, i) => rule(`${table}_${chainTables[i + 1]}`, table, chainTables[i + 1]))

const hopLimitCases = [
  { name: 'route at the hop limit is found', hopLimit: 4, expectedRoute: true },
  { name: 'route beyond the hop limit is not found', hopLimit: 3, expectedRoute: false },
]

for (const { name, hopLimit, expectedRoute } of hopLimitCases) {
  test(name, () => {
    const result = findRoute({ joinRules: chain, from: 'a', to: 'e', hopLimit })
    assert.equal(result !== null, expectedRoute)
  })
}

test('default hop limit is eight', () => {
  const longChain = Array.from({ length: 9 }, (_, i) => rule(`t${i}_t${i + 1}`, `t${i}`, `t${i + 1}`))
  assert.notEqual(findRoute({ joinRules: longChain, from: 't0', to: 't8' }), null)
  assert.equal(findRoute({ joinRules: longChain, from: 't0', to: 't9' }), null)
})

test('hop limit falls back to a costlier shorter route', () => {
  const joinRules = [
    rule('a_b', 'a', 'b', { cost: 1 }),
    rule('b_c', 'b', 'c', { cost: 1 }),
    rule('c_d', 'c', 'd', { cost: 1 }),
    rule('a_d', 'a', 'd', { cost: 10 }),
  ]
  const result = findRoute({ joinRules, from: 'a', to: 'd', hopLimit: 2 })
  assert.deepEqual(ruleIds(result), ['a_d'])
})

test('a table joined under two roles is not treated as visited', () => {
  const joinRules = [
    rule('buyer', 'brand', 'agency', { toRole: 'buying_agency', cost: 1 }),
    rule('biller', 'brand', 'agency', { toRole: 'billing_agency', cost: 3 }),
    rule('billing_to_region', 'agency', 'region', { fromRole: 'billing_agency', cost: 1 }),
  ]
  const result = findRoute({ joinRules, from: 'brand', to: 'region' })
  assert.deepEqual(ruleIds(result), ['biller', 'billing_to_region'])
  assert.equal(result.route[0].role, 'billing_agency')
  assert.equal(result.totalCost, 4)
})

test('the same table and role at no better cost is pruned from the route', () => {
  const joinRules = [
    rule('a_b', 'a', 'b'),
    rule('b_a', 'b', 'a'),
    rule('b_c', 'b', 'c'),
  ]
  const result = findRoute({ joinRules, from: 'a', to: 'c' })
  assert.deepEqual(result.route.map((hop) => hop.table), ['b', 'c'])
})

test('a route revisiting the start table under a new role is allowed', () => {
  const joinRules = [
    rule('a_b', 'a', 'b'),
    rule('b_a_again', 'b', 'a', { toRole: 'second_a' }),
    rule('a_c', 'a', 'c', { fromRole: 'second_a' }),
  ]
  const result = findRoute({ joinRules, from: 'a', to: 'c' })
  assert.deepEqual(ruleIds(result), ['a_b', 'b_a_again', 'a_c'])
})

const modelCases = [
  {
    name: 'model: delivery reaches campaign through line item',
    from: 'ad_delivery_fact',
    to: 'campaign_dim',
    expectedRules: ['delivery_to_line_item', 'line_item_to_campaign'],
  },
  {
    name: 'model: shortcut beats the three-join chain to advertiser',
    from: 'ad_delivery_fact',
    to: 'advertiser_dim',
    expectedRules: ['delivery_to_advertiser_shortcut'],
  },
  {
    name: 'model: creative is reached directly rather than through many-to-many',
    from: 'ad_delivery_fact',
    to: 'creative_dim',
    expectedRules: ['delivery_to_creative'],
  },
]

for (const { name, from, to, expectedRules } of modelCases) {
  test(name, () => {
    assert.deepEqual(ruleIds(findRoute({ joinRules: modelRules, from, to })), expectedRules)
  })
}

test('model: disabling the shortcut routes advertiser through campaign', () => {
  const joinRules = modelRules.map((r) =>
    r.id === 'delivery_to_advertiser_shortcut' ? { ...r, enabled: false } : r,
  )
  const result = findRoute({ joinRules, from: 'ad_delivery_fact', to: 'advertiser_dim' })
  assert.deepEqual(ruleIds(result), [
    'delivery_to_line_item',
    'line_item_to_campaign',
    'campaign_to_advertiser',
  ])
})

test('model: creative to line item prefers two cheap joins over the many-to-many rule', () => {
  const result = findRoute({ joinRules: modelRules, from: 'creative_dim', to: 'line_item_dim' })
  assert.deepEqual(ruleIds(result), ['delivery_to_creative', 'delivery_to_line_item'])
})

test('model: billing and buying agency are separate roles of one table', () => {
  const result = findRoute({ joinRules: modelRules, from: 'advertiser_dim', to: 'agency_dim' })
  assert.equal(result.hopCount, 1)
  assert.ok(['buying_agency', 'billing_agency'].includes(result.route[0].role))
})
