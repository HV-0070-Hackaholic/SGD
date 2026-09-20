import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'govpulse_v2.db');
const db = new DatabaseSync(dbPath);

// Initialize schema & Telangana / India datasets
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      department TEXT NOT NULL,
      priority TEXT NOT NULL,
      urgency_score REAL DEFAULT 0.5,
      confidence REAL DEFAULT 0.85,
      status TEXT DEFAULT 'pending',
      sla_hours INTEGER DEFAULT 24,
      zone_id TEXT DEFAULT 'TS-HYD-W',
      zone_name TEXT,
      state TEXT DEFAULT 'Telangana',
      district TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      recommended_action TEXT,
      keywords_detected TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS zones (
      zone_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT DEFAULT 'Telangana',
      district TEXT,
      headquarters TEXT,
      population TEXT,
      wards INTEGER DEFAULT 50,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      temperature REAL DEFAULT 32.0,
      traffic_density REAL DEFAULT 65.0,
      risk_score REAL DEFAULT 42.0,
      risk_level TEXT DEFAULT 'Moderate',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      incident_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL
    );
  `);

  // Safe schema upgrades for existing databases
  const upgradeCols = [
    { table: 'zones', col: 'state', type: "TEXT DEFAULT 'Telangana'" },
    { table: 'zones', col: 'district', type: "TEXT DEFAULT ''" },
    { table: 'zones', col: 'headquarters', type: "TEXT DEFAULT ''" },
    { table: 'zones', col: 'population', type: "TEXT DEFAULT ''" },
    { table: 'zones', col: 'wards', type: "INTEGER DEFAULT 50" },
    { table: 'incidents', col: 'state', type: "TEXT DEFAULT 'Telangana'" },
    { table: 'incidents', col: 'district', type: "TEXT DEFAULT ''" }
  ];

  for (const item of upgradeCols) {
    try {
      db.exec(`ALTER TABLE ${item.table} ADD COLUMN ${item.col} ${item.type}`);
    } catch (e) {
      // Column likely already exists
    }
  }

  // Comprehensive Telangana Municipalities & National Hubs
  const defaultZones = [
    // --- TELANGANA STATE MUNICIPAL CORPORATIONS & DISTRICTS ---
    {
      id: 'TS-HYD-W',
      name: 'Cyberabad & HITEC City (GHMC West)',
      city: 'Hyderabad',
      state: 'Telangana',
      district: 'Hyderabad',
      headquarters: 'Gachibowli Zonal Office',
      population: '2,850,000',
      wards: 36,
      lat: 17.4435,
      lng: 78.3772,
      temp: 34.2,
      traffic: 86.0,
      risk: 76.5,
      level: 'Critical'
    },
    {
      id: 'TS-HYD-C',
      name: 'Charminar & Old City (GHMC South)',
      city: 'Hyderabad',
      state: 'Telangana',
      district: 'Hyderabad',
      headquarters: 'Sardar Mahal Zonal Office',
      population: '2,100,000',
      wards: 30,
      lat: 17.3616,
      lng: 78.4747,
      temp: 35.0,
      traffic: 89.5,
      risk: 81.0,
      level: 'Critical'
    },
    {
      id: 'TS-HYD-N',
      name: 'Secunderabad & Begumpet (GHMC North)',
      city: 'Secunderabad',
      state: 'Telangana',
      district: 'Hyderabad',
      headquarters: 'General Bazar Municipal Center',
      population: '1,950,000',
      wards: 28,
      lat: 17.4399,
      lng: 78.4983,
      temp: 33.8,
      traffic: 81.0,
      risk: 69.0,
      level: 'Elevated'
    },
    {
      id: 'TS-WGL',
      name: 'Greater Warangal & Kazipet (GWMC Smart City)',
      city: 'Warangal',
      state: 'Telangana',
      district: 'Hanamkonda',
      headquarters: 'GWMC Commissionerate, Nakkalagutta',
      population: '980,000',
      wards: 66,
      lat: 17.9689,
      lng: 79.5941,
      temp: 36.4,
      traffic: 74.0,
      risk: 63.5,
      level: 'Elevated'
    },
    {
      id: 'TS-KRM',
      name: 'Karimnagar Smart City (MCK Manair Basin)',
      city: 'Karimnagar',
      state: 'Telangana',
      district: 'Karimnagar',
      headquarters: 'Municipal Corporation Office, Tower Circle',
      population: '420,000',
      wards: 60,
      lat: 18.4386,
      lng: 79.1288,
      temp: 37.8,
      traffic: 68.0,
      risk: 58.0,
      level: 'Elevated'
    },
    {
      id: 'TS-NZB',
      name: 'Nizamabad Municipal Corporation',
      city: 'Nizamabad',
      state: 'Telangana',
      district: 'Nizamabad',
      headquarters: 'Khaleelwadi Municipal Complex',
      population: '390,000',
      wards: 60,
      lat: 18.6725,
      lng: 78.0941,
      temp: 36.9,
      traffic: 62.0,
      risk: 52.0,
      level: 'Elevated'
    },
    {
      id: 'TS-KHM',
      name: 'Khammam Municipal Corporation (KMC)',
      city: 'Khammam',
      state: 'Telangana',
      district: 'Khammam',
      headquarters: 'Wyra Road Civic Command',
      population: '360,000',
      wards: 60,
      lat: 17.2473,
      lng: 80.1514,
      temp: 38.2,
      traffic: 65.0,
      risk: 54.0,
      level: 'Elevated'
    },
    {
      id: 'TS-RGD',
      name: 'Ramagundam Industrial Coal & Power Belt',
      city: 'Ramagundam',
      state: 'Telangana',
      district: 'Peddapalli',
      headquarters: 'Godavarikhani Municipal Hub',
      population: '280,000',
      wards: 50,
      lat: 18.7618,
      lng: 79.4744,
      temp: 41.5,
      traffic: 78.0,
      risk: 84.0,
      level: 'Critical'
    },
    {
      id: 'TS-MBN',
      name: 'Mahbubnagar Municipal Council (Palamuru)',
      city: 'Mahbubnagar',
      state: 'Telangana',
      district: 'Mahbubnagar',
      headquarters: 'Clock Tower Municipal Secretariat',
      population: '240,000',
      wards: 49,
      lat: 16.7488,
      lng: 78.0035,
      temp: 36.1,
      traffic: 58.0,
      risk: 45.0,
      level: 'Moderate'
    },
    {
      id: 'TS-NLG',
      name: 'Nalgonda Urban Council',
      city: 'Nalgonda',
      state: 'Telangana',
      district: 'Nalgonda',
      headquarters: 'Clock Tower Town Hall',
      population: '195,000',
      wards: 48,
      lat: 17.0577,
      lng: 79.2684,
      temp: 37.0,
      traffic: 54.0,
      risk: 43.0,
      level: 'Moderate'
    },
    {
      id: 'TS-ADB',
      name: 'Adilabad Municipal Council (Satpura Foothills)',
      city: 'Adilabad',
      state: 'Telangana',
      district: 'Adilabad',
      headquarters: 'Collectorate Junction Municipal Center',
      population: '160,000',
      wards: 42,
      lat: 19.6641,
      lng: 78.5320,
      temp: 38.5,
      traffic: 51.0,
      risk: 47.0,
      level: 'Moderate'
    },
    {
      id: 'TS-SDP',
      name: 'Siddipet Model Smart Municipality',
      city: 'Siddipet',
      state: 'Telangana',
      district: 'Siddipet',
      headquarters: 'Komati Cheruvu Civic Promenade',
      population: '155,000',
      wards: 43,
      lat: 18.1018,
      lng: 78.8520,
      temp: 34.6,
      traffic: 49.0,
      risk: 38.0,
      level: 'Moderate'
    },
    {
      id: 'TS-SYP',
      name: 'Suryapet Municipality (NH-65 Gateway)',
      city: 'Suryapet',
      state: 'Telangana',
      district: 'Suryapet',
      headquarters: 'Khammam Cross Road Center',
      population: '135,000',
      wards: 34,
      lat: 17.1439,
      lng: 79.6239,
      temp: 36.8,
      traffic: 61.0,
      risk: 44.0,
      level: 'Moderate'
    },
    {
      id: 'TS-KMR',
      name: 'Kamareddy Municipal Council',
      city: 'Kamareddy',
      state: 'Telangana',
      district: 'Kamareddy',
      headquarters: 'Station Road Civic Office',
      population: '110,000',
      wards: 33,
      lat: 18.3243,
      lng: 78.3408,
      temp: 35.8,
      traffic: 46.0,
      risk: 39.0,
      level: 'Moderate'
    },
    {
      id: 'TS-KTG',
      name: 'Kothagudem & Palvancha Industrial Mining Belt',
      city: 'Kothagudem',
      state: 'Telangana',
      district: 'Bhadradri Kothagudem',
      headquarters: 'Singareni Main Admin Complex',
      population: '175,000',
      wards: 36,
      lat: 17.5529,
      lng: 80.6190,
      temp: 39.2,
      traffic: 64.0,
      risk: 66.0,
      level: 'Elevated'
    },
    {
      id: 'TS-JGT',
      name: 'Jagtial Municipal Council',
      city: 'Jagtial',
      state: 'Telangana',
      district: 'Jagtial',
      headquarters: 'Old Fort Ward Center',
      population: '125,000',
      wards: 32,
      lat: 18.7944,
      lng: 78.9125,
      temp: 37.1,
      traffic: 48.0,
      risk: 41.0,
      level: 'Moderate'
    },
    {
      id: 'TS-NRM',
      name: 'Nirmal Municipality & Craft Belt',
      city: 'Nirmal',
      state: 'Telangana',
      district: 'Nirmal',
      headquarters: 'Mancherial Road Civic Complex',
      population: '105,000',
      wards: 30,
      lat: 19.0964,
      lng: 78.3432,
      temp: 37.5,
      traffic: 44.0,
      risk: 37.0,
      level: 'Moderate'
    },

    // --- NATIONAL METROPOLITAN CORRIDORS (ALL-INDIA COMMAND) ---
    {
      id: 'IN-DEL',
      name: 'Delhi NCR (Central & Ring Road)',
      city: 'New Delhi',
      state: 'National Capital Region',
      district: 'New Delhi',
      headquarters: 'NDMC Palika Kendra',
      population: '19,500,000',
      wards: 250,
      lat: 28.6139,
      lng: 77.2090,
      temp: 37.2,
      traffic: 88.0,
      risk: 82.5,
      level: 'Critical'
    },
    {
      id: 'IN-MUM',
      name: 'Mumbai Metro (Bandra-BKC Corridor)',
      city: 'Mumbai',
      state: 'Maharashtra',
      district: 'Mumbai Suburban',
      headquarters: 'BMC Headquarters, Fort',
      population: '14,800,000',
      wards: 227,
      lat: 19.0760,
      lng: 72.8777,
      temp: 32.5,
      traffic: 91.0,
      risk: 84.0,
      level: 'Critical'
    },
    {
      id: 'IN-BLR',
      name: 'Bengaluru Tech Corridor (Outer Ring Rd)',
      city: 'Bengaluru',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      headquarters: 'BBMP Head Office, Corporation Circle',
      population: '12,400,000',
      wards: 198,
      lat: 12.9716,
      lng: 77.5946,
      temp: 28.4,
      traffic: 82.0,
      risk: 68.0,
      level: 'Elevated'
    },
    {
      id: 'IN-CHE',
      name: 'Chennai Central & OMR IT Corridor',
      city: 'Chennai',
      state: 'Tamil Nadu',
      district: 'Chennai',
      headquarters: 'Ripon Building, GCC',
      population: '9,200,000',
      wards: 200,
      lat: 13.0827,
      lng: 80.2707,
      temp: 34.0,
      traffic: 66.0,
      risk: 48.0,
      level: 'Moderate'
    },
    {
      id: 'IN-CCU',
      name: 'Kolkata Sector V & Rajarhat IT Hub',
      city: 'Kolkata',
      state: 'West Bengal',
      district: 'Kolkata / North 24 Parganas',
      headquarters: 'KMC Central Building',
      population: '11,200,000',
      wards: 144,
      lat: 22.5726,
      lng: 88.3639,
      temp: 31.8,
      traffic: 63.0,
      risk: 42.0,
      level: 'Moderate'
    }
  ];

  // Refresh zones table if fewer than expected
  const zoneCount = db.prepare('SELECT COUNT(*) as count FROM zones').get().count;
  if (zoneCount < 20) {
    db.exec('DELETE FROM zones');
    const insertZone = db.prepare(`
      INSERT INTO zones (zone_id, name, city, state, district, headquarters, population, wards, lat, lng, temperature, traffic_density, risk_score, risk_level, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const nowIso = new Date().toISOString();
    for (const z of defaultZones) {
      insertZone.run(
        z.id,
        z.name,
        z.city,
        z.state,
        z.district,
        z.headquarters,
        z.population,
        z.wards,
        z.lat,
        z.lng,
        z.temp,
        z.traffic,
        z.risk,
        z.level,
        nowIso
      );
    }
  }

  // Seed authentic Telangana & National Incidents
  const incidentCount = db.prepare('SELECT COUNT(*) as count FROM incidents').get().count;
  if (incidentCount < 8) {
    db.exec('DELETE FROM incidents');
    const sampleIncidents = [
      {
        title: "Underground 33kV cable blowout & thermal asphalt rupture near Cyber Towers junction",
        description: "Heavy sparks and smoke from TSSPDCL underground trench near Hitec City metro pillar 1021.",
        category: "Electricity & Power",
        department: "TSSPDCL & GHMC Engineering Division",
        priority: "Critical",
        urgency_score: 0.97,
        confidence: 0.98,
        status: "dispatched",
        sla_hours: 3,
        zone_id: "TS-HYD-W",
        zone_name: "Cyberabad & HITEC City (GHMC West)",
        state: "Telangana",
        district: "Hyderabad",
        lat: 17.4485,
        lng: 78.3768,
        action: "TSSPDCL quick-response cable jointing team and Cyberabad Traffic Police on site cordoning perimeter.",
        keywords: JSON.stringify(["transformer", "cable blowout", "sparks", "TSSPDCL", "Cyber Towers"])
      },
      {
        title: "Heritage drain collapse & sewage overflow into Charminar pedestrian plaza",
        description: "Old masonry sewer conduit ruptured following heavy downpour; effluent spreading towards Laad Bazar.",
        category: "Water & Sewage",
        department: "Hyderabad Metropolitan Water Supply & Sewerage Board (HMWS&SB)",
        priority: "Critical",
        urgency_score: 0.95,
        confidence: 0.96,
        status: "in_progress",
        sla_hours: 4,
        zone_id: "TS-HYD-C",
        zone_name: "Charminar & Old City (GHMC South)",
        state: "Telangana",
        district: "Hyderabad",
        lat: 17.3620,
        lng: 78.4735,
        action: "HMWS&SB high-power suction jetting machines deployed; HYDRAA disaster squad clearing pedestrian corridors.",
        keywords: JSON.stringify(["sewage", "HMWS&SB", "drainage", "Charminar", "overflow"])
      },
      {
        title: "Bhadrakali Lake storm overflow canal breached inundating Kazipet railway underpass",
        description: "2.5 feet of flash storm runoff submerging Under Bridge 4; city bus traffic stranded.",
        category: "Roads & Infrastructure",
        department: "Greater Warangal Municipal Corporation (GWMC)",
        priority: "High",
        urgency_score: 0.91,
        confidence: 0.94,
        status: "dispatched",
        sla_hours: 6,
        zone_id: "TS-WGL",
        zone_name: "Greater Warangal & Kazipet (GWMC Smart City)",
        state: "Telangana",
        district: "Hanamkonda",
        lat: 17.9785,
        lng: 79.5820,
        action: "GWMC Disaster Management squad deployed with 3 diesel dewatering pumps; traffic redirected to bypass.",
        keywords: JSON.stringify(["canal breach", "railway underpass", "GWMC", "flooding"])
      },
      {
        title: "Thermal fly-ash pipeline seam fracture spilling across Ramagundam-Godavarikhani link road",
        description: "Dense fly-ash slurry leaking onto carriageway reducing vehicular traction and visibility near NTPC gate 3.",
        category: "Public Safety & Fire",
        department: "Ramagundam Municipal Corporation & Telangana Fire Services",
        priority: "Critical",
        urgency_score: 0.94,
        confidence: 0.95,
        status: "in_progress",
        sla_hours: 4,
        zone_id: "TS-RGD",
        zone_name: "Ramagundam Industrial Coal & Power Belt",
        state: "Telangana",
        district: "Peddapalli",
        lat: 18.7690,
        lng: 79.4810,
        action: "NTPC industrial safety squad shut isolation valves; civic vacuum sweeper trucks clearing road surface.",
        keywords: JSON.stringify(["fly-ash", "slurry leak", "NTPC", "Ramagundam", "hazard"])
      },
      {
        title: "Lower Manair Dam feeder canal retaining wall breach near Karimnagar bypass",
        description: "Irrigation channel overflow threatening ground-floor settlements in Housing Board Colony.",
        category: "Water & Sewage",
        department: "Karimnagar Municipal Corporation (MCK) & Irrigation Dept",
        priority: "High",
        urgency_score: 0.88,
        confidence: 0.93,
        status: "pending",
        sla_hours: 8,
        zone_id: "TS-KRM",
        zone_name: "Karimnagar Smart City (MCK Manair Basin)",
        state: "Telangana",
        district: "Karimnagar",
        lat: 18.4410,
        lng: 79.1350,
        action: "MCK engineering team dispatched with 400 sandbags for emergency levee reinforcement.",
        keywords: JSON.stringify(["canal breach", "Manair dam", "MCK", "levee"])
      },
      {
        title: "Substation capacitor bank fire at Gandhi Chowk market transformer yard",
        description: "Heavy transformer oil combustion threatening dense textile and electronics retail shops.",
        category: "Public Safety & Fire",
        department: "TSNPDCL & Telangana State Disaster Response & Fire Services",
        priority: "Critical",
        urgency_score: 0.96,
        confidence: 0.97,
        status: "dispatched",
        sla_hours: 2,
        zone_id: "TS-NZB",
        zone_name: "Nizamabad Municipal Corporation",
        state: "Telangana",
        district: "Nizamabad",
        lat: 18.6750,
        lng: 78.0965,
        action: "Two foam fire tenders dispatched from Nizamabad Fire Station; TSNPDCL tripped 11kV grid feeder.",
        keywords: JSON.stringify(["transformer fire", "TSNPDCL", "Gandhi Chowk", "blackout"])
      },
      {
        title: "High-density dengue cluster & clogged storm canal in Wyra Road lowlands",
        description: "Over 14 suspected vector-borne infections logged within 48 hours along canal banks.",
        category: "Public Health & Vector Control",
        department: "Khammam Municipal Corporation (KMC) Health Wing",
        priority: "Medium",
        urgency_score: 0.68,
        confidence: 0.91,
        status: "in_progress",
        sla_hours: 24,
        zone_id: "TS-KHM",
        zone_name: "Khammam Municipal Corporation (KMC)",
        state: "Telangana",
        district: "Khammam",
        lat: 17.2510,
        lng: 80.1560,
        action: "KMC vector squad conducting door-to-door thermal fogging and bio-larvicide Bacillus spray.",
        keywords: JSON.stringify(["dengue", "mosquito", "canal", "fogging", "KMC"])
      },
      {
        title: "Mission Bhagiratha main bulk transmission line air valve blowout on Siddipet outer ring",
        description: "High-pressure potable water fountain reaching 20 feet causing traffic diversion on Medak highway.",
        category: "Water & Sewage",
        department: "Mission Bhagiratha Department & Siddipet Municipality",
        priority: "Medium",
        urgency_score: 0.62,
        confidence: 0.90,
        status: "resolved",
        sla_hours: 12,
        zone_id: "TS-SDP",
        zone_name: "Siddipet Model Smart Municipality",
        state: "Telangana",
        district: "Siddipet",
        lat: 18.1065,
        lng: 78.8590,
        action: "Pressure relief valve replaced; system repressurized to supply 45 village overhead tanks.",
        keywords: JSON.stringify(["Mission Bhagiratha", "water pipeline", "valve", "Siddipet"])
      },
      {
        title: "Dangerous 4-foot road crater on Clock Tower junction toward Jadcherla Highway",
        description: "Heavy multi-axle freight truck damaged front suspension causing 3km bottleneck.",
        category: "Roads & Infrastructure",
        department: "Mahbubnagar Municipal Council & R&B Department",
        priority: "High",
        urgency_score: 0.82,
        confidence: 0.92,
        status: "pending",
        sla_hours: 12,
        zone_id: "TS-MBN",
        zone_name: "Mahbubnagar Municipal Council (Palamuru)",
        state: "Telangana",
        district: "Mahbubnagar",
        lat: 16.7495,
        lng: 78.0050,
        action: "Pothole patch squad dispatched with fast-setting cold emulsion asphalt mix.",
        keywords: JSON.stringify(["pothole", "crater", "Palamuru", "freight"])
      },
      {
        title: "Sparking high-voltage transformer near Connaught Place Outer Circle",
        description: "Electrical sparks near Barakhamba metro station subway exit during evening peak traffic.",
        category: "Electricity & Power",
        department: "Delhi Vidyut Board / NDMC",
        priority: "Critical",
        urgency_score: 0.96,
        confidence: 0.97,
        status: "dispatched",
        sla_hours: 4,
        zone_id: "IN-DEL",
        zone_name: "Delhi NCR (Central & Ring Road)",
        state: "National Capital Region",
        district: "New Delhi",
        lat: 28.6315,
        lng: 77.2167,
        action: "Emergency NDMC quick response squad isolated feeder and replaced blown circuit breaker.",
        keywords: JSON.stringify(["transformer", "sparking", "NDMC", "metro"])
      },
      {
        title: "Stormwater drain overflow flooding Hindmata Flyover underpass",
        description: "Rainwater reaching 3.5 feet deep, private and BEST buses redirected to Eastern Freeway.",
        category: "Water & Sewage",
        department: "Brihanmumbai Municipal Corporation (BMC)",
        priority: "Critical",
        urgency_score: 0.94,
        confidence: 0.95,
        status: "in_progress",
        sla_hours: 4,
        zone_id: "IN-MUM",
        zone_name: "Mumbai Metro (Bandra-BKC Corridor)",
        state: "Maharashtra",
        district: "Mumbai Suburban",
        lat: 19.0178,
        lng: 72.8478,
        action: "BMC high-capacity submersible pumps active discharging 4,000 m3/hr into Arabian Sea.",
        keywords: JSON.stringify(["waterlogging", "BMC", "drain", "monsoon"])
      }
    ];

    const insertInc = db.prepare(`
      INSERT INTO incidents (
        title, description, category, department, priority, urgency_score, confidence,
        status, sla_hours, zone_id, zone_name, state, district, lat, lng, recommended_action,
        keywords_detected, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date();
    sampleIncidents.forEach((item, index) => {
      const time = new Date(now.getTime() - (index * 45 * 60 * 1000)).toISOString();
      insertInc.run(
        item.title,
        item.description,
        item.category,
        item.department,
        item.priority,
        item.urgency_score,
        item.confidence,
        item.status,
        item.sla_hours,
        item.zone_id,
        item.zone_name,
        item.state || 'Telangana',
        item.district || '',
        item.lat,
        item.lng,
        item.action,
        item.keywords,
        time,
        time
      );
    });
  }
}

// Database query helpers
export function getAllIncidents(filters = {}) {
  let query = 'SELECT * FROM incidents WHERE 1=1';
  const params = [];

  if (filters.status && filters.status !== 'all') {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.priority && filters.priority !== 'all') {
    query += ' AND priority = ?';
    params.push(filters.priority);
  }
  if (filters.category && filters.category !== 'all') {
    query += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters.zone_id && filters.zone_id !== 'all') {
    query += ' AND zone_id = ?';
    params.push(filters.zone_id);
  }
  if (filters.state && filters.state !== 'all') {
    query += ' AND state = ?';
    params.push(filters.state);
  }

  query += ' ORDER BY id DESC';
  return db.prepare(query).all(...params);
}

export function getIncidentById(id) {
  return db.prepare('SELECT * FROM incidents WHERE id = ?').get(id);
}

export function createIncident(data) {
  const stmt = db.prepare(`
    INSERT INTO incidents (
      title, description, category, department, priority, urgency_score, confidence,
      status, sla_hours, zone_id, zone_name, state, district, lat, lng, recommended_action,
      keywords_detected, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `);

  const now = new Date().toISOString();
  const res = stmt.get(
    data.title,
    data.description || '',
    data.category,
    data.department,
    data.priority,
    data.urgency_score || 0.5,
    data.confidence || 0.85,
    data.status || 'pending',
    data.sla_hours || 24,
    data.zone_id || 'TS-HYD-W',
    data.zone_name || data.zone_id || 'Hyderabad (GHMC)',
    data.state || 'Telangana',
    data.district || '',
    data.lat,
    data.lng,
    data.recommended_action || '',
    JSON.stringify(data.keywords_detected || []),
    now,
    now
  );

  // Log activity
  db.prepare(`
    INSERT INTO activity_logs (incident_id, action, details, timestamp)
    VALUES (?, ?, ?, ?)
  `).run(res.id, 'CREATED', `[${res.zone_name || res.zone_id}] ${res.title.substring(0, 45)}`, now);

  return res;
}

export function updateIncidentStatus(id, status, notes = '') {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    UPDATE incidents
    SET status = ?, updated_at = ?
    WHERE id = ?
    RETURNING *
  `);
  const updated = stmt.get(status, now, id);

  if (updated) {
    db.prepare(`
      INSERT INTO activity_logs (incident_id, action, details, timestamp)
      VALUES (?, ?, ?, ?)
    `).run(id, 'STATUS_UPDATE', `Status changed to ${status}. ${notes}`, now);
  }

  return updated;
}

export function getAllZones(filters = {}) {
  let query = 'SELECT * FROM zones WHERE 1=1';
  const params = [];

  if (filters.state && filters.state !== 'all') {
    query += ' AND state = ?';
    params.push(filters.state);
  }

  query += ' ORDER BY risk_score DESC';
  return db.prepare(query).all(...params);
}

export function getZoneById(id) {
  // Support lookup by exact zone_id, or fuzzy match name or city
  let zone = db.prepare('SELECT * FROM zones WHERE zone_id = ?').get(id);
  if (!zone) {
    // Check legacy aliases
    const aliasMap = {
      'Zone-A': 'TS-HYD-C',
      'Zone-B': 'TS-HYD-W',
      'Zone-C': 'TS-HYD-N',
      'Zone-D': 'TS-WGL',
      'Zone-E': 'TS-KRM'
    };
    if (aliasMap[id]) {
      zone = db.prepare('SELECT * FROM zones WHERE zone_id = ?').get(aliasMap[id]);
    }
  }
  if (!zone) {
    zone = db.prepare('SELECT * FROM zones WHERE city LIKE ? OR name LIKE ? LIMIT 1').get(`%${id}%`, `%${id}%`);
  }
  return zone;
}

export function updateZoneSimulation(zone_id, data) {
  const now = new Date().toISOString();
  
  // Resolve actual zone id
  const target = getZoneById(zone_id);
  const finalId = target ? target.zone_id : zone_id;

  const stmt = db.prepare(`
    UPDATE zones
    SET temperature = ?, traffic_density = ?, risk_score = ?, risk_level = ?, updated_at = ?
    WHERE zone_id = ?
    RETURNING *
  `);
  return stmt.get(data.temperature, data.traffic_density, data.risk_score, data.risk_level, now, finalId);
}

export function getAnalytics(stateFilter = 'all') {
  let incidentWhere = '1=1';
  const params = [];
  if (stateFilter && stateFilter !== 'all') {
    incidentWhere += ' AND state = ?';
    params.push(stateFilter);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM incidents WHERE ${incidentWhere}`).get(...params).count;
  const pending = db.prepare(`SELECT COUNT(*) as count FROM incidents WHERE status = 'pending' AND ${incidentWhere}`).get(...params).count;
  const inProgress = db.prepare(`SELECT COUNT(*) as count FROM incidents WHERE (status = 'in_progress' OR status = 'dispatched') AND ${incidentWhere}`).get(...params).count;
  const resolved = db.prepare(`SELECT COUNT(*) as count FROM incidents WHERE status = 'resolved' AND ${incidentWhere}`).get(...params).count;
  const critical = db.prepare(`SELECT COUNT(*) as count FROM incidents WHERE priority = 'Critical' AND ${incidentWhere}`).get(...params).count;

  const categoryBreakdown = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM incidents
    WHERE ${incidentWhere}
    GROUP BY category
    ORDER BY count DESC
  `).all(...params);

  const recentLogs = db.prepare(`
    SELECT l.*, i.title as incident_title, i.priority, i.zone_id, i.zone_name
    FROM activity_logs l
    LEFT JOIN incidents i ON l.incident_id = i.id
    ORDER BY l.id DESC
    LIMIT 8
  `).all();

  const zones = getAllZones(stateFilter !== 'all' ? { state: stateFilter } : {});

  return {
    metrics: {
      total,
      pending,
      inProgress,
      resolved,
      critical,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
      slaCompliance: 96.8
    },
    categoryBreakdown,
    recentLogs,
    zones
  };
}

export default {
  initDatabase,
  getAllIncidents,
  getIncidentById,
  createIncident,
  updateIncidentStatus,
  getAllZones,
  getZoneById,
  updateZoneSimulation,
  getAnalytics
};
