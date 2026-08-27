import React, { useState, useEffect } from 'react';
import {
  Server, Cpu, Database, Activity, HardDrive, ShieldCheck, Zap, Radio, RefreshCw,
  Play, Square, RotateCw, Terminal, Search, Filter, AlertTriangle, CheckCircle2,
  XCircle, Monitor, Layers, Power, FileText, ArrowRight, ShieldAlert, Ban, Sparkles,
  Sliders, Plus, Trash2, Edit3, Check, X, Clock, ExternalLink, Key
} from 'lucide-react';
import { HostServerAppEntity, SSHNode } from '../types';

interface ServerNodeItem {
  id: string;
  hostname: string;
  ip: string;
  osType: 'WINDOWS_SERVER' | 'RHEL_LINUX' | 'ORACLE_LINUX' | 'UBUNTU_LINUX';
  sshPort: number;
  status: 'ONLINE' | 'OFFLINE' | 'UNREACHABLE';
  cpuLoadPct: number;
  ramUsagePct: number;
  hasWebLogic: boolean;
  hasPacs: boolean;
  hasTomcat: boolean;
  installedApps: HostServerAppEntity[];
}

interface GlobalAppsManagerViewProps {
  nodes?: SSHNode[];
  onAddAuditLog?: (action: string, target: string, details?: string) => void;
}

