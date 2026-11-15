import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { columns, rows, highlight, shortColumns, widths } from '../data/compare.enterprise';
import CompareTable from './CompareTable.astro';

const expectedRows = [
  { criterion: 'Checks every score', values: ['Yes', 'Yes'] },
  { criterion: 'Points to the lines', values: ['Sometimes', 'Yes, linked lines'] },
  { criterion: 'Turnaround', values: ['Days', 'Minutes'] },
  { criterion: 'Scales with volume', values: ['Needs more coders', 'Yes'] },
];

describe('enterprise comparison', () => {
  it('preserves the approved columns, four rows, and Onolys highlight', () => {
    expect(columns).toEqual(['Second human coder', 'Onolys evidence check']);
    expect(rows).toEqual(expectedRows);
    expect(highlight).toBe(1);
    expect(shortColumns).toEqual(['Second coder', 'Onolys']);
    expect(widths).toEqual([30, 30, 40]);
  });

  it('renders exact enterprise data through the shared semantic comparison table', async () => {
    const container = await AstroContainer.create();
    const doc = new JSDOM(await container.renderToString(CompareTable, {
      props: { columns, rows, highlight, shortColumns, widths },
    })).window.document;
    const headers = Array.from(doc.querySelectorAll('thead th'));
    expect(headers.map((header) => header.textContent?.trim())).toEqual(['Criterion', ...columns]);
    for (const header of headers) expect(header.getAttribute('scope')).toBe('col');
    const renderedRows = Array.from(doc.querySelectorAll('tbody tr'));
    expect(renderedRows).toHaveLength(4);
    renderedRows.forEach((row, index) => {
      expect(row.querySelector('th')?.getAttribute('scope')).toBe('row');
      expect(row.querySelector('th h3')?.textContent).toBe(expectedRows[index].criterion);
      const cells = Array.from(row.querySelectorAll('td'));
      expect(cells).toHaveLength(2);
      expect(cells.map((cell) => cell.querySelector('[data-value]')?.textContent)).toEqual(expectedRows[index].values);
      expect(cells[0].hasAttribute('data-highlighted')).toBe(false);
      expect(cells[0].querySelector('strong')).toBeNull();
      expect(cells[1].getAttribute('data-highlighted')).toBe('true');
      expect(cells[1].querySelector('strong')?.textContent).toBe(expectedRows[index].values[1]);
    });
    const mobile = doc.querySelector('[data-compare-mobile]')!;
    expect(Array.from(mobile.querySelectorAll('[role="tab"]')).map((tab) => tab.textContent)).toEqual(['Second coder', 'Onolys']);
    expect(mobile.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('Onolys');
    expect(Array.from(mobile.querySelectorAll('[role="tabpanel"]:not([hidden]) [data-row]')).map((row) => row.children[1].textContent)).toEqual(expectedRows.map((row) => row.values[1]));
    expect(doc.querySelectorAll('thead [data-highlighted="true"]')).toHaveLength(1);
    expect(doc.querySelector('thead [data-highlighted="true"]')?.textContent).toBe('Onolys evidence check');
  });
});
