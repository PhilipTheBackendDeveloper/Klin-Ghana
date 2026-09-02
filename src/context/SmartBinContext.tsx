import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { SmartBin, UserRole, AlertNotification, CollectionRecord, CitizenReport } from '../types';
import { IotIngestionService } from '../services/iotIngestion';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { env } from '../config/env';
import { calculateUiStatus } from '../shared/telemetryContract';

export interface RouteStop {
  id?: string;
  time: string;
  name: string;
  type: string;
  status: 'PENDING' | 'ARRIVED' | 'COLLECTED' | 'SKIPPED';
  binCode?: string;
}

export type DataMode = 'live' | 'demo';
export type DataStatus = 'idle' | 'loading' | 'ready' | 'error' | 'not_configured';

export interface SmartBinContextType {
  bins: SmartBin[];
  selectedBin: SmartBin | null;
  selectedBinId: string | null;
  setSelectedBinId: (id: string | null) => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  alerts: AlertNotification[];
  collections: CollectionRecord[];
  citizenReports: CitizenReport[];
  routeStops: RouteStop[];
  lastTelemetryTime: string;
  activeView: string;
  setActiveView: (view: string) => void;
  isSimulating: boolean;
  setIsSimulating: React.Dispatch<React.SetStateAction<boolean>>;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  dataMode: DataMode;
  dataStatus: DataStatus;
  dataError: string | null;
  refreshLiveData: () => Promise<void>;

  fleetHealth: number;
  overflowCount: number;
  offlineCount: number;
  slaRiskCount: number;
  routeLoad: number;

  ingestTelemetry: (payload: unknown) => ReturnType<typeof IotIngestionService.processTelemetry>;
  collectBin: (binIdOrCode: string, collectorName?: string) => void;
  submitCitizenReport: (report: {
    problemType?: string;
    locationText?: string;
    description: string;
    priority?: 'Standard' | 'Urgent';
    evidenceUrl?: string;
    reporterName?: string;
    binId?: string;
    binName?: string;
    issueType?: string;
    reportedBy?: string;
  }) => string;
  assignComplaint: (ticketId: string, assignee: string) => void;
  resolveComplaint: (ticketId: string) => void;
  markAlertAsRead: (alertId: string) => void;
  markRouteStopCollected: (stopIndex: number) => void;
  toggleLid: (binId: string) => void;
  triggerProximitySensor: (binId: string) => void;
  updateBinTelemetry: (binId: string, updates: Partial<SmartBin>) => void;
  addBin: (bin: Omit<SmartBin, 'id' | 'lastUpdated' | 'totalCollectionsCount'>) => void;
  deleteBin: (binId: string) => void;
  clearAlerts: () => void;
  collectAllFullBins: () => void;
}

const SmartBinContext = createContext<SmartBinContextType | undefined>(undefined);

const LOCAL_STORAGE_BINS_KEY = 'klinghana_demo_smartbins_v3';
const LOCAL_STORAGE_ALERTS_KEY = 'klinghana_demo_alerts_v3';
const LOCAL_STORAGE_REPORTS_KEY = 'klinghana_demo_reports_v3';
const LOCAL_STORAGE_COLLECTIONS_KEY = 'klinghana_demo_collections_v3';

const DEMO_ALERTS: AlertNotification[] = [];
const DEMO_REPORTS: CitizenReport[] = [];
const DEMO_COLLECTIONS: CollectionRecord[] = [];
const DEMO_ROUTE_STOPS: RouteStop[] = [];

const getDemoValue = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const uiStatusFromDb = (state: any): SmartBin['status'] => {
  if (state?.connection_status === 'OFFLINE' || state?.bin_status === 'OFFLINE') return 'offline';
  return calculateUiStatus(Number(state?.fill_percentage ?? 0));
};

