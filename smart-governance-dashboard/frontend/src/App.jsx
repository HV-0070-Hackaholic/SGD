import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield, AlertTriangle, Activity, MapPin, Gauge, Radio, Cpu,
  RefreshCw, CheckCircle2, Clock, Zap, BarChart3, Filter, Plus,
  Send, Sparkles, Building2, Flame, Droplet, ZapOff, Siren,
  CheckCircle, ArrowUpRight, Search, ChevronRight, Layers, Eye,
  Compass, Globe, Navigation, Users, Thermometer, Wind, Crosshair,
  Maximize2, Minimize2, Truck, Waves, Route, Map as MapIcon,
  EyeOff, Satellite, CloudSun, Languages
} from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  Polyline,
  Polygon,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';

import {
  TELANGANA_STATE_BOUNDARY,
  TELANGANA_HIGHWAYS,
  TELANGANA_RIVERS,
  TELANGANA_LAKES,
  TELANGANA_EMERGENCY_FLEET,
  DISTRICT_WEATHER_DATA
} from './data/telanganaGeoData.js';

import { LANGUAGES, TRANSLATIONS } from './data/translations.js';

const backendUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_BASE = `${backendUrl}/api`;
const WS_BASE = import.meta.env.VITE_WS_URL || backendUrl.replace(/^http/, 'ws');

