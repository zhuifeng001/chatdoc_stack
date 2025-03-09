/// <reference types="vite/client" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const vueComponent: DefineComponent<{}, {}, any>
  export default vueComponent
}

interface ImportMetaEnv {
  readonly VITE_KNOWLEDGE_PREFIX_API: string
  readonly VITE_KNOWLEDGE_BASE_API: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  Tiff: any
}

interface Window {
  zhuge: any
  [key: string]: any
}

declare const __KB_API_VAR__ = string
declare const __AI_API_VAR__ = string
