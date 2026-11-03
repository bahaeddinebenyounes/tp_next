export const GROUPS = ["GL3-A", "GL3-B"] as const;
export type Group = (typeof GROUPS)[number];

export function isValidGroup(value: unknown): value is Group {
  return typeof value === "string" && (GROUPS as readonly string[]).includes(value);
}