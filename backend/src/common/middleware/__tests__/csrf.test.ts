import { NextFunction, Request, Response } from "express";
import { doubleCsrfProtection, generateCsrfToken } from "../csrf";

function makeRequest(overrides: Partial<Request> = {}): Request {
  return {
    cookies: {},
    headers: {},
    method: "GET",
    ip: "127.0.0.1",
    ...overrides,
  } as Request;
}

function makeResponse(): Response {
  const response = {} as Response;
  response.cookie = jest.fn().mockReturnValue(response);
  return response;
}

describe("csrf middleware", () => {
  beforeEach(() => {
    process.env.CSRF_SECRET = "test-csrf-secret";
  });

  it("validates anonymous tokens even if proxy request ip changes", () => {
    const tokenRequest = makeRequest({ ip: "10.0.0.1" });
    const tokenResponse = makeResponse();
    const csrfToken = generateCsrfToken(tokenRequest, tokenResponse);

    const req = makeRequest({
      method: "POST",
      ip: "10.0.0.2",
      cookies: { "x-csrf-token": csrfToken },
      headers: { "x-csrf-token": csrfToken },
    });
    const next: NextFunction = jest.fn();

    doubleCsrfProtection(req, makeResponse(), next);

    expect(next).toHaveBeenCalledWith();
  });
});
