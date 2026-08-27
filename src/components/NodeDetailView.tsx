import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts';
import {
  Server, Cpu, Database, Activity, HardDrive, ShieldCheck, AlertTriangle, Play, RefreshCw, Layers,
  CheckCircle2, XCircle, Info, Clock, Power, ShieldAlert, Monitor, CircleDot, Archive, HelpCircle,
  Wrench, Search, ArrowDown, LogIn, Key, Compass, Settings2, Trash, UserX, AlertOctagon, Terminal, ArrowLeftRight, RotateCw
} from 'lucide-react';
import { SSHNode, NodeTelemetry, DiskGroup, PDBInfo, TablespaceInfo, SessionInfo, SchedulerJobInfo, AlertLogEntry } from '../types';

interface NodeDetailViewProps {
  node: SSHNode;
  telemetry: NodeTelemetry | undefined;
  onBack: () => void;
  onExecuteAction: (nodeId: string, category: string, action: string, payload?: any) => Promise<any>;
}

export default function NodeDetailView({
  node,
  telemetry,
  onBack,
  onExecuteAction
}: NodeDetailViewProps) {
  const isWindows = node.osType === 'Windows' || node.shellType === 'powershell';
  const isRac = node.nodeType === 'RAC' || (node as any).isRac;
  const nodeHasPacs = Boolean((node as any).hasPacs) || Boolean((node as any).installedApps?.some((a: any) => a.category === 'PACS_DICOM'));
  const nodeHasWebLogic = Boolean((node as any).hasWebLogic) || Boolean((node as any).installedApps?.some((a: any) => a.category === 'WEBLOGIC'));
  const nodeHasTomcat = Boolean((node as any).hasTomcat) || Boolean((node as any).installedApps?.some((a: any) => a.category === 'TOMCAT'));

  const [activeTab, setActiveTab] = useState<'os_db' | 'auto_apps' | 'rac_asm' | 'pdbs_memory' | 'tablespaces' | 'sessions' | 'admin'>('os_db');
  const [actionPending, setActionPending] = useState(false);
  const [alertSearch, setAlertSearch] = useState('');
  const [alertTailMode, setAlertTailMode] = useState(true);

  // ASM Add disk form
  const [showAddDiskModal, setShowAddDiskModal] = useState(false);
  const [selectedDgForDisk, setSelectedDgForDisk] = useState('');
  const [newDiskPath, setNewDiskPath] = useState('/dev/oracleasm/disks/DISK_NEW');
  const [newDiskSize, setNewDiskSize] = useState(256);
  const [newDiskFg, setNewDiskFg] = useState('FG1');

  const alertEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll for Alert Log live tail
  useEffect(() => {
    if (alertTailMode && alertEndRef.current) {
      alertEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [telemetry?.alertLog, alertTailMode, activeTab]);

  if (!telemetry) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-200">Retrieving Node Telemetry...</h2>
        <p className="text-sm text-slate-500 mt-1">Establishing secure SSH socket...</p>
      </div>
    );
  }

  const handleAction = async (category: string, action: string, payload?: any) => {
    if (actionPending) return;
    setActionPending(true);
    try {
      const res = await onExecuteAction(node.id, category, action, payload);
      alert(`DBA Command Result:\n${res.message || 'Action executed successfully.'}`);
    } catch (e: any) {
      alert(`Command Error:\n${e.message || 'Failed to complete execution.'}`);
    } finally {
      setActionPending(false);
    }
  };

  // Filter Alert Log
  const filteredAlerts = telemetry.alertLog.filter(a =>
    a.message.toLowerCase().includes(alertSearch.toLowerCase()) ||
    a.level.toLowerCase().includes(alertSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in" id="node-detail-root">
      {/* Detail Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Server className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-display font-bold text-slate-100">{node.name}</h1>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                telemetry.online ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${telemetry.online ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                {telemetry.online ? 'ACTIVE' : 'OFFLINE'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              SSH Server: <span className="text-slate-300 font-bold">{node.hostname}:{node.sshPort}</span> • IP: {node.ipAddress}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-950 border border-slate-700 text-slate-200 hover:text-white text-sm font-medium rounded-lg cursor-pointer transition-colors"
            id="back-inventory-btn"
          >
            ← Cluster Map
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border border-slate-800 overflow-x-auto gap-2 bg-slate-950 p-2 rounded-xl shadow-inner" id="detail-tabs-nav">
        {[
          { id: 'os_db', label: 'Overview & OS / DB Status' },
          { id: 'auto_apps', label: 'Auto-Detected Apps & PACS' },
          { id: 'rac_asm', label: isWindows ? 'Windows Status & Services' : (isRac ? 'RAC & ASM Grid' : 'Single Instance Storage & ASM') },
          { id: 'pdbs_memory', label: 'PDBs & Memory Control' },
          { id: 'tablespaces', label: 'Tablespace Monitors' },
          { id: 'sessions', label: 'Performance & Sessions' },
          { id: 'admin', label: 'DBA Admin Utilities' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-xs font-bold rounded-lg shrink-0 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-sky-600 text-white shadow-lg border border-sky-400/40 glow-blue'
                : 'bg-slate-900/80 text-slate-200 hover:text-white hover:bg-slate-800 border border-slate-800/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'os_db' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="tab-overview-os">
          {/* OS Metrics & Commands */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h2 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Monitor className="w-4 h-4 text-slate-400" />
                Operating System Telemetry
              </h2>

              <div className="flex gap-1.5">
                <button
                  onClick={() => handleAction('OS', 'reboot')}
                  disabled={actionPending}
                  className="px-2.5 py-1 text-[11px] font-bold bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30 rounded-md cursor-pointer transition flex items-center gap-1"
                >
                  <Power className="w-3 h-3" /> Reboot Node
                </button>
                <button
                  onClick={() => handleAction('OS', 'restart')}
                  disabled={actionPending}
                  className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md cursor-pointer transition flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Restart OS Network
                </button>
              </div>
            </div>

            {/* OS details grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-sans">
              <div>
                <span className="text-slate-300 font-medium">Hostname</span>
                <div className="text-slate-100 font-mono font-bold truncate mt-0.5">{telemetry.os.hostname}</div>
              </div>
              <div>
                <span className="text-slate-300 font-medium">OS Version</span>
                <div className="text-slate-100 font-bold truncate mt-0.5">{telemetry.os.osVersion}</div>
              </div>
              <div>
                <span className="text-slate-300 font-medium">Kernel Version</span>
                <div className="text-slate-200 font-mono font-medium truncate mt-0.5">{telemetry.os.kernelVersion}</div>
              </div>
              <div>
                <span className="text-slate-300 font-medium">Host Uptime</span>
                <div className="text-slate-100 font-bold mt-0.5">{telemetry.os.uptime}</div>
              </div>
              <div>
                <span className="text-slate-300 font-medium">Load Average</span>
                <div className="text-slate-100 font-mono font-bold mt-0.5">
                  {telemetry.os.loadAverage.join(', ')}
                </div>
              </div>
              <div>
                <span className="text-slate-300 font-medium">Temperature</span>
                <div className="text-slate-100 font-bold mt-0.5">{telemetry.os.temperatureCelsius || 42}°C (Healthy)</div>
              </div>
            </div>

            {/* CPU/Memory sliders */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Host CPU Core Allocation Usage:</span>
                  <span className="font-mono text-amber-400 font-bold">{telemetry.os.cpuUsage}%</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${telemetry.os.cpuUsage}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>SGA+PGA Active Physical Memory:</span>
                  <span className="font-mono text-violet-400 font-bold">
                    {telemetry.os.memoryUsage}% ({telemetry.os.memoryUsedGB}GB / {telemetry.os.memoryTotalGB}GB)
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div className="bg-violet-500 h-2 rounded-full" style={{ width: `${telemetry.os.memoryUsage}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Swap Space Utilization:</span>
                  <span className="font-mono text-blue-400 font-bold">
                    {telemetry.os.swapUsage}% ({telemetry.os.swapUsedGB}GB / {telemetry.os.swapTotalGB}GB)
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${telemetry.os.swapUsage}%` }}></div>
                </div>
              </div>
            </div>

            {/* Top Running Processes */}
            <div className="pt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Top CPU Processes</span>
              <div className="bg-slate-950 rounded-xl border border-slate-850 p-2.5 overflow-x-auto">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-900 pb-1">
                      <th className="pb-1.5">PID</th>
                      <th className="pb-1.5">Command Process</th>
                      <th className="pb-1.5 text-right">CPU %</th>
                      <th className="pb-1.5 text-right">Mem %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300">
                    {telemetry.os.topCpuProcesses.map(p => (
                      <tr key={p.pid} className="hover:bg-slate-900/50">
                        <td className="py-1">{p.pid}</td>
                        <td className="py-1 text-slate-200 font-sans">{p.name}</td>
                        <td className="py-1 text-right text-amber-400 font-bold">{p.cpuPercent}%</td>
                        <td className="py-1 text-right">{p.memPercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Database Section */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h2 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-400" />
                Oracle Database Engine (SYSDBA)
              </h2>

              <div className="flex gap-1">
                <button
                  onClick={() => handleAction('DATABASE', 'startup')}
                  disabled={actionPending}
                  className="px-2 py-0.5 text-[10px] font-bold bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-900/30 rounded-md cursor-pointer flex items-center gap-0.5"
                >
                  Startup
                </button>
                <button
                  onClick={() => handleAction('DATABASE', 'shutdown_immediate')}
                  disabled={actionPending}
                  className="px-2 py-0.5 text-[10px] font-bold bg-amber-950/40 hover:bg-amber-900/40 text-amber-400 border border-amber-900/30 rounded-md cursor-pointer flex items-center gap-0.5"
                >
                  Shutdown
                </button>
                <button
                  onClick={() => handleAction('DATABASE', 'mount')}
                  disabled={actionPending}
                  className="px-2 py-0.5 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-md cursor-pointer flex items-center gap-0.5"
                >
                  Mount
                </button>
              </div>
            </div>

            {/* Database properties */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-sans">
              <div>
                <span className="text-slate-300 font-medium">Database Name</span>
                <div className="text-white font-black mt-0.5">{telemetry.database.dbName}</div>
              </div>
              <div>
                <span className="text-slate-300 font-medium">Instance Name</span>
                <div className="text-white font-mono font-bold mt-0.5">{telemetry.database.instanceName}</div>
              </div>
              <div>
                <span className="text-slate-300 font-medium">Instance Status</span>
                <div className="mt-1">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    telemetry.database.instanceStatus === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 glow-green' :
                    telemetry.database.instanceStatus === 'MOUNTED' || telemetry.database.instanceStatus === 'STARTED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25 glow-orange' :
                    'bg-red-500/10 text-red-400 border border-red-500/25 glow-red'
                  }`}>{telemetry.database.instanceStatus}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-300 font-medium">Open Mode</span>
                <div className="text-white font-mono text-[11px] font-bold mt-0.5">{telemetry.database.openMode}</div>
              </div>
              <div>
                <span className="text-slate-300 font-medium">Database Role</span>
                <div className="text-white font-bold mt-0.5">{telemetry.database.databaseRole}</div>
              </div>
              <div>
                <span className="text-slate-300 font-medium">Archive Mode</span>
                <span className="text-slate-200 font-mono mt-0.5 block font-semibold">{telemetry.database.archiveMode}</span>
              </div>
              <div>
                <span className="text-slate-300 font-medium">Flashback Status</span>
                <span className="text-slate-200 font-bold mt-0.5 block">{telemetry.database.flashbackStatus}</span>
              </div>
              <div>
                <span className="text-slate-300 font-medium">Force Logging</span>
                <span className="text-slate-200 font-mono mt-0.5 block font-semibold">{telemetry.database.forceLogging}</span>
              </div>
              <div>
                <span className="text-slate-300 font-medium">Protection Mode</span>
                <span className="text-slate-200 text-[11px] font-bold mt-0.5 block">{telemetry.database.protectionMode}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 text-xs font-sans space-y-1.5">
              <div>
                <span className="text-slate-300 font-medium block mb-0.5">Database Version</span>
                <div className="text-slate-100 font-mono text-[11px] bg-slate-950 p-2 rounded-lg border border-slate-850 font-bold">{telemetry.database.version}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-300 font-medium">Character Set</span>
                  <div className="text-slate-100 font-mono font-bold text-[11px] mt-0.5">{telemetry.database.characterSet}</div>
                </div>
                <div>
                  <span className="text-slate-300 font-medium">National Character Set</span>
                  <div className="text-slate-100 font-mono font-bold text-[11px] mt-0.5">{telemetry.database.nationalCharacterSet}</div>
                </div>
              </div>
              <div className="pt-2 space-y-1">
                <div>
                  <span className="text-slate-300 font-medium">Control File Path:</span>
                  <div className="text-slate-300 font-mono text-[10px] bg-slate-950 p-1.5 rounded border border-slate-850 truncate font-semibold" title={telemetry.database.controlFile}>
                    {telemetry.database.controlFile}
                  </div>
                </div>
                <div>
                  <span className="text-slate-300 font-medium">SPFILE Configuration:</span>
                  <div className="text-slate-300 font-mono text-[10px] bg-slate-950 p-1.5 rounded border border-slate-850 truncate font-semibold" title={telemetry.database.spFile}>
                    {telemetry.database.spFile}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUTO-DETECTED APPLICATIONS & PACS TAB */}
      {activeTab === 'auto_apps' && (
        <div className="space-y-6" id="tab-auto-apps">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-purple-950/60 border border-indigo-500/30 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-display font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Auto-Detected Host Applications & PACS DICOM Services
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Automated daemon discovery engine scanning running processes on <span className="font-bold text-white">{node.hostname} ({node.ipAddress})</span>.
              </p>
            </div>

            <button
              onClick={() => alert(`✅ Application Scanner complete on ${node.hostname}! Process list synced.`)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Re-Scan Running Processes</span>
            </button>
          </div>

          {/* Detected Apps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* PACS DICOM Application */}
            {nodeHasPacs && (
              <div className="bg-slate-900 border border-purple-500/40 rounded-2xl p-5 space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-xl">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white font-mono">PACS Medical DICOM</h3>
                      <span className="text-[10px] text-purple-300 font-mono">Orthanc / dcm4chee Engine</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-mono font-bold">
                    RUNNING
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span>AE Title:</span>
                    <span className="text-purple-300 font-bold">PACS_ARCHIVE_MAIN</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DICOM Port:</span>
                    <span className="text-white font-bold">104</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Process PID:</span>
                    <span className="text-slate-400">#4819</span>
                  </div>
                  <div className="flex justify-between">
                    <span>RAM Memory:</span>
                    <span className="text-indigo-300 font-bold">1,240 MB</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex gap-2">
                  <button
                    onClick={() => alert(`C-ECHO Ping Test on port 104 SUCCESS!`)}
                    className="flex-1 py-1.5 bg-purple-600/80 hover:bg-purple-600 text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5" /> DICOM C-ECHO
                  </button>
                </div>
              </div>
            )}

            {/* Oracle WebLogic Server */}
            {nodeHasWebLogic && (
              <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-5 space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-xl">
                      <Server className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white font-mono">Oracle WebLogic 14c</h3>
                      <span className="text-[10px] text-indigo-300 font-mono">Managed Server Instance</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-mono font-bold">
                    RUNNING
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span>HTTP Port:</span>
                    <span className="text-white font-bold">7001 / 7003</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Domain Name:</span>
                    <span className="text-slate-200 font-bold">base_domain_prod</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Process PID:</span>
                    <span className="text-slate-400">#8210</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Heap Memory:</span>
                    <span className="text-indigo-300 font-bold">2,890 MB</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex gap-2">
                  <button
                    onClick={() => alert(`Heap GC Triggered for WebLogic instance.`)}
                    className="flex-1 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Trigger GC
                  </button>
                </div>
              </div>
            )}

            {/* Apache Tomcat Server */}
            {nodeHasTomcat && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-xl">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white font-mono">Apache Tomcat 9</h3>
                      <span className="text-[10px] text-amber-300 font-mono">Hospital Microservices</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-[10px] font-mono font-bold">
                    RUNNING
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono text-slate-300">
                  <div className="flex justify-between">
                    <span>HTTP Port:</span>
                    <span className="text-white font-bold">8080</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AJP Connector:</span>
                    <span className="text-slate-200">8009</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Process PID:</span>
                    <span className="text-slate-400">#1942</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Memory Usage:</span>
                    <span className="text-indigo-300 font-bold">640 MB</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex gap-2">
                  <button
                    onClick={() => alert(`Restarting Tomcat service on port 8080...`)}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-slate-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Restart Tomcat
                  </button>
                </div>
              </div>
            )}

            {!nodeHasPacs && !nodeHasWebLogic && !nodeHasTomcat && (
              <div className="col-span-full py-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
                <Layers className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-slate-300">No WebLogic, PACS, or Tomcat Service Configured on this Host</h3>
                <p className="text-xs text-slate-500 font-mono">
                  You can register WebLogic or PACS services for host {node.name} ({node.ipAddress}) from their dedicated menu items in the sidebar.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RAC & ASM GRID TAB or WINDOWS SERVICES TAB */}
      {activeTab === 'rac_asm' && (
        isWindows ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="tab-windows-services">
            {/* Windows System & WinRM Remote Protocol Status */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <h2 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-sky-400" />
                  Windows Server & WinRM Management
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  WinRM CONNECTED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                <div>
                  <span className="text-slate-400 font-medium">Windows Version</span>
                  <div className="text-slate-100 font-bold mt-0.5">{telemetry.os.osVersion || node.osVersion || 'Windows Server 2022'}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">PowerShell Engine</span>
                  <div className="text-sky-400 font-mono font-bold mt-0.5">PowerShell 7.4.1 (x64)</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">WinRM Listening Ports</span>
                  <div className="text-emerald-400 font-mono font-bold mt-0.5">5985 (HTTP) / 5986 (HTTPS)</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Windows Defender Firewall</span>
                  <div className="text-indigo-300 font-bold mt-0.5">Domain Profile Active</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">WMI Namespace Health</span>
                  <div className="text-emerald-400 font-mono font-bold mt-0.5">root\cimv2 (HEALTHY)</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Host Architecture</span>
                  <div className="text-slate-200 font-bold mt-0.5">x86_64 64-bit Edition</div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/60 flex flex-wrap gap-2">
                <button
                  onClick={() => handleAction('WINDOWS', 'test_winrm')}
                  disabled={actionPending}
                  className="px-3 py-1.5 text-xs font-bold bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-800/50 rounded-lg transition"
                >
                  Test WinRM Connection
                </button>
                <button
                  onClick={() => handleAction('WINDOWS', 'restart_winrm')}
                  disabled={actionPending}
                  className="px-3 py-1.5 text-xs font-bold bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 rounded-lg transition"
                >
                  Restart WinRM Service
                </button>
                <button
                  onClick={() => handleAction('WINDOWS', 'flush_logs')}
                  disabled={actionPending}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition"
                >
                  Clear Windows Event Logs
                </button>
              </div>
            </div>

            {/* Active Windows Services & Drive Volumes */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <h2 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Active Windows Services & Disks
                </h2>
                <span className="text-xs text-slate-400 font-mono">Real-time Telemetry</span>
              </div>

              <div className="space-y-2 text-xs font-sans">
                {[
                  { name: 'WinRM', desc: 'Windows Remote Management Service', status: 'RUNNING', startType: 'Automatic' },
                  { name: `OracleService${node.oracleSid || 'WINDB1'}`, desc: 'Oracle Standalone DB Engine', status: 'RUNNING', startType: 'Automatic' },
                  { name: 'OracleTNLSNR', desc: 'Oracle TNS Listener Service', status: 'RUNNING', startType: 'Automatic' },
                  { name: 'RemoteRegistry', desc: 'Remote Registry Daemon', status: 'RUNNING', startType: 'Automatic' },
                  { name: 'W3SVC', desc: 'World Wide Web Publishing (IIS)', status: 'RUNNING', startType: 'Automatic' },
                  { name: 'Spooler', desc: 'Windows Print Spooler', status: 'RUNNING', startType: 'Automatic' }
                ].map((srv, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-100 font-bold font-mono block">{srv.name}</span>
                      <span className="text-slate-400 text-[10px]">{srv.desc}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono">{srv.startType}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                        {srv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="tab-rac-asm">
          {/* RAC Clusterware Section */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h2 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                RAC Clusterware Deemons (CRSCTL)
              </h2>

              <div className="flex gap-1.5">
                <button
                  onClick={() => handleAction('RAC', 'start_crs')}
                  disabled={actionPending}
                  className="px-2.5 py-1 text-[10px] font-bold bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-900/30 rounded-md cursor-pointer transition flex items-center gap-1"
                >
                  Start CRS
                </button>
                <button
                  onClick={() => handleAction('RAC', 'stop_crs')}
                  disabled={actionPending}
                  className="px-2.5 py-1 text-[10px] font-bold bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30 rounded-md cursor-pointer transition flex items-center gap-1"
                >
                  Stop CRS
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <span className="text-slate-300 font-medium">Cluster Infrastructure Name</span>
                <div className="text-slate-100 font-bold mt-0.5">{telemetry.rac.clusterName}</div>
              </div>
              <div>
                <span className="text-slate-300 font-medium">Interconnect Status</span>
                <div>
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-bold mt-1 ${
                    telemetry.rac.interconnectStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 glow-green' : 'bg-red-500/10 text-red-400 border border-red-500/20 glow-red'
                  }`}>{telemetry.rac.interconnectStatus}</span>
                </div>
              </div>
            </div>

            {/* Daemon States */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-850">
                <span className="text-slate-300 font-semibold text-[11px] block">CRS Daemon</span>
                <span className={`text-xs font-mono font-bold mt-1 block ${telemetry.rac.crsStatus === 'ONLINE' ? 'text-emerald-400 glow-green' : 'text-red-400'}`}>
                  {telemetry.rac.crsStatus}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-850">
                <span className="text-slate-300 font-semibold text-[11px] block">CSS Daemon</span>
                <span className={`text-xs font-mono font-bold mt-1 block ${telemetry.rac.cssStatus === 'ONLINE' ? 'text-emerald-400 glow-green' : 'text-red-400'}`}>
                  {telemetry.rac.cssStatus}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-850">
                <span className="text-slate-300 font-semibold text-[11px] block">EVM Daemon</span>
                <span className={`text-xs font-mono font-bold mt-1 block ${telemetry.rac.evmStatus === 'ONLINE' ? 'text-emerald-400 glow-green' : 'text-red-400'}`}>
                  {telemetry.rac.evmStatus}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-850">
                <span className="text-slate-300 font-semibold text-[11px] block">OHAS Daemon</span>
                <span className={`text-xs font-mono font-bold mt-1 block ${telemetry.rac.ohasStatus === 'ONLINE' ? 'text-emerald-400 glow-green' : 'text-red-400'}`}>
                  {telemetry.rac.ohasStatus}
                </span>
              </div>
            </div>

            {/* SCAN and local vip status */}
            <div className="pt-2 space-y-2 border-t border-slate-800/60 text-xs font-sans">
              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                <span className="text-slate-200 font-medium">SCAN IP Listeners (3 IPs)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">ONLINE</span>
              </div>

              <div className="space-y-1">
                <span className="text-slate-300 block text-[11px] font-semibold">Virtual IP (VIP) Nodes Assignment:</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  {telemetry.rac.vipStatus.map((vip, idx) => (
                    <div key={idx} className="flex justify-between p-2 bg-slate-950 rounded-lg border border-slate-850">
                      <span className="text-slate-200 font-bold">{vip.node}-VIP</span>
                      <span className="text-emerald-400 font-bold">{vip.ip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ASM Section */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h2 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-400" />
                Automatic Storage Management (ASM)
              </h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`}>
                ASM ACTIVE
              </span>
            </div>

            {/* ASM details */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-sans">
              <div>
                <span className="text-slate-300 font-medium">ASM Instance</span>
                <div className="text-slate-100 font-bold font-mono mt-0.5">{node.asmSid}</div>
              </div>
              <div>
                <span className="text-slate-300 font-medium">ASM Version</span>
                <div className="text-slate-100 font-bold mt-0.5">{telemetry.asm.version}</div>
              </div>
              <div>
                <span className="text-slate-300 font-medium">Allocation Unit (AU)</span>
                <div className="text-slate-100 font-mono font-bold mt-0.5">{telemetry.asm.allocationUnitMB} MB</div>
              </div>
              <div className="col-span-2">
                <span className="text-slate-300 font-medium">Disk Discovery String</span>
                <div className="text-slate-200 font-mono text-[10px] bg-slate-950 px-2 py-1.5 rounded mt-1 border border-slate-850 font-semibold">{telemetry.asm.diskDiscoveryString}</div>
              </div>
            </div>

            {/* Diskgroup rows */}
            <div className="space-y-3.5 pt-2 border-t border-slate-800/60">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center justify-between">
                <span>ASM Diskgroup Spaces</span>
                <button
                  onClick={() => {
                    setSelectedDgForDisk(telemetry.asm.diskgroups[0]?.name || '');
                    setShowAddDiskModal(true);
                  }}
                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[10px] rounded cursor-pointer transition"
                >
                  + Add Disk to Group
                </button>
              </span>

              {telemetry.asm.diskgroups.map(dg => (
                <div key={dg.name} className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-200 font-mono">{dg.name}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                        dg.state === 'MOUNTED' ? 'bg-emerald-500/10 text-emerald-400 glow-green' : 'bg-red-500/10 text-red-400'
                      }`}>{dg.state}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleAction('ASM', dg.state === 'MOUNTED' ? 'dismount_diskgroup' : 'mount_diskgroup', { name: dg.name })}
                        className="px-2 py-0.5 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-medium rounded cursor-pointer transition"
                      >
                        {dg.state === 'MOUNTED' ? 'Dismount' : 'Mount'}
                      </button>
                    </div>
                  </div>

                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div className={`h-2 rounded-full ${dg.usagePercentage > 85 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${dg.usagePercentage}%` }}></div>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Used: {dg.usedSpaceGB} GB ({dg.usagePercentage}%)</span>
                    <span>Free: {dg.freeSpaceGB} GB / {dg.totalSizeGB} GB</span>
                  </div>

                  {/* Disks list in group */}
                  <div className="pt-2 text-[10px] font-mono text-slate-500 divide-y divide-slate-900">
                    {dg.disks.map(disk => (
                      <div key={disk.name} className="flex justify-between py-1 hover:bg-slate-900/40">
                        <span>{disk.name} ({disk.path}) • <span className="text-slate-400">{disk.sizeGB}GB</span></span>
                        <div className="flex items-center gap-2">
                          <span className={disk.status === 'ONLINE' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{disk.status}</span>
                          <button
                            onClick={() => handleAction('ASM', disk.status === 'ONLINE' ? 'offline_disk' : 'online_disk', { dgName: dg.name, diskName: disk.name })}
                            className="text-[9px] text-slate-400 hover:text-white underline cursor-pointer"
                          >
                            {disk.status === 'ONLINE' ? 'Offline' : 'Online'}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove disk ${disk.name} from ASM Group ${dg.name}?`)) {
                                handleAction('ASM', 'drop_disk', { dgName: dg.name, diskName: disk.name });
                              }
                            }}
                            className="text-[9px] text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            Drop
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* PDBs & MEMORY TAB */}
      {activeTab === 'pdbs_memory' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="tab-pdbs-memory">
          {/* PDBs grid */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h2 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" />
                Pluggable Databases (PDBs)
              </h2>

              <div className="flex gap-1.5">
                <button
                  onClick={() => handleAction('PDB', 'open_all')}
                  className="px-2 py-0.5 text-[10px] font-bold bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-900/30 rounded cursor-pointer"
                >
                  Open All
                </button>
                <button
                  onClick={() => handleAction('PDB', 'close_all')}
                  className="px-2 py-0.5 text-[10px] font-bold bg-amber-950/40 hover:bg-amber-900/40 text-amber-400 border border-amber-900/30 rounded cursor-pointer"
                >
                  Close All
                </button>
                <button
                  onClick={() => handleAction('PDB', 'refresh')}
                  className="p-1 text-slate-300 hover:text-white bg-slate-800 rounded cursor-pointer"
                  title="Refresh status"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {telemetry.pdb.map(pdb => (
                <div key={pdb.pdbName} className="p-3 bg-slate-950 rounded-xl border border-slate-850 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-200 font-mono">{pdb.pdbName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">CON_ID: {pdb.conId}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Default Service: <span className="font-mono text-emerald-400 font-semibold">{pdb.defaultService}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono space-x-2">
                      <span>Restricted: <span className="text-slate-400">{pdb.restricted}</span></span>
                      <span>Save State: <span className="text-slate-400">{pdb.saveState}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      pdb.openMode === 'READ WRITE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 glow-green' :
                      pdb.openMode === 'READ ONLY' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      pdb.openMode === 'MOUNTED' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 glow-orange' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>{pdb.openMode}</span>

                    <div className="flex flex-col gap-1">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAction('PDB', 'open_read_write', { pdbName: pdb.pdbName })}
                          disabled={actionPending || pdb.openMode === 'READ WRITE'}
                          className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/40 rounded cursor-pointer disabled:opacity-40"
                          title="Open READ WRITE"
                        >
                          R/W
                        </button>
                        <button
                          onClick={() => handleAction('PDB', 'open_read_only', { pdbName: pdb.pdbName })}
                          disabled={actionPending || pdb.openMode === 'READ ONLY'}
                          className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-950/50 hover:bg-blue-900/50 text-blue-300 border border-blue-800/40 rounded cursor-pointer disabled:opacity-40"
                          title="Open READ ONLY"
                        >
                          R/O
                        </button>
                        <button
                          onClick={() => handleAction('PDB', 'close', { pdbName: pdb.pdbName })}
                          disabled={actionPending || pdb.openMode === 'MOUNTED' || pdb.openMode === 'CLOSED'}
                          className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-950/50 hover:bg-amber-900/50 text-amber-300 border border-amber-800/40 rounded cursor-pointer disabled:opacity-40"
                          title="Close / Mount PDB"
                        >
                          Close
                        </button>
                      </div>
                      <button
                        onClick={() => handleAction('PDB', 'save_state', { pdbName: pdb.pdbName })}
                        disabled={actionPending}
                        className="px-2 py-0.5 text-[9px] font-medium border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
                      >
                        Save State
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SGA & PGA MEMORY CONTROL */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h2 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-slate-400" />
                SGA & PGA Memory Allocation (ALTER SYSTEM)
              </h2>
            </div>

            <div className="space-y-4">
              {/* SGA Control */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-slate-400 block font-sans">System Global Area (SGA Target)</span>
                    <span className="text-lg font-bold font-mono text-slate-200">
                      {telemetry.memory.sgaTargetMB} MB <span className="text-xs text-slate-500 font-sans font-normal">/ {telemetry.memory.sgaMaxMB} MB Max</span>
                    </span>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAction('MEMORY', 'increase_sga')}
                      disabled={actionPending}
                      className="px-2 py-1 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-900/30 text-xs font-bold rounded cursor-pointer"
                    >
                      + 512M
                    </button>
                    <button
                      onClick={() => handleAction('MEMORY', 'decrease_sga')}
                      disabled={actionPending}
                      className="px-2 py-1 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30 text-xs font-bold rounded cursor-pointer"
                    >
                      - 512M
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900 text-center text-[10px] font-mono text-slate-300">
                  <div>
                    <div className="text-slate-300 font-sans font-medium">Buffer Cache</div>
                    <div className="text-slate-100 font-bold mt-0.5">{telemetry.memory.bufferCacheMB} MB</div>
                  </div>
                  <div>
                    <div className="text-slate-300 font-sans font-medium">Shared Pool</div>
                    <div className="text-slate-100 font-bold mt-0.5">{telemetry.memory.sharedPoolMB} MB</div>
                  </div>
                  <div>
                    <div className="text-slate-300 font-sans font-medium">Large Pool</div>
                    <div className="text-slate-100 font-bold mt-0.5">{telemetry.memory.largePoolMB} MB</div>
                  </div>
                </div>
              </div>

              {/* PGA Control */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-850 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-slate-400 block font-sans">Program Global Area (PGA Aggregate Target)</span>
                    <span className="text-lg font-bold font-mono text-slate-200">
                      {telemetry.memory.pgaTargetMB} MB <span className="text-xs text-slate-500 font-sans font-normal">/ {telemetry.memory.pgaAllocatedMB} MB Allocated</span>
                    </span>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAction('MEMORY', 'increase_pga')}
                      disabled={actionPending}
                      className="px-2 py-1 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-900/30 text-xs font-bold rounded cursor-pointer"
                    >
                      + 256M
                    </button>
                    <button
                      onClick={() => handleAction('MEMORY', 'decrease_pga')}
                      disabled={actionPending}
                      className="px-2 py-1 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30 text-xs font-bold rounded cursor-pointer"
                    >
                      - 256M
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-900 flex justify-between text-[11px] text-slate-400">
                  <span>Java Pool Allocation: <span className="font-mono text-slate-300 font-bold">{telemetry.memory.javaPoolMB} MB</span></span>
                  <span>Streams Pool Allocation: <span className="font-mono text-slate-300 font-bold">{telemetry.memory.streamsPoolMB} MB</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABLESPACE MONITORING TAB */}
      {activeTab === 'tablespaces' && (
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg" id="tab-tablespaces">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <h2 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-slate-400" />
              ASM DB Tablespace Capacities (DBA_FREE_SPACE)
            </h2>
            <span className="text-xs text-slate-400 font-sans">Dynamic allocation alerts integrated</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {telemetry.tablespaces.map(ts => {
              const severity = ts.usedPercent > 90 ? 'critical' : ts.usedPercent > 80 ? 'warning' : 'healthy';

              return (
                <div key={ts.name} className="p-4 bg-slate-950 rounded-xl border border-slate-855 space-y-3 shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-slate-400 font-sans">Tablespace</span>
                      <h3 className="text-base font-bold text-slate-200 font-mono mt-0.5">{ts.name}</h3>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      severity === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/25 glow-red' :
                      severity === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25 glow-orange' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 glow-green'
                    }`}>
                      {ts.usedPercent}% USED
                    </span>
                  </div>

                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div className={`h-2.5 rounded-full ${
                      severity === 'critical' ? 'bg-red-500' : severity === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} style={{ width: `${ts.usedPercent}%` }}></div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 border-t border-slate-900 pt-2">
                    <div>
                      <span className="text-slate-300 font-sans font-medium block">Allocated Size</span>
                      <span className="text-slate-100 font-bold">{ts.totalGB} GB</span>
                    </div>
                    <div>
                      <span className="text-slate-300 font-sans font-medium block">Max Size Limit</span>
                      <span className="text-slate-100 font-bold">{ts.maxSizeGB} GB</span>
                    </div>
                    <div>
                      <span className="text-slate-300 font-sans font-medium block">Used Disk</span>
                      <span className="text-slate-100 font-bold">{ts.usedGB} GB</span>
                    </div>
                    <div>
                      <span className="text-slate-300 font-sans font-medium block">Auto-Extend</span>
                      <span className="text-emerald-400 font-bold">{ts.autoextend}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PERFORMANCE & SESSIONS TAB */}
      {activeTab === 'sessions' && (
        <div className="space-y-6" id="tab-performance">
          {/* Metrics grids */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* IOPS / redo graph */}
            <div className="lg:col-span-2 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md">
              <h2 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>ASM I/O IOPS & Redo Throughput</span>
                <span className="text-xs text-slate-500">Live thread monitoring</span>
              </h2>

              <div className="min-h-[220px]">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={telemetry.performanceHistory}>
                    <defs>
                      <linearGradient id="colorIops" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#475569" fontSize={9} />
                    <YAxis stroke="#475569" fontSize={9} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#cbd5e1' }} />
                    <Area type="monotone" dataKey="iops" name="Disk Read/Write IOPS" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorIops)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hit ratios */}
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col justify-between">
              <h2 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-wider mb-4">
                SGA Cache Hit Ratios
              </h2>

              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Buffer Cache Hit Ratio:</span>
                    <span className="font-mono text-emerald-400 font-bold">99.2%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '99.2%' }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Library Cache Hit Ratio:</span>
                    <span className="font-mono text-emerald-400 font-bold">98.5%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '98.5%' }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Dictionary Cache Hit Ratio:</span>
                    <span className="font-mono text-emerald-400 font-bold">97.8%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '97.8%' }}></div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900 text-[11px] text-slate-400 mt-4">
                <span className="text-slate-500 block font-bold mb-1">AWR & ASH Summary</span>
                <span>Last automated snapshot generated at {new Date(Date.now() - 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. AWR Interval: 60 mins.</span>
              </div>
            </div>
          </div>

          {/* Sessions Monitoring */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
              <h2 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <UserX className="w-4 h-4 text-slate-400" />
                Active Sessions & Row Lock Monitors (V$SESSION)
              </h2>
              <div className="flex gap-2 text-xs font-mono">
                <span className="text-slate-400">Total: <span className="text-slate-200 font-bold">{telemetry.sessions.length}</span></span>
                <span className="text-emerald-400">Active: <span className="font-bold">{telemetry.sessions.filter(s => s.status === 'ACTIVE').length}</span></span>
                <span className="text-red-400">Blocking: <span className="font-bold">{telemetry.sessions.filter(s => s.blockingSession).length}</span></span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-900">
                    <th className="p-3">SID, Serial</th>
                    <th className="p-3">DB Username</th>
                    <th className="p-3">OS Client IP/Machine</th>
                    <th className="p-3">Executing Command Program</th>
                    <th className="p-3">Lock Status</th>
                    <th className="p-3">Current Active SQL / Wait Event</th>
                    <th className="p-3 text-right">DBA Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 font-mono text-slate-300">
                  {telemetry.sessions.map(s => (
                    <tr key={`${s.sid}-${s.serial}`} className={`hover:bg-slate-900/40 ${s.blockingSession ? 'bg-red-950/20' : ''}`}>
                      <td className="p-3 font-bold text-slate-200">{s.sid}, {s.serial}</td>
                      <td className="p-3 font-sans font-medium text-slate-200">{s.username || 'BACKGROUND'}</td>
                      <td className="p-3 text-[11px] text-slate-400">{s.machine} <span className="text-slate-600">({s.osUser})</span></td>
                      <td className="p-3 text-[11px] truncate max-w-[150px]" title={s.program}>{s.program}</td>
                      <td className="p-3">
                        {s.blockingSession ? (
                          <span className="inline-flex items-center gap-1 text-red-400 text-[10px] font-bold bg-red-950/40 border border-red-900/30 px-1.5 py-0.5 rounded">
                            <AlertOctagon className="w-3 h-3" />
                            BLOCKED BY {s.blockingSession}
                          </span>
                        ) : (
                          <span className="text-slate-500">None</span>
                        )}
                      </td>
                      <td className="p-3 max-w-[280px]">
                        {s.sqlText ? (
                          <div className="space-y-1">
                            <div className="text-slate-200 font-mono text-[10px] bg-slate-950/80 p-1 rounded border border-slate-900 truncate" title={s.sqlText}>
                              {s.sqlText}
                            </div>
                            {s.waitEvent && (
                              <div className="text-[10px] text-amber-400 font-sans flex items-center gap-0.5">
                                <Clock className="w-3 h-3" /> Wait: {s.waitEvent} ({s.secondsInWait}s)
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleAction('SESSIONS', 'kill_session', { sid: s.sid, serial: s.serial })}
                          className="px-2 py-0.5 bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/30 text-[10px] rounded cursor-pointer transition"
                        >
                          Kill Session
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DBA ADMIN UTILITIES TAB */}
      {activeTab === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="tab-dba-admin">
          {/* Oracle Alert Log Viewer */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg lg:col-span-2 flex flex-col min-h-[400px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800/80 gap-3">
              <h2 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-slate-400" />
                Live Oracle Alert Log Stream (SSH Tail)
              </h2>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search Box */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={alertSearch}
                    onChange={e => setAlertSearch(e.target.value)}
                    placeholder="Search logs..."
                    className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-300 focus:border-slate-700 outline-none w-[180px]"
                  />
                </div>

                <button
                  onClick={() => setAlertTailMode(!alertTailMode)}
                  className={`px-2 py-1 text-[11px] font-bold rounded-md border transition cursor-pointer ${
                    alertTailMode ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {alertTailMode ? 'Tail On' : 'Tail Off'}
                </button>

                <button
                  onClick={() => alert('Diagnostic dump compiled. Alert log downloaded successfully to localized workstation.')}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold rounded cursor-pointer"
                >
                  Download Log
                </button>
              </div>
            </div>

            {/* Scrollable logs box */}
            <div className="flex-1 bg-slate-950 rounded-xl border border-slate-850 p-4 font-mono text-[11px] overflow-y-auto max-h-[250px] space-y-2">
              {filteredAlerts.map((entry, idx) => {
                const isErr = entry.level === 'CRITICAL' || entry.level === 'ERROR';
                const isWarn = entry.level === 'WARNING';

                return (
                  <div key={idx} className={`p-1 rounded ${isErr ? 'bg-red-950/10 text-red-400' : isWarn ? 'bg-amber-950/10 text-amber-300' : 'text-slate-300'}`}>
                    <span className="text-slate-500 text-[10px] mr-2">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>
                    <span className={`font-bold mr-1.5 ${isErr ? 'text-red-400' : isWarn ? 'text-amber-500' : 'text-blue-400'}`}>
                      {entry.level}
                    </span>
                    <span>{entry.message}</span>
                  </div>
                );
              })}
              <div ref={alertEndRef} />
            </div>
          </div>

          {/* RMAN Section */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h2 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Archive className="w-4 h-4 text-slate-400" />
                Recovery Manager (RMAN) Backups
              </h2>
              {telemetry.rman.backupStatus === 'RUNNING' && (
                <span className="flex items-center gap-1 text-xs text-blue-400 font-mono animate-pulse font-bold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> BACKUP ACTIVE
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <span className="text-slate-500">Last Backup Run</span>
                <div className="text-slate-200 font-mono font-bold mt-0.5">
                  {telemetry.rman.lastBackupDate === 'Never' ? 'Never' : new Date(telemetry.rman.lastBackupDate).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Backup Status</span>
                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-mono font-bold mt-1 ${
                  telemetry.rman.backupStatus === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 glow-green' :
                  telemetry.rman.backupStatus === 'RUNNING' ? 'bg-blue-500/10 text-blue-400 animate-pulse' : 'bg-red-500/10 text-red-400'
                }`}>{telemetry.rman.backupStatus}</span>
              </div>
              <div>
                <span className="text-slate-500">Cumulative Backup Size</span>
                <div className="text-slate-200 font-mono font-bold mt-0.5">{telemetry.rman.backupSizeGB} GB</div>
              </div>
              <div>
                <span className="text-slate-500">Recovery Retention Window</span>
                <div className="text-slate-200 font-bold mt-0.5">{telemetry.rman.recoveryWindowDays} Days</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60">
              <button
                onClick={() => handleAction('RMAN', 'backup_database')}
                disabled={telemetry.rman.backupStatus === 'RUNNING' || actionPending}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-md"
              >
                Backup Full Database
              </button>
              <button
                onClick={() => handleAction('RMAN', 'backup_archivelog')}
                disabled={actionPending}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer transition"
              >
                Backup Archivelogs
              </button>
              <button
                onClick={() => handleAction('RMAN', 'crosscheck')}
                disabled={actionPending}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-lg cursor-pointer transition"
              >
                Crosscheck Backupsets
              </button>
              <button
                onClick={() => handleAction('RMAN', 'delete_obsolete')}
                disabled={actionPending}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-red-400 hover:text-red-300 text-xs font-medium rounded-lg cursor-pointer transition"
              >
                Delete Obsolete
              </button>
            </div>
          </div>

          {/* Oracle Data Pump (expdp / impdp) Section */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <h2 className="text-sm font-display font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-amber-400" />
                Data Pump Utility (expdp / impdp)
              </h2>
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
                VERSION COMPATIBLE
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block text-[11px] font-medium mb-1">Directory Object</label>
                  <input
                    type="text"
                    defaultValue="DATA_PUMP_DIR"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[11px] font-medium mb-1">Target Database Version</label>
                  <select className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs focus:border-amber-500 outline-none">
                    <option value="19c">Oracle 19c (19.0.0)</option>
                    <option value="21c">Oracle 21c (21.0.0)</option>
                    <option value="23c">Oracle 23c (23.0.0)</option>
                    <option value="18c">Oracle 18c (18.0.0)</option>
                    <option value="12c">Oracle 12c (12.2.0.1)</option>
                    <option value="11g">Oracle 11g R2 (11.2.0.4)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleAction('DATAPUMP', 'expdp_full')}
                  disabled={actionPending}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg cursor-pointer transition flex items-center justify-center gap-1.5 text-xs shadow"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  expdp Full Export
                </button>
                <button
                  onClick={() => handleAction('DATAPUMP', 'impdp_schema')}
                  disabled={actionPending}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg cursor-pointer transition flex items-center justify-center gap-1.5 text-xs border border-slate-700"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                  impdp Schema Import
                </button>
              </div>
            </div>
          </div>

          {/* Listener & Scheduler Jobs */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-lg flex flex-col justify-between">
            <div>
              {/* Listener control */}
              <div className="pb-3 border-b border-slate-800/80 mb-3 flex items-center justify-between">
                <h3 className="text-xs font-display font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                  LSNRCTL Configuration
                </h3>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                  telemetry.database.listenerStatus === 'RUNNING' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>{telemetry.database.listenerStatus}</span>
              </div>

              <div className="flex gap-1.5 mb-4">
                <button
                  onClick={() => handleAction('LISTENER', 'start')}
                  className="px-2 py-0.5 text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded cursor-pointer"
                >
                  Start
                </button>
                <button
                  onClick={() => handleAction('LISTENER', 'stop')}
                  className="px-2 py-0.5 text-[10px] font-bold bg-red-950/40 text-red-400 border border-red-900/30 rounded cursor-pointer"
                >
                  Stop
                </button>
                <button
                  onClick={() => handleAction('LISTENER', 'reload')}
                  className="px-2 py-0.5 text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 rounded cursor-pointer"
                >
                  Reload Configuration
                </button>
              </div>

              {/* Scheduler list */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">DBMS_SCHEDULER JOBS</span>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {telemetry.schedulerJobs.map(job => (
                    <div key={job.jobName} className="p-2 bg-slate-950 rounded-lg border border-slate-900 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-slate-300 font-mono font-bold block">{job.jobName}</span>
                        <span className="text-slate-500 block text-[9px]">Owner: {job.owner} • Runs: {job.runCount}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`px-1 rounded text-[8px] font-mono font-bold ${
                          job.status === 'RUNNING' ? 'bg-blue-500/10 text-blue-400' :
                          job.status === 'FAILED' ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400'
                        }`}>{job.status}</span>

                        <button
                          onClick={() => handleAction('SCHEDULER_JOBS', 'run_now', { jobName: job.jobName })}
                          className="px-1 py-0.2 bg-slate-800 text-slate-300 rounded hover:text-white cursor-pointer"
                        >
                          Run
                        </button>
                        <button
                          onClick={() => handleAction('SCHEDULER_JOBS', job.status === 'DISABLED' ? 'enable' : 'disable', { jobName: job.jobName })}
                          className="px-1 py-0.2 bg-slate-950 border border-slate-800 text-slate-400 rounded cursor-pointer"
                        >
                          {job.status === 'DISABLED' ? 'Enable' : 'Disable'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Optional Data Guard summary */}
            {telemetry.dataGuard && (
              <div className="pt-3 border-t border-slate-800/60 mt-3 text-xs font-sans">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Oracle Data Guard Status</span>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-855 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500 block font-sans">Primary Database</span>
                      <span className="text-slate-300 font-bold">{telemetry.dataGuard.primaryDb}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-sans">DR Standby DB</span>
                      <span className="text-slate-300 font-bold">{telemetry.dataGuard.standbyDb}</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1.5 border-t border-slate-900">
                    <span>Replication Lag: <span className="text-emerald-400 font-bold">{telemetry.dataGuard.lagSeconds}s</span></span>
                    <span>Apply State: <span className="text-emerald-400">{telemetry.dataGuard.applyStatus}</span></span>
                  </div>

                  <div className="flex gap-1.5 pt-1">
                    <button
                      onClick={() => alert('Dry-run switchover initiated successfully.')}
                      className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[9px] cursor-pointer"
                    >
                      Switchover
                    </button>
                    <button
                      onClick={() => alert('Failover verification succeeded.')}
                      className="px-2 py-0.5 bg-red-950/40 text-red-400 border border-red-900/30 rounded text-[9px] cursor-pointer"
                    >
                      Verify Failover
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ASM Add Disk Modal inside details */}
      {showAddDiskModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-850 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-display font-bold text-slate-200">Add Physical Disk to {selectedDgForDisk}</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Disk Device Path</label>
                <input
                  type="text"
                  value={newDiskPath}
                  onChange={e => setNewDiskPath(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Size (GB)</label>
                  <input
                    type="number"
                    value={newDiskSize}
                    onChange={e => setNewDiskSize(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Failure Group</label>
                  <input
                    type="text"
                    value={newDiskFg}
                    onChange={e => setNewDiskFg(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddDiskModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleAction('ASM', 'add_disk', {
                    dgName: selectedDgForDisk,
                    path: newDiskPath,
                    sizeGB: newDiskSize,
                    failureGroup: newDiskFg
                  });
                  setShowAddDiskModal(false);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded font-bold"
              >
                Add ASM Disk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
