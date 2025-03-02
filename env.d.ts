/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/node" />

declare global {
    namespace NodeJS {
      interface ProcessEnv {
        SHOPIFY_API_KEY: string;
        SHOPIFY_API_SECRET: string;
        SHOPIFY_APP_URL: string;
        SCOPES: string;
        DATABASE_URL: string;
      }
    }
  }
  
  export {}
  