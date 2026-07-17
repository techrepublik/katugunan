"use client";

import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";

const cc1Options = [
  { value: "1", label: "I know what a Citizen's Charter is and I saw this office's Citizen's Charter." },
  { value: "2", label: "I know what a Citizen's Charter is but I did not see this office's Citizen's Charter." },
  { value: "3", label: "I learned of the Citizen's Charter only when I saw this office's Citizen's Charter." },
  { value: "4", label: "I do not know what a Citizen's Charter is and I did not see one in this office." }
];

const cc2Options = [
  { value: "1", label: "Easy to see" },
  { value: "2", label: "Difficult to see" },
  { value: "3", label: "Not visible" },
  { value: "4", label: "N/A" }
];

const cc3Options = [
  { value: "1", label: "Helped a lot" },
  { value: "2", label: "Helped somewhat" },
  { value: "3", label: "Did not help" },
  { value: "4", label: "N/A" }
];

const emojiRatings = [
  { value: 1, emoji: "😠", label: "Strongly Disagree" },
  { value: 2, emoji: "🙁", label: "Disagree" },
  { value: 3, emoji: "😐", label: "Neutral" },
  { value: 4, emoji: "🙂", label: "Agree" },
  { value: 5, emoji: "😀", label: "Strongly Agree" }
];

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
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/users/public/${params.username}`);
        if (res.ok) {
          const target = await res.json();
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

          {/* Citizen's Charter Section */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-6">
            <h3 className="text-xs font-bold text-slate-800 border-b pb-2 uppercase tracking-wider">
              Citizen's Charter (CC) Awareness
            </h3>
            
            {/* CC1 Stack */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-slate-700 leading-relaxed">
                CC1. Which of the following best describes your awareness of a Citizen's Charter?
              </label>
              <div className="grid grid-cols-1 gap-2">
                {cc1Options.map((opt) => {
                  const isSelected = cc1 === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setCc1(opt.value);
                        if (opt.value === "4") {
                          setCc2("4");
                          setCc3("4");
                        }
                      }}
                      className={`flex items-center justify-between text-left p-3.5 rounded-xl border text-xs font-medium transition-all duration-200 ${
                        isSelected
                          ? "bg-emerald-50/40 border-emerald-500 text-emerald-900 shadow-sm scale-[1.005]"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50/60"
                      }`}
                    >
                      <span className="pr-4">{opt.label}</span>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                        isSelected 
                          ? "border-emerald-500 bg-emerald-500 text-white" 
                          : "border-slate-300 bg-white"
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CC2 Grid */}
            <div className={`space-y-2 transition-opacity duration-300 ${cc1 === "4" ? "opacity-35 pointer-events-none" : ""}`}>
              <label className="block text-[11px] font-semibold text-slate-700 leading-relaxed">
                CC2. If aware of Citizen's Charter, which of the following best describes the Citizen's Charter of this office?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {cc2Options.map((opt) => {
                  const isSelected = cc2 === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={cc1 === "4"}
                      onClick={() => setCc2(opt.value)}
                      className={`flex items-center justify-between text-left p-3 rounded-xl border text-xs font-medium transition-all duration-200 ${
                        isSelected
                          ? "bg-emerald-50/40 border-emerald-500 text-emerald-900 shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50/60"
                      }`}
                    >
                      <span>{opt.label}</span>
                      <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 transition-all ${
                        isSelected 
                          ? "border-emerald-500 bg-emerald-500 text-white" 
                          : "border-slate-300 bg-white"
                      }`}>
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CC3 Grid */}
            <div className={`space-y-2 transition-opacity duration-300 ${cc1 === "4" ? "opacity-35 pointer-events-none" : ""}`}>
              <label className="block text-[11px] font-semibold text-slate-700 leading-relaxed">
                CC3. If aware of Citizen's Charter, which of the following best describes how the Citizen's Charter helped you in your transaction?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {cc3Options.map((opt) => {
                  const isSelected = cc3 === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={cc1 === "4"}
                      onClick={() => setCc3(opt.value)}
                      className={`flex items-center justify-between text-left p-3 rounded-xl border text-xs font-medium transition-all duration-200 ${
                        isSelected
                          ? "bg-emerald-50/40 border-emerald-500 text-emerald-900 shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50/60"
                      }`}
                    >
                      <span>{opt.label}</span>
                      <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 transition-all ${
                        isSelected 
                          ? "border-emerald-500 bg-emerald-500 text-white" 
                          : "border-slate-300 bg-white"
                      }`}>
                        {isSelected && (
                          <svg className="w-2.5 h-2.5 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Service Quality Dimensions Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 border-b pb-2 uppercase tracking-wider">
              Service Quality Dimensions (SQD)
            </h3>
            
            <div className="space-y-3">
              {[
                { name: "sqd0", label: "SQD0. I am satisfied with the service that I availed.", badge: "Overall Satisfaction" },
                { name: "sqd1", label: "SQD1. I spent a reasonable amount of time for my transaction.", badge: "Responsiveness" },
                { name: "sqd2", label: "SQD2. The office followed the transaction's requirements and steps based on the Citizen's Charter.", badge: "Reliability" },
                { name: "sqd3", label: "SQD3. The steps (including payment) were easy and simple.", badge: "Access & Facilities" },
                { name: "sqd4", label: "SQD4. I easily found information about my transaction from the office or its website.", badge: "Communication" },
                { name: "sqd5", label: "SQD5. I paid a reasonable amount of fees for my transaction.", badge: "Costs" },
                { name: "sqd6", label: "SQD6. I felt the office was fair and honest in its transactions.", badge: "Integrity" },
                { name: "sqd7", label: "SQD7. I was treated with courtesy and respect, and the staff was helpful.", badge: "Assurance" },
                { name: "sqd8", label: "SQD8. I got what I needed from the office, or (if denied, the denial was sufficiently explained.", badge: "Outcome" },
              ].map(item => (
                <div key={item.name} className="flex flex-col md:flex-row justify-between md:items-center gap-3 p-4 bg-white rounded-2xl border border-slate-150 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-1 pr-2">
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">{item.label}</p>
                    <span className="inline-block mt-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      {item.badge}
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1 self-center">
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                      {emojiRatings.map((rating) => {
                        const isSelected = ratings[item.name] === rating.value;
                        return (
                          <button
                            key={rating.value}
                            type="button"
                            onClick={() => handleRatingChange(item.name, rating.value)}
                            className={`w-9 h-9 flex items-center justify-center text-lg rounded-xl transition-all duration-200 ${
                              isSelected 
                                ? "bg-emerald-600 shadow-md scale-110 rotate-0 text-white" 
                                : "opacity-45 hover:opacity-85 scale-100 hover:scale-105 filter grayscale hover:grayscale-0"
                            }`}
                            title={rating.label}
                          >
                            <span className={isSelected ? "filter drop-shadow-sm scale-110" : ""}>
                              {rating.emoji}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {ratings[item.name] !== undefined && (
                      <span className="text-[9px] font-bold text-emerald-700/80 uppercase tracking-wider transition-all duration-300">
                        {emojiRatings.find((r) => r.value === ratings[item.name])?.label}
                      </span>
                    )}
                  </div>
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
