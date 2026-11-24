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
  via?: [string, string];
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

export const rolloutLoopFlow: FlowDefinition = {
  nodes: [
    {
      id: 'workers',
      title: 'Generation workers',
      subtitle: 'Many, in parallel',
      detail: 'Each worker runs the policy on a prompt, lets a grader score the trajectory, and appends the result. Thousands of workers can be appending at the same time.',
      kind: 'human',
      icon: 'bot',
    },
    {
      id: 'append',
      title: 'Append',
      subtitle: 'One atomic write per trajectory',
      detail: 'A trajectory goes in as one append: messages, token arrays, rewards and artifacts together. There is no multi-table fan-out to reassemble later.',
      kind: 'core',
      icon: 'send',
    },
    {
      id: 'store',
      title: 'RolloutStore',
      subtitle: 'Versioned columnar table',
      detail: 'Every write creates an immutable snapshot, so any earlier set of rollouts can be recovered exactly with a version number.',
      kind: 'store',
      icon: 'database',
    },
    {
      id: 'project',
      title: 'Project columns',
      subtitle: 'Only what the learner reads',
      detail: 'The learner asks for tokens, logprobs and advantage. Text, artifacts and grader logs are separate columns and are never read.',
      kind: 'core',
      icon: 'table',
    },
    {
      id: 'learner',
      title: 'Learner',
      subtitle: 'Gradient steps',
      detail: 'Trains on token-aligned batches and publishes a new policy version. The version it trained on is recorded next to the rows, so the training set can be replayed.',
      kind: 'service',
      icon: 'gauge',
    },
    {
      id: 'policy',
      title: 'New policy',
      subtitle: 'Back to the workers',
      detail: 'The next checkpoint goes to the generation workers, and the loop starts again.',
      kind: 'gate',
      icon: 'refresh',
    },
  ],
  edges: [
    { from: 'workers', to: 'append' },
    { from: 'append', to: 'store' },
    { from: 'store', to: 'project' },
    { from: 'project', to: 'learner', via: ['b', 't'] },
    { from: 'learner', to: 'policy', via: ['sl', 'rt'] },
    { from: 'policy', to: 'workers', label: 'next checkpoint', via: ['sl', 'tb'] },
  ],
  wide: {
    workers: { x: 0, y: 0 },
    append: { x: 240, y: 0 },
    store: { x: 480, y: 0 },
    project: { x: 720, y: 0 },
    learner: { x: 720, y: 140 },
    policy: { x: 480, y: 140 },
  },
};

export const layersFlow: FlowDefinition = {
  nodes: [
    {
      id: 'clients',
      title: 'Clients',
      subtitle: 'Python, Rust, HTTP, MCP',
      detail: 'The embedded library runs inside your process. The HTTP server and client give remote access, and an MCP example serves a store to a coding agent.',
      kind: 'human',
      icon: 'send',
    },
    {
      id: 'stores',
      title: 'Stores',
      subtitle: 'Context, Rollout, Generic, Document',
      detail: 'Each store is a schema plus an encode and decode pair: ContextStore for agent memory, RolloutStore for RL rollouts, GenericStore for application schemas, DocumentStore for JSON with automatic shredding.',
      kind: 'core',
      icon: 'table',
    },
    {
      id: 'base',
      title: 'StorageBase',
      subtitle: 'Shared Lance plumbing',
      detail: 'Everything that is not schema-specific lives here: opening the dataset, the resident write-ahead log writer, durable append, seal and flush, merge into the base table, compaction, indexes and the combined read scanner.',
      kind: 'core',
      icon: 'layers',
    },
    {
      id: 'lance',
      title: 'Lance dataset',
      subtitle: 'Base table plus WAL shards',
      detail: 'A versioned columnar table. Appends land first in per-writer write-ahead log shards beside the base table and are merged into it later.',
      kind: 'store',
      icon: 'database',
    },
    {
      id: 'object',
      title: 'Object storage',
      subtitle: 'S3, GCS, Azure or local files',
      detail: 'The only durable state. Credentials go in through a storage options dictionary or the standard environment variables.',
      kind: 'store',
      icon: 'folder',
    },
    {
      id: 'control',
      title: 'Control plane',
      subtitle: 'Master, workers, etcd',
      detail: 'Optional. Runs the background merge, compaction and index work for many tables, with fencing so one writer owns each table at a time.',
      kind: 'service',
      icon: 'gauge',
    },
  ],
  edges: [
    { from: 'clients', to: 'stores' },
    { from: 'stores', to: 'base' },
    { from: 'base', to: 'lance' },
    { from: 'lance', to: 'object', via: ['b', 't'] },
    { from: 'control', to: 'lance', label: 'maintains', dashed: true },
  ],
  wide: {
    clients: { x: 0, y: 0 },
    stores: { x: 240, y: 0 },
    base: { x: 480, y: 0 },
    lance: { x: 720, y: 0 },
    object: { x: 720, y: 140 },
    control: { x: 480, y: 140 },
  },
};

