"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { Loader2, Plus, Trash } from "lucide-react";

interface Question {
  id: number;
  question_id: string;
  question_question: string;
  question_type: string;
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [questionId, setQuestionId] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("General");

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/questions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setQuestions(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          question_id: questionId,
          question_question: questionText,
          question_type: questionType,
        })
      });

      if (res.ok) {
        setQuestionId("");
        setQuestionText("");
        fetchQuestions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar userLevel="Super" />
      <div className="flex-1 flex flex-col">
        <Navbar username="Admin" userLevel="Super" />
        
        <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Survey Evaluation Questions</h2>
            
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-700" size={30} />
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 font-semibold text-slate-700">Question ID</th>
                      <th className="p-3 font-semibold text-slate-700">Question Content</th>
                      <th className="p-3 font-semibold text-slate-700">Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {questions.map(q => (
                      <tr key={q.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-medium text-slate-900">{q.question_id}</td>
                        <td className="p-3 text-slate-600">{q.question_question}</td>
                        <td className="p-3">
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded">
                            {q.question_type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Create Survey Question</h2>
            
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Question ID</label>
                <input 
                  type="text" 
                  required
                  value={questionId} 
                  onChange={(e) => setQuestionId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. SQD9 or SQD_NEW"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Question Type</label>
                <select 
                  value={questionType} 
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
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
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Question Text</label>
                <textarea 
                  required
                  value={questionText} 
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none h-24"
                  placeholder="Enter the full question sentence..."
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2 rounded-lg transition-all"
              >
                Create Question
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
