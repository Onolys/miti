import { describe, expect, it } from 'vitest';
import { signupFields } from '../../../data/signup-fields';
import { createAppsScriptHarness } from '../../../../apps-script/__tests__/harness.js';

describe('signupFields', () => {
  it('orders learner fields and uses the approved learner choices', () => {
    expect(signupFields.learner).toEqual([
      { key: 'role', label: 'Role', type: 'select', options: ['Student learning MI', 'Practitioner learning MI', 'Preparing a work sample for coding', 'MI trainer or supervisor', 'Coding service', 'Researcher', 'Other'] },
      { key: 'how_often', label: 'How often would you want a session evaluated', type: 'select', options: ['Once', 'A few times', 'Monthly', 'Weekly', 'For a whole course or team'] },
      { key: 'feedback_today', label: 'How do you get feedback today', type: 'select', options: ['Supervisor or trainer', 'Paid MITI coding', 'AI practice tool', 'None', 'Other'] },
      { key: 'pay', label: 'What would you pay per evaluation', type: 'select', options: ['Under $5', '$5 to 10', '$10 to 20', '$20+', 'Not sure'] },
      { key: 'anything_else', label: 'Anything else', type: 'textarea' },
    ]);
  });

  it('orders enterprise fields, replaces role/pay and leaves out how_often', () => {
    expect(signupFields.enterprise).toEqual([
      { key: 'role', label: 'Role', type: 'select', options: ['Coding service lead', 'Coder', 'Trainer/supervisor', 'Program director', 'Researcher', 'Other'] },
      { key: 'organization', label: 'Organization', type: 'text' },
      { key: 'org_type', label: 'Organization type', type: 'select', options: ['Coding service', 'University or training program', 'Health or treatment org', 'Research', 'Other'] },
      { key: 'team_size', label: 'Number of coders or learners', type: 'select', options: ['1 to 5', '6 to 20', '21 to 100', '100+'] },
      { key: 'samples_per_month', label: 'Samples per month', type: 'select', options: ['Under 10', '10 to 50', '50 to 200', '200+'] },
      { key: 'feedback_today', label: 'How do you get feedback today', type: 'select', options: ['Supervisor or trainer', 'Paid MITI coding', 'AI practice tool', 'None', 'Other'] },
      { key: 'pay', label: 'What would you pay per checked sample', type: 'select', options: ['Under $5', '$5 to 10', '$10 to 20', '$20+', 'Not sure'] },
      { key: 'anything_else', label: 'Anything else', type: 'textarea' },
    ]);
    expect(signupFields.enterprise.some(({ key }) => key === 'how_often')).toBe(false);
  });

  it.each(['learner', 'enterprise'] as const)('sends only fields accepted by the backend for %s', (page) => {
    const fields = Object.fromEntries(signupFields[page].map(({ key }) => [key, `answer:${key}`]));
    const result = createAppsScriptHarness().context.parseAndValidate(JSON.stringify({
      step: 2, email: 'a@b.co', page, ...fields,
    }));
    expect(result.ok).toBe(true);
    for (const [key, value] of Object.entries(fields)) expect(result.record[key]).toBe(value);
  });
});
