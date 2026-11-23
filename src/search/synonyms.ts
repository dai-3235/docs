const GROUPS = [
  ['phone', 'mobile', 'remote', 'away'],
  ['bot', 'app', 'agent', 'assistant'],
  ['message', 'task', 'request', 'command'],
  ['start', 'run', 'launch', 'begin'],
  ['stop', 'halt', 'end', 'cancel', 'kill'],
  ['error', 'failure', 'problem', 'issue', 'broken', 'stuck', 'stall'],
  ['security', 'secure', 'auth', 'authorization', 'allowlist', 'permission', 'trust'],
  ['install', 'setup', 'configure', 'configuration', 'config'],
  ['token', 'credential', 'secret', 'key'],
  ['restart', 'reboot', 'recover', 'recovery', 'resume'],
  ['latency', 'delay', 'slow', 'lag', 'speed'],
  ['poll', 'polling', 'wait', 'listen'],
  ['design', 'architecture', 'diagram', 'structure'],
  ['scale', 'scaling', 'team', 'multi'],
  ['compare', 'comparison', 'alternative', 'versus', 'vs'],
  ['log', 'logs', 'monitor', 'observe', 'metrics'],
];

const LOOKUP = new Map<string, string[]>();
for (const group of GROUPS) {
  for (const word of group) LOOKUP.set(word, group.filter((w) => w !== word));
}

export function expand(query: string): string {
  const extra = new Set<string>();
  for (const word of query.toLowerCase().split(/\W+/)) {
    for (const alt of LOOKUP.get(word) ?? []) extra.add(alt);
  }
  return [...extra].join(' ');
}
