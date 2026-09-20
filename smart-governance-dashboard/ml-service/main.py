import re
import math
from typing import Optional, List, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="GovPulse ML Microservice - Telangana & National Hubs",
    version="2.0.0",
    description="Telangana State & India Civic NLP Complaint Classification and Urban Risk Regression Engine",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------
class GrievanceRequest(BaseModel):
    title: str = Field(..., example="Deep pothole causing accidents near main junction")
    description: Optional[str] = Field(None, example="Two motorcyclists skidded this morning.")
    zone_id: Optional[str] = Field("TS-HYD-W", example="TS-HYD-W")
    state: Optional[str] = Field("Telangana", example="Telangana")
    city: Optional[str] = Field(None, example="Hyderabad")

class GrievanceClassificationResponse(BaseModel):
    category: str
    department: str
    urgency_score: float
    priority: str
    confidence: float
    estimated_sla_hours: int
    sentiment: str
    recommended_action: str
    keywords_detected: List[str]

class RiskSimulationRequest(BaseModel):
    zone_id: str = Field(..., example="TS-HYD-W")
    temperature: float = Field(..., example=36.5)
    traffic_density: float = Field(..., example=78.0)
    weather: Optional[str] = Field("Clear", example="Heavy Rain")
    historical_incident_rate: Optional[float] = Field(4.2, example=4.5)

class ComponentBreakdown(BaseModel):
    heat_stress_index: float
    traffic_congestion_impact: float
    weather_hazard_factor: float
    infrastructure_strain: float

class RiskSimulationResponse(BaseModel):
    zone_id: str
    risk_score: float
    risk_level: str
    incident_probability_pct: float
    projected_response_time_min: int
    components: ComponentBreakdown
    recommended_interventions: List[str]
    alert_triggered: bool

# ---------------------------------------------------------
# ML Engine: Rule-guided & Semantic NLP Classification
# ---------------------------------------------------------
CATEGORY_DEFINITIONS = {
    "Roads & Infrastructure": {
        "dept": "GHMC / GWMC / Telangana Municipal Administration & Urban Development (MA&UD)",
        "keywords": [
            "pothole", "road", "bridge", "asphalt", "flyover", "cave-in", "traffic light", "signal",
            "pavement", "footpath", "divider", "speed breaker", "crater", "manhole cover", "underpass",
            "outer ring", "nh-65", "nh-44", "orrr", "junction", "skidded", "highway", "culvert"
        ],
        "critical_triggers": [
            "collapse", "bridge crack", "sinkhole", "fatal", "road cave-in", "blocked main road",
            "flyover structural", "underpass submerged"
        ]
    },
    "Water & Sewage": {
        "dept": "HMWS&SB / Mission Bhagiratha Directorate / Urban Drainage",
        "keywords": [
            "water", "sewage", "drainage", "pipe", "pipeline", "leak", "contamination", "overflow",
            "manhole", "gutter", "drinking water", "stagnant", "hmws&sb", "mission bhagiratha", "canal",
            "waterlogging", "sump", "borewell", "lake buffer", "water tanker", "stormwater"
        ],
        "critical_triggers": [
            "contamination", "pipeline burst", "submerged", "manhole open", "poisonous", "foul smell",
            "canal breach", "flash waterlogging", "main feeder rupture"
        ]
    },
    "Electricity & Power": {
        "dept": "TSSPDCL & TSNPDCL Power Distribution Corporation of Telangana",
        "keywords": [
            "power", "electricity", "transformer", "wire", "blackout", "spark", "sparking", "pole",
            "voltage", "current", "streetlight", "substation", "33kv", "11kv", "feeder", "tsspdcl",
            "tsnpdcl", "capacitor", "cable fault", "trench"
        ],
        "critical_triggers": [
            "live wire", "hanging wire", "transformer fire", "sparking", "shock hazard", "explosion",
            "grid trip", "high voltage blowout"
        ]
    },
    "Public Safety & Fire": {
        "dept": "Telangana State Disaster Response & Fire Services / HYDRAA",
        "keywords": [
            "safety", "fire", "gas", "smoke", "accident", "hazard", "encroachment", "illegal",
            "cylinder", "crime", "dark alley", "hydraa", "lake buffer", "fly-ash", "chemical", "emergency"
        ],
        "critical_triggers": [
            "fire", "gas leak", "explosion", "toxic", "burning", "immediate rescue", "building collapse",
            "chemical spill", "industrial blast"
        ]
    },
    "Sanitation & Waste Management": {
        "dept": "Solid Waste & Sanitation Wing (GHMC/GWMC/Urban Local Bodies)",
        "keywords": [
            "garbage", "trash", "waste", "dump", "stench", "dead animal", "debris", "bin",
            "plastic", "cleanliness", "swachh", "commercial waste", "dumper", "rubbish"
        ],
        "critical_triggers": [
            "medical waste", "rotting", "biohazard", "epidemic", "toxic waste dump"
        ]
    },
    "Public Health & Vector Control": {
        "dept": "Telangana Directorate of Public Health & Family Welfare",
        "keywords": [
            "dengue", "malaria", "mosquito", "fever", "clinic", "hospital", "larvae", "spraying",
            "fogging", "food safety", "stagnant pool", "cholera", "typhoid", "vector"
        ],
        "critical_triggers": [
            "outbreak", "dengue cluster", "dengue cases", "hospital shortage", "fever deaths",
            "epidemic cluster"
        ]
    }
}

