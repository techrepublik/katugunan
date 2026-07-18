"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { Loader2, Plus, Trash, Users, MapPin, ChevronDown, ChevronUp, Edit2, Check, X } from "lucide-react";
import Toast from "@/components/Toast";

interface ClientType {
  id: number;
  name: string;
}

interface Region {
  id: number;
  name: string;
}

export default function MetadataPage() {
  const [clientTypes, setClientTypes] = useState<ClientType[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  // Accordion Expand/Collapse States (Collapsed by default)
  const [ctExpanded, setCtExpanded] = useState(false);
  const [regExpanded, setRegExpanded] = useState(false);

  // New Record Form Fields
  const [newClientType, setNewClientType] = useState("");
  const [newRegion, setNewRegion] = useState("");
  const [addingCt, setAddingCt] = useState(false);
  const [addingReg, setAddingReg] = useState(false);

  // Inline Editing States
  const [editingCtId, setEditingCtId] = useState<number | null>(null);
  const [editingCtValue, setEditingCtValue] = useState("");
  const [updatingCtId, setUpdatingCtId] = useState<number | null>(null);

  const [editingRegId, setEditingRegId] = useState<number | null>(null);
  const [editingRegValue, setEditingRegValue] = useState("");
  const [updatingRegId, setUpdatingRegId] = useState<number | null>(null);

  const fetchMetadata = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const ctRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/client-types`, { headers });
      const regRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/regions`, { headers });

      if (ctRes.ok) setClientTypes(await ctRes.json());
      if (regRes.ok) setRegions(await regRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  const handleAddClientType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientType.trim()) return;
    setAddingCt(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/client-types`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newClientType.trim() })
      });

      if (res.ok) {
        showToast("Client type added successfully!");
        setNewClientType("");
        fetchMetadata();
      } else {
        const data = await res.json();
        showToast(data.detail || "Failed to add client type", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("A network error occurred.", "error");
    } finally {
      setAddingCt(false);
    }
  };

  const handleAddRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegion.trim()) return;
    setAddingReg(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/regions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newRegion.trim() })
      });

      if (res.ok) {
        showToast("Region added successfully!");
        setNewRegion("");
        fetchMetadata();
      } else {
        const data = await res.json();
        showToast(data.detail || "Failed to add region", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("A network error occurred.", "error");
    } finally {
      setAddingReg(false);
    }
  };

  const handleUpdateClientType = async (id: number) => {
    if (!editingCtValue.trim()) return;
    setUpdatingCtId(id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/client-types/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: editingCtValue.trim() })
      });

      if (res.ok) {
        showToast("Client type updated successfully!");
        setEditingCtId(null);
        setEditingCtValue("");
        fetchMetadata();
      } else {
        const data = await res.json();
        showToast(data.detail || "Failed to update client type", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("A network error occurred.", "error");
    } finally {
      setUpdatingCtId(null);
    }
  };

  const handleUpdateRegion = async (id: number) => {
    if (!editingRegValue.trim()) return;
    setUpdatingRegId(id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/regions/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: editingRegValue.trim() })
      });

      if (res.ok) {
        showToast("Region updated successfully!");
        setEditingRegId(null);
        setEditingRegValue("");
        fetchMetadata();
      } else {
        const data = await res.json();
        showToast(data.detail || "Failed to update region", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("A network error occurred.", "error");
    } finally {
      setUpdatingRegId(null);
    }
  };

  const handleDeleteClientType = async (id: number) => {
    if (!confirm("Are you sure you want to delete this client type? This may affect surveys referencing it.")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/client-types/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Client type deleted successfully!");
        fetchMetadata();
      } else {
        const data = await res.json();
        showToast(data.detail || "Failed to delete client type", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("A network error occurred.", "error");
    }
  };

  const handleDeleteRegion = async (id: number) => {
    if (!confirm("Are you sure you want to delete this region? This may affect surveys referencing it.")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/regions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Region deleted successfully!");
        fetchMetadata();
      } else {
        const data = await res.json();
        showToast(data.detail || "Failed to delete region", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("A network error occurred.", "error");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userLevel="Super" />
      <div className="flex-1 flex flex-col">
        <Navbar username="Admin" userLevel="Super" />
        
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Dynamic Survey Dropdowns</h1>
              <p className="text-sm text-slate-500 mt-1">
                Configure option fields for Client Type and Region dropdowns available on client feedback surveys.
              </p>
            </div>

            {loading ? (
              <div className="min-h-[400px] flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-200">
                <Loader2 className="animate-spin text-emerald-700" size={36} />
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Client Types Accordion Box (Full Width) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
                  <button 
                    onClick={() => setCtExpanded(!ctExpanded)}
                    className="w-full flex items-center justify-between p-5 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-sm">
                        <Users size={18} />
                      </div>
                      <div className="text-left">
                        <h2 className="text-md font-bold text-slate-800">Client Types</h2>
                        <p className="text-xs text-slate-400">Expand to manage classifications like Student, Visitor, etc.</p>
                      </div>
                    </div>
                    {ctExpanded ? <ChevronUp className="text-slate-400" size={18} /> : <ChevronDown className="text-slate-400" size={18} />}
                  </button>

                  <div className={`transition-all duration-300 ${ctExpanded ? "max-h-[1000px] opacity-100 p-6 border-t border-slate-100" : "max-h-0 opacity-0 overflow-hidden p-0"}`}>
                    {ctExpanded && (
                      <div className="space-y-5">
                        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                          {clientTypes.length === 0 ? (
                            <div className="p-4 text-slate-400 text-xs text-center">No client types found</div>
                          ) : (
                            clientTypes.map(ct => {
                              const isEditing = editingCtId === ct.id;
                              const isUpdating = updatingCtId === ct.id;
                              return (
                                <div 
                                  key={ct.id} 
                                  className={`flex justify-between items-center p-3.5 transition-colors ${
                                    isEditing ? "bg-slate-50" : "bg-white hover:bg-slate-50/50"
                                  }`}
                                >
                                  {isEditing ? (
                                    <div className="flex-1 flex gap-2 items-center">
                                      <input 
                                        type="text" 
                                        required
                                        value={editingCtValue}
                                        onChange={(e) => setEditingCtValue(e.target.value)}
                                        className="flex-1 max-w-md bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 font-semibold text-slate-700"
                                        autoFocus
                                      />
                                      <button 
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleUpdateClientType(ct.id)}
                                        className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg"
                                      >
                                        {isUpdating ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          setEditingCtId(null);
                                          setEditingCtValue("");
                                        }}
                                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-xs font-semibold text-slate-700">{ct.name}</span>
                                      <div className="flex gap-1.5">
                                        <button 
                                          onClick={() => {
                                            setEditingCtId(ct.id);
                                            setEditingCtValue(ct.name);
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-slate-50 transition-all"
                                          title="Rename"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteClientType(ct.id)}
                                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all"
                                          title="Delete"
                                        >
                                          <Trash size={12} />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        <form onSubmit={handleAddClientType} className="flex gap-2 max-w-md">
                          <input 
                            type="text" 
                            required
                            value={newClientType}
                            onChange={(e) => setNewClientType(e.target.value)}
                            placeholder="Add new client type (e.g. Partner, Organization)"
                            className="flex-1 px-3.5 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                          <button 
                            type="submit" 
                            disabled={addingCt}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            {addingCt ? <Loader2 className="animate-spin" size={12} /> : <Plus size={12} />}
                            <span>Add</span>
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>

                {/* Regions Accordion Box (Full Width) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
                  <button 
                    onClick={() => setRegExpanded(!regExpanded)}
                    className="w-full flex items-center justify-between p-5 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-sm">
                        <MapPin size={18} />
                      </div>
                      <div className="text-left">
                        <h2 className="text-md font-bold text-slate-800">Regions</h2>
                        <p className="text-xs text-slate-400">Expand to manage survey regions like NCR, Region XII, etc.</p>
                      </div>
                    </div>
                    {regExpanded ? <ChevronUp className="text-slate-400" size={18} /> : <ChevronDown className="text-slate-400" size={18} />}
                  </button>

                  <div className={`transition-all duration-300 ${regExpanded ? "max-h-[1000px] opacity-100 p-6 border-t border-slate-100" : "max-h-0 opacity-0 overflow-hidden p-0"}`}>
                    {regExpanded && (
                      <div className="space-y-5">
                        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                          {regions.length === 0 ? (
                            <div className="p-4 text-slate-400 text-xs text-center">No regions found</div>
                          ) : (
                            regions.map(r => {
                              const isEditing = editingRegId === r.id;
                              const isUpdating = updatingRegId === r.id;
                              return (
                                <div 
                                  key={r.id} 
                                  className={`flex justify-between items-center p-3.5 transition-colors ${
                                    isEditing ? "bg-slate-50" : "bg-white hover:bg-slate-50/50"
                                  }`}
                                >
                                  {isEditing ? (
                                    <div className="flex-1 flex gap-2 items-center">
                                      <input 
                                        type="text" 
                                        required
                                        value={editingRegValue}
                                        onChange={(e) => setEditingRegValue(e.target.value)}
                                        className="flex-1 max-w-md bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 font-semibold text-slate-700"
                                        autoFocus
                                      />
                                      <button 
                                        type="button"
                                        disabled={isUpdating}
                                        onClick={() => handleUpdateRegion(r.id)}
                                        className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg"
                                      >
                                        {isUpdating ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          setEditingRegId(null);
                                          setEditingRegValue("");
                                        }}
                                        className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <span className="text-xs font-semibold text-slate-700">{r.name}</span>
                                      <div className="flex gap-1.5">
                                        <button 
                                          onClick={() => {
                                            setEditingRegId(r.id);
                                            setEditingRegValue(r.name);
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-slate-50 transition-all"
                                          title="Rename"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteRegion(r.id)}
                                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all"
                                          title="Delete"
                                        >
                                          <Trash size={12} />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>

                        <form onSubmit={handleAddRegion} className="flex gap-2 max-w-md">
                          <input 
                            type="text" 
                            required
                            value={newRegion}
                            onChange={(e) => setNewRegion(e.target.value)}
                            placeholder="Add new region (e.g. CAR, Region XI)"
                            className="flex-1 px-3.5 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                          <button 
                            type="submit" 
                            disabled={addingReg}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            {addingReg ? <Loader2 className="animate-spin" size={12} /> : <Plus size={12} />}
                            <span>Add</span>
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </main>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
