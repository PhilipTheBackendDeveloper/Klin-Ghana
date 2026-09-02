import React from 'react';
import { RefreshCw } from 'lucide-react';
import { SmartBin } from '../../types';
import { useSmartBin } from '../../context/SmartBinContext';

interface OperationsCommandCenterProps {
  onSelectBin: (bin: SmartBin) => void;
}

const formatPercent = (value: number) => `${value}%`;
const formatTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return 'No telemetry';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const OperationsCommandCenter: React.FC<OperationsCommandCenterProps> = ({ onSelectBin }) => {
  const {
    bins,
    selectedBin,
    setSelectedBinId,
    fleetHealth,
    overflowCount,
    offlineCount,
    slaRiskCount,
    routeLoad,
    citizenReports,
    alerts,
    routeStops,
    lastTelemetryTime,
    dataMode,
    dataStatus,
    dataError,
    refreshLiveData,
  } = useSmartBin();

  const targetBin = selectedBin;
  const mapBins = bins.slice(0, 4);
  const shownReports = citizenReports.filter((report) => report.status !== 'Resolved' && report.status !== 'Closed').slice(0, 3);
  const shownAlerts = alerts.filter((alert) => !alert.read).slice(0, 3);
  const collectedStops = routeStops.filter((stop) => stop.status === 'COLLECTED').length;

  const selectBin = (bin: SmartBin) => {
    setSelectedBinId(bin.id);
    onSelectBin(bin);
  };

  const kpis = [
    { label: 'FLEET HEALTH', value: `${fleetHealth.toFixed(1)}%`, x: 35, w: 235, dot: '#21e6a2' },
    { label: 'OVERFLOW', value: String(overflowCount), x: 301, w: 235, dot: '#ff4d74' },
    { label: 'OFFLINE', value: String(offlineCount), x: 566, w: 169, dot: '#6b86ff' },
    { label: 'SLA RISK', value: String(slaRiskCount), x: 751, w: 169, dot: '#ffb23e' },
    { label: 'ROUTE LOAD', value: `${routeLoad}%`, x: 938, w: 169, dot: '#18d8ff' },
  ];

  return (
    <section className="relative h-[903px] w-[1155px]" data-node-id="64:2" data-name="Operations Command Center">
      <h1 className="absolute left-[43px] top-0 w-[440px] text-[30px] font-bold leading-[1.18] text-[#0b1f1a]">Operations Command Center</h1>
      <p className="absolute left-[45px] top-[42px] w-[620px] text-[12px] font-medium leading-[1.18] text-[#0b1f1a]/70">
        Accra East smart-bin fleet, complaint pressure and collection readiness
      </p>

      <button type="button" onClick={refreshLiveData} className="figma-button-hit absolute left-[783px] top-[13px] h-[23px] w-[110px] rounded-[13px] border border-[#21e6a2]">
        <span className="absolute left-[10px] top-[8px] h-[7px] w-[8px] rounded-full bg-[#21e6a2]" />
        <span className="absolute left-[24px] top-[5px] text-[10px] font-bold leading-[1.18] text-[#21e6a2]">{dataMode === 'demo' ? 'Demo data' : dataStatus}</span>
      </button>
      <div className="absolute left-[905px] top-[13px] h-[23px] w-[98px] rounded-[13px] border border-[#18d8ff]">
        <span className="absolute left-[10px] top-[8px] h-[7px] w-[8px] rounded-full bg-[#18d8ff]" />
        <span className="absolute left-[24px] top-[5px] text-[10px] font-bold leading-[1.18] text-[#18d8ff]">{bins.some((bin) => bin.gpsFix) ? 'GPS sync' : 'No GPS'}</span>
      </div>
      <div className="absolute left-[1015px] top-[13px] h-[23px] w-[108px] rounded-[13px] border border-[#8daac0]">
        <span className="absolute left-[10px] top-[8px] h-[7px] w-[8px] rounded-full bg-[#8daac0]" />
        <span className="absolute left-[24px] top-[5px] text-[10px] font-bold leading-[1.18] text-[#8daac0]">{formatTime(lastTelemetryTime)}</span>
      </div>

      {dataMode === 'live' && dataStatus !== 'ready' && (
        <div className="absolute left-[37px] top-[74px] z-10 w-[1086px] rounded-[12px] border border-blue-100 bg-blue-50 px-4 py-2 text-[11px] font-semibold text-blue-800">
          {dataError || `Live data status: ${dataStatus}`}
        </div>
      )}

      {kpis.map((kpi) => (
        <button
          type="button"
          key={kpi.label}
          onClick={() => {
            if (kpi.label === 'OVERFLOW') window.location.hash = '/admin/alerts';
            if (kpi.label === 'OFFLINE') window.location.hash = '/admin/bins';
            if (kpi.label === 'SLA RISK') window.location.hash = '/admin/complaints';
            if (kpi.label === 'ROUTE LOAD') window.location.hash = '/admin/routes';
          }}
          className="figma-button-hit absolute top-[102px] h-[123px] overflow-hidden rounded-[15px] bg-white text-left"
          style={{ left: kpi.x, width: kpi.w }}
        >
          <span className="absolute left-[21px] top-[18px] text-[9px] font-bold leading-[1.18] text-[#587187]">{kpi.label}</span>
          <span className="absolute left-[21px] top-[47px] text-[26px] font-bold leading-[1.18] text-black">{kpi.value}</span>
          <span className="absolute right-[21px] top-[20px] h-[9px] w-[9px] rounded-full" style={{ background: kpi.dot }} />
        </button>
      ))}

      <div className="absolute left-[37px] top-[306px] h-[390px] w-[729px] overflow-hidden bg-white">
        <h2 className="absolute left-[33px] top-[23px] w-[220px] text-[18px] font-bold leading-[1.18] text-[#3b82f6]">Accra East Bin Mesh</h2>
        <p className="absolute left-[33px] top-[49px] w-[360px] text-[11px] font-medium leading-[1.18] text-[#8daac0]">
          Live asset positions and sensor event overlay
        </p>
        <button type="button" className="figma-button-hit absolute left-[551px] top-[23px] h-[26px] w-[150px] rounded-[13px] border border-[#8ca19a] bg-[#047857]">
          <span className="absolute left-[14px] top-[10px] h-[8px] w-[8px] rounded-full bg-white" />
          <span className="absolute left-[28px] top-[7px] text-[10px] font-bold leading-[1.18] text-white">Map layer: Dustbins</span>
        </button>
        <img alt="Accra East street map" src="/figma-assets/operations-map.jpeg" className="absolute left-[48px] top-[89px] h-[272px] w-[631px] object-cover opacity-70" />

        {mapBins.filter((b) => b.gpsFix && b.location.lat !== 0 && b.location.lng !== 0).length === 0 && (
          <div className="absolute left-[118px] top-[184px] w-[492px] rounded-[15px] border border-dashed border-[#8daac0] bg-white/95 p-5 text-center text-[12px] text-[#587187]">
            <div className="text-[16px] font-bold text-[#0b1f1a]">
              {bins.length === 0 ? 'No live bins registered' : 'Awaiting GPS fix'}
            </div>
            <p className="mt-1">
              {bins.length === 0
                ? 'Supabase returned zero bins.'
                : 'Physical bin SB-024 is registered. Live map marker will appear once the GPS receiver acquires satellite fix.'}
            </p>
          </div>
        )}

        {mapBins.filter((b) => b.gpsFix && b.location.lat !== 0 && b.location.lng !== 0).map((bin, index) => {
          const positions = [
            { x: 91, y: 133, color: '#ff4d74' },
            { x: 317, y: 225, color: '#ffb23e' },
            { x: 86, y: 274, color: '#18d8ff' },
            { x: 450, y: 118, color: '#21e6a2' },
          ][index] || { x: 91, y: 133, color: '#21e6a2' };
          return (
            <button key={bin.id} type="button" onClick={() => selectBin(bin)} className="figma-button-hit absolute h-[78px] w-[160px] text-left" style={{ left: positions.x, top: positions.y }}>
              <span className="absolute left-0 top-0 h-[78px] w-[77px] rounded-full opacity-30" style={{ background: positions.color }} />
              <span className="absolute left-[9px] top-[11px] flex h-[53px] w-[53px] items-center justify-center rounded-[12px] text-[24px] font-black text-white" style={{ background: positions.color }}>K</span>
              <span className="absolute left-[36px] top-[24px] h-[35px] w-[129px] rounded-[15px] bg-[#ff4d74]/40" />
              <span className="absolute left-[59px] top-[29px] w-[84px] text-[12px] font-bold leading-[1.18] text-white">{bin.code}</span>
              <span className="absolute left-[53px] top-[43px] w-[160px] text-[10px] font-medium leading-[1.18] text-[#52675f]">{bin.name} - {formatPercent(bin.currentFillLevel)}</span>
            </button>
          );
        })}
      </div>

      <div className="absolute left-[810px] top-[302px] h-[214px] w-[345px] overflow-hidden rounded-[15px] bg-white text-left">
        {targetBin ? (
          <button type="button" onClick={() => selectBin(targetBin)} className="figma-button-hit h-full w-full text-left">
            <span className="absolute left-[10px] top-[24px] text-[10px] font-bold leading-[1.18] text-[#587187]">Selected Asset</span>
            <span className="absolute left-[10px] top-[42px] w-[220px] text-[18px] font-bold leading-[1.18] text-[#3b82f6]">{targetBin.code} - {targetBin.name}</span>
            <span className="absolute left-[232px] top-[42px] h-[26px] w-[104px] rounded-[13px] border border-[#ff4d74]" />
            <span className="absolute left-[249px] top-[52px] h-[8px] w-[8px] rounded-full bg-[#ff4d74]" />
            <span className="absolute left-[263px] top-[49px] text-[10px] font-bold leading-[1.18] text-[#ff4d74]">{targetBin.status}</span>
            {[
              ['Fill level', `${targetBin.currentFillLevel}%`, '#ff4d74', 4, 96],
              ['Battery', targetBin.batteryLevel == null ? 'N/A' : `${targetBin.batteryLevel}%`, '#21e6a2', 162, 96],
              ['RSSI', targetBin.wifiSignal == null ? 'N/A' : `${targetBin.wifiSignal} dBm`, '#35101c', 4, 158],
              ['GPS', targetBin.gpsFix ? 'Fix' : 'No fix', '#21e6a2', 162, 158],
            ].map(([label, value, color, x, y]) => (
              <span key={label} className="absolute h-[44px] w-[140px] rounded-[8px] border border-[#d8e4e0] bg-[#eef4f2]" style={{ left: Number(x), top: Number(y) }}>
                <span className="absolute left-[12px] top-[9px] text-[9px] font-bold leading-[1.18] text-[#587187]">{label}</span>
                <span className="absolute left-[12px] top-[24px] text-[12px] font-bold leading-[1.18]" style={{ color: String(color) }}>{value}</span>
              </span>
            ))}
          </button>
        ) : (
          <div className="p-6 text-sm text-[#587187]">
            <div className="text-[10px] font-bold uppercase">Selected Asset</div>
            <div className="mt-4 text-[18px] font-bold text-[#0b1f1a]">No asset selected</div>
            <p className="mt-2 text-[12px]">Live mode has no bins to inspect yet.</p>
          </div>
        )}
      </div>

      <div className="absolute left-[810px] top-[531px] h-[201px] w-[345px] overflow-hidden rounded-[15px] bg-white">
        <h2 className="absolute left-[19px] top-[4px] text-[18px] font-bold leading-[1.18] text-[#3b82f6]">Incident Queue</h2>
        {shownAlerts.length === 0 && <span className="absolute left-[19px] top-[62px] w-[300px] text-[12px] text-[#8daac0]">No unresolved live alerts.</span>}
        {shownAlerts.map((alert, index) => (
          <button key={alert.id} type="button" onClick={() => { window.location.hash = '/admin/alerts'; }} className="figma-button-hit absolute left-[19px] h-[40px] w-[316px] rounded-[8px] bg-[#eef4f2] text-left" style={{ top: 42 + index * 52 }}>
            <span className="absolute left-[14px] top-[11px] text-[10px] font-bold leading-[1.18] text-[#ff4d74]">{alert.severity === 'danger' ? 'P1' : 'P2'}</span>
            <span className="absolute left-[48px] top-[7px] w-[220px] text-[11px] font-bold leading-[1.18] text-[#52675f]">{alert.message.slice(0, 34)}</span>
            <span className="absolute left-[48px] top-[22px] w-[130px] text-[9px] font-medium leading-[1.18] text-[#8daac0]">{alert.binCode} - {formatTime(alert.timestamp)}</span>
          </button>
        ))}
      </div>

      <button type="button" onClick={() => { window.location.hash = '/admin/routes'; }} className="figma-button-hit absolute left-[810px] top-[755px] h-[148px] w-[345px] overflow-hidden rounded-[15px] bg-white text-left">
        <h2 className="absolute left-[38px] top-[5px] text-[16px] font-bold leading-[1.18] text-[#3b82f6]">Collection Route</h2>
        <span className="absolute left-[38px] top-[39px] h-[6px] rounded-[3px] bg-[#21e6a2]" style={{ width: `${Math.max(4, Math.min(237, routeLoad * 2.37))}px` }} />
        <span className="absolute left-[38px] top-[61px] w-[270px] text-[10px] font-medium leading-[1.18] text-[#8daac0]">{routeStops.length === 0 ? 'No active route stops' : `${collectedStops}/${routeStops.length} stops collected`}</span>
      </button>

      <div className="absolute left-[37px] top-[736px] h-[157px] w-[729px] overflow-hidden rounded-[10px] bg-white">
        {['TICKET', 'LOCATION', 'ISSUE', 'STATUS', 'REPORTER'].map((head, index) => (
          <span key={head} className="absolute top-[7px] text-[8px] font-bold leading-[1.18] text-black/30" style={{ left: [34, 136, 294, 430, 570][index] }}>{head}</span>
        ))}
        <span className="absolute left-[32px] top-[33px] h-px w-[666px] bg-black/5" />
        {shownReports.length === 0 && <span className="absolute left-[34px] top-[58px] text-[12px] text-[#8daac0]">No unresolved citizen complaints.</span>}
        {shownReports.map((report, index) => (
          <button key={report.id} type="button" onClick={() => { window.location.hash = '/admin/complaints'; }} className="figma-button-hit absolute left-0 h-[37px] w-[729px] text-left" style={{ top: 45 + index * 42 }}>
            <span className="absolute left-[34px] top-0 w-[76px] text-[11px] font-bold leading-[1.18] text-[#3b82f6]">#{report.id}</span>
            <span className="absolute left-[136px] top-0 w-[140px] text-[11px] font-medium leading-[1.18] text-[#3b82f6]">{report.binName || report.locationText}</span>
            <span className="absolute left-[294px] top-0 w-[92px] text-[11px] font-medium leading-[1.18] text-[#3b82f6]">{report.issueType}</span>
            <span className="absolute left-[430px] top-0 w-[90px] text-[11px] font-bold leading-[1.18] text-[#ff4d74]">{report.status}</span>
            <span className="absolute left-[570px] top-0 w-[110px] text-[11px] font-medium leading-[1.18] text-[#3b82f6]">{report.reportedBy}</span>
          </button>
        ))}
      </div>
    </section>
  );
};
