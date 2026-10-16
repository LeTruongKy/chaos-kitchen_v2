/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL: string;
  readonly VITE_BUILD_HASH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
