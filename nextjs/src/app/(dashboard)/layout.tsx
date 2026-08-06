"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
        const res = await fetch(`${apiBase}/auth/me`, { headers });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          localStorage.removeItem("token");
          router.push("/login");
        }
      } catch (err) {
        console.error("Layout user fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();

    // Read collapsed state from localStorage on mount
    const collapsed = localStorage.getItem("sidebar-collapsed");
    if (collapsed === "true") {
      setIsCollapsed(true);
    }
  }, [router]);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-700"></div>
      </div>
    );
  }

  const username = user
    ? user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username || "Admin"
    : "Admin";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="print:hidden flex-shrink-0">
        <Sidebar 
          userLevel={user?.user_level || "Super"} 
          isCollapsed={isCollapsed} 
          toggleSidebar={toggleSidebar} 
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="print:hidden">
          <Navbar 
            username={username} 
            userLevel={user?.user_level || "Super"} 
          />
        </div>
        {children}
      </div>
    </div>
  );
}
