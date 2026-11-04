/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_CODE: string;
  readonly VITE_ENV: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SSO_BASE_URL: string;
  readonly VITE_FILE_BASE_URL: string;
  readonly VITE_EVENT_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
