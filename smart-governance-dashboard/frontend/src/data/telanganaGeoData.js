// Photorealistic Telangana Geographic Boundaries, Arterial Highway Corridors,
// River Systems, Emergency Fleet Assets, and District Weather/AQI Telemetry.

// 1. Telangana State Authentic Boundary Polygon (Outer Perimeter Coordinates)
export const TELANGANA_STATE_BOUNDARY = [
  [19.9200, 78.5400],
  [19.7800, 79.1200],
  [19.5500, 79.6800],
  [19.2200, 80.0500],
  [18.8200, 80.3800],
  [18.3500, 80.7500],
  [17.8200, 80.9800], // Bhadrachalam / Godavari bend
  [17.4800, 81.1200],
  [17.2000, 80.8500],
  [16.8500, 80.3500],
  [16.7000, 79.9200],
  [16.5800, 79.4800], // Krishna river border
  [16.4200, 79.1500],
  [16.1500, 78.7500], // Nagarjuna Sagar area
  [15.9500, 78.3200], // Alampur / Tungabhadra confluence
  [15.8800, 77.9500],
  [16.3500, 77.5800],
  [16.8200, 77.3800],
  [17.2500, 77.3500],
  [17.6500, 77.4800], // Zaheerabad border
  [18.1500, 77.6200],
  [18.5200, 77.7500], // Bodhan border
  [18.9800, 78.0200],
  [19.4500, 78.1800],
  [19.7800, 78.3200],
  [19.9200, 78.5400]  // Closing loop
];

// 2. Arterial Expressways & Highway Networks
export const TELANGANA_HIGHWAYS = [
  {
    id: 'NH-44',
    name: 'National Highway 44 (North-South Golden Corridor)',
    color: '#38bdf8', // bright sky blue
    dashArray: null,
    coords: [
      [19.8200, 78.5500], // Adilabad North
      [19.6641, 78.5320], // Adilabad
      [19.0964, 78.3432], // Nirmal
      [18.3243, 78.3408], // Kamareddy
      [17.8500, 78.4200], // Medchal
      [17.4435, 78.4700], // Hyderabad North
      [17.3600, 78.4800], // Hyderabad Central
      [17.2100, 78.4300], // Shamshabad Airport
      [16.9200, 78.1800], // Shadnagar
      [16.7488, 78.0035], // Mahbubnagar Jadcherla
      [16.2500, 77.8800]  // Gadwal / AP Border
    ]
  },
  {
    id: 'NH-65',
    name: 'National Highway 65 (Hyderabad - Vijayawada Expressway)',
    color: '#fbbf24', // golden amber
    dashArray: null,
    coords: [
      [17.6800, 77.5800], // Zaheerabad (West)
      [17.5200, 78.1200], // Sangareddy
      [17.4435, 78.3772], // Hyderabad HITEC City
      [17.3500, 78.5800], // LB Nagar
      [17.2200, 79.1500], // Choutuppal
      [17.1439, 79.6239], // Suryapet
      [17.0200, 80.0500], // Kodad
      [16.9200, 80.3500]  // AP Border
    ]
  },
  {
    id: 'ORR-EXP',
    name: 'Hyderabad Nehru Outer Ring Road (158 km 8-Lane Expressway)',
    color: '#34d399', // emerald
    dashArray: '6, 6',
    coords: [
      [17.4435, 78.3772], // Gachibowli
      [17.4950, 78.3650], // Miyapur / Patancheru
      [17.5500, 78.4200], // Dundigal
      [17.5600, 78.5200], // Medchal junction
      [17.5100, 78.6100], // Shamirpet
      [17.4400, 78.6600], // Ghatkesar
      [17.3500, 78.6200], // Pedda Amberpet
      [17.2700, 78.5300], // Tukkuguda (Airport East)
      [17.2300, 78.4300], // Shamshabad Airport
      [17.2800, 78.3400], // Rajendranagar
      [17.3800, 78.3200], // Narsingi
      [17.4435, 78.3772]  // Gachibowli loop
    ]
  },
  {
    id: 'WGL-EXP',
    name: 'Hyderabad - Warangal Industrial Corridor (NH-163)',
    color: '#a78bfa', // purple
    dashArray: null,
    coords: [
      [17.4400, 78.6600], // Hyderabad Ghatkesar
      [17.5800, 78.9200], // Bhongir
      [17.7200, 79.2500], // Aler / Jangaon
      [17.8800, 79.4800], // Kazipet
      [17.9689, 79.5941]  // Warangal City
    ]
  }
];

