/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SIGNUP_URL?: string;
  readonly PUBLIC_GA_ID?: string;
  readonly PUBLIC_SIGNUP_PLAN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
