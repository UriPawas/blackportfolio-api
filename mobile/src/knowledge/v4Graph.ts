/** Curated runtime projection of graphify-out/graph.json; it keeps the mobile boundary explicit. */
export type ArchitectureNode = {
  id: string;
  label: string;
  source: string;
  role: string;
  dependsOn: string[];
};

export const V4_GRAPH: readonly ArchitectureNode[] = [
  { id: 'identity', label: 'Auth + 2FA', source: 'auth.js', role: 'Firebase identity and server-issued 2FA session', dependsOn: ['api'] },
  { id: 'api', label: 'API FastAPI', source: 'api.py', role: 'Market data, billing and protected account operations', dependsOn: ['persistence'] },
  { id: 'persistence', label: 'PostgreSQL persistence', source: 'persistence.py', role: 'Authoritative plans and portfolio snapshots', dependsOn: [] },
  { id: 'portfolio', label: 'Tracker', source: 'app-tracker-v4.html', role: 'Portfolio records and positions', dependsOn: ['api'] },
  { id: 'markets', label: 'Markets', source: 'app-mercados-v4.html', role: 'Ticker search and chart data', dependsOn: ['api'] },
  { id: 'analysis', label: 'Analysis', source: 'app-analizador-v4.html', role: 'Risk, scenario and performance analysis', dependsOn: ['portfolio'] },
  { id: 'optimize', label: 'Optimization', source: 'app-optimizacion-v4.html', role: 'MVO, Smart Beta and Black-Litterman', dependsOn: ['portfolio'] },
  { id: 'macro', label: 'Top-down', source: 'app-topdown-v4.html', role: 'Macro context and sector signal', dependsOn: ['markets'] },
  { id: 'system', label: 'V4 design system', source: 'DESIGN.md', role: 'Institutional document visual language and theme tokens', dependsOn: [] },
];

export const graphNode = (id: string) => V4_GRAPH.find((node) => node.id === id);
