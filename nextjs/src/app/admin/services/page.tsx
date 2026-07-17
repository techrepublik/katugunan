"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Briefcase 
} from "lucide-react";

interface Service {
  id: number;
  service_name: string;
  service_no: number;
  service_type: string;
  service_time?: string;
  service_is_payment: boolean;
  org_node_id?: number;
}

interface OrgNode {
  id: number;
  name: string;
  node_type: string;
}

type SortField = "service_name" | "service_no" | "service_type" | "service_time" | "service_is_payment";
type SortOrder = "asc" | "desc";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Pagination & Sorting States
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("service_name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);

  // Modal Form Fields
  const [serviceName, setServiceName] = useState("");
  const [serviceNo, setServiceNo] = useState(0);
  const [serviceType, setServiceType] = useState("Internal");
  const [serviceTime, setServiceTime] = useState("");
  const [serviceIsPayment, setServiceIsPayment] = useState(false);
  const [orgNodeId, setOrgNodeId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchServicesAndNodes = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const servicesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/services`, { headers });
      const nodesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/org-nodes`, { headers });

      if (servicesRes.ok) setServices(await servicesRes.json());
      if (nodesRes.ok) setNodes((await nodesRes.json()).filter((n: OrgNode) => n.node_type === "POSITION"));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicesAndNodes();
  }, []);

  const openAddModal = () => {
    setEditingServiceId(null);
    setServiceName("");
    setServiceNo(0);
    setServiceType("Internal");
    setServiceTime("");
    setServiceIsPayment(false);
    setOrgNodeId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Service) => {
    setEditingServiceId(s.id);
    setServiceName(s.service_name);
    setServiceNo(s.service_no);
    setServiceType(s.service_type);
    setServiceTime(s.service_time || "");
    setServiceIsPayment(s.service_is_payment);
    setOrgNodeId(s.org_node_id || null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const isEditing = editingServiceId !== null;
      const url = isEditing
        ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/services/${editingServiceId}`
        : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/services`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          service_name: serviceName.trim(),
          service_no: serviceNo,
          service_type: serviceType,
          service_time: serviceTime.trim() || null,
          service_is_payment: serviceIsPayment,
          org_node_id: orgNodeId,
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchServicesAndNodes();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to save service");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/services/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchServicesAndNodes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Sorting Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Filter & Sort Logic
  const filteredServices = services.filter(s => {
    const query = searchQuery.toLowerCase();
    const nodeName = nodes.find(n => n.id === s.org_node_id)?.name || "";
    return (
      s.service_name.toLowerCase().includes(query) ||
      s.service_type.toLowerCase().includes(query) ||
      (s.service_time && s.service_time.toLowerCase().includes(query)) ||
      nodeName.toLowerCase().includes(query)
    );
  });

  const sortedServices = [...filteredServices].sort((a, b) => {
    let aVal: any = a[sortField];
    let bVal: any = b[sortField];

    if (typeof aVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = (bVal || "").toLowerCase();
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination Logic
  const totalItems = sortedServices.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedServices = sortedServices.slice(startIndex, startIndex + itemsPerPage);

  const getPositionName = (nodeId?: number) => {
    if (!nodeId) return "None";
    return nodes.find(n => n.id === nodeId)?.name || "Unknown";
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userLevel="Super" />
      <div className="flex-1 flex flex-col">
        <Navbar username="Admin" userLevel="Super" />
        
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Service Catalog</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Manage external and internal services offered across offices.
                </p>
              </div>
              <button 
                onClick={openAddModal}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm self-start md:self-auto"
              >
                <Plus size={14} />
                <span>Add Offered Service</span>
              </button>
            </div>

            {/* Main table card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col space-y-4">
              
              {/* Filter controls */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Search */}
                <div className="relative w-full md:max-w-sm">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search catalog entries..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Items per page selector */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <span className="text-xs text-slate-450">Show</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(parseInt(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-xs text-slate-450">entries</span>
                </div>
              </div>

              {/* Table */}
              {loading ? (
                <div className="min-h-[300px] flex items-center justify-center">
                  <Loader2 className="animate-spin text-emerald-700" size={36} />
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {/* Service Name Header */}
                        <th 
                          onClick={() => handleSort("service_name")}
                          className="p-4 font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Service Name</span>
                            <ArrowUpDown size={12} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                          </div>
                        </th>
                        
                        {/* Service No Header */}
                        <th 
                          onClick={() => handleSort("service_no")}
                          className="p-4 font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group w-[120px]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Service No</span>
                            <ArrowUpDown size={12} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                          </div>
                        </th>

                        {/* Service Type Header */}
                        <th 
                          onClick={() => handleSort("service_type")}
                          className="p-4 font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group w-[140px]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Service Type</span>
                            <ArrowUpDown size={12} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                          </div>
                        </th>

                        {/* Service Time Header */}
                        <th 
                          onClick={() => handleSort("service_time")}
                          className="p-4 font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group w-[140px]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Service Time</span>
                            <ArrowUpDown size={12} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                          </div>
                        </th>

                        {/* Requires Payment Header */}
                        <th 
                          onClick={() => handleSort("service_is_payment")}
                          className="p-4 font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group w-[140px]"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Requires Payment</span>
                            <ArrowUpDown size={12} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                          </div>
                        </th>

                        {/* Position Node Column */}
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider w-[200px]">
                          Position Node
                        </th>

                        {/* Actions Header */}
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-right w-[120px]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedServices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400">
                            No service catalog entries found.
                          </td>
                        </tr>
                      ) : (
                        paginatedServices.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="p-4 font-bold text-slate-800">{s.service_name}</td>
                            <td className="p-4 text-slate-600 font-semibold">{s.service_no}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border ${
                                s.service_type === "Internal" 
                                  ? "bg-slate-50 text-slate-700 border-slate-150" 
                                  : "bg-emerald-50 text-emerald-800 border-emerald-100"
                              }`}>
                                {s.service_type}
                              </span>
                            </td>
                            <td className="p-4 text-slate-600 font-medium">{s.service_time || "N/A"}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border ${
                                s.service_is_payment 
                                  ? "bg-amber-50 text-amber-800 border-amber-100" 
                                  : "bg-slate-50 text-slate-550 border-slate-150"
                              }`}>
                                {s.service_is_payment ? "Yes" : "No"}
                              </span>
                            </td>
                            <td className="p-4 text-slate-600 font-medium">{getPositionName(s.org_node_id)}</td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => openEditModal(s)}
                                  className="p-1.5 text-slate-450 hover:text-emerald-700 rounded-lg hover:bg-slate-50 transition-all"
                                  title="Edit Offered Service"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteService(s.id)}
                                  className="p-1.5 text-slate-450 hover:text-red-650 rounded-lg hover:bg-red-50 transition-all"
                                  title="Delete Offered Service"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination controls */}
              {!loading && totalItems > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">
                    Showing <span className="font-semibold text-slate-800">{startIndex + 1}</span> to{" "}
                    <span className="font-semibold text-slate-800">
                      {Math.min(startIndex + itemsPerPage, totalItems)}
                    </span>{" "}
                    of <span className="font-semibold text-slate-800">{totalItems}</span> entries
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(idx + 1)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold border transition-all ${
                          currentPage === idx + 1
                            ? "bg-emerald-700 border-emerald-700 text-white shadow-sm"
                            : "bg-white border-slate-250 text-slate-650 hover:bg-slate-50"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Elegant Modal Backdrop & Window */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div 
            className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-lg w-full overflow-hidden transform scale-100 transition-all"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-sm">
                  <Briefcase size={16} />
                </div>
                <div>
                  <h2 className="text-md font-bold text-slate-800">
                    {editingServiceId ? "Edit Offered Service" : "Add Offered Service"}
                  </h2>
                  <p className="text-[10px] text-slate-400">Specify details for dynamic user scoping</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Service Name</label>
                <input 
                  type="text" 
                  required
                  value={serviceName} 
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="e.g. Issuance of Transcript of Records"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Service Number</label>
                <input 
                  type="number" 
                  required
                  value={serviceNo} 
                  onChange={(e) => setServiceNo(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Service Type</label>
                  <select 
                    value={serviceType} 
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="Internal">Internal</option>
                    <option value="External">External</option>
                    <option value="All">All</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Position Node</label>
                  <select 
                    value={orgNodeId || ""} 
                    onChange={(e) => setOrgNodeId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  >
                    <option value="">None</option>
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Processing Time</label>
                <input 
                  type="text" 
                  value={serviceTime} 
                  onChange={(e) => setServiceTime(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="e.g. 15 minutes, 3 days"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="payment"
                  checked={serviceIsPayment} 
                  onChange={(e) => setServiceIsPayment(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-200 text-emerald-700 focus:ring-emerald-500"
                />
                <label htmlFor="payment" className="text-[10px] font-bold text-slate-550 uppercase tracking-wider cursor-pointer">Requires Payment</label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 -mx-6 -mb-6 p-6 bg-slate-50/50">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {saving && <Loader2 className="animate-spin" size={14} />}
                  <span>{editingServiceId ? "Save Changes" : "Create Service"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
