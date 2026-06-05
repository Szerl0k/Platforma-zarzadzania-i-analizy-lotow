import { assertStrongPassword } from "../password-policy";
import { BadRequestError } from "../../common/errors/http-errors";

describe("assertStrongPassword", () => {
  it("accepts a strong password and returns it", () => {
    expect(assertStrongPassword("Secret123!")).toBe("Secret123!");
  });

  it.each([
    ["empty / non-string", ""],
    ["too short", "Aa1!"],
    ["no lowercase", "SECRET123!"],
    ["no uppercase", "secret123!"],
    ["no digit", "Secret!!!"],
    ["no special char", "Secret1234"],
  ])("rejects %s", (_label, password) => {
    expect(() => assertStrongPassword(password)).toThrow(BadRequestError);
  });

  it("rejects non-string input", () => {
    expect(() => assertStrongPassword(undefined as unknown)).toThrow(
      BadRequestError,
    );
  });
});
