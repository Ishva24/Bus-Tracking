import { NextFunction, Request, Response } from 'express';

type AsyncRoute<TRequest extends Request = Request> = (
  req: TRequest,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export function asyncHandler<TRequest extends Request = Request>(handler: AsyncRoute<TRequest>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req as TRequest, res, next)).catch(next);
  };
}
