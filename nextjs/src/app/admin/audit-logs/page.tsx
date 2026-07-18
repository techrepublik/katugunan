"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { Loader2, Search, Filter, RefreshCw, Calendar, Shield, ArrowUpDown } from "lucide-react";

interface AuditLog {
  id: number;
  timestamp: string;
  username: string;
  action: string;
  details: string;
  ip_address?: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState("Unit");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [sortField, setSortField] = useState<"timestamp" | "username" | "action">("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fetchLogsAndMe = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

      // Get me details
      const meRes = await fetch(`${apiBase}/auth/me`, { headers });
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData);
        setUserLevel(meData.user_level);
      }

      // Get Audit Logs
      const logsRes = await fetch(`${apiBase}/audit-logs`, { headers });
      if (logsRes.ok) {
        setLogs(await logsRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsAndMe();
  }, []);

  // Handle Sort Toggle
  const handleSort = (field: "timestamp" | "username" | "action") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Unique action categories for filtering
  const actionCategories = ["ALL", ...Array.from(new Set(logs.map((log) => log.action)))];

  // Filtering logs
  const filteredLogs = logs
    .filter((log) => {
      const matchesSearch =
        log.username.toLowerCase().includes(search.toLowerCase()) ||
        log.details.toLowerCase().includes(search.toLowerCase()) ||
        (log.ip_address && log.ip_address.includes(search));
      
      const matchesAction = actionFilter === "ALL" || log.action === actionFilter;

      return matchesSearch && matchesAction;
    })
    .sort((a, b) => {
      let valA: any = a[sortField] || "";
      let valB: any = b[sortField] || "";

      if (sortField === "timestamp") {
        valA = new Date(a.timestamp).getTime();
        valB = new Date(b.timestamp).getTime();
      } else {
        valA = valA.toString().toLowerCase();
        valB = valB.toString().toLowerCase();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  // Pagination calculation
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar userLevel="Unit" />
        <div className="flex-1 flex flex-col">
          <Navbar username="Loading..." userLevel="Unit" />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-emerald-600" size={48} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-tr from-slate-50 via-slate-100 to-slate-200">
      <Sidebar userLevel={userLevel} />
      
      <div className="flex-1 flex flex-col">
        <Navbar username={currentUser?.username || ""} userLevel={userLevel} />
        
        <main className="flex-1 p-8 overflow-y-auto w-full max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Security Audit Logs</h1>
              <p className="text-sm text-slate-500 mt-1">Real-time immutable database tracking of all system modifications and administrative actions.</p>
            </div>
            
            <button
              onClick={fetchLogsAndMe}
              className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 text-sm"
            >
              <RefreshCw size={16} />
              Refresh Logs
            </button>
          </div>

          {/* Search, Filter Toolbar */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Search logs by operator, details, or IP..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-700 font-medium"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Filter className="text-slate-400 shrink-0" size={18} />
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full md:w-48 px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold text-slate-700"
              >
                {actionCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "ALL" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Full-width Table of Logs */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("timestamp")}>
                      <span className="flex items-center gap-1.5">
                        Timestamp <ArrowUpDown size={12} />
                      </span>
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("username")}>
                      <span className="flex items-center gap-1.5">
                        Operator <ArrowUpDown size={12} />
                      </span>
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("action")}>
                      <span className="flex items-center gap-1.5">
                        Action Type <ArrowUpDown size={12} />
                      </span>
                    </th>
                    <th className="px-6 py-4">Action Details</th>
                    <th className="px-6 py-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {currentItems.length > 0 ? (
                    currentItems.map((log) => {
                      // Compact action badges color styling
                      let badgeClass = "bg-slate-100 text-slate-800 border-slate-200";
                      if (log.action.includes("CREATE")) {
                        badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      } else if (log.action.includes("DELETE")) {
                        badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
                      } else if (log.action.includes("UPDATE")) {
                        badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                      } else if (log.action === "LOGIN") {
                        badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
                      }

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-500 whitespace-nowrap">
                            <span className="flex items-center gap-2">
                              <Calendar size={14} className="text-slate-400" />
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-800 whitespace-nowrap">
                            {log.username}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${badgeClass}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-600">
                            {log.details}
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                            {log.ip_address || "Internal / N/A"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                        No audit log entries matching filters found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, totalItems)} of {totalItems} logs
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 rounded-lg text-xs font-bold tracking-wider hover:bg-slate-50 disabled:opacity-50 transition-all"
                  >
                    Prev
                  </button>
                  
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => paginate(i + 1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                        currentPage === i + 1
                          ? "bg-emerald-600 border border-emerald-600 text-white shadow-sm"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 rounded-lg text-xs font-bold tracking-wider hover:bg-slate-50 disabled:opacity-50 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
