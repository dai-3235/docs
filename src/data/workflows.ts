export type FlowKind = 'human' | 'core' | 'service' | 'store' | 'risk' | 'gate';

export type FlowIcon = 'phone' | 'chat' | 'radio' | 'shield' | 'bot' | 'folder' | 'approve' | 'send' | 'database' | 'route' | 'gauge' | 'layers' | 'table' | 'refresh';

export interface FlowNodeData {
  id: string;
  title: string;
  subtitle: string;
  detail: string;
  kind: FlowKind;
  icon: FlowIcon;
}

export interface FlowEdgeData {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

export interface FlowDefinition {
  nodes: FlowNodeData[];
  edges: FlowEdgeData[];
  wide?: Record<string, { x: number; y: number }>;
  tall?: Record<string, { x: number; y: number }>;
}

export const taskFlow: FlowDefinition = {
  nodes: [
    {
      id: 'phone',
      title: 'You',
      subtitle: 'Send a task',
      detail: 'Message the Slack app from your phone, for example "docs: add a glossary entry". Slack pushes a notification for every reply.',
      kind: 'human',
      icon: 'phone',
    },
    {
      id: 'slack',
      title: 'Slack',
      subtitle: 'Holds the message',
      detail: 'The Slack Web API stores the message. Nothing on your machine listens for it, so there is no tunnel and no open port.',
      kind: 'service',
      icon: 'chat',
    },
    {
      id: 'poll',
      title: 'slack.py',
      subtitle: 'Polls and filters',
      detail: 'Asks Slack for new messages every 4 seconds over HTTPS with a timestamp cursor, so nothing is read twice. Only senders listed in user_ids get through. Everyone else, and every bot message, is dropped before the agent sees it.',
      kind: 'core',
      icon: 'radio',
    },
    {
      id: 'agent',
      title: 'Agent',
      subtitle: 'Does the work',
      detail: 'The dispatch skill acknowledges the task, resolves the workspace, works on a new branch and runs the tests before it reports.',
      kind: 'core',
      icon: 'bot',
    },
    {
      id: 'repo',
      title: 'Workspace',
      subtitle: 'Allowlisted dirs',
      detail: 'Edits happen only inside the directories listed under workspaces in the config. Anything outside needs a question first.',
      kind: 'store',
      icon: 'folder',
    },
    {
      id: 'approve',
      title: 'Approval',
      subtitle: 'Risky actions wait',
      detail: 'Pushes to shared branches, deletes, deploys and spending need an explicit yes in Slack. Silence is never approval, and after four hours the task is parked.',
      kind: 'risk',
      icon: 'approve',
    },
    {
      id: 'report',
      title: 'Report',
      subtitle: 'Push to your phone',
      detail: 'A short summary with the branch and test results is posted back to the same chat, and your phone gets a push notification.',
      kind: 'service',
      icon: 'send',
    },
  ],
  edges: [
    { from: 'phone', to: 'slack', label: 'send' },
    { from: 'slack', to: 'poll', label: 'poll' },
    { from: 'poll', to: 'agent', label: 'allowed' },
    { from: 'agent', to: 'repo', label: 'edit, test' },
    { from: 'agent', to: 'approve', label: 'risky', dashed: true },
    { from: 'agent', to: 'report' },
  ],
  wide: {
    phone: { x: 0, y: 118 },
    slack: { x: 274, y: 118 },
    poll: { x: 548, y: 118 },
    agent: { x: 822, y: 118 },
    repo: { x: 1150, y: 0 },
    approve: { x: 1150, y: 118 },
    report: { x: 1150, y: 236 },
  },
  tall: {
    phone: { x: 0, y: 0 },
    slack: { x: 0, y: 104 },
    poll: { x: 0, y: 208 },
    agent: { x: 0, y: 312 },
    repo: { x: 0, y: 430 },
    approve: { x: 0, y: 524 },
    report: { x: 0, y: 618 },
  },
};

export const gatewayFlow: FlowDefinition = {
  nodes: [
    {
      id: 'consumer',
      title: 'Consumer',
      subtitle: 'Asks by name',
      detail: 'A dashboard, an export, a notebook or a service sends metrics, breakdowns, a filter and a time range. It never names a table or a column.',
      kind: 'human',
      icon: 'send',
    },
    {
      id: 'validate',
      title: 'Validate',
      subtitle: 'Names and grain',
      detail: 'Every metric and dimension must exist in the registries, and every breakdown must be at the grain of a table that holds the metric. A request that fails here stops with a typed reason.',
      kind: 'gate',
      icon: 'shield',
    },
    {
      id: 'registry',
      title: 'Registries',
      subtitle: 'Metadata as data',
      detail: 'Logical and physical metrics and dimensions, join rules and derived metric formulas. They are rows in a small store, cached in memory and reloaded when they change, so a change needs no deploy.',
      kind: 'store',
      icon: 'database',
    },
    {
      id: 'tables',
      title: 'Pick tables',
      subtitle: 'Priority and grain',
      detail: 'For each metric, the cheapest physical table that can answer the whole request. A tie is refused as an ambiguous metric instead of guessed.',
      kind: 'core',
      icon: 'table',
    },
    {
      id: 'route',
      title: 'Find routes',
      subtitle: 'Cost-ordered search',
      detail: 'Joins between the metric tables and the dimension tables, chosen by lowest declared cost, then fewest fan-outs, then fewest joins. No route inside the hop limit is a typed refusal.',
      kind: 'core',
      icon: 'route',
    },
    {
      id: 'sql',
      title: 'Generate SQL',
      subtitle: 'One CTE per table',
      detail: 'Each fact table is aggregated to the join keys in its own CTE, then joined, so a row cannot be counted twice. Derived metrics are computed after aggregation. A named query renders a reviewed template instead.',
      kind: 'core',
      icon: 'layers',
    },
    {
      id: 'engines',
      title: 'Engines',
      subtitle: 'Run where data lives',
      detail: 'A driver per datasource. A request that spans two engines is split, each part runs where its data lives, and the results are merged on the shared breakdown. A result cache sits in front, keyed by the normalized request.',
      kind: 'service',
      icon: 'gauge',
    },
  ],
  edges: [
    { from: 'consumer', to: 'validate' },
    { from: 'validate', to: 'registry', dashed: true },
    { from: 'validate', to: 'tables' },
    { from: 'tables', to: 'route' },
    { from: 'route', to: 'sql' },
    { from: 'sql', to: 'engines' },
  ],
};

export const routeChoiceFlow: FlowDefinition = {
  nodes: [
    {
      id: 'event',
      title: 'ad_event_fact',
      subtitle: 'Holds spend',
      detail: 'The metric table. The request is total spend by sponsor, so the search starts here and must reach the sponsor table.',
      kind: 'human',
      icon: 'table',
    },
    {
      id: 'banner',
      title: 'banner_dim',
      subtitle: 'Banner lookup',
      detail: 'Reached from the event table at cost 1. The only way on to the placement table is the banner rotation, a many-to-many rule at cost 3 that fans out.',
      kind: 'store',
      icon: 'table',
    },
    {
      id: 'placement',
      title: 'placement_dim',
      subtitle: 'One step up',
      detail: 'Reached directly from the event table at cost 1, or from the banner table through the rotation at cost 3, which fans out and counts spend once per matching banner.',
      kind: 'store',
      icon: 'table',
    },
    {
      id: 'promotion',
      title: 'promotion_dim',
      subtitle: 'Two steps up',
      detail: 'Placement joins to promotion at cost 1, and promotion joins to sponsor at cost 1.',
      kind: 'store',
      icon: 'table',
    },
    {
      id: 'sponsor',
      title: 'sponsor_dim',
      subtitle: 'The target',
      detail: 'Route A is the shortcut, one join at cost 2.5, or 4 once the owner distrusts it. Route B is the chain through placement and promotion, three joins at cost 3. Route C goes through the banner rotation at cost 6 with one fan-out. The lowest cost wins.',
      kind: 'gate',
      icon: 'table',
    },
  ],
  edges: [
    { from: 'event', to: 'sponsor', label: 'A: 2.5' },
    { from: 'event', to: 'placement', label: 'B: 1' },
    { from: 'placement', to: 'promotion', label: 'B: 1' },
    { from: 'promotion', to: 'sponsor', label: 'B: 1' },
    { from: 'event', to: 'banner', label: 'C: 1' },
    { from: 'banner', to: 'placement', label: 'C: rotation 3, fans out', dashed: true },
  ],
  wide: {
    event: { x: 0, y: 156 },
    banner: { x: 240, y: 240 },
    placement: { x: 455, y: 0 },
    promotion: { x: 705, y: 0 },
    sponsor: { x: 930, y: 156 },
  },
  tall: {
    event: { x: 0, y: 0 },
    banner: { x: 0, y: 100 },
    placement: { x: 0, y: 200 },
    promotion: { x: 0, y: 300 },
    sponsor: { x: 0, y: 400 },
  },
};

export const feedbackLoopFlow: FlowDefinition = {
  nodes: [
    {
      id: 'serve',
      title: 'Serve ads',
      subtitle: 'Data plane',
      detail: 'The decision at request time reads precomputed values from a low-latency store. It has a latency budget a SQL gateway cannot meet, so the gateway is not on this path.',
      kind: 'human',
      icon: 'send',
    },
    {
      id: 'events',
      title: 'Event stream',
      subtitle: 'Fresh and complete',
      detail: 'Served events land twice: a narrow table that is minutes old, and a complete table that is hours old. Both are physical bindings of the same logical metrics.',
      kind: 'store',
      icon: 'database',
    },
    {
      id: 'gateway',
      title: 'Gateway',
      subtitle: 'One set of definitions',
      detail: 'Priority and a freshness requirement on the request choose between the fresh and the complete table. Reports and the throttling job read the same logical metrics.',
      kind: 'core',
      icon: 'route',
    },
    {
      id: 'job',
      title: 'Throttling job',
      subtitle: 'Just a consumer',
      detail: 'Queries served impressions against goal by placement through the same API, computes the adjustment, and writes it to the system that serves ads. A table move behind a metric never touches it.',
      kind: 'service',
      icon: 'gauge',
    },
    {
      id: 'config',
      title: 'Serving config',
      subtitle: 'Control plane',
      detail: 'Spend throttling, frequency caps, bid adjustments and alerts. They change on a seconds-to-minutes timescale and feed the next round of serving.',
      kind: 'gate',
      icon: 'refresh',
    },
  ],
  edges: [
    { from: 'serve', to: 'events' },
    { from: 'events', to: 'gateway' },
    { from: 'gateway', to: 'job' },
    { from: 'job', to: 'config' },
    { from: 'config', to: 'serve', label: 'next decision' },
  ],
};
