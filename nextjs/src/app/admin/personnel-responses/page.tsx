"use client";

import { useEffect, useState, Fragment } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { 
  Loader2, 
  UserCheck, 
  Calendar, 
  Settings, 
  Star, 
  MessageSquare,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Printer,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface SurveyResponse {
  id: number;
  transaction_id: string;
  evaluator_user_id: number;
  client_type: string;
  region: string;
  sex: string;
  age: number;
  cc1: string;
  cc2: string;
  cc3: string;
  transaction_types: Record<string, string>;
  suggestions: string | null;
  email: string | null;
  created_on: string | null;
  sqd0: number;
  sqd1: number;
  sqd2: number;
  sqd3: number;
  sqd4: number;
  sqd5: number;
  sqd6: number;
  sqd7: number;
  sqd8: number;
}

export default function PersonnelResponsesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingData, setFetchingData] = useState(false);
  
  // Options lists loaded from DB
  const [usersList, setUsersList] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  
  // Filter settings
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  
  // Loaded responses list & UI states
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  // Searchable Target Personnel Dropdown states
  const [personnelRatings, setPersonnelRatings] = useState<Record<string, number>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Column Sorting and Questions map states
  const [sortField, setSortField] = useState<string>("created_on");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [questionsMap, setQuestionsMap] = useState<Record<string, string>>({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 20;

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  const fetchFilterOptions = async (token: string) => {
    const headers = { Authorization: `Bearer ${token}` };
    
    // 1. Fetch users list
    try {
      const usersRes = await fetch(`${apiBase}/users`, { headers });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const evaluators = usersData.filter((u: any) => 
          u.user_level === "Super" || u.user_level === "Admin" || u.user_level === "Unit"
        );
        setUsersList(evaluators);
        if (evaluators.length > 0) {
          setSelectedUserId(evaluators[0].id.toString());
        }
      }
    } catch (err) {
      console.error("Failed loading users list:", err);
    }

    // 2. Fetch services list
    try {
      const servicesRes = await fetch(`${apiBase}/services`, { headers });
      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setServicesList(servicesData);
      }
    } catch (err) {
      console.error("Failed loading services catalog:", err);
    }
    
    // 3. Fetch personnel ratings map
    try {
      const ratingsRes = await fetch(`${apiBase}/surveys/personnel-ratings`, { headers });
      if (ratingsRes.ok) {
        const ratingsData = await ratingsRes.json();
        setPersonnelRatings(ratingsData);
      }
    } catch (err) {
      console.error("Failed loading personnel ratings map:", err);
    }

    // 4. Fetch questions catalog mapping
    try {
      const questionsRes = await fetch(`${apiBase}/questions`, { headers });
      if (questionsRes.ok) {
        const qData = await questionsRes.json();
        const qMap: Record<string, string> = {};
        qData.forEach((q: any) => {
          qMap[q.question_id.toUpperCase()] = q.question_question;
        });
        setQuestionsMap(qMap);
      }
    } catch (err) {
      console.error("Failed loading questions catalog:", err);
    }
  };

  const loadPageData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const meRes = await fetch(`${apiBase}/auth/me`, { headers });
      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData);
      }

      await fetchFilterOptions(token || "");
    } catch (err) {
      console.error("Initial load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch individual raw survey responses
  const fetchResponses = async () => {
    if (!selectedUserId) return;
    setFetchingData(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const params = new URLSearchParams();
      params.append("evaluator_user_id", selectedUserId);
      if (selectedServiceId) params.append("service_id", selectedServiceId);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const res = await fetch(`${apiBase}/surveys/personnel-responses?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setResponses(data);
        setExpandedRowId(null);
      }
    } catch (err) {
      console.error("Failed fetching survey responses:", err);
    } finally {
      setFetchingData(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    fetchResponses();
  }, [selectedUserId, selectedServiceId, startDate, endDate]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortedResponses = () => {
    return [...responses].sort((a, b) => {
      let valA: any = a[sortField as keyof SurveyResponse];
      let valB: any = b[sortField as keyof SurveyResponse];

      if (sortField === "created_on") {
        valA = a.created_on ? new Date(a.created_on).getTime() : 0;
        valB = b.created_on ? new Date(b.created_on).getTime() : 0;
      }

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = (valB || "").toLowerCase();
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  const getPageNumbers = () => {
    const totalItems = getSortedResponses().length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const pages: (number | string)[] = [];
    
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("...");
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      pages.push(totalPages);
    }
    return pages;
  };

  const renderSortHeader = (label: string, field: string) => {
    const isActive = sortField === field;
    return (
      <th 
        scope="col" 
        onClick={() => handleSort(field)}
        className="px-6 py-4 text-left cursor-pointer hover:bg-slate-100 select-none group transition-colors print:pointer-events-none print:hover:bg-transparent bg-slate-50 sticky top-0 z-10 border-b border-slate-200 shadow-[inset_0_-1px_0_rgba(226,232,240,1)]"
      >
        <div className="flex items-center gap-1">
          <span>{label}</span>
          <span className={`text-slate-400 group-hover:text-slate-600 transition-colors print:hidden ${isActive ? "text-emerald-700 font-bold" : ""}`}>
            {isActive ? (
              sortDirection === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />
            ) : (
              <ArrowUpDown size={11} className="opacity-40 group-hover:opacity-100" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const toggleRow = (id: number) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "text-emerald-700 font-extrabold";
    if (rating === 3) return "text-amber-600 font-extrabold";
    return "text-rose-600 font-extrabold";
  };

  const sqdLabels = [
    "General Satisfaction",
    "Responsiveness (Speed)",
    "Reliability (Accuracy)",
    "Access & Clean Facilities",
    "Communication (Guidance)",
    "Costs (Integrity)",
    "Process (Integrity)",
    "Assurance (Security)",
    "Service Outcome"
  ];

  const handlePrint = () => {
    window.print();
  };

  const totalItems = responses.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-emerald-700" size={36} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 print:bg-white print:p-0">
      
      {/* Sidebar hidden when printing reports */}
      <div className="print:hidden">
        <Sidebar userLevel={currentUser?.user_level || "Super"} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full">
        <div className="print:hidden">
          <Navbar username={currentUser?.username || "Admin"} userLevel={currentUser?.user_level || "Super"} />
        </div>

        <main className="flex-1 p-6 md:p-8 flex flex-col space-y-6 overflow-y-auto print:p-0 print:m-0">
          
          {/* Header block */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-5 print:border-none print:pb-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2 print:text-lg">
                <FileSpreadsheet className="text-emerald-700" size={24} />
                <span>Personnel Detailed Responses Ledger</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1 print:hidden">
                Query individual survey evaluations, drill down into SQD scorecards, and print ledger reports.
              </p>
            </div>
            
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm hover:bg-slate-50 transition-all print:hidden"
            >
              <Printer size={14} className="text-emerald-700" />
              <span>Print Ledger Report</span>
            </button>
          </div>

          {/* Filtering Ribbon - Hidden on print */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-wrap gap-4 items-center print:hidden">
            
            {/* Personnel target */}
            <div className="flex flex-col gap-1 text-xs relative">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] flex items-center gap-1">
                <UserCheck size={11} className="text-emerald-700" />
                <span>Target Personnel</span>
              </label>
              
              <button 
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-black font-semibold flex items-center justify-between gap-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-[240px] text-left"
              >
                <span className="truncate">
                  {selectedUserId ? (() => {
                    const selected = usersList.find(u => u.id.toString() === selectedUserId);
                    if (!selected) return "-- Select Personnel --";
                    const rating = personnelRatings[selectedUserId];
                    return `${selected.first_name || ""} ${selected.last_name || ""} (${rating ? `★ ${rating.toFixed(2)}` : "No ratings"})`;
                  })() : "-- Select Personnel --"}
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
                    {usersList.filter(u => {
                      const nameStr = `${u.first_name || ""} ${u.last_name || ""} ${u.username}`.toLowerCase();
                      return nameStr.includes(searchQuery.toLowerCase());
                    }).map(u => {
                      const rating = personnelRatings[u.id.toString()];
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedUserId(u.id.toString());
                            setDropdownOpen(false);
                            setSearchQuery("");
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[10px] font-semibold flex items-center justify-between hover:bg-slate-50 ${u.id.toString() === selectedUserId ? "bg-emerald-50 text-emerald-800" : "text-slate-700"}`}
                        >
                          <span className="truncate max-w-[170px]">{u.first_name || ""} {u.last_name || ""}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${rating ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                            {rating ? `★ ${rating.toFixed(2)}` : "No rating"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Service filter */}
            <div className="flex flex-col gap-1 text-xs">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] flex items-center gap-1">
                <Settings size={11} className="text-emerald-700" />
                <span>Service Type</span>
              </label>
              <select 
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-black font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[220px]"
              >
                <option value="">All Services</option>
                {servicesList.map(svc => (
                  <option key={svc.id} value={svc.id}>
                    {svc.service_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="flex flex-col gap-1 text-xs">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] flex items-center gap-1">
                <Calendar size={11} className="text-emerald-700" />
                <span>Start Date</span>
              </label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-black font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* End Date */}
            <div className="flex flex-col gap-1 text-xs">
              <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] flex items-center gap-1">
                <Calendar size={11} className="text-emerald-700" />
                <span>End Date</span>
              </label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-black font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {fetchingData && (
              <div className="flex items-center gap-1 text-xs text-slate-450 font-bold ml-auto self-end pb-2">
                <Loader2 className="animate-spin text-emerald-700" size={14} />
                <span>Loading responses...</span>
              </div>
            )}

          </div>

          {/* Table list of responses */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden print:border-none print:shadow-none">
            
            <div className="overflow-x-auto relative">
              <table className="min-w-full divide-y divide-slate-200 text-xs font-semibold text-slate-650">
                <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-wider print:bg-white print:text-slate-800">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left bg-slate-50 sticky top-0 z-10 border-b border-slate-200 shadow-[inset_0_-1px_0_rgba(226,232,240,1)]">Transaction ID</th>
                    {renderSortHeader("Date Submitted", "created_on")}
                    {renderSortHeader("Client Type", "client_type")}
                    {renderSortHeader("Overall Score (SQD0)", "sqd0")}
                    <th scope="col" className="px-6 py-4 text-left bg-slate-50 sticky top-0 z-10 border-b border-slate-200 shadow-[inset_0_-1px_0_rgba(226,232,240,1)]">SQD Breakdown (0-8)</th>
                    <th scope="col" className="px-6 py-4 text-left bg-slate-50 sticky top-0 z-10 border-b border-slate-200 shadow-[inset_0_-1px_0_rgba(226,232,240,1)]">Services Availed</th>
                    <th scope="col" className="px-6 py-4 text-center print:hidden bg-slate-50 sticky top-0 z-10 border-b border-slate-200 shadow-[inset_0_-1px_0_rgba(226,232,240,1)]">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white print:divide-slate-200">
                  {responses.length > 0 ? (
                    getSortedResponses().slice((currentPage - 1) * pageSize, currentPage * pageSize).map((s) => {
                      const dateStr = s.created_on 
                        ? new Date(s.created_on).toLocaleDateString()
                        : "N/A";
                      const isExpanded = expandedRowId === s.id;
                      
                      return (
                        <Fragment key={s.id}>
                          <tr 
                            onClick={() => toggleRow(s.id)}
                            className="hover:bg-slate-50/50 cursor-pointer transition-colors print:hover:bg-transparent"
                          >
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-[10px] text-slate-500">
                              {s.transaction_id.substring(0, 8)}...
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-500">
                              {dateStr}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 text-[9px] font-bold uppercase">
                                {s.client_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className={getRatingColor(s.sqd0)}>{s.sqd0}.0 ★</span>
                                <div className="flex gap-0.5">
                                  {[...Array(5)].map((_, i) => (
                                    <Star 
                                      key={i} 
                                      size={10} 
                                      className={i < s.sqd0 ? "text-amber-400 fill-amber-400" : "text-slate-150"} 
                                    />
                                  ))}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-1 flex-wrap max-w-[270px]">
                                {[...Array(9)].map((_, idx) => {
                                  const val = (s as any)[`sqd${idx}`] !== undefined ? (s as any)[`sqd${idx}`] : 5;
                                  const colorClass = val >= 4 
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-150" 
                                    : val === 3 
                                    ? "bg-amber-50 text-amber-700 border-amber-150" 
                                    : "bg-rose-50 text-rose-700 border-rose-150";
                                  const questionText = questionsMap[`SQD${idx}`] || "N/A";
                                  return (
                                    <div 
                                      key={idx} 
                                      className={`w-5 h-5 rounded border flex items-center justify-center text-[8px] font-black cursor-help ${colorClass}`}
                                      title={`${sqdLabels[idx]}: ${val}.0\n\nQuestion: "${questionText}"`}
                                    >
                                      {val}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-4 max-w-[220px] truncate text-slate-500">
                              {Object.values(s.transaction_types).join(", ") || "General Inquiry"}
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap print:hidden">
                              <button className="text-emerald-700 hover:text-emerald-800 focus:outline-none">
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </td>
                          </tr>

                          {/* Row Expansion details panel */}
                          {isExpanded && (
                            <tr key={`${s.id}-details`} className="bg-slate-50/30 print:bg-transparent">
                              <td colSpan={7} className="px-8 py-5 border-t border-b border-slate-200/50">
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  
                                  {/* Left: Demographics & Citizen Charter */}
                                  <div className="space-y-4">
                                    
                                    <div className="space-y-1">
                                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <FileText size={12} className="text-emerald-700" />
                                        <span>Client Information</span>
                                      </h4>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] text-slate-500 pt-1">
                                        <div><strong>Email:</strong> {s.email || "N/A"}</div>
                                        <div><strong>Region:</strong> {s.region}</div>
                                        <div><strong>Sex / Age:</strong> {s.sex} / {s.age} yrs</div>
                                      </div>
                                    </div>

                                    <div className="space-y-1 pt-2 border-t border-slate-200/50">
                                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <span>Citizen's Charter (CC) Replies</span>
                                      </h4>
                                      <div className="space-y-1.5 text-[10px] text-slate-500 pt-1 leading-relaxed">
                                        <div><strong>CC1 (Awareness):</strong> {s.cc1 === "4" ? "N/A" : s.cc1 === "1" ? "Saw CC in office" : s.cc1 === "2" ? "Saw CC online" : "Did not see CC"}</div>
                                        <div><strong>CC2 (Visibility):</strong> {s.cc2 === "4" ? "N/A" : s.cc2 === "1" ? "CC was easy to see" : s.cc2 === "2" ? "CC was hard to see" : "CC was not visible"}</div>
                                        <div><strong>CC3 (Helpfulness):</strong> {s.cc3 === "4" ? "N/A" : s.cc3 === "1" ? "CC helped very much" : s.cc3 === "2" ? "CC helped somewhat" : "CC did not help"}</div>
                                      </div>
                                    </div>

                                    {s.suggestions && (
                                      <div className="space-y-1 pt-2 border-t border-slate-200/50">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                          <MessageSquare size={12} className="text-emerald-700" />
                                          <span>Customer Suggestions & Recommendations</span>
                                        </h4>
                                        <p className="text-[11px] font-medium text-slate-500 italic bg-white p-3 rounded-xl border border-slate-200/40 leading-relaxed shadow-sm mt-1">
                                          "{s.suggestions}"
                                        </p>
                                      </div>
                                    )}

                                  </div>

                                  {/* Right: Full 9 SQD Scorecard */}
                                  <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/50 shadow-sm">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-100 flex items-center gap-1.5">
                                      <Star size={12} className="text-amber-500" />
                                      <span>Service Quality Dimension Ratings (SQD)</span>
                                    </h4>

                                    <div className="space-y-2">
                                      {sqdLabels.map((lbl, idx) => {
                                        const val = (s as any)[`sqd${idx}`];
                                        const questionText = questionsMap[`SQD${idx}`] || lbl;
                                        return (
                                          <div key={idx} className="flex justify-between items-start gap-4 text-[10px] font-semibold py-1 border-b border-slate-50 last:border-none">
                                            <span className="text-slate-500 leading-relaxed text-left flex-1">{questionText}</span>
                                            <span className="flex items-center gap-1 flex-shrink-0 pt-0.5">
                                              <span className={getRatingColor(val)}>{val !== undefined ? val : "5"}.0</span>
                                              <Star size={10} className="text-amber-500 fill-amber-500" />
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                </div>

                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-semibold text-xs">
                        No detailed survey responses found matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-500">
                <div className="text-slate-450">
                  Showing {Math.min(startIndex + 1, totalItems)} to {Math.min(endIndex, totalItems)} of {totalItems} entries
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  
                  {getPageNumbers().map((num, i) => (
                    <button
                      key={i}
                      onClick={() => typeof num === "number" && setCurrentPage(num)}
                      disabled={num === "..."}
                      className={`px-3 py-1.5 rounded-xl border text-center min-w-[34px] transition-colors ${
                        num === currentPage
                          ? "bg-emerald-700 border-emerald-700 text-white font-bold"
                          : num === "..."
                          ? "border-transparent bg-transparent text-slate-400 cursor-default"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {num}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
