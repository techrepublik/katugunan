"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { Loader2, Plus, Trash2, Edit2, Check, X, HelpCircle } from "lucide-react";
import Toast from "@/components/Toast";
const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
interface Question {
  id: number;
  question_id: string;
  question_question: string;
  question_type: string;
}

export default function QuestionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
  };

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [modalRecordId, setModalRecordId] = useState<number | null>(null);
  const [modalQuestionId, setModalQuestionId] = useState("");
  const [modalQuestionText, setModalQuestionText] = useState("");
  const [modalQuestionType, setModalQuestionType] = useState("General");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const resetModal = () => {
    setModalQuestionId("");
    setModalQuestionText("");
    setModalQuestionType("General");
    setModalRecordId(null);
    setIsEditMode(false);
  };

  const fetchQuestions = async (token: string) => {
    try {
      const res = await fetch(`${apiBase}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setQuestions(await res.json());
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch questions", "error");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    const initPage = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/auth/me`, { headers });
        if (!userRes.ok) throw new Error("Unauthorized");
        const userData = await userRes.json();
        setUser(userData);
        await fetchQuestions(token);
      } catch (err) {
        console.error(err);
        showToast("Authentication error", "error");
        localStorage.removeItem("token");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, [router]);

  const openCreateModal = () => {
    resetModal();
    setModalOpen(true);
  };

  const openEditModal = (q: Question) => {
    setModalRecordId(q.id);
    setModalQuestionId(q.question_id);
    setModalQuestionText(q.question_question);
    setModalQuestionType(q.question_type);
    setIsEditMode(true);
    setModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalQuestionId.trim() || !modalQuestionText.trim()) {
      showToast("ID and Text are required", "error");
      return;
    }
    setModalSubmitting(true);
    const token = localStorage.getItem("token");
    try {
      const url = isEditMode
          ? `${apiBase}/questions/${modalRecordId}`
          : `${apiBase}/questions`;
      const method = isEditMode ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          question_id: modalQuestionId.trim(),
          question_question: modalQuestionText.trim(),
          question_type: modalQuestionType
        })
      });
      if (res.ok) {
        showToast(isEditMode ? "Question updated" : "Question created");
        setModalOpen(false);
        if (token) await fetchQuestions(token);
      } else {
        const errData = await res.json();
        showToast(errData.detail || (isEditMode ? "Failed to update" : "Failed to create"), "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error", "error");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm("Are you sure you want to delete this question? This will affect metric calculations that reference this Question ID.")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/questions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Question deleted");
        if (token) await fetchQuestions(token);
      } else {
        const errData = await res.json();
        showToast(errData.detail || "Failed to delete", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network error", "error");
    }
  };

  const hasWriteAccess = user?.user_level?.toLowerCase() === "super" || user?.user_level?.toLowerCase() === "admin";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userLevel={user?.user_level || "Unit"} />
      <div className="flex-1 flex flex-col">
        <Navbar username={user ? `${user.first_name} ${user.last_name}` : "Admin"} userLevel={user?.user_level || "Unit"} />
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Dynamic Survey Questions</h1>
                <p className="text-sm text-slate-500 mt-1">Configure Service Quality Dimension (SQD) feedback criteria. Manage all entries inline.</p>
              </div>
              {hasWriteAccess && (
                <button
                  onClick={openCreateModal}
                  className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-4 py-1.5 rounded-lg text-xs transition-colors"
                >
                  <Plus size={12} />
                  <span>Add Question</span>
                </button>
              )}
            </div>
            {loading ? (
              <div className="min-h-[400px] flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-200">
                <Loader2 className="animate-spin text-emerald-700" size={36} />
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col space-y-6">
                <div className="flex items-center gap-3 border-b pb-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-sm">
                    <HelpCircle size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Survey Evaluation Questions</h2>
                    <p className="text-xs text-slate-400">Add, update, or remove question entries using the inline rows below.</p>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider w-[140px]">Question ID</th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider w-[150px]">Classification</th>
                        <th className="p-4 font-bold text-slate-500 uppercase tracking-wider">Question Statement</th>
                        {hasWriteAccess && (
                          <th className="p-4 font-bold text-slate-500 uppercase tracking-wider text-right w-[110px]">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {questions.map(q => {
                        const isUpdating = false;
                        return (
                          <tr key={q.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="p-4 font-bold text-slate-800">{q.question_id}</td>
                            <td className="p-4">
                              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border border-emerald-100">
                                {q.question_type}
                              </span>
                            </td>
                            <td className="p-4 text-slate-600 font-medium">{q.question_question}</td>
                            {hasWriteAccess && (
                              <td className="p-4 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => openEditModal(q)}
                                    className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-slate-50 transition-all"
                                    title="Edit Question"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteQuestion(q.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-650 rounded-lg hover:bg-red-50 transition-all"
                                    title="Delete Question"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">{isEditMode ? "Edit Question" : "Add New Question"}</h3>
            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Question ID</label>
                <input
                  type="text"
                  required
                  value={modalQuestionId}
                  onChange={e => setModalQuestionId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. SQD9"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Classification</label>
                <select
                  value={modalQuestionType}
                  onChange={e => setModalQuestionType(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="General">General</option>
                  <option value="Admin">Admin</option>
                  <option value="Teaching">Teaching</option>
                  <option value="Research">Research</option>
                  <option value="Support">Support</option>
                  <option value="Production">Production</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Question Statement</label>
                <textarea
                  required
                  value={modalQuestionText}
                  onChange={e => setModalQuestionText(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 h-20 resize-y"
                  placeholder="Enter question statement..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-4 py-1.5 rounded-lg text-sm disabled:opacity-50"
                >
                  {modalSubmitting ? <Loader2 className="animate-spin" size={14} /> : isEditMode ? <Check size={14} /> : <Plus size={14} />}
                  <span>{isEditMode ? "Update" : "Create"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