const mapBinRows = (rows: any[]): SmartBin[] => rows.map((row) => {
  const state = Array.isArray(row.bin_current_state) ? row.bin_current_state[0] : row.bin_current_state;
  const hasGpsFix = Boolean(state?.gps_fix && state?.latitude != null && state?.longitude != null);
  const latitude = hasGpsFix ? Number(state.latitude) : 0;
  const longitude = hasGpsFix ? Number(state.longitude) : 0;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category || 'general',
    capacityLiters: row.capacity_liters ?? undefined,
    location: {
      lat: latitude,
      lng: longitude,
      address: hasGpsFix ? (row.address || 'GPS verified location') : 'Awaiting GPS fix',
      city: row.city || 'Unknown',
      landmark: row.zone || undefined,
    },
    status: uiStatusFromDb(state),
    currentFillLevel: Math.round(Number(state?.fill_percentage ?? 0)),
    distanceCm: state?.distance_cm == null ? undefined : Number(state.distance_cm),
    rawDistanceCm: state?.raw_distance_cm == null ? (state?.distance_cm == null ? undefined : Number(state.distance_cm)) : Number(state.raw_distance_cm),
    hardwareFillStatus: state?.fill_status || state?.bin_status || 'UNKNOWN',
    lidState: state?.lid_state || 'CLOSED',
    batteryLevel: state?.battery_percentage ?? null,
    temperature: state?.temperature_c ?? null,
    wifiSignal: state?.wifi_rssi ?? null,
    wifiConnected: state?.connection_status === 'ONLINE',
    firmwareVersion: state?.firmware_version || undefined,
    lastUpdated: state?.updated_at || state?.telemetry_received_at || row.updated_at,
    gpsFix: hasGpsFix,
    gpsAccuracyM: state?.gps_accuracy_m ?? null,
    gpsSatellites: state?.satellites ?? null,
    gpsUpdatedAt: state?.gps_updated_at || undefined,
    telemetryMessageId: state?.message_id || undefined,
    telemetrySequence: state?.last_message_sequence ?? state?.message_sequence ?? undefined,
    assignedZone: row.zone || undefined,
    notes: state ? undefined : 'No telemetry received',
  } as SmartBin;
});

const mapAlertRows = (rows: any[]): AlertNotification[] => rows.map((row) => ({
  id: row.id,
  binId: row.bin_id,
  binCode: row.bins?.code || row.bin_code || 'UNKNOWN',
  binName: row.bins?.name || 'Unknown bin',
  type: row.alert_type === 'LOW_BATTERY' ? 'BATTERY_LOW' : row.alert_type === 'DEVICE_OFFLINE' ? 'OFFLINE' : 'OVERFLOW_95',
  severity: row.severity === 'CRITICAL' ? 'danger' : row.severity === 'INFO' ? 'info' : 'warning',
  message: row.message || row.alert_type || 'Alert',
  timestamp: row.created_at || new Date().toISOString(),
  read: row.status === 'RESOLVED' || row.status === 'CLOSED',
}));

const mapComplaintRows = (rows: any[]): CitizenReport[] => rows.map((row) => ({
  id: row.ticket_number || row.id,
  binId: row.bin_id || undefined,
  binName: row.bins?.name || undefined,
  locationText: row.bins?.address || row.location_text || 'No location recorded',
  issueType: row.problem_type || 'Issue',
  description: row.description || '',
  reportedBy: row.reporter_name || 'Unknown reporter',
  timestamp: row.created_at || new Date().toISOString(),
  status: row.status === 'RESOLVED' || row.status === 'CLOSED' ? 'Resolved' : row.status === 'ASSIGNED' ? 'Assigned' : 'Investigating',
  photoUrl: row.evidence_url || undefined,
}));

const mapCollectionRows = (rows: any[]): CollectionRecord[] => rows.map((row) => ({
  id: row.id,
  binId: row.bin_id,
  binCode: row.bins?.code || 'UNKNOWN',
  binName: row.bins?.name || 'Unknown bin',
  timestamp: row.collected_at || new Date().toISOString(),
  fillLevelBefore: Number(row.fill_level_before ?? 0),
  weightCollectedKg: Number(row.weight_collected_kg ?? 0),
  collectorName: row.collector_name || 'Unknown collector',
  zone: row.zone || row.bins?.zone || 'Unknown zone',
}));

const mapRouteRows = (rows: any[]): RouteStop[] => rows.map((row) => ({
  id: row.id,
  time: row.scheduled_time || '--:--',
  name: row.bins?.name || 'Unknown stop',
  type: row.stop_reason || 'Collection stop',
  status: row.status || 'PENDING',
  binCode: row.bins?.code || undefined,
}));

