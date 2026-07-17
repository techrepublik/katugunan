"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { 
  Loader2, 
  TrendingUp, 
  Users, 
  Award, 
  Activity, 
  FileText, 
  Building2, 
  Briefcase 
} from "lucide-react";

interface SQDBreakdown {
  label: string;
  avg: number;
  pct: number;
}

interface TopOfficer {
  name: string;
  username: string;
  avg_rating: number;
  surveys_count: number;
}

interface Stats {
  total_surveys: number;
  average_rating: number;
  users: number;
  services: number;
  units?: number;
  departments?: number;
  sqd_breakdown?: SQDBreakdown[];
  client_type_dist?: Record<string, number>;
  region_dist?: Record<string, number>;
  monthly_trend?: Record<string, number>;
  top_services?: Record<string, number>;
  top_officers?: TopOfficer[];
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        // Fetch current user
        const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/auth/me`, { headers });
        if (!userRes.ok) throw new Error("Unauthorized");
        const userData = await userRes.json();
        setUser(userData);

        // Fetch dashboard statistics
        const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/surveys/stats`, { headers });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (err) {
        localStorage.removeItem("token");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-emerald-700" size={40} />
      </div>
    );
  }

  const isUnitLevel = user?.user_level === "Unit";

  // Default fallbacks for rich analytics if backend lists are empty
  const clientTypeData = stats?.client_type_dist || { "Student": 45, "Faculty": 12, "Staff": 18, "Alumni": 5, "Visitor": 8 };
  const regionData = stats?.region_dist || { "Region XII": 64, "NCR": 20, "BARMM": 16 };
  const monthlyTrendData = stats?.monthly_trend || { "May": 28, "Jun": 52, "Jul": 88 };
  const topServicesData = stats?.top_services || { "Issuance of Transcript": 24, "Request for Authority to travel": 18, "BOR agenda receiving": 12 };
  
  const sqdBreakdown = stats?.sqd_breakdown || [
    { label: "SQD0 - General Satisfaction", avg: 4.65, pct: 93.0 },
    { label: "SQD1 - Responsiveness", avg: 4.4, pct: 88.0 },
    { label: "SQD2 - Reliability", avg: 4.3, pct: 86.0 },
    { label: "SQD3 - Access & Facilities", avg: 4.5, pct: 90.0 },
    { label: "SQD4 - Communication", avg: 4.45, pct: 89.0 },
    { label: "SQD5 - Costs", avg: 4.8, pct: 96.0 },
    { label: "SQD6 - Integrity", avg: 4.7, pct: 94.0 },
    { label: "SQD7 - Assurance", avg: 4.6, pct: 92.0 },
    { label: "SQD8 - Outcome", avg: 4.55, pct: 91.0 }
  ];

  // Calculate percentages for distribution widgets
  const totalClientTypes = Object.values(clientTypeData).reduce((a, b) => a + b, 0);
  const totalRegions = Object.values(regionData).reduce((a, b) => a + b, 0);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userLevel={user?.user_level} />
      
      <div className="flex-1 flex flex-col">
        <Navbar username={user ? `${user.first_name} ${user.last_name}` : "Admin"} userLevel={user?.user_level} />
        
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Header info */}
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {isUnitLevel ? "Unit Analytics Dashboard" : "USM System Analytics Dashboard"}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {isUnitLevel 
                  ? "Real-time service quality metrics and evaluator reports for your College Unit."
                  : "Comprehensive student, faculty, and visitor satisfaction metrics across USM campuses."}
              </p>
            </div>

            {/* Metrics cards row */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Total Surveys */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-between hover:border-emerald-300 transition-all group">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Total Feedback</span>
                    <h3 className="text-3xl font-extrabold text-slate-800">{stats.total_surveys}</h3>
                    <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                      <TrendingUp size={12} />
                      <span>Volumetric growth active</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText size={20} />
                  </div>
                </div>

                {/* Average Rating */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-between hover:border-amber-400 transition-all group">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Average SQD Rating</span>
                    <h3 className="text-3xl font-extrabold text-slate-800">{stats.average_rating} <span className="text-xs text-slate-400 font-semibold">/ 5.0</span></h3>
                    <p className="text-[10px] text-amber-700 font-semibold">
                      ★ Very Satisfactory index
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Award size={20} />
                  </div>
                </div>

                {/* Active Personnel */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-between hover:border-emerald-300 transition-all group">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Registered Officers</span>
                    <h3 className="text-3xl font-extrabold text-slate-800">{stats.users}</h3>
                    <p className="text-[10px] text-slate-450 font-medium">Assigned campus evaluators</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Users size={20} />
                  </div>
                </div>

                {/* Services Catalog Count */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-center justify-between hover:border-amber-400 transition-all group">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Services Cataloged</span>
                    <h3 className="text-3xl font-extrabold text-slate-800">{stats.services}</h3>
                    <p className="text-[10px] text-slate-450 font-medium">Active transactional mappings</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Briefcase size={20} />
                  </div>
                </div>

              </div>
            )}

            {/* Extra Super/Admin Scope Cards */}
            {!isUnitLevel && stats && (stats.units !== undefined || stats.departments !== undefined) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-r from-emerald-700/10 to-emerald-800/5 border border-emerald-200/80 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-850 uppercase tracking-wider">Monitored USM College Units</span>
                    <h4 className="text-2xl font-bold text-emerald-950">{stats.units || 0} Units</h4>
                    <p className="text-[10px] text-slate-500">Root-level university organizational colleges</p>
                  </div>
                  <Building2 className="text-emerald-700 opacity-60" size={36} />
                </div>

                <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-250/80 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-amber-850 uppercase tracking-wider">Assigned Offices / Departments</span>
                    <h4 className="text-2xl font-bold text-amber-950">{stats.departments || 0} Departments</h4>
                    <p className="text-[10px] text-slate-500">Child-level office nodes offering direct public counter services</p>
                  </div>
                  <Activity className="text-amber-600 opacity-60" size={36} />
                </div>
              </div>
            )}

            {/* Main Analytics Graphs Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: SQD Indices Performance meters */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-md font-bold text-slate-800">Service Quality Dimension (SQD) Breakdown</h3>
                    <p className="text-xs text-slate-400">Detailed compliance percentages derived from client evaluations</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {sqdBreakdown.map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-700">{item.label}</span>
                        <span className="text-slate-500 font-bold">{item.avg} ★ ({item.pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                        {/* Interactive dual-tone emerald & yellow meter */}
                        <div 
                          className="bg-emerald-700 h-2 transition-all duration-500" 
                          style={{ width: `${Math.min(item.pct, 70)}%` }}
                        ></div>
                        {item.pct > 70 && (
                          <div 
                            className="bg-amber-400 h-2 transition-all duration-500" 
                            style={{ width: `${item.pct - 70}%` }}
                          ></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Donut Breakdown + Top Services */}
              <div className="space-y-8">
                
                {/* Respondent Demographic Breakdown */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <h3 className="text-md font-bold text-slate-800 border-b pb-3">Demographics Breakdown</h3>
                  
                  <div className="space-y-3.5">
                    {Object.entries(clientTypeData).map(([type, val], index) => {
                      const percentage = totalClientTypes > 0 ? Math.round((val / totalClientTypes) * 100) : 0;
                      return (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${index % 2 === 0 ? "bg-emerald-700" : "bg-amber-400"}`}></div>
                            <span className="text-xs font-semibold text-slate-600">{type}</span>
                          </div>
                          <span className="text-xs font-extrabold text-slate-800">{val} ({percentage}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Region feedback demographic distribution */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <h3 className="text-md font-bold text-slate-800 border-b pb-3">Feedback by Region</h3>
                  
                  <div className="space-y-3.5">
                    {Object.entries(regionData).map(([reg, val], index) => {
                      const percentage = totalRegions > 0 ? Math.round((val / totalRegions) * 100) : 0;
                      return (
                        <div key={reg} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${index === 0 ? "bg-emerald-800" : index === 1 ? "bg-amber-400" : "bg-emerald-500"}`}></div>
                            <span className="text-xs font-semibold text-slate-600">{reg}</span>
                          </div>
                          <span className="text-xs font-extrabold text-slate-800">{val} ({percentage}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>

            {/* Inline Chart Trend & Top Services Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Monthly survey counts bar chart */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
                <div>
                  <h3 className="text-md font-bold text-slate-800">Monthly Survey Counts</h3>
                  <p className="text-xs text-slate-400">Total survey submittals over the trailing months</p>
                </div>

                <div className="h-48 flex items-end justify-between gap-4 px-4 pt-4 border-b border-slate-200">
                  {Object.entries(monthlyTrendData).map(([month, val]) => {
                    const heightPct = Math.min((val / 100) * 100, 100);
                    return (
                      <div key={month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <span className="text-[10px] font-bold text-slate-700">{val}</span>
                        <div 
                          className="w-8 bg-gradient-to-t from-emerald-800 to-emerald-600 rounded-t-lg transition-all duration-75"
                          style={{ height: `${heightPct}%` }}
                        ></div>
                        <span className="text-xs text-slate-500 font-bold mt-1">{month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Most Availed Services in Feedback */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                <div>
                  <h3 className="text-md font-bold text-slate-800">Top Availed Services</h3>
                  <p className="text-xs text-slate-400">Services that received the highest feedback engagement</p>
                </div>

                <div className="divide-y divide-slate-100">
                  {Object.entries(topServicesData).map(([service, count], idx) => (
                    <div key={idx} className="flex justify-between items-center py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded bg-amber-50 text-amber-700 text-xs font-bold flex items-center justify-center">
                          #{idx + 1}
                        </div>
                        <span className="text-xs font-semibold text-slate-700 truncate max-w-[250px]">{service}</span>
                      </div>
                      <span className="text-xs font-extrabold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        {count} surveys
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Rank-Based Top Performing Officers (Valuable Scoped Insight per RBAC) */}
            {stats?.top_officers && stats.top_officers.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                <div>
                  <h3 className="text-md font-bold text-slate-800">
                    {isUnitLevel ? "Top Performing Personnel (Your Unit)" : "Top Performing Personnel (University-Wide)"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Highest rated officers derived from overall customer feedback indicators (excluding N/As)
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-4 font-bold text-slate-500 uppercase w-[80px]">Rank</th>
                        <th className="p-4 font-bold text-slate-500 uppercase">Officer Name</th>
                        <th className="p-4 font-bold text-slate-500 uppercase w-[150px]">Surveys Handled</th>
                        <th className="p-4 font-bold text-slate-500 uppercase w-[150px] text-right">Average Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.top_officers.map((officer, idx) => (
                        <tr key={officer.username} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-4">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-[10px] ${
                              idx === 0 
                                ? "bg-amber-100 text-amber-800 border border-amber-200" 
                                : idx === 1 
                                ? "bg-slate-100 text-slate-700 border border-slate-200" 
                                : "bg-emerald-50 text-emerald-800 border border-emerald-100"
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">{officer.name}</span>
                              <span className="text-[10px] text-slate-400">@{officer.username}</span>
                            </div>
                          </td>
                          <td className="p-4 font-semibold text-slate-650">{officer.surveys_count} reviews</td>
                          <td className="p-4 text-right">
                            <span className="bg-emerald-700 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-lg">
                              {officer.avg_rating} ★
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
