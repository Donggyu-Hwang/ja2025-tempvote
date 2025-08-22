import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const zones = pgTable("zones", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  temperature: real("temperature").notNull().default(22.0),
  hotVotes: integer("hot_votes").notNull().default(0),
  coldVotes: integer("cold_votes").notNull().default(0),
  activeVoters: integer("active_voters").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().default(sql`now()`),
});

export const temperatureHistory = pgTable("temperature_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  zoneId: varchar("zone_id").notNull().references(() => zones.id),
  temperature: real("temperature").notNull(),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
});

export const activeConnections = pgTable("active_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  lastSeen: timestamp("last_seen").notNull().default(sql`now()`),
});

export const votes = pgTable("votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  zoneId: varchar("zone_id").notNull().references(() => zones.id),
  voteType: varchar("vote_type").notNull(), // 'hot' or 'cold'
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
});

export const insertZoneSchema = createInsertSchema(zones).omit({
  lastUpdated: true,
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  timestamp: true,
});

export const insertTemperatureHistorySchema = createInsertSchema(temperatureHistory).omit({
  id: true,
  timestamp: true,
});

export const insertActiveConnectionSchema = createInsertSchema(activeConnections).omit({
  id: true,
  lastSeen: true,
});

export const voteRequestSchema = z.object({
  zoneId: z.string(),
  voteType: z.enum(['hot', 'cold']),
});

export type Zone = typeof zones.$inferSelect;
export type InsertZone = z.infer<typeof insertZoneSchema>;
export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type VoteRequest = z.infer<typeof voteRequestSchema>;
export type TemperatureHistory = typeof temperatureHistory.$inferSelect;
export type InsertTemperatureHistory = z.infer<typeof insertTemperatureHistorySchema>;
export type ActiveConnection = typeof activeConnections.$inferSelect;
export type InsertActiveConnection = z.infer<typeof insertActiveConnectionSchema>;
