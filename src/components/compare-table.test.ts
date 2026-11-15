import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { columns, rows, highlight } from '../data/compare.learner';
import CompareTable from './CompareTable.astro';
import type { CompareRow } from '../lib/compare';

const expectedRows = [
  { criterion: 'Your own session', values: ['Yes', 'No, a simulated chat', 'Yes'] },
  { criterion: 'Full MITI 4.2.1 incl. global ratings', values: ['Yes', 'Usually "MITI-informed"', 'Yes'] },
  { criterion: 'Evidence for every score', values: ['Sometimes', 'Rarely', 'Yes, linked lines'] },
  { criterion: 'Turnaround', values: ['About 1 to 2 weeks', 'Instant', 'Minutes'] },
];

async function render(props: { columns: readonly string[]; rows: readonly CompareRow[]; highlight: number } = { columns, rows, highlight }) {
  const container = await AstroContainer.create();
  return new JSDOM(await container.renderToString(CompareTable, { props })).window.document;
}

describe('learner comparison', () => {
  it('keeps all approved columns, row labels, and values exact', () => {
    expect(columns).toEqual(['Human MITI coding', 'AI practice chatbots', 'Onolys']);
    expect(rows).toEqual(expectedRows);
    expect(highlight).toBe(2);
  });

  it('renders a named semantic table with scoped headers and explicit roles', async () => {
    const doc = await render();
    const table = doc.querySelector('table')!;
    expect(table.getAttribute('role')).toBe('table');
    expect(table.querySelector('caption')?.textContent?.trim().length).toBeGreaterThan(0);
    expect(Array.from(table.querySelectorAll('thead th')).map((header) => header.textContent?.trim())).toEqual(['Criterion', ...columns]);
    for (const header of table.querySelectorAll('thead th')) {
      expect(header.getAttribute('scope')).toBe('col');
      expect(header.getAttribute('role')).toBe('columnheader');
    }
    expect(table.querySelector('thead')?.getAttribute('role')).toBe('rowgroup');
    expect(table.querySelector('tbody')?.getAttribute('role')).toBe('rowgroup');
    const renderedRows = Array.from(table.querySelectorAll('tbody tr'));
    expect(renderedRows).toHaveLength(4);
    renderedRows.forEach((row, index) => {
      expect(row.getAttribute('role')).toBe('row');
      expect(row.querySelector('th')?.getAttribute('scope')).toBe('row');
      expect(row.querySelector('th')?.getAttribute('role')).toBe('rowheader');
      expect(row.querySelector('th h3')?.textContent).toBe(expectedRows[index].criterion);
      const cells = Array.from(row.querySelectorAll('td'));
      expect(cells).toHaveLength(3);
      cells.forEach((cell, column) => {
        expect(cell.getAttribute('role')).toBe('cell');
        expect(cell.querySelector('[data-column-label]')?.textContent).toBe(columns[column]);
        expect(cell.querySelector('[data-value]')?.textContent).toBe(expectedRows[index].values[column]);
      });
    });
  });

  it('emphasizes only the requested Onolys column with bold text and an accent hook', async () => {
    const doc = await render();
    expect(doc.querySelectorAll('td[data-highlighted="true"]')).toHaveLength(4);
    for (const row of doc.querySelectorAll('tbody tr')) {
      const cells = row.querySelectorAll('td');
      expect(cells[0].querySelector('strong')).toBeNull();
      expect(cells[1].querySelector('strong')).toBeNull();
      expect(cells[2].querySelector('strong')).not.toBeNull();
    }
    expect(doc.querySelector('thead th[data-highlighted="true"]')?.textContent).toContain('Onolys');
  });

  it('reuses the table with different columns, row data, and highlight position', async () => {
    const alternate = {
      columns: ['Evidence check', 'Second coder'],
      rows: [{ criterion: 'Example criterion', values: ['Flagged lines', 'Independent review'] }],
      highlight: 0,
    };
    const doc = await render(alternate);
    expect(doc.querySelectorAll('thead th')).toHaveLength(3);
    expect(doc.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(doc.querySelectorAll('tbody td')).toHaveLength(2);
    expect(doc.querySelector('tbody th h3')?.textContent).toBe('Example criterion');
    expect(doc.querySelector('tbody td[data-highlighted="true"] strong')?.textContent).toBe('Flagged lines');
    expect(doc.body.textContent).not.toContain('Onolys');
    expect(doc.body.textContent).not.toContain('AI practice chatbots');
  });
});
