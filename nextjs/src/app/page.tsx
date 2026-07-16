"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { Loader2, PieChart, Users, Settings, Award } from "lucide-react";

interface Stats {
  total_surveys: number;
  average_rating: number;
  users: number;
  services: number;
  units?: number;
  departments?: number;
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

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userLevel={user?.user_level} />
      
      <div className="flex-1 flex flex-col">
        <Navbar username={user?.username} userLevel={user?.user_level} />
        
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800">
              {isUnitLevel ? "Unit Dashboard Overview" : "System Dashboard Overview"}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {isUnitLevel 
                ? "Scoping evaluation statistics for your associated college unit." 
                : "Katugunan Client Satisfaction Analytics & Monitoring Panel"}
            </p>
          </div>

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 p-6 rounded-xl shadow-md text-white border-b-4 border-gold-500">
                <div className="text-xs uppercase tracking-wider text-emerald-200 font-semibold mb-2">Total Surveys</div>
                <div className="text-3xl font-bold">{stats.total_surveys}</div>
              </div>

              <div className="bg-gradient-to-br from-gold-500 to-amber-600 p-6 rounded-xl shadow-md text-white border-b-4 border-emerald-700">
                <div className="text-xs uppercase tracking-wider text-amber-100 font-semibold mb-2">Average Rating</div>
                <div className="text-3xl font-bold">{stats.average_rating}</div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-xl shadow-md text-white border-b-4 border-gold-500">
                <div className="text-xs uppercase tracking-wider text-emerald-100 font-semibold mb-2">Users / Officers</div>
                <div className="text-3xl font-bold">{stats.users}</div>
              </div>

              <div className="bg-gradient-to-br from-amber-600 to-orange-700 p-6 rounded-xl shadow-md text-white border-b-4 border-emerald-700">
                <div className="text-xs uppercase tracking-wider text-amber-100 font-semibold mb-2">Services</div>
                <div className="text-3xl font-bold">{stats.services}</div>
              </div>

              {!isUnitLevel && stats.units !== undefined && (
                <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 p-6 rounded-xl shadow-md text-white border-b-4 border-gold-500 md:col-span-2">
                  <div className="text-xs uppercase tracking-wider text-emerald-200 font-semibold mb-2">College Units</div>
                  <div className="text-3xl font-bold">{stats.units}</div>
                </div>
              )}

              {!isUnitLevel && stats.departments !== undefined && (
                <div className="bg-gradient-to-br from-gold-500 to-amber-600 p-6 rounded-xl shadow-md text-white border-b-4 border-emerald-700 md:col-span-2">
                  <div className="text-xs uppercase tracking-wider text-amber-100 font-semibold mb-2">Departments</div>
                  <div className="text-3xl font-bold">{stats.departments}</div>
                </div>
              )}
            </div>
          )}

          {/* Simple satisfaction chart visualization */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Satisfaction Index Metrics (SQD)</h2>
            <div className="space-y-4">
              {[
                { label: "SQD0 - General Satisfaction", pct: 92, count: 5 },
                { label: "SQD1 - Responsiveness", pct: 88, count: 4.8 },
                { label: "SQD2 - Reliability", pct: 85, count: 4.6 },
                { label: "SQD3 - Access & Facilities", pct: 90, count: 4.9 },
                { label: "SQD4 - Communication", pct: 87, count: 4.7 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="text-slate-500 font-semibold">{item.pct}% ({item.count} ★)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="bg-emerald-700 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${item.pct}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
