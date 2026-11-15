import type { ImageMetadata } from 'astro';
import tejit from '../assets/team/tejit.jpg';
import gitika from '../assets/team/git.jpg';
import frederique from '../assets/team/fred.jpg';

interface TeamMember {
  name: string;
  /** Bold lead of the bio; rendered as <strong>, never as raw HTML. */
  lead: string;
  /** Remainder of the bio, rendered as plain text after the lead. */
  rest: string;
  linkedin: string;
  photo: ImageMetadata;
}

export const team: TeamMember[] = [
  {
    name: 'Tejit Pabari',
    lead: 'Engineer at Microsoft',
    rest: ', 8+ years building cloud systems and AI tooling @PowerBI. Columbia CS.',
    linkedin: 'https://www.linkedin.com/in/tejitpabari/',
    photo: tejit,
  },
  {
    name: 'Gitika Bose',
    lead: 'AI Researcher and Data Scientist at Bing Search',
    rest: ', working on grounding, hallucination and fact-checking. Columbia CS.',
    linkedin: 'https://www.linkedin.com/in/gitikabose/',
    photo: gitika,
  },
  {
    name: 'Frédérique Escudier, Ph.D., Psy.D.',
    lead: 'Clinical neuropsychologist',
    rest: ', 15+ years experience in cognitive assessment. Former president, Quebec Association of Neuropsychologists.',
    linkedin: 'https://www.linkedin.com/in/escudierfrederique/',
    photo: frederique,
  },
];

export interface TextSegment {
  text: string;
  bold?: boolean;
}

/** Structured so the institution names render bold without raw HTML. */
export const partnerLine: readonly TextSegment[] = [
  { text: 'Backed by researchers from ' },
  { text: 'Harvard Medical School', bold: true },
  { text: ', ' },
  { text: 'Columbia Medical Center', bold: true },
  { text: ' and ' },
  { text: 'Massachusetts General Hospital', bold: true },
  { text: '.' },
];
