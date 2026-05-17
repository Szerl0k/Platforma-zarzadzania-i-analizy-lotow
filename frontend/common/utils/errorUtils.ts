import axios from "axios";

/**
 * Extracts a human-readable error message from an unknown error object,
 * typically thrown by Axios or standard JavaScript Errors.
 *
 * @param err - The error object to extract the message from.
 * @returns A string containing the error message.
 */
export function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? err.message ?? "Wystąpił błąd";
  }
  if (err instanceof Error) return err.message;
  return "Wystąpił nieznany błąd";
}
