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
  return a.cost - b.cost || a.fanOutCount - b.fanOutCount || a.hops.length - b.hops.length || a.sequence - b.sequence
}

function stateKey(table, role) {
  return `${table}\u0000${role}`
}

class StateHeap {
  constructor() {
    this.items = []
  }

  get size() {
    return this.items.length
  }

  push(state) {
    const items = this.items
    items.push(state)
    let child = items.length - 1
    while (child > 0) {
      const parent = (child - 1) >> 1
      if (compareStates(items[child], items[parent]) >= 0) break
      ;[items[child], items[parent]] = [items[parent], items[child]]
      child = parent
    }
  }

  pop() {
    const items = this.items
    const top = items[0]
    const last = items.pop()
    if (items.length > 0) {
      items[0] = last
      let parent = 0
      for (;;) {
        const left = parent * 2 + 1
        const right = left + 1
        let smallest = parent
        if (left < items.length && compareStates(items[left], items[smallest]) < 0) smallest = left
        if (right < items.length && compareStates(items[right], items[smallest]) < 0) smallest = right
        if (smallest === parent) break
        ;[items[parent], items[smallest]] = [items[smallest], items[parent]]
        parent = smallest
      }
    }
    return top
  }
}

export function buildRouteIndex(joinRules) {
  const index = new Map()
  const add = (table, step) => {
    if (!index.has(table)) index.set(table, [])
    index.get(table).push(step)
  }
  for (const rule of joinRules) {
    if (rule.enabled === false) continue
    add(rule.from, { rule, direction: 'forward', requiredRole: rule.fromRole, table: rule.to, role: rule.toRole ?? DEFAULT_ROLE })
    add(rule.to, { rule, direction: 'backward', requiredRole: rule.toRole, table: rule.from, role: rule.fromRole ?? DEFAULT_ROLE })
  }
  return index
}

function neighbours(index, state) {
  return (index.get(state.table) ?? []).filter((step) => step.requiredRole === undefined || step.requiredRole === state.role)
}

function toResult(state) {
  return {
    route: state.hops,
    totalCost: state.cost,
    fanOutCount: state.fanOutCount,
    hopCount: state.hops.length,
  }
}

export function findRoute({ joinRules = [], index = buildRouteIndex(joinRules), from, to, hopLimit = DEFAULT_HOP_LIMIT }) {
  if (from === to) return toResult({ hops: [], cost: 0, fanOutCount: 0 })

  let sequence = 0
  const frontier = new StateHeap()
  frontier.push({ table: from, role: DEFAULT_ROLE, cost: 0, fanOutCount: 0, hops: [], sequence: sequence++ })
  const settledHopCounts = new Map()

  while (frontier.size > 0) {
    const state = frontier.pop()

    if (state.table === to) return toResult(state)

    const key = stateKey(state.table, state.role)
    const settled = settledHopCounts.get(key) ?? []
    if (settled.some((hopCount) => hopCount <= state.hops.length)) continue
    settled.push(state.hops.length)
    settledHopCounts.set(key, settled)

    if (state.hops.length >= hopLimit) continue

    for (const step of neighbours(index, state)) {
      frontier.push({
        table: step.table,
        role: step.role,
        cost: state.cost + (step.rule.cost ?? 1),
        fanOutCount: state.fanOutCount + (causesFanOut(step.rule, step.direction) ? 1 : 0),
        hops: [...state.hops, { table: step.table, rule: step.rule.id, role: step.role }],
        sequence: sequence++,
      })
    }
  }

  return null
}
