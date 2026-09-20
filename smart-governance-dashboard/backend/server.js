import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

app.use(cors());
app.use(express.json());

// Initialize SQLite Database
db.initDatabase();

// Create HTTP server & WebSocket Server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket connection tracking
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WebSocket] Client connected. Total active clients: ${clients.size}`);

  // Send initial welcome & system state
  ws.send(JSON.stringify({
    type: 'CONNECTED',
    message: 'Connected to GovPulse Real-time Telemetry Stream (Telangana & National Hubs)',
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
      }
    } catch (e) {
      console.warn('[WebSocket] Invalid JSON message received');
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WebSocket] Client disconnected. Total active clients: ${clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('[WebSocket] Socket error:', err.message);
    clients.delete(ws);
  });
});

// Broadcast helper function
function broadcast(type, payload) {
  const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// ------------------------------------------------------------------
// Health & Diagnostics
// ------------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  let mlHealthy = false;
  let mlDetails = null;

  try {
    const mlRes = await fetch(`${ML_SERVICE_URL}/health`, { signal: AbortSignal.timeout(1500) });
    if (mlRes.ok) {
      mlDetails = await mlRes.json();
      mlHealthy = true;
    }
  } catch (err) {
    mlDetails = { error: 'ML Microservice unreachable at ' + ML_SERVICE_URL };
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      gateway: 'online (Node.js/Express)',
      database: 'online (SQLite DatabaseSync)',
      websocket: `online (${clients.size} active connections)`,
      ml_microservice: mlHealthy ? 'online' : 'degraded/offline',
      ml_details: mlDetails
    }
  });
});

// ------------------------------------------------------------------
// Incident Routes
// ------------------------------------------------------------------
app.get('/api/incidents', (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      category: req.query.category,
      zone_id: req.query.zone_id,
      state: req.query.state
    };
    const incidents = db.getAllIncidents(filters);
    res.json(incidents);
  } catch (error) {
    console.error('[GET /api/incidents] Error:', error);
    res.status(500).json({ error: 'Failed to fetch incidents', details: error.message });
  }
});

app.get('/api/incidents/:id', (req, res) => {
  try {
    const incident = db.getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incident', details: error.message });
  }
});

// Create Incident with ML Auto-Classification & WebSocket Broadcast
app.post('/api/incidents', async (req, res) => {
  try {
    const { title, description, zone_id, lat, lng } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Incident title is required' });
    }

    // Resolve target zone from database
    const reqZoneId = zone_id || 'TS-HYD-W';
    const zoneRecord = db.getZoneById(reqZoneId) || {
      zone_id: 'TS-HYD-W',
      name: 'Cyberabad & HITEC City (GHMC West)',
      city: 'Hyderabad',
      state: 'Telangana',
      district: 'Hyderabad',
      lat: 17.4435,
      lng: 78.3772
    };

    // Calculate realistic geo coordinates near zone centroid if not pinpointed
    const finalLat = parseFloat(lat) || (zoneRecord.lat + (Math.random() - 0.5) * 0.018);
    const finalLng = parseFloat(lng) || (zoneRecord.lng + (Math.random() - 0.5) * 0.018);

    let mlResult = null;

    // Call Python FastAPI ML microservice for NLP classification
    try {
      const mlResponse = await fetch(`${ML_SERVICE_URL}/predict/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          zone_id: zoneRecord.zone_id,
          state: zoneRecord.state,
          city: zoneRecord.city
        }),
        signal: AbortSignal.timeout(3000)
      });

      if (mlResponse.ok) {
        mlResult = await mlResponse.json();
      }
    } catch (mlErr) {
      console.warn('[ML Gateway] Python ML service unreachable, utilizing fallback heuristic classifier:', mlErr.message);
    }

    // Fallback classification if ML service is temporarily unavailable
    if (!mlResult) {
      const isUrgent = /fire|gas|spark|burst|accident|collapse|fatal|live wire|spill|dengue/i.test(title);
      const isWater = /water|sewage|drain|pipe|canal|bhagiratha|hmws/i.test(title);
      const isPower = /power|electric|transformer|spark|wire|substation|tsspdcl|tsnpdcl/i.test(title);
      const isRoad = /road|pothole|crater|traffic|bridge|asphalt|divider/i.test(title);

      let cat = 'Roads & Infrastructure';
      let dept = 'GHMC / Municipal Works Department';
      if (isPower) {
        cat = 'Electricity & Power';
        dept = 'TSSPDCL / TSNPDCL Power Distribution';
      } else if (isWater) {
        cat = 'Water & Sewage';
        dept = 'HMWS&SB / Mission Bhagiratha Directorate';
      } else if (isUrgent) {
        cat = 'Public Safety & Fire';
        dept = 'Telangana State Disaster Response & Fire Services';
      }

      mlResult = {
        category: cat,
        department: dept,
        priority: isUrgent ? 'Critical' : 'Medium',
        urgency_score: isUrgent ? 0.93 : 0.55,
        confidence: 0.82,
        estimated_sla_hours: isUrgent ? 4 : 24,
        recommended_action: `Dispatch field inspection team to ${zoneRecord.name} for immediate intervention.`,
        keywords_detected: []
      };
    }

    // Persist to SQLite Database
    const newIncident = db.createIncident({
      title,
      description: description || '',
      category: mlResult.category,
      department: mlResult.department,
      priority: mlResult.priority,
      urgency_score: mlResult.urgency_score,
      confidence: mlResult.confidence,
      status: 'pending',
      sla_hours: mlResult.estimated_sla_hours,
      zone_id: zoneRecord.zone_id,
      zone_name: zoneRecord.name,
      state: zoneRecord.state || 'Telangana',
      district: zoneRecord.district || '',
      lat: finalLat,
      lng: finalLng,
      recommended_action: mlResult.recommended_action,
      keywords_detected: mlResult.keywords_detected
    });

    // Real-time broadcast to all connected dashboard sessions
    broadcast('INCIDENT_CREATED', newIncident);

    res.status(201).json(newIncident);
  } catch (error) {
    console.error('[POST /api/incidents] Error:', error);
    res.status(500).json({ error: 'Failed to create incident', details: error.message });
  }
});

