import nodemailer, { Transporter } from "nodemailer";
import { InternalError } from "../common/errors/http-errors";
import { logger } from "../common/utils/logger";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  appBaseUrl: string;
}

export type FlightChangeKind =
  | "delay"
  | "gate_change"
  | "status_change"
  | "cancellation";

export interface FlightNotificationPayload {
  ident: string;
  changeKind: FlightChangeKind;
  oldValue: string | null;
  newValue: string | null;
  flightLink: string;
}

export interface Mailer {
  sendPasswordReset(to: string, resetLink: string): Promise<void>;
  sendFlightNotification(
    to: string,
    payload: FlightNotificationPayload,
  ): Promise<void>;
}

const CHANGE_LABELS: Record<FlightChangeKind, string> = {
  delay: "Opóźnienie",
  gate_change: "Zmiana bramki",
  status_change: "Zmiana statusu",
  cancellation: "Odwołanie lotu",
};

function buildFlightSubject(p: FlightNotificationPayload): string {
  return `PZAL · Lot ${p.ident} — ${CHANGE_LABELS[p.changeKind]}`;
}

function buildFlightTextBody(p: FlightNotificationPayload): string {
  const oldLine = p.oldValue ? `Poprzednio: ${p.oldValue}\n` : "";
  const newLine = p.newValue ? `Aktualnie: ${p.newValue}\n` : "";
  return (
    `Lot ${p.ident} — ${CHANGE_LABELS[p.changeKind]}.\n\n` +
    oldLine +
    newLine +
    `\nSzczegóły: ${p.flightLink}\n\n` +
    "Powiadomienia możesz wyłączyć w ustawieniach aplikacji."
  );
}

function buildFlightHtmlBody(p: FlightNotificationPayload): string {
  const oldLine = p.oldValue
    ? `<p><strong>Poprzednio:</strong> ${escapeHtml(p.oldValue)}</p>`
    : "";
  const newLine = p.newValue
    ? `<p><strong>Aktualnie:</strong> ${escapeHtml(p.newValue)}</p>`
    : "";
  return (
    `<p>Lot <strong>${escapeHtml(p.ident)}</strong> — ${CHANGE_LABELS[p.changeKind]}.</p>` +
    oldLine +
    newLine +
    `<p><a href="${p.flightLink}">Otwórz szczegóły lotu</a></p>` +
    `<p style="color:#888;font-size:12px">Powiadomienia możesz wyłączyć w ustawieniach aplikacji.</p>`
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function createSmtpMailer(cfg: SmtpConfig): Mailer {
  logger.info(
    `Initializing SMTP Mailer: host=${cfg.host}, port=${cfg.port}, secure=${cfg.secure}, from=${cfg.from}`,
  );

  if (cfg.port === 587 && cfg.secure) {
    logger.warn(
      "SMTP_PORT 587 usually requires SMTP_SECURE=false (STARTTLS). Current config uses secure=true which might lead to 'wrong version number' error.",
    );
  }
  if (cfg.port === 465 && !cfg.secure) {
    logger.warn(
      "SMTP_PORT 465 usually requires SMTP_SECURE=true (Implicit TLS). Current config uses secure=false.",
    );
  }

  const transport: Transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  return {
    async sendPasswordReset(to: string, resetLink: string): Promise<void> {
      await transport.sendMail({
        from: cfg.from,
        to,
        subject: "Password reset request",
        text:
          "We received a request to reset your password.\n\n" +
          `Open the following link to set a new password (valid for 1 hour):\n${resetLink}\n\n` +
          "If you did not request this, you can ignore this email.",
        html:
          "<p>We received a request to reset your password.</p>" +
          `<p>Open the following link to set a new password (valid for 1 hour):</p>` +
          `<p><a href="${resetLink}">${resetLink}</a></p>` +
          "<p>If you did not request this, you can ignore this email.</p>",
      });
    },

    async sendFlightNotification(
      to: string,
      payload: FlightNotificationPayload,
    ): Promise<void> {
      await transport.sendMail({
        from: cfg.from,
        to,
        subject: buildFlightSubject(payload),
        text: buildFlightTextBody(payload),
        html: buildFlightHtmlBody(payload),
      });
    },
  };
}

function readSmtpConfigFromEnv(): SmtpConfig {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.MAIL_FROM;
  const appBaseUrl = process.env.APP_BASE_URL;

  if (!host || !portRaw || !user || !pass || !from || !appBaseUrl) {
    throw new InternalError("SMTP not configured");
  }

  const port = Number.parseInt(portRaw, 10);
  if (Number.isNaN(port)) {
    throw new InternalError("SMTP_PORT must be a number");
  }

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    user,
    pass,
    from,
    appBaseUrl,
  };
}

let cachedMailer: Mailer | null = null;
let cachedAppBaseUrl: string | null = null;

export function getMailer(): Mailer {
  if (cachedMailer) return cachedMailer;
  const cfg = readSmtpConfigFromEnv();
  cachedMailer = createSmtpMailer(cfg);
  cachedAppBaseUrl = cfg.appBaseUrl;
  return cachedMailer;
}

export function getAppBaseUrl(): string {
  if (cachedAppBaseUrl !== null) return cachedAppBaseUrl;
  const cfg = readSmtpConfigFromEnv();
  cachedAppBaseUrl = cfg.appBaseUrl;
  return cachedAppBaseUrl;
}

export function resetMailerCacheForTests(): void {
  cachedMailer = null;
  cachedAppBaseUrl = null;
}
