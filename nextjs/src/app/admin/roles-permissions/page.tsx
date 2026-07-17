"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Shield, Plus, Edit2, Trash2, CheckCircle2, Lock, X } from "lucide-react";

interface Permission {
  id: number;
  name: string;
  label: string;
  description: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

export default function RolesPermissionsPage() {
  const [userLevel, setUserLevel] = useState<string>("Admin");
  const [activeTab, setActiveTab] = useState<"roles" | "permissions">("roles");
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals UI
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Role Form Fields
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [rolePerms, setRolePerms] = useState<string[]>([]);

  // Permission Form Fields
  const [permName, setPermName] = useState("");
  const [permLabel, setPermLabel] = useState("");
  const [permDesc, setPermDesc] = useState("");

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

      const meRes = await fetch(`${apiBase}/auth/me`, { headers });
      if (meRes.ok) {
        const me = await meRes.json();
        setUserLevel(me.user_level);
      }

      const rolesRes = await fetch(`${apiBase}/roles`, { headers });
      const permsRes = await fetch(`${apiBase}/permissions`, { headers });

      if (rolesRes.ok) setRoles(await rolesRes.json());
      if (permsRes.ok) setPermissions(await permsRes.json());
    } catch (err) {
      console.error(err);
      setError("Failed to fetch roles and permissions configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const clearMessages = () => {
    setError("");
    setSuccessMsg("");
  };

  // Role CRUD Actions
  const openAddRole = () => {
    clearMessages();
    setEditMode(false);
    setSelectedId(null);
    setRoleName("");
    setRoleDesc("");
    setRolePerms([]);
    setRoleModalOpen(true);
  };

  const openEditRole = (role: Role) => {
    clearMessages();
    setEditMode(true);
    setSelectedId(role.id);
    setRoleName(role.name);
    setRoleDesc(role.description);
    setRolePerms(role.permissions || []);
    setRoleModalOpen(true);
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    try {
      const token = localStorage.getItem("token");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const payload = {
        name: roleName,
        description: roleDesc,
        permissions: rolePerms
      };

      const url = editMode ? `${apiBase}/roles/${selectedId}` : `${apiBase}/roles`;
      const method = editMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error saving role settings.");
      }

      setSuccessMsg(editMode ? "Role settings updated successfully!" : "New security role registered successfully!");
      setRoleModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    }
  };

