import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { expect, it } from 'vitest';
import TeamSection from './TeamSection.astro';

it('renders all three team members with the approved bios and accessible photo/link details', async () => {
  const container = await AstroContainer.create();
  const doc = new JSDOM(await container.renderToString(TeamSection)).window.document;
  const cards = Array.from(doc.querySelectorAll('#team article'));
  const expected = [
    {
      name: 'Tejit Pabari',
      bio: 'Engineer. 5+ years building cloud systems at Microsoft; Columbia CS (AI).',
      linkedin: 'https://www.linkedin.com/in/tejitpabari/',
    },
    {
      name: 'Gitika Bose',
      bio: 'Researcher and data scientist at Bing, working on grounding, hallucination and fact-checking. Columbia CS, cum laude.',
      linkedin: 'https://www.linkedin.com/in/gitikabose/',
    },
    {
      name: 'Frédérique Escudier, Ph.D., Psy.D.',
      bio: 'Clinical neuropsychologist, 15+ years in cognitive assessment. Former president, Quebec Association of Neuropsychologists.',
      linkedin: 'https://www.linkedin.com/in/escudierfrederique/',
    },
  ];
  expect(cards).toHaveLength(3);
  expected.forEach((member, index) => {
    const card = cards[index];
    expect(card.querySelector('h3')?.textContent).toBe(member.name);
    expect(card.textContent).toContain(member.bio);
    const image = card.querySelector('img')!;
    expect(image.alt).toBe(`Photo of ${member.name}`);
    expect(image.width).toBe(320);
    expect(image.height).toBe(320);
    const link = card.querySelector('a')!;
    expect(link.href).toBe(member.linkedin);
    expect(link.getAttribute('aria-label')).toBe(`${member.name} on LinkedIn`);
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    expect(link.querySelector('svg')).not.toBeNull();
  });
  expect(cards[1].textContent).toContain('(she/her)');
  expect(cards[2].querySelector('.badge')?.textContent).toBe('Neuropsychologist');
  expect(doc.querySelector('#team')?.textContent).toContain(
    'Backed by researchers from Harvard Medical School, Columbia University Vagelos College of Physicians and Surgeons and Massachusetts General Hospital.',
  );
  expect(doc.querySelectorAll('[data-open-popup]')).toHaveLength(1);
  expect(doc.querySelector('[data-open-popup]')?.getAttribute('data-trigger')).toBe('team');
  const questions = doc.querySelector('a[href^="mailto:"]')!;
  expect(questions.textContent).toBe('Questions?');
  expect(questions.getAttribute('href')).toBe('mailto:tejitpabari99@gmail.com');
});