// 3. Major Telangana River Systems & Water Reservoirs
export const TELANGANA_RIVERS = [
  {
    id: 'GODAVARI',
    name: 'Godavari River (Dakshin Ganga)',
    color: '#38bdf8',
    width: 3.5,
    coords: [
      [18.9500, 77.8500], // Enters at Basar (Nirmal/Nizamabad)
      [19.0200, 78.2500], // Sri Ram Sagar Project (SRSP) Reservoir
      [18.9500, 78.7500], // Jagtial border
      [18.8200, 79.2200], // Dharmapuri
      [18.7618, 79.4744], // Ramagundam / Godavarikhani
      [18.8500, 79.8500], // Mancherial
      [18.6200, 80.2500], // Kaleshwaram Lift Irrigation barrage
      [18.1500, 80.6500], // Eturnagaram
      [17.6680, 80.8950], // Bhadrachalam Temple Town
      [17.4500, 81.1500]  // Flows to Rajahmundry
    ]
  },
  {
    id: 'KRISHNA',
    name: 'Krishna River Basin',
    color: '#0284c7',
    width: 3.5,
    coords: [
      [16.4800, 77.2500], // Enters at Jurala Project
      [16.3200, 77.7200], // Gadwal / Mahbubnagar
      [16.0200, 78.2800], // Srisailam Reservoir gorge
      [16.5800, 79.3200], // Nagarjuna Sagar Dam
      [16.8200, 80.0500]  // Palair / Pulichintala
    ]
  }
];

// 4. Strategic Water Reservoirs & Civic Lakes
export const TELANGANA_LAKES = [
  { name: 'Hussain Sagar Lake', city: 'Hyderabad', lat: 17.4239, lng: 78.4738, radius: 1400 },
  { name: 'Osman Sagar (Gandipet)', city: 'Hyderabad West', lat: 17.3780, lng: 78.2980, radius: 2200 },
  { name: 'Lower Manair Dam (LMD)', city: 'Karimnagar', lat: 18.4120, lng: 79.1120, radius: 2600 },
  { name: 'Bhadrakali Lake', city: 'Warangal', lat: 17.9850, lng: 79.5750, radius: 1500 },
  { name: 'Komati Cheruvu Promenade', city: 'Siddipet', lat: 18.1150, lng: 78.8650, radius: 1100 },
  { name: 'Paleru Reservoir', city: 'Khammam', lat: 17.2100, lng: 79.9100, radius: 2100 },
  { name: 'Kaddam Reservoir', city: 'Nirmal', lat: 19.1200, lng: 78.7800, radius: 2400 }
];

