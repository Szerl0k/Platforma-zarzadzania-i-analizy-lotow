import { Request, Response, NextFunction } from "express";

/**
 * Wraps asynchronous Express route handlers to automatically catch unhandled exceptions
 * and pass them to the global error-handling middleware.
 *
 * @param fn - The asynchronous Express request handler function.
 * @returns An Express middleware function with error handling.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
