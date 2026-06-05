import { resolveClientError } from "@airp/http-client";

export function getErrorMessage(error: unknown): string {
  return resolveClientError(error).message;
}