def classify_grievance_nlp(text: str, state: str = "Telangana", city: Optional[str] = None) -> GrievanceClassificationResponse:
    cleaned = text.lower().strip()
    
    # Calculate scores per category
    category_scores: Dict[str, float] = {}
    found_keywords_by_cat: Dict[str, List[str]] = {}
    is_critical_trigger = False
    critical_matches = []

    for cat, data in CATEGORY_DEFINITIONS.items():
        score = 0.0
        matched = []
        for kw in data["keywords"]:
            if kw in cleaned:
                score += 1.6
                matched.append(kw)
        for crit in data["critical_triggers"]:
            if crit in cleaned:
                score += 3.8
                is_critical_trigger = True
                critical_matches.append(crit)
        category_scores[cat] = score
        found_keywords_by_cat[cat] = matched

    # Find highest scoring category
    best_cat = max(category_scores, key=category_scores.get)
    best_score = category_scores[best_cat]

    if best_score == 0.0:
        # Default fallback
        best_cat = "Roads & Infrastructure"
        dept = "GHMC / Municipal Works Directorate" if state == "Telangana" else "Department of Transportation & Municipal Works"
        urgency_score = 0.35
        priority = "Low"
        confidence = 0.74
        sla = 72
        rec_action = f"Assign field municipal inspector for routine survey."
        keywords_detected = []
    else:
        dept = CATEGORY_DEFINITIONS[best_cat]["dept"]
        keywords_detected = found_keywords_by_cat[best_cat]
        
        # Calculate urgency & SLA
        if is_critical_trigger or best_score >= 5.0:
            urgency_score = min(0.98, 0.78 + (best_score * 0.04))
            priority = "Critical"
            sla = 3
            rec_action = f"Immediate Emergency Dispatch: Issue priority alert to {dept} quick-response team."
        elif best_score >= 3.0:
            urgency_score = min(0.76, 0.52 + (best_score * 0.04))
            priority = "High"
            sla = 8
            rec_action = f"Priority Triage: Route to zonal engineer at {dept} with an 8-hour resolution window."
        elif best_score >= 1.5:
            urgency_score = 0.48
            priority = "Medium"
            sla = 24
            rec_action = f"Standard Routing: Scheduled for maintenance team check under {dept}."
        else:
            urgency_score = 0.28
            priority = "Low"
            sla = 48
            rec_action = f"Logged for standard municipal review."

        confidence = round(min(0.98, 0.84 + (best_score * 0.03)), 2)

    sentiment = "Distressed / Urgent" if urgency_score > 0.65 else ("Concerned" if urgency_score > 0.40 else "Neutral")

    return GrievanceClassificationResponse(
        category=best_cat,
        department=dept,
        urgency_score=round(urgency_score, 2),
        priority=priority,
        confidence=confidence,
        estimated_sla_hours=sla,
        sentiment=sentiment,
        recommended_action=rec_action,
        keywords_detected=keywords_detected + critical_matches
    )

