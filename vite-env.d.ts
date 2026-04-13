// Reference to vite/client removed to avoid type resolution errors

interface ImportMetaEnv {
  readonly VITE_PROFILE_CACHE_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    GOOGLE_API_KEY?: string;
    BLOB_READ_WRITE_TOKEN?: string;
    [key: string]: string | undefined;
  }
}
