import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../../database/data-source";
import { RolePermission } from "../../../users/entities/RolePermission";
import { authenticate, authorize } from "../auth";

jest.mock("../../database/data-source", () => ({
  AppDataSource: { getRepository: jest.fn() },
}));
jest.mock("jsonwebtoken");

const mockedGetRepository = AppDataSource.getRepository as jest.Mock;
const mockedVerify = jwt.verify as jest.MockedFunction<typeof jwt.verify>;

function makeRequest(overrides: Partial<Request> = {}): Request {
  return {
    cookies: {},
    headers: {},
    ...overrides,
  } as Request;
}

function makeResponse(): Response {
  const response = {} as Response;
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
}

describe("auth middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "secret";
  });

  it("authenticates from cookie", () => {
    const req = makeRequest({ cookies: { access_token: "token" } });
    const res = makeResponse();
    const next: NextFunction = jest.fn();
    mockedVerify.mockReturnValue({ userId: "u1", roleId: 1 } as never);

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.userId).toBe("u1");
  });

  it("returns 401 without token", () => {
    const req = makeRequest();
    const res = makeResponse();
    const next: NextFunction = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 401 for invalid token", () => {
    const req = makeRequest({ cookies: { access_token: "token" } });
    const res = makeResponse();
    const next: NextFunction = jest.fn();
    mockedVerify.mockImplementation(() => {
      throw new Error("bad");
    });
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("authorizes required permission", async () => {
    const repo = { find: jest.fn().mockResolvedValue([{ permission: { name: "users:write" } }]) };
    mockedGetRepository.mockImplementation((entity: unknown) => {
      if (entity === RolePermission) return repo;
      return { find: jest.fn() };
    });
    const req = makeRequest({ roleId: 1 });
    const res = makeResponse();
    const next: NextFunction = jest.fn();

    await authorize("users:write")(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("blocks missing permission", async () => {
    const repo = { find: jest.fn().mockResolvedValue([{ permission: { name: "users:read" } }]) };
    mockedGetRepository.mockImplementation((entity: unknown) => {
      if (entity === RolePermission) return repo;
      return { find: jest.fn() };
    });
    const req = makeRequest({ roleId: 1 });
    const res = makeResponse();
    const next: NextFunction = jest.fn();

    await authorize("users:write")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