  const handleDeleteRole = async (id: number, name: string) => {
    if (["Super", "Admin", "Unit", "Client"].includes(name)) {
      alert("System default roles cannot be deleted.");
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete the role "${name}"?`)) return;
    clearMessages();

    try {
      const token = localStorage.getItem("token");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

      const res = await fetch(`${apiBase}/roles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error deleting role.");
      }

      setSuccessMsg(`Role "${name}" deleted successfully.`);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Error deleting role.");
    }
  };

  const toggleRolePermission = (permKey: string) => {
    if (rolePerms.includes(permKey)) {
      setRolePerms(rolePerms.filter(k => k !== permKey));
    } else {
      setRolePerms([...rolePerms, permKey]);
    }
  };

  // Permission CRUD Actions
  const openAddPerm = () => {
    clearMessages();
    setEditMode(false);
    setSelectedId(null);
    setPermName("");
    setPermLabel("");
    setPermDesc("");
    setPermModalOpen(true);
  };

  const openEditPerm = (perm: Permission) => {
    clearMessages();
    setEditMode(true);
    setSelectedId(perm.id);
    setPermName(perm.name);
    setPermLabel(perm.label);
    setPermDesc(perm.description);
    setPermModalOpen(true);
  };

  const handlePermSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    try {
      const token = localStorage.getItem("token");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const payload = {
        name: permName,
        label: permLabel,
        description: permDesc
      };

      const url = editMode ? `${apiBase}/permissions/${selectedId}` : `${apiBase}/permissions`;
      const method = editMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error saving permission settings.");
      }

      setSuccessMsg(editMode ? "Permission settings updated successfully!" : "New permission key registered successfully!");
      setPermModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    }
  };

  const handleDeletePerm = async (id: number, name: string) => {
    if (["manage_users", "manage_services", "manage_questions", "manage_metadata", "view_audit_logs"].includes(name)) {
      alert("System default permissions cannot be deleted.");
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete the permission "${name}"?`)) return;
    clearMessages();

    try {
      const token = localStorage.getItem("token");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

      const res = await fetch(`${apiBase}/permissions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error deleting permission.");
      }

      setSuccessMsg(`Permission "${name}" deleted successfully.`);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Error deleting permission.");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar userLevel={userLevel} />

      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Shield className="text-emerald-700" size={32} />
              Roles & Permissions Configuration
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure system authorization roles, set access scopes, and define fine-grained permission flags.
            </p>
          </div>
          
          <div>
            {activeTab === "roles" ? (
              <button
                onClick={openAddRole}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md flex items-center gap-2 transition-all"
              >
                <Plus size={18} /> Add Security Role
              </button>
            ) : (
              <button
                onClick={openAddPerm}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md flex items-center gap-2 transition-all"
              >
                <Plus size={18} /> Add Permission Key
              </button>
            )}
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-slate-200 mb-6 bg-white p-1.5 rounded-xl shadow-sm w-fit gap-1">
          <button
            onClick={() => setActiveTab("roles")}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "roles"
                ? "bg-emerald-700 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            Access Roles ({roles.length})
          </button>
          <button
            onClick={() => setActiveTab("permissions")}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "permissions"
                ? "bg-emerald-700 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            Permission Scope Keys ({permissions.length})
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 block shrink-0" />
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-250 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 block shrink-0" />
            {successMsg}
          </div>
        )}

        {loading ? (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-700 mb-3" />
            <p className="text-sm font-medium text-slate-500">Loading configurations...</p>
          </div>
        ) : (
          <>
            {activeTab === "roles" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-150 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-150">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Role Name</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Description</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Scope Matches</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roles.map((role) => {
                      const isDefault = ["Super", "Admin", "Unit", "Client"].includes(role.name);
                      return (
                        <tr key={role.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 text-sm">{role.name}</span>
                              {isDefault && (
                                <span className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-slate-500">{role.description || "—"}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">
                                {(role.permissions || []).length} Granted
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditRole(role)}
                                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-emerald-700 rounded-lg transition-all"
                                title="Edit Role Settings"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteRole(role.id, role.name)}
                                disabled={isDefault}
                                className={`p-1.5 rounded-lg transition-all ${
                                  isDefault
                                    ? "text-slate-300 cursor-not-allowed"
                                    : "hover:bg-red-50 text-slate-500 hover:text-red-600"
                                }`}
                                title={isDefault ? "Cannot delete system roles" : "Delete Custom Role"}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "permissions" && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-150 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-150">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Key Name</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Display Label</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Description</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {permissions.map((perm) => {
                      const isDefault = ["manage_users", "manage_services", "manage_questions", "manage_metadata", "view_audit_logs"].includes(perm.name);
                      return (
                        <tr key={perm.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                              {perm.name}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-semibold text-sm text-slate-800">
                            {perm.label}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-slate-500">{perm.description || "—"}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditPerm(perm)}
                                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-emerald-700 rounded-lg transition-all"
                                title="Edit Permission Details"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeletePerm(perm.id, perm.name)}
                                disabled={isDefault}
                                className={`p-1.5 rounded-lg transition-all ${
                                  isDefault
                                    ? "text-slate-300 cursor-not-allowed"
                                    : "hover:bg-red-50 text-slate-500 hover:text-red-600"
                                }`}
                                title={isDefault ? "Cannot delete default scope keys" : "Delete Scope Key"}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {/* Role Management Modal */}
      {roleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield className="text-emerald-750" size={20} />
                {editMode ? `Edit Access Role: ${roleName}` : "Register New Security Role"}
              </h3>
              <button
                onClick={() => setRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleRoleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">Role Unique Name</label>
                <input
                  type="text"
                  required
                  disabled={editMode && ["Super", "Admin", "Unit", "Client"].includes(roleName)}
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="e.g. SurveySupervisor"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-450"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">Description</label>
                <textarea
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  placeholder="Brief summary of what account permissions this role represents"
                  rows={2}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-750" /> Bind Security Permissions
                </label>
                
                {/* Permissions Checklist Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {permissions.map((p) => {
                    const isChecked = rolePerms.includes(p.name);
                    const isSuperRole = roleName === "Super";
                    return (
                      <div
                        key={p.id}
                        onClick={() => !isSuperRole && toggleRolePermission(p.name)}
                        className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                          isSuperRole
                            ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                            : isChecked
                              ? "bg-emerald-50/50 border-emerald-500 cursor-pointer"
                              : "bg-white border-slate-200 hover:border-slate-350 cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked || isSuperRole}
                          disabled={isSuperRole}
                          onChange={() => {}}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="text-left">
                          <p className="text-xs font-bold text-slate-800">{p.label}</p>
                          <p className="text-[10px] text-slate-500 leading-normal mt-0.5">{p.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-650 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold shadow-md transition-all"
                >
                  {editMode ? "Save Changes" : "Create Access Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permission Management Modal */}
      {permModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col border border-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Lock className="text-emerald-750" size={20} />
                {editMode ? `Edit Permission Key: ${permName}` : "Create Permission Scope Key"}
              </h3>
              <button
                onClick={() => setPermModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handlePermSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">Permission Unique Key</label>
                <input
                  type="text"
                  required
                  disabled={editMode && ["manage_users", "manage_services", "manage_questions", "manage_metadata", "view_audit_logs"].includes(permName)}
                  value={permName}
                  onChange={(e) => setPermName(e.target.value)}
                  placeholder="e.g. manage_billing"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-450"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">Display Label</label>
                <input
                  type="text"
                  required
                  value={permLabel}
                  onChange={(e) => setPermLabel(e.target.value)}
                  placeholder="e.g. Manage Billing Details"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-1">Description</label>
                <textarea
                  value={permDesc}
                  onChange={(e) => setPermDesc(e.target.value)}
                  placeholder="Briefly describe what authority this permission flag grants"
                  rows={3}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPermModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-650 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold shadow-md transition-all"
                >
                  {editMode ? "Save Changes" : "Create Permission Key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
