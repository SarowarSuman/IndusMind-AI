export type PageRoute =
  | "home"
  | "platform"
  | "solutions"
  | "industries"
  | "technology"
  | "signin"
  | "dashboard"
  | "digital-twin"
  | "machines"
  | "predictive"
  | "production"
  | "supply-chain"
  | "weather"
  | "copilot"
  | "maintenance"
  | "alerts"
  | "analytics"
  | "settings";

export type UserRole =
  | "System Admin"
  | "Developer"
  | "Factory Owner"
  | "Plant Manager"
  | "Maintenance Engineer"
  | "Production Manager";

export type RiskLevel = "Low Risk" | "Moderate Risk" | "High Risk" | "Critical Risk";

export type MachineVisualKind =
  | "motor"
  | "pump"
  | "robot"
  | "conveyor"
  | "boiler"
  | "generator";

export type OperationalStatus = "Operational" | "Warning" | "Critical" | "Maintenance";

export interface SensorReading {
  timestamp: string;
  temperature: number;
  vibration: number;
  powerKw: number;
  rpm: number;
  pressureBar?: number;
  torqueNm?: number;
  healthScore: number;
}

export interface SensorThresholds {
  tempNominal: number;
  tempMax: number;
  vibrationNominal: number;
  vibrationMax: number;
  powerNominal: number;
  powerMax: number;
  rpmNominal: number;
  rpmVariancePct: number;
  pressureNominal?: number;
  pressureMax?: number;
  torqueNominal?: number;
  torqueMax?: number;
  hasPressure: boolean;
  hasTorque: boolean;
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  action: string;
  technician: string;
  outcome: string;
  costBdt: number;
}

export interface ContributingFactor {
  metric: string;
  deltaPct: number;
  weight: number;
  summary: string;
}

export interface MachinePrediction {
  healthScore: number;
  healthBand: "Excellent" | "Good" | "Warning" | "Critical" | "Severe";
  riskScore: number;
  riskLevel: RiskLevel;
  predictedFailureCategory: string;
  confidenceNote: string;
  recommendedInspectionWindow: string;
  recommendedAction: string;
  operationalConsequence: string;
  contributingFactors: ContributingFactor[];
}

export interface MachineAsset {
  id: string;
  name: string;
  industryId: string;
  category: string;
  visualKind: MachineVisualKind;
  lineId: string;
  zone: "Production Floor" | "Utilities" | "Packaging & Logistics" | "Thermal & Power";
  manufacturer: string;
  model: string;
  installationDate: string;
  operatingHours: number;
  status: OperationalStatus;
  temperature: number;
  vibration: number;
  powerKw: number;
  rpm: number;
  pressureBar?: number;
  torqueNm?: number;
  position3D: [number, number, number];
  connectedTo: string[];
  thresholds: SensorThresholds;
  history: SensorReading[];
  maintenanceHistory: MaintenanceRecord[];
  prediction: MachinePrediction;
}

export interface IndustryPreset {
  id: string;
  name: string;
  sectorSummary: string;
  machineCategories: string[];
  defaultLocation: string;
  productionUnit: string;
  dailyTarget: number;
  keyRisks: string[];
  kpis: string[];
  sampleTemplates: Array<{
    suffix: string;
    name: string;
    category: string;
    visualKind: MachineVisualKind;
    zone: MachineAsset["zone"];
    thresholds: SensorThresholds;
  }>;
  suppliers: Array<{
    name: string;
    material: string;
    leadTimeDays: number;
    reliabilityScore: number;
    dependency: "High" | "Medium" | "Low";
  }>;
  materials: Array<{
    name: string;
    unit: string;
    currentStock: number;
    minStock: number;
    reorderThreshold: number;
    dailyConsumption: number;
    incomingQty: number;
    incomingEtaDays: number;
  }>;
  fleetProfile: {
    baseDowntimeHrs: number;
    baseMaintenanceBdt: number;
    lineCount: 2 | 3;
    degradedIndices: number[];
    watchIndices: number[];
    efficiencyBiasPct: number;
    openTaskCount: 1 | 2 | 3;
  };
}

export interface ProductionLine {
  id: string;
  name: string;
  shift: string;
  targetUnits: number;
  actualUnits: number;
  efficiencyPct: number;
  status: "Running" | "Degraded" | "Bottleneck" | "Halted";
  machineIds: string[];
  unitCapacityPerHour: number;
}

export interface SupplierProfile {
  id: string;
  name: string;
  material: string;
  leadTimeDays: number;
  expectedDeliveryDate: string;
  shipmentStatus: "On Schedule" | "In Transit" | "Delayed" | "At Risk";
  reliabilityScore: number;
  delayHistoryDays: number;
  dependencyLevel: "High" | "Medium" | "Low";
}

export interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  currentInventory: number;
  minStockLevel: number;
  reorderThreshold: number;
  dailyConsumption: number;
  incomingStock: number;
  incomingEtaDays: number;
}

export type AlertCategory =
  | "Machine Failure Risk"
  | "Abnormal Temperature"
  | "Abnormal Vibration"
  | "Power Consumption"
  | "Production Bottleneck"
  | "Supplier Delay"
  | "Inventory Shortage"
  | "Weather Disruption"
  | "Maintenance Overdue";

export type AlertPriority = "Critical" | "High" | "Medium" | "Low";

export interface IndustrialAlert {
  id: string;
  title: string;
  message: string;
  recommendedAction: string;
  category: AlertCategory;
  priority: AlertPriority;
  timestamp: string;
  read: boolean;
  resolved: boolean;
  machineId?: string;
}

export type MaintenanceStatus =
  | "Scheduled"
  | "In Progress"
  | "Completed"
  | "Overdue"
  | "Cancelled";

export interface MaintenanceTask {
  id: string;
  machineId: string;
  machineName: string;
  title: string;
  priority: AlertPriority;
  assignedTechnician: string;
  dueDate: string;
  estimatedDurationHrs: number;
  status: MaintenanceStatus;
  notes: string;
  createdFromAlertId?: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: "alert" | "maintenance" | "simulation" | "supply" | "weather";
  description: string;
}

export interface WeatherScenarioState {
  cityKey: string;
  customLat?: number;
  customLon?: number;
  simulatedHazard: "None" | "Heavy Rainfall" | "Flood Scenario" | "Extreme Heat" | "Transport Disruption";
  liveData: {
    source: string;
    isSimulated: boolean;
    location: string;
    updatedAt: string;
    current: {
      temperatureC: number;
      humidityPct: number;
      rainMm: number;
      windKmh: number;
      weatherCode: number;
    };
    daily: Array<{
      date: string;
      tempMaxC: number;
      tempMinC: number;
      precipProbPct: number;
      rainSumMm: number;
    }>;
  } | null;
}

export interface SupplyChainDisruption {
  supplierDelayDays: number;
  portCongestion: boolean;
  roadDisruption: boolean;
  weatherDisruption: boolean;
  inventoryShortagePct: number;
}

export interface FactoryEnvironment {
  id: string;
  name: string;
  location: string;
  industryId: string;
  machines: MachineAsset[];
  lines: ProductionLine[];
  suppliers: SupplierProfile[];
  materials: RawMaterial[];
  alerts: IndustrialAlert[];
  maintenanceTasks: MaintenanceTask[];
  activityLog: ActivityEvent[];
  supplyDisruption: SupplyChainDisruption;
  downtimeHoursMonth: number;
  maintenanceCostBdtMonth: number;
}
