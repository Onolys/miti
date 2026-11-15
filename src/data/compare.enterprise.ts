import type { CompareRow } from '../lib/compare';

export const columns = ['Second human coder', 'Onolys evidence check'] as const;
/** Short labels for the mobile option tabs. */
export const shortColumns = ['Second coder', 'Onolys'] as const;
/** Desktop column widths in percent: criterion narrowest, Onolys widest. */
export const widths = [26, 32, 42] as const;

export const rows = [
  { criterion: 'Checks every score', values: ['Yes', 'Yes'] },
  { criterion: 'Points to the lines', values: ['Sometimes', 'Yes, linked lines'] },
  { criterion: 'Turnaround', values: ['Days', 'Minutes'] },
  { criterion: 'Scales with volume', values: ['Needs more coders', 'Yes'] },
] as const satisfies readonly CompareRow[];

export const highlight = 1;
