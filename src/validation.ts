import { ValidationError } from "./errors";

export function requiredText(form: FormData, name: string, maxLength: number): string {
  const value = form.get(name);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${name.replaceAll("_", " ")} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new ValidationError(`${name.replaceAll("_", " ")} is too long.`);
  }
  return trimmed;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validEmail(form: FormData, name = "email"): string {
  const email = normalizeEmail(requiredText(form, name, 254));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError("Enter a valid email address.");
  }
  return email;
}

export function nonnegativeInteger(
  form: FormData,
  name: string,
  options: { nullable?: boolean; max?: number } = {},
): number | null {
  const value = form.get(name);
  if (options.nullable && (value === null || value === "")) return null;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new ValidationError(`${name.replaceAll("_", " ")} must be a whole number.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > (options.max ?? 999)) {
    throw new ValidationError(`${name.replaceAll("_", " ")} is out of range.`);
  }
  return parsed;
}

export function playerPrediction(form: FormData): number {
  const score = nonnegativeInteger(form, "predicted_score", { max: 99 });
  if (score === null || score < 3) {
    throw new ValidationError(
      "Choose a number from 3 to 99. Less than 3 means you're a two-percenter.",
    );
  }
  return score;
}

export function utcTimestamp(form: FormData, name = "starts_at"): number {
  const value = requiredText(form, name, 40);
  const milliseconds = Date.parse(value.endsWith("Z") ? value : `${value}:00Z`);
  if (!Number.isFinite(milliseconds)) {
    throw new ValidationError("Enter a valid UTC start time.");
  }
  return Math.floor(milliseconds / 1000);
}

export function checked(form: FormData, name: string): number {
  return form.get(name) === "on" ? 1 : 0;
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("Origin");
  if (!origin || origin !== new URL(request.url).origin) {
    throw new ValidationError("This form must be submitted from Gig'em.");
  }
  const contentType = request.headers.get("Content-Type") ?? "";
  if (!contentType.startsWith("application/x-www-form-urlencoded") &&
      !contentType.startsWith("multipart/form-data")) {
    throw new ValidationError("Unsupported form content type.");
  }
}
