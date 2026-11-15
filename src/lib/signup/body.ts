import { SIGNUP_FIELD_KEYS } from '../../data/signup-fields';
import { getPage, getSrc } from '../context';

export type SignupData = {
  email: string;
  fields?: Record<string, string>;
  honeypot?: string;
};

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  return email.length <= 254 && /^[A-Za-z0-9][^\s@]*@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function buildBody(step: 1 | 2, data: SignupData): string {
  const body: Record<string, string | number> = {
    step,
    email: data.email.trim(),
    page: getPage(),
    src: getSrc(),
    honeypot: data.honeypot ?? '',
  };
  for (const key of SIGNUP_FIELD_KEYS) {
    const value = data.fields?.[key];
    if (typeof value === 'string' && value.trim() !== '') body[key] = value;
  }
  return JSON.stringify(body);
}
