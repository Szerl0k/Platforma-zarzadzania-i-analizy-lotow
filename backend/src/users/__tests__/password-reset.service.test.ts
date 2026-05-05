import bcrypt from "bcrypt";
import crypto from "crypto";
import { AppDataSource } from "../../common/database/data-source";
import { User } from "../entities/User";
import { RefreshToken } from "../entities/RefreshToken";
import {
  requestPasswordReset,
  resetPassword,
} from "../password-reset.service";
import { makeMailer, makeRepo, makeUser } from "./test-utils";
import { BadRequestError } from "../../common/errors/http-errors";

jest.mock("../../common/database/data-source", () => ({
  AppDataSource: { getRepository: jest.fn() },
}));
jest.mock("bcrypt");

const mockedGetRepository = AppDataSource.getRepository as jest.Mock;
const mockedHash = bcrypt.hash as jest.Mock;

describe("password-reset.service", () => {
  const userRepo = makeRepo();
  const refreshRepo = makeRepo();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetRepository.mockImplementation((entity: unknown) => {
      if (entity === User) return userRepo;
      if (entity === RefreshToken) return refreshRepo;
      return makeRepo();
    });
  });

  it("sends email and stores token hash", async () => {
    const mailer = makeMailer();
    const user = makeUser();
    userRepo.findOne.mockResolvedValue(user);
    const spy = jest.spyOn(crypto, "randomBytes");
    spy.mockReturnValue(Buffer.from("a".repeat(32)) as never);

    await requestPasswordReset("john@example.com", mailer, "http://localhost:3000");

    expect(userRepo.save).toHaveBeenCalledWith(user);
    expect(mailer.sendPasswordReset).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("does not send email for unknown account", async () => {
    const mailer = makeMailer();
    userRepo.findOne.mockResolvedValue(null);
    await requestPasswordReset("x@example.com", mailer, "http://localhost:3000");
    expect(mailer.sendPasswordReset).not.toHaveBeenCalled();
  });

  it("rejects invalid reset token", async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(
      resetPassword({ token: "abc", password: "secret123" }),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("resets password and invalidates refresh tokens", async () => {
    const user = makeUser({
      passwordResetToken: "token-hash",
      passwordResetExpires: new Date(Date.now() + 60_000),
    });
    userRepo.findOne.mockResolvedValue(user);
    mockedHash.mockResolvedValue("new-password-hash");

    await resetPassword({ token: "raw", password: "secret123" });

    expect(userRepo.save).toHaveBeenCalledWith(user);
    expect(refreshRepo.delete).toHaveBeenCalledWith({ userId: user.id });
  });
});
