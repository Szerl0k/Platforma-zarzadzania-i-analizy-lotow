import nodemailer from "nodemailer";
import {
  createSmtpMailer,
  getMailer,
  resetMailerCacheForTests,
} from "../mailer";
import { InternalError } from "../../common/errors/http-errors";

jest.mock("nodemailer", () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(),
  },
}));

const mockedCreateTransport = nodemailer.createTransport as jest.Mock;

describe("mailer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMailerCacheForTests();
  });

  it("creates smtp transporter and sends reset email", async () => {
    const sendMail = jest.fn().mockResolvedValue(undefined);
    mockedCreateTransport.mockReturnValue({ sendMail });
    const mailer = createSmtpMailer({
      host: "smtp.local",
      port: 1025,
      secure: false,
      user: "user",
      pass: "pass",
      from: "noreply@example.com",
      appBaseUrl: "http://localhost:3000",
    });

    await mailer.sendPasswordReset("john@example.com", "http://example/reset");

    expect(mockedCreateTransport).toHaveBeenCalledWith({
      host: "smtp.local",
      port: 1025,
      secure: false,
      auth: { user: "user", pass: "pass" },
    });
    expect(sendMail).toHaveBeenCalled();
  });

  it("sends flight notification email with Polish subject and link", async () => {
    const sendMail = jest.fn().mockResolvedValue(undefined);
    mockedCreateTransport.mockReturnValue({ sendMail });
    const mailer = createSmtpMailer({
      host: "smtp.local",
      port: 1025,
      secure: false,
      user: "user",
      pass: "pass",
      from: "noreply@example.com",
      appBaseUrl: "http://localhost:3000",
    });

    await mailer.sendFlightNotification("john@example.com", {
      ident: "LOT123",
      changeKind: "delay",
      oldValue: "0 min",
      newValue: "25 min",
      flightLink: "http://localhost:3000/telemetry?flightId=abc",
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const args = sendMail.mock.calls[0][0];
    expect(args.to).toBe("john@example.com");
    expect(args.subject).toContain("LOT123");
    expect(args.subject).toContain("Opóźnienie");
    expect(args.text).toContain("25 min");
    expect(args.html).toContain("http://localhost:3000/telemetry?flightId=abc");
  });

  it("escapes HTML in flight notification payload", async () => {
    const sendMail = jest.fn().mockResolvedValue(undefined);
    mockedCreateTransport.mockReturnValue({ sendMail });
    const mailer = createSmtpMailer({
      host: "smtp.local",
      port: 1025,
      secure: false,
      user: "user",
      pass: "pass",
      from: "noreply@example.com",
      appBaseUrl: "http://localhost:3000",
    });

    await mailer.sendFlightNotification("john@example.com", {
      ident: "<script>",
      changeKind: "gate_change",
      oldValue: "<a>",
      newValue: "B5",
      flightLink: "http://localhost/x",
    });

    const args = sendMail.mock.calls[0][0];
    expect(args.html).not.toContain("<script>");
    expect(args.html).toContain("&lt;script&gt;");
  });

  it("throws when smtp config missing", () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.MAIL_FROM;
    delete process.env.APP_BASE_URL;

    expect(() => getMailer()).toThrow(InternalError);
  });
});