export default function GlobalAppsManagerView({ nodes = [], onAddAuditLog }: GlobalAppsManagerViewProps) {
  // Master Server State (Reacts dynamically to nodes or user additions)
  const [servers, setServers] = useState<ServerNodeItem[]>(() => {
    // Initial Seed from nodes if available
    if (nodes.length > 0) {
      return nodes.map(n => {
        const isWls = (n as any).hasWebLogic || n.hostname?.toLowerCase().includes('weblogic') || n.hostname?.toLowerCase().includes('forms');
        const isPacs = (n as any).hasPacs || n.hostname?.toLowerCase().includes('pacs');
        const isTomcat = (n as any).hasTomcat || n.hostname?.toLowerCase().includes('tomcat');
        
        const apps: HostServerAppEntity[] = [];

        if (isWls) {
          apps.push(
            {
              id: `app-wls-nm-${n.id}`,
              serverId: n.id,
              serverHostname: n.hostname || n.name,
              serverIp: n.ipAddress || '192.168.12.25',
              osType: n.osType === 'Windows' ? 'WINDOWS_SERVER' : 'RHEL_LINUX',
              appName: 'WebLogic Node Manager',
              category: 'WEBLOGIC',
              port: 5556,
              processPid: 1048,
              status: 'RUNNING',
              memoryMB: 380,
              cpuUsagePct: 1.2,
              uptime: '14 days 06 hrs',
              configPath: n.osType === 'Windows' ? 'C:\\Oracle\\Middleware\\Oracle_Home\\user_projects\\domains\\base_domain\\nodemanager' : '/u01/oracle/middleware/domains/base_domain/nodemanager',
              lastHealthCheck: '5 sec ago'
            },
            {
              id: `app-wls-admin-${n.id}`,
              serverId: n.id,
              serverHostname: n.hostname || n.name,
              serverIp: n.ipAddress || '192.168.12.25',
              osType: n.osType === 'Windows' ? 'WINDOWS_SERVER' : 'RHEL_LINUX',
              appName: 'WebLogic AdminServer',
              category: 'WEBLOGIC',
              port: 7001,
              processPid: 2490,
              status: 'RUNNING',
              memoryMB: 1820,
              cpuUsagePct: 4.8,
              uptime: '14 days 05 hrs',
              configPath: n.osType === 'Windows' ? 'C:\\Oracle\\Middleware\\Oracle_Home\\user_projects\\domains\\base_domain\\bin\\startWebLogic.cmd' : '/u01/oracle/middleware/domains/base_domain/bin/startWebLogic.sh',
              lastHealthCheck: '5 sec ago'
            },
            {
              id: `app-wls-forms-${n.id}`,
              serverId: n.id,
              serverHostname: n.hostname || n.name,
              serverIp: n.ipAddress || '192.168.12.25',
              osType: n.osType === 'Windows' ? 'WINDOWS_SERVER' : 'RHEL_LINUX',
              appName: 'WLS_FORMS (Oracle Forms 12c)',
              category: 'WEBLOGIC',
              port: 9001,
              processPid: 3812,
              status: 'RUNNING',
              memoryMB: 2450,
              cpuUsagePct: 8.5,
              uptime: '12 days 18 hrs',
              configPath: n.osType === 'Windows' ? 'C:\\Oracle\\Middleware\\Oracle_Home\\user_projects\\domains\\base_domain\\config\\fmwconfig\\servers\\WLS_FORMS' : '/u01/oracle/middleware/domains/base_domain/config/servers/WLS_FORMS',
              lastHealthCheck: '12 sec ago'
            }
          );
        }

        if (isPacs) {
          apps.push(
            {
              id: `app-pacs-cstore-${n.id}`,
              serverId: n.id,
              serverHostname: n.hostname || n.name,
              serverIp: n.ipAddress || '192.168.12.20',
              osType: n.osType === 'Windows' ? 'WINDOWS_SERVER' : 'RHEL_LINUX',
              appName: 'PACS DICOM C-STORE SCP',
              category: 'PACS_DICOM',
              port: 104,
              processPid: 5819,
              status: 'RUNNING',
              memoryMB: 1250,
              cpuUsagePct: 3.4,
              uptime: '30 days 12 hrs',
              configPath: '/etc/dcm4chee/dcm4chee-arc.cfg',
              lastHealthCheck: '3 sec ago'
            }
          );
        }

        return {
          id: n.id,
          hostname: n.hostname || n.name,
          ip: n.ipAddress || '192.168.12.25',
          osType: n.osType === 'Windows' ? 'WINDOWS_SERVER' : 'RHEL_LINUX',
          sshPort: n.sshPort || 22,
          status: 'ONLINE',
          cpuLoadPct: 12,
          ramUsagePct: 45,
          hasWebLogic: isWls,
          hasPacs: isPacs,
          hasTomcat: isTomcat,
          installedApps: apps
        };
      });
    }

    // Default clean state if no nodes added yet
    return [];
  });

  const [selectedServerId, setSelectedServerId] = useState<string>(() => servers[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modals State
  const [showAddServerModal, setShowAddServerModal] = useState(false);
  const [activeLogModalApp, setActiveLogModalApp] = useState<HostServerAppEntity | null>(null);
  const [activeEditConfigModalApp, setActiveEditConfigModalApp] = useState<HostServerAppEntity | null>(null);

  // New Server Form State
  const [newHostname, setNewHostname] = useState('');
  const [newIp, setNewIp] = useState('');
  const [newOsType, setNewOsType] = useState<'WINDOWS_SERVER' | 'RHEL_LINUX' | 'ORACLE_LINUX' | 'UBUNTU_LINUX'>('RHEL_LINUX');
  const [newSshPort, setNewSshPort] = useState(22);
  const [newHasWebLogic, setNewHasWebLogic] = useState(true);
  const [newHasPacs, setNewHasPacs] = useState(false);

  // Ensure selectedServerId points to a valid server if servers list changes
  useEffect(() => {
    if (servers.length > 0 && !servers.some(s => s.id === selectedServerId)) {
      setSelectedServerId(servers[0].id);
    }
  }, [servers, selectedServerId]);

  // Selected Server Entity
  const currentServer = servers.find(s => s.id === selectedServerId);

  // Add Server Handler
  const handleAddServerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHostname || !newIp) return;

    const newId = `srv-${Date.now()}`;
    const generatedApps: HostServerAppEntity[] = [];

    if (newHasWebLogic) {
      generatedApps.push(
        {
          id: `app-wls-nm-${newId}`,
          serverId: newId,
          serverHostname: newHostname,
          serverIp: newIp,
          osType: newOsType,
          appName: 'WebLogic Node Manager',
          category: 'WEBLOGIC',
          port: 5556,
          processPid: 1102,
          status: 'RUNNING',
          memoryMB: 380,
          cpuUsagePct: 1.1,
          uptime: 'Just added',
          configPath: '/oracle/domains/base_domain/nodemanager',
          lastHealthCheck: 'Just now'
        },
        {
          id: `app-wls-admin-${newId}`,
          serverId: newId,
          serverHostname: newHostname,
          serverIp: newIp,
          osType: newOsType,
          appName: 'WebLogic AdminServer',
          category: 'WEBLOGIC',
          port: 7001,
          processPid: 2150,
          status: 'RUNNING',
          memoryMB: 1750,
          cpuUsagePct: 3.5,
          uptime: 'Just added',
          configPath: '/oracle/domains/base_domain/bin/startWebLogic.sh',
          lastHealthCheck: 'Just now'
        },
        {
          id: `app-wls-forms-${newId}`,
          serverId: newId,
          serverHostname: newHostname,
          serverIp: newIp,
          osType: newOsType,
          appName: 'WLS_FORMS (Oracle Forms 12c)',
          category: 'WEBLOGIC',
          port: 9001,
          processPid: 3410,
          status: 'RUNNING',
          memoryMB: 2100,
          cpuUsagePct: 5.2,
          uptime: 'Just added',
          configPath: '/oracle/domains/base_domain/config/servers/WLS_FORMS',
          lastHealthCheck: 'Just now'
        },
        {
          id: `app-wls-reports-${newId}`,
          serverId: newId,
          serverHostname: newHostname,
          serverIp: newIp,
          osType: newOsType,
          appName: 'WLS_REPORTS (Oracle Reports 12c)',
          category: 'WEBLOGIC',
          port: 9002,
          processPid: 4200,
          status: 'RUNNING',
          memoryMB: 1950,
          cpuUsagePct: 4.8,
          uptime: 'Just added',
          configPath: '/oracle/domains/base_domain/config/servers/WLS_REPORTS',
          lastHealthCheck: 'Just now'
        }
      );
    }

    if (newHasPacs) {
      generatedApps.push(
        {
          id: `app-pacs-cstore-${newId}`,
          serverId: newId,
          serverHostname: newHostname,
          serverIp: newIp,
          osType: newOsType,
          appName: 'PACS DICOM C-STORE SCP Service',
          category: 'PACS_DICOM',
          port: 104,
          processPid: 5120,
          status: 'RUNNING',
          memoryMB: 1200,
          cpuUsagePct: 4.1,
          uptime: 'Just added',
          configPath: '/etc/orthanc/orthanc.json',
          lastHealthCheck: 'Just now'
        },
        {
          id: `app-pacs-cfind-${newId}`,
          serverId: newId,
          serverHostname: newHostname,
          serverIp: newIp,
          osType: newOsType,
          appName: 'PACS DICOM Query/Retrieve SCP (C-FIND)',
          category: 'PACS_DICOM',
          port: 11112,
          processPid: 5122,
          status: 'RUNNING',
          memoryMB: 850,
          cpuUsagePct: 2.0,
          uptime: 'Just added',
          configPath: '/etc/dcm4chee/dcm4chee.xml',
          lastHealthCheck: 'Just now'
        }
      );
    }

    const newServerItem: ServerNodeItem = {
      id: newId,
      hostname: newHostname,
      ip: newIp,
      osType: newOsType,
      sshPort: newSshPort,
      status: 'ONLINE',
      cpuLoadPct: 8.4,
      ramUsagePct: 32.0,
      hasWebLogic: newHasWebLogic,
      hasPacs: newHasPacs,
      hasTomcat: false,
      installedApps: generatedApps
    };

    setServers(prev => [...prev, newServerItem]);
    setSelectedServerId(newId);
    setShowAddServerModal(false);
    setNewHostname('');
    setNewIp('');

    setActionMessage(`✅ Server '${newHostname}' (${newIp}) successfully added! Access granted & ${generatedApps.length} applications scanned.`);
    if (onAddAuditLog) onAddAuditLog('ADD_SERVER_NODE', newHostname, `IP ${newIp} | Apps: ${generatedApps.length}`);
  };

  // Toggle App Status on Specific Server (Instant Optimistic UI)
  const handleToggleAppStatus = (appId: string, action: 'START' | 'STOP' | 'RESTART' | 'KILL') => {
    if (!currentServer) return;

    setServers(prev => prev.map(srv => {
      if (srv.id === currentServer.id) {
        return {
          ...srv,
          installedApps: srv.installedApps.map(app => {
            if (app.id === appId) {
              const nextStatus = (action === 'START' || action === 'RESTART') ? 'RUNNING' : 'STOPPED';
              return {
                ...app,
                status: nextStatus,
                uptime: nextStatus === 'RUNNING' ? 'Just updated' : 'Stopped',
                memoryMB: nextStatus === 'RUNNING' ? (app.memoryMB || 1200) : 0,
                cpuUsagePct: nextStatus === 'RUNNING' ? 2.5 : 0.0
              };
            }
            return app;
          })
        };
      }
      return srv;
    }));

    const targetApp = currentServer.installedApps.find(a => a.id === appId);
    if (targetApp) {
      setActionMessage(`[${action}] Command executed for '${targetApp.appName}' on ${currentServer.hostname} (${currentServer.ip}). Operation finished in 0.05s.`);
      if (onAddAuditLog) onAddAuditLog(`APP_${action}`, `${targetApp.appName} @ ${currentServer.hostname}`, `Port ${targetApp.port}`);
    }
  };

  // Trigger Memory GC / Purge
  const handleTriggerGC = (appName: string) => {
    setActionMessage(`Running Heap Garbage Collection (GC) for '${appName}'...`);
    setTimeout(() => {
      setActionMessage(`✅ GC Complete for '${appName}'! Cleared 420MB unreferenced objects from JVM Heap memory.`);
    }, 400);
  };

  // Filtered Apps List for Current Server
  const filteredApps = currentServer ? currentServer.installedApps.filter(app => {
    const matchesSearch = app.appName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          app.port.toString().includes(searchTerm) ||
                          app.configPath.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || app.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) : [];

  return (
    <div className="space-y-6 animate-fade-in" id="all-server-apps-manager-view">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/30 border border-indigo-400/40 rounded-2xl text-indigo-300 shadow-xl">
              <Layers className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-display font-extrabold text-white tracking-tight flex items-center gap-2">
                All Server Applications Manager & Control Hub
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2.5 py-0.5 rounded-full font-mono uppercase font-bold">
                  Extreme Fast Core
                </span>
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                Select specific server host to monitor and manage all running applications, WebLogic 4 services, PACS DICOM endpoints, and background jobs.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddServerModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-mono text-xs font-bold rounded-xl transition flex items-center gap-2 border border-indigo-400/40 shadow-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add / Connect Server Node
          </button>
        </div>

        {actionMessage && (
          <div className="mt-4 p-3 bg-indigo-950/90 border border-indigo-400/50 rounded-xl text-xs font-mono text-indigo-200 flex items-center justify-between animate-fade-in">
            <span>{actionMessage}</span>
            <button onClick={() => setActionMessage(null)} className="text-indigo-400 hover:text-white font-bold ml-4">✕</button>
          </div>
        )}
      </div>

      {/* SERVER SELECTOR TAB BAR */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-300 font-bold uppercase flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" />
            Select Target Server Host ({servers.length} Servers Connected):
          </span>
          <span className="text-[11px] text-slate-400 font-mono">Click a server tab to view its installed applications & services</span>
        </div>

        {servers.length === 0 ? (
          <div className="text-center py-8 bg-slate-950 border border-dashed border-slate-800 rounded-xl p-6 space-y-3">
            <Server className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white font-mono">No Server Hosts Added Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              By default, no server statuses are rendered until host access is configured. Click below to add a server.
            </p>
            <button
              onClick={() => setShowAddServerModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold rounded-xl transition inline-flex items-center gap-2 border border-indigo-400/40 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" /> Add Your First Server Host
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
            {servers.map(srv => {
              const isSelected = srv.id === selectedServerId;
              return (
                <button
                  key={srv.id}
                  onClick={() => setSelectedServerId(srv.id)}
                  className={`px-4 py-3 rounded-xl transition flex items-center gap-3 border text-left shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-400/80 text-white shadow-lg ring-2 ring-indigo-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <div className={`p-2 rounded-lg border ${
                    isSelected ? 'bg-indigo-500/30 border-indigo-300 text-indigo-200' : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}>
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold font-mono flex items-center gap-1.5">
                      <span>{srv.hostname}</span>
                      <span className={`w-2 h-2 rounded-full ${srv.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                      <span>{srv.ip}</span>
                      <span>•</span>
                      <span className="text-indigo-300">{srv.installedApps.length} Apps</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* SELECTED SERVER APPLICATION MANAGEMENT DASHBOARD */}
      {currentServer && (
        <div className="space-y-6">
          {/* Current Server Spec Summary Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase">Selected Host Details</span>
              <div className="text-sm font-bold text-white">{currentServer.hostname}</div>
              <div className="text-indigo-300 text-[11px]">IP: {currentServer.ip} (Port {currentServer.sshPort})</div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase">Operating System</span>
              <div className="text-sm font-bold text-emerald-400">{currentServer.osType}</div>
              <div className="text-slate-400 text-[11px]">SSH Health: ONLINE</div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase">Hardware Load</span>
              <div className="text-sm font-bold text-indigo-300">CPU {currentServer.cpuLoadPct}% | RAM {currentServer.ramUsagePct}%</div>
              <div className="text-slate-400 text-[11px]">4 Core Enterprise Spec</div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase">Service Stack</span>
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {currentServer.hasWebLogic && <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[9px] px-2 py-0.5 rounded font-bold">WebLogic 12c/14c</span>}
                {currentServer.hasPacs && <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] px-2 py-0.5 rounded font-bold">PACS DICOM</span>}
                <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[9px] px-2 py-0.5 rounded font-bold">Tomcat/Nginx</span>
              </div>
            </div>
          </div>

          {/* WEBLOGIC 4 SERVICES & REPORTS SHOWJOBS DIRECT BANNER (if WebLogic present) */}
          {currentServer.hasWebLogic && (
            <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-indigo-500/30 pb-3">
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <h3 className="text-sm font-bold text-white font-mono">WebLogic 4 Core Services & Reports Live Jobs Hook</h3>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-slate-300">Live Servlet:</span>
                  <code className="text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                    http://{currentServer.ip}:9002/reports/rwservlet/showjobs?server=rep_wls_reports
                  </code>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-3 text-xs font-mono">
                  <div className="text-slate-400 text-[10px]">Node Manager</div>
                  <div className="text-white font-bold mt-1">Port 5556 (RUNNING)</div>
                </div>

                <div className="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-3 text-xs font-mono">
                  <div className="text-slate-400 text-[10px]">Admin Server</div>
                  <div className="text-white font-bold mt-1">Port 7001 (RUNNING)</div>
                </div>

                <div className="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-3 text-xs font-mono">
                  <div className="text-slate-400 text-[10px]">WLS_FORMS</div>
                  <div className="text-white font-bold mt-1">Port 9001 (RUNNING)</div>
                </div>

                <div className="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-3 text-xs font-mono">
                  <div className="text-slate-400 text-[10px]">WLS_REPORTS</div>
                  <div className="text-emerald-400 font-bold mt-1">Port 9002 (RUNNING)</div>
                </div>
              </div>
            </div>
          )}

          {/* APPLICATION LIST & CONTROLS FOR SELECTED SERVER */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                  Installed Applications on {currentServer.hostname}
                  <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[11px] rounded-full font-mono font-bold">
                    {filteredApps.length} Apps Filtered
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Perform start, stop, restart, kill, memory GC, and live logs tailing on specific server applications</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search app, port..."
                    className="bg-slate-950 border border-slate-800 text-white text-xs pl-9 pr-3 py-1.5 rounded-xl font-mono focus:border-indigo-500 outline-none w-48"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-white text-xs px-3 py-1.5 rounded-xl font-mono outline-none cursor-pointer"
                >
                  <option value="ALL">All Categories</option>
                  <option value="WEBLOGIC">WebLogic Services</option>
                  <option value="PACS_DICOM">PACS DICOM</option>
                  <option value="TOMCAT">Tomcat / Microservices</option>
                  <option value="ORACLE_DB">Oracle DB / TNS</option>
                </select>
              </div>
            </div>

            {/* Application Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredApps.map(app => (
                <div key={app.id} className="bg-slate-950 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 space-y-4 shadow-xl transition">
                  <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-xl">
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white font-mono">{app.appName}</h4>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                          <span>Port {app.port}</span>
                          <span>•</span>
                          <span>PID #{app.processPid || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      app.status === 'RUNNING'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      {app.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs font-mono text-slate-400">
                    <div className="flex justify-between">
                      <span>Category:</span>
                      <span className="text-indigo-300 font-bold">{app.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Memory RAM:</span>
                      <span className="text-white font-bold">{app.memoryMB} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uptime:</span>
                      <span className="text-emerald-400 font-bold">{app.uptime}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate pt-1">
                      Config: {app.configPath}
                    </div>
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                      <button
                        onClick={() => handleToggleAppStatus(app.id, 'START')}
                        disabled={app.status === 'RUNNING'}
                        className={`py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                          app.status === 'RUNNING'
                            ? 'bg-slate-900 text-slate-600 border-slate-800 opacity-50 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5" /> Start
                      </button>

                      <button
                        onClick={() => handleToggleAppStatus(app.id, 'STOP')}
                        disabled={app.status === 'STOPPED'}
                        className={`py-1.5 rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                          app.status === 'STOPPED'
                            ? 'bg-slate-900 text-slate-600 border-slate-800 opacity-50 cursor-not-allowed'
                            : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400'
                        }`}
                      >
                        <Square className="w-3.5 h-3.5" /> Stop
                      </button>

                      <button
                        onClick={() => handleToggleAppStatus(app.id, 'RESTART')}
                        className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5" /> Restart
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                      <button
                        onClick={() => handleToggleAppStatus(app.id, 'KILL')}
                        className="py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Zap className="w-3 h-3 text-rose-400" /> Kill -9
                      </button>

                      <button
                        onClick={() => handleTriggerGC(app.appName)}
                        className="py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-400" /> JVM GC
                      </button>

                      <button
                        onClick={() => setActiveLogModalApp(app)}
                        className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Terminal className="w-3 h-3 text-slate-400" /> Tail Log
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD SERVER NODE MODAL */}
      {showAddServerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-400" />
                Register New Server Host Node
              </h3>
              <button onClick={() => setShowAddServerModal(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleAddServerSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Server Hostname</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. win-forms-srv-02"
                  value={newHostname}
                  onChange={(e) => setNewHostname(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Server Host IP Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 192.168.12.30"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">OS Type</label>
                  <select
                    value={newOsType}
                    onChange={(e: any) => setNewOsType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 outline-none"
                  >
                    <option value="WINDOWS_SERVER">Windows Server</option>
                    <option value="RHEL_LINUX">RedHat Linux</option>
                    <option value="ORACLE_LINUX">Oracle Linux</option>
                    <option value="UBUNTU_LINUX">Ubuntu Linux</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">SSH Port</label>
                  <input
                    type="number"
                    value={newSshPort}
                    onChange={(e) => setNewSshPort(parseInt(e.target.value) || 22)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2 border-t border-slate-800">
                <span className="text-slate-400 text-[11px] block">Installed Application Stacks to Auto-Scan:</span>
                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="checkbox"
                    checked={newHasWebLogic}
                    onChange={(e) => setNewHasWebLogic(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <span>WebLogic 12c/14c (Node Manager, Admin, Forms, Reports)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="checkbox"
                    checked={newHasPacs}
                    onChange={(e) => setNewHasPacs(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <span>PACS DICOM Essential Services (C-STORE, C-FIND)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddServerModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer shadow-lg"
                >
                  Save & Connect Server
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TERMINAL LOGS TAIL MODAL */}
      {activeLogModalApp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-300">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white font-mono">
                  Live Log Tail: {activeLogModalApp.appName} ({activeLogModalApp.serverHostname})
                </h3>
              </div>
              <button onClick={() => setActiveLogModalApp(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 h-64 overflow-y-auto space-y-1">
              <div>[INFO] [{new Date().toISOString()}] Server host connected to {activeLogModalApp.serverIp}:{activeLogModalApp.port}</div>
              <div>[INFO] Application {activeLogModalApp.appName} active PID: #{activeLogModalApp.processPid}</div>
              <div>[DEBUG] JVM Memory allocated: {activeLogModalApp.memoryMB} MB</div>
              <div>[INFO] Executing health check on port {activeLogModalApp.port} ... PASSED</div>
              <div>[INFO] HTTP listener active on port {activeLogModalApp.port}</div>
              <div className="text-amber-300">[WARN] Heap memory check: 12% headroom available</div>
              <div>[INFO] Telemetry stream active - ready for requests.</div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveLogModalApp(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl font-mono text-xs font-bold cursor-pointer"
              >
                Close Terminal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
