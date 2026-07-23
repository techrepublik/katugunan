"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { 
  Loader2, 
  Download, 
  Printer, 
  Calendar, 
  Filter, 
  RefreshCw, 
  FileText, 
  Award, 
  TrendingUp, 
  Users, 
  Search, 
  MessageSquare,
  Sparkles
} from "lucide-react";
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
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface SQDBreakdown {
  label: string;
  avg: number;
  pct: number;
}

interface AnalyticsData {
  total_surveys: number;
  average_rating: number;
  csat_score: number;
  nps_sentiment: {
    promoter_pct: number;
    passive_pct: number;
    detractor_pct: number;
  };
  demographics: {
    sex: Record<string, number>;
    client_type: Record<string, number>;
    region: Record<string, number>;
    age_groups: Record<string, number>;
  };
  citizen_charter: {
    cc1: Record<string, number>;
    cc2: Record<string, number>;
    cc3: Record<string, number>;
  };
  sqd_breakdown: SQDBreakdown[];
  timeline_trend: Record<string, number>;
  suggestions: {
    id: number;
    created_on: string | null;
    client_type: string;
    email: string;
    suggestions: string;
  }[];
}

export default function AnalyticsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  // Filters State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [selectedClientType, setSelectedClientType] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  
  // Option fields from DB
  const [nodes, setNodes] = useState<any[]>([]);
  const [clientTypes, setClientTypes] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  // Local comments search filter
  const [commentSearch, setCommentSearch] = useState("");

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  // Fetch filter choices and user details
  const fetchFiltersAndUser = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // User details
      const userRes = await fetch(`${apiBase}/auth/me`, { headers });
      if (userRes.ok) {
        const userData = await userRes.json();
        setCurrentUser(userData);
      }

      // Metadata dropdowns
      const [nodesRes, ctRes, regRes, svcRes] = await Promise.all([
        fetch(`${apiBase}/org-nodes`, { headers }),
        fetch(`${apiBase}/client-types`, { headers }),
        fetch(`${apiBase}/regions`, { headers }),
        fetch(`${apiBase}/services`, { headers }),
      ]);

      if (nodesRes.ok) setNodes(await nodesRes.json());
      if (ctRes.ok) setClientTypes(await ctRes.json());
      if (regRes.ok) setRegions(await regRes.json());
      if (svcRes.ok) setServices(await svcRes.json());
    } catch (err) {
      console.error("Error loading filters metadata:", err);
    }
  };

  // Fetch main analytics payload
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (selectedNodeId) params.append("org_node_id", selectedNodeId);
      if (selectedClientType) params.append("client_type", selectedClientType);
      if (selectedRegion) params.append("region", selectedRegion);
      if (selectedServiceId) params.append("service_id", selectedServiceId);

      const res = await fetch(`${apiBase}/surveys/analytics?${params.toString()}`, { headers });
      if (res.ok) {
        setAnalyticsData(await res.json());
      }
    } catch (err) {
      console.error("Error loading analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersAndUser();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate, selectedNodeId, selectedClientType, selectedRegion, selectedServiceId]);

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedNodeId("");
    setSelectedClientType("");
    setSelectedRegion("");
    setSelectedServiceId("");
  };

  // CSV Export Trigger
  const handleExportCSV = () => {
    const token = localStorage.getItem("token");
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    if (selectedNodeId) params.append("org_node_id", selectedNodeId);
    if (selectedClientType) params.append("client_type", selectedClientType);
    if (selectedRegion) params.append("region", selectedRegion);
    if (selectedServiceId) params.append("service_id", selectedServiceId);

    const downloadUrl = `${apiBase}/surveys/export?${params.toString()}&token=${token}`;
    const link = document.createElement("a");
    link.href = downloadUrl;
    fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute("download", `USM_Katugunan_Export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(err => console.error("CSV Download error:", err));
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Setup visual charts data
  const trendLabels = analyticsData ? Object.keys(analyticsData.timeline_trend) : [];
  const trendValues = analyticsData ? Object.values(analyticsData.timeline_trend) : [];

  const trendChartData = {
    labels: trendLabels.length > 0 ? trendLabels : ["No Data Available"],
    datasets: [
      {
        label: 'Responses Count',
        data: trendValues.length > 0 ? trendValues : [0],
        borderColor: '#047857',
        backgroundColor: 'rgba(4, 120, 87, 0.1)',
        tension: 0.3,
        fill: true,
        borderWidth: 2.5,
        pointBackgroundColor: '#047857',
      }
    ]
  };

  const sqdLabels = analyticsData ? analyticsData.sqd_breakdown.map(x => x.label.split(" - ")[0]) : [];
  const sqdValues = analyticsData ? analyticsData.sqd_breakdown.map(x => x.avg) : [];

  const sqdChartData = {
    labels: sqdLabels,
    datasets: [
      {
        label: 'Average Score',
        data: sqdValues,
        backgroundColor: '#f59e0b',
        borderRadius: 6,
        borderWidth: 0,
        maxBarThickness: 32,
      }
    ]
  };

  const clientTypeLabels = analyticsData ? Object.keys(analyticsData.demographics.client_type) : [];
  const clientTypeValues = analyticsData ? Object.values(analyticsData.demographics.client_type) : [];

  const clientTypeChartData = {
    labels: clientTypeLabels,
    datasets: [
      {
        data: clientTypeValues,
        backgroundColor: ['#047857', '#f59e0b', '#10b981', '#6b7280', '#3b82f6', '#ec4899'],
        borderWidth: 1.5,
      }
    ]
  };

  // CC Compliance data mapping
  const cc1Labels = ["Aware", "Aware, saw CC", "Learned of CC", "Not aware"];
  const cc1Raw = analyticsData ? [
    analyticsData.citizen_charter.cc1["1"] || 0,
    analyticsData.citizen_charter.cc1["2"] || 0,
    analyticsData.citizen_charter.cc1["3"] || 0,
    analyticsData.citizen_charter.cc1["4"] || 0,
  ] : [0, 0, 0, 0];

  const ccChartData = {
    labels: cc1Labels,
    datasets: [
      {
        label: 'CC Responses',
        data: cc1Raw,
        backgroundColor: '#10b981',
        borderRadius: 4,
      }
    ]
  };

  // Comments suggestions filter
  const filteredSuggestions = analyticsData 
    ? analyticsData.suggestions.filter(s => 
        s.suggestions.toLowerCase().includes(commentSearch.toLowerCase()) || 
        s.email.toLowerCase().includes(commentSearch.toLowerCase()) ||
        s.client_type.toLowerCase().includes(commentSearch.toLowerCase())
      )
    : [];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userLevel={currentUser?.user_level || "Super"} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar username={currentUser?.username || "Admin"} userLevel={currentUser?.user_level || "Super"} />

        <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto print:p-0">
          
          {/* Header Action row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5 print:hidden">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <span>Survey Analytics Insights</span>
                <Sparkles className="text-amber-500" size={20} />
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Real-time quality dimensions performance metrics and feedback data summaries.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrintReport}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Printer size={14} />
                <span>Print Report</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filtering panel card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4 print:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-650">
                <Filter size={14} />
                <span>Scoping & Filters</span>
              </div>
              <button 
                onClick={handleClearFilters}
                className="text-[10px] font-bold text-slate-400 hover:text-emerald-700 flex items-center gap-1 transition-colors"
              >
                <RefreshCw size={11} />
                <span>Clear Filters</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              
              {/* Start Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Start Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500"
                  />
                  <Calendar className="absolute left-2.5 top-2 text-slate-400" size={13} />
                </div>
              </div>

              {/* End Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">End Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500"
                  />
                  <Calendar className="absolute left-2.5 top-2 text-slate-400" size={13} />
                </div>
              </div>

              {/* Org Unit */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">College Node</label>
                <select
                  value={selectedNodeId}
                  onChange={(e) => setSelectedNodeId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Campuses/Nodes</option>
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.name} ({n.alias || n.node_type})</option>
                  ))}
                </select>
              </div>

              {/* Client Type */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Client Type</label>
                <select
                  value={selectedClientType}
                  onChange={(e) => setSelectedClientType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Client Types</option>
                  {clientTypes.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Region */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Region</label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Regions</option>
                  {regions.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Services */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Availed Service</label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Services</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {loading ? (
            <div className="min-h-[400px] bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-3">
              <Loader2 className="animate-spin text-emerald-700" size={36} />
              <p className="text-xs font-semibold text-slate-400">Loading filtered analytics metrics...</p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* KPI Scorecards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Total Surveys */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Volumetric Feedback</span>
                    <h3 className="text-3xl font-extrabold text-slate-800">{analyticsData?.total_surveys}</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Total responses collected</p>
                  </div>
                  <div className="w-11 h-11 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                </div>

                {/* CSAT Score */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall CSAT Score</span>
                    <h3 className="text-3xl font-extrabold text-slate-800">{analyticsData?.csat_score}%</h3>
                    <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                      ★ Satisfied / Strongly Satisfied
                    </p>
                  </div>
                  <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                    <Award size={18} />
                  </div>
                </div>

                {/* Mean rating */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average SQD score</span>
                    <h3 className="text-3xl font-extrabold text-slate-800">{analyticsData?.average_rating}</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Out of 5.0 maximum rating</p>
                  </div>
                  <div className="w-11 h-11 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
                    <TrendingUp size={18} />
                  </div>
                </div>

                {/* Promoters Sentiment */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Promoters Sentiment</span>
                    <h3 className="text-3xl font-extrabold text-slate-800">{analyticsData?.nps_sentiment.promoter_pct}%</h3>
                    <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                      Passives: {analyticsData?.nps_sentiment.passive_pct}% | Detractors: {analyticsData?.nps_sentiment.detractor_pct}%
                    </p>
                  </div>
                  <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                    <Users size={18} />
                  </div>
                </div>

              </div>

              {/* Main Graphs Grid Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* SQD dimension index bars */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Service Quality Dimensions (SQD) Breakdown</h3>
                    <p className="text-[10px] text-slate-400">Average score out of 5.0 for each core dimension</p>
                  </div>

                  <div className="h-64 flex items-end">
                    {analyticsData && analyticsData.sqd_breakdown.length > 0 ? (
                      <Bar 
                        data={sqdChartData} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              min: 0,
                              max: 5,
                              ticks: { stepSize: 1 }
                            }
                          },
                          plugins: {
                            legend: { display: false }
                          }
                        }} 
                      />
                    ) : (
                      <div className="text-slate-400 text-xs font-semibold w-full text-center py-10">No Dimension Data Available</div>
                    )}
                  </div>
                </div>

                {/* Client Types Demographics */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5 flex flex-col">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Respondent Client Types</h3>
                    <p className="text-[10px] text-slate-400">Distribution of feedback across client classifications</p>
                  </div>

                  <div className="flex-1 flex items-center justify-center h-48 py-2 relative">
                    {clientTypeValues.length > 0 ? (
                      <Doughnut 
                        data={clientTypeChartData} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: { boxWidth: 10, font: { size: 10 } }
                            }
                          }
                        }} 
                      />
                    ) : (
                      <div className="text-slate-400 text-xs font-semibold">No Demographics Available</div>
                    )}
                  </div>
                </div>

              </div>

              {/* Historical Trend Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Timeline responses line chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Feedback Volume Timeline Trend</h3>
                    <p className="text-[10px] text-slate-400">Survey responses counts logged per date</p>
                  </div>

                  <div className="h-64">
                    <Line 
                      data={trendChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: { ticks: { stepSize: 1 }, min: 0 }
                        }
                      }} 
                    />
                  </div>
                </div>

                {/* CC Compliance indicator */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Citizen's Charter Awareness</h3>
                    <p className="text-[10px] text-slate-400">Respondent awareness ratings for CC1</p>
                  </div>

                  <div className="h-60">
                    <Bar 
                      data={ccChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } }
                      }} 
                    />
                  </div>
                </div>

              </div>

              {/* Demographics segment card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Segment Demographics Table</h3>
                  <p className="text-[10px] text-slate-400">Details on Sex, Region, and Age Distributions matching your active filters</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Sex */}
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                    <h4 className="text-xs font-bold text-slate-700 border-b border-slate-200 pb-2 mb-3">Sex Distribution</h4>
                    <div className="space-y-2">
                      {analyticsData && Object.keys(analyticsData.demographics.sex).length > 0 ? (
                        Object.entries(analyticsData.demographics.sex).map(([key, val]) => (
                          <div key={key} className="flex justify-between items-center text-xs font-medium">
                            <span className="text-slate-600">{key}</span>
                            <span className="font-bold text-slate-800">{val} responses</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-400 text-xs">No records</div>
                      )}
                    </div>
                  </div>

                  {/* Region */}
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                    <h4 className="text-xs font-bold text-slate-700 border-b border-slate-200 pb-2 mb-3">Feedback by Region</h4>
                    <div className="space-y-2">
                      {analyticsData && Object.keys(analyticsData.demographics.region).length > 0 ? (
                        Object.entries(analyticsData.demographics.region).map(([key, val]) => (
                          <div key={key} className="flex justify-between items-center text-xs font-medium">
                            <span className="text-slate-600">{key}</span>
                            <span className="font-bold text-slate-800">{val} responses</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-400 text-xs">No records</div>
                      )}
                    </div>
                  </div>

                  {/* Age */}
                  <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                    <h4 className="text-xs font-bold text-slate-700 border-b border-slate-200 pb-2 mb-3">Age Groups Distribution</h4>
                    <div className="space-y-2">
                      {analyticsData && Object.entries(analyticsData.demographics.age_groups).map(([key, val]) => (
                        <div key={key} className="flex justify-between items-center text-xs font-medium">
                          <span className="text-slate-600">{key}</span>
                          <span className="font-bold text-slate-800">{val} responses</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* Suggestions / Comments feeds */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Respondent Comments & Suggestions ({filteredSuggestions.length})</h3>
                    <p className="text-[10px] text-slate-400">Written suggestions or feedback collected from clients</p>
                  </div>
                  
                  {/* Inline search filter */}
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      value={commentSearch}
                      onChange={(e) => setCommentSearch(e.target.value)}
                      placeholder="Search comments..."
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500"
                    />
                    <Search className="absolute left-2.5 top-2 text-slate-400" size={13} />
                  </div>
                </div>

                <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto pr-2 space-y-3">
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map((suggestion) => (
                      <div key={suggestion.id} className="pt-3 first:pt-0 space-y-2">
                        <div className="flex items-center justify-between text-[10px] text-slate-450 font-bold">
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-100">{suggestion.client_type}</span>
                            <span className="text-slate-500">Contact: {suggestion.email}</span>
                          </div>
                          <span>{suggestion.created_on}</span>
                        </div>
                        <p className="text-xs text-slate-700 bg-slate-50/70 p-3 rounded-lg border border-slate-100/60 leading-relaxed font-medium">
                          {suggestion.suggestions}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs font-semibold flex flex-col items-center gap-1.5">
                      <MessageSquare size={20} className="text-slate-300" />
                      <span>No matching written suggestions found</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </main>
      </div>
    </div>
  );
}
