"use client";

import { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { 
  Loader2, 
  Activity, 
  MapPin, 
  Star, 
  Clock, 
  Award, 
  TrendingUp, 
  Compass,
  MessageSquare,
  Sparkles,
  Search,
  Radio,
  FileText
} from "lucide-react";

interface SurveyActivity {
  id: number;
  client_type: string;
  region: string;
  created_on: string | null;
  latitude: number;
  longitude: number;
  sqd0: number;
  sqd1: number;
  sqd2: number;
  sqd3: number;
  sqd4: number;
  sqd5: number;
  sqd6: number;
  sqd7: number;
  sqd8: number;
  suggestions: string | null;
  transaction_types: Record<string, string>;
}

export default function LiveMonitorPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState<SurveyActivity[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null);
  
  // Real-time calculated counters
  const [sessionSurveys, setSessionSurveys] = useState(0);
  const [totalRating, setTotalRating] = useState(0);
  const [totalRatingCount, setTotalRatingCount] = useState(0);
  const [csatCount, setCsatCount] = useState(0);
  const [lastActivity, setLastActivity] = useState<string | null>(null);

  // Map references
  const mapInstance = useRef<any>(null);
  const leafletL = useRef<any>(null);
  const markersRef = useRef<Record<number, any>>({});

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  // Dynamic Leaflet Loader
  const loadLeaflet = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).L) {
        resolve((window as any).L);
        return;
      }
      
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }
      
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => {
        resolve((window as any).L);
      };
      script.onerror = () => {
        reject(new Error("Failed to load Leaflet script"));
      };
      document.body.appendChild(script);
    });
  };

  // 1. Fetch current user and historical surveys
  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // User details
      const userRes = await fetch(`${apiBase}/auth/me`, { headers });
      if (userRes.ok) {
        const userData = await userRes.json();
        setCurrentUser(userData);
      }

      // Latest surveys
      const res = await fetch(`${apiBase}/surveys`, { headers });
      if (res.ok) {
        const data: any[] = await res.json();
        
        // Map to SurveyActivity
        const validSurveys: SurveyActivity[] = data
          .filter(s => s.latitude && s.longitude)
          .map(s => ({
            id: s.id,
            client_type: s.client_type,
            region: s.region,
            created_on: s.created_on,
            latitude: s.latitude,
            longitude: s.longitude,
            sqd0: s.sqd0 || 5,
            sqd1: s.sqd1 || 5,
            sqd2: s.sqd2 || 5,
            sqd3: s.sqd3 || 5,
            sqd4: s.sqd4 || 5,
            sqd5: s.sqd5 || 5,
            sqd6: s.sqd6 || 5,
            sqd7: s.sqd7 || 5,
            sqd8: s.sqd8 || 5,
            suggestions: s.suggestions,
            transaction_types: s.transaction_types || {}
          }));

        setSurveys(validSurveys);
        
        // Compute initial stats
        let sum = 0;
        let count = 0;
        let csat = 0;
        validSurveys.forEach(s => {
          if (s.sqd0 > 0) {
            sum += s.sqd0;
            count += 1;
            if (s.sqd0 >= 4) csat += 1;
          }
        });

        setTotalRating(sum);
        setTotalRatingCount(count);
        setCsatCount(csat);
      }
    } catch (err) {
      console.error("Error loading initial live dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Initialize Leaflet Map
  const initMap = async (L: any) => {
    if (mapInstance.current) return;
    
    // USM Kabacan Campus coordinates
    const map = L.map('live-map', { zoomControl: false }).setView([7.125, 124.842], 15);
    mapInstance.current = map;
    leafletL.current = L;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Zoom controls placed bottom-right out of floating panels way
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Plot existing markers
    surveys.forEach(s => {
      plotSurveyPin(L, map, s);
    });
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return "#047857"; // Green
    if (rating === 3) return "#f59e0b"; // Yellow
    return "#ef4444"; // Red
  };

  const plotSurveyPin = (L: any, map: any, s: SurveyActivity, isNew: boolean = false) => {
    const color = getRatingColor(s.sqd0);
    
    const popupContent = `
      <div style="font-family: sans-serif; font-size: 11px; width: 180px; padding: 2px;">
        <strong style="color: #064e3b; font-size: 12px;">${s.client_type} Evaluation</strong><br/>
        <span style="color: #f59e0b; font-weight: bold; font-size: 11px;">Rating: ${s.sqd0} / 5.0 ★</span><br/>
        <span style="color: #64748b; font-size: 10px;">Service: ${Object.values(s.transaction_types).join(", ") || "General"}</span><br/>
        ${s.suggestions ? `<p style="margin-top: 5px; font-style: italic; background: #f1f5f9; padding: 5px; border-radius: 6px; font-size: 10px; color: #334155; line-height: 1.3;">"${s.suggestions}"</p>` : ""}
      </div>
    `;

    const marker = L.circleMarker([s.latitude, s.longitude], {
      radius: isNew ? 12 : 8,
      fillColor: color,
      color: "#ffffff",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9
    }).bindPopup(popupContent).addTo(map);

    // Store marker reference
    markersRef.current[s.id] = marker;

    if (isNew) {
      marker.openPopup();
      map.flyTo([s.latitude, s.longitude], 17, { animate: true, duration: 1.2 });
      
      setTimeout(() => {
        marker.setStyle({ radius: 8 });
      }, 3000);
    }
  };

  // Click handler to select and pan to survey
  const handleSelectSurvey = (s: SurveyActivity) => {
    setSelectedSurveyId(s.id);
    const marker = markersRef.current[s.id];
    if (marker && mapInstance.current) {
      marker.openPopup();
      mapInstance.current.flyTo([s.latitude, s.longitude], 17, { animate: true, duration: 1.2 });
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Initialize map once
  useEffect(() => {
    if (surveys.length > 0 && !mapInstance.current) {
      loadLeaflet().then((L) => {
        initMap(L);
      }).catch(err => console.error(err));
    }
  }, [surveys]);

  // WebSocket Connection
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWS = () => {
      const wsUrl = apiBase.replace("http://", "ws://").replace("https://", "wss://") + "/surveys/live";
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setWsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "NEW_SURVEY" && payload.survey) {
            const newS: SurveyActivity = payload.survey;

            // Prepend new survey response
            setSurveys(prev => [newS, ...prev]);

            // Increment session counters
            setSessionSurveys(prev => prev + 1);
            setTotalRating(prev => prev + newS.sqd0);
            setTotalRatingCount(prev => prev + 1);
            if (newS.sqd0 >= 4) {
              setCsatCount(prev => prev + 1);
            }
            setLastActivity(new Date().toLocaleTimeString());

            // Plot marker on map
            if (mapInstance.current && leafletL.current) {
              plotSurveyPin(leafletL.current, mapInstance.current, newS, true);
            }
          }
        } catch (e) {
          console.error("WS parse error:", e);
        }
      };

      socket.onclose = () => {
        setWsConnected(false);
        reconnectTimeout = setTimeout(connectWS, 5000);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connectWS();

    return () => {
      if (socket) socket.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  // Compute live averages for the 9 dimensions
  const computeDimensionAverages = () => {
    const averages = Array(9).fill(0);
    const counts = Array(9).fill(0);

    surveys.forEach(s => {
      for (let i = 0; i < 9; i++) {
        const rating = (s as any)[`sqd${i}`];
        if (rating && rating > 0) {
          averages[i] += rating;
          counts[i] += 1;
        }
      }
    });

    const labels = [
      "General Satisfaction",
      "Responsiveness",
      "Reliability",
      "Access & Facilities",
      "Communication",
      "Costs Integrity",
      "Process Integrity",
      "Assurance",
      "Service Outcome"
    ];

    return averages.map((sum, idx) => {
      const avg = counts[idx] > 0 ? sum / counts[idx] : 5.0;
      return {
        label: `SQD${idx} - ${labels[idx]}`,
        avg: avg.toFixed(2),
        percentage: ((avg / 5.0) * 100).toFixed(0)
      };
    });
  };

  const dimensionStats = computeDimensionAverages();
  const overallAvgRating = totalRatingCount > 0 ? (totalRating / totalRatingCount).toFixed(2) : "5.00";
  const overallCsat = totalRatingCount > 0 ? ((csatCount / totalRatingCount) * 100).toFixed(1) : "100.0";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar userLevel={currentUser?.user_level || "Super"} />
      
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <Navbar username={currentUser?.username || "Admin"} userLevel={currentUser?.user_level || "Super"} />

        {/* Real-time Map Viewport */}
        <div className="flex-1 w-full h-[calc(100vh-64px)] relative z-10">
          
          {loading && (
            <div className="absolute inset-0 bg-slate-100 z-50 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="animate-spin text-emerald-700" size={36} />
              <p className="text-xs font-bold text-slate-500">Initializing Live Geolocation Mapping...</p>
            </div>
          )}

          {/* Map canvas */}
          <div id="live-map" className="w-full h-full"></div>

          {/* 1. Floating TOP DOCK: Compact KPI Bar */}
          <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-wrap gap-3 items-center justify-between bg-white/90 backdrop-blur-md border border-slate-200/80 p-3 rounded-2xl shadow-lg pointer-events-auto">
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Radio className={`w-3.5 h-3.5 ${wsConnected ? "text-emerald-500 animate-pulse" : "text-rose-500"}`} />
                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Live Activity</span>
              </div>
              <span className="w-[1px] h-4 bg-slate-200" />
              <span className="text-[10px] font-bold text-slate-500">USM Campus perimeter mapping active</span>
            </div>

            {/* Micro KPIs */}
            <div className="flex items-center gap-6">
              
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-emerald-700" />
                <div className="text-left leading-none">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Surveys</span>
                  <strong className="text-xs font-extrabold text-slate-800">{totalRatingCount}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-amber-500" />
                <div className="text-left leading-none">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Rating</span>
                  <strong className="text-xs font-extrabold text-slate-800">{overallAvgRating} / 5.0</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Award size={14} className="text-emerald-700" />
                <div className="text-left leading-none">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">CSAT</span>
                  <strong className="text-xs font-extrabold text-slate-800">{overallCsat}%</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock size={14} className="text-amber-500" />
                <div className="text-left leading-none">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Last Activity</span>
                  <strong className="text-xs font-extrabold text-slate-800">{lastActivity || "None"}</strong>
                </div>
              </div>

            </div>
          </div>

          {/* 2. Floating LEFT PANEL: Live Activity Feed */}
          <div className="absolute top-20 bottom-4 left-4 w-80 z-[1000] flex flex-col bg-white/90 backdrop-blur-md border border-slate-200/80 p-4 rounded-2xl shadow-lg pointer-events-auto">
            <div className="border-b border-slate-100 pb-2 mb-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <MessageSquare size={13} className="text-emerald-700" />
                <span>Live Feed Logs ({surveys.length})</span>
              </h3>
              <p className="text-[9px] text-slate-400 mt-0.5">Click a card to locate submission node on map</p>
            </div>

            {/* Scrollable feed container */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              {surveys.length > 0 ? (
                surveys.map((s, index) => (
                  <button 
                    key={s.id} 
                    onClick={() => handleSelectSurvey(s)}
                    className={`w-full text-left p-2.5 rounded-xl border border-slate-100/80 bg-white hover:border-emerald-300 hover:shadow-sm transition-all flex flex-col space-y-1.5 ${
                      selectedSurveyId === s.id ? "border-emerald-500 bg-emerald-50/10 shadow-sm" : ""
                    } ${
                      index === 0 && sessionSurveys > 0 ? "border-emerald-300 bg-emerald-50/30 animate-[slideDown_0.5s_ease-out]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                      <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-100">{s.client_type}</span>
                      <span>{s.region}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            size={10} 
                            className={i < s.sqd0 ? "text-amber-400 fill-amber-400" : "text-slate-200"} 
                          />
                        ))}
                      </div>
                      <span className="text-[9px] font-extrabold text-slate-700">{s.sqd0}.0 ★</span>
                    </div>

                    <div className="text-[9px] font-semibold text-slate-500 truncate">
                      <strong>Service:</strong> {Object.values(s.transaction_types).join(", ") || "General Inquiry"}
                    </div>

                    {s.suggestions && (
                      <p className="text-[9px] font-medium text-slate-500 italic bg-slate-50 p-1.5 rounded border border-slate-100/60 leading-relaxed truncate">
                        "{s.suggestions}"
                      </p>
                    )}
                  </button>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center space-y-2 text-slate-400 py-10">
                  <Loader2 className="animate-spin text-emerald-700" size={18} />
                  <span className="text-[10px] font-bold">Waiting for survey logs...</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Floating RIGHT PANEL: Survey SQD Values */}
          <div className="absolute top-20 bottom-4 right-4 w-80 z-[1000] flex flex-col bg-white/90 backdrop-blur-md border border-slate-200/80 p-4 rounded-2xl shadow-lg pointer-events-auto">
            <div className="border-b border-slate-100 pb-2 mb-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles size={13} className="text-amber-500" />
                <span>Dimension Quality Values</span>
              </h3>
              <p className="text-[9px] text-slate-400 mt-0.5">Real-time rating averages out of 5.0</p>
            </div>

            {/* Scrollable list of SQD bar metrics */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              {dimensionStats.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-[9px] font-bold">
                    <span className="text-slate-650 truncate max-w-[190px]">{item.label}</span>
                    <span className="text-slate-500 font-extrabold">{item.avg} ★ ({item.percentage}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
                    <div 
                      className="bg-emerald-700 h-1.5 transition-all duration-500" 
                      style={{ width: `${Math.min(Number(item.percentage), 70)}%` }}
                    ></div>
                    {Number(item.percentage) > 70 && (
                      <div 
                        className="bg-amber-400 h-1.5 transition-all duration-500" 
                        style={{ width: `${Number(item.percentage) - 70}%` }}
                      ></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
