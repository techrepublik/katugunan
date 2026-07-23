"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import {
  Loader2,
  Users,
  Calendar,
  Award,
  TrendingUp,
  BrainCircuit,
  MessageSquare,
  Sparkles,
  ShieldAlert,
  FolderOpen,
  ChevronDown
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TimelineItem {
  period: string;
  avg_rating: number;
  csat: number;
  count: number;
}

interface SentimentFeedItem {
  id: number;
  suggestions: string;
  sentiment: "positive" | "neutral" | "negative";
  created_on: string | null;
  client_type: string;
}

interface PersonnelStats {
  scope_type: string;
  target_id: number | null;
  time_group: string;
  summary: {
    total_surveys: number;
    sentiment: {
      positive: number;
      negative: number;
      neutral: number;
    };
    predictive: {
      predicted_rating: number;
      predicted_csat: number;
      trend: "up" | "down" | "stable";
      trend_pct: number;
      message: string;
    };
    sqd_averages: Array<{
      dimension: string;
      label: string;
      average: number;
    }>;
    service_stats: Array<{
      service_name: string;
      count: number;
    }>;
  };
  timeline: TimelineItem[];
  sentiment_feed: SentimentFeedItem[];
}

export default function PersonnelMonitorPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingStats, setFetchingStats] = useState(false);
  
  // Filter Options
  const [scopeType, setScopeType] = useState<string>("all");
  const [targetId, setTargetId] = useState<string>("");
  const [timeGroup, setTimeGroup] = useState<string>("monthly");
  
  // Options lists loaded from DB
  const [usersList, setUsersList] = useState<any[]>([]);
  const [nodesList, setNodesList] = useState<any[]>([]);
  
  // Rendered Stats State
  const [stats, setStats] = useState<PersonnelStats | null>(null);
  const [metricToggle, setMetricToggle] = useState<"rating" | "csat">("rating");

  // Searchable Target Combobox states
  const [personnelRatings, setPersonnelRatings] = useState<Record<string, number>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  // Fetch users and nodes to populate target select options
  const fetchFilterOptions = async (token: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [usersRes, nodesRes] = await Promise.all([
        fetch(`${apiBase}/users`, { headers }),
        fetch(`${apiBase}/org-nodes`, { headers })
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsersList(usersData);
      }
      if (nodesRes.ok) {
        const nodesData = await nodesRes.json();
        setNodesList(nodesData);
      }

      const ratingsRes = await fetch(`${apiBase}/surveys/personnel-ratings`, { headers });
      if (ratingsRes.ok) {
        const ratingsData = await ratingsRes.json();
        setPersonnelRatings(ratingsData);
      }
    } catch (err) {
      console.error("Error loading filter options:", err);
    }
  };

  const loadPageData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Get current user
      const meRes = await fetch(`${apiBase}/auth/me`, { headers });
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData);
      }

      await fetchFilterOptions(token || "");
    } catch (err) {
      console.error("Error initial load:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch personnel stats dynamically on parameter changes
  const fetchStats = async () => {
    setFetchingStats(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const params = new URLSearchParams();
      params.append("scope_type", scopeType);
      params.append("time_group", timeGroup);
      if (scopeType !== "all" && targetId) {
        params.append("target_id", targetId);
      }

      const res = await fetch(`${apiBase}/surveys/personnel-stats?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed fetching stats:", err);
    } finally {
      setFetchingStats(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  // Fetch stats when filter selection changes
  useEffect(() => {
    // If scope is not "all", wait for a valid target ID selection to fetch
    if (scopeType !== "all" && !targetId) {
      // Find first default option if available
      const options = getTargetOptions();
      if (options.length > 0) {
        setTargetId(options[0].id.toString());
      } else {
        setStats(null);
      }
      return;
    }
    fetchStats();
  }, [scopeType, targetId, timeGroup]);

  // Helper to filter options list based on scope type
  const getTargetOptions = () => {
    if (scopeType === "individual") {
      return usersList.map(u => {
        const displayName = `${u.first_name || ""} ${u.last_name || ""}`.trim();
        return {
          id: u.id,
          name: displayName ? `${displayName} (${u.username})` : u.username
        };
      });
    }
    if (scopeType === "department") {
      return nodesList.filter(n => n.node_type === "DEPARTMENT").map(n => ({ id: n.id, name: n.name }));
    }
    if (scopeType === "unit") {
      return nodesList.filter(n => n.node_type === "UNIT").map(n => ({ id: n.id, name: n.name }));
    }
    if (scopeType === "branch") {
      return nodesList.filter(n => n.node_type === "BRANCH").map(n => ({ id: n.id, name: n.name }));
    }
    return [];
  };

  // Helper to reset target ID if scopeType changes
  const handleScopeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newScope = e.target.value;
    setScopeType(newScope);
    setTargetId(""); // will trigger targetId picker logic in useEffect
    setDropdownOpen(false);
    setSearchQuery("");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-emerald-700" size={36} />
        </div>
      </div>
    );
  }

  // Define Chart Data Models
  const buildTrendChartData = () => {
    if (!stats || !stats.timeline || stats.timeline.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = stats.timeline.map(t => t.period);
    const hasPredictions = stats.summary.predictive && stats.timeline.length >= 2;
    
    // Add forecast label
    if (hasPredictions) {
      labels.push("Projected");
    }

    // Historical dataset
    const historicalData = stats.timeline.map(t => 
      metricToggle === "rating" ? t.avg_rating : t.csat
    );
    if (hasPredictions) {
      historicalData.push(null as any); // ends line at forecast node
    }

    // Predictive/Forecast dataset
    const predictiveData = Array(stats.timeline.length - 1).fill(null);
    // Connect the last historical point to prediction
    predictiveData.push(
      metricToggle === "rating" 
        ? stats.timeline[stats.timeline.length - 1].avg_rating 
        : stats.timeline[stats.timeline.length - 1].csat
    );
    predictiveData.push(
      metricToggle === "rating"
        ? stats.summary.predictive.predicted_rating
        : stats.summary.predictive.predicted_csat
    );

    return {
      labels,
      datasets: [
        {
          label: metricToggle === "rating" ? "Historical Avg Rating" : "Historical CSAT %",
          data: historicalData,
          borderColor: metricToggle === "rating" ? "#047857" : "#0284c7",
          backgroundColor: metricToggle === "rating" ? "rgba(4, 120, 87, 0.05)" : "rgba(2, 132, 199, 0.05)",
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointBackgroundColor: metricToggle === "rating" ? "#047857" : "#0284c7",
          pointRadius: 4
        },
        ...(hasPredictions ? [{
          label: "Forecast Trend",
          data: predictiveData,
          borderColor: "#f59e0b",
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 5,
          pointBackgroundColor: "#f59e0b",
          fill: false
        }] : [])
      ]
    };
  };

  const trendChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top" as const, labels: { boxWidth: 12, font: { size: 10 } } },
      tooltip: { padding: 8, font: { size: 11 } }
    },
    scales: {
      y: {
        min: metricToggle === "rating" ? 1.0 : 0.0,
        max: metricToggle === "rating" ? 5.0 : 100.0,
        ticks: { font: { size: 9 } },
        grid: { color: "#f1f5f9" }
      },
      x: {
        ticks: { font: { size: 9 } },
        grid: { display: false }
      }
    }
  };

  const buildSentimentChartData = () => {
    if (!stats) return { labels: [], datasets: [] };
    const { positive, neutral, negative } = stats.summary.sentiment;

    return {
      labels: ["Positive", "Neutral", "Negative"],
      datasets: [
        {
          data: [positive, neutral, negative],
          backgroundColor: ["#10b981", "#94a3b8", "#ef4444"],
          borderWidth: 1,
          hoverOffset: 4
        }
      ]
    };
  };

  const sentimentChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "right" as const, labels: { font: { size: 10 }, boxWidth: 10 } }
    },
    cutout: "70%"
  };

  const buildSQDChartData = () => {
    if (!stats || !stats.summary.sqd_averages) return { labels: [], datasets: [] };

    return {
      labels: stats.summary.sqd_averages.map(s => s.dimension),
      datasets: [
        {
          label: "Average score (1.0 - 5.0)",
          data: stats.summary.sqd_averages.map(s => s.average),
          backgroundColor: "rgba(4, 120, 87, 0.8)",
          borderColor: "#047857",
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    };
  };

  const sqdChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          afterBody: (context: any) => {
            const index = context[0].dataIndex;
            return stats?.summary.sqd_averages[index].label || "";
          }
        }
      }
    },
    scales: {
      y: { min: 1.0, max: 5.0, ticks: { stepSize: 1, font: { size: 9 } } },
      x: { ticks: { font: { size: 9 } } }
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userLevel={currentUser?.user_level || "Super"} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar username={currentUser?.username || "Admin"} userLevel={currentUser?.user_level || "Super"} />

        <main className="flex-1 p-6 md:p-8 flex flex-col space-y-6 overflow-y-auto">
          
          {/* Title block */}
          <div className="border-b border-slate-200 pb-5">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <BrainCircuit className="text-emerald-700" size={24} />
              <span>Personnel & Org Performance Monitor</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Time-series performance metrics, automatic linear trend projections, and client sentiment auditing.
            </p>
          </div>

          {/* Filtering Ribbon */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-wrap gap-4 items-center">
            
            {/* Scope selection */}
            <div className="flex flex-col gap-1 text-xs">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Scoping Level</label>
              <select 
                value={scopeType}
                onChange={handleScopeChange}
                className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-black font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">University Wide (All)</option>
                <option value="individual">Personnel (Individual)</option>
                <option value="department">Department</option>
                <option value="unit">Unit</option>
                <option value="branch">Branch</option>
              </select>
            </div>

            {/* Target Select option */}
            {scopeType !== "all" && (
              <div className="flex flex-col gap-1 text-xs relative">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Select Target Entity</label>
                
                <button 
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-black font-semibold flex items-center justify-between gap-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-[240px] text-left"
                >
                  <span className="truncate">
                    {targetId ? (() => {
                      const selected = getTargetOptions().find(opt => opt.id.toString() === targetId);
                      if (!selected) return "-- Select --";
                      
                      if (scopeType === "individual") {
                        const rating = personnelRatings[targetId];
                        return `${selected.name} (${rating ? `★ ${rating.toFixed(2)}` : "No ratings"})`;
                      }
                      return selected.name;
                    })() : "-- Select --"}
                  </span>
                  <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
                </button>

                {dropdownOpen && (
                  <div className="absolute top-[100%] left-0 mt-1 w-[260px] bg-white border border-slate-200 rounded-2xl shadow-lg z-[2000] p-2.5 space-y-2 flex flex-col">
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type to search..."
                      className="border border-slate-150 rounded-xl px-3 py-2 bg-slate-50 text-[10px] text-black font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="max-h-[160px] overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
                      {getTargetOptions().filter(opt => 
                        opt.name.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map(opt => {
                        const rating = scopeType === "individual" ? personnelRatings[opt.id.toString()] : null;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setTargetId(opt.id.toString());
                              setDropdownOpen(false);
                              setSearchQuery("");
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[10px] font-semibold flex items-center justify-between hover:bg-slate-50 ${opt.id.toString() === targetId ? "bg-emerald-50 text-emerald-800" : "text-slate-700"}`}
                          >
                            <span className="truncate max-w-[170px]">{opt.name}</span>
                            {scopeType === "individual" && (
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${rating ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                                {rating ? `★ ${rating.toFixed(2)}` : "No rating"}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Group interval */}
            <div className="flex flex-col gap-1 text-xs">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px]">Timeline Resolution</label>
              <select 
                value={timeGroup}
                onChange={(e) => setTimeGroup(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-black font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="daily">Daily Averages</option>
                <option value="weekly">Weekly Averages</option>
                <option value="monthly">Monthly Averages</option>
                <option value="yearly">Yearly Averages</option>
              </select>
            </div>

            {/* Feteching loader indicator */}
            {fetchingStats && (
              <div className="flex items-center gap-1.5 text-xs text-slate-450 font-bold ml-auto self-end pb-2">
                <Loader2 className="animate-spin text-emerald-700" size={14} />
                <span>Syncing dataset...</span>
              </div>
            )}

          </div>

          {stats ? (
            <div className="space-y-6">
              
              {/* Top Scorecard & Predictive Alert Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Metrics Cards Grid */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
                  
                  {/* Total surveys */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Surveys Analyzed</span>
                      <h3 className="text-3xl font-extrabold text-slate-800">{stats.summary.total_surveys}</h3>
                      <p className="text-[10px] text-slate-400 font-semibold">Matched evaluator scope</p>
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
                      <Users size={16} />
                    </div>
                  </div>

                  {/* Avg score */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Rating</span>
                      <h3 className="text-3xl font-extrabold text-slate-800">
                        {stats.timeline.length > 0 
                          ? stats.timeline[stats.timeline.length - 1].avg_rating.toFixed(2) 
                          : "5.00"}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold">Latest observed period</p>
                    </div>
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                      <TrendingUp size={16} />
                    </div>
                  </div>

                  {/* CSAT index */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall CSAT</span>
                      <h3 className="text-3xl font-extrabold text-slate-800">
                        {stats.timeline.length > 0 
                          ? stats.timeline[stats.timeline.length - 1].csat.toFixed(1) 
                          : "100.0"}%
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold">Latest satisfaction score</p>
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
                      <Award size={16} />
                    </div>
                  </div>

                </div>

                {/* Predictive Alert Panel */}
                <div className={`border p-5 rounded-2xl shadow-sm flex flex-col justify-between ${
                  stats.summary.predictive.trend === "down" 
                    ? "bg-rose-50 border-rose-200 text-rose-800" 
                    : stats.summary.predictive.trend === "up" 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <BrainCircuit size={16} className={stats.summary.predictive.trend === "down" ? "text-rose-600" : "text-emerald-700"} />
                      <h3 className="text-xs font-bold uppercase tracking-wider">Predictive Trend Alert</h3>
                    </div>
                    <p className="text-[11px] font-semibold leading-relaxed">
                      {stats.summary.predictive.message}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-slate-200/40 flex justify-between items-center text-[10px] font-bold">
                    <span>Forecast CSAT:</span>
                    <span className="text-xs font-black">{stats.summary.predictive.predicted_csat}%</span>
                  </div>
                </div>

              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Unified Trend Line chart */}
                <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col">
                  
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <TrendingUp size={16} className="text-emerald-700" />
                        <span>Performance Projections Timeline</span>
                      </h3>
                      <p className="text-[10px] text-slate-400">Historical performance overlaid with linear regression forecast</p>
                    </div>

                    {/* Metric toggle controls */}
                    <div className="flex items-center gap-1.5 text-xs bg-slate-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setMetricToggle("rating")}
                        className={`px-3 py-1 rounded-lg font-bold transition-all ${
                          metricToggle === "rating" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                        }`}
                      >
                        Rating (5.0)
                      </button>
                      <button 
                        onClick={() => setMetricToggle("csat")}
                        className={`px-3 py-1 rounded-lg font-bold transition-all ${
                          metricToggle === "csat" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                        }`}
                      >
                        CSAT %
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-[300px] h-[300px]">
                    <Line data={buildTrendChartData()} options={trendChartOptions} />
                  </div>
                </div>

                {/* Sentiment Doughnut Card */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <MessageSquare size={16} className="text-emerald-700" />
                      <span>Sentiment Auditor</span>
                    </h3>
                    <p className="text-[10px] text-slate-400">Word-lexicon sentiment classifications breakdown</p>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center min-h-[220px] h-[220px]">
                    <Doughnut data={buildSentimentChartData()} options={sentimentChartOptions} />
                  </div>
                </div>

              </div>

              {/* Bottom row: SQD Dimensions Bar Chart, Service Volume Tally, and Sentiment Feed logs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* SQD averages bar chart */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles size={16} className="text-amber-500" />
                      <span>SQD Dimensions Breakdown</span>
                    </h3>
                    <p className="text-[10px] text-slate-400">Average score comparisons across guidelines</p>
                  </div>

                  <div className="flex-1 min-h-[250px] h-[250px]">
                    <Bar data={buildSQDChartData()} options={sqdChartOptions} />
                  </div>
                </div>

                {/* Service Volume Performance Tally */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Users size={16} className="text-emerald-700" />
                      <span>Service Performance Tally</span>
                    </h3>
                    <p className="text-[10px] text-slate-400">Tally of survey submissions per service type</p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 max-h-[250px] pr-1 scrollbar-thin scrollbar-thumb-slate-250">
                    {stats.summary.service_stats && stats.summary.service_stats.length > 0 ? (
                      stats.summary.service_stats.map((svc, sIdx) => {
                        const pct = stats.summary.total_surveys > 0
                          ? ((svc.count / stats.summary.total_surveys) * 100).toFixed(0)
                          : "0";
                        return (
                          <div key={sIdx} className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-700">
                              <span className="truncate max-w-[190px]">{svc.service_name}</span>
                              <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-100 font-extrabold">
                                {svc.count} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-emerald-600 h-1.5 transition-all duration-550" 
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 py-10 text-xs">
                        No service transaction tallies.
                      </div>
                    )}
                  </div>
                </div>

                {/* Sentiment Audited Feed Logs */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col">
                  <div className="border-b border-slate-100 pb-3 mb-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <MessageSquare size={16} className="text-emerald-700" />
                      <span>Sentiment Audited Feed</span>
                    </h3>
                    <p className="text-[10px] text-slate-400">Recent customer comments with sentiment</p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 max-h-[250px] pr-1 scrollbar-thin scrollbar-thumb-slate-250">
                    {stats.sentiment_feed.length > 0 ? (
                      stats.sentiment_feed.map(feed => (
                        <div 
                          key={feed.id} 
                          className={`p-2.5 rounded-xl border flex flex-col space-y-1.5 text-[10px] ${
                            feed.sentiment === "positive" 
                              ? "bg-emerald-50/20 border-emerald-200 text-emerald-800" 
                              : feed.sentiment === "negative"
                              ? "bg-rose-50/20 border-rose-200 text-rose-800"
                              : "bg-slate-50/50 border-slate-200 text-slate-650"
                          }`}
                        >
                          <div className="flex justify-between font-bold text-[8px] uppercase tracking-wider">
                            <span>{feed.client_type}</span>
                            <span className={`px-1.5 py-0.5 rounded ${
                              feed.sentiment === "positive" 
                                ? "bg-emerald-100" 
                                : feed.sentiment === "negative"
                                ? "bg-rose-100"
                                : "bg-slate-100"
                            }`}>
                              {feed.sentiment}
                            </span>
                          </div>
                          <p className="italic">"{feed.suggestions}"</p>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 py-10 text-xs">
                        No recent text suggestions logs.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <FolderOpen className="mx-auto text-slate-350 mb-3" size={40} />
              <h3 className="font-bold text-slate-700 text-sm">Select Scoping Parameters</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Please select a valid scoping level and select a target personnel or organizational node to analyze performance records.
              </p>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
