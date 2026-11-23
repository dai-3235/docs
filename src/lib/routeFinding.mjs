export const DEFAULT_HOP_LIMIT = 8
export const DEFAULT_ROLE = 'default'

const FAN_OUT_BY_DIRECTION = {
  forward: { 'one-to-many': true, 'many-to-one': false, 'many-to-many': true },
  backward: { 'one-to-many': false, 'many-to-one': true, 'many-to-many': true },
}

export function causesFanOut(rule, direction) {
  const cardinality = rule.cardinality ?? 'many-to-one'
  return FAN_OUT_BY_DIRECTION[direction][cardinality] ?? false
}

function compareStates(a, b) {
  return a.cost - b.cost || a.fanOutCount - b.fanOutCount || a.hops.length - b.hops.length
}

function stateKey(table, role) {
  return `${table}\u0000${role}`
}

function neighbours(joinRules, state) {
  const result = []
  for (const rule of joinRules) {
    if (rule.enabled === false) continue
    if (rule.from === state.table && (rule.fromRole === undefined || rule.fromRole === state.role)) {
      result.push({ rule, direction: 'forward', table: rule.to, role: rule.toRole ?? DEFAULT_ROLE })
    }
    if (rule.to === state.table && (rule.toRole === undefined || rule.toRole === state.role)) {
      result.push({ rule, direction: 'backward', table: rule.from, role: rule.fromRole ?? DEFAULT_ROLE })
    }
  }
  return result
}

function toResult(state) {
  return {
    route: state.hops,
    totalCost: state.cost,
    fanOutCount: state.fanOutCount,
    hopCount: state.hops.length,
  }
}

export function findRoute({ joinRules = [], from, to, hopLimit = DEFAULT_HOP_LIMIT }) {
  if (from === to) return toResult({ hops: [], cost: 0, fanOutCount: 0 })

  const frontier = [{ table: from, role: DEFAULT_ROLE, cost: 0, fanOutCount: 0, hops: [] }]
  const settledHopCounts = new Map()

  while (frontier.length > 0) {
    let bestIndex = 0
    for (let i = 1; i < frontier.length; i++) {
      if (compareStates(frontier[i], frontier[bestIndex]) < 0) bestIndex = i
    }
    const [state] = frontier.splice(bestIndex, 1)

    if (state.table === to) return toResult(state)

    const key = stateKey(state.table, state.role)
    const settled = settledHopCounts.get(key) ?? []
    if (settled.some((hopCount) => hopCount <= state.hops.length)) continue
    settled.push(state.hops.length)
    settledHopCounts.set(key, settled)

    if (state.hops.length >= hopLimit) continue

    for (const step of neighbours(joinRules, state)) {
      frontier.push({
        table: step.table,
        role: step.role,
        cost: state.cost + (step.rule.cost ?? 1),
        fanOutCount: state.fanOutCount + (causesFanOut(step.rule, step.direction) ? 1 : 0),
        hops: [...state.hops, { table: step.table, rule: step.rule.id, role: step.role }],
      })
    }
  }

  return null
}
