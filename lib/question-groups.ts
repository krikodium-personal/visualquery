export const GROUP_COLORS = ["slate", "blue", "green", "amber", "rose", "violet"] as const;
export type GroupColor = (typeof GROUP_COLORS)[number];

export type CanvasGroup = { id: string; name: string; color: GroupColor };

export function parseGroupColor(value: string): GroupColor {
  return (GROUP_COLORS as readonly string[]).includes(value) ? (value as GroupColor) : "slate";
}

/** Next colour in the cycle, so neighbouring groups look different. */
export function nextGroupColor(existing: { color: string }[]): GroupColor {
  return GROUP_COLORS[existing.length % GROUP_COLORS.length];
}
