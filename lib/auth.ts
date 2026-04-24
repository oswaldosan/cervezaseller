export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "1234";
}

export function checkAdmin(provided: unknown): boolean {
  if (typeof provided !== "string" || provided.length === 0) return false;
  const expected = getAdminPassword();
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
