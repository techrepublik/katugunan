"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  PieChart, 
  FolderTree, 
  Users, 
  Settings, 
  HelpCircle, 
  BookOpen,
  LogOut,
  User,
  ClipboardList,
  Shield,
  BarChart3,
  Activity,
  UserCheck,
  FileSpreadsheet
} from "lucide-react";

interface SidebarProps {
  userLevel?: string;
}

export default function Sidebar({ userLevel: initialUserLevel }: SidebarProps) {
  const pathname = usePathname();
  const [userLevel, setUserLevel] = useState<string>(initialUserLevel || "Client");
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const headers = { Authorization: `Bearer ${token}` };
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
        const res = await fetch(`${apiBase}/auth/me`, { headers });
        if (res.ok) {
          const data = await res.json();
          setUserLevel(data.user_level);
          setPermissions(data.permissions || []);
        }
      } catch (err) {
        console.error("Sidebar user fetch error:", err);
      }
    };
    fetchUser();
  }, [initialUserLevel]);

  const links = [
    { name: "Dashboard", href: "/", icon: PieChart, permission: null, roles: ["Super", "Admin", "Unit"] },
    { name: "Analytics Insights", href: "/admin/analytics", icon: BarChart3, permission: "manage_users", roles: ["Super", "Admin"] },
    { name: "Live Monitor", href: "/admin/monitor", icon: Activity, permission: "manage_users", roles: ["Super", "Admin"] },
    { name: "Personnel Performance", href: "/admin/personnel-monitor", icon: UserCheck, permission: "manage_users", roles: ["Super", "Admin"] },
    { name: "Detailed Responses", href: "/admin/personnel-responses", icon: FileSpreadsheet, permission: "manage_users", roles: ["Super", "Admin"] },
    { name: "Org Tree Explorer", href: "/admin/org-tree", icon: FolderTree, permission: "manage_users", roles: ["Super", "Admin"] },
    { name: "Service Catalog", href: "/admin/services", icon: Settings, permission: "manage_services", roles: ["Super", "Admin"] },
    { name: "Survey Questions", href: "/admin/questions", icon: HelpCircle, permission: "manage_questions", roles: ["Super", "Admin"] },
    { name: "User Management", href: "/admin/users", icon: Users, permission: "manage_users", roles: ["Super", "Admin"] },
    { name: "Roles & Permissions", href: "/admin/roles-permissions", icon: Shield, permission: "manage_users", roles: ["Super", "Admin"] },
    { name: "Survey Dropdowns", href: "/admin/metadata", icon: BookOpen, permission: "manage_metadata", roles: ["Super", "Admin"] },
    { name: "Audit Logs", href: "/admin/audit-logs", icon: ClipboardList, permission: "view_audit_logs", roles: ["Super", "Admin"] },
    { name: "My Profile", href: "/admin/profile", icon: User, permission: null, roles: ["Super", "Admin", "Unit"] },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <aside className="w-64 bg-emerald-700 text-white min-h-screen flex flex-col p-6 shadow-xl border-r-4 border-gold-500">
      <div className="text-center mb-8 pb-4 border-b border-white/20">
        <div className="font-bold text-lg tracking-wider text-gold-400">USM KATUGUNAN</div>
        <div className="text-xs text-white/60 mt-1">Satisfaction Monitoring</div>
      </div>

      <nav className="flex-1 space-y-2">
        {links.map((link) => {
          const isSuper = userLevel?.toLowerCase() === "super";
          const hasAccess = isSuper || !link.permission || permissions.includes(link.permission) || link.roles.map(r => r.toLowerCase()).includes(userLevel?.toLowerCase());
          if (!hasAccess) return null;

          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                isActive 
                  ? "bg-white/10 text-gold-500 font-semibold" 
                  : "text-emerald-100 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} className={isActive ? "text-gold-500" : "text-emerald-300"} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-red-200 hover:bg-red-900/20 hover:text-red-400 mt-auto transition-all"
      >
        <LogOut size={18} />
        Logout
      </button>
    </aside>
  );
}
