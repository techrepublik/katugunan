"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { Loader2, Plus, Trash } from "lucide-react";

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

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);

  // Form Fields
  const [serviceName, setServiceName] = useState("");
  const [serviceNo, setServiceNo] = useState(0);
  const [serviceType, setServiceType] = useState("Internal");
  const [serviceTime, setServiceTime] = useState("");
  const [serviceIsPayment, setServiceIsPayment] = useState(false);
  const [orgNodeId, setOrgNodeId] = useState<number | null>(null);

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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          service_name: serviceName,
          service_no: serviceNo,
          service_type: serviceType,
          service_time: serviceTime || null,
          service_is_payment: serviceIsPayment,
          org_node_id: orgNodeId,
        })
      });

      if (res.ok) {
        setServiceName("");
        setServiceNo(0);
        setServiceTime("");
        setServiceIsPayment(false);
        setOrgNodeId(null);
        setEditingServiceId(null);
        fetchServicesAndNodes();
      }
    } catch (err) {
      console.error(err);
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

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userLevel="Super" />
      <div className="flex-1 flex flex-col">
        <Navbar username="Admin" userLevel="Super" />
        
        <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Service Catalog</h2>
            
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-700" size={30} />
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 font-semibold text-slate-700">Service Name</th>
                      <th className="p-3 font-semibold text-slate-700">Service No</th>
                      <th className="p-3 font-semibold text-slate-700">Service Type</th>
                      <th className="p-3 font-semibold text-slate-700">Service Time</th>
                      <th className="p-3 font-semibold text-slate-700">Requires Payment</th>
                      <th className="p-3 font-semibold text-slate-700 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {services.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-medium text-slate-900">{s.service_name}</td>
                        <td className="p-3 text-slate-600">{s.service_no}</td>
                        <td className="p-3 text-slate-700">{s.service_type}</td>
                        <td className="p-3 text-slate-700">{s.service_time || "N/A"}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            s.service_is_payment ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                          }`}>
                            {s.service_is_payment ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => {
                              setEditingServiceId(s.id);
                              setServiceName(s.service_name);
                              setServiceNo(s.service_no);
                              setServiceType(s.service_type);
                              setServiceTime(s.service_time || "");
                              setServiceIsPayment(s.service_is_payment);
                              setOrgNodeId(s.org_node_id || null);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-semibold text-xs transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteService(s.id)}
                            className="text-red-600 hover:text-red-800 font-semibold text-xs transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              {editingServiceId ? "Edit Offered Service" : "Add Offered Service"}
            </h2>
            
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Service Name</label>
                <input 
                  type="text" 
                  required
                  value={serviceName} 
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Issuance of Transcript"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Service Number</label>
                <input 
                  type="number" 
                  required
                  value={serviceNo} 
                  onChange={(e) => setServiceNo(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Service Type</label>
                  <select 
                    value={serviceType} 
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  >
                    <option value="Internal">Internal</option>
                    <option value="External">External</option>
                    <option value="All">All</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Position Node</label>
                  <select 
                    value={orgNodeId || ""} 
                    onChange={(e) => setOrgNodeId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  >
                    <option value="">None</option>
                    {nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Processing Time</label>
                <input 
                  type="text" 
                  value={serviceTime} 
                  onChange={(e) => setServiceTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  placeholder="e.g. 15 minutes"
                />
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="payment"
                  checked={serviceIsPayment} 
                  onChange={(e) => setServiceIsPayment(e.target.checked)}
                  className="h-4 w-4 border-slate-200 text-emerald-700"
                />
                <label htmlFor="payment" className="text-xs font-semibold text-slate-600 uppercase">Requires Payment</label>
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2 rounded-lg transition-all"
              >
                {editingServiceId ? "Save Changes" : "Add Service"}
              </button>

              {editingServiceId && (
                <button 
                  type="button"
                  onClick={() => {
                    setServiceName("");
                    setServiceNo(0);
                    setServiceTime("");
                    setServiceIsPayment(false);
                    setOrgNodeId(null);
                    setEditingServiceId(null);
                  }}
                  className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2 rounded-lg transition-all mt-2"
                >
                  Cancel Edit
                </button>
              )}
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
