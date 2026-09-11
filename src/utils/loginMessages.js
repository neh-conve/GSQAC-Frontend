export const SCHOOL_LOGIN_CLOSED_MESSAGE =
  "The date for assessment submission is over";

const INACTIVE_LOGIN_PATTERNS = [
  "this role is inactive. login not allowed.",
  "role is inactive",
  "login not allowed",
];

export function resolveLoginErrorMessage(role, message) {
  const normalized = String(message || "").trim();
  if (!normalized || role !== "school") return normalized;

  const lower = normalized.toLowerCase();
  if (INACTIVE_LOGIN_PATTERNS.some((pattern) => lower.includes(pattern))) {
    return SCHOOL_LOGIN_CLOSED_MESSAGE;
  }

  return normalized;
}
