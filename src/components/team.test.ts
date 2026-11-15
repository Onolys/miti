import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { partnerLine, team } from '../data/team';
import TeamSection from './TeamSection.astro';

const expected = [
  { name: 'Tejit Pabari', lead: 'Engineer at Microsoft', rest: ', 8+ years building cloud systems and AI tooling @PowerBI. Columbia CS.', linkedin: 'https://www.linkedin.com/in/tejitpabari/' },
  { name: 'Gitika Bose', lead: 'AI Researcher and Data Scientist at Bing Search', rest: ', working on grounding, hallucination and fact-checking. Columbia CS.', linkedin: 'https://www.linkedin.com/in/gitikabose/' },
  { name: 'Frédérique Escudier, Ph.D., Psy.D.', lead: 'Clinical neuropsychologist', rest: ', 15+ years experience in cognitive assessment. Former president, Quebec Association of Neuropsychologists.', linkedin: 'https://www.linkedin.com/in/escudierfrederique/' },
];

async function render() {
  const container = await AstroContainer.create();
  return new JSDOM(await container.renderToString(TeamSection)).window.document;
}

describe('team data', () => {
  it('has lead + rest bios and no pronouns or badge fields', () => {
    expect(team.map(({ name, lead, rest, linkedin }) => ({ name, lead, rest, linkedin }))).toEqual(expected);
    for (const member of team) {
      expect(Object.keys(member).sort()).toEqual(['lead', 'linkedin', 'name', 'photo', 'rest']);
    }
  });

  it('structures the partner line with the three institutions bold', () => {
    expect(partnerLine.map((part) => part.text).join('')).toBe('Backed by researchers from Harvard Medical School, Columbia Medical Center and Massachusetts General Hospital.');
    expect(partnerLine.filter((part) => part.bold).map((part) => part.text)).toEqual(['Harvard Medical School', 'Columbia Medical Center', 'Massachusetts General Hospital']);
  });
});

describe('team section', () => {
  it('renders three cards with bold leads, photos and LinkedIn links, without pronouns or badges', async () => {
    const doc = await render();
    const cards = Array.from(doc.querySelectorAll('#team article'));
    expect(cards).toHaveLength(3);
    expected.forEach((member, index) => {
      const card = cards[index];
      expect(card.querySelector('h3')?.textContent).toBe(member.name);
      const bio = card.querySelector('.bio')!;
      expect(bio.textContent).toBe(member.lead + member.rest);
      expect(bio.querySelector('strong')?.textContent).toBe(member.lead);
      expect(bio.querySelectorAll('strong')).toHaveLength(1);
      const image = card.querySelector('img')!;
      expect(image.alt).toBe(`Photo of ${member.name}`);
      const link = card.querySelector('a')!;
      expect(link.href).toBe(member.linkedin);
      expect(link.getAttribute('aria-label')).toBe(`${member.name} on LinkedIn`);
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener noreferrer');
      expect(link.querySelector('svg')).not.toBeNull();
    });
    expect(doc.querySelector('#team')?.textContent).not.toMatch(/she\/her|\(he|Neuropsychologist\b(?!,)/);
    expect(doc.querySelector('#team .badge')).toBeNull();
    expect(doc.querySelector('#team .pronouns')).toBeNull();
  });

  it('renders the partner line centered with bold institution names, one CTA and no Questions link', async () => {
    const doc = await render();
    const partners = doc.querySelector('#team .partners')!;
    expect(partners.textContent).toBe('Backed by researchers from Harvard Medical School, Columbia Medical Center and Massachusetts General Hospital.');
    expect(Array.from(partners.querySelectorAll('strong')).map((el) => el.textContent)).toEqual(['Harvard Medical School', 'Columbia Medical Center', 'Massachusetts General Hospital']);
    expect(doc.querySelectorAll('[data-open-popup]')).toHaveLength(1);
    expect(doc.querySelector('[data-open-popup]')?.getAttribute('data-trigger')).toBe('team');
    expect(doc.querySelector('#team a[href^="mailto:"]')).toBeNull();
    expect(doc.querySelector('#team')?.textContent).not.toContain('Questions?');
  });
});
