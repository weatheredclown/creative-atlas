import 'express-serve-static-core';
import type { CollaborationGateway } from '../collaboration/index.js';

declare module 'express-serve-static-core' {
  interface Locals {
    collaborationGateway?: CollaborationGateway<Record<string, unknown>>;
  }
}

export {};
