"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { Loader2, Plus, Trash2, Edit2, Check, X, HelpCircle } from "lucide-react";

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

  // Form Fields for creating a new question inline
  const [questionId, setQuestionId] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("General");
  const [creating, setCreating] = useState(false);

  // Inline Editing States
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuestionId, setEditQuestionId] = useState("");
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editQuestionType, setEditQuestionType] = useState("General");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchQuestions = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setQuestions(await res.json());
      }
    } catch (err) {
      console.error(err);
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
        localStorage.removeItem("token");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [router]);

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionId.trim() || !questionText.trim()) return;
    setCreating(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          question_id: questionId.trim(),
          question_question: questionText.trim(),
          question_type: questionType
        })
      });

      if (res.ok) {
        setQuestionId("");
        setQuestionText("");
        setQuestionType("General");
        if (token) fetchQuestions(token);
      } else {
        const errData = await res.json();
        alert(errData.detail || "Failed to create question");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateQuestion = async (id: number) => {
    if (!editQuestionId.trim() || !editQuestionText.trim()) return;
    setUpdatingId(id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/questions/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          question_id: editQuestionId.trim(),
          question_question: editQuestionText.trim(),
          question_type: editQuestionType
        })
      });

      if (res.ok) {
        setEditingId(null);
        if (token) fetchQuestions(token);
      } else {
        const errData = await res.json();
        alert(errData.detail || "Failed to update question");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm("Are you sure you want to delete this question? This will affect metric calculations that reference this Question ID.")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/questions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        if (token) fetchQuestions(token);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const hasWriteAccess = user?.user_level === "Super" || user?.user_level === "Admin";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userLevel={user?.user_level || "Unit"} />
      <div className="flex-1 flex flex-col">
        <Navbar username={user ? `${user.first_name} ${user.last_name}` : "Admin"} userLevel={user?.user_level || "Unit"} />
        
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Dynamic Survey Questions</h1>
              <p className="text-sm text-slate-500 mt-1">
                Configure Service Quality Dimension (SQD) feedback criteria. Manage all entries inline.
              </p>
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
                        const isEditing = editingId === q.id;
                        const isUpdating = updatingId === q.id;
                        return (
                          <tr key={q.id} className="hover:bg-slate-50/40 transition-colors">
                            {/* Question ID Column */}
                            <td className="p-4 font-bold text-slate-800">
                              {isEditing ? (
                                <input 
                                  type="text"
                                  required
                                  value={editQuestionId}
                                  onChange={(e) => setEditQuestionId(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 font-bold"
                                />
                              ) : (
                                q.question_id
                              )}
                            </td>

                            {/* Classification Column */}
                            <td className="p-4">
                              {isEditing ? (
                                <select 
                                  value={editQuestionType}
                                  onChange={(e) => setEditQuestionType(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
                                >
                                  <option value="General">General</option>
                                  <option value="Admin">Admin</option>
                                  <option value="Teaching">Teaching</option>
                                  <option value="Research">Research</option>
                                  <option value="Support">Support</option>
                                  <option value="Production">Production</option>
                                </select>
                              ) : (
                                <span className="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border border-emerald-100">
                                  {q.question_type}
                                </span>
                              )}
                            </td>

                            {/* Question text Column */}
                            <td className="p-4 text-slate-600 font-medium">
                              {isEditing ? (
                                <textarea 
                                  required
                                  value={editQuestionText}
                                  onChange={(e) => setEditQuestionText(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 h-16 resize-y"
                                />
                              ) : (
                                q.question_question
                              )}
                            </td>

                            {/* Action Column for Super/Admin */}
                            {hasWriteAccess && (
                              <td className="p-4 text-right">
                                {isEditing ? (
                                  <div className="flex justify-end gap-1.5">
                                    <button 
                                      onClick={() => handleUpdateQuestion(q.id)}
                                      disabled={isUpdating}
                                      className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                                      title="Save"
                                    >
                                      {isUpdating ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setEditingId(null);
                                      }}
                                      className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                                      title="Cancel"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex justify-end gap-1.5">
                                    <button 
                                      onClick={() => {
                                        setEditingId(q.id);
                                        setEditQuestionId(q.question_id);
                                        setEditQuestionText(q.question_question);
                                        setEditQuestionType(q.question_type);
                                      }}
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
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}

                      {/* Inline Creation Row (Only for Super/Admin) */}
                      {hasWriteAccess && (
                        <tr className="bg-slate-50/50">
                          {/* New ID */}
                          <td className="p-4">
                            <input 
                              type="text" 
                              required
                              value={questionId} 
                              onChange={(e) => setQuestionId(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 font-bold"
                              placeholder="e.g. SQD9"
                            />
                          </td>

                          {/* New Type */}
                          <td className="p-4">
                            <select 
                              value={questionType} 
                              onChange={(e) => setQuestionType(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-500 font-semibold"
                            >
                              <option value="General">General</option>
                              <option value="Admin">Admin</option>
                              <option value="Teaching">Teaching</option>
                              <option value="Research">Research</option>
                              <option value="Support">Support</option>
                              <option value="Production">Production</option>
                            </select>
                          </td>

                          {/* New Text */}
                          <td className="p-4">
                            <input 
                              type="text" 
                              required
                              value={questionText} 
                              onChange={(e) => setQuestionText(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                              placeholder="Enter new question statement..."
                            />
                          </td>

                          {/* Action Button */}
                          <td className="p-4 text-right">
                            <button 
                              type="button"
                              onClick={handleAddQuestion}
                              disabled={creating}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-4 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 ml-auto transition-colors disabled:opacity-50"
                            >
                              {creating ? <Loader2 className="animate-spin" size={12} /> : <Plus size={12} />}
                              <span>Add</span>
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