// Update Incident Status & Broadcast
app.patch('/api/incidents/:id', (req, res) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['pending', 'dispatched', 'in_progress', 'resolved'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updated = db.updateIncidentStatus(req.params.id, status, notes);
    if (!updated) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Real-time broadcast
    broadcast('INCIDENT_UPDATED', updated);

    res.json(updated);
  } catch (error) {
    console.error('[PATCH /api/incidents/:id] Error:', error);
    res.status(500).json({ error: 'Failed to update incident', details: error.message });
  }
});

// ------------------------------------------------------------------
// Risk ML Simulator & Zone Telemetry
// ------------------------------------------------------------------
app.get('/api/zones', (req, res) => {
  try {
    const zones = db.getAllZones({ state: req.query.state });
    res.json(zones);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch zones', details: error.message });
  }
});

app.get('/api/zones/:id', (req, res) => {
  try {
    const zone = db.getZoneById(req.params.id);
    if (!zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    res.json(zone);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch zone', details: error.message });
  }
});

app.post('/api/simulate-zone', async (req, res) => {
  try {
    const { zone_id, temperature, traffic_density, weather } = req.body;

    const tempVal = parseFloat(temperature) || 34.0;
    const trafficVal = parseFloat(traffic_density) || 72.0;
    const targetZoneId = zone_id || 'TS-HYD-W';

    const zoneRecord = db.getZoneById(targetZoneId) || {
      zone_id: 'TS-HYD-W',
      name: 'Cyberabad & HITEC City (GHMC West)',
      city: 'Hyderabad',
      state: 'Telangana',
      district: 'Hyderabad'
    };

    let simulationResult = null;

    try {
      const mlResponse = await fetch(`${ML_SERVICE_URL}/predict/risk-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone_id: zoneRecord.zone_id,
          temperature: tempVal,
          traffic_density: trafficVal,
          weather: weather || 'Clear'
        }),
        signal: AbortSignal.timeout(3000)
      });

      if (mlResponse.ok) {
        simulationResult = await mlResponse.json();
      }
    } catch (mlErr) {
      console.warn('[ML Gateway] Risk predictor unreachable, using internal regression fallback:', mlErr.message);
    }

    // Fallback regression simulation
    if (!simulationResult) {
      const heatImpact = Math.max(0, (tempVal - 26) * 2.2);
      const trafficImpact = (trafficVal / 100) * 45;
      const score = Math.round(Math.min(99, Math.max(10, heatImpact + trafficImpact)));
      const level = score >= 75 ? 'Critical' : (score >= 50 ? 'Elevated' : 'Normal');

      simulationResult = {
        zone_id: zoneRecord.zone_id,
        risk_score: score,
        risk_level: level,
        incident_probability_pct: Math.round(score * 0.92),
        projected_response_time_min: score >= 75 ? 15 : 45,
        components: {
          heat_stress_index: Math.round(heatImpact * 1.5),
          traffic_congestion_impact: Math.round(trafficImpact * 1.5),
          weather_hazard_factor: 15,
          infrastructure_strain: 35
        },
        recommended_interventions: [
          `Adjust traffic signal timing corridors in ${zoneRecord.name}.`,
          `Alert standby municipal quick-response emergency crews in ${zoneRecord.district || zoneRecord.city}.`
        ],
        alert_triggered: score >= 50
      };
    }

    // Ensure zone_id in simulationResult is the actual database primary key
    simulationResult.zone_id = zoneRecord.zone_id;
    simulationResult.zone_name = zoneRecord.name;
    simulationResult.city = zoneRecord.city;
    simulationResult.state = zoneRecord.state;

    // Update zone in SQLite
    db.updateZoneSimulation(zoneRecord.zone_id, {
      temperature: tempVal,
      traffic_density: trafficVal,
      risk_score: simulationResult.risk_score,
      risk_level: simulationResult.risk_level
    });

    // Broadcast simulation update to all connected dashboards
    broadcast('ZONE_SIMULATION_UPDATED', simulationResult);

    res.json(simulationResult);
  } catch (error) {
    console.error('[POST /api/simulate-zone] Error:', error);
    res.status(500).json({ error: 'Simulation failed', details: error.message });
  }
});

// Analytics Overview
app.get('/api/analytics', (req, res) => {
  try {
    const analytics = db.getAnalytics(req.query.state);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics', details: error.message });
  }
});

// Start Server
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 GovPulse Gateway Server active on http://localhost:${PORT}`);
  console.log(`📡 WebSocket Telemetry Server active on ws://localhost:${PORT}`);
  console.log(`🤖 Connected ML Microservice Target: ${ML_SERVICE_URL}`);
  console.log(`🏛️ Telangana & India Civic Command Center Initialized`);
  console.log(`=======================================================`);
});