export const writePathFlow: FlowDefinition = {
  nodes: [
    {
      id: 'worker',
      title: 'Writer',
      subtitle: 'Generation worker or agent',
      detail: 'Posts a record. It does not need to know which instance serves it or which shard it lands on.',
      kind: 'human',
      icon: 'bot',
    },
    {
      id: 'lb',
      title: 'Load balancer',
      subtitle: 'Round robin, no affinity',
      detail: 'Spreads requests across instances. Correctness does not depend on how it spreads them.',
      kind: 'service',
      icon: 'route',
    },
    {
      id: 'server',
      title: 'Server instance',
      subtitle: 'Owns one shard',
      detail: 'The shard id is a function of the instance id (a version 5 UUID of the stable name), so a restart reclaims the same shard and no two instances ever share one.',
      kind: 'core',
      icon: 'layers',
    },
    {
      id: 'wal',
      title: 'WAL generation',
      subtitle: 'Written to object storage',
      detail: 'The append is written to the instance shard as a durable write-ahead log generation. Advancing the shard manifest is a compare-and-set with an epoch, so a second writer on the same shard is fenced out.',
      kind: 'store',
      icon: 'database',
    },
    {
      id: 'merge',
      title: 'Merge',
      subtitle: 'Background, surgical',
      detail: 'Drains only the generations it actually merged, reuses the shard current epoch so the live writer is never fenced, and deletes generation directories only after the manifest drain.',
      kind: 'core',
      icon: 'refresh',
    },
    {
      id: 'base',
      title: 'Base table',
      subtitle: 'Versioned snapshots',
      detail: 'Merged rows become part of the base table. Compaction and index builds run here too.',
      kind: 'store',
      icon: 'table',
    },
    {
      id: 'reader',
      title: 'Reader',
      subtitle: 'Merged scan',
      detail: 'The read path combines the base table with every shard generation that is not yet merged, so any instance sees every instance writes.',
      kind: 'gate',
      icon: 'shield',
    },
  ],
  edges: [
    { from: 'worker', to: 'lb' },
    { from: 'lb', to: 'server' },
    { from: 'server', to: 'wal' },
    { from: 'wal', to: 'merge', via: ['b', 't'] },
    { from: 'merge', to: 'base' },
    { from: 'base', to: 'reader' },
    { from: 'wal', to: 'reader', label: 'unmerged rows', dashed: true, via: ['b', 'rt'] },
  ],
  wide: {
    worker: { x: 0, y: 0 },
    lb: { x: 240, y: 0 },
    server: { x: 480, y: 0 },
    wal: { x: 720, y: 0 },
    merge: { x: 0, y: 140 },
    base: { x: 240, y: 140 },
    reader: { x: 480, y: 140 },
  },
};

