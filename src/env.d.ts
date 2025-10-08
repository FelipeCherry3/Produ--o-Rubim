/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BACK_URL?: string;
  readonly LOGIN_SPRING?: string;
  readonly SPRING_PASSWORD?: string; // NOTA: Não coloque segredos sensíveis no frontend em produção.
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
