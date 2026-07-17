"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { Loader2, Save, Key, Shield, QrCode, Download, User as UserIcon } from "lucide-react";

interface UserProfile {
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
  qrcode_image_url?: string;
  qrcode_payload?: string;
  permissions?: string[];
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgNodeName, setOrgNodeName] = useState<string>("");

  // Editable fields
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [sex, setSex] = useState("M");
  const [birthDate, setBirthDate] = useState("");
  const [contactNo, setContactNo] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      
      const res = await fetch(`${apiBase}/auth/me`, { headers });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
        return;
      }
      
      const data = await res.json();
      setUser(data);
      
      // Initialize form fields
      setEmail(data.email || "");
      setFirstName(data.first_name || "");
      setMiddleName(data.middle_name || "");
      setLastName(data.last_name || "");
      setIdNumber(data.id_number || "");
      setSex(data.sex || "M");
      setBirthDate(data.birth_date || "");
      setContactNo(data.contact_no || "");

      // If org node belongs to user, let's fetch org details
      if (data.org_node_id) {
        const nodesRes = await fetch(`${apiBase}/org-nodes`, { headers });
        if (nodesRes.ok) {
          const nodes = await nodesRes.json();
          const matched = nodes.find((n: any) => n.id === data.org_node_id);
          if (matched) {
            setOrgNodeName(matched.name);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      const headers = { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      };
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      
      const payload: any = {
        email,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        id_number: idNumber,
        sex,
        birth_date: birthDate,
        contact_no: contactNo,
      };

      if (password.trim() !== "") {
        payload.password = password;
      }

      const res = await fetch(`${apiBase}/users/me`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        setPassword(""); // Reset password field
        setMessage({ type: "success", text: "Profile details updated successfully!" });
      } else {
        const errorData = await res.json();
        setMessage({ type: "error", text: errorData.detail || "Failed to update profile." });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "A network error occurred." });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadQR = () => {
    if (!user?.qrcode_image_url) return;
    const qrUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:8000"}${user.qrcode_image_url}`;
    
    // Create temporary link to trigger download
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `${user.username}_satisfaction_qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const qrImageUrl = user?.qrcode_image_url
    ? `${process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:8000"}${user.qrcode_image_url}`
    : null;

  return (
    <div className="flex min-h-screen bg-gradient-to-tr from-slate-50 via-slate-100 to-slate-200">
      <Sidebar userLevel={user?.user_level || "Unit"} />
      
      <div className="flex-1 flex flex-col">
        <Navbar username={user?.username || ""} userLevel={user?.user_level || "Unit"} />
        
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Account Profile</h1>
              <p className="text-sm text-slate-500 mt-1">Manage your credentials, details, and scan badges.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold rounded-lg text-sm flex items-center gap-1.5 shadow-sm">
                <Shield size={14} />
                Role: {user?.user_level}
              </span>
              {orgNodeName && (
                <span className="px-3 py-1 bg-amber-100 border border-amber-200 text-amber-800 font-semibold rounded-lg text-sm shadow-sm">
                  Node: {orgNodeName}
                </span>
              )}
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Card: Form */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-6 pb-2 border-b border-slate-100 flex items-center gap-2">
                <UserIcon className="text-emerald-600" size={20} />
                Profile Information
              </h2>

              {message && (
                <div className={`p-4 rounded-xl mb-6 border text-sm font-medium ${
                  message.type === "success" 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-red-50 border-red-200 text-red-800"
                }`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div>
                    <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-2">Username (Locked)</label>
                    <input
                      type="text"
                      value={user?.username || ""}
                      disabled
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-2">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-2">First Name</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-2">Last Name</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-2">Middle Name</label>
                    <input
                      type="text"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-2">ID / Employee Number</label>
                    <input
                      type="text"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-2">Sex</label>
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSex("M")}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
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
                        className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
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
                    <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-2">Contact Number</label>
                    <input
                      type="text"
                      value={contactNo}
                      onChange={(e) => setContactNo(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-2">Birth Date (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-2">Change Password (Leave blank to keep)</label>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                      />
                    </div>
                  </div>

                </div>

                {/* Assigned Permissions (Read only) */}
                {user?.permissions && user.permissions.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <label className="block text-xs uppercase font-bold tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                      <Shield size={14} /> Assigned RBAC Permissions
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {user.permissions.map((p) => (
                        <span key={p} className="px-2.5 py-1 rounded bg-slate-100 text-slate-600 text-xs font-semibold font-mono border border-slate-200 shadow-sm">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Save size={18} />
                    )}
                    Save Changes
                  </button>
                </div>

              </form>
            </div>

            {/* Right Card: QR Survey Badge Card */}
            <div className="bg-gradient-to-b from-emerald-800 to-emerald-950 rounded-2xl shadow-2xl p-8 text-white flex flex-col items-center justify-between border-b-8 border-amber-500">
              
              <div className="text-center w-full">
                <div className="text-amber-400 font-extrabold tracking-widest text-xs uppercase mb-1">USM SATISFACTION PORTAL</div>
                <div className="text-xl font-bold tracking-wide">SURVEY BADGE</div>
                <div className="w-16 h-1 bg-amber-400 mx-auto my-4 rounded-full"></div>
              </div>

              {/* QR Image Frame */}
              <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center justify-center border-4 border-amber-400 my-6">
                {qrImageUrl ? (
                  <img
                    src={qrImageUrl}
                    alt="User QR Survey Code"
                    className="w-48 h-48 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <QrCode size={48} />
                    <span className="text-xs text-center">QR badge not generated</span>
                  </div>
                )}
              </div>

              <div className="text-center mb-6">
                <div className="font-extrabold text-lg text-amber-400">{user?.first_name} {user?.last_name}</div>
                <div className="text-xs text-white/70 font-mono tracking-wider mt-1">{user?.username}</div>
                <div className="text-[10px] uppercase font-bold tracking-widest bg-emerald-700/60 border border-emerald-500 px-3 py-1 rounded-full text-emerald-200 mt-3 inline-block shadow-sm">
                  {user?.user_level} User
                </div>
              </div>

              {qrImageUrl && (
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-emerald-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Download size={16} />
                  Download Survey Badge
                </button>
              )}

            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
