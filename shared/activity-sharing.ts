import { z } from "zod";

export const routeCoordinateSchema = z.object({ latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180) }).strict();
export const activityPostSchema = z.object({
  localId: z.string().trim().min(1).max(160), activity: z.enum(["Run", "Walk", "Cycle"]),
  title: z.string().trim().min(1).max(80), caption: z.string().trim().max(500).default(""),
  completedAt: z.string().datetime({ offset: true }), seconds: z.number().int().min(1).max(604800),
  distanceMetres: z.number().finite().min(0).max(2000000), elevationGain: z.number().finite().min(0).max(100000),
  route: z.array(routeCoordinateSchema).max(1000).default([]),
}).strict();
export type ActivityPost = z.infer<typeof activityPostSchema>;
export type SharedActivity = ActivityPost & { id: number; ownerId: number; author: string; cheers: number; cheered: boolean };
export type CircleFriend = { id: number; name: string; status: "pending" | "accepted"; incoming: boolean };
export type RecordedActivity = { id: string; activity?: "Run" | "Walk" | "Cycle"; completedAt: string; seconds: number; distanceMetres: number; elevationGain: number; points: Array<{ latitude: number; longitude: number }> };

export function makeActivityPost(activity: RecordedActivity, title: string, caption: string, includeRoute: boolean): ActivityPost {
  const kind = activity.activity ?? "Run";
  const valid = includeRoute ? activity.points.filter(point => routeCoordinateSchema.safeParse({ latitude: point.latitude, longitude: point.longitude }).success) : [];
  // Bound uploads while retaining the first and last valid locations. Never send timestamps or health readings.
  const route = valid.length <= 1000 ? valid : Array.from({ length: 1000 }, (_, index) => valid[Math.round(index * (valid.length - 1) / 999)]);
  return activityPostSchema.parse({ localId: `${kind.toLowerCase()}:${activity.id}`, activity: kind, title, caption, completedAt: activity.completedAt, seconds: Math.round(activity.seconds), distanceMetres: activity.distanceMetres, elevationGain: Math.max(0, activity.elevationGain), route: route.map(({ latitude, longitude }) => ({ latitude, longitude })) });
}
export function activityPace(seconds: number, metres: number) {
  if (metres < 10) return "—";
  const value = Math.round(seconds / (metres / 1000));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
export function activityTime(seconds: number) {
  const total = Math.round(seconds);
  return `${Math.floor(total / 3600) ? `${Math.floor(total / 3600)}h ` : ""}${Math.floor(total % 3600 / 60)}m ${total % 60}s`;
}
export const friendCodeSchema = z.string().trim().toUpperCase().regex(/^VT-[A-F0-9]{12}$/, "Enter a Veltura friend code, such as VT-123456ABCDEF.");
