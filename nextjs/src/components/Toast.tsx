"use client";

import { useEffect } from "react";
import { Check, X } from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, type, duration, onClose]);

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-slate-900 text-white shadow-2xl rounded-2xl p-4 border border-slate-800 flex items-center gap-3.5 w-80 max-w-full">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
        }`}>
          {type === "success" ? <Check size={16} className="text-emerald-400" /> : <X size={16} className="text-red-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {type === "success" ? "Success" : "Error"}
          </p>
          <p className="text-xs text-slate-200 mt-0.5 font-medium leading-relaxed whitespace-pre-wrap break-words">
            {message}
          </p>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 transition-colors self-start p-0.5 rounded-lg hover:bg-slate-800"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
