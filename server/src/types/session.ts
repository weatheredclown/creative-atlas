import 'express-session';

declare module 'express-session' {
  interface SessionData {
    github_oauth_state?: string;
    github_access_token?: string;
  }
}

export {};