# ---------------------------------------------------------
# ML Engine: Multi-Factor Urban Risk Regression
# ---------------------------------------------------------
def predict_urban_risk_regression(
    zone_id: str,
    temp: float,
    traffic: float,
    weather: Optional[str] = "Clear",
    historical_rate: Optional[float] = 4.2
) -> RiskSimulationResponse:
    # 1. Heat stress factor (Baseline 28°C; increases sharply over 38°C)
    heat_stress = max(0.0, (temp - 24.0) * 1.8)
    if temp > 40.0:
        heat_stress += (temp - 40.0) * 3.5

    # 2. Traffic congestion impact (Baseline 40%; non-linear above 75%)
    traffic_impact = (traffic / 100.0) * 35.0
    if traffic > 75.0:
        traffic_impact += math.pow((traffic - 75.0) / 5.0, 1.6) * 4.0

    # 3. Weather hazard factor
    weather_factors = {
        "Clear": 2.0,
        "Moderate Rain": 14.0,
        "Heavy Rain": 30.0,
        "Thunderstorm": 40.0,
        "Heatwave": 26.0,
        "Smog / Low Visibility": 18.0,
    }
    weather_hazard = weather_factors.get(weather, 5.0)

    # 4. Infrastructure strain & historical base
    base_strain = min(25.0, (historical_rate or 4.0) * 3.2)

    # Overall raw risk score calculation (Regression formula)
    raw_risk = (
        (0.30 * heat_stress) +
        (0.35 * traffic_impact) +
        (0.20 * weather_hazard) +
        (0.15 * base_strain)
    )

    # Normalize between 0 and 100
    risk_score = round(max(5.0, min(99.4, raw_risk * 1.8)), 1)

    # Categorize Risk
    if risk_score >= 75.0:
        risk_level = "Critical"
        alert_triggered = True
        response_time = 15
        interventions = [
            f"Pre-deploy emergency rapid intervention units to {zone_id}.",
            "Activate dynamic traffic signal modulation to clear congestion bottlenecks.",
            "Alert grid substations (TSSPDCL/TSNPDCL) for peak thermal transformer overload.",
            "Deploy municipal dewatering pumps and drainage clearing squads."
        ]
    elif risk_score >= 50.0:
        risk_level = "Elevated"
        alert_triggered = True
        response_time = 30
        interventions = [
            f"Issue advisory notice to municipal zone {zone_id} field superintendents.",
            "Divert transit flow at secondary junctions to reduce arterial gridlock.",
            "Elevate standby readiness for municipal and power repair crews."
        ]
    elif risk_score >= 30.0:
        risk_level = "Moderate"
        alert_triggered = False
        response_time = 60
        interventions = [
            "Maintain standard sensor surveillance and automated telemetry logging.",
            "Verify automated pump telemetry and street lighting power stability."
        ]
    else:
        risk_level = "Normal"
        alert_triggered = False
        response_time = 120
        interventions = [
            "System nominal. Urban risk within acceptable green bounds.",
            "Routine telemetry heartbeat checks active."
        ]

    probability = round(min(98.5, max(4.0, risk_score * 0.94)), 1)

    breakdown = ComponentBreakdown(
        heat_stress_index=round(min(100.0, heat_stress * 2.2), 1),
        traffic_congestion_impact=round(min(100.0, traffic_impact * 1.8), 1),
        weather_hazard_factor=round(min(100.0, weather_hazard * 2.5), 1),
        infrastructure_strain=round(min(100.0, base_strain * 3.0), 1)
    )

    return RiskSimulationResponse(
        zone_id=zone_id,
        risk_score=risk_score,
        risk_level=risk_level,
        incident_probability_pct=probability,
        projected_response_time_min=response_time,
        components=breakdown,
        recommended_interventions=interventions,
        alert_triggered=alert_triggered
    )

# ---------------------------------------------------------
# API Routes
# ---------------------------------------------------------
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "GovPulse ML Microservice",
        "engine": "FastAPI + Telangana & National NLP / Regression Core",
        "version": "2.0.0"
    }

@app.post("/predict/classify", response_model=GrievanceClassificationResponse)
def classify_endpoint(req: GrievanceRequest):
    combined_text = f"{req.title} {req.description or ''}"
    if not combined_text.strip():
        raise HTTPException(status_code=400, detail="Grievance title/text cannot be empty.")
    return classify_grievance_nlp(combined_text, state=req.state or "Telangana", city=req.city)

@app.post("/predict/risk-score", response_model=RiskSimulationResponse)
def risk_score_endpoint(req: RiskSimulationRequest):
    return predict_urban_risk_regression(
        zone_id=req.zone_id,
        temp=req.temperature,
        traffic=req.traffic_density,
        weather=req.weather,
        historical_rate=req.historical_incident_rate
    )

