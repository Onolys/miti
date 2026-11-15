import type { Page } from '../lib/context';

export const SIGNUP_FIELD_KEYS = [
  'role', 'how_often', 'feedback_today', 'pay', 'anything_else',
  'organization', 'org_type', 'team_size', 'samples_per_month',
] as const;

export type SignupFieldKey = typeof SIGNUP_FIELD_KEYS[number];

export type SignupField = {
  key: SignupFieldKey;
  label: string;
} & (
  | { type: 'select'; options: readonly string[] }
  | { type: 'text' | 'textarea'; options?: never }
);

const feedback: SignupField = {
  key: 'feedback_today', label: 'How do you get feedback today', type: 'select',
  options: ['Supervisor or trainer', 'Paid MITI coding', 'AI practice tool', 'None', 'Other'],
};
const payOptions = ['Under $5', '$5 to 10', '$10 to 20', '$20+', 'Not sure'];
const anythingElse: SignupField = {
  key: 'anything_else', label: 'Anything else', type: 'textarea',
};

export const signupFields: Record<Page, readonly SignupField[]> = {
  learner: [
    {
      key: 'role', label: 'Role', type: 'select',
      options: ['Student learning MI', 'Practitioner learning MI', 'Preparing a work sample for coding', 'MI trainer or supervisor', 'Coding service', 'Researcher', 'Other'],
    },
    {
      key: 'how_often', label: 'How often would you want a session evaluated', type: 'select',
      options: ['Once', 'A few times', 'Monthly', 'Weekly', 'For a whole course or team'],
    },
    feedback,
    { key: 'pay', label: 'What would you pay per evaluation', type: 'select', options: payOptions },
    anythingElse,
  ],
  enterprise: [
    {
      key: 'role', label: 'Role', type: 'select',
      options: ['Coding service lead', 'Coder', 'Trainer/supervisor', 'Program director', 'Researcher', 'Other'],
    },
    { key: 'organization', label: 'Organization', type: 'text' },
    {
      key: 'org_type', label: 'Organization type', type: 'select',
      options: ['Coding service', 'University or training program', 'Health or treatment org', 'Research', 'Other'],
    },
    {
      key: 'team_size', label: 'Number of coders or learners', type: 'select',
      options: ['1 to 5', '6 to 20', '21 to 100', '100+'],
    },
    {
      key: 'samples_per_month', label: 'Samples per month', type: 'select',
      options: ['Under 10', '10 to 50', '50 to 200', '200+'],
    },
    feedback,
    { key: 'pay', label: 'What would you pay per checked sample', type: 'select', options: payOptions },
    anythingElse,
  ],
};
