import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Thermometer, Users, Plus, Minus, TrendingUp, BarChart3, Zap, Armchair, Sofa, SlidersVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Zone {
  id: string;
  name: string;
  temperature: number;
  hotVotes: number;
  coldVotes: number;
  activeVoters: number;
  lastUpdated: string;
}

interface VoteHistory {
  timestamp: string;
  hotVotes: number;
  coldVotes: number;
}

interface Stats {
  totalVotes: number;
  hotVotes: number;
  coldVotes: number;
  averageTemperature: number;
  connectedUsers: number;
  zones: number;
}

const zoneIcons = {
  'standing': Users,
  'zone-a': Armchair,
  'zone-b': Sofa,
  'zone-c': SlidersVertical,
  'recharge': Zap
};

const zoneColors = {
  'standing': 'from-purple-500 to-purple-600',
  'zone-a': 'from-teal-500 to-teal-600',
  'zone-b': 'from-pink-500 to-pink-600',
  'zone-c': 'from-indigo-500 to-indigo-600',
  'recharge': 'from-amber-500 to-amber-600'
};

// Vote Chart Component
function VoteChart({ zoneId }: { zoneId: string }) {
  const { data: voteHistory, isLoading } = useQuery<VoteHistory[]>({
    queryKey: ['/api/zones', zoneId, 'vote-history'],
    queryFn: async () => {
      const response = await fetch(`/api/zones/${zoneId}/vote-history?hours=6`);
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading || !voteHistory) {
    return (
      <div className="h-32 bg-slate-50 rounded-lg flex items-center justify-center">
        <div className="text-sm text-slate-500">Loading chart...</div>
      </div>
    );
  }

  const chartData = voteHistory.map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }),
    Warmer: item.hotVotes,
    Cooler: item.coldVotes
  }));

  return (
    <div className="h-32">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
            stroke="#64748b"
          />
          <YAxis 
            tick={{ fontSize: 10 }}
            domain={[0, 'dataMax + 2']}
            stroke="#64748b"
          />
          <Tooltip 
            formatter={(value: number, name: string) => [`${value} votes`, name]}
            labelFormatter={(label) => `Time: ${label}`}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="Warmer" 
            stroke="#dc2626" 
            strokeWidth={2}
            dot={{ fill: '#dc2626', strokeWidth: 0, r: 2 }}
            activeDot={{ r: 4, stroke: '#dc2626', strokeWidth: 2, fill: 'white' }}
          />
          <Line 
            type="monotone" 
            dataKey="Cooler" 
            stroke="#2563eb" 
            strokeWidth={2}
            dot={{ fill: '#2563eb', strokeWidth: 0, r: 2 }}
            activeDot={{ r: 4, stroke: '#2563eb', strokeWidth: 2, fill: 'white' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Home() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sessionId] = useState(() => {
    // Generate session ID for connection tracking
    return 'session_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  });

  // Fetch zones data with session tracking
  const { data: zones, isLoading: zonesLoading } = useQuery<Zone[]>({
    queryKey: ['/api/zones'],
    queryFn: async () => {
      const response = await fetch('/api/zones', {
        headers: {
          'x-session-id': sessionId
        }
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    },
    refetchInterval: 3000, // Poll every 3 seconds for real-time updates
  });

  // Fetch stats data
  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ['/api/stats'],
    refetchInterval: 3000,
  });

  // Vote mutation with session tracking
  const voteMutation = useMutation({
    mutationFn: async ({ zoneId, voteType }: { zoneId: string; voteType: 'hot' | 'cold' }) => {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId
        },
        body: JSON.stringify({ zoneId, voteType })
      });
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/zones'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Vote Submitted!",
        description: "Your vote has been successfully recorded.",
      });
    },
    onError: () => {
      toast({
        title: "Vote Failed",
        description: "An error occurred while processing your vote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVote = (zoneId: string, voteType: 'hot' | 'cold') => {
    voteMutation.mutate({ zoneId, voteType });
  };

  if (zonesLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Thermometer className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Junction Asia Temperature Voting System</h1>
                <p className="text-sm text-slate-600">Real-time Zone Temperature Control</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span data-testid="connected-users">{stats?.connectedUsers || 0}</span> users online
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Instructions */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 p-6 mb-8">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">How to Use</h2>
              <p className="text-slate-700 mb-3">
                To adjust the temperature of each zone, click the <span className="font-medium text-red-600">Warmer</span> or{' '}
                <span className="font-medium text-blue-600">Cooler</span> buttons.
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="bg-white px-3 py-1 rounded-full text-slate-600 border border-slate-200">
                  <Users className="w-3 h-3 inline mr-1" />
                  Real-time voting
                </span>
                <span className="bg-white px-3 py-1 rounded-full text-slate-600 border border-slate-200">
                  <Thermometer className="w-3 h-3 inline mr-1" />
                  No login required
                </span>
                <span className="bg-white px-3 py-1 rounded-full text-slate-600 border border-slate-200">
                  <BarChart3 className="w-3 h-3 inline mr-1" />
                  Majority opinion
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Temperature Zones Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {zones?.map((zone) => {
            const IconComponent = zoneIcons[zone.id as keyof typeof zoneIcons] || Users;
            const colorClass = zoneColors[zone.id as keyof typeof zoneColors];
            const totalVotes = zone.hotVotes + zone.coldVotes;
            const hotPercentage = totalVotes > 0 ? (zone.hotVotes / totalVotes) * 100 : 50;
            
            return (
              <Card key={zone.id} className="overflow-hidden hover:shadow-xl transition-all duration-300" data-testid={`zone-card-${zone.id}`}>
                <div className={`bg-gradient-to-r ${colorClass} px-6 py-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <IconComponent className="w-5 h-5 text-white" />
                      <h3 className="text-white font-semibold text-lg" data-testid={`zone-name-${zone.id}`}>{zone.name}</h3>
                    </div>
                    <div className="bg-white/20 px-2 py-1 rounded-full">
                      <span className="text-white text-xs font-medium" data-testid={`active-voters-${zone.id}`}>
                        {zone.activeVoters} users
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Vote Chart */}
                  <div className="mb-6">
                    <VoteChart zoneId={zone.id} />
                  </div>

                  {/* Voting Buttons */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <Button
                      onClick={() => handleVote(zone.id, 'hot')}
                      disabled={voteMutation.isPending}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200"
                      data-testid={`button-hot-${zone.id}`}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Warmer
                    </Button>
                    <Button
                      onClick={() => handleVote(zone.id, 'cold')}
                      disabled={voteMutation.isPending}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200"
                      data-testid={`button-cold-${zone.id}`}
                    >
                      <Minus className="w-4 h-4 mr-1" />
                      Cooler
                    </Button>
                  </div>

                  {/* Vote Statistics */}
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-slate-600">Warmer</span>
                        <span className="font-semibold text-red-600" data-testid={`hot-votes-${zone.id}`}>
                          {zone.hotVotes} votes
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-slate-600">Cooler</span>
                        <span className="font-semibold text-blue-600" data-testid={`cold-votes-${zone.id}`}>
                          {zone.coldVotes} votes
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          hotPercentage >= 50 
                            ? 'bg-gradient-to-r from-red-500 to-red-400'
                            : 'bg-gradient-to-r from-blue-500 to-blue-400'
                        }`}
                        style={{ width: `${Math.max(hotPercentage, 100 - hotPercentage)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Summary Statistics */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4">
            <h3 className="text-white font-semibold text-lg flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Overall Statistics</span>
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900 mb-1" data-testid="stat-total-votes">
                  {stats?.totalVotes || 0}
                </div>
                <div className="text-sm text-slate-600">Total Votes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 mb-1" data-testid="stat-hot-votes">
                  {stats?.hotVotes || 0}
                </div>
                <div className="text-sm text-slate-600">Warmer Votes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1" data-testid="stat-cold-votes">
                  {stats?.coldVotes || 0}
                </div>
                <div className="text-sm text-slate-600">Cooler Votes</div>
              </div>
            </div>
          </div>
        </Card>
      </main>

      {/* Floating Refresh Button for Mobile */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <Button
          size="icon"
          className="bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/zones'] });
            queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
          }}
          data-testid="button-refresh"
        >
          <TrendingUp className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}