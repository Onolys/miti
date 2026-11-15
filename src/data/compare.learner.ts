import type { CompareRow } from '../lib/compare';

export const columns = ['Human MITI coding', 'AI practice chatbots', 'Onolys'] as const;
/** Short labels for the mobile option tabs. */
export const shortColumns = ['Human coding', 'AI chatbots', 'Onolys'] as const;
/** Desktop column widths in percent: criterion narrowest, Onolys widest. */
export const widths = [22, 24, 24, 30] as const;

export const rows = [
  { criterion: 'Your own session', values: ['Yes', 'No, a simulated chat', 'Yes'] },
  { criterion: 'Full MITI 4.2.1 coding', values: ['Yes', 'No, "MITI-informed"', 'Yes'] },
  { criterion: 'Evidence for every score', values: ['Sometimes', 'Rarely', 'Yes'] },
  { criterion: 'Session length', values: ['Full session', 'Limited, short chats', 'Full session'] },
  { criterion: 'Cost', values: ['$40–$80 per session', 'Expensive subscriptions', 'Low (pricing coming soon)'] },
  { criterion: 'Turnaround', values: ['About 1 to 2 weeks', '—', 'Minutes'] },
] as const satisfies readonly CompareRow[];

export const highlight = 2;
