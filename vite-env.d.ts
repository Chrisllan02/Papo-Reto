// Reference to vite/client removed to avoid type resolution errors

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  readonly VITE_GITHUB_CACHE_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: string | undefined;
  }
}