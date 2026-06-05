import {
  buildVerificationLink,
  generateVerificationTokenRaw,
  hashVerificationToken,
  resendVerification,
  verifyEmail,
} from "../email-verification.service";
import { AppDataSource } from "../../common/database/data-source";
import { User } from "../entities/User";
import { BadRequestError } from "../../common/errors/http-errors";
import { makeRepo, makeUser } from "./test-utils";

jest.mock("../../common/database/data-source", () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

const mockedGetRepository = AppDataSource.getRepository as jest.Mock;

describe("email-verification helpers", () => {
  it("hashes deterministically and generates random tokens", () => {
    expect(hashVerificationToken("abc")).toBe(hashVerificationToken("abc"));
    expect(generateVerificationTokenRaw()).not.toBe(
      generateVerificationTokenRaw(),
    );
  });

  it("builds a verification link without double slashes", () => {
    expect(buildVerificationLink("http://x/", "tok")).toBe(
      "http://x/verify-email?token=tok",
    );
  });
});

describe("verifyEmail", () => {
  const userRepo = makeRepo();
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetRepository.mockImplementation((e: unknown) =>
      e === User ? userRepo : makeRepo(),
    );
  });

  it("throws on missing token", async () => {
    await expect(verifyEmail(undefined)).rejects.toBeInstanceOf(
      BadRequestError,
    );
  });

  it("throws on invalid/expired token", async () => {
    userRepo.findOne.mockResolvedValue(null);
    await expect(verifyEmail("raw")).rejects.toBeInstanceOf(BadRequestError);
  });

  it("marks the user verified on a valid token", async () => {
    const user = makeUser({
      emailVerified: false,
      verificationToken: hashVerificationToken("raw"),
      verificationTokenExpires: new Date(Date.now() + 60_000),
    });
    userRepo.findOne.mockResolvedValue(user);
    await verifyEmail("raw");
    expect(user.emailVerified).toBe(true);
    expect(user.verificationToken).toBeNull();
    expect(userRepo.save).toHaveBeenCalledWith(user);
  });
});

describe("resendVerification", () => {
  const userRepo = makeRepo();
  const mailer = { sendVerificationEmail: jest.fn() };
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetRepository.mockImplementation((e: unknown) =>
      e === User ? userRepo : makeRepo(),
    );
  });

  it("is a silent no-op for unknown or verified accounts", async () => {
    userRepo.findOne.mockResolvedValue(null);
    await resendVerification("x@y.z", mailer as never, "http://x");
    expect(mailer.sendVerificationEmail).not.toHaveBeenCalled();

    userRepo.findOne.mockResolvedValue(makeUser({ emailVerified: true }));
    await resendVerification("x@y.z", mailer as never, "http://x");
    expect(mailer.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("re-issues a token and sends the e-mail for unverified accounts", async () => {
    userRepo.findOne.mockResolvedValue(makeUser({ emailVerified: false }));
    await resendVerification("x@y.z", mailer as never, "http://x");
    expect(userRepo.save).toHaveBeenCalled();
    expect(mailer.sendVerificationEmail).toHaveBeenCalledTimes(1);
  });
});
