/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_OPENUTAU_API_BASE_URL?: string;
    readonly VITE_OPENUTAU_API_KEY?: string;
    readonly VITE_OPENUTAU_API_KEY_HEADER?: string;
  }
}

export {};
