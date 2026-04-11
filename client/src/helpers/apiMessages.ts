export type ApiMessagePayload = {
  message?: string;
  error?: string;
  errors?: unknown;
};

export function getFirstValidationError(errors: unknown): string | null {
  if (!errors || typeof errors !== "object") {
    return null;
  }

  for (const value of Object.values(errors as Record<string, unknown>)) {
    if (Array.isArray(value) && typeof value[0] === "string") {
      return value[0];
    }

    if (typeof value === "string") {
      return value;
    }
  }

  return null;
}

export function getApiMessage(
  data: ApiMessagePayload | null | undefined,
  fallback: string
) {
  const directError = typeof data?.error === "string" ? data.error.trim() : "";
  const message = typeof data?.message === "string" ? data.message.trim() : "";
  const firstValidationError = getFirstValidationError(data?.errors);

  if (firstValidationError) {
    return firstValidationError;
  }

  if (directError) {
    return directError;
  }

  if (message && message.toLowerCase() !== "validation failed" && message.toLowerCase() !== "validation failed.") {
    return message;
  }

  return message || fallback;
}