@app.get("/zones/telemetry")
def get_zones_baseline():
    return [
        # Telangana State
        {"zone_id": "TS-HYD-W", "name": "Cyberabad & HITEC City (GHMC West)", "city": "Hyderabad", "state": "Telangana", "lat": 17.4435, "lng": 78.3772, "baseline_temp": 34.2, "baseline_traffic": 86.0, "risk_index": 76},
        {"zone_id": "TS-HYD-C", "name": "Charminar & Old City (GHMC South)", "city": "Hyderabad", "state": "Telangana", "lat": 17.3616, "lng": 78.4747, "baseline_temp": 35.0, "baseline_traffic": 89.5, "risk_index": 81},
        {"zone_id": "TS-HYD-N", "name": "Secunderabad & Begumpet (GHMC North)", "city": "Secunderabad", "state": "Telangana", "lat": 17.4399, "lng": 78.4983, "baseline_temp": 33.8, "baseline_traffic": 81.0, "risk_index": 69},
        {"zone_id": "TS-WGL", "name": "Greater Warangal & Kazipet (GWMC)", "city": "Warangal", "state": "Telangana", "lat": 17.9689, "lng": 79.5941, "baseline_temp": 36.4, "baseline_traffic": 74.0, "risk_index": 63},
        {"zone_id": "TS-KRM", "name": "Karimnagar Smart City (MCK)", "city": "Karimnagar", "state": "Telangana", "lat": 18.4386, "lng": 79.1288, "baseline_temp": 37.8, "baseline_traffic": 68.0, "risk_index": 58},
        {"zone_id": "TS-NZB", "name": "Nizamabad Municipal Corporation", "city": "Nizamabad", "state": "Telangana", "lat": 18.6725, "lng": 78.0941, "baseline_temp": 36.9, "baseline_traffic": 62.0, "risk_index": 52},
        {"zone_id": "TS-KHM", "name": "Khammam Municipal Corporation", "city": "Khammam", "state": "Telangana", "lat": 17.2473, "lng": 80.1514, "baseline_temp": 38.2, "baseline_traffic": 65.0, "risk_index": 54},
        {"zone_id": "TS-RGD", "name": "Ramagundam Industrial Belt", "city": "Ramagundam", "state": "Telangana", "lat": 18.7618, "lng": 79.4744, "baseline_temp": 41.5, "baseline_traffic": 78.0, "risk_index": 84},
        {"zone_id": "TS-MBN", "name": "Mahbubnagar Municipal Council", "city": "Mahbubnagar", "state": "Telangana", "lat": 16.7488, "lng": 78.0035, "baseline_temp": 36.1, "baseline_traffic": 58.0, "risk_index": 45},
        {"zone_id": "TS-NLG", "name": "Nalgonda Urban Council", "city": "Nalgonda", "state": "Telangana", "lat": 17.0577, "lng": 79.2684, "baseline_temp": 37.0, "baseline_traffic": 54.0, "risk_index": 43},
        {"zone_id": "TS-ADB", "name": "Adilabad Municipal Council", "city": "Adilabad", "state": "Telangana", "lat": 19.6641, "lng": 78.5320, "baseline_temp": 38.5, "baseline_traffic": 51.0, "risk_index": 47},
        {"zone_id": "TS-SDP", "name": "Siddipet Model Smart Municipality", "city": "Siddipet", "state": "Telangana", "lat": 18.1018, "lng": 78.8520, "baseline_temp": 34.6, "baseline_traffic": 49.0, "risk_index": 38},
        {"zone_id": "TS-SYP", "name": "Suryapet Municipality", "city": "Suryapet", "state": "Telangana", "lat": 17.1439, "lng": 79.6239, "baseline_temp": 36.8, "baseline_traffic": 61.0, "risk_index": 44},
        {"zone_id": "TS-KTG", "name": "Kothagudem Mining Belt", "city": "Kothagudem", "state": "Telangana", "lat": 17.5529, "lng": 80.6190, "baseline_temp": 39.2, "baseline_traffic": 64.0, "risk_index": 66},

        # National Metros
        {"zone_id": "IN-DEL", "name": "Delhi NCR (Central & Ring Road)", "city": "New Delhi", "state": "National Capital Region", "lat": 28.6139, "lng": 77.2090, "baseline_temp": 37.2, "baseline_traffic": 88.0, "risk_index": 82},
        {"zone_id": "IN-MUM", "name": "Mumbai Metro (Bandra-BKC Corridor)", "city": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lng": 72.8777, "baseline_temp": 32.5, "baseline_traffic": 91.0, "risk_index": 84},
        {"zone_id": "IN-BLR", "name": "Bengaluru Tech Corridor (Outer Ring Rd)", "city": "Bengaluru", "state": "Karnataka", "lat": 12.9716, "lng": 77.5946, "baseline_temp": 28.4, "baseline_traffic": 82.0, "risk_index": 68},
        {"zone_id": "IN-CHE", "name": "Chennai Central & OMR Corridor", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lng": 80.2707, "baseline_temp": 34.0, "baseline_traffic": 66.0, "risk_index": 48},
        {"zone_id": "IN-CCU", "name": "Kolkata Sector V & Rajarhat", "city": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lng": 88.3639, "baseline_temp": 31.8, "baseline_traffic": 63.0, "risk_index": 42}
    ]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
