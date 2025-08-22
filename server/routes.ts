import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { voteRequestSchema } from "@shared/schema";
import { z } from "zod";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all zones with current vote data (recent 10 minutes only)
  app.get("/api/zones", async (req, res) => {
    try {
      // Update connection tracking
      const sessionId = req.headers['x-session-id'] as string || randomUUID();
      await storage.updateConnection(sessionId);
      
      const zones = await storage.getAllZones();
      
      // Update each zone with recent vote counts (10 minutes)
      const updatedZones = await Promise.all(zones.map(async (zone) => {
        const recentVotes = await storage.getRecentVoteCounts(zone.id, 10);
        return {
          ...zone,
          hotVotes: recentVotes.hotVotes,
          coldVotes: recentVotes.coldVotes
        };
      }));
      
      res.json(updatedZones);
    } catch (error) {
      console.error("Error fetching zones:", error);
      res.status(500).json({ message: "Failed to fetch zones" });
    }
  });

  // Get specific zone
  app.get("/api/zones/:id", async (req, res) => {
    try {
      const zone = await storage.getZone(req.params.id);
      if (!zone) {
        return res.status(404).json({ message: "Zone not found" });
      }
      res.json(zone);
    } catch (error) {
      console.error("Error fetching zone:", error);
      res.status(500).json({ message: "Failed to fetch zone" });
    }
  });

  // Submit a vote
  app.post("/api/vote", async (req, res) => {
    try {
      const validatedData = voteRequestSchema.parse(req.body);
      
      // Check if zone exists
      const zone = await storage.getZone(validatedData.zoneId);
      if (!zone) {
        return res.status(404).json({ message: "Zone not found" });
      }

      // Update connection tracking
      const sessionId = req.headers['x-session-id'] as string || randomUUID();
      await storage.updateConnection(sessionId);

      // Create the vote
      await storage.createVote(validatedData);

      // Get recent vote counts (10 minutes)
      const recentVotes = await storage.getRecentVoteCounts(validatedData.zoneId, 10);

      // Calculate new temperature based on recent vote difference
      const voteDifference = recentVotes.hotVotes - recentVotes.coldVotes;
      const baseTemperature = 22.0;
      const temperatureAdjustment = voteDifference * 0.1;
      const newTemperature = Math.round((baseTemperature + temperatureAdjustment) * 10) / 10;

      await storage.updateZoneTemperature(validatedData.zoneId, newTemperature);
      
      // Add temperature to history
      await storage.addTemperatureHistory({
        zoneId: validatedData.zoneId,
        temperature: newTemperature
      });

      // Return updated zone data with recent vote counts
      const updatedZone = await storage.getZone(validatedData.zoneId);
      res.json({
        ...updatedZone,
        hotVotes: recentVotes.hotVotes,
        coldVotes: recentVotes.coldVotes
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid vote data", errors: error.errors });
      }
      console.error("Error submitting vote:", error);
      res.status(500).json({ message: "Failed to submit vote" });
    }
  });

  // Get voting statistics (recent 10 minutes only)
  app.get("/api/stats", async (req, res) => {
    try {
      const zones = await storage.getAllZones();
      const activeConnections = await storage.getActiveConnections();
      
      // Calculate stats based on recent votes (10 minutes)
      let totalHotVotes = 0;
      let totalColdVotes = 0;
      
      for (const zone of zones) {
        const recentVotes = await storage.getRecentVoteCounts(zone.id, 10);
        totalHotVotes += recentVotes.hotVotes;
        totalColdVotes += recentVotes.coldVotes;
      }
      
      const totalVotes = totalHotVotes + totalColdVotes;
      const averageTemperature = zones.reduce((sum, zone) => sum + zone.temperature, 0) / zones.length;

      res.json({
        totalVotes,
        hotVotes: totalHotVotes,
        coldVotes: totalColdVotes,
        averageTemperature: Math.round(averageTemperature * 10) / 10,
        connectedUsers: activeConnections.length,
        zones: zones.length
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Get vote history for a zone (10-minute intervals)
  app.get("/api/zones/:id/vote-history", async (req, res) => {
    try {
      const zoneId = req.params.id;
      const hours = parseInt(req.query.hours as string) || 6; // Default 6 hours for better granularity
      
      // Get votes from the last N hours
      const allVotes = await storage.getRecentVotesByZone(zoneId, hours * 60);
      
      // Group votes by 10-minute intervals
      const intervalData = new Map<string, { hot: number, cold: number }>();
      
      allVotes.forEach(vote => {
        const voteDate = new Date(vote.timestamp);
        // Round down to nearest 10-minute mark
        const minutes = Math.floor(voteDate.getMinutes() / 10) * 10;
        voteDate.setMinutes(minutes, 0, 0); // Set seconds and milliseconds to 0
        const intervalKey = voteDate.toISOString().substring(0, 16); // YYYY-MM-DDTHH:MM
        
        if (!intervalData.has(intervalKey)) {
          intervalData.set(intervalKey, { hot: 0, cold: 0 });
        }
        
        const data = intervalData.get(intervalKey)!;
        if (vote.voteType === 'hot') {
          data.hot++;
        } else {
          data.cold++;
        }
      });
      
      // Convert to array and fill missing intervals with 0
      const result = [];
      const now = new Date();
      const totalIntervals = hours * 6; // 6 intervals per hour (every 10 minutes)
      
      for (let i = totalIntervals - 1; i >= 0; i--) {
        const intervalDate = new Date(now.getTime() - i * 10 * 60 * 1000);
        // Round down to nearest 10-minute mark
        const minutes = Math.floor(intervalDate.getMinutes() / 10) * 10;
        intervalDate.setMinutes(minutes, 0, 0);
        
        const intervalKey = intervalDate.toISOString().substring(0, 16);
        const data = intervalData.get(intervalKey) || { hot: 0, cold: 0 };
        
        result.push({
          timestamp: intervalDate.toISOString(),
          hotVotes: data.hot,
          coldVotes: data.cold
        });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching vote history:", error);
      res.status(500).json({ message: "Failed to fetch vote history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
