import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import {
  Server, Cpu, Database, Activity, HardDrive, ShieldCheck, AlertTriangle, RefreshCw, Layers,
  CheckCircle2, XCircle, Clock, Flame, Zap, Radio, ArrowRight, Shield, Terminal, Globe, Link2, Check, Monitor, Plus,
  Trash2, Edit3, Key, Wifi, WifiOff, Eye, EyeOff, Power, Play, Lock, AlertCircle
} from 'lucide-react';
import { SSHNode, NodeTelemetry, ClusterSummary, ActivityLog, PrimaryDatabase, StandbyDatabase, FarSyncInstance, UserAccount, AuthType, OsType, ShellType } from '../types';
import { getApiUrl, apiFetch, safeFetchJson } from '../lib/api';

interface DashboardViewProps {
  nodes: SSHNode[];
  telemetry: Record<string, NodeTelemetry>;
  summary: ClusterSummary;
  alerts: string[];
  logs: ActivityLog[];
  primaryDbs?: PrimaryDatabase[];
  standbyDbs?: StandbyDatabase[];
  farSyncInstances?: FarSyncInstance[];
  currentUser?: UserAccount;
  onSelectNode: (nodeId: string) => void;
  onRefresh: () => void;
  isConnecting: boolean;
  onOpenDockerModal?: () => void;
  onNavigateMenu?: (menuId: string) => void;
  onAddNode?: (node: Omit<SSHNode, 'id'>) => Promise<any>;
  onEditNode?: (id: string, node: Partial<SSHNode>) => Promise<any>;
  onDeleteNode?: (id: string) => Promise<any>;
  onExecuteAction?: (nodeId: string, category: string, action: string, payload?: any) => Promise<any>;
}

