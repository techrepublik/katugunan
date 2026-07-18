"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { 
  Loader2, Plus, Trash, UserPlus, FileText, QrCode, 
  Printer, Search, ArrowUpDown, Edit, Shield, Info, CheckSquare, Square
} from "lucide-react";
import Toast from "@/components/Toast";

interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  id_number?: string;
  sex?: string;
  birth_date?: string;
  contact_no?: string;
  user_level: string;
  org_node_id?: number;
  picture_url?: string;
  qrcode_image_url?: string;
  qrcode_payload?: string;
  permissions?: string[];
}

interface OrgNode {
  id: number;
  name: string;
  node_type: string;
}

const ALL_PERMISSIONS = [
  { id: "manage_users", label: "Manage Users", desc: "Allows creating, updating, and deleting system accounts" },
  { id: "manage_services", label: "Manage Services", desc: "Allows modification of service catalog configurations" },
  { id: "manage_questions", label: "Manage Questions", desc: "Allows editing survey evaluation questions" },
  { id: "manage_metadata", label: "Manage Metadata", desc: "Allows editing region and client type dropdown options" },
  { id: "view_audit_logs", label: "View Audit Logs", desc: "Allows viewing database-level action tracking logs" }
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allPermissions, setAllPermissions] = useState<any[]>(ALL_PERMISSIONS);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };
  
  // UI states
  const [viewQrUser, setViewQrUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Search, sorting, pagination states
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"username" | "first_name" | "email" | "user_level">("username");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form Fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [sex, setSex] = useState("M");
  const [birthDate, setBirthDate] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [userLevel, setUserLevel] = useState("Unit");
  const [orgNodeId, setOrgNodeId] = useState<number | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const fetchUsersAndNodes = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

      const meRes = await fetch(`${apiBase}/auth/me`, { headers });
      if (meRes.ok) {
        setCurrentUser(await meRes.json());
      }

      const usersRes = await fetch(`${apiBase}/users`, { headers });
      const nodesRes = await fetch(`${apiBase}/org-nodes`, { headers });
      const servicesRes = await fetch(`${apiBase}/services`, { headers });
      const permsRes = await fetch(`${apiBase}/permissions`, { headers });
      const rolesRes = await fetch(`${apiBase}/roles`, { headers });

      if (usersRes.ok) setUsers(await usersRes.json());
      if (nodesRes.ok) setNodes(await nodesRes.json());
      if (servicesRes.ok) setServices(await servicesRes.json());
      
      if (permsRes.ok) {
        const permsData = await permsRes.json();
        const mapped = permsData.map((p: any) => ({
          db_id: p.id,
          id: p.name,
          label: p.label,
          desc: p.description
        }));
        if (mapped.length > 0) setAllPermissions(mapped);
      }
      if (rolesRes.ok) {
        setAllRoles(await rolesRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndNodes();
  }, []);

  const openAddModal = () => {
    setEditMode(false);
    setSelectedUserId(null);
    setUsername("");
    setEmail("");
    setPassword("");
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setIdNumber("");
    setSex("M");
    setBirthDate("");
    setContactNo("");
    setUserLevel("Unit");
    setOrgNodeId(null);
    setSelectedPermissions([]);
    setIsModalOpen(true);
  };

  const openEditModal = (u: User) => {
    setEditMode(true);
    setSelectedUserId(u.id);
    setUsername(u.username);
    setEmail(u.email);
    setPassword(""); // Clear password field for security
    setFirstName(u.first_name || "");
    setMiddleName(u.middle_name || "");
    setLastName(u.last_name || "");
    setIdNumber(u.id_number || "");
    setSex(u.sex || "M");
    setBirthDate(u.birth_date || "");
    setContactNo(u.contact_no || "");
    setUserLevel(u.user_level);
    setOrgNodeId(u.org_node_id || null);
    setSelectedPermissions(u.permissions || []);
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

    const payload: any = {
      username,
      email,
      first_name: firstName || null,
      middle_name: middleName || null,
      last_name: lastName || null,
      id_number: idNumber || null,
      sex,
      birth_date: birthDate || null,
      contact_no: contactNo || null,
      user_level: userLevel,
      org_node_id: orgNodeId,
      permissions: selectedPermissions
    };

    if (password.trim() !== "") {
      payload.password = password;
    }

    try {
      let res;
      if (editMode && selectedUserId) {
        res = await fetch(`${apiBase}/users/${selectedUserId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Validation check for adding user
        if (password.trim() === "") {
          showToast("Password is required for new accounts", "error");
          return;
        }
        res = await fetch(`${apiBase}/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        showToast(editMode ? "User updated successfully!" : "User created successfully!");
        setIsModalOpen(false);
        fetchUsersAndNodes();
      } else {
        const errorData = await res.json();
        showToast(errorData.detail || "Failed to save user account details", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("A network error occurred.", "error");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("User deleted successfully!");
        fetchUsersAndNodes();
      } else {
        const errorData = await res.json();
        showToast(errorData.detail || "Failed to delete account", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("A network error occurred.", "error");
    }
  };

  // Sorting Handler
  const handleSort = (field: "username" | "first_name" | "email" | "user_level") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Permission Selection Toggle
  const togglePermission = (permId: string) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  // Filter & Sort Logic
  const filteredUsers = users
    .filter(u => {
      const matchedNode = nodes.find(n => n.id === u.org_node_id);
      const searchStr = search.toLowerCase();
      return (
        u.username.toLowerCase().includes(searchStr) ||
        u.email.toLowerCase().includes(searchStr) ||
        (u.first_name && u.first_name.toLowerCase().includes(searchStr)) ||
        (u.last_name && u.last_name.toLowerCase().includes(searchStr)) ||
        (matchedNode && matchedNode.name.toLowerCase().includes(searchStr))
      );
    })
    .sort((a, b) => {
      let valA = a[sortField] || "";
      let valB = b[sortField] || "";
      
      valA = valA.toString().toLowerCase();
      valB = valB.toString().toLowerCase();

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  // Pagination calculation
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Print Card helper
  const handlePrintCard = () => {
    const printContent = document.getElementById("print-qr-card")?.innerHTML;
    const windowUrl = "about:blank";
    const uniqueName = new Date().getTime();
    const windowName = "PrintWindow_" + uniqueName;
    const popupWin = window.open(windowUrl, windowName, "left=50,top=50,width=600,height=600");
    popupWin?.document.open();
    popupWin?.document.write(`
      <html>
        <head>
          <title>Print Personnel QR Survey Card</title>
          <style>
            body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 90vh; margin: 0; }
            .card { border: 2px solid #b45309; border-radius: 16px; padding: 24px; background: #fafafa; text-align: center; max-width: 320px; }
            h4 { color: #065f46; margin: 0 0 4px 0; text-transform: uppercase; font-size: 14px; letter-spacing: 1px; }
            p { margin: 0 0 16px 0; font-size: 11px; color: #666; }
            .qr { border: 1px solid #ddd; padding: 12px; background: #fff; display: inline-block; border-radius: 12px; margin-bottom: 12px; }
            .qr img { width: 160px; height: 160px; object-fit: contain; }
            h5 { margin: 0; font-size: 16px; color: #111; }
            .level { font-size: 12px; color: #444; margin: 4px 0 0 0; }
            .footer { font-size: 10px; color: #aaa; margin-top: 12px; }
          </style>
        </head>
        <body onload="window.print();window.close()">
          <div class="card">
            <h4>University of Southern Mindanao</h4>
            <p>Katugunan Client Satisfaction Survey</p>
            <div class="qr">${printContent}</div>
          </div>
        </body>
      </html>
    `);
    popupWin?.document.close();
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-tr from-slate-50 via-slate-100 to-slate-200">
      <Sidebar userLevel={currentUser?.user_level || "Unit"} />
      
      <div className="flex-1 flex flex-col">
        <Navbar username={currentUser?.username || "Admin"} userLevel={currentUser?.user_level || "Super"} />
        
        <main className="flex-1 p-8 overflow-y-auto w-full max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">System Account Directory</h1>
              <p className="text-sm text-slate-500 mt-1">Add, update, modify roles and custom permission sets for system accounts.</p>
            </div>
            
            <button
              onClick={openAddModal}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 font-bold transition-all flex items-center gap-2 text-sm"
            >
              <UserPlus size={16} />
              Register New User
            </button>
          </div>

          {/* Search Toolbar */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 mb-8">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </span>
              <input
                type="text"
                placeholder="Search users by name, username, email, office node..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-700 font-medium"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="py-24 flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-700" size={48} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("username")}>
                        <span className="flex items-center gap-1.5">
                          Username <ArrowUpDown size={12} />
                        </span>
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("first_name")}>
                        <span className="flex items-center gap-1.5">
                          Full Name <ArrowUpDown size={12} />
                        </span>
                      </th>
                      <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort("email")}>
                        <span className="flex items-center gap-1.5">
                          Email Address <ArrowUpDown size={12} />
                        </span>
                      </th>
                      <th className="px-6 py-4">Affiliated Node</th>
                      <th className="px-6 py-4">Avail. Services</th>
                      <th className="px-6 py-4">QR badge</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                    {currentUsers.length > 0 ? (
                      currentUsers.map(u => {
                        const userNode = nodes.find(n => n.id === u.org_node_id);
                        const userServices = services.filter(s => s.org_node_id === u.org_node_id);
                        
                        // Disable buttons checking for admin editing super
                        const isSuper = u.user_level?.toLowerCase() === "super";
                        const isCurrentUserAdmin = currentUser?.user_level?.toLowerCase() === "admin";
                        const canModify = !(isCurrentUserAdmin && isSuper);

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                              {u.username}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-semibold text-slate-800">{u.first_name} {u.last_name}</div>
                              <span className="inline-block mt-1 bg-slate-100 text-slate-800 text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                                {u.user_level}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-500 whitespace-nowrap">
                              {u.email}
                            </td>
                            <td className="px-6 py-4">
                              {userNode ? (
                                <div>
                                  <span className="font-bold text-slate-700">{userNode.name}</span>
                                  <span className="block text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">{userNode.node_type}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">Not Assigned</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {userServices.length > 0 ? (
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {userServices.slice(0, 3).map(s => (
                                    <span key={s.id} className="inline-block text-[9px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-100">
                                      {s.service_name}
                                    </span>
                                  ))}
                                  {userServices.length > 3 && (
                                    <span className="text-[9px] text-slate-400 font-bold px-1 py-0.5">+{userServices.length - 3} more</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">No Services</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {u.qrcode_payload ? (
                                <button
                                  onClick={() => setViewQrUser(u)}
                                  className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-2.5 py-1 rounded-lg font-bold transition-all shadow-sm"
                                >
                                  <QrCode size={13} />
                                  <span>View QR</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 text-xs">None</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              {canModify ? (
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => openEditModal(u)}
                                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-all"
                                    title="Edit User"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-all"
                                    title="Delete User"
                                  >
                                    <Trash size={16} />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Protected</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-semibold">
                          No personnel matching filters found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-150 px-6 py-4 bg-slate-50/50">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, totalItems)} of {totalItems} users
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

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl transform scale-100 transition-all duration-300 overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 text-white px-6 py-4 flex items-center justify-between border-b-4 border-amber-500">
              <h3 className="font-extrabold text-lg tracking-wide">
                {editMode ? "Modify Account Details" : "Register System User"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    disabled={editMode}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. msmith"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="msmith@usm.edu.ph"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">
                    {editMode ? "Change Password (Leave blank to keep)" : "Password"}
                  </label>
                  <input
                    type="password"
                    required={!editMode}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">User Level</label>
                  <select
                    value={userLevel}
                    onChange={(e) => {
                      const level = e.target.value;
                      setUserLevel(level);
                      
                      // Auto-select permissions depending on level
                      const matchingRole = allRoles.find(r => r.name === level);
                      if (matchingRole && matchingRole.permissions) {
                        setSelectedPermissions(matchingRole.permissions);
                      } else {
                        setSelectedPermissions([]);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {allRoles.length > 0 ? (
                      allRoles.map(role => {
                        if (role.name === "Super" && currentUser?.user_level?.toLowerCase() !== "super") return null;
                        return <option key={role.id} value={role.name}>{role.name}</option>;
                      })
                    ) : (
                      <>
                        {currentUser?.user_level?.toLowerCase() === "super" && <option value="Super">Super</option>}
                        <option value="Admin">Admin</option>
                        <option value="Unit">Unit</option>
                        <option value="Client">Client</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">ID Number</label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">Sex</label>
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSex("M")}
                      className={`px-4 py-1 text-xs font-semibold rounded-md transition-all ${
                        sex === "M" 
                          ? "bg-white text-emerald-800 shadow-sm font-bold" 
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => setSex("F")}
                      className={`px-4 py-1 text-xs font-semibold rounded-md transition-all ${
                        sex === "F" 
                          ? "bg-white text-emerald-800 shadow-sm font-bold" 
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Female
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">Assigned Department Node</label>
                  <select
                    value={orgNodeId || ""}
                    onChange={(e) => setOrgNodeId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Not Assigned</option>
                    {nodes.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.node_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">Contact No</label>
                  <input
                    type="text"
                    value={contactNo}
                    onChange={(e) => setContactNo(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">Birth Date</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none"
                  />
                </div>

              </div>

              {/* RBAC Permissions Section */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs uppercase font-bold tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Shield size={14} className="text-emerald-700" />
                  Grant Custom RBAC Permissions
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {allPermissions.map(p => {
                    const isChecked = selectedPermissions.includes(p.id);
                    
                    // Admin restriction check: standard admins cannot assign manage_users
                    const isRestricted = currentUser?.user_level?.toLowerCase() === "admin" && p.id === "manage_users";

                    return (
                      <div 
                        key={p.id}
                        onClick={() => !isRestricted && togglePermission(p.id)}
                        className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                          isRestricted 
                            ? "bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed"
                            : isChecked 
                              ? "bg-emerald-50/50 border-emerald-500 cursor-pointer" 
                              : "bg-white border-slate-200 hover:border-slate-350 cursor-pointer"
                        }`}
                      >
                        <div className="mt-0.5 text-emerald-600 shrink-0">
                          {isChecked ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-400" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{p.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 font-bold text-sm transition-all"
                >
                  Save User account
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {viewQrUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl p-6 max-w-sm w-full transform scale-100 transition-all duration-300">
            <h3 className="text-base font-extrabold text-slate-800 mb-4 text-center">Personnel QR Code Card</h3>
            
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50 flex flex-col items-center text-center">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 mb-1">University of Southern Mindanao</h4>
              <p className="text-[10px] text-slate-500 mb-4">Katugunan Client Satisfaction Survey</p>
              
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-250 mb-4">
                <div id="print-qr-card">
                  <img 
                    src={`${process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace("/api/v1", "") : "http://localhost:8000"}${viewQrUser.qrcode_image_url}`} 
                    alt={`${viewQrUser.username} QR Code`}
                    className="w-40 h-40 object-contain mx-auto"
                  />
                </div>
              </div>

              <h5 className="font-bold text-slate-900 text-sm">{viewQrUser.first_name} {viewQrUser.last_name}</h5>
              <p className="text-xs text-slate-600 font-medium">{viewQrUser.user_level} Profile</p>
              <p className="text-[10px] text-slate-400 mt-2">Scan to evaluate this personnel</p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setViewQrUser(null)}
                className="flex-1 px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
              >
                Close
              </button>
              <button
                onClick={handlePrintCard}
                className="flex-1 px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-emerald-950 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Printer size={13} />
                Print Card
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