export const controlPlaneFlow: FlowDefinition = {
  nodes: [
    {
      id: 'signals',
      title: 'Signals',
      subtitle: 'Flush, merge done, scans',
      detail: 'Writers announce a flush, merges report completion, and a periodic scan reconciles anything missed. Signals carry watermarks, so replays are harmless.',
      kind: 'human',
      icon: 'radio',
    },
    {
      id: 'demand',
      title: 'Demand controller',
      subtitle: 'One leader, etcd lease',
      detail: 'A single elected leader keeps the demand for every table in memory: pending generations, small files, stale indexes. Followers watch the leader key and do not scan.',
      kind: 'core',
      icon: 'gauge',
    },
    {
      id: 'offers',
      title: 'Capacity and offers',
      subtitle: 'Exact etcd keys',
      detail: 'Executors advertise free slots as leased tickets. The controller matches work to a ticket and publishes one offer, and the executor accepts it in a single transaction.',
      kind: 'store',
      icon: 'database',
    },
    {
      id: 'executors',
      title: 'Executors',
      subtitle: 'Master, worker, catch-up job',
      detail: 'They run MergeWal, Compact, IndexId and Repair. Each one holds slots and a memory budget, and runs under the fence from the merge crate.',
      kind: 'service',
      icon: 'layers',
    },
    {
      id: 'fence',
      title: 'Merge fence',
      subtitle: 'Execution marker and permits',
      detail: 'A persistent execution marker and a permit before every manifest commit decide who may write, and make a crashed executor recoverable.',
      kind: 'gate',
      icon: 'shield',
    },
    {
      id: 'table',
      title: 'Lance table',
      subtitle: 'Exactly one publisher',
      detail: 'Only the fenced execution commits to the table, so a retry, a duplicate task or a paused old process cannot publish twice.',
      kind: 'store',
      icon: 'table',
    },
  ],
  edges: [
    { from: 'signals', to: 'demand' },
    { from: 'demand', to: 'offers' },
    { from: 'offers', to: 'executors' },
    { from: 'executors', to: 'fence', via: ['b', 't'] },
    { from: 'fence', to: 'table', via: ['sl', 'rt'] },
  ],
  wide: {
    signals: { x: 0, y: 0 },
    demand: { x: 240, y: 0 },
    offers: { x: 480, y: 0 },
    executors: { x: 720, y: 0 },
    fence: { x: 720, y: 140 },
    table: { x: 480, y: 140 },
  },
};

export const mergeFenceFlow: FlowDefinition = {
  nodes: [
    {
      id: 'admit',
      title: 'Admit',
      subtitle: 'Execution marker: Running',
      detail: 'Admission replaces a lease-backed lock with a persistent execution marker. A leased claim lets only one scheduler reconcile it.',
      kind: 'core',
      icon: 'shield',
    },
    {
      id: 'permit',
      title: 'Permit',
      subtitle: 'Before every commit',
      detail: 'Before each base-manifest commit and each shard-drain write, the worker checks that its execution is still Running and records the highest immutable version it may have written.',
      kind: 'gate',
      icon: 'approve',
    },
    {
      id: 'commit',
      title: 'Commit',
      subtitle: 'Conditional write',
      detail: 'The write is conditional, so a definite conflict is clearly different from an ambiguous storage error or panic.',
      kind: 'core',
      icon: 'send',
    },
    {
      id: 'uncertain',
      title: 'Uncertain',
      subtitle: 'Ownership is kept',
      detail: 'An ambiguous outcome publishes Uncertain. The execution keeps ownership even after the Rust future ends, because the write may still land.',
      kind: 'risk',
      icon: 'radio',
    },
    {
      id: 'recover',
      title: 'Recovering',
      subtitle: 'Close admission',
      detail: 'The master atomically moves the execution to Recovering. A racing permit either precedes this and is in the recorded maximum, or fails its comparison.',
      kind: 'service',
      icon: 'gauge',
    },
    {
      id: 'barrier',
      title: 'Barriers',
      subtitle: 'Metadata-only writes',
      detail: 'Conditional writes advance the base and shard manifests past every admitted version, so a delayed old write can no longer land. No payload is scanned and no writer is fenced.',
      kind: 'core',
      icon: 'layers',
    },
    {
      id: 'recovered',
      title: 'Recovered',
      subtitle: 'Lock released',
      detail: 'Only after every barrier is confirmed can the target lock be released and merging continue.',
      kind: 'store',
      icon: 'database',
    },
  ],
  edges: [
    { from: 'admit', to: 'permit' },
    { from: 'permit', to: 'commit' },
    { from: 'commit', to: 'uncertain', label: 'ambiguous', dashed: true },
    { from: 'uncertain', to: 'recover', via: ['b', 't'] },
    { from: 'recover', to: 'barrier' },
    { from: 'barrier', to: 'recovered' },
  ],
  wide: {
    admit: { x: 0, y: 0 },
    permit: { x: 240, y: 0 },
    commit: { x: 480, y: 0 },
    uncertain: { x: 720, y: 0 },
    recover: { x: 0, y: 140 },
    barrier: { x: 240, y: 140 },
    recovered: { x: 480, y: 140 },
  },
};

