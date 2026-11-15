import type { CompareRow } from '../lib/compare';

export const columns = ['Human MITI coding', 'AI practice chatbots', 'Onolys'] as const;

export const rows = [
  { criterion: 'Your own session', values: ['Yes', 'No, a simulated chat', 'Yes'] },
  { criterion: 'Full MITI 4.2.1 incl. global ratings', values: ['Yes', 'Usually "MITI-informed"', 'Yes'] },
  { criterion: 'Evidence for every score', values: ['Sometimes', 'Rarely', 'Yes, linked lines'] },
  { criterion: 'Turnaround', values: ['About 1 to 2 weeks', 'Instant', 'Minutes'] },
] as const satisfies readonly CompareRow[];

export const highlight = 2;