// Custom Map Marker Icons using Leaflet divIcon with transparent wrapper
const createCustomIcon = (priority, status) => {
  let color = '#3b82f6'; // blue
  if (status === 'resolved') color = '#10b981'; // emerald
  else if (priority === 'Critical') color = '#f43f5e'; // rose
  else if (priority === 'High') color = '#f59e0b'; // amber
  else if (priority === 'Medium') color = '#06b6d4'; // cyan

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: ${color}; opacity: 0.35; animation: pulse-ring 2s infinite;"></span>
        <span style="position: relative; width: 14px; height: 14px; border-radius: 50%; background-color: ${color}; border: 2.5px solid #0f172a; box-shadow: 0 0 12px ${color};"></span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

// Municipal City Hub Marker for Telangana / National Map
const createCityHubIcon = (name, riskScore, isSelected = false) => {
  const badgeColor = riskScore >= 75 ? '#f43f5e' : (riskScore >= 50 ? '#f59e0b' : '#10b981');
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="display: flex; flex-direction: column; align-items: center; pointer-events: auto; cursor: pointer;">
        <div style="
          background: rgba(10, 15, 30, 0.92);
          backdrop-filter: blur(8px);
          border: 1px solid ${isSelected ? '#10b981' : 'rgba(71, 85, 105, 0.7)'};
          box-shadow: 0 4px 14px rgba(0,0,0,0.6);
          padding: 3px 8px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          color: #f1f5f9;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 6px;
        ">
          <span style="width: 7px; height: 7px; border-radius: 50%; background-color: ${badgeColor};"></span>
          <span>${name}</span>
          <span style="color: ${badgeColor}; font-family: monospace; font-size: 10px;">${riskScore}%</span>
        </div>
        <div style="width: 2px; height: 6px; background-color: ${isSelected ? '#10b981' : '#64748b'};"></div>
      </div>
    `,
    iconSize: [110, 36],
    iconAnchor: [55, 36],
    popupAnchor: [0, -36]
  });
};

// Emergency Fleet Vehicle Custom Icon
const createFleetIcon = (fleet) => {
  const bg = fleet.type === 'fire' ? '#ef4444' :
             fleet.type === 'water' ? '#0284c7' :
             fleet.type === 'electric' ? '#f59e0b' :
             fleet.type === 'medical' ? '#10b981' : '#8b5cf6';

  return L.divIcon({
    className: 'custom-leaflet-marker fleet-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
        <span style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: ${bg}; opacity: 0.4; animation: pulse-ring 2.2s infinite;"></span>
        <div style="
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #090d16;
          border: 2px solid ${bg};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          box-shadow: 0 0 10px ${bg};
        ">
          ${fleet.icon}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

// Map click listener to select coordinates for reporting
function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

// Live Mouse Cursor Coordinates Tracker
function MapCursorTracker({ onPositionChange }) {
  useMapEvents({
    mousemove(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

// Dynamic Map Controller for Smooth Fly-To Navigation
function MapViewController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.length === 2 && center[0] && center[1]) {
      map.flyTo(center, zoom, { duration: 1.2, easeLinearity: 0.25 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function App() {
  // Language Selection state (persisted to localStorage)
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('govpulse_lang') || 'en';
  });

  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('govpulse_lang', newLang);
  };

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const [activeTab, setActiveTab] = useState('overview');
  const [geoScope, setGeoScope] = useState('Telangana'); // 'Telangana' or 'All-India'
  const [incidents, setIncidents] = useState([]);
  const [zones, setZones] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsLatency, setWsLatency] = useState('14ms');

  // Realistic Map Features State
  const [mapStyle, setMapStyle] = useState('satellite'); // 'satellite', 'cyber', 'streets', 'topo'
  const [showHighways, setShowHighways] = useState(true);
  const [showRivers, setShowRivers] = useState(true);
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showFleet, setShowFleet] = useState(true);
  const [showRadii, setShowRadii] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);

  // Map viewport & cursor state
  const [mapCenter, setMapCenter] = useState([17.8500, 79.1500]); // Center of Telangana
  const [mapZoom, setMapZoom] = useState(8);
  const [selectedCityPin, setSelectedCityPin] = useState(null);
  const [cursorPos, setCursorPos] = useState({ lat: 17.3850, lng: 78.4867 });

  // New incident form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedZone, setSelectedZone] = useState('TS-HYD-W');
  const [customLat, setCustomLat] = useState(null);
  const [customLng, setCustomLng] = useState(null);
  const [pinnedLocationName, setPinnedLocationName] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDistrict, setFilterDistrict] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Simulator state
  const [simZone, setSimZone] = useState('TS-HYD-W');
  const [simTraffic, setSimTraffic] = useState(84);
  const [simTemp, setSimTemp] = useState(36.5);
  const [simWeather, setSimWeather] = useState('Clear');
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  // Selected incident modal
  const [activeIncident, setActiveIncident] = useState(null);

  // Refs for WebSocket latency calculation and clean reconnects
  const lastPingTimeRef = useRef(0);
  const wsRef = useRef(null);

  // Fetch initial incidents, zones, and analytics
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/incidents`);
      const data = await res.json();
      setIncidents(data);
    } catch (e) {
      console.error('Error fetching incidents:', e);
    }
  }, []);

  const fetchZones = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/zones`);
      const data = await res.json();
      setZones(data);
    } catch (e) {
      console.error('Error fetching zones:', e);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics`);
      const data = await res.json();
      setAnalytics(data);
    } catch (e) {
      console.error('Error fetching analytics:', e);
    }
  }, []);

  // Run ML Simulation
  const handleRunPrediction = useCallback(async (zone = simZone, traffic = simTraffic, temp = simTemp, weather = simWeather) => {
    setSimLoading(true);
    try {
      const res = await fetch(`${API_BASE}/simulate-zone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_id: zone,
          temperature: parseFloat(temp),
          traffic_density: parseFloat(traffic),
          weather
        })
      });
      const data = await res.json();
      setSimResult(data);
    } catch (err) {
      console.error('Simulation request failed:', err);
    } finally {
      setSimLoading(false);
    }
  }, [simZone, simTraffic, simTemp, simWeather]);

  // WebSocket Connection Lifecycle with robust ping and instant message handler
  useEffect(() => {
    let pingInterval;
    let reconnectTimeout;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(WS_BASE);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsConnected(true);
          console.log('[WebSocket] Connected to GovPulse Civic Hub');

          // Start ping cycle to calculate latency
          pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              lastPingTimeRef.current = performance.now();
              ws.send(JSON.stringify({ type: 'PING' }));
            }
          }, 4000);
        };

        // Attach onmessage immediately to prevent dropping events
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'PONG') {
              const elapsed = Math.round(performance.now() - lastPingTimeRef.current);
              setWsLatency(`${Math.max(4, elapsed)}ms`);
            } else if (data.type === 'INCIDENT_CREATED') {
              setIncidents((prev) => [data.payload, ...prev.filter(i => i.id !== data.payload.id)]);
              fetchAnalytics();
            } else if (data.type === 'INCIDENT_UPDATED') {
              setIncidents((prev) => prev.map((inc) => inc.id === data.payload.id ? data.payload : inc));
              fetchAnalytics();
            } else if (data.type === 'ZONE_SIMULATION_UPDATED') {
              fetchZones();
              if (data.payload.zone_id === simZone) {
                setSimResult(data.payload);
              }
            }
          } catch (e) {
            console.warn('[WebSocket] Error parsing message:', e);
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          clearInterval(pingInterval);
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch (err) {
        setWsConnected(false);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pingInterval) clearInterval(pingInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [fetchAnalytics, fetchZones, simZone]);

  useEffect(() => {
    fetchIncidents();
    fetchZones();
    fetchAnalytics();
    // Run initial simulation for Hyderabad Cyberabad
    handleRunPrediction('TS-HYD-W', 86, 36.5, 'Clear');
  }, [fetchIncidents, fetchZones, fetchAnalytics]);

  // Handle Switch between Telangana State & All India
  const handleScopeChange = (scope) => {
    setGeoScope(scope);
    if (scope === 'Telangana') {
      setMapCenter([17.8500, 79.1500]);
      setMapZoom(8);
      setSelectedCityPin(null);
    } else {
      setMapCenter([21.5000, 78.9629]);
      setMapZoom(5);
      setSelectedCityPin(null);
    }
  };

  // Fly to specific city / zone
  const handleFlyToZone = (zone) => {
    setMapCenter([zone.lat, zone.lng]);
    setMapZoom(12);
    setSelectedCityPin(zone.zone_id);
  };

  // Create incident handler
  const handleCreateIncident = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          zone_id: selectedZone,
          lat: customLat,
          lng: customLng
        })
      });
      const data = await res.json();
      setIncidents(prev => [data, ...prev.filter(i => i.id !== data.id)]);
      setNewTitle('');
      setNewDescription('');
      setCustomLat(null);
      setCustomLng(null);
      setPinnedLocationName('');
      fetchAnalytics();
      setActiveTab('triage');
    } catch (err) {
      console.error('Submission failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Status update handler
  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const updated = await res.json();
      setIncidents(prev => prev.map(i => i.id === id ? updated : i));
      if (activeIncident && activeIncident.id === id) {
        setActiveIncident(updated);
      }
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Quick preset grievance filler tailored for Telangana municipal operations
  const setQuickTemplate = (title, desc, zone) => {
    setNewTitle(title);
    setNewDescription(desc);
    setSelectedZone(zone);
    const target = zones.find(z => z.zone_id === zone);
    if (target) {
      setCustomLat(target.lat + (Math.random() - 0.5) * 0.012);
      setCustomLng(target.lng + (Math.random() - 0.5) * 0.012);
      setPinnedLocationName(`${target.city} (${target.district || 'Telangana'})`);
    }
  };

  // Filtered incidents
  const filteredIncidents = incidents.filter(inc => {
    if (geoScope === 'Telangana' && inc.state && inc.state !== 'Telangana') return false;
    if (filterCategory !== 'all' && inc.category !== filterCategory) return false;
    if (filterPriority !== 'all' && inc.priority !== filterPriority) return false;
    if (filterStatus !== 'all' && inc.status !== filterStatus) return false;
    if (filterDistrict !== 'all' && inc.district !== filterDistrict) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inc.title.toLowerCase().includes(q) ||
        (inc.zone_name && inc.zone_name.toLowerCase().includes(q)) ||
        (inc.department && inc.department.toLowerCase().includes(q)) ||
        (inc.district && inc.district.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Zones for current scope
  const displayZones = zones.filter(z => {
    if (geoScope === 'Telangana') return z.state === 'Telangana';
    return true;
  });

  const telanganaZones = zones.filter(z => z.state === 'Telangana');
  const nationalZones = zones.filter(z => z.state !== 'Telangana');

  const totalComplaints = filteredIncidents.length;
  const pendingComplaints = filteredIncidents.filter(i => i.status === 'pending').length;
  const highPriorityComplaints = filteredIncidents.filter(i => ['High', 'Critical'].includes(i.priority)).length;
  const inProgressComplaints = filteredIncidents.filter(i => ['in_progress', 'dispatched'].includes(i.status)).length;
  const resolvedComplaints = filteredIncidents.filter(i => i.status === 'resolved').length;

  // Estimated Deccan elevation calculation
  const estimatedElev = Math.round(190 + Math.abs(Math.sin(cursorPos.lat * 2.5) * 310) + Math.abs(Math.cos(cursorPos.lng * 2.2) * 120));

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Critical':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-800/80"><Flame className="w-3 h-3 text-rose-400" /> {lang === 'te' ? 'అత్యవసరం' : lang === 'hi' ? 'गंभीर' : lang === 'ur' ? 'انتہائی اہم' : 'Critical'}</span>;
      case 'High':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/80"><AlertTriangle className="w-3 h-3 text-amber-400" /> {lang === 'te' ? 'తీవ్రమైనది' : lang === 'hi' ? 'उच्च' : lang === 'ur' ? 'سنگین' : 'High'}</span>;
      case 'Medium':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-800/80"><Activity className="w-3 h-3 text-cyan-400" /> {lang === 'te' ? 'మధ్యస్థం' : lang === 'hi' ? 'मध्यम' : lang === 'ur' ? 'درمیانی' : 'Medium'}</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700"><Clock className="w-3 h-3 text-slate-400" /> {lang === 'te' ? 'సాధారణం' : lang === 'hi' ? 'सामान्य' : lang === 'ur' ? 'معمولی' : 'Low'}</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {t.resolvedStatus}</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-950/80 text-sky-400 border border-sky-800/80 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> {t.inProgressStatus}</span>;
      case 'dispatched':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-950/80 text-purple-400 border border-purple-800/80 flex items-center gap-1"><Radio className="w-3 h-3" /> {t.dispatchedStatus}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60 flex items-center gap-1"><Clock className="w-3 h-3" /> {t.pendingStatus}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-emerald-500/20 selection:text-emerald-300" dir={lang === 'ur' ? 'rtl' : 'ltr'}>
      {/* Sleek Enterprise Sidebar */}
      <aside className="w-72 bg-[#090d16] border-r border-slate-800/80 flex flex-col justify-between hidden md:flex shrink-0">
        <div>
          {/* Brand header */}
          <div className="p-6 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/40 shrink-0">
                <Zap className="w-5 h-5 text-slate-950 font-black fill-slate-950" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  {t.appTitle} <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-medium border border-emerald-500/30">AI</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-mono tracking-wide">{t.appSubtitle}</p>
              </div>
            </div>
          </div>

          {/* Regional GeoScope Switcher */}
          <div className="px-4 pt-4">
            <div className="bg-slate-900/90 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
              <button
                onClick={() => handleScopeChange('Telangana')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition flex items-center justify-center gap-1.5 ${
                  geoScope === 'Telangana'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                {t.telanganaState}
              </button>
              <button
                onClick={() => handleScopeChange('All-India')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-medium transition flex items-center justify-center gap-1.5 ${
                  geoScope === 'All-India'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                {t.allIndia}
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="p-4 space-y-1.5">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">{t.operations}</div>

            <button
              id="nav-overview"
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4" />
                {t.navOverview}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">{filteredIncidents.length}</span>
            </button>

            <button
              id="nav-triage"
              onClick={() => setActiveTab('triage')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'triage'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4" />
                {t.navTriage}
              </span>
              {pendingComplaints > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                  {pendingComplaints}
                </span>
              )}
            </button>

            <button
              id="nav-map"
              onClick={() => setActiveTab('map')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'map'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-3">
                <MapPin className="w-4 h-4" />
                {t.navMap}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </button>

            <button
              id="nav-simulator"
              onClick={() => setActiveTab('simulator')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <span className="flex items-center gap-3">
                <Gauge className="w-4 h-4" />
                {t.navSimulator}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">ML</span>
            </button>
          </div>

          {/* Real-time Telangana Municipalities Telemetry List */}
          <div className="px-4 py-3 mx-4 mt-2 bg-slate-900/60 rounded-xl border border-slate-800/80 max-h-[240px] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                {geoScope === 'Telangana' ? `${t.telanganaState} (17)` : t.allIndia}
              </span>
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="space-y-1.5 text-xs">
              {displayZones.map(z => (
                <div
                  key={z.zone_id}
                  onClick={() => {
                    handleFlyToZone(z);
                    setSimZone(z.zone_id);
                  }}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/80 cursor-pointer transition text-slate-400 hover:text-white group"
                >
                  <div className="truncate max-w-[135px]">
                    <span className="text-white font-medium block truncate text-[11px]">{z.city}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{z.district || z.name}</span>
                  </div>
                  <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
                    z.risk_score >= 75 ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                    z.risk_score >= 50 ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}>
                    {z.risk_score}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Footer with Language Indicator */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
              <span>{wsConnected ? 'WebSocket Live' : 'Reconnecting...'}</span>
            </div>
            <span className="font-mono text-[11px] text-slate-300">{wsLatency}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-mono">SQLite DB • Telangana MA&UD • GHMC</div>
        </div>
      </aside>

      {/* Main Command View */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        {/* Top App Header with Language Selector & Scope Switches */}
        <header className="bg-slate-900/70 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-base font-semibold text-white capitalize flex items-center gap-2">
                {activeTab === 'overview' && `${t.appTitle} • ${t.navOverview}`}
                {activeTab === 'triage' && t.navTriage}
                {activeTab === 'map' && `${t.navMap} • ${geoScope === 'Telangana' ? t.telanganaState : t.allIndia}`}
                {activeTab === 'simulator' && t.navSimulator}
              </h2>
              <p className="text-xs text-slate-400">
                {geoScope === 'Telangana'
                  ? 'Covering Hyderabad, Warangal, Karimnagar, Nizamabad, Khammam, Ramagundam & 15+ Telangana Municipalities'
                  : 'National Macro-Telemetry: Delhi NCR, Mumbai, Bengaluru, Chennai, Kolkata & Telangana'
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Selector Dropdown */}
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1.5 rounded-xl border border-slate-800 text-xs shadow-sm">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <select
                id="language-selector"
                value={lang}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none cursor-pointer pr-1"
                title="Change Interface Language / భాష మార్చండి"
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code} className="bg-slate-900 text-white py-1">
                    {l.flag} {l.native}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick scope switcher in header */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => handleScopeChange('Telangana')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  geoScope === 'Telangana' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.telanganaState}
              </button>
              <button
                onClick={() => handleScopeChange('All-India')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  geoScope === 'All-India' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.allIndia}
              </button>
            </div>

            <button
              onClick={() => { fetchIncidents(); fetchZones(); fetchAnalytics(); }}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition border border-slate-700/60"
              title={t.refresh}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 rounded-full text-xs font-semibold">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              {t.liveFeed}
            </div>
          </div>
        </header>

        {/* Body Content */}
        <div className="p-6 flex-1 space-y-6 max-w-7xl w-full mx-auto">
          {/* Officer Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="bg-slate-900/80 border border-slate-800/90 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition"></div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">{t.totalComplaints}</p>
              <div className="flex items-baseline justify-between mt-2">
                <h3 className="text-3xl font-bold text-white tracking-tight">{totalComplaints}</h3>
                <span className="text-xs font-medium text-emerald-400 flex items-center">
                  <ArrowUpRight className="w-3.5 h-3.5" /> {t.live}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (totalComplaints / 12) * 100)}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition"></div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">{t.pendingTriage}</p>
              <div className="flex items-baseline justify-between mt-2">
                <h3 className="text-3xl font-bold text-amber-400 tracking-tight">{pendingComplaints}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800 font-mono">{t.awaiting}</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(pendingComplaints / (totalComplaints || 1)) * 100}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl group-hover:bg-rose-500/10 transition"></div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">{t.criticalHigh}</p>
              <div className="flex items-baseline justify-between mt-2">
                <h3 className="text-3xl font-bold text-rose-400 tracking-tight">{highPriorityComplaints}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-800 font-mono">{t.urgent}</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(highPriorityComplaints / (totalComplaints || 1)) * 100}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl group-hover:bg-sky-500/10 transition"></div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">{t.squadsInAction}</p>
              <div className="flex items-baseline justify-between mt-2">
                <h3 className="text-3xl font-bold text-sky-400 tracking-tight">{inProgressComplaints}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-sky-950/80 text-sky-400 border border-sky-800 font-mono">{t.active}</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="bg-sky-500 h-full rounded-full" style={{ width: `${(inProgressComplaints / (totalComplaints || 1)) * 100}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/90 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition"></div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider font-mono">{t.resolvedClosed}</p>
              <div className="flex items-baseline justify-between mt-2">
                <h3 className="text-3xl font-bold text-emerald-400 tracking-tight">{resolvedComplaints}</h3>
                <span className="text-xs font-medium text-emerald-400 flex items-center">
                  <CheckCircle className="w-3.5 h-3.5" /> {t.complete}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(resolvedComplaints / (totalComplaints || 1)) * 100}%` }}></div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: COMMAND OVERVIEW */}
          {/* ========================================================= */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Citizen Grievance Submission with Telangana Presets */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#090d16] border border-slate-800/90 p-6 rounded-2xl shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        {t.fileGrievanceTitle}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {t.fileGrievanceSubtitle}
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleCreateIncident} className="space-y-4">
                    <div>
                      <input
                        id="incident-title-input"
                        type="text"
                        placeholder={t.inputPlaceholder}
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/80 transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder={t.descPlaceholder}
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/80 transition"
                      />
                      
                      {/* Dynamic Zone Selector */}
                      <select
                        id="incident-zone-select"
                        value={selectedZone}
                        onChange={(e) => {
                          setSelectedZone(e.target.value);
                          const matched = zones.find(z => z.zone_id === e.target.value);
                          if (matched) {
                            setCustomLat(null);
                            setCustomLng(null);
                            setPinnedLocationName('');
                          }
                        }}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/80 transition"
                      >
                        <optgroup label={`${t.telanganaState} Municipal Corporations`}>
                          {telanganaZones.map(z => (
                            <option key={z.zone_id} value={z.zone_id}>
                              {z.city}: {z.name} ({z.district || 'Telangana'})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label={t.allIndia}>
                          {nationalZones.map(z => (
                            <option key={z.zone_id} value={z.zone_id}>
                              {z.city}: {z.name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    {/* Show custom GPS coordinates if map clicked */}
                    {customLat && customLng && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between text-xs text-emerald-300">
                        <span className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          {t.gpsPinned}: <strong>{customLat.toFixed(4)}, {customLng.toFixed(4)}</strong> {pinnedLocationName ? `(${pinnedLocationName})` : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => { setCustomLat(null); setCustomLng(null); setPinnedLocationName(''); }}
                          className="text-slate-400 hover:text-white text-[11px]"
                        >
                          {t.resetPin}
                        </button>
                      </div>
                    )}

                    {/* Quick Demo Templates */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] text-slate-400 font-mono">{t.testScenarios}</span>
                      <button
                        type="button"
                        onClick={() => setQuickTemplate("High-voltage TSSPDCL underground cable fault and transformer fire", "Sparks near Hitec City metro station pillar 1021.", "TS-HYD-W")}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
                      >
                        {t.presetFire}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickTemplate("Bhadrakali storm drainage canal overflow flooding Kazipet underpass", "2 feet of stormwater stalling private buses.", "TS-WGL")}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
                      >
                        {t.presetFlood}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickTemplate("Mission Bhagiratha main bulk pipeline valve burst flooding road", "High pressure potable water fountain reaching 20 feet.", "TS-SDP")}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
                      >
                        {t.presetWater}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickTemplate("Thermal fly-ash slurry pipe rupture on Ramagundam NTPC link road", "Hazardous fly-ash slurry coating carriageway.", "TS-RGD")}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
                      >
                        {t.presetHazard}
                      </button>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        id="submit-incident-btn"
                        type="submit"
                        disabled={loading || !newTitle.trim()}
                        className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-semibold px-6 py-2.5 rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                            {t.aiClassifying}
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 text-slate-950" />
                            {t.classifyAndDispatch}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Incident Distribution by Department */}
                <div className="bg-[#090d16] border border-slate-800/90 p-6 rounded-2xl">
                  <h3 className="text-base font-semibold text-white mb-4 flex items-center justify-between">
                    <span>{t.deptDistribution}</span>
                    <Building2 className="w-4 h-4 text-slate-400" />
                  </h3>
                  <div className="space-y-3">
                    {analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
                      analytics.categoryBreakdown.map((cat, idx) => (
                        <div key={cat.category} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-300">{cat.category}</span>
                            <span className="text-slate-400 font-mono">{cat.count} {t.tickets} ({Math.round((cat.count / (incidents.length || 1)) * 100)}%)</span>
                          </div>
                          <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                idx === 0 ? 'bg-emerald-500' :
                                idx === 1 ? 'bg-amber-500' :
                                idx === 2 ? 'bg-sky-500' :
                                idx === 3 ? 'bg-purple-500' : 'bg-rose-500'
                              }`}
                              style={{ width: `${(cat.count / (incidents.length || 1)) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">{t.noTelemetryYet}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Live Telemetry Stream & Telangana District Quick Nav */}
              <div className="space-y-6">
                {/* Live Activity Stream */}
                <div className="bg-[#090d16] border border-slate-800/90 p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                      {t.liveActivity}
                    </h3>
                    <span className="text-[11px] font-mono text-slate-300">{t.dbStream}</span>
                  </div>

                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {analytics?.recentLogs?.map((log) => (
                      <div key={log.id} className="p-3 bg-slate-950/70 border border-slate-800/70 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                            log.action === 'CREATED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            'bg-sky-950 text-sky-400 border border-sky-800'
                          }`}>
                            {log.action}
                          </span>
                          <span className="text-[10px] font-mono text-slate-300">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 line-clamp-2">{log.details}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Map preview banner */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-5 rounded-2xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{t.mapPreviewTitle}</h4>
                      <p className="text-xs text-slate-400 mt-1">{t.mapPreviewDesc}</p>
                    </div>
                    <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
                  </div>
                  <button
                    onClick={() => setActiveTab('map')}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-medium transition border border-slate-700 shadow-md"
                  >
                    {t.openSatelliteMap} <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: GRIEVANCE TRIAGE QUEUE */}
          {/* ========================================================= */}
          {activeTab === 'triage' && (
            <div className="space-y-6">
              {/* Filter and Search Bar */}
              <div className="bg-[#090d16] border border-slate-800/90 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/80"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="all">{t.allPriorities}</option>
                    <option value="Critical">{t.criticalOnly}</option>
                    <option value="High">{t.highOnly}</option>
                    <option value="Medium">{t.mediumOnly}</option>
                    <option value="Low">{t.lowOnly}</option>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
                  >
                    <option value="all">{t.allStatuses}</option>
                    <option value="pending">{t.pendingStatus}</option>
                    <option value="dispatched">{t.dispatchedStatus}</option>
                    <option value="in_progress">{t.inProgressStatus}</option>
                    <option value="resolved">{t.resolvedStatus}</option>
                  </select>

                  <button
                    onClick={() => { setFilterPriority('all'); setFilterStatus('all'); setFilterCategory('all'); setFilterDistrict('all'); setSearchQuery(''); }}
                    className="text-xs px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
                  >
                    {t.resetFilters}
                  </button>
                </div>
              </div>

              {/* Triage Incidents Cards */}
              <div className="space-y-3">
                {filteredIncidents.length === 0 ? (
                  <div className="bg-[#090d16] border border-slate-800/90 p-12 rounded-2xl text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                    <h4 className="text-base font-semibold text-slate-200">{t.noIncidentsFound}</h4>
                    <p className="text-xs text-slate-400 mt-1">{t.noIncidentsDesc}</p>
                  </div>
                ) : (
                  filteredIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="bg-[#090d16] border border-slate-800/90 hover:border-slate-700 p-5 rounded-2xl transition duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono text-slate-300">#{inc.id}</span>
                          {getPriorityBadge(inc.priority)}
                          {getStatusBadge(inc.status)}
                          <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-800/80 text-slate-300 font-medium">
                            {inc.category}
                          </span>
                          <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" /> {t.sla}: {inc.sla_hours}h
                          </span>
                        </div>

                        <h4 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition">
                          {inc.title}
                        </h4>

                        {inc.description && (
                          <p className="text-xs text-slate-400 line-clamp-1">{inc.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-300" />
                            {inc.department}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-300" />
                            {inc.zone_name || inc.zone_id}
                          </span>
                          {inc.district && (
                            <span className="text-slate-400 font-mono text-[11px]">
                              {t.dist}: {inc.district}
                            </span>
                          )}
                          <span className="text-emerald-400 font-mono text-[11px]">
                            {t.confidence}: {Math.round((inc.confidence || 0.88) * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Action Dispatch Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        {inc.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus(inc.id, 'dispatched')}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                          >
                            <Radio className="w-3.5 h-3.5" /> {t.dispatchSquad}
                          </button>
                        )}
                        {inc.status === 'dispatched' && (
                          <button
                            onClick={() => handleUpdateStatus(inc.id, 'in_progress')}
                            className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> {t.markInProgress}
                          </button>
                        )}
                        {inc.status === 'in_progress' && (
                          <button
                            onClick={() => handleUpdateStatus(inc.id, 'resolved')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> {t.markResolved}
                          </button>
                        )}
                        {inc.status === 'resolved' && (
                          <span className="text-xs text-emerald-400 font-medium px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800">
                            {t.ticketClosed}
                          </span>
                        )}

                        <button
                          onClick={() => setActiveIncident(inc)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium transition"
                        >
                          {t.detailsBtn}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: REALISTIC GEOSPATIAL COMMAND MAP */}
          {/* ========================================================= */}
          {activeTab === 'map' && (
            <div className={`space-y-4 ${isFullscreenMap ? 'fixed inset-0 z-50 bg-slate-950 p-6 overflow-hidden flex flex-col' : ''}`}>
              {/* Top Controls Dock */}
              <div className="bg-[#090d16] border border-slate-800/90 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Satellite className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      {geoScope === 'Telangana'
                        ? t.mapHeaderTitle
                        : t.mapHeaderNational
                      }
                    </h3>
                    <p className="text-xs text-slate-400">{t.mapHeaderSubtitle}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {/* Scope Switcher */}
                  <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
                    <button
                      onClick={() => handleScopeChange('Telangana')}
                      className={`px-3 py-1 rounded-lg font-medium transition ${
                        geoScope === 'Telangana' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.telanganaState}
                    </button>
                    <button
                      onClick={() => handleScopeChange('All-India')}
                      className={`px-3 py-1 rounded-lg font-medium transition ${
                        geoScope === 'All-India' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.allIndia}
                    </button>
                  </div>

                  {/* Basemap Style Switcher */}
                  <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
                    <button
                      onClick={() => setMapStyle('satellite')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                        mapStyle === 'satellite' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Photorealistic Esri Satellite Imagery"
                    >
                      <Satellite className="w-3.5 h-3.5" />
                      {t.satellite}
                    </button>
                    <button
                      onClick={() => setMapStyle('cyber')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                        mapStyle === 'cyber' ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'text-slate-400 hover:text-white'
                      }`}
                      title="CartoDB Dark Matter"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      {t.cyberDark}
                    </button>
                    <button
                      onClick={() => setMapStyle('streets')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                        mapStyle === 'streets' ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Street View"
                    >
                      <MapIcon className="w-3.5 h-3.5" />
                      {t.streets}
                    </button>
                    <button
                      onClick={() => setMapStyle('topo')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                        mapStyle === 'topo' ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'text-slate-400 hover:text-white'
                      }`}
                      title="Topographic Elevation Relief"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      {t.topo}
                    </button>
                  </div>

                  {/* Fullscreen Toggle */}
                  <button
                    onClick={() => setIsFullscreenMap(!isFullscreenMap)}
                    className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
                    title={isFullscreenMap ? 'Exit Fullscreen' : 'Fullscreen Map'}
                  >
                    {isFullscreenMap ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* GIS Layer Toggles & City Quick-Focus Bar */}
              <div className="bg-[#090d16]/90 border border-slate-800 p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 shrink-0">
                {/* Layer Toggles */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-mono text-slate-400 px-1.5 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-emerald-400" /> {t.gisLayers}
                  </span>
                  
                  <button
                    onClick={() => setShowBoundaries(!showBoundaries)}
                    className={`px-2 py-1 rounded-lg transition border text-[11px] flex items-center gap-1 font-medium ${
                      showBoundaries ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    <Shield className="w-3 h-3" /> {t.stateBoundary}
                  </button>

                  <button
                    onClick={() => setShowHighways(!showHighways)}
                    className={`px-2 py-1 rounded-lg transition border text-[11px] flex items-center gap-1 font-medium ${
                      showHighways ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    <Route className="w-3 h-3" /> {t.highways}
                  </button>

                  <button
                    onClick={() => setShowRivers(!showRivers)}
                    className={`px-2 py-1 rounded-lg transition border text-[11px] flex items-center gap-1 font-medium ${
                      showRivers ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    <Waves className="w-3 h-3" /> {t.rivers}
                  </button>

                  <button
                    onClick={() => setShowFleet(!showFleet)}
                    className={`px-2 py-1 rounded-lg transition border text-[11px] flex items-center gap-1 font-medium ${
                      showFleet ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    <Truck className="w-3 h-3" /> {t.emergencyFleets} ({TELANGANA_EMERGENCY_FLEET.length})
                  </button>

                  <button
                    onClick={() => setShowRadii(!showRadii)}
                    className={`px-2 py-1 rounded-lg transition border text-[11px] flex items-center gap-1 font-medium ${
                      showRadii ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    <Crosshair className="w-3 h-3" /> {t.riskRadii}
                  </button>
                </div>

                {/* City Quick Navigation Jump Pills */}
                <div className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5">
                  <span className="text-[11px] font-mono text-slate-400 px-1 flex items-center gap-1 shrink-0">
                    <Navigation className="w-3 h-3 text-emerald-400" /> {t.focus}
                  </span>
                  {displayZones.slice(0, 9).map(z => (
                    <button
                      key={z.zone_id}
                      onClick={() => handleFlyToZone(z)}
                      className={`text-[11px] px-2 py-0.5 rounded-md transition border font-medium shrink-0 flex items-center gap-1 ${
                        selectedCityPin === z.zone_id
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        z.risk_score >= 75 ? 'bg-rose-400' : z.risk_score >= 50 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}></span>
                      {z.city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leaflet Map Frame with Live Cursor HUD and Satellite Hybrid Rendering */}
              <div className={`w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative ${isFullscreenMap ? 'flex-1 min-h-0' : 'h-[640px]'}`}>
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  scrollWheelZoom={true}
                  className="w-full h-full"
                >
                  {/* Dynamic View Controller for smooth flyTo transitions */}
                  <MapViewController center={mapCenter} zoom={mapZoom} />

                  {/* Real-time Cursor Tracker */}
                  <MapCursorTracker onPositionChange={(lat, lng) => setCursorPos({ lat, lng })} />

                  {/* Basemap Layer Selection */}
                  {mapStyle === 'satellite' && (
                    <>
                      {/* Esri World Imagery (High-Res Global Satellite Photography) */}
                      <TileLayer
                        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        maxZoom={19}
                      />
                      {/* Reference Roads and Places Overlay on Satellite */}
                      <TileLayer
                        attribution='Labels &copy; Esri &mdash; Boundaries, Places & Roads'
                        url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                        maxZoom={19}
                        opacity={0.85}
                      />
                    </>
                  )}

                  {mapStyle === 'cyber' && (
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                      url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                      maxZoom={19}
                    />
                  )}

                  {mapStyle === 'streets' && (
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      maxZoom={19}
                    />
                  )}

                  {mapStyle === 'topo' && (
                    <TileLayer
                      attribution='Tiles &copy; Esri &mdash; National Geographic, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC'
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}"
                      maxZoom={16}
                    />
                  )}

                  {/* Click to pick location */}
                  <MapClickHandler
                    onLocationSelect={(lat, lng) => {
                      setCustomLat(lat);
                      setCustomLng(lng);
                      let closest = displayZones[0];
                      let minDist = Infinity;
                      displayZones.forEach(z => {
                        const dist = Math.hypot(z.lat - lat, z.lng - lng);
                        if (dist < minDist) {
                          minDist = dist;
                          closest = z;
                        }
                      });
                      if (closest) {
                        setSelectedZone(closest.zone_id);
                        setPinnedLocationName(`${closest.city}, ${closest.district || 'Telangana'}`);
                      }
                      setActiveTab('overview');
                    }}
                  />

                  {/* Telangana State Perimeter Boundary Polygon */}
                  {showBoundaries && geoScope === 'Telangana' && (
                    <Polygon
                      positions={TELANGANA_STATE_BOUNDARY}
                      pathOptions={{
                        color: '#10b981',
                        weight: 2.2,
                        opacity: 0.85,
                        dashArray: '8, 5',
                        fillColor: '#10b981',
                        fillOpacity: mapStyle === 'satellite' ? 0.05 : 0.04
                      }}
                    />
                  )}

                  {/* Major Arterial Highway Corridors */}
                  {showHighways && TELANGANA_HIGHWAYS.map(hwy => (
                    <Polyline
                      key={hwy.id}
                      positions={hwy.coords}
                      pathOptions={{
                        color: hwy.color,
                        weight: hwy.id === 'ORR-EXP' ? 4 : 3,
                        opacity: 0.9,
                        dashArray: hwy.dashArray || undefined
                      }}
                    >
                      <Popup>
                        <div className="p-2.5 text-xs text-slate-100">
                          <strong className="text-emerald-400 block">{hwy.name}</strong>
                          <span className="text-slate-400 font-mono text-[11px]">Primary Civic & Emergency Arterial Route</span>
                        </div>
                      </Popup>
                    </Polyline>
                  ))}

                  {/* River Systems */}
                  {showRivers && TELANGANA_RIVERS.map(river => (
                    <Polyline
                      key={river.id}
                      positions={river.coords}
                      pathOptions={{
                        color: river.color,
                        weight: river.width || 3.5,
                        opacity: 0.85
                      }}
                    >
                      <Popup>
                        <div className="p-2.5 text-xs text-slate-100">
                          <strong className="text-sky-400 block">{river.name}</strong>
                          <span className="text-slate-400 font-mono text-[11px]">Critical Water Resource & Drainage Channel</span>
                        </div>
                      </Popup>
                    </Polyline>
                  ))}

                  {/* Major Reservoirs & Lakes */}
                  {showRivers && TELANGANA_LAKES.map((lake, idx) => (
                    <Circle
                      key={`lake-${idx}`}
                      center={[lake.lat, lake.lng]}
                      radius={lake.radius}
                      pathOptions={{
                        color: '#38bdf8',
                        fillColor: '#0284c7',
                        fillOpacity: 0.25,
                        weight: 1.5
                      }}
                    >
                      <Popup>
                        <div className="p-2.5 text-xs text-slate-100">
                          <strong className="text-sky-300 block">{lake.name}</strong>
                          <span className="text-slate-400 text-[11px]">{lake.city} • Potable Supply & Flood Retention</span>
                        </div>
                      </Popup>
                    </Circle>
                  ))}

                  {/* Active Municipal Emergency Fleet */}
                  {showFleet && TELANGANA_EMERGENCY_FLEET.map(fleet => (
                    <Marker
                      key={fleet.id}
                      position={[fleet.lat, fleet.lng]}
                      icon={createFleetIcon(fleet)}
                    >
                      <Popup>
                        <div className="p-3.5 space-y-2 min-w-[260px] text-slate-100">
                          <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
                            <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 flex items-center gap-1">
                              {fleet.icon} {fleet.badge}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {fleet.status}
                            </span>
                          </div>

                          <h5 className="text-xs font-bold text-white">{fleet.callsign}</h5>
                          <p className="text-[11px] text-slate-300">Driver / Lead: <strong>{fleet.driver}</strong></p>

                          <div className="p-2 bg-slate-900/80 rounded-lg text-[11px] space-y-1 border border-slate-800">
                            <div><span className="text-slate-400">Target Area:</span> <span className="text-slate-200">{fleet.destination}</span></div>
                            <div className="flex justify-between">
                              <span><span className="text-slate-400">Response ETA:</span> <strong className="text-amber-400">{fleet.etaMin} mins</strong></span>
                              <span><span className="text-slate-400">Fuel/Battery:</span> <strong className="text-emerald-400">{fleet.fuel}</strong></span>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* Municipal District Hub Labels & Pins */}
                  {displayZones.map(z => {
                    const weather = DISTRICT_WEATHER_DATA[z.city] || { aqi: 82, aqiStatus: 'Moderate', humidity: '52%', wind: '12 km/h' };
                    return (
                      <Marker
                        key={`hub-${z.zone_id}`}
                        position={[z.lat, z.lng]}
                        icon={createCityHubIcon(z.city, z.risk_score, selectedCityPin === z.zone_id)}
                        eventHandlers={{
                          click: () => {
                            handleFlyToZone(z);
                            setSimZone(z.zone_id);
                          }
                        }}
                      >
                        <Popup>
                          <div className="p-3.5 space-y-2.5 min-w-[270px] text-slate-100">
                            <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                              <span className="text-[11px] font-mono font-bold uppercase text-emerald-400">
                                {z.state.toUpperCase()} • {z.zone_id}
                              </span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                z.risk_score >= 75 ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                                z.risk_score >= 50 ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                                'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              }`}>
                                {z.risk_level} ({z.risk_score}%)
                              </span>
                            </div>

                            <div>
                              <h4 className="text-sm font-bold text-white">{z.name}</h4>
                              <p className="text-[11px] text-slate-400">{z.headquarters}</p>
                            </div>

                            {/* Weather & AQI Telemetry */}
                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                              <div>
                                <span className="text-slate-400 flex items-center gap-1"><Thermometer className="w-3 h-3 text-amber-400" /> Temperature:</span>
                                <p className="font-mono text-amber-300 font-semibold">{z.temperature}°C</p>
                              </div>
                              <div>
                                <span className="text-slate-400 flex items-center gap-1"><Wind className="w-3 h-3 text-sky-400" /> Air Quality (AQI):</span>
                                <p className="font-mono text-emerald-400 font-semibold">{weather.aqi} ({weather.aqiStatus})</p>
                              </div>
                              <div>
                                <span className="text-slate-400">Humidity / Wind:</span>
                                <p className="font-mono text-slate-200">{weather.humidity} • {weather.wind}</p>
                              </div>
                              <div>
                                <span className="text-slate-400">Civic Population:</span>
                                <p className="font-mono text-slate-200">{z.population || '350,000'}</p>
                              </div>
                            </div>

                            <div className="pt-1 flex gap-2">
                              <button
                                onClick={() => {
                                  setSimZone(z.zone_id);
                                  setActiveTab('simulator');
                                  handleRunPrediction(z.zone_id, z.traffic_density, z.temperature, 'Clear');
                                }}
                                className="flex-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium text-[11px] transition text-center shadow-md"
                              >
                                {t.runSimulator}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedZone(z.zone_id);
                                  setActiveTab('overview');
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-[11px] transition text-center"
                              >
                                {t.reportHere}
                              </button>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}

                  {/* Multi-Ring Risk Heat Radii */}
                  {showRadii && displayZones.map(z => (
                    <React.Fragment key={`radii-${z.zone_id}`}>
                      {/* Outer dispersion ring */}
                      <Circle
                        center={[z.lat, z.lng]}
                        radius={geoScope === 'Telangana' ? 6000 : 25000}
                        pathOptions={{
                          color: z.risk_score >= 75 ? '#f43f5e' : (z.risk_score >= 50 ? '#f59e0b' : '#10b981'),
                          fillColor: z.risk_score >= 75 ? '#f43f5e' : (z.risk_score >= 50 ? '#f59e0b' : '#10b981'),
                          fillOpacity: 0.04,
                          weight: 0.8,
                          dashArray: '4, 4'
                        }}
                      />
                      {/* Core hazard radius */}
                      <Circle
                        center={[z.lat, z.lng]}
                        radius={geoScope === 'Telangana' ? 3200 : 12000}
                        pathOptions={{
                          color: z.risk_score >= 75 ? '#f43f5e' : (z.risk_score >= 50 ? '#f59e0b' : '#10b981'),
                          fillColor: z.risk_score >= 75 ? '#f43f5e' : (z.risk_score >= 50 ? '#f59e0b' : '#10b981'),
                          fillOpacity: 0.12,
                          weight: 1.5
                        }}
                      />
                    </React.Fragment>
                  ))}

                  {/* Incident Markers */}
                  {showIncidents && filteredIncidents.map((inc) => {
                    if (inc.lat == null || inc.lng == null || isNaN(inc.lat) || isNaN(inc.lng)) return null;
                    return (
                      <Marker
                        key={`inc-${inc.id}`}
                        position={[inc.lat, inc.lng]}
                        icon={createCustomIcon(inc.priority, inc.status)}
                      >
                      <Popup>
                        <div className="p-3.5 space-y-2 min-w-[250px] text-slate-100">
                          <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
                            <span className="text-[10px] font-mono font-bold uppercase text-emerald-400">
                              Ticket #{inc.id} • {inc.category}
                            </span>
                            <span className="text-[10px] font-mono text-slate-300">
                              {inc.status.toUpperCase()}
                            </span>
                          </div>

                          <h5 className="text-xs font-semibold text-white">{inc.title}</h5>
                          <p className="text-[11px] text-slate-300">{inc.department}</p>
                          <p className="text-[10px] text-slate-400">Zone: {inc.zone_name}</p>

                          <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between text-[11px]">
                            <span className="font-mono text-amber-300">Urgency: {Math.round((inc.urgency_score || 0.5) * 100)}%</span>
                            <button
                              onClick={() => handleUpdateStatus(inc.id, inc.status === 'resolved' ? 'pending' : 'resolved')}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[10px] transition"
                            >
                              {inc.status === 'resolved' ? t.reopenTicket : t.markResolved}
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                    );
                  })}
                </MapContainer>

                {/* Floating Military HUD Overlay (Bottom-Left) */}
                <div className="absolute bottom-4 left-4 z-[1000] bg-slate-950/90 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-2xl text-[11px] font-mono text-slate-300 space-y-1 pointer-events-none">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-slate-800 pb-1">
                    <Crosshair className="w-3.5 h-3.5 animate-pulse" />
                    <span>TELANGANA GIS SATELLITE HUD</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-0.5">
                    <span className="text-slate-500">{t.cursorLat}</span>
                    <span className="text-slate-200">{cursorPos.lat.toFixed(5)}°N</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">{t.cursorLng}</span>
                    <span className="text-slate-200">{cursorPos.lng.toFixed(5)}°E</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">{t.estElevation}</span>
                    <span className="text-amber-300">{estimatedElev}m ({t.deccanPlateau})</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-500">{t.zoomLevel}</span>
                    <span className="text-sky-300">{mapZoom}x • {mapStyle.toUpperCase()}</span>
                  </div>
                </div>

                {/* Floating Map Legend (Bottom-Right) */}
                <div className="absolute bottom-4 right-4 z-[1000] bg-slate-950/90 backdrop-blur-md border border-slate-800 px-3 py-2 rounded-xl shadow-2xl text-[10px] font-mono text-slate-300 space-y-1 pointer-events-none hidden sm:block">
                  <div className="text-slate-400 font-bold text-[11px] mb-1">REAL-TIME OVERLAYS</div>
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Critical / Hazard Incident</div>
                  <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> High Priority Grievance</div>
                  <div className="flex items-center gap-2"><span className="w-2.5 h-1 bg-amber-400"></span> Arterial Highways (NH-44/65)</div>
                  <div className="flex items-center gap-2"><span className="w-2.5 h-1 bg-sky-400"></span> River Basin (Godavari/Krishna)</div>
                  <div className="flex items-center gap-2"><span>🚒⚡💧</span> Active Civic Fleet Assets</div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: RISK ML SIMULATOR */}
          {/* ========================================================= */}
          {activeTab === 'simulator' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Controls Column */}
              <div className="bg-[#090d16] border border-slate-800/90 p-6 rounded-2xl space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-emerald-400" />
                    {t.simulatorTitle}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {t.simulatorSubtitle}
                  </p>
                </div>

                {/* Zone selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">{t.targetZone}</label>
                  <select
                    id="simulator-zone-select"
                    value={simZone}
                    onChange={(e) => {
                      setSimZone(e.target.value);
                      handleRunPrediction(e.target.value, simTraffic, simTemp, simWeather);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <optgroup label={`${t.telanganaState} Districts`}>
                      {telanganaZones.map(z => (
                        <option key={z.zone_id} value={z.zone_id}>
                          {z.city}: {z.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t.allIndia}>
                      {nationalZones.map(z => (
                        <option key={z.zone_id} value={z.zone_id}>
                          {z.city}: {z.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Temperature slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{t.ambientTemp}</span>
                    <span className="font-mono text-emerald-400 font-semibold">{simTemp}°C</span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="48"
                    step="0.5"
                    value={simTemp}
                    onChange={(e) => {
                      setSimTemp(parseFloat(e.target.value));
                      handleRunPrediction(simZone, simTraffic, parseFloat(e.target.value), simWeather);
                    }}
                    className="w-full accent-emerald-500 bg-slate-800 rounded-lg h-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>18°C {t.mild}</span>
                    <span>34°C {t.normal}</span>
                    <span>48°C {t.heatwave}</span>
                  </div>
                </div>

                {/* Traffic Density slider */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">{t.trafficDensity}</span>
                    <span className="font-mono text-emerald-400 font-semibold">{simTraffic}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={simTraffic}
                    onChange={(e) => {
                      setSimTraffic(parseFloat(e.target.value));
                      handleRunPrediction(simZone, parseFloat(e.target.value), simTemp, simWeather);
                    }}
                    className="w-full accent-emerald-500 bg-slate-800 rounded-lg h-2 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>10% {t.low}</span>
                    <span>60% {t.moderate}</span>
                    <span>100% {t.gridlock}</span>
                  </div>
                </div>

                {/* Weather dropdown */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">{t.weatherCondition}</label>
                  <select
                    value={simWeather}
                    onChange={(e) => {
                      setSimWeather(e.target.value);
                      handleRunPrediction(simZone, simTraffic, simTemp, e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="Clear">{t.weatherClear}</option>
                    <option value="Moderate Rain">{t.weatherModRain}</option>
                    <option value="Heavy Rain">{t.weatherHeavyRain}</option>
                    <option value="Thunderstorm">{t.weatherThunderstorm}</option>
                    <option value="Heatwave">{t.weatherHeatwaveAlert}</option>
                  </select>
                </div>

                <button
                  onClick={() => handleRunPrediction(simZone, simTraffic, simTemp, simWeather)}
                  disabled={simLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                >
                  {simLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {t.executeML}
                </button>
              </div>

              {/* Simulation Results Gauge & Interventions */}
              <div className="lg:col-span-2 space-y-6">
                {simResult ? (
                  <>
                    {/* Gauge Card */}
                    <div className="bg-[#090d16] border border-slate-800/90 p-6 rounded-2xl">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                          {/* Circular Score Dial */}
                          <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="40" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                stroke={simResult.risk_score >= 75 ? '#f43f5e' : (simResult.risk_score >= 50 ? '#f59e0b' : '#10b981')}
                                strokeWidth="8"
                                strokeDasharray={251.2}
                                strokeDashoffset={251.2 - (251.2 * simResult.risk_score) / 100}
                                strokeLinecap="round"
                                fill="transparent"
                                className="transition-all duration-700 ease-out"
                              />
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center">
                              <span className="text-2xl font-black font-mono tracking-tight text-white">{simResult.risk_score}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{t.riskIndex}</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                              simResult.risk_level === 'Critical' ? 'bg-rose-950/80 text-rose-400 border-rose-800' :
                              simResult.risk_level === 'Elevated' ? 'bg-amber-950/80 text-amber-400 border-amber-800' :
                              'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                            }`}>
                              ● {t.riskLevel}: {simResult.risk_level}
                            </span>
                            <h4 className="text-lg font-bold text-white">
                              {simResult.zone_name || simResult.city || simResult.zone_id}
                            </h4>
                            <p className="text-xs text-slate-400">
                              {t.probability} <strong className="text-slate-200 font-mono">{simResult.incident_probability_pct}%</strong> |
                              {t.targetSquadResponse} <strong className="text-slate-200 font-mono">{simResult.projected_response_time_min}m</strong>
                            </p>
                          </div>
                        </div>

                        {simResult.alert_triggered && (
                          <div className="px-4 py-3 rounded-xl bg-rose-950/50 border border-rose-800/80 flex items-center gap-3">
                            <Siren className="w-5 h-5 text-rose-400 animate-pulse shrink-0" />
                            <div className="text-xs text-rose-300">
                              <strong>{t.automatedAlert}</strong>
                              <p className="text-[11px] text-rose-400/80">{t.alertDesc}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Stress Factor Decomposition */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-400">{t.thermalStress}</span>
                          <h5 className="text-base font-bold font-mono text-slate-200">{simResult.components?.heat_stress_index}%</h5>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-400">{t.trafficCongestion}</span>
                          <h5 className="text-base font-bold font-mono text-slate-200">{simResult.components?.traffic_congestion_impact}%</h5>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-400">{t.weatherHazard}</span>
                          <h5 className="text-base font-bold font-mono text-slate-200">{simResult.components?.weather_hazard_factor}%</h5>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[11px] text-slate-400">{t.gridBaseStrain}</span>
                          <h5 className="text-base font-bold font-mono text-slate-200">{simResult.components?.infrastructure_strain}%</h5>
                        </div>
                      </div>
                    </div>

                    {/* AI Mitigation Interventions */}
                    <div className="bg-[#090d16] border border-slate-800/90 p-6 rounded-2xl">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        {t.aiInterventions}
                      </h4>
                      <div className="space-y-2.5">
                        {simResult.recommended_interventions?.map((rec, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
                            <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-xs flex items-center justify-center shrink-0 border border-emerald-500/30">
                              {i + 1}
                            </span>
                            <p className="text-xs text-slate-300">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-[#090d16] border border-slate-800/90 p-12 rounded-2xl text-center">
                    <RefreshCw className="w-8 h-8 text-slate-500 animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-400">{t.loadingSimulator}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Incident Details Modal */}
      {activeIncident && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-400">{t.ticket} #{activeIncident.id}</span>
                {getPriorityBadge(activeIncident.priority)}
              </div>
              <button
                onClick={() => setActiveIncident(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-800"
              >
                {t.closeModal}
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">{activeIncident.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{activeIncident.description || 'No additional notes provided.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-400">{t.category}</span>
                <p className="text-slate-200 font-medium">{activeIncident.category}</p>
              </div>
              <div>
                <span className="text-slate-400">{t.targetSla}</span>
                <p className="text-emerald-400 font-mono font-medium">{activeIncident.sla_hours} hours</p>
              </div>
              <div>
                <span className="text-slate-400">{t.urgencyScore}</span>
                <p className="text-amber-400 font-mono font-medium">{Math.round((activeIncident.urgency_score || 0.5) * 100)}%</p>
              </div>
              <div>
                <span className="text-slate-400">{t.responsibleDept}</span>
                <p className="text-slate-200 font-medium truncate">{activeIncident.department}</p>
              </div>
              <div>
                <span className="text-slate-400">{t.districtRegion}</span>
                <p className="text-slate-200 font-medium">{activeIncident.district || activeIncident.zone_name}</p>
              </div>
              <div>
                <span className="text-slate-400">{t.geoCoords}</span>
                <p className="text-slate-200 font-mono text-[11px]">{Number(activeIncident.lat).toFixed(4)}, {Number(activeIncident.lng).toFixed(4)}</p>
              </div>
            </div>

            {activeIncident.recommended_action && (
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-xl">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider font-mono">{t.recommendedAction}</span>
                <p className="text-xs text-emerald-300/90 mt-1">{activeIncident.recommended_action}</p>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => {
                  handleUpdateStatus(activeIncident.id, activeIncident.status === 'resolved' ? 'in_progress' : 'resolved');
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                {activeIncident.status === 'resolved' ? t.reopenTicket : t.markResolved}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