export const ingestFlow: FlowDefinition = {
  nodes: [
    {
      id: 'producer',
      title: 'Producer',
      subtitle: 'Journal, then send',
      detail: 'A recoverable producer writes the exact body and sequence to a local journal before sending, and records the acknowledgement before advancing. After a failure it resends the same intent and never invents a new identity.',
      kind: 'human',
      icon: 'send',
    },
    {
      id: 'gateway',
      title: 'HTTP gateway',
      subtitle: 'Arrow body, bounded',
      detail: 'Validates length, type and schema fingerprint, and reserves memory before reading the body. Data and control requests have separate admission, so a flood of appends cannot starve control calls.',
      kind: 'service',
      icon: 'route',
    },
    {
      id: 'quorum',
      title: 'Replicated WAL',
      subtitle: 'Three voters, Raft',
      detail: 'An append is acknowledged only after a majority replicated it and the local durable commit boundary was reached. Losing leadership gives an unknown outcome, never a guessed rejection.',
      kind: 'core',
      icon: 'shield',
    },
    {
      id: 'receipt',
      title: 'Receipt',
      subtitle: 'Accepted, not yet visible',
      detail: 'The 202 response carries a durable receipt with the position, sequence and body digest. It does not wait for the Lance table.',
      kind: 'gate',
      icon: 'approve',
    },
    {
      id: 'worker',
      title: 'Materializer',
      subtitle: 'Claim, then publish',
      detail: 'A worker takes a table through an expiring etcd lease, but the lease is not the fence: the publisher epoch is read first, then the claim, then an epoch-conditional acquisition.',
      kind: 'service',
      icon: 'gauge',
    },
    {
      id: 'catalog',
      title: 'Manifest catalog',
      subtitle: 'Chosen by quorum',
      detail: 'Each publication reserves one immutable staging manifest path through the same quorum, so readers resolve versions from the catalog and never from a directory listing.',
      kind: 'store',
      icon: 'database',
    },
    {
      id: 'table',
      title: 'Lance table',
      subtitle: 'Visible to readers',
      detail: 'A receipt can be turned into the minimum Lance version that contains it, so a producer can wait for visibility only when it needs to.',
      kind: 'store',
      icon: 'table',
    },
  ],
  edges: [
    { from: 'producer', to: 'gateway' },
    { from: 'gateway', to: 'quorum' },
    { from: 'quorum', to: 'receipt' },
    { from: 'receipt', to: 'producer', label: 'ack checkpoint', dashed: true, via: ['b', 'tb'] },
    { from: 'quorum', to: 'worker', via: ['b', 't'] },
    { from: 'worker', to: 'catalog' },
    { from: 'catalog', to: 'table' },
  ],
  wide: {
    producer: { x: 0, y: 0 },
    gateway: { x: 240, y: 0 },
    quorum: { x: 480, y: 0 },
    receipt: { x: 720, y: 0 },
    worker: { x: 0, y: 140 },
    catalog: { x: 240, y: 140 },
    table: { x: 480, y: 140 },
  },
};
