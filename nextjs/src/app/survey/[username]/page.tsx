"use client";

import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";

export default function PublicSurveyPage({ params }: { params: { username: string } }) {
  const [evaluator, setEvaluator] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form responses
  const [clientType, setClientType] = useState("Student");
  const [region, setRegion] = useState("Region XII");
  const [sex, setSex] = useState("Male");
  const [age, setAge] = useState<number>(20);
  
  const [cc1, setCc1] = useState("1");
  const [cc2, setCc2] = useState("1");
  const [cc3, setCc3] = useState("1");

  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [suggestions, setSuggestions] = useState("");
  const [email, setEmail] = useState("");
  
  // Ratings SQD0 to SQD8
  const [ratings, setRatings] = useState<Record<string, number>>({
    sqd0: 5, sqd1: 5, sqd2: 5, sqd3: 5, sqd4: 5, sqd5: 5, sqd6: 5, sqd7: 5, sqd8: 5
  });

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Fetch evaluator info & services
    const fetchData = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/users`);
        if (res.ok) {
          const users = await res.json();
          const target = users.find((u: any) => u.username === params.username);
          if (target) {
            setEvaluator(target);
            
            // Get services
            const sRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/services`);
            if (sRes.ok) {
              const allServices = await sRes.json();
              // Filter services offered by target user's org node
              const userServices = allServices.filter((s: any) => s.org_node_id === target.org_node_id);
              setServices(userServices);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Trigger Geolocation API on load
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
        },
        (error) => console.log("Geolocation error:", error.message)
      );
    }
  }, [params.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        evaluator_user_id: evaluator?.id || null,
        client_type: clientType,
        region,
        sex,
        age,
        cc1,
        cc2,
        cc3,
        transaction_types: services
          .filter(s => selectedServices.includes(s.id))
          .map(s => s.service_name),
        suggestions,
        email: email || null,
        latitude,
        longitude,
        ...ratings,
        service_ids: selectedServices
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/surveys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSubmitted(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRatingChange = (sqd: string, value: number) => {
    setRatings(prev => ({ ...prev, [sqd]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-emerald-700" size={40} />
      </div>
    );
  }

  if (!evaluator) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-semibold">
        Officer profile not found.
      </div>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border-t-8 border-emerald-700 text-center">
          <h2 className="text-2xl font-bold text-emerald-900 mb-2">Thank You!</h2>
          <p className="text-slate-600 text-sm mb-6">Your feedback helps us serve you better.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 flex justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full border-t-8 border-gold-500">
        <h1 className="text-2xl font-bold text-emerald-700 text-center mb-1">Katugunan Client Satisfaction Survey</h1>
        <p className="text-center text-slate-500 text-sm mb-6">Evaluating Officer: <span className="font-semibold text-slate-800">{evaluator.first_name} {evaluator.last_name}</span></p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Client Type</label>
              <select value={clientType} onChange={(e) => setClientType(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none">
                <option value="Student">Student</option>
                <option value="Faculty">Faculty</option>
                <option value="Staff">Staff</option>
                <option value="Alumni">Alumni</option>
                <option value="Visitor">Visitor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Region</label>
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none">
                <option value="Region XII">Region XII</option>
                <option value="NCR">NCR</option>
                <option value="BARMM">BARMM</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Sex</label>
              <select value={sex} onChange={(e) => setSex(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Age</label>
              <input type="number" required value={age} onChange={(e) => setAge(parseInt(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" />
            </div>
          </div>

          {services.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase">Transactions Evaluated</label>
              <div className="space-y-2 border border-slate-200 p-4 rounded-lg">
                {services.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`srv-${s.id}`}
                      checked={selectedServices.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedServices(prev => [...prev, s.id]);
                        else setSelectedServices(prev => prev.filter(id => id !== s.id));
                      }}
                      className="h-4 w-4 border-slate-200 text-emerald-700"
                    />
                    <label htmlFor={`srv-${s.id}`} className="text-sm text-slate-700">{s.service_name}</label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 border-b pb-2 uppercase">Service Quality Dimensions</h3>
            <div className="space-y-4">
              {[
                { name: "sqd0", label: "I am satisfied with the service received." },
                { name: "sqd1", label: "The officer was responsive and helpful." },
                { name: "sqd2", label: "The service provided was reliable and accurate." },
                { name: "sqd3", label: "The office was clean, organized and accessible." },
                { name: "sqd4", label: "Clear instructions were provided for the process." },
              ].map(item => (
                <div key={item.name} className="flex justify-between items-center gap-4">
                  <span className="text-sm text-slate-700">{item.label}</span>
                  <select
                    value={ratings[item.name]}
                    onChange={(e) => handleRatingChange(item.name, parseInt(e.target.value))}
                    className="border border-slate-200 rounded p-1 text-sm focus:outline-none"
                  >
                    <option value="5">Strongly Agree (5)</option>
                    <option value="4">Agree (4)</option>
                    <option value="3">Neutral (3)</option>
                    <option value="2">Disagree (2)</option>
                    <option value="1">Strongly Disagree (1)</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Suggestions / Remarks</label>
            <textarea value={suggestions} onChange={(e) => setSuggestions(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none h-20" placeholder="Please write any remarks or recommendations..." />
          </div>

          <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-md">
            <Send size={16} />
            Submit Feedback
          </button>
        </form>
      </div>
    </main>
  );
}
