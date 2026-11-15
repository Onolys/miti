import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { columns, rows, highlight, shortColumns, widths } from '../data/compare.learner';
import CompareTable from './CompareTable.astro';
import type { CompareRow } from '../lib/compare';

const expectedRows = [
  { criterion: 'Your own session', values: ['Yes', 'No, a simulated chat', 'Yes'] },
  { criterion: 'Full MITI 4.2.1 incl. global ratings', values: ['Yes', 'No, "MITI-informed"', 'Yes'] },
  { criterion: 'Evidence for every score', values: ['Sometimes', 'Rarely', 'Yes'] },
  { criterion: 'Session length', values: ['Full session', 'Limited, short chats', 'Full session'] },
  { criterion: 'Cost', values: ['$40–$80 per session', 'Expensive subscriptions', 'Low (pricing coming soon)'] },
  { criterion: 'Turnaround', values: ['About 1 to 2 weeks', '—', 'Minutes'] },
];

async function render(props: { columns: readonly string[]; rows: readonly CompareRow[]; highlight: number; shortColumns?: readonly string[]; widths?: readonly number[] } = { columns, rows, highlight, shortColumns, widths }) {
  const container = await AstroContainer.create();
  return new JSDOM(await container.renderToString(CompareTable, { props })).window.document;
}

describe('learner comparison', () => {
  it('keeps all approved columns, row labels, and values exact', () => {
    expect(columns).toEqual(['Human MITI coding', 'AI practice chatbots', 'Onolys']);
    expect(rows).toEqual(expectedRows);
    expect(highlight).toBe(2);
    expect(shortColumns).toEqual(['Human coding', 'AI chatbots', 'Onolys']);
    expect(widths).toEqual([22, 24, 24, 30]);
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
    expect(renderedRows).toHaveLength(6);
    renderedRows.forEach((row, index) => {
      expect(row.getAttribute('role')).toBe('row');
      expect(row.querySelector('th')?.getAttribute('scope')).toBe('row');
      expect(row.querySelector('th')?.getAttribute('role')).toBe('rowheader');
      expect(row.querySelector('th h3')?.textContent).toBe(expectedRows[index].criterion);
      const cells = Array.from(row.querySelectorAll('td'));
      expect(cells).toHaveLength(3);
      cells.forEach((cell, column) => {
        expect(cell.getAttribute('role')).toBe('cell');
        expect(cell.querySelector('[data-value]')?.textContent).toBe(expectedRows[index].values[column]);
      });
    });
  });

  it('emphasizes only the requested Onolys column with bold text and an accent hook', async () => {
    const doc = await render();
    expect(doc.querySelectorAll('td[data-highlighted="true"]')).toHaveLength(6);
    for (const row of doc.querySelectorAll('tbody tr')) {
      const cells = row.querySelectorAll('td');
      expect(cells[0].querySelector('strong')).toBeNull();
      expect(cells[1].querySelector('strong')).toBeNull();
      expect(cells[2].querySelector('strong')).not.toBeNull();
    }
    expect(doc.querySelector('thead th[data-highlighted="true"]')?.textContent).toContain('Onolys');
  });

  it('uses a fixed layout with the criterion column narrowest and Onolys widest', async () => {
    const doc = await render();
    const cols = Array.from(doc.querySelectorAll('colgroup col')).map((col) => Number((col as HTMLElement).style.width.replace('%', '')));
    expect(cols).toEqual([22, 24, 24, 30]);
    expect(Math.min(...cols)).toBe(cols[0]);
    expect(Math.max(...cols)).toBe(cols[3]);
    expect(cols.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('renders mobile option tabs with Onolys selected, one panel per option and every criterion in each', async () => {
    const doc = await render();
    const mobile = doc.querySelector('[data-compare-mobile]')!;
    expect(mobile.hasAttribute('data-tabs')).toBe(true);
    const tabs = Array.from(mobile.querySelectorAll('[role="tab"]'));
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Human coding', 'AI chatbots', 'Onolys']);
    expect(tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual(['false', 'false', 'true']);
    const panels = Array.from(mobile.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
    expect(panels).toHaveLength(3);
    expect(panels.map((panel) => panel.hidden)).toEqual([true, true, false]);
    tabs.forEach((tab, i) => {
      expect(tab.getAttribute('aria-controls')).toBe(panels[i].id);
      expect(panels[i].getAttribute('aria-labelledby')).toBe(tab.id);
      const rendered = Array.from(panels[i].querySelectorAll('[data-row]')).map((row) => [row.children[0].textContent, row.children[1].textContent]);
      expect(rendered).toEqual(expectedRows.map((row) => [row.criterion, row.values[i]]));
    });
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
    expect(doc.querySelector('colgroup')).toBeNull();
    expect(doc.querySelectorAll('[data-compare-mobile] [role="tab"]')).toHaveLength(2);
  });
});
