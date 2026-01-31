/// <reference types="vite/client" />

declare global {
  interface Window {
    lastFailedJSON: unknown;
  }
}

export {};
