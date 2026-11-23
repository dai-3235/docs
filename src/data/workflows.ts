export type FlowKind = 'human' | 'core' | 'service' | 'store' | 'risk' | 'gate';

export type FlowIcon = 'phone' | 'chat' | 'radio' | 'shield' | 'bot' | 'folder' | 'approve' | 'send';

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

export const requestToSqlFlow: FlowDefinition = {
  nodes: [
    {
      id: 'request',
      title: 'Request',
      subtitle: 'Business terms',
      detail: 'A consumer asks for a logical metric broken down by logical dimensions, with filters. Nothing in the request names a table or a column.',
      kind: 'human',
      icon: 'chat',
    },
    {
      id: 'resolve',
      title: 'Resolve',
      subtitle: 'Names to bindings',
      detail: 'Each logical metric and logical dimension is matched to the physical metrics and physical dimensions that can answer it, ranked by priority.',
      kind: 'core',
      icon: 'shield',
    },
    {
      id: 'choose',
      title: 'Choose a table',
      subtitle: 'Grain and virtual tables',
      detail: 'A virtual table is picked that can answer the metric at the requested grain, with the breakdowns and filters the request needs.',
      kind: 'gate',
      icon: 'folder',
    },
    {
      id: 'route',
      title: 'Find a route',
      subtitle: 'Join rules by cost',
      detail: 'Join rules connect the metric table to each dimension table. The route is chosen by cost, with fan-out as the tie-break, and a role lets one table appear twice.',
      kind: 'service',
      icon: 'radio',
    },
    {
      id: 'sql',
      title: 'Generate SQL',
      subtitle: 'For the engine',
      detail: 'The chosen tables and route become one query in the dialect of the engine that holds the data. A request that cannot be resolved returns a reason instead.',
      kind: 'store',
      icon: 'send',
    },
  ],
  edges: [
    { from: 'request', to: 'resolve' },
    { from: 'resolve', to: 'choose' },
    { from: 'choose', to: 'route' },
    { from: 'route', to: 'sql' },
  ],
};

export const platformFlow: FlowDefinition = {
  nodes: [
    {
      id: 'parse',
      title: 'Parse',
      subtitle: 'Check the request',
      detail: 'The request is validated against the shape the gateway accepts. Malformed requests are refused here, with a typed reason, before any metadata is read.',
      kind: 'human',
      icon: 'chat',
    },
    {
      id: 'resolve',
      title: 'Resolve',
      subtitle: 'Names to bindings',
      detail: 'Logical metrics and dimensions are matched to physical bindings. An ambiguous metric or a breakdown finer than the metric table allows stops the request with a reason.',
      kind: 'core',
      icon: 'shield',
    },
    {
      id: 'split',
      title: 'Split',
      subtitle: 'One part per database',
      detail: 'Metrics held in different databases are separated into parts that each stay inside one database. A part that would need a join across databases is refused.',
      kind: 'gate',
      icon: 'folder',
    },
    {
      id: 'plan',
      title: 'Plan joins',
      subtitle: 'Routes by cost',
      detail: 'Each part gets its route of joins through the cost-ordered search, within the hop limit and under the strategy ladder.',
      kind: 'service',
      icon: 'radio',
    },
    {
      id: 'generate',
      title: 'Generate SQL',
      subtitle: 'Per dialect',
      detail: 'Each planned part is rendered in the dialect of the engine that holds its data, through a small dialect layer that hides the differences.',
      kind: 'service',
      icon: 'bot',
    },
    {
      id: 'execute',
      title: 'Execute',
      subtitle: 'Engines in parallel',
      detail: 'Parts run against their engines with timeouts and limits. A cache can answer a part without reaching the engine.',
      kind: 'store',
      icon: 'send',
    },
    {
      id: 'merge',
      title: 'Merge',
      subtitle: 'One result',
      detail: 'Part results are combined on the shared breakdowns into one result, which carries the route and strategy used so the answer can be explained.',
      kind: 'core',
      icon: 'approve',
    },
  ],
  edges: [
    { from: 'parse', to: 'resolve' },
    { from: 'resolve', to: 'split' },
    { from: 'split', to: 'plan' },
    { from: 'plan', to: 'generate' },
    { from: 'generate', to: 'execute' },
    { from: 'execute', to: 'merge' },
  ],
};