export default function DashboardView({
  nodes,
  telemetry,
  summary,
  alerts,
  logs,
  primaryDbs = [],
  standbyDbs = [],
  farSyncInstances = [],
  currentUser,
  onSelectNode,
  onRefresh,
  isConnecting,
  onOpenDockerModal,
  onNavigateMenu,
  onAddNode,
  onEditNode,
  onDeleteNode,
  onExecuteAction
}: DashboardViewProps) {
  const [chartMetric, setChartMetric] = useState<'cpu_mem' | 'perf_iops'>('cpu_mem');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStatusMsg, setSimStatusMsg] = useState<string | null>(null);

  // Custom WebLogic and PACS servers from portal / API
  const [customWeblogic, setCustomWeblogic] = useState<any[]>([]);
  const [customPacs, setCustomPacs] = useState<any[]>([]);





  useEffect(() => {
    let isMounted = true;
    const loadServices = async () => {
      const wls = await safeFetchJson<any[]>('/api/weblogic-servers', undefined, []);
      const pacs = await safeFetchJson<any[]>('/api/pacs-servers', undefined, []);
      if (isMounted) {
        setCustomWeblogic(wls || []);
        setCustomPacs(pacs || []);
      }
    };
    loadServices();
    return () => { isMounted = false; };
  }, [nodes]);

  // Classify nodes by OS Platform
  const isWindowsNode = (n: SSHNode) => Boolean(n.osType === 'Windows' || n.shellType === 'powershell');
  const isAixNode = (n: SSHNode) => Boolean(n.osType === 'AIX');
  const isSolarisNode = (n: SSHNode) => Boolean(n.osType === 'Solaris');
  const isLinuxNode = (n: SSHNode) => !isWindowsNode(n) && !isAixNode(n) && !isSolarisNode(n);

  const linuxNodes = nodes.filter(isLinuxNode);
  const windowsNodes = nodes.filter(isWindowsNode);
  const aixNodes = nodes.filter(isAixNode);
  const solarisNodes = nodes.filter(isSolarisNode);

  // Registered Databases classification (from actual configured primaryDbs and standbyDbs)
  const registeredRacDbs = (primaryDbs || []).filter(db =>
    db.dbType === 'RAC' || db.dbType === 'WINDOWS_RAC' || (db.nodeIds && db.nodeIds.length > 1) || (db.instances && db.instances.length > 1)
  );

  const registeredSingleDbs = (primaryDbs || []).filter(db =>
    db.dbType === 'SINGLE_INSTANCE' || db.dbType === 'WINDOWS_SINGLE' || (!db.dbType && (!db.nodeIds || db.nodeIds.length <= 1) && (!db.instances || db.instances.length <= 1))
  );

  const registeredWindowsDbs = (primaryDbs || []).filter(db =>
    db.dbType === 'WINDOWS_RAC' || db.dbType === 'WINDOWS_SINGLE' || db.osType === 'Windows'
  );

  const registeredStandbyDbs = standbyDbs || [];

  // Helper to find which configured database a server host node is mapped to
  const getNodeDbAssignment = (nodeId: string) => {
    for (const db of registeredRacDbs) {
      if (db.nodeIds?.includes(nodeId) || db.instances?.some((inst: any) => inst.nodeId === nodeId)) {
        const instIndex = db.nodeIds ? db.nodeIds.indexOf(nodeId) + 1 : (db.instances?.findIndex((inst: any) => inst.nodeId === nodeId) + 1 || 1);
        return {
          assigned: true,
          type: 'RAC',
          dbName: db.name,
          role: `RAC Inst ${instIndex} (${db.name})`,
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        };
      }
    }
    for (const db of registeredSingleDbs) {
      if (db.nodeIds?.includes(nodeId) || (db as any).nodeId === nodeId) {
        return {
          assigned: true,
          type: 'SINGLE',
          dbName: db.name,
          role: `Single DB (${db.name})`,
          badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
        };
      }
    }
    for (const stby of registeredStandbyDbs) {
      if (stby.nodeId === nodeId) {
        return {
          assigned: true,
          type: 'STANDBY',
          dbName: stby.name,
          role: `Standby DR (${stby.name})`,
          badgeClass: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'
        };
      }
    }
    return {
      assigned: false,
      type: 'AVAILABLE',
      dbName: '',
      role: 'Available Host (Ready for DB Setup)',
      badgeClass: 'bg-slate-800/80 text-slate-400 border-slate-700'
    };
  };

  // Legacy compatibility references
  const racNodes = nodes.filter(n => n.nodeType === 'RAC' || (n as any).isRac || getNodeDbAssignment(n.id).type === 'RAC');
  const singleNodes = nodes.filter(n => !isWindowsNode(n) && (n.nodeType === 'SINGLE' || getNodeDbAssignment(n.id).type === 'SINGLE' || (!n.nodeType && !(n as any).isRac)));
  const activeRacNodes = racNodes.filter(n => telemetry[n.id]?.online !== false);
  const racTotalCount = racNodes.length;
  const racRunningCount = activeRacNodes.length;

  // Auto-detect WebLogic and PACS from nodes
  const nodeWeblogicList = nodes
    .filter(n => Boolean((n as any).hasWebLogic) || Boolean((n as any).installedApps?.some((a: any) => a.category === 'WEBLOGIC')))
    .map(n => ({
      id: `node-wls-${n.id}`,
      name: `${n.name} (WebLogic Host)`,
      hostIp: n.ipAddress,
      hostname: n.hostname || n.name,
      domainName: 'base_domain_prod',
      adminPort: 7001,
      status: telemetry[n.id]?.online === false ? 'STOPPED' : 'RUNNING',
      isNode: true,
      nodeId: n.id
    }));

  const combinedWebLogic = [
    ...customWeblogic,
    ...nodeWeblogicList.filter(nw => !customWeblogic.some(cw => cw.hostIp === nw.hostIp))
  ];

  const nodePacsList = nodes
    .filter(n => Boolean((n as any).hasPacs) || Boolean((n as any).installedApps?.some((a: any) => a.category === 'PACS_DICOM')))
    .map(n => ({
      id: `node-pacs-${n.id}`,
      name: `${n.name} (PACS Host)`,
      hostIp: n.ipAddress,
      hostname: n.hostname || n.name,
      aeTitle: 'PACS_ARCHIVE_MAIN',
      dicomPort: 104,
      status: telemetry[n.id]?.online === false ? 'STOPPED' : 'RUNNING',
      isNode: true,
      nodeId: n.id
    }));

  const combinedPacs = [
    ...customPacs,
    ...nodePacsList.filter(np => !customPacs.some(cp => cp.hostIp === np.hostIp))
  ];

  // Dynamic infrastructure service detection based on actual connected servers/databases
  const detectedBadges: { id: string; label: string; colorClass: string; borderClass: string }[] = [];

  // 1. Oracle RAC Database check (configured RAC DBs)
  const hasRac = registeredRacDbs.length > 0;
  if (hasRac) {
    const racDb = registeredRacDbs[0];
    const versionStr = racDb?.version ? ` ${racDb.version}` : ' 19c';
    detectedBadges.push({
      id: 'rac',
      label: `Oracle RAC${versionStr} (${registeredRacDbs.length} Cluster${registeredRacDbs.length !== 1 ? 's' : ''})`,
      colorClass: 'text-emerald-400',
      borderClass: 'border-emerald-500/60'
    });
  }

  // 2. Single Instance Database check
  const hasSingleInstance = primaryDbs.some(db => db.dbType === 'SINGLE_INSTANCE') || singleNodes.length > 0;
  if (hasSingleInstance) {
    const singleDb = primaryDbs.find(db => db.dbType === 'SINGLE_INSTANCE');
    const versionStr = singleDb?.version ? ` ${singleDb.version}` : ' 19c';
    detectedBadges.push({
      id: 'single_instance',
      label: `Single Instance DB${versionStr} (${singleNodes.length} Hosts)`,
      colorClass: 'text-cyan-300',
      borderClass: 'border-cyan-500/60'
    });
  }

  // 3. Windows Server Nodes check
  if (windowsNodes.length > 0) {
    detectedBadges.push({
      id: 'windows',
      label: `Windows Server (${windowsNodes.length} Hosts)`,
      colorClass: 'text-sky-300',
      borderClass: 'border-sky-500/60'
    });
  }

  // 4. Other Database Engines (PostgreSQL, MySQL, SQL Server, etc.)
  primaryDbs.forEach(db => {
    if (db.dbType && db.dbType !== 'RAC' && db.dbType !== 'SINGLE_INSTANCE') {
      detectedBadges.push({
        id: `db-${db.id}`,
        label: `${db.dbType} ${db.version || ''}`.trim(),
        colorClass: 'text-blue-300',
        borderClass: 'border-blue-500/60'
      });
    }
  });

  // 5. PACS DICOM Services check
  const hasPacs = combinedPacs.length > 0 || nodes.some(n =>
    Boolean((n as any).hasPacs) ||
    Boolean((n as any).installedApps?.some((a: any) => a.category === 'PACS_DICOM'))
  );
  if (hasPacs) {
    detectedBadges.push({
      id: 'pacs',
      label: `PACS DICOM Engine (${combinedPacs.length})`,
      colorClass: 'text-purple-300',
      borderClass: 'border-purple-500/60'
    });
  }

  // 6. WebLogic Services check
  const hasWebLogic = combinedWebLogic.length > 0 || nodes.some(n =>
    Boolean((n as any).hasWebLogic) ||
    Boolean((n as any).installedApps?.some((a: any) => a.category === 'WEBLOGIC'))
  );
  if (hasWebLogic) {
    detectedBadges.push({
      id: 'weblogic',
      label: `WebLogic Enterprise (${combinedWebLogic.length})`,
      colorClass: 'text-indigo-300',
      borderClass: 'border-indigo-500/60'
    });
  }

  // 7. Tomcat Services check
  const hasTomcat = nodes.some(n =>
    Boolean((n as any).hasTomcat) ||
    Boolean((n as any).installedApps?.some((a: any) => a.category === 'TOMCAT'))
  );
  if (hasTomcat) {
    detectedBadges.push({
      id: 'tomcat',
      label: 'Tomcat Services',
      colorClass: 'text-amber-300',
      borderClass: 'border-amber-500/60'
    });
  }

  const handleTriggerDisaster = async (scenario: string, name: string) => {
    setIsSimulating(true);
    setSimStatusMsg(`Injecting ${name}...`);
    try {
      const res = await apiFetch('/api/disaster/trigger', {
        method: 'POST',
        body: JSON.stringify({ scenario })
      });
      if (res.ok) {
        setSimStatusMsg(`Applied: ${name}`);
        setTimeout(() => setSimStatusMsg(null), 3000);
      } else {
        setSimStatusMsg(`Failed to inject scenario`);
        setTimeout(() => setSimStatusMsg(null), 3000);
      }
    } catch (e) {
      console.error("Disaster simulator error", e);
      setSimStatusMsg(`Network error occurred`);
      setTimeout(() => setSimStatusMsg(null), 3000);
    } finally {
      setIsSimulating(false);
    }
  };

  // Aggregated charts data from all active nodes
  const getAggregatedChartData = () => {
    const activeNodes = Object.values(telemetry).filter(t => t.online && t.performanceHistory && t.performanceHistory.length > 0);
    if (activeNodes.length === 0) return [];

    const firstNodeHist = activeNodes[0].performanceHistory;
    return firstNodeHist.map((point, index) => {
      let totalCpu = 0;
      let totalMem = 0;
      let totalIops = 0;
      let totalSessions = 0;

      activeNodes.forEach(node => {
        const p = node.performanceHistory[index];
        if (p) {
          totalCpu += p.cpu;
          totalMem += p.memory;
          totalIops += p.iops;
          totalSessions += p.sessions;
        }
      });

      return {
        time: point.time,
        CpuAverage: Math.round(totalCpu / activeNodes.length),
        MemoryAverage: Math.round(totalMem / activeNodes.length),
        TotalIOPS: totalIops,
        TotalSessions: totalSessions
      };
    });
  };

  const aggregatedData = getAggregatedChartData();

  return (
    <div className="space-y-6 animate-fade-in" id="dashboard-root">
      {/* Top Banner Control */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-r from-[#0c0d28] via-[#12143b] to-[#1c0d38] p-6 rounded-2xl border border-indigo-500/30 shadow-2xl gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-600/30 text-cyan-300 rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/10 shrink-0 flex items-center justify-center">
              <Activity className="w-6 h-6 text-cyan-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 shadow-md shadow-emerald-500/50"></span>
                </span>
                <h1 className="text-2xl font-display font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-transparent">
                  Master Dashboard — Infrastructure &amp; Database Command Center
                </h1>
              </div>
              <p className="text-slate-200 text-xs mt-1.5 font-sans flex flex-wrap items-center gap-2">
                <span className="text-slate-300">Master Enterprise Ecosystem Health:</span>
                {detectedBadges.length > 0 ? (
                  detectedBadges.map(badge => (
                    <span key={badge.id} className={`${badge.colorClass} font-bold px-2.5 py-0.5 rounded-lg bg-slate-950/90 border ${badge.borderClass} shadow-inner`}>
                      {badge.label}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 font-mono text-[11px] px-2.5 py-0.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    All Services Ready • Connect Nodes / DBs to Stream Live Telemetry
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto relative z-10">
          <button
            onClick={onRefresh}
            disabled={isConnecting}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-[#091124] hover:bg-[#121c38] text-white rounded-xl border border-indigo-500/40 text-xs font-bold font-mono transition-all cursor-pointer shadow-md disabled:opacity-50"
            id="dashboard-refresh-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isConnecting ? 'animate-spin' : ''}`} />
            {isConnecting ? 'Refreshing...' : 'Refresh Status'}
          </button>

          {onOpenDockerModal && (
            <button
              onClick={onOpenDockerModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 active:scale-95 text-white rounded-xl border border-cyan-400/50 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
              id="open-docker-modal-btn"
            >
              <Terminal className="w-4 h-4 text-cyan-200" />
              🐳 Docker Deployment Center
            </button>
          )}
          <button
            onClick={onRefresh}
            disabled={isConnecting}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-700/80 to-indigo-900/80 hover:from-blue-600 hover:to-indigo-800 active:scale-95 text-white rounded-xl border border-blue-400/40 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-blue-500/20 disabled:opacity-50"
            id="manual-refresh-btn"
          >
            <RefreshCw className={`w-4 h-4 ${isConnecting ? 'animate-spin text-cyan-400' : 'text-emerald-400'}`} />
            Sync All Telemetry
          </button>
        </div>
      </div>

      {/* LIVE INFOGRAPHIC APPLICATION & SECURITY STATUS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div
          onClick={() => onNavigateMenu?.('pacs-medical')}
          className={`p-3 rounded-xl flex items-center justify-between gap-2 shadow-lg border transition-all cursor-pointer hover:scale-[1.02] ${
            hasPacs ? 'bg-[#0f142e] border-purple-500/60 hover:border-purple-400' : 'bg-[#0b0e20] border-purple-500/30 hover:border-purple-500/70'
          }`}
          title="Click to view PACS Medical Status"
        >
          <div className="flex items-center gap-2.5 truncate">
            <HardDrive className={`w-4 h-4 shrink-0 ${hasPacs ? 'text-purple-400' : 'text-purple-300/70'}`} />
            <div className="truncate">
              <span className="text-[10px] text-slate-200 uppercase font-black block tracking-wider">PACS DICOM</span>
              <span className={hasPacs ? 'text-purple-300 font-extrabold' : 'text-slate-300 font-bold'}>
                {hasPacs ? '104 / ONLINE' : 'NOT CONFIGURED'}
              </span>
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigateMenu?.('weblogic-enterprise')}
          className={`p-3 rounded-xl flex items-center justify-between gap-2 shadow-lg border transition-all cursor-pointer hover:scale-[1.02] ${
            hasWebLogic ? 'bg-[#0f142e] border-indigo-500/60 hover:border-indigo-400' : 'bg-[#0b0e20] border-indigo-500/30 hover:border-indigo-500/70'
          }`}
          title="Click to view WebLogic Enterprise Status"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Server className={`w-4 h-4 shrink-0 ${hasWebLogic ? 'text-indigo-400' : 'text-indigo-300/70'}`} />
            <div className="truncate">
              <span className="text-[10px] text-slate-200 uppercase font-black block tracking-wider">WebLogic Enterprise</span>
              <span className={hasWebLogic ? 'text-indigo-300 font-extrabold' : 'text-slate-300 font-bold'}>
                {hasWebLogic ? '7001 / RUNNING' : 'NOT CONFIGURED'}
              </span>
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigateMenu?.('apps-manager')}
          className={`p-3 rounded-xl flex items-center justify-between gap-2 shadow-lg border transition-all cursor-pointer hover:scale-[1.02] ${
            hasTomcat ? 'bg-[#0f142e] border-amber-500/60 hover:border-amber-400' : 'bg-[#0b0e20] border-amber-500/30 hover:border-amber-500/70'
          }`}
          title="Click to view Application Servers Status"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Cpu className={`w-4 h-4 shrink-0 ${hasTomcat ? 'text-amber-400' : 'text-amber-300/70'}`} />
            <div className="truncate">
              <span className="text-[10px] text-slate-200 uppercase font-black block tracking-wider">Tomcat 9 Apps</span>
              <span className={hasTomcat ? 'text-amber-300 font-extrabold' : 'text-slate-300 font-bold'}>
                {hasTomcat ? '8080 / ACTIVE' : 'NOT CONFIGURED'}
              </span>
            </div>
          </div>
        </div>

        <div className={`p-3 rounded-xl flex items-center gap-2.5 shadow-lg border ${
          windowsNodes.length > 0 ? 'bg-[#0f142e] border-sky-500/60' : 'bg-[#0b0e20] border-slate-700/80'
        }`}>
          <ShieldCheck className={`w-4 h-4 shrink-0 ${windowsNodes.length > 0 ? 'text-sky-400' : 'text-sky-300/70'}`} />
          <div className="truncate">
            <span className="text-[10px] text-slate-200 uppercase font-black block tracking-wider">Win Anti-Ransomware</span>
            <span className={windowsNodes.length > 0 ? 'text-sky-300 font-extrabold' : 'text-sky-200/90 font-bold'}>
              {windowsNodes.length > 0 ? `ARMED (${windowsNodes.length})` : 'NO WIN HOSTS'}
            </span>
          </div>
        </div>

        <div className={`p-3 rounded-xl flex items-center gap-2.5 shadow-lg border ${
          (nodes.length - windowsNodes.length) > 0 ? 'bg-[#0f142e] border-blue-500/60' : 'bg-[#0b0e20] border-slate-700/80'
        }`}>
          <Shield className={`w-4 h-4 shrink-0 ${(nodes.length - windowsNodes.length) > 0 ? 'text-blue-400' : 'text-cyan-300/70'}`} />
          <div className="truncate">
            <span className="text-[10px] text-slate-200 uppercase font-black block tracking-wider">Linux SELinux</span>
            <span className={(nodes.length - windowsNodes.length) > 0 ? 'text-emerald-300 font-extrabold' : 'text-slate-300 font-bold'}>
              {(nodes.length - windowsNodes.length) > 0 ? 'ENFORCING' : 'NO LINUX HOSTS'}
            </span>
          </div>
        </div>

        <div className={`p-3 rounded-xl flex items-center gap-2.5 shadow-lg border ${
          standbyDbs.length > 0 ? 'bg-[#0f142e] border-emerald-500/60' : 'bg-[#0b0e20] border-slate-700/80'
        }`}>
          <Database className={`w-4 h-4 shrink-0 ${standbyDbs.length > 0 ? 'text-emerald-400' : 'text-emerald-300/70'}`} />
          <div className="truncate">
            <span className="text-[10px] text-slate-200 uppercase font-black block tracking-wider">DataGuard Lag</span>
            <span className={standbyDbs.length > 0 ? 'text-emerald-300 font-extrabold' : 'text-slate-300 font-bold'}>
              {standbyDbs.length > 0 ? '0.0s SYNC' : 'NO STANDBY'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Architecture KPI Grid (5 Distinct Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4" id="kpi-grid">
        {/* 1. Oracle RAC Cluster KPI Card */}
        <div className="bg-[#091124] p-4 lg:p-5 rounded-2xl border-2 border-emerald-500 flex items-start gap-3.5 shadow-xl shadow-emerald-500/20 hover:border-emerald-400 transition-all">
          <div className="p-3 rounded-xl bg-emerald-500/30 text-emerald-300 border-2 border-emerald-400/80 shadow-md shrink-0">
            <Layers className="w-6 h-6 glow-green text-emerald-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-slate-200 font-mono font-black uppercase tracking-wider truncate">Oracle RAC</span>
              <span className={`text-[11px] px-2 py-0.5 rounded font-black border shadow-sm shrink-0 ${
                registeredRacDbs.length > 0
                  ? summary.racStatus === 'ONLINE'
                    ? 'bg-emerald-500/40 text-emerald-200 border-emerald-400 animate-pulse'
                    : 'bg-amber-500/40 text-amber-200 border-amber-400'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                ● {registeredRacDbs.length > 0 ? summary.racStatus : 'NOT CONFIGURED'}
              </span>
            </div>
            <div className="text-2xl lg:text-3xl font-black font-mono text-emerald-400 drop-shadow-lg mt-1 tracking-tight">
              {registeredRacDbs.length} <span className="text-xs text-slate-200 font-sans font-black uppercase">Cluster{registeredRacDbs.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="text-xs mt-2.5 space-y-1 font-mono">
              <div className="flex justify-between items-center bg-[#040814] px-2 py-0.5 rounded border border-emerald-500/30">
                <span className="text-slate-300 font-bold text-[10px]">RAC Instances:</span>
                <span className="text-emerald-300 font-black text-[11px] tracking-wider">{racTotalCount > 0 ? `${racRunningCount}/${racTotalCount} Up` : '0 Active'}</span>
              </div>
              <div className="flex justify-between items-center bg-[#040814] px-2 py-0.5 rounded border border-emerald-500/30">
                <span className="text-slate-300 font-bold text-[10px]">CRS Daemon:</span>
                <span className="text-emerald-300 font-black text-[11px] tracking-wider">{registeredRacDbs.length > 0 ? summary.crsStatus : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Single Instance Database KPI Card */}
        <div className="bg-[#091124] p-4 lg:p-5 rounded-2xl border-2 border-cyan-500 flex items-start gap-3.5 shadow-xl shadow-cyan-500/20 hover:border-cyan-400 transition-all">
          <div className="p-3 rounded-xl bg-cyan-500/30 text-cyan-300 border-2 border-cyan-400/80 shadow-md shrink-0">
            <Database className="w-6 h-6 glow-blue text-cyan-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-slate-200 font-mono font-black uppercase tracking-wider truncate">Single Instance DB</span>
              <span className={`text-[11px] px-2 py-0.5 rounded font-black border shadow-sm shrink-0 ${
                registeredSingleDbs.length > 0 ? 'bg-cyan-500/40 text-cyan-200 border-cyan-400' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                ● {registeredSingleDbs.length > 0 ? 'ACTIVE' : 'NOT CONFIGURED'}
              </span>
            </div>
            <div className="text-2xl lg:text-3xl font-black font-mono text-cyan-300 drop-shadow-lg mt-1 tracking-tight">
              {registeredSingleDbs.length} <span className="text-xs text-slate-200 font-sans font-black uppercase">Database{registeredSingleDbs.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="text-xs mt-2.5 space-y-1 font-mono">
              <div className="flex justify-between items-center bg-[#040814] px-2 py-0.5 rounded border border-cyan-500/30">
                <span className="text-slate-300 font-bold text-[10px]">Target SID:</span>
                <span className="text-cyan-300 font-black text-[11px] tracking-wider truncate max-w-[80px]">
                  {registeredSingleDbs.length > 0 ? ((registeredSingleDbs[0] as any).sid || (registeredSingleDbs[0] as any).oracleSid || registeredSingleDbs[0].name) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#040814] px-2 py-0.5 rounded border border-cyan-500/30">
                <span className="text-slate-300 font-bold text-[10px]">Mode:</span>
                <span className="text-emerald-300 font-black text-[11px] tracking-wider">{registeredSingleDbs.length > 0 ? 'READ WRITE' : 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Data Guard Replication KPI Card */}
        <div className="bg-[#091124] p-4 lg:p-5 rounded-2xl border-2 border-fuchsia-500 flex items-start gap-3.5 shadow-xl shadow-fuchsia-500/20 hover:border-fuchsia-400 transition-all">
          <div className="p-3 rounded-xl bg-fuchsia-500/30 text-fuchsia-300 border-2 border-fuchsia-400/80 shadow-md shrink-0">
            <Radio className="w-6 h-6 glow-magenta text-fuchsia-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-slate-200 font-mono font-black uppercase tracking-wider truncate">Data Guard</span>
              <span className={`text-[11px] px-2 py-0.5 rounded font-black border shadow-sm shrink-0 ${
                registeredStandbyDbs.length > 0
                  ? registeredStandbyDbs.every(s => s.syncStatus === 'SYNCHRONIZED')
                    ? 'bg-emerald-500/40 text-emerald-200 border-emerald-400 animate-pulse'
                    : 'bg-amber-500/40 text-amber-200 border-amber-400'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                ● {registeredStandbyDbs.length > 0 ? (registeredStandbyDbs.every(s => s.syncStatus === 'SYNCHRONIZED') ? 'SYNC' : 'LAGGING') : 'NOT CONFIGURED'}
              </span>
            </div>
            <div className="text-2xl lg:text-3xl font-black font-mono text-fuchsia-300 drop-shadow-lg mt-1 tracking-tight">
              {primaryDbs.length} <span className="text-xs text-slate-200 font-sans font-black">PRI</span> / {registeredStandbyDbs.length} <span className="text-xs text-slate-200 font-sans font-black">STBY</span>
            </div>
            <div className="text-xs mt-2.5 space-y-1 font-mono">
              <div className="flex justify-between items-center bg-[#040814] px-2 py-0.5 rounded border border-fuchsia-500/30">
                <span className="text-slate-300 font-bold text-[10px]">Max Lag:</span>
                <span className="text-emerald-300 font-black text-[11px] tracking-wider">
                  {registeredStandbyDbs.length > 0 ? `${Math.max(...registeredStandbyDbs.map(s => s.lagSeconds || 0))}s` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#040814] px-2 py-0.5 rounded border border-fuchsia-500/30">
                <span className="text-slate-300 font-bold text-[10px]">MRP Apply:</span>
                <span className="text-fuchsia-300 font-black text-[11px] tracking-wider">
                  {registeredStandbyDbs.length > 0 ? (registeredStandbyDbs.some(s => s.redoApplied) ? 'ACTIVE' : 'STOPPED') : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Windows Server Fleet & Databases KPI Card */}
        <div className="bg-[#091124] p-4 lg:p-5 rounded-2xl border-2 border-sky-500 flex items-start gap-3.5 shadow-xl shadow-sky-500/20 hover:border-sky-400 transition-all">
          <div className="p-3 rounded-xl bg-sky-500/30 text-sky-300 border-2 border-sky-400/80 shadow-md shrink-0">
            <Monitor className="w-6 h-6 glow-blue text-sky-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-slate-200 font-mono font-black uppercase tracking-wider truncate">Windows Fleet</span>
              <span className={`text-[11px] px-2 py-0.5 rounded font-black border shadow-sm shrink-0 ${
                windowsNodes.length > 0 ? 'bg-sky-500/40 text-sky-200 border-sky-400' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                ● {windowsNodes.length > 0 ? 'WINRM READY' : 'NO HOSTS'}
              </span>
            </div>
            <div className="text-2xl lg:text-3xl font-black font-mono text-sky-300 drop-shadow-lg mt-1 tracking-tight">
              {windowsNodes.length} <span className="text-xs text-slate-200 font-sans font-black uppercase">Host{windowsNodes.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="text-xs mt-2.5 space-y-1 font-mono">
              <div className="flex justify-between items-center bg-[#040814] px-2 py-0.5 rounded border border-sky-500/30">
                <span className="text-slate-300 font-bold text-[10px]">Windows DBs:</span>
                <span className="text-emerald-300 font-black text-[11px] tracking-wider">{registeredWindowsDbs.length} Configured</span>
              </div>
              <div className="flex justify-between items-center bg-[#040814] px-2 py-0.5 rounded border border-sky-500/30">
                <span className="text-slate-300 font-bold text-[10px]">WinRM Port:</span>
                <span className="text-sky-300 font-black text-[11px] tracking-wider">5985 / 5986</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Aggregated System Telemetry Card */}
        <div className="bg-[#091124] p-4 lg:p-5 rounded-2xl border-2 border-violet-500 flex items-start gap-3.5 shadow-xl shadow-violet-500/20 hover:border-violet-400 transition-all">
          <div className="p-3 rounded-xl bg-violet-500/30 text-violet-300 border-2 border-violet-400/80 shadow-md shrink-0">
            <Cpu className="w-6 h-6 text-violet-300" />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-200 font-mono font-black uppercase tracking-wider block truncate">Host Fleet</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950/80 text-violet-300 border border-violet-500/40">
                {nodes.length} Nodes
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-100">
              <span className="text-slate-300 font-bold text-[11px]">Avg CPU:</span>
              <span className="font-mono font-black text-xs text-cyan-300 glow-blue">{summary.cpuUsageAverage}%</span>
            </div>
            <div className="w-full bg-[#040814] rounded-full h-2 overflow-hidden border border-indigo-500/50">
              <div className="bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 h-2 rounded-full transition-all duration-500" style={{ width: `${summary.cpuUsageAverage}%` }}></div>
            </div>
            <div className="flex justify-between text-xs text-slate-100 pt-0.5">
              <span className="text-slate-300 font-bold text-[11px]">Avg Mem:</span>
              <span className="font-mono font-black text-xs text-fuchsia-300 glow-magenta">{summary.memoryUsageAverage}%</span>
            </div>
            <div className="w-full bg-[#040814] rounded-full h-2 overflow-hidden border border-fuchsia-500/50">
              <div className="bg-gradient-to-r from-fuchsia-600 via-pink-500 to-rose-400 h-2 rounded-full transition-all duration-500" style={{ width: `${summary.memoryUsageAverage}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================================================== */}
      {/* UNIFIED SERVER & CLUSTER FLEET MANAGEMENT (Direct Controls on Master Dashboard) */}
      {/* ============================================================================================== */}
      <div className="bg-[#0b152d]/90 backdrop-blur-xl p-5 rounded-2xl border-2 border-indigo-500/40 shadow-2xl space-y-4" id="master-server-fleet-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-indigo-500/30 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl shadow-md">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-display font-black text-white tracking-wide">
                  Server &amp; Host Infrastructure Fleet
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  {nodes.length} Host Server{nodes.length !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans">
                Real-time server telemetry (Linux, Windows, AIX, Solaris), SSH/WinRM connectivity, and database assignments.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onNavigateMenu && (
              <button
                onClick={() => onNavigateMenu('nodes')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/40 hover:bg-indigo-600/70 border border-indigo-400/50 text-indigo-200 text-xs font-mono font-bold rounded-lg transition shadow-md cursor-pointer"
                title="Manage Host Servers"
              >
                <Server className="w-3.5 h-3.5" /> Manage Servers &rarr;
              </button>
            )}
          </div>
        </div>

        {/* Server Nodes Grid */}
        {nodes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="master-nodes-grid">
            {nodes.map(node => {
              const tel = telemetry[node.id];
              const isOnline = tel?.online ?? (node.status === 'ONLINE' && node.powerState !== 'OFF');
              const cpuVal = tel?.os?.cpuUsage ?? 0;
              const memVal = tel?.os?.memoryUsage ?? 0;
              const diskVal = tel?.os?.diskUsage ?? 0;
              const isWin = node.osType === 'Windows' || node.shellType === 'powershell';
              const assignment = getNodeDbAssignment(node.id);

              return (
                <div
                  key={node.id}
                  className={`p-4 rounded-xl border-2 transition-all shadow-lg flex flex-col justify-between space-y-3 relative overflow-hidden ${
                    isOnline
                      ? isWin
                        ? 'bg-[#0a1835]/90 border-sky-500/50 hover:border-sky-400'
                        : node.osType === 'AIX'
                        ? 'bg-[#18110a]/90 border-amber-500/50 hover:border-amber-400'
                        : node.osType === 'Solaris'
                        ? 'bg-[#150a1f]/90 border-purple-500/50 hover:border-purple-400'
                        : 'bg-[#0a1e28]/90 border-emerald-500/50 hover:border-emerald-400'
                      : 'bg-[#180a0e]/90 border-rose-500/50 hover:border-rose-400 opacity-90'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-lg border shrink-0 ${
                        isOnline
                          ? isWin
                            ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                            : node.osType === 'AIX'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                            : node.osType === 'Solaris'
                            ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                            : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-rose-500/20 border-rose-400 text-rose-300'
                      }`}>
                        {isWin ? <Monitor className="w-5 h-5" /> : <Server className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-black text-white font-mono truncate">{node.name}</h3>
                        <div className="text-xs text-slate-300 font-mono truncate">{node.ipAddress}:{node.sshPort || (isWin ? 5985 : 22)}</div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border ${
                        isOnline
                          ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400'
                          : 'bg-rose-500/25 text-rose-200 border-rose-400'
                      }`}>
                        ● {isOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-700">
                        {node.osType || (isWin ? 'Windows' : 'Linux')}
                      </span>
                    </div>
                  </div>

                  {/* Database Assignment Status */}
                  <div className="flex items-center justify-between text-[11px] font-mono px-2 py-1 rounded bg-[#040814] border border-slate-800">
                    <span className="text-slate-400 font-bold">DB Assignment:</span>
                    <span className={`px-2 py-0.5 rounded font-bold border ${assignment.badgeClass}`}>
                      {assignment.role}
                    </span>
                  </div>

                  {/* Telemetry Metric Bars */}
                  <div className="space-y-1.5 text-xs font-mono bg-[#050b1a]/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-300 font-bold">CPU Load:</span>
                      <span className={`font-black ${cpuVal > 85 ? 'text-rose-400' : cpuVal > 65 ? 'text-amber-300' : 'text-cyan-300'}`}>
                        {cpuVal}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-1.5 rounded-full ${cpuVal > 85 ? 'bg-rose-500' : cpuVal > 65 ? 'bg-amber-500' : 'bg-cyan-400'}`} style={{ width: `${cpuVal}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] pt-1">
                      <span className="text-slate-300 font-bold">RAM Used:</span>
                      <span className={`font-black ${memVal > 85 ? 'text-rose-400' : memVal > 65 ? 'text-amber-300' : 'text-fuchsia-300'}`}>
                        {memVal}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-1.5 rounded-full ${memVal > 85 ? 'bg-rose-500' : memVal > 65 ? 'bg-amber-500' : 'bg-fuchsia-400'}`} style={{ width: `${memVal}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] pt-1">
                      <span className="text-slate-300 font-bold">Disk Volume:</span>
                      <span className="text-emerald-300 font-black">{diskVal}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: `${diskVal}%` }}></div>
                    </div>
                  </div>



                  {/* Status & Inspection Controls */}
                  <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => onSelectNode(node.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/50 hover:bg-indigo-600 text-white rounded-lg text-xs font-mono font-bold transition shadow cursor-pointer"
                      title="Drill-down node telemetry and terminal"
                    >
                      <Terminal className="w-3.5 h-3.5" /> Node Telemetry &rarr;
                    </button>

                    {onNavigateMenu && (
                      <button
                        onClick={() => onNavigateMenu('nodes')}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono font-medium transition cursor-pointer border border-slate-700"
                        title="Manage Host Server"
                      >
                        Manage &rarr;
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 bg-[#070f24] rounded-xl border-2 border-dashed border-indigo-500/40 text-center space-y-4">
            <Server className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
            <div>
              <h3 className="text-base font-bold text-white">No Host Servers Connected</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                Real-time server telemetry will appear here once servers are registered. Navigate to the Server Management menu to add and configure your host machines.
              </p>
            </div>
            {onNavigateMenu && (
              <div className="flex justify-center">
                <button
                  onClick={() => onNavigateMenu('nodes')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-mono font-bold rounded-xl shadow-lg cursor-pointer transition"
                >
                  <Server className="w-4 h-4" /> Go to Server Management &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================================================== */}
      {/* SEPARATE DETAILED ARCHITECTURE MATRIX (RAC vs SINGLE INSTANCE vs DATA GUARD) */}
      {/* ============================================================================================== */}
      <div className="space-y-4" id="architecture-status-matrix">
        <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-fuchsia-400 glow-magenta" />
            <h2 className="text-sm font-display font-bold text-slate-100 uppercase tracking-wider">
              Database Deployment Status Matrix
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono bg-indigo-950/60 px-2.5 py-1 rounded border border-indigo-500/30">
            Realtime Architecture Categorization
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* ------------------------------------------------ */}
          {/* PANEL 1: ORACLE RAC CLUSTER STATUS */}
          {/* ------------------------------------------------ */}
          <div className="bg-[#121330] rounded-xl border border-emerald-500/35 p-5 shadow-xl flex flex-col space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

            {/* Panel Header */}
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-500/25 rounded-lg border border-emerald-400 text-emerald-300 shadow">
                  <Layers className="w-5 h-5 glow-green" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-display tracking-tight">Oracle RAC Cluster</h3>
                  <p className="text-xs text-slate-300 font-mono">Multi-Node Real Application Cluster</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-md text-xs font-mono font-black border-2 shadow-sm ${
                registeredRacDbs.length > 0
                  ? summary.racStatus === 'ONLINE'
                    ? 'bg-emerald-500/35 text-emerald-200 border-emerald-400 animate-pulse'
                    : 'bg-amber-500/35 text-amber-200 border-amber-400'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                ● {registeredRacDbs.length > 0 ? `${registeredRacDbs.length} CLUSTER${registeredRacDbs.length !== 1 ? 'S' : ''}` : 'NOT CONFIGURED'}
              </span>
            </div>

            {/* High level Grid Infrastructure checks */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#070918] p-3.5 rounded-lg border-2 border-emerald-500/30">
              <div className="space-y-1">
                <span className="text-slate-300 block text-[11px] font-bold">CRS Clusterware:</span>
                <span className="text-emerald-300 font-black text-xs block tracking-wider">{registeredRacDbs.length > 0 ? summary.crsStatus : 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-300 block text-[11px] font-bold">ASM Diskgroups:</span>
                <span className="text-emerald-300 font-black text-xs block tracking-wider">{registeredRacDbs.length > 0 ? 'DATA / RECO' : 'N/A'}</span>
              </div>
              <div className="space-y-1 pt-1 border-t border-emerald-500/20">
                <span className="text-slate-300 block text-[11px] font-bold">SCAN Listener:</span>
                <span className="text-emerald-300 font-black text-xs block tracking-wider">{registeredRacDbs.length > 0 ? 'PORT 1521 UP' : 'N/A'}</span>
              </div>
              <div className="space-y-1 pt-1 border-t border-emerald-500/20">
                <span className="text-slate-300 block text-[11px] font-bold">Voting Disk/OCR:</span>
                <span className="text-emerald-300 font-black text-xs block tracking-wider">{registeredRacDbs.length > 0 ? summary.votingDiskStatus : 'N/A'}</span>
              </div>
            </div>

            {/* Active RAC Databases List */}
            <div className="space-y-2.5 flex-1">
              <div className="text-xs uppercase font-mono font-black text-emerald-400 tracking-wider flex items-center justify-between">
                <span>Configured RAC Clusters ({registeredRacDbs.length})</span>
                <span>Active Topologies</span>
              </div>

              {registeredRacDbs.map(db => {
                return (
                  <div
                    key={db.id || db.name}
                    onClick={() => onNavigateMenu?.('primary-dbs')}
                    className="p-3.5 bg-[#070817] hover:bg-[#111438] rounded-xl border-2 border-emerald-500/30 hover:border-emerald-400 transition cursor-pointer space-y-2.5 group shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Layers className="w-5 h-5 text-emerald-300" />
                        <div>
                          <div className="text-sm font-black text-slate-100 group-hover:text-white font-mono">{db.name}</div>
                          <div className="text-xs text-slate-400 font-mono">Unique: {db.uniqueName || db.name} • {db.dbType || 'RAC'}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-md font-black bg-emerald-500/30 text-emerald-200 border-2 border-emerald-400">
                        {db.instances?.length || db.nodeIds?.length || 2} NODES RAC
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-xs font-mono pt-2 border-t border-emerald-500/20 text-center">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Version</span>
                        <span className="text-emerald-300 font-black text-xs">{db.version || '19c'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Role</span>
                        <span className="text-emerald-300 font-black text-xs">PRIMARY RAC</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Status</span>
                        <span className="text-emerald-300 font-black text-xs">{db.status || 'OPEN'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {registeredRacDbs.length === 0 && (
                <div className="p-4 bg-[#070817] rounded-xl border border-dashed border-emerald-500/30 text-center py-6">
                  <Layers className="w-7 h-7 text-emerald-400/60 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-mono font-semibold">No RAC Database Configured</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">Status: Inactive • Setup available in Database Setup menu</p>
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------ */}
          {/* PANEL 2: SINGLE INSTANCE DATABASE STATUS */}
          {/* ------------------------------------------------ */}
          <div className="bg-[#121330] rounded-xl border-2 border-cyan-500/40 p-5 shadow-xl flex flex-col space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>

            {/* Panel Header */}
            <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-cyan-500/25 rounded-lg border border-cyan-400 text-cyan-300 shadow">
                  <Database className="w-5 h-5 glow-blue" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-display tracking-tight">Single Instance DB</h3>
                  <p className="text-xs text-slate-300 font-mono">Standalone Non-Clustered Database</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-md text-xs font-mono font-black border-2 shadow-sm ${
                registeredSingleDbs.length > 0
                  ? 'bg-cyan-500/35 text-cyan-200 border-cyan-400'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                ● {registeredSingleDbs.length > 0 ? `${registeredSingleDbs.length} STANDALONE` : 'NOT CONFIGURED'}
              </span>
            </div>

            {/* High level Single Instance summary */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#070918] p-3.5 rounded-lg border-2 border-cyan-500/30">
              <div className="space-y-1">
                <span className="text-slate-300 block text-[11px] font-bold">Storage Model:</span>
                <span className="text-cyan-300 font-black text-xs block tracking-wider">FILE SYSTEM / RAW</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-300 block text-[11px] font-bold">TNS Listener:</span>
                <span className="text-emerald-300 font-black text-xs block tracking-wider">RUNNING (1521)</span>
              </div>
              <div className="space-y-1 pt-1 border-t border-cyan-500/20">
                <span className="text-slate-300 block text-[11px] font-bold">Archive Log Mode:</span>
                <span className="text-emerald-300 font-black text-xs block tracking-wider">ARCHIVELOG</span>
              </div>
              <div className="space-y-1 pt-1 border-t border-cyan-500/20">
                <span className="text-slate-300 block text-[11px] font-bold">Oracle Home:</span>
                <span className="text-cyan-200 font-black text-xs block truncate">/u01/app/oracle</span>
              </div>
            </div>

            {/* Active Single Instance Databases List */}
            <div className="space-y-2.5 flex-1">
              <div className="text-xs uppercase font-mono font-black text-cyan-400 tracking-wider flex items-center justify-between">
                <span>Configured Standalone DBs ({registeredSingleDbs.length})</span>
                <span>Instance SID</span>
              </div>

              {registeredSingleDbs.map((db: any) => {
                return (
                  <div
                    key={db.id || db.name}
                    onClick={() => onNavigateMenu?.('primary-dbs')}
                    className="p-3.5 bg-[#070817] hover:bg-[#111438] rounded-xl border-2 border-cyan-500/30 hover:border-cyan-400 transition cursor-pointer space-y-2.5 group shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Database className="w-5 h-5 text-cyan-300" />
                        <div>
                          <div className="text-sm font-black text-slate-100 group-hover:text-white font-mono">{db.name}</div>
                          <div className="text-xs text-slate-400 font-mono">SID: {db.sid || db.name} • {db.dbType || 'SINGLE_INSTANCE'}</div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-md font-black bg-cyan-500/30 text-cyan-200 border-2 border-cyan-400">
                        {db.version || '19c'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-xs font-mono pt-2 border-t border-cyan-500/20 text-center">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Role</span>
                        <span className="text-cyan-300 font-black text-xs">PRIMARY</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Listener</span>
                        <span className="text-emerald-300 font-black text-xs">ACTIVE</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Status</span>
                        <span className="font-black text-xs text-emerald-300">{db.status || 'OPEN'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {registeredSingleDbs.length === 0 && (
                <div className="p-4 bg-[#070817] rounded-xl border border-dashed border-cyan-500/30 text-center py-6">
                  <Database className="w-7 h-7 text-cyan-400/60 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-mono font-semibold">No Single Instance DB Configured</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">Status: Inactive • Setup available in Database Setup menu</p>
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------ */}
          {/* PANEL 3: DATA GUARD REPLICATION STATUS */}
          {/* ------------------------------------------------ */}
          <div className="bg-[#121330] rounded-xl border-2 border-fuchsia-500/40 p-5 shadow-xl flex flex-col space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 rounded-full blur-2xl pointer-events-none"></div>

            {/* Panel Header */}
            <div className="flex items-center justify-between pb-3 border-b border-fuchsia-500/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-fuchsia-500/25 rounded-lg border border-fuchsia-400 text-fuchsia-300 shadow">
                  <Radio className="w-5 h-5 glow-magenta" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-display tracking-tight">Data Guard Replication</h3>
                  <p className="text-xs text-slate-300 font-mono">Disaster Recovery & Redo Apply</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-md text-xs font-mono font-black ${
                registeredStandbyDbs.length > 0
                  ? registeredStandbyDbs.every(s => s.syncStatus === 'SYNCHRONIZED')
                    ? 'bg-fuchsia-500/35 text-fuchsia-200 border-2 border-fuchsia-400 shadow-sm animate-pulse'
                    : 'bg-amber-500/40 text-amber-200 border-2 border-amber-400'
                  : 'bg-slate-800 text-slate-400 border-2 border-slate-700'
              }`}>
                ● {registeredStandbyDbs.length > 0 ? (registeredStandbyDbs.every(s => s.syncStatus === 'SYNCHRONIZED') ? 'SYNCHRONIZED' : 'LAGGING') : 'NOT CONFIGURED'}
              </span>
            </div>

            {/* High level Data Guard Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#070918] p-3.5 rounded-lg border-2 border-fuchsia-500/30">
              <div className="space-y-1">
                <span className="text-slate-300 block text-[11px] font-bold">Protection Mode:</span>
                <span className="text-fuchsia-300 font-black text-xs block tracking-wider">{primaryDbs.length > 0 ? 'MAX PERFORMANCE' : 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-300 block text-[11px] font-bold">Transport Mode:</span>
                <span className="text-cyan-300 font-black text-xs block tracking-wider">{registeredStandbyDbs.length > 0 ? (registeredStandbyDbs[0].transportMode || 'ASYNC') : 'N/A'}</span>
              </div>
              <div className="space-y-1 pt-1 border-t border-fuchsia-500/20">
                <span className="text-slate-300 block text-[11px] font-bold">Replication Lag:</span>
                <span className="text-emerald-300 font-black text-xs block tracking-wider">
                  {registeredStandbyDbs.length > 0 ? `${Math.max(...registeredStandbyDbs.map(s => s.lagSeconds || 0))} SEC` : 'N/A'}
                </span>
              </div>
              <div className="space-y-1 pt-1 border-t border-fuchsia-500/20">
                <span className="text-slate-300 block text-[11px] font-bold">MRP Apply Engine:</span>
                <span className="text-emerald-300 font-black text-xs block tracking-wider">
                  {registeredStandbyDbs.length > 0 ? (registeredStandbyDbs.some(s => s.redoApplied) ? 'APPLYING REAL TIME' : 'STOPPED') : 'N/A'}
                </span>
              </div>
            </div>

            {/* Data Guard Pair Flow Visualization */}
            <div className="space-y-2 flex-1">
              <div className="text-xs uppercase font-mono font-black text-fuchsia-400 tracking-wider flex items-center justify-between">
                <span>Active Data Guard Topology</span>
                <span>Sync Stream</span>
              </div>

              {primaryDbs.length > 0 && registeredStandbyDbs.length > 0 ? (
                <div className="p-3.5 bg-[#070817] rounded-xl border-2 border-fuchsia-500/30 space-y-4">
                  {primaryDbs.map((pDb) => {
                    const assocStandbys = registeredStandbyDbs.filter(s =>
                      s.primaryDbId === pDb.id ||
                      s.primaryDbId === pDb.uniqueName ||
                      s.primaryDbId === pDb.name ||
                      (!s.primaryDbId && primaryDbs.length === 1)
                    );

                    return (
                      <div key={pDb.id} className="space-y-2 border-b border-fuchsia-500/20 pb-3 last:border-0 last:pb-0">
                        {/* Primary DB Box */}
                        <div className="p-2.5 bg-[#141235] rounded-lg border border-cyan-400/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-cyan-300" />
                            <div>
                              <div className="text-xs font-black text-slate-100 font-mono">
                                {pDb.name} ({pDb.uniqueName})
                              </div>
                              <div className="text-[10px] text-slate-300 font-bold font-mono">PRIMARY • READ WRITE</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-cyan-500/30 text-cyan-200 font-black border border-cyan-400">
                            Seq #{pDb.latestSequence || 100}
                          </span>
                        </div>

                        {/* Flow Arrow */}
                        <div className="flex items-center justify-center gap-2 text-fuchsia-300 text-[10px] font-mono py-0.5">
                          <ArrowRight className="w-3.5 h-3.5 animate-pulse text-cyan-300" />
                          <span className="text-[10px] text-fuchsia-200 font-bold uppercase tracking-wider">
                            ASYNC Redo Shipping ({assocStandbys.length} Target{assocStandbys.length !== 1 ? 's' : ''})
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 animate-pulse text-cyan-300" />
                        </div>

                        {/* Standby DB Boxes */}
                        {assocStandbys.length > 0 ? (
                          <div className="space-y-2 pl-2 border-l-2 border-fuchsia-500/30">
                            {assocStandbys.map((stby) => (
                              <div key={stby.id} className="p-2.5 bg-[#141235] rounded-lg border border-fuchsia-400/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Radio className="w-4 h-4 text-fuchsia-300" />
                                  <div>
                                    <div className="text-xs font-black text-slate-100 font-mono">
                                      {stby.name} ({stby.uniqueName})
                                    </div>
                                    <div className="text-[10px] text-slate-300 font-bold font-mono">
                                      PHYSICAL STANDBY • {stby.redoApplied ? 'MRP ACTIVE' : 'MRP STOPPED'}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200 font-black border border-emerald-400">
                                  Applied #{stby.appliedSequence || stby.latestSequence || pDb.latestSequence}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 font-mono italic pl-2">
                            No standby target attached to this primary database.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-[#070817] rounded-xl border border-dashed border-fuchsia-500/30 text-center py-6">
                  <Radio className="w-7 h-7 text-fuchsia-400/60 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-mono font-semibold">No Data Guard Standby Configured</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">Status: Inactive • Setup available in Database Setup menu</p>
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------ */}
          {/* PANEL 4: WINDOWS SERVER FLEET STATUS */}
          {/* ------------------------------------------------ */}
          <div className="bg-[#121330] rounded-xl border-2 border-sky-500/40 p-5 shadow-xl flex flex-col space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none"></div>

            {/* Panel Header */}
            <div className="flex items-center justify-between pb-3 border-b border-sky-500/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-sky-500/25 rounded-lg border border-sky-400 text-sky-300 shadow">
                  <Monitor className="w-5 h-5 glow-blue" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-display tracking-tight">Windows Server Fleet</h3>
                  <p className="text-xs text-slate-300 font-mono">WinRM Remote Management & Security</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-md text-xs font-mono font-black bg-sky-500/35 text-sky-200 border-2 border-sky-400 shadow-sm">
                ● {windowsNodes.length} WIN HOSTS
              </span>
            </div>

            {/* High level Windows summary */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#070918] p-3.5 rounded-lg border-2 border-sky-500/30">
              <div className="space-y-1">
                <span className="text-slate-300 block text-[11px] font-bold">WinRM Protocol:</span>
                <span className="text-emerald-300 font-black text-xs block tracking-wider">HTTP/HTTPS (5985/5986)</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-300 block text-[11px] font-bold">PowerShell Shell:</span>
                <span className="text-sky-300 font-black text-xs block tracking-wider">v5.1 / v7 Core</span>
              </div>
              <div className="space-y-1 pt-1 border-t border-sky-500/20">
                <span className="text-slate-300 block text-[11px] font-bold">Windows Defender:</span>
                <span className="text-emerald-300 font-black text-xs block tracking-wider">REALTIME PROTECTED</span>
              </div>
              <div className="space-y-1 pt-1 border-t border-sky-500/20">
                <span className="text-slate-300 block text-[11px] font-bold">Configured DBs:</span>
                <span className="text-sky-200 font-black text-xs block truncate">{registeredWindowsDbs.length} Windows DBs</span>
              </div>
            </div>

            {/* Windows Nodes List */}
            <div className="space-y-2.5 flex-1">
              <div className="text-xs uppercase font-mono font-black text-sky-400 tracking-wider flex items-center justify-between">
                <span>Windows Machines ({windowsNodes.length})</span>
                <span>Host / Status</span>
              </div>

              {windowsNodes.map(node => {
                const tel = telemetry[node.id];
                const online = tel?.online ?? (node.status === 'ONLINE' && node.powerState !== 'OFF');

                return (
                  <div
                    key={node.id}
                    onClick={() => onSelectNode(node.id)}
                    className="p-3.5 bg-[#070817] hover:bg-[#111438] rounded-xl border-2 border-sky-500/30 hover:border-sky-400 transition cursor-pointer space-y-2.5 group shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Monitor className="w-5 h-5 text-sky-300" />
                        <div>
                          <div className="text-sm font-black text-slate-100 group-hover:text-white font-mono">{node.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{node.ipAddress}:{node.sshPort || 5985}</div>
                        </div>
                      </div>
                      <span className={`text-[11px] font-mono px-2.5 py-1 rounded-md font-black ${
                        online ? 'bg-sky-500/30 text-sky-200 border-2 border-sky-400' : 'bg-rose-500/30 text-rose-200 border-2 border-rose-400'
                      }`}>
                        {online ? 'WINRM ONLINE' : 'OFFLINE'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-xs font-mono pt-2 border-t border-sky-500/20 text-center">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">OS Type</span>
                        <span className="text-sky-300 font-black text-xs">Windows</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">WinRM</span>
                        <span className="text-emerald-300 font-black text-xs">ONLINE</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Status</span>
                        <span className="text-emerald-300 font-black text-xs">{online ? 'ACTIVE' : 'OFFLINE'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {windowsNodes.length === 0 && (
                <div className="p-4 bg-[#070817] rounded-xl border border-dashed border-sky-500/30 text-center py-6">
                  <Monitor className="w-7 h-7 text-sky-400/60 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-mono font-semibold">No Windows Host Detected</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">Status: Inactive • Manage hosts in Server Management menu</p>
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------ */}
          {/* PANEL 5: WEBLOGIC ENTERPRISE FLEET STATUS */}
          {/* ------------------------------------------------ */}
          <div className="bg-[#121330] rounded-xl border-2 border-indigo-500/40 p-5 shadow-xl flex flex-col space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>

            {/* Panel Header */}
            <div className="flex items-center justify-between pb-3 border-b border-indigo-500/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-500/25 rounded-lg border border-indigo-400 text-indigo-300 shadow">
                  <Server className="w-5 h-5 glow-blue" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-display tracking-tight">WebLogic Enterprise</h3>
                  <p className="text-xs text-slate-300 font-mono">Application Server Cluster & Domain</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-md text-xs font-mono font-black bg-indigo-500/35 text-indigo-200 border-2 border-indigo-400 shadow-sm">
                ● {combinedWebLogic.length} WLS SERVERS
              </span>
            </div>

            {/* High level WebLogic summary */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#070918] p-3.5 rounded-lg border-2 border-indigo-500/30">
              <div className="space-y-1">
                <span className="text-slate-300 block text-[11px] font-bold">Admin Port:</span>
                <span className="text-indigo-300 font-black text-xs block tracking-wider">7001 (SSL 7002)</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-300 block text-[11px] font-bold">Domain Name:</span>
                <span className="text-emerald-300 font-black text-xs block tracking-wider">base_domain_prod</span>
              </div>
              <div className="space-y-1 pt-1 border-t border-indigo-500/20">
                <span className="text-slate-300 block text-[11px] font-bold">JVM Heap:</span>
                <span className="text-indigo-300 font-black text-xs block tracking-wider">2,890 / 8,192 MB</span>
              </div>
              <div className="space-y-1 pt-1 border-t border-indigo-500/20">
                <span className="text-slate-300 block text-[11px] font-bold">NodeManager:</span>
                <span className="text-emerald-300 font-black text-xs block tracking-wider">ACTIVE (5556)</span>
              </div>
            </div>

            {/* WebLogic Instances List */}
            <div className="space-y-2.5 flex-1">
              <div className="text-xs uppercase font-mono font-black text-indigo-400 tracking-wider flex items-center justify-between">
                <span>WebLogic Instances ({combinedWebLogic.length})</span>
                <span>Host / Status</span>
              </div>

              {combinedWebLogic.map((wls: any) => {
                const isStopped = wls.status === 'STOPPED' || wls.status === 'OFFLINE';

                return (
                  <div
                    key={wls.id || wls.name}
                    onClick={() => wls.isNode ? onSelectNode(wls.nodeId) : onNavigateMenu?.('weblogic-enterprise')}
                    className="p-3.5 bg-[#070817] hover:bg-[#111438] rounded-xl border-2 border-indigo-500/30 hover:border-indigo-400 transition cursor-pointer space-y-2.5 group shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Server className={`w-5 h-5 ${isStopped ? 'text-rose-400' : 'text-indigo-300'}`} />
                        <div>
                          <div className="text-sm font-black text-slate-100 group-hover:text-white font-mono">{wls.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{wls.hostIp || wls.hostname}:{wls.adminPort || 7001}</div>
                        </div>
                      </div>
                      <span className={`text-[11px] font-mono px-2.5 py-1 rounded-md font-black ${
                        isStopped ? 'bg-rose-500/30 text-rose-200 border-2 border-rose-400' : 'bg-indigo-500/30 text-indigo-200 border-2 border-indigo-400'
                      }`}>
                        {wls.status || 'RUNNING'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-xs font-mono pt-2 border-t border-indigo-500/20 text-center">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Domain</span>
                        <span className="text-indigo-300 font-black text-xs truncate block">{wls.domainName || 'prod_domain'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Deployments</span>
                        <span className="text-emerald-300 font-black text-xs">2 WAR / EAR</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Status</span>
                        <span className="text-emerald-300 font-bold text-xs">HEALTHY</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {combinedWebLogic.length === 0 && (
                <div className="p-4 bg-[#070817] rounded-xl border border-dashed border-indigo-500/30 text-center py-6">
                  <Server className="w-7 h-7 text-indigo-400/60 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-mono font-semibold">No WebLogic Server Detected</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">Status: Inactive • Setup available in WebLogic Enterprise menu</p>
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------ */}
          {/* PANEL 6: PACS MEDICAL DICOM FLEET STATUS */}
          {/* ------------------------------------------------ */}
          <div className="bg-[#121330] rounded-xl border-2 border-purple-500/40 p-5 shadow-xl flex flex-col space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none"></div>

            {/* Panel Header */}
            <div className="flex items-center justify-between pb-3 border-b border-purple-500/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-purple-500/25 rounded-lg border border-purple-400 text-purple-300 shadow">
                  <HardDrive className="w-5 h-5 glow-purple" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-display tracking-tight">PACS DICOM Engine</h3>
                  <p className="text-xs text-slate-300 font-mono">Medical Imaging Archival & C-STORE</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-md text-xs font-mono font-black bg-purple-500/35 text-purple-200 border-2 border-purple-400 shadow-sm">
                ● {combinedPacs.length} PACS SERVERS
              </span>
            </div>

            {/* High level PACS summary */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-[#070918] p-3.5 rounded-lg border-2 border-purple-500/30">
              <div className="space-y-1">
                <span className="text-slate-300 block text-[11px] font-bold">DICOM Port:</span>
                <span className="text-purple-300 font-black text-xs block tracking-wider">104 (TLS 2762)</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-300 block text-[11px] font-bold">AE Title:</span>
                <span className="text-emerald-300 font-black text-xs block tracking-wider">PACS_ARCHIVE_MAIN</span>
              </div>
              <div className="space-y-1 pt-1 border-t border-purple-500/20">
                <span className="text-slate-300 block text-[11px] font-bold">WADO/REST API:</span>
                <span className="text-purple-300 font-black text-xs block tracking-wider">PORT 8042 / 8080</span>
              </div>
              <div className="space-y-1 pt-1 border-t border-purple-500/20">
                <span className="text-slate-300 block text-[11px] font-bold">C-ECHO Status:</span>
                <span className="text-emerald-300 font-black text-xs block tracking-wider">SUCCESS (0.4ms)</span>
              </div>
            </div>

            {/* PACS Instances List */}
            <div className="space-y-2.5 flex-1">
              <div className="text-xs uppercase font-mono font-black text-purple-400 tracking-wider flex items-center justify-between">
                <span>PACS DICOM Instances ({combinedPacs.length})</span>
                <span>AE Title / Status</span>
              </div>

              {combinedPacs.map((pacs: any) => {
                const isStopped = pacs.status === 'STOPPED' || pacs.status === 'OFFLINE';

                return (
                  <div
                    key={pacs.id || pacs.name}
                    onClick={() => pacs.isNode ? onSelectNode(pacs.nodeId) : onNavigateMenu?.('pacs-medical')}
                    className="p-3.5 bg-[#070817] hover:bg-[#111438] rounded-xl border-2 border-purple-500/30 hover:border-purple-400 transition cursor-pointer space-y-2.5 group shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <HardDrive className={`w-5 h-5 ${isStopped ? 'text-rose-400' : 'text-purple-300'}`} />
                        <div>
                          <div className="text-sm font-black text-slate-100 group-hover:text-white font-mono">{pacs.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{pacs.hostIp || pacs.hostname}:{pacs.dicomPort || 104}</div>
                        </div>
                      </div>
                      <span className={`text-[11px] font-mono px-2.5 py-1 rounded-md font-black ${
                        isStopped ? 'bg-rose-500/30 text-rose-200 border-2 border-rose-400' : 'bg-purple-500/30 text-purple-200 border-2 border-purple-400'
                      }`}>
                        {pacs.status || 'RUNNING'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-xs font-mono pt-2 border-t border-purple-500/20 text-center">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">AET Title</span>
                        <span className="text-purple-300 font-black text-xs truncate block">{pacs.aeTitle || 'PACS_AET'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">C-ECHO</span>
                        <span className="text-emerald-300 font-black text-xs">PASSED</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Status</span>
                        <span className="text-emerald-300 font-bold text-xs">ONLINE</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {combinedPacs.length === 0 && (
                <div className="p-4 bg-[#070817] rounded-xl border border-dashed border-purple-500/30 text-center py-6">
                  <HardDrive className="w-7 h-7 text-purple-400/60 mx-auto mb-2" />
                  <p className="text-xs text-slate-300 font-mono font-semibold">No PACS DICOM Server Detected</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">Status: Inactive • Setup available in PACS Medical menu</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Content: Server Map, Charts and Alert list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: HA Disaster Simulation & Alerts */}
        <div className="lg:col-span-1 space-y-6">
          {/* Disaster Sim and Failover Drills Deck */}
          <div className="bg-[#151821] p-5 rounded-xl border border-indigo-500/30 shadow-xl shadow-indigo-500/5 bg-gradient-to-br from-[#151821] via-[#151821] to-[#251835]/35 animate-fade-in" id="disaster-drills-deck">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs uppercase tracking-widest text-fuchsia-400 font-bold flex items-center gap-1.5 font-display">
                <Flame className="w-4 h-4 text-pink-500 animate-pulse" />
                HA Disaster Simulation Deck
              </h2>
              {simStatusMsg && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 animate-pulse border border-indigo-500/25">
                  {simStatusMsg}
                </span>
              )}
            </div>
            <p className="text-slate-400 text-xs mb-4 font-sans leading-relaxed">
              Trigger simulated disaster events to test failover response across RAC, Single Instance, and Data Guard.
            </p>

            <div className="space-y-3">
              {/* Primary Crash Row */}
              <div className="flex flex-col gap-1 bg-[#0A0B10]/70 p-3 rounded-lg border border-red-500/15 hover:border-red-500/30 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                    <span className="text-xs font-semibold text-slate-200">Host 1 Power Loss (Primary DB)</span>
                  </div>
                  <button
                    onClick={() => handleTriggerDisaster('primary_crash', 'Primary Host Outage')}
                    disabled={isSimulating}
                    className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 text-[10px] font-bold font-mono rounded border border-red-500/30 hover:border-red-500/50 cursor-pointer transition-all disabled:opacity-50"
                  >
                    Trigger Crash
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Crashes Primary Node. Standby DB transitions to STALLED sync with lag accumulation.
                </p>
              </div>

              {/* Standby Crash Row */}
              <div className="flex flex-col gap-1 bg-[#0A0B10]/70 p-3 rounded-lg border border-amber-500/15 hover:border-amber-500/30 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                    <span className="text-xs font-semibold text-slate-200">Standby Datacenter Failure</span>
                  </div>
                  <button
                    onClick={() => handleTriggerDisaster('standby_crash', 'Standby Site Failure')}
                    disabled={isSimulating}
                    className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 hover:text-amber-300 text-[10px] font-bold font-mono rounded border border-amber-500/30 hover:border-amber-500/50 cursor-pointer transition-all disabled:opacity-50"
                  >
                    Trigger Down
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Crashes Standby Node. Stalls active redo apply, triggers lag alerts.
                </p>
              </div>

              {/* Interconnect Partition Row */}
              <div className="flex flex-col gap-1 bg-[#0A0B10]/70 p-3 rounded-lg border border-purple-500/15 hover:border-purple-500/30 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                    <span className="text-xs font-semibold text-slate-200">Private Interconnect Partition</span>
                  </div>
                  <button
                    onClick={() => handleTriggerDisaster('network_partition', 'Interconnect Partition')}
                    disabled={isSimulating}
                    className="px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/25 text-purple-400 hover:text-purple-300 text-[10px] font-bold font-mono rounded border border-purple-500/30 hover:border-purple-500/50 cursor-pointer transition-all disabled:opacity-50"
                  >
                    Cut Interconnect
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Kills interconnect heartbeat. Disables Local/Scan Listeners.
                </p>
              </div>

              {/* Recovery Row */}
              <div className="flex flex-col gap-1 bg-[#0d1c16]/50 p-3 rounded-lg border border-emerald-500/25 hover:border-emerald-500/40 transition-all bg-gradient-to-r from-[#0d1c16]/50 to-[#102434]/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-bold text-emerald-300">Auto-Heal & Synchronize All</span>
                  </div>
                  <button
                    onClick={() => handleTriggerDisaster('auto_heal', 'Re-sync & Recovery')}
                    disabled={isSimulating}
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-black text-[10px] font-black font-mono rounded cursor-pointer transition-all shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                  >
                    RECOVER SYSTEMS
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Launches automated self-recovery. Powers on nodes, restarts Clusterware services, mounts DB instances.
                </p>
              </div>
            </div>
          </div>

          {/* Active Alerts List */}
          <div className="bg-[#151821] p-5 rounded-xl border border-[#222834] shadow-md">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-4 flex items-center justify-between font-display">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Active Grid Warnings & Alerts
              </span>
              <span className="text-xs bg-[#0A0B10] px-2 py-0.5 rounded text-slate-300 font-mono font-semibold border border-[#222834]">
                {alerts.length}
              </span>
            </h2>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1" id="alerts-panel-list">
              {alerts.map((alert, i) => (
                <div key={i} className="flex gap-2.5 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{alert}</span>
                </div>
              ))}

              {alerts.length === 0 && (
                <div className="text-center py-6 text-emerald-400 flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <span className="text-xs font-sans font-medium text-slate-300">All components operating normally.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Recharts Performance Visualizer */}
        <div className="lg:col-span-2 flex flex-col bg-[#151821] p-5 rounded-xl border border-[#222834] shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#222834] mb-4 gap-2">
            <h2 className="text-xs uppercase tracking-widest text-slate-400 font-semibold flex items-center gap-2 font-display">
              <Activity className="w-4 h-4 text-slate-300" />
              Dynamic Performance Visualizer
            </h2>

            <div className="flex bg-[#0A0B10] p-0.5 rounded-lg border border-[#222834]">
              <button
                onClick={() => setChartMetric('cpu_mem')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  chartMetric === 'cpu_mem' ? 'bg-[#151821] text-white border border-[#222834] shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                CPU / Memory
              </button>
              <button
                onClick={() => setChartMetric('perf_iops')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  chartMetric === 'perf_iops' ? 'bg-[#151821] text-white border border-[#222834] shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Disk IOPS / Sessions
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[300px]">
            {aggregatedData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                {chartMetric === 'cpu_mem' ? (
                  <AreaChart data={aggregatedData}>
                    <defs>
                      <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222834" />
                    <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={10} unit="%" />
                    <Tooltip contentStyle={{ backgroundColor: '#0A0B10', borderColor: '#222834', color: '#cbd5e1' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Area type="monotone" dataKey="CpuAverage" name="Avg Cluster CPU" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCpu)" />
                    <Area type="monotone" dataKey="MemoryAverage" name="Avg Cluster Memory" stroke="#f43f5e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMem)" />
                  </AreaChart>
                ) : (
                  <LineChart data={aggregatedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222834" />
                    <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#3b82f6" fontSize={10} label={{ value: 'IOPS', angle: -90, position: 'insideLeft', style: { fill: '#3b82f6', fontSize: 10 } }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" fontSize={10} label={{ value: 'Sessions', angle: 90, position: 'insideRight', style: { fill: '#f43f5e', fontSize: 10 } }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0A0B10', borderColor: '#222834', color: '#cbd5e1' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Line yAxisId="left" type="monotone" dataKey="TotalIOPS" name="Aggregated Disk IOPS" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="TotalSessions" name="Active Session Count" stroke="#f43f5e" strokeWidth={2.5} dot={false} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16 text-slate-500">
                <Clock className="w-10 h-10 animate-pulse text-slate-600" />
                <span className="mt-2 text-xs font-sans">Connecting to WebSockets, gathering metrics telemetry...</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Log Summary Table */}
      <div className="bg-[#0c1f48]/60 backdrop-blur-xl p-5 rounded-2xl border border-[#234d8f]/50 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#234d8f]/40">
          <h2 className="text-xs uppercase tracking-widest text-sky-200 font-semibold flex items-center gap-2 font-display">
            <Clock className="w-4 h-4 text-cyan-400" />
            Audit Trails & DBA Action Log
          </h2>
          <span className="text-xs text-sky-300/70 font-mono">Latest activity logs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-200">
            <thead className="bg-[#07132c]/80 text-xs font-semibold text-sky-300 uppercase tracking-wider font-display border-b border-[#234d8f]/50">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Target Node</th>
                <th className="p-3">DBA Operator</th>
                <th className="p-3">Action Executed</th>
                <th className="p-3">Status</th>
                <th className="p-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#234d8f]/40 font-sans" id="logs-table-body">
              {logs.slice(0, 5).map(log => (
                <tr key={log.id} className="hover:bg-[#07132c]/50 transition-colors">
                  <td className="p-3 text-xs text-sky-300 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="p-3 font-semibold text-white">{log.nodeName}</td>
                  <td className="p-3 text-xs text-sky-200 font-mono">{log.user}</td>
                  <td className="p-3 font-mono text-emerald-400 text-xs">{log.action}</td>
                  <td className="p-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-sky-200/80 italic max-w-[240px] truncate">{log.details || '-'}</td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-sky-300/60 text-xs">
                    No logs recorded in this session.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>



    </div>
  );
}
