import type { Request, Response, NextFunction } from 'express';
import { auth } from '../firebaseAdmin.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
  };
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (req.method === 'OPTIONS') {
      return next();
    }

    const authorization = req.header('Authorization');
    if (!authorization) {
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Invalid Authorization header' });
    }

    const decoded = await auth.verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? undefined,
      displayName: decoded.name ?? undefined,
      photoURL: decoded.picture ?? undefined,
    };
    next();
  } catch (error) {
    console.error('Authentication failed', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};
