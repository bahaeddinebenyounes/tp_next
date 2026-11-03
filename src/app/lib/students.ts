// Champs renvoyés au client : jamais password
export const publicStudentSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

export function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function isUniqueError(e: unknown): boolean {
  return (e as { code?: string })?.code === "P2002";
}