"use client";

import { User as UserIcon } from "lucide-react";

interface NavbarProps {
  username: string;
  userLevel: string;
}

export default function Navbar({ username, userLevel }: NavbarProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2 font-semibold text-slate-700">
        <span>Katugunan Survey Portal</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50">
          <UserIcon size={16} className="text-slate-500" />
          <span className="text-sm font-medium text-slate-700">{username}</span>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 ml-2">
            {userLevel}
          </span>
        </div>
      </div>
    </header>
  );
}
