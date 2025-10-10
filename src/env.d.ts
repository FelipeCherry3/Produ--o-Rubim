/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACK_URL?: string;
  // se quiser adicionar outras, todas devem começar com VITE_
  readonly VITE_LOGIN_SPRING?: string;
  readonly VITE_SOME_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
