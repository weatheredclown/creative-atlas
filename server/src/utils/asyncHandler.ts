import type { NextFunction, Request, Response } from 'express';

// Utility to wrap async route handlers and forward rejections to Express error middleware.
export const asyncHandler = <
  Req extends Request = Request,
  Res extends Response = Response,
  Next extends NextFunction = NextFunction,
>(
  handler: (req: Req, res: Res, next: Next) => Promise<unknown> | unknown,
) => {
  return (req: Req, res: Res, next: Next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

export default asyncHandler;
