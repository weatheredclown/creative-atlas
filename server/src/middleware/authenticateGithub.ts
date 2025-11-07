import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './authenticate.js';

export const authenticateGithub = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  if (!req.session.github_access_token) {
    return res
      .status(401)
      .json({ error: 'GitHub access token not found in session.' });
  }
  next();
};
