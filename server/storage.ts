import { 
  type Zone, 
  type InsertZone, 
  type Vote, 
  type InsertVote,
  type TemperatureHistory,
  type InsertTemperatureHistory,
  type ActiveConnection,
  type InsertActiveConnection
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Zone operations
  getAllZones(): Promise<Zone[]>;
  getZone(id: string): Promise<Zone | undefined>;
  createZone(zone: InsertZone): Promise<Zone>;
  updateZoneTemperature(id: string, temperature: number): Promise<Zone | undefined>;
  updateZoneVotes(id: string, hotVotes: number, coldVotes: number): Promise<Zone | undefined>;
  updateZoneActiveVoters(id: string, activeVoters: number): Promise<Zone | undefined>;
  
  // Vote operations
  createVote(vote: InsertVote): Promise<Vote>;
  getVotesByZone(zoneId: string): Promise<Vote[]>;
  getRecentVotesByZone(zoneId: string, minutes: number): Promise<Vote[]>;
  
  // Temperature history operations
  addTemperatureHistory(history: InsertTemperatureHistory): Promise<TemperatureHistory>;
  getTemperatureHistory(zoneId: string, hours: number): Promise<TemperatureHistory[]>;
  
  // Active connections operations
  updateConnection(sessionId: string): Promise<ActiveConnection>;
  getActiveConnections(): Promise<ActiveConnection[]>;
  cleanupOldConnections(minutes: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private zones: Map<string, Zone>;
  private votes: Map<string, Vote>;
  private temperatureHistory: Map<string, TemperatureHistory>;
  private activeConnections: Map<string, ActiveConnection>;

  constructor() {
    this.zones = new Map();
    this.votes = new Map();
    this.temperatureHistory = new Map();
    this.activeConnections = new Map();
    this.initializeDefaultZones();
    this.startTemperatureHistoryCapture();
    this.startConnectionCleanup();
  }

  private initializeDefaultZones() {
    const defaultZones = [
      { id: 'standing', name: '1F Standing Area', temperature: 22.3, hotVotes: 0, coldVotes: 0, activeVoters: 0 },
      { id: 'zone-a', name: '1F Zone A', temperature: 21.8, hotVotes: 0, coldVotes: 0, activeVoters: 0 },
      { id: 'zone-b', name: '1F Zone B', temperature: 22.7, hotVotes: 0, coldVotes: 0, activeVoters: 0 },
      { id: 'zone-c', name: '2F Zone C', temperature: 21.5, hotVotes: 0, coldVotes: 0, activeVoters: 0 },
      { id: 'recharge', name: '2F Recharge Zone', temperature: 23.1, hotVotes: 0, coldVotes: 0, activeVoters: 0 }
    ];

    defaultZones.forEach(zone => {
      const fullZone: Zone = {
        ...zone,
        lastUpdated: new Date()
      };
      this.zones.set(zone.id, fullZone);
    });
  }

  private startTemperatureHistoryCapture() {
    // 매 10분마다 현재 온도를 히스토리에 저장
    setInterval(() => {
      this.zones.forEach(zone => {
        this.addTemperatureHistory({
          zoneId: zone.id,
          temperature: zone.temperature
        });
      });
    }, 10 * 60 * 1000); // 10분
  }

  private startConnectionCleanup() {
    // 매 5분마다 오래된 연결 정리
    setInterval(() => {
      this.cleanupOldConnections(5);
    }, 5 * 60 * 1000); // 5분
  }

  async getAllZones(): Promise<Zone[]> {
    return Array.from(this.zones.values());
  }

  async getZone(id: string): Promise<Zone | undefined> {
    return this.zones.get(id);
  }

  async createZone(insertZone: InsertZone): Promise<Zone> {
    const zone: Zone = {
      ...insertZone,
      lastUpdated: new Date()
    };
    this.zones.set(zone.id, zone);
    return zone;
  }

  async updateZoneTemperature(id: string, temperature: number): Promise<Zone | undefined> {
    const zone = this.zones.get(id);
    if (!zone) return undefined;

    const updatedZone: Zone = {
      ...zone,
      temperature,
      lastUpdated: new Date()
    };
    this.zones.set(id, updatedZone);
    return updatedZone;
  }

  async updateZoneVotes(id: string, hotVotes: number, coldVotes: number): Promise<Zone | undefined> {
    const zone = this.zones.get(id);
    if (!zone) return undefined;

    const updatedZone: Zone = {
      ...zone,
      hotVotes,
      coldVotes,
      lastUpdated: new Date()
    };
    this.zones.set(id, updatedZone);
    return updatedZone;
  }

  async updateZoneActiveVoters(id: string, activeVoters: number): Promise<Zone | undefined> {
    const zone = this.zones.get(id);
    if (!zone) return undefined;

    const updatedZone: Zone = {
      ...zone,
      activeVoters,
      lastUpdated: new Date()
    };
    this.zones.set(id, updatedZone);
    return updatedZone;
  }

  async createVote(insertVote: InsertVote): Promise<Vote> {
    const id = randomUUID();
    const vote: Vote = {
      ...insertVote,
      id,
      timestamp: new Date()
    };
    this.votes.set(id, vote);
    return vote;
  }

  async getVotesByZone(zoneId: string): Promise<Vote[]> {
    return Array.from(this.votes.values()).filter(vote => vote.zoneId === zoneId);
  }

  async getRecentVotesByZone(zoneId: string, minutes: number): Promise<Vote[]> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return Array.from(this.votes.values()).filter(
      vote => vote.zoneId === zoneId && vote.timestamp >= cutoff
    );
  }

  async addTemperatureHistory(insertHistory: InsertTemperatureHistory): Promise<TemperatureHistory> {
    const id = randomUUID();
    const history: TemperatureHistory = {
      ...insertHistory,
      id,
      timestamp: new Date()
    };
    this.temperatureHistory.set(id, history);
    return history;
  }

  async getTemperatureHistory(zoneId: string, hours: number): Promise<TemperatureHistory[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return Array.from(this.temperatureHistory.values())
      .filter(history => history.zoneId === zoneId && history.timestamp >= cutoff)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async updateConnection(sessionId: string): Promise<ActiveConnection> {
    const existing = Array.from(this.activeConnections.values())
      .find(conn => conn.sessionId === sessionId);
    
    if (existing) {
      const updated: ActiveConnection = {
        ...existing,
        lastSeen: new Date()
      };
      this.activeConnections.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const connection: ActiveConnection = {
        id,
        sessionId,
        lastSeen: new Date()
      };
      this.activeConnections.set(id, connection);
      return connection;
    }
  }

  async getActiveConnections(): Promise<ActiveConnection[]> {
    return Array.from(this.activeConnections.values());
  }

  async cleanupOldConnections(minutes: number): Promise<void> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const toRemove: string[] = [];
    
    this.activeConnections.forEach((connection, id) => {
      if (connection.lastSeen < cutoff) {
        toRemove.push(id);
      }
    });
    
    toRemove.forEach(id => this.activeConnections.delete(id));
  }

  // Helper method to get recent vote counts for a zone
  async getRecentVoteCounts(zoneId: string, minutes: number = 10): Promise<{ hotVotes: number, coldVotes: number }> {
    const recentVotes = await this.getRecentVotesByZone(zoneId, minutes);
    const hotVotes = recentVotes.filter(vote => vote.voteType === 'hot').length;
    const coldVotes = recentVotes.filter(vote => vote.voteType === 'cold').length;
    return { hotVotes, coldVotes };
  }
}

export const storage = new MemStorage();
