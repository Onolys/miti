// Plain development builds remain usable before the Apps Script deployment exists.
export const SIGNUP_URL = import.meta.env.PUBLIC_SIGNUP_URL ?? '';
export const SIGNUP_PLAN = import.meta.env.PUBLIC_SIGNUP_PLAN === 'B' ? 'B' : 'A';