// 5. Active Municipal Emergency Fleet Assets (Simulated Telemetry)
export const TELANGANA_EMERGENCY_FLEET = [
  {
    id: 'FLEET-TS-01',
    callsign: 'TSSPDCL Quick Response Van #14',
    type: 'electric',
    icon: '⚡',
    badge: 'TSSPDCL 33kV Repair',
    city: 'Hyderabad (Cyberabad)',
    lat: 17.4475,
    lng: 78.3790,
    status: 'En Route',
    driver: 'Squad Lead Ramesh V. (Emp #4829)',
    destination: 'Mindspace Junction 33kV Trench',
    etaMin: 8,
    fuel: '92%'
  },
  {
    id: 'FLEET-TS-02',
    callsign: 'GHMC High-Volume De-Watering Rig #03',
    type: 'water',
    icon: '💧',
    badge: 'GHMC Flood Unit',
    city: 'Hyderabad (Charminar)',
    lat: 17.3625,
    lng: 78.4720,
    status: 'Active Pumping',
    driver: 'Station Engineer Mohammed Farooq',
    destination: 'Laad Bazar Storm Drain',
    etaMin: 0,
    fuel: '78%'
  },
  {
    id: 'FLEET-TS-03',
    callsign: 'GWMC Fire & Rescue Heavy Tender #02',
    type: 'fire',
    icon: '🚒',
    badge: 'Telangana Fire Services',
    city: 'Warangal (Kazipet)',
    lat: 17.9790,
    lng: 79.5840,
    status: 'Standby Ready',
    driver: 'Commander K. Prabhakar',
    destination: 'Kazipet Underpass Depot',
    etaMin: 0,
    fuel: '100%'
  },
  {
    id: 'FLEET-TS-04',
    callsign: 'NTPC Industrial Hazard Foam Truck #01',
    type: 'fire',
    icon: '🚒',
    badge: 'Industrial Hazard Unit',
    city: 'Ramagundam',
    lat: 18.7660,
    lng: 79.4790,
    status: 'On Site',
    driver: 'Safety Officer Suresh Rao',
    destination: 'Gate 3 Fly-Ash Pipeline Corridor',
    etaMin: 4,
    fuel: '85%'
  },
  {
    id: 'FLEET-TS-05',
    callsign: 'Mission Bhagiratha Water Tanker #22',
    type: 'water',
    icon: '💧',
    badge: 'Mission Bhagiratha',
    city: 'Siddipet',
    lat: 18.1040,
    lng: 78.8540,
    status: 'Dispatched',
    driver: 'Operator N. Venkatesh',
    destination: 'Ring Road Valve Chamber',
    etaMin: 12,
    fuel: '88%'
  },
  {
    id: 'FLEET-TS-06',
    callsign: '108 Advanced Life Support Ambulance #18',
    type: 'medical',
    icon: '🚑',
    badge: '108 Emergency Medical',
    city: 'Karimnagar',
    lat: 18.4395,
    lng: 79.1310,
    status: 'Patrolling',
    driver: 'Paramedic Anitha G.',
    destination: 'Tower Circle Sector',
    etaMin: 6,
    fuel: '94%'
  },
  {
    id: 'FLEET-TS-07',
    callsign: 'HYDRAA Lake Buffer Rapid Action #04',
    type: 'police',
    icon: '🛡️',
    badge: 'HYDRAA Protection',
    city: 'Hyderabad (Begumpet)',
    lat: 17.4410,
    lng: 78.4970,
    status: 'Surveillance',
    driver: 'Officer M. S. Reddy',
    destination: 'Hussain Sagar Inflow Sluice',
    etaMin: 0,
    fuel: '81%'
  },
  {
    id: 'FLEET-TS-08',
    callsign: 'TSNPDCL Transformer Diagnostic Van #08',
    type: 'electric',
    icon: '⚡',
    badge: 'TSNPDCL Northern Grid',
    city: 'Nizamabad',
    lat: 18.6740,
    lng: 78.0950,
    status: 'Standby',
    driver: 'Senior Tech J. Srinivas',
    destination: 'Gandhi Chowk Feeder',
    etaMin: 0,
    fuel: '90%'
  },
  {
    id: 'FLEET-TS-09',
    callsign: 'KMC Vector Fogging Mobile Rig #02',
    type: 'health',
    icon: '🦟',
    badge: 'KMC Health Dept',
    city: 'Khammam',
    lat: 17.2490,
    lng: 80.1530,
    status: 'Spraying Active',
    driver: 'Field Inspector Y. Laxman',
    destination: 'Wyra Canal Colony',
    etaMin: 0,
    fuel: '76%'
  }
];

// 6. Realistic District Weather, Air Quality Index (AQI) & Telemetry
export const DISTRICT_WEATHER_DATA = {
  'Hyderabad': { aqi: 112, aqiStatus: 'Moderate', humidity: '54%', wind: '14 km/h SW', uv: 'High (7)' },
  'Secunderabad': { aqi: 108, aqiStatus: 'Moderate', humidity: '56%', wind: '13 km/h SW', uv: 'High (7)' },
  'Warangal': { aqi: 78, aqiStatus: 'Satisfactory', humidity: '62%', wind: '11 km/h S', uv: 'Moderate (6)' },
  'Karimnagar': { aqi: 88, aqiStatus: 'Satisfactory', humidity: '48%', wind: '9 km/h SE', uv: 'Very High (8)' },
  'Nizamabad': { aqi: 94, aqiStatus: 'Satisfactory', humidity: '51%', wind: '12 km/h NW', uv: 'High (7)' },
  'Khammam': { aqi: 72, aqiStatus: 'Good', humidity: '68%', wind: '15 km/h SE', uv: 'Moderate (5)' },
  'Ramagundam': { aqi: 168, aqiStatus: 'Poor (Industrial)', humidity: '42%', wind: '8 km/h E', uv: 'Extreme (9)' },
  'Mahbubnagar': { aqi: 64, aqiStatus: 'Good', humidity: '45%', wind: '16 km/h W', uv: 'High (7)' },
  'Nalgonda': { aqi: 82, aqiStatus: 'Satisfactory', humidity: '50%', wind: '14 km/h S', uv: 'High (7)' },
  'Adilabad': { aqi: 58, aqiStatus: 'Good', humidity: '52%', wind: '10 km/h N', uv: 'High (7)' },
  'Siddipet': { aqi: 62, aqiStatus: 'Good', humidity: '49%', wind: '12 km/h SW', uv: 'Moderate (6)' },
  'Suryapet': { aqi: 79, aqiStatus: 'Satisfactory', humidity: '55%', wind: '15 km/h SE', uv: 'High (7)' },
  'Kothagudem': { aqi: 142, aqiStatus: 'Moderate (Mining)', humidity: '60%', wind: '9 km/h E', uv: 'High (7)' }
};
