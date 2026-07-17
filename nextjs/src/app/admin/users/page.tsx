"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { Loader2, Plus, Trash, UserPlus, FileText, QrCode, Printer } from "lucide-react";

interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_level: string;
  org_node_id?: number;
  picture_url?: string;
  qrcode_image_url?: string;
  qrcode_payload?: string;
}

interface OrgNode {
  id: number;
  name: string;
  node_type: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewQrUser, setViewQrUser] = useState<User | null>(null);

  // Form Fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userLevel, setUserLevel] = useState("Client");
  const [orgNodeId, setOrgNodeId] = useState<number | null>(null);

  const fetchUsersAndNodes = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const usersRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/users`, { headers });
      const nodesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/org-nodes`, { headers });
      const servicesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/services`, { headers });

      if (usersRes.ok) setUsers(await usersRes.json());
      if (nodesRes.ok) setNodes(await nodesRes.json());
      if (servicesRes.ok) setServices(await servicesRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndNodes();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          username,
          email,
          password,
          first_name: firstName || null,
          last_name: lastName || null,
          user_level: userLevel,
          org_node_id: orgNodeId,
        })
      });

      if (res.ok) {
        setUsername("");
        setEmail("");
        setPassword("");
        setFirstName("");
        setLastName("");
        setOrgNodeId(null);
        fetchUsersAndNodes();
      } else {
        const errorData = await res.json();
        alert(errorData.detail || "Error adding user");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsersAndNodes();
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
            <h2 className="text-lg font-bold text-slate-800 mb-4">User Directory</h2>
            
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-700" size={30} />
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 font-semibold text-slate-700">Username</th>
                      <th className="p-3 font-semibold text-slate-700">Full Name / Role</th>
                      <th className="p-3 font-semibold text-slate-700">Email</th>
                      <th className="p-3 font-semibold text-slate-700">Department / Office</th>
                      <th className="p-3 font-semibold text-slate-700">Services Offered</th>
                      <th className="p-3 font-semibold text-slate-700">QR Payload</th>
                      <th className="p-3 font-semibold text-slate-700 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => {
                      const userNode = nodes.find(n => n.id === u.org_node_id);
                      const userServices = services.filter(s => s.org_node_id === u.org_node_id);
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-medium text-slate-900">{u.username}</td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{u.first_name} {u.last_name}</div>
                            <span className="inline-block mt-0.5 bg-slate-100 text-slate-800 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded">
                              {u.user_level}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 text-xs">{u.email}</td>
                          <td className="p-3 text-xs">
                            {userNode ? (
                              <div>
                                <span className="font-semibold text-slate-700">{userNode.name}</span>
                                <span className="block text-[9px] text-slate-400 uppercase tracking-wider">{userNode.node_type}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">Not Assigned</span>
                            )}
                          </td>
                          <td className="p-3 text-xs">
                            {userServices.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {userServices.map(s => (
                                  <span key={s.id} className="inline-block text-[9px] bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-100">
                                    {s.service_name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">No Services</span>
                            )}
                          </td>
                          <td className="p-3">
                            {u.qrcode_payload ? (
                              <button
                                onClick={() => setViewQrUser(u)}
                                className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/80 px-2 py-1 rounded font-medium transition-all"
                              >
                                <QrCode size={12} />
                                <span>View QR Card</span>
                              </button>
                            ) : (
                              <span className="text-slate-400">None</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-red-600 hover:text-red-800 font-semibold text-xs ml-2 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Add System User</h2>
            
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Username</label>
                <input 
                  type="text" 
                  required
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. jdoe"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  placeholder="jdoe@usm.edu.ph"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Password</label>
                <input 
                  type="password" 
                  required
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">First Name</label>
                  <input 
                    type="text" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Last Name</label>
                  <input 
                    type="text" 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">User Level</label>
                  <select 
                    value={userLevel} 
                    onChange={(e) => setUserLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  >
                    <option value="Super">Super</option>
                    <option value="Admin">Admin</option>
                    <option value="Unit">Unit</option>
                    <option value="Client">Client</option>
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
                      <option key={n.id} value={n.id}>{n.name} ({n.node_type})</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2 rounded-lg transition-all"
              >
                Create User Profile
              </button>
            </form>
          </div>
        </main>
      </div>

      {viewQrUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 max-w-sm w-full transform scale-100 transition-all duration-300">
            <h3 className="text-base font-bold text-slate-800 mb-4 text-center">Personnel QR Code Card</h3>
            
            <div id="print-qr-card" className="border border-slate-150 rounded-2xl p-6 bg-slate-50 flex flex-col items-center text-center">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">University of Southern Mindanao</h4>
              <p className="text-[10px] text-slate-500 mb-4">Katugunan Client Satisfaction Survey</p>
              
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4">
                <img 
                  src={`${process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace("/api/v1", "") : "http://localhost:8000"}${viewQrUser.qrcode_image_url}`} 
                  alt={`${viewQrUser.username} QR Code`}
                  className="w-40 h-40 object-contain"
                />
              </div>

              <h5 className="font-bold text-slate-900 text-sm">{viewQrUser.first_name} {viewQrUser.last_name}</h5>
              <p className="text-xs text-slate-600 font-medium">{viewQrUser.user_level} Profile</p>
              <p className="text-[10px] text-slate-400 mt-2">Scan to evaluate this personnel</p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setViewQrUser(null)}
                className="flex-1 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const popupWin = window.open("", "_blank", "width=600,height=600");
                  popupWin?.document.open();
                  popupWin?.document.write(`
                    <html>
                      <head>
                        <title>Print QR Code Card - ${viewQrUser.first_name} ${viewQrUser.last_name}</title>
                        <style>
                          body {
                            font-family: system-ui, -apple-system, sans-serif;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                            background: white;
                          }
                          .card {
                            border: 3px solid #047857;
                            border-radius: 24px;
                            padding: 32px;
                            text-align: center;
                            max-width: 320px;
                            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                          }
                          h4 {
                            color: #047857;
                            text-transform: uppercase;
                            letter-spacing: 0.1em;
                            margin: 0 0 4px 0;
                            font-size: 14px;
                          }
                          p.sub {
                            font-size: 11px;
                            color: #64748b;
                            margin: 0 0 16px 0;
                          }
                          .qr-box {
                            background: #f8fafc;
                            padding: 16px;
                            border-radius: 16px;
                            display: inline-block;
                            margin-bottom: 16px;
                            border: 1px solid #e2e8f0;
                          }
                          img {
                            width: 180px;
                            height: 180px;
                          }
                          h5 {
                            font-size: 16px;
                            margin: 0 0 4px 0;
                            color: #0f172a;
                          }
                          .role {
                            font-size: 12px;
                            color: #475569;
                            margin: 0;
                            font-weight: 500;
                          }
                          .footer {
                            font-size: 10px;
                            color: #94a3b8;
                            margin-top: 12px;
                          }
                        </style>
                      </head>
                      <body onload="window.print(); window.close();">
                        <div class="card">
                          <h4>University of Southern Mindanao</h4>
                          <p class="sub">Katugunan Client Satisfaction Survey</p>
                          <div class="qr-box">
                            <img src="${process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace("/api/v1", "") : "http://localhost:8000"}${viewQrUser.qrcode_image_url}" />
                          </div>
                          <h5>${viewQrUser.first_name} ${viewQrUser.last_name}</h5>
                          <p class="role">${viewQrUser.user_level} Profile</p>
                          <p class="footer">Scan to evaluate this personnel</p>
                        </div>
                      </body>
                    </html>
                  `);
                  popupWin?.document.close();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-lg shadow-emerald-100 transition-all"
              >
                <Printer size={12} />
                <span>Print Card</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
