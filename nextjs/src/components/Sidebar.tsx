"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  PieChart, 
  FolderTree, 
  Users, 
  Settings, 
  HelpCircle, 
  BookOpen,
  LogOut
} from "lucide-react";

interface SidebarProps {
  userLevel: string;
}

export default function Sidebar({ userLevel }: SidebarProps) {
  const pathname = usePathname();

  const links = [
    { name: "Dashboard", href: "/", icon: PieChart, roles: ["Super", "Admin", "Unit"] },
    { name: "Org Tree Explorer", href: "/admin/org-tree", icon: FolderTree, roles: ["Super", "Admin"] },
    { name: "Service Catalog", href: "/admin/services", icon: Settings, roles: ["Super", "Admin"] },
    { name: "Survey Questions", href: "/admin/questions", icon: HelpCircle, roles: ["Super", "Admin"] },
    { name: "User Management", href: "/admin/users", icon: Users, roles: ["Super", "Admin"] },
    { name: "Survey Dropdowns", href: "/admin/metadata", icon: BookOpen, roles: ["Super", "Admin"] },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <aside className="w-64 bg-emerald-700 text-white min-height-screen flex flex-col p-6 shadow-xl border-r-4 border-gold-500">
      <div className="text-center mb-8 pb-4 border-b border-white/20">
        <div className="font-bold text-lg tracking-wider text-gold-400">USM KATUGUNAN</div>
        <div className="text-xs text-white/60 mt-1">Satisfaction Monitoring</div>
      </div>

      <nav className="flex-1 space-y-2">
        {links.map((link) => {
          if (!link.roles.includes(userLevel)) return null;
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
