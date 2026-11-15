import type { ImageMetadata } from 'astro';
import tejit from '../assets/team/tejit.jpg';
import gitika from '../assets/team/git.jpg';
import frederique from '../assets/team/fred.jpg';

interface TeamMember {
  name: string;
  pronouns?: string;
  badge?: string;
  bio: string;
  linkedin: string;
  photo: ImageMetadata;
}

export const team: TeamMember[] = [
  {
    name: 'Tejit Pabari',
    bio: 'Engineer. 5+ years building cloud systems at Microsoft; Columbia CS (AI).',
    linkedin: 'https://www.linkedin.com/in/tejitpabari/',
    photo: tejit,
  },
  {
    name: 'Gitika Bose',
    pronouns: 'she/her',
    bio: 'Researcher and data scientist at Bing, working on grounding, hallucination and fact-checking. Columbia CS, cum laude.',
    linkedin: 'https://www.linkedin.com/in/gitikabose/',
    photo: gitika,
  },
  {
    name: 'Frédérique Escudier, Ph.D., Psy.D.',
    badge: 'Neuropsychologist',
    bio: 'Clinical neuropsychologist, 15+ years in cognitive assessment. Former president, Quebec Association of Neuropsychologists.',
    linkedin: 'https://www.linkedin.com/in/escudierfrederique/',
    photo: frederique,
  },
];

export const partnerLine = 'Backed by researchers from Harvard Medical School, Columbia University Vagelos College of Physicians and Surgeons and Massachusetts General Hospital.';