export const SmartBinProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dataMode = env.VITE_DATA_MODE as DataMode;
  const demoMode = dataMode === 'demo';
  const [bins, setBins] = useState<SmartBin[]>(() => demoMode ? getDemoValue<SmartBin[]>(LOCAL_STORAGE_BINS_KEY, []) : []);
  const [alerts, setAlerts] = useState<AlertNotification[]>(() => demoMode ? getDemoValue(LOCAL_STORAGE_ALERTS_KEY, DEMO_ALERTS) : []);
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>(() => demoMode ? getDemoValue(LOCAL_STORAGE_REPORTS_KEY, DEMO_REPORTS) : []);
  const [collections, setCollections] = useState<CollectionRecord[]>(() => demoMode ? getDemoValue(LOCAL_STORAGE_COLLECTIONS_KEY, DEMO_COLLECTIONS) : []);
  const [routeStops, setRouteStops] = useState<RouteStop[]>(demoMode ? DEMO_ROUTE_STOPS : []);
  const [dataStatus, setDataStatus] = useState<DataStatus>(demoMode ? 'ready' : 'idle');
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedBinId, setSelectedBinId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>('admin');
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [isSimulating, setIsSimulating] = useState<boolean>(demoMode);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastTelemetryTime, setLastTelemetryTime] = useState<string>(new Date(0).toISOString());

  const refreshLiveData = async () => {
    if (demoMode) {
      setDataStatus('ready');
      setDataError(null);
      return;
    }

    if (!isSupabaseConfigured()) {
      setBins([]);
      setAlerts([]);
      setCitizenReports([]);
      setCollections([]);
      setRouteStops([]);
      setDataStatus('not_configured');
      setDataError('Live data mode requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. No demo fallback was loaded.');
      return;
    }

    setDataStatus('loading');
    setDataError(null);

    const [binsResult, alertsResult, complaintsResult, collectionsResult, routesResult] = await Promise.all([
      supabase.from('bins').select('*, bin_current_state(*)').order('created_at', { ascending: true }),
      supabase.from('alerts').select('*, bins(code, name)').neq('status', 'RESOLVED').neq('status', 'CLOSED').order('created_at', { ascending: false }).limit(50),
      supabase.from('complaints').select('*, bins(code, name, address)').order('created_at', { ascending: false }).limit(50),
      supabase.from('collections').select('*, bins(code, name, zone)').order('collected_at', { ascending: false }).limit(50),
      supabase.from('route_stops').select('*, bins(code, name)').order('created_at', { ascending: true }).limit(100),
    ]);

    if (binsResult.error) {
      setDataStatus('error');
      setDataError(`Bins query failed: ${binsResult.error.message}`);
      return;
    }

    const mappedBins = mapBinRows(binsResult.data || []);
    setBins(mappedBins);
    if (!alertsResult.error) setAlerts(mapAlertRows(alertsResult.data || []));
    if (!complaintsResult.error) setCitizenReports(mapComplaintRows(complaintsResult.data || []));
    if (!collectionsResult.error) setCollections(mapCollectionRows(collectionsResult.data || []));
    if (!routesResult.error) setRouteStops(mapRouteRows(routesResult.data || []));

    setSelectedBinId((current) => current || mappedBins[0]?.id || null);
    setLastTelemetryTime(mappedBins.find((bin) => bin.lastUpdated)?.lastUpdated || new Date(0).toISOString());
    setDataStatus('ready');
    setDataError(null);
  };

  useEffect(() => {
    refreshLiveData();
  }, [dataMode]);

  useEffect(() => {
    if (!demoMode) return;
    localStorage.setItem(LOCAL_STORAGE_BINS_KEY, JSON.stringify(bins));
  }, [bins, demoMode]);

  useEffect(() => {
    if (!demoMode) return;
    localStorage.setItem(LOCAL_STORAGE_ALERTS_KEY, JSON.stringify(alerts));
  }, [alerts, demoMode]);

  useEffect(() => {
    if (!demoMode) return;
    localStorage.setItem(LOCAL_STORAGE_REPORTS_KEY, JSON.stringify(citizenReports));
  }, [citizenReports, demoMode]);

  useEffect(() => {
    if (!demoMode) return;
    localStorage.setItem(LOCAL_STORAGE_COLLECTIONS_KEY, JSON.stringify(collections));
  }, [collections, demoMode]);

  useEffect(() => {
    if (demoMode || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel('live-production-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bin_current_state' }, () => refreshLiveData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => refreshLiveData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => refreshLiveData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'route_stops' }, () => refreshLiveData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => refreshLiveData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [demoMode]);

  const ingestTelemetry = (payload: unknown) => {
    setLastTelemetryTime(new Date().toISOString());
    return IotIngestionService.processTelemetry(
      payload,
      bins,
      alerts,
      (updatedBin) => setBins((prev) => prev.map((b) => (b.code.toUpperCase() === updatedBin.code.toUpperCase() || b.id === updatedBin.id ? updatedBin : b))),
      (newAlert) => setAlerts((prev) => [newAlert, ...prev]),
      (resolvedAlertId) => setAlerts((prev) => prev.map((a) => (a.id === resolvedAlertId ? { ...a, read: true } : a)))
    );
  };

  const totalBinsCount = bins.length;
  const now = Date.now();
  const onlineBinsCount = bins.filter((b) => b.wifiConnected && b.status !== 'offline').length;
  const staleBinsCount = bins.filter((b) => b.lastUpdated && now - new Date(b.lastUpdated).getTime() > 15 * 60 * 1000).length;
  const criticalAlerts = alerts.filter((a) => !a.read && a.severity === 'danger').length;
  const fleetHealth = totalBinsCount === 0 ? 0 : Math.max(0, Math.round(((onlineBinsCount / totalBinsCount) * 100) - staleBinsCount * 5 - criticalAlerts * 5));
  const overflowCount = bins.filter((b) => b.hardwareFillStatus === 'OVERFLOW' || b.status === 'overflow').length;
  const offlineCount = bins.filter((b) => !b.wifiConnected || b.status === 'offline').length;
  const slaRiskCount = alerts.filter((a) => !a.read && (a.severity === 'danger' || a.severity === 'warning')).length + citizenReports.filter((r) => r.status !== 'Resolved' && r.status !== 'Closed').length;
  const routeLoad = routeStops.length === 0 ? 0 : Math.round((routeStops.filter((stop) => stop.status === 'COLLECTED').length / routeStops.length) * 100);

  const collectBin = async (binIdOrCode: string, collectorName: string = 'Collector') => {
    const targetBin = bins.find((b) => b.id === binIdOrCode || b.code.toUpperCase() === binIdOrCode.toUpperCase());
    if (!targetBin) return;

    if (!demoMode && isSupabaseConfigured()) {
      await supabase.from('collections').insert({
        bin_id: targetBin.id,
        fill_level_before: targetBin.currentFillLevel,
        weight_collected_kg: 0,
        collector_name: collectorName,
        zone: targetBin.assignedZone || 'Unknown',
      });
      await supabase.from('bin_current_state').update({ fill_percentage: 0, fill_status: 'NORMAL', bin_status: 'NORMAL', updated_at: new Date().toISOString() }).eq('bin_id', targetBin.id);
      await refreshLiveData();
      return;
    }

    const updated = { ...targetBin, currentFillLevel: 8, status: 'normal' as const, lastCollectedAt: new Date().toISOString(), totalCollectionsCount: (targetBin.totalCollectionsCount || 0) + 1 };
    setBins((prev) => prev.map((b) => (b.id === targetBin.id ? updated : b)));
  };

  const markRouteStopCollected = async (stopIndex: number) => {
    const stop = routeStops[stopIndex];
    if (!stop) return;
    if (!demoMode && isSupabaseConfigured() && stop.id) {
      await supabase.from('route_stops').update({ status: 'COLLECTED' }).eq('id', stop.id);
      await refreshLiveData();
      return;
    }
    setRouteStops((prev) => prev.map((item, i) => (i === stopIndex ? { ...item, status: 'COLLECTED' } : item)));
  };

  const submitCitizenReport = (reportData: { problemType?: string; locationText?: string; description: string; priority?: 'Standard' | 'Urgent'; evidenceUrl?: string; reporterName?: string; binId?: string; binName?: string; issueType?: string; reportedBy?: string; }): string => {
    const ticketNumber = `C-${Date.now()}`;
    const newReport: CitizenReport = {
      id: ticketNumber,
      binId: reportData.binId,
      binName: reportData.binName,
      locationText: reportData.locationText || 'Location not provided',
      issueType: reportData.problemType || reportData.issueType || 'Other',
      description: reportData.description,
      reportedBy: reportData.reporterName || reportData.reportedBy || 'Citizen Reporter',
      timestamp: new Date().toISOString(),
      status: 'Investigating',
      photoUrl: reportData.evidenceUrl,
    };

    setCitizenReports((prev) => [newReport, ...prev]);

    if (!demoMode && isSupabaseConfigured()) {
      supabase.from('complaints').insert({
        ticket_number: ticketNumber,
        bin_id: reportData.binId || null,
        problem_type: newReport.issueType,
        description: newReport.description,
        priority: reportData.priority || 'Standard',
        status: 'RECEIVED',
        evidence_url: reportData.evidenceUrl || null,
        reporter_name: newReport.reportedBy,
      }).then(() => refreshLiveData());
    }

    return ticketNumber;
  };

  const assignComplaint = async (ticketId: string) => {
    if (!demoMode && isSupabaseConfigured()) {
      await supabase.from('complaints').update({ status: 'ASSIGNED', updated_at: new Date().toISOString() }).eq('ticket_number', ticketId);
      await refreshLiveData();
      return;
    }
    setCitizenReports((prev) => prev.map((r) => (r.id === ticketId ? { ...r, status: 'Assigned' } : r)));
  };

  const resolveComplaint = async (ticketId: string) => {
    if (!demoMode && isSupabaseConfigured()) {
      await supabase.from('complaints').update({ status: 'RESOLVED', updated_at: new Date().toISOString() }).eq('ticket_number', ticketId);
      await refreshLiveData();
      return;
    }
    setCitizenReports((prev) => prev.map((r) => (r.id === ticketId ? { ...r, status: 'Resolved' } : r)));
  };

  const markAlertAsRead = async (alertId: string) => {
    if (!demoMode && isSupabaseConfigured()) {
      await supabase.from('alerts').update({ status: 'ACKNOWLEDGED', acknowledged_at: new Date().toISOString() }).eq('id', alertId);
      await refreshLiveData();
      return;
    }
    setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, read: true } : a)));
  };

  const toggleLid = () => undefined;
  const triggerProximitySensor = () => undefined;
  const updateBinTelemetry = (binId: string, updates: Partial<SmartBin>) => setBins((prev) => prev.map((b) => (b.id === binId ? { ...b, ...updates } : b)));
  const addBin = (newBin: Omit<SmartBin, 'id' | 'lastUpdated' | 'totalCollectionsCount'>) => {
    if (!demoMode) return;
    setBins((prev) => [...prev, { ...newBin, id: `bin-${Date.now()}`, lastUpdated: new Date().toISOString(), totalCollectionsCount: 0 }]);
  };
  const deleteBin = (binId: string) => demoMode && setBins((prev) => prev.filter((b) => b.id !== binId));
  const clearAlerts = () => demoMode && setAlerts([]);
  const collectAllFullBins = () => bins.forEach((b) => b.currentFillLevel >= 85 && collectBin(b.id, 'Rapid Response Fleet'));

  const selectedBin = useMemo(() => bins.find((b) => b.id === selectedBinId || b.code === selectedBinId) || bins[0] || null, [bins, selectedBinId]);

  return (
    <SmartBinContext.Provider value={{
      bins,
      selectedBin,
      selectedBinId,
      setSelectedBinId,
      role,
      setRole,
      alerts,
      collections,
      citizenReports,
      routeStops,
      lastTelemetryTime,
      activeView,
      setActiveView,
      isSimulating,
      setIsSimulating,
      soundEnabled,
      setSoundEnabled,
      dataMode,
      dataStatus,
      dataError,
      refreshLiveData,
      fleetHealth,
      overflowCount,
      offlineCount,
      slaRiskCount,
      routeLoad,
      ingestTelemetry,
      collectBin,
      submitCitizenReport,
      assignComplaint,
      resolveComplaint,
      markAlertAsRead,
      markRouteStopCollected,
      toggleLid,
      triggerProximitySensor,
      updateBinTelemetry,
      addBin,
      deleteBin,
      clearAlerts,
      collectAllFullBins,
    }}>
      {children}
    </SmartBinContext.Provider>
  );
};

export const useSmartBin = () => {
  const context = useContext(SmartBinContext);
  if (!context) throw new Error('useSmartBin must be used within a SmartBinProvider');
  return context;
};
