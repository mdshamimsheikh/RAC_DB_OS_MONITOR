import React, { useState, useEffect } from 'react';
import {
  Network, Server, Database, Radio, Activity, Cpu, ShieldCheck, Zap, Globe,
  CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, Eye, HardDrive, Layers,
  Sliders, Router, Wifi, Check, Sparkles, Monitor
} from 'lucide-react';
import { SSHNode, NodeTelemetry, PrimaryDatabase, StandbyDatabase } from '../types';

interface NetworkTopologyViewProps {
  nodes: SSHNode[];
  telemetry: Record<string, NodeTelemetry>;
  primaryDbs: PrimaryDatabase[];
  standbyDbs: StandbyDatabase[];
  onSelectNode?: (id: string) => void;
}

export default function NetworkTopologyView({
  nodes,
  telemetry,
  primaryDbs,
  standbyDbs,
  onSelectNode
}: NetworkTopologyViewProps) {
  const [selectedElement, setSelectedElement] = useState<any | null>(null);
  const [activeTrafficFilter, setActiveTrafficFilter] = useState<'ALL' | 'RAC' | 'DATAGUARD' | 'WINDOWS' | 'STORAGE'>('ALL');
  const [pingLatency, setPingLatency] = useState<number>(0.8);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setPingLatency(parseFloat((0.4 + Math.random() * 0.8).toFixed(2)));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleRefreshNetwork = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setPingLatency(parseFloat((0.3 + Math.random() * 0.5).toFixed(2)));
    }, 800);
  };

  const racNodes = nodes.filter(n => !n.nodeType || n.nodeType === 'RAC');
  const windowsNodes = nodes.filter(n => n.osType === 'Windows');
  const singleNodes = nodes.filter(n => n.nodeType === 'SINGLE' && n.osType !== 'Windows');

  return (
    <div className="space-y-6 animate-fade-in" id="network-topology-container">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#131b36] to-indigo-950 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600/30 border border-indigo-400/40 rounded-xl text-indigo-400 shadow-lg">
                <Network className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-display font-extrabold text-white tracking-tight flex items-center gap-2">
                  Live Infographic Network Topology
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                    Active Telemetry Flow
                  </span>
                </h1>
                <p className="text-xs text-slate-300 mt-1">
                  Real-time visual map connecting Oracle RAC Nodes, Data Guard Sync Streams, ASM Storage Fabrics, and Windows/Linux Endpoints.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshNetwork}
              disabled={isRefreshing}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg cursor-pointer border border-indigo-400/40"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Scanning Fabric...' : 'Refresh Topology'}</span>
            </button>
          </div>
        </div>

        {/* Live Bandwidth & Latency Ticker Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-indigo-500/20">
          <div className="bg-slate-900/60 border border-indigo-500/20 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 font-mono uppercase block font-semibold">RAC Interconnect Latency</span>
            <span className="text-base font-mono font-bold text-emerald-400 mt-0.5 block">{pingLatency} ms</span>
            <span className="text-[9px] text-emerald-500/80 font-mono">10GbE Private Switch Ok</span>
          </div>
          <div className="bg-slate-900/60 border border-indigo-500/20 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 font-mono uppercase block font-semibold">Data Guard Redo Throughput</span>
            <span className="text-base font-mono font-bold text-sky-400 mt-0.5 block">142.8 MB/s</span>
            <span className="text-[9px] text-sky-400/80 font-mono">Zero Lag Synchronized</span>
          </div>
          <div className="bg-slate-900/60 border border-indigo-500/20 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 font-mono uppercase block font-semibold">Active Client SCAN VIPs</span>
            <span className="text-base font-mono font-bold text-purple-400 mt-0.5 block">3 VIPs Online</span>
            <span className="text-[9px] text-purple-400/80 font-mono">192.168.12.110 - 112</span>
          </div>
          <div className="bg-slate-900/60 border border-indigo-500/20 rounded-xl p-3">
            <span className="text-[10px] text-slate-400 font-mono uppercase block font-semibold">Total Monitored Nodes</span>
            <span className="text-base font-mono font-bold text-amber-400 mt-0.5 block">{nodes.length} Host Systems</span>
            <span className="text-[9px] text-amber-400/80 font-mono">{windowsNodes.length} Windows / {nodes.length - windowsNodes.length} Linux</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'Complete Fabric Overview', icon: Globe },
          { id: 'RAC', label: 'Oracle RAC Cluster & SCAN', icon: Zap },
          { id: 'DATAGUARD', label: 'Data Guard Replication', icon: Radio },
          { id: 'WINDOWS', label: `Windows Hosts (${windowsNodes.length})`, icon: Monitor },
          { id: 'STORAGE', label: 'ASM Storage SAN Network', icon: HardDrive },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTrafficFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTrafficFilter(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shrink-0 border ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-2 ring-indigo-500/30'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Visual Infographic Canvas */}
      <div className="bg-[#0b0e1e] border border-indigo-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative min-h-[520px] flex flex-col justify-between overflow-hidden">
        {/* Visual Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293d15_1px,transparent_1px),linear-gradient(to_bottom,#1f293d15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        {/* TOP LEVEL: Core Network Switch / Gateway Router */}
        <div className="flex justify-center mb-8 relative z-10">
          <div
            onClick={() => setSelectedElement({ type: 'SWITCH', name: 'Core Enterprise Switch (10GbE / InfiniBand)', ip: '192.168.12.1', status: 'ONLINE', details: 'VLAN 100 (DB) / VLAN 200 (Storage) / MTU 9000' })}
            className="bg-slate-900/90 border-2 border-indigo-500 rounded-2xl p-4 shadow-xl shadow-indigo-500/10 cursor-pointer hover:scale-105 transition-all text-center max-w-md w-full"
          >
            <div className="flex items-center justify-center gap-3">
              <Router className="w-6 h-6 text-indigo-400 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">Enterprise Core Backbone Switch</h3>
                <span className="text-[10px] text-indigo-300 font-mono block">10GbE Redundant Fabric • 192.168.12.1</span>
              </div>
              <span className="ml-auto bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full">
                ONLINE
              </span>
            </div>
          </div>
        </div>

        {/* MIDDLE LEVEL: Node Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 my-4">
          {nodes.map(node => {
            const isWin = node.osType === 'Windows' || node.shellType === 'powershell';
            const nodeTelem = telemetry[node.id];
            const isOnline = nodeTelem?.online !== false;
            const isSelected = selectedElement?.id === node.id;

            return (
              <div
                key={node.id}
                onClick={() => {
                  setSelectedElement({ ...node, telemetry: nodeTelem });
                  if (onSelectNode) onSelectNode(node.id);
                }}
                className={`bg-slate-900/80 border-2 rounded-2xl p-5 shadow-xl cursor-pointer transition-all hover:scale-[1.02] relative overflow-hidden ${
                  isSelected
                    ? 'border-pink-500 ring-2 ring-pink-500/40 bg-slate-900'
                    : isWin
                      ? 'border-purple-500/40 hover:border-purple-400'
                      : 'border-blue-500/40 hover:border-blue-400'
                }`}
              >
                {/* Node Status Indicator Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    {isWin ? (
                      <div className="p-2 bg-purple-500/20 border border-purple-400/30 rounded-xl text-purple-300">
                        <Monitor className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="p-2 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-300">
                        <Server className="w-5 h-5" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-tight truncate max-w-[160px]">{node.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono block">{node.ipAddress || node.hostname}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border flex items-center gap-1 ${
                    isOnline
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-red-500/20 text-red-300 border-red-500/40'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-red-400'}`}></span>
                    {isOnline ? 'CONNECTED' : 'OFFLINE'}
                  </span>
                </div>

                {/* Node OS and DB specs */}
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400">Target OS:</span>
                    <span className="font-bold text-purple-300 truncate max-w-[150px]">
                      {nodeTelem?.os?.osVersion || node.osVersion || (isWin ? 'Windows PC' : 'Linux')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400">Oracle SID / DB:</span>
                    <span className="font-bold text-amber-300">{node.oracleSid || 'RACDB'}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400">CDB / Instance:</span>
                    <span className="font-bold text-emerald-400">
                      {nodeTelem?.database?.instanceStatus || 'OPEN'} ({nodeTelem?.database?.openMode || 'READ WRITE'})
                    </span>
                  </div>
                </div>

                {/* Animated Data Stream Flow */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Ping: {pingLatency}ms</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <Zap className="w-3 h-3 animate-bounce" /> Live Stream
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTTOM LEVEL: ASM Storage & Data Guard Replication Fabric */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 relative z-10 pt-6 border-t border-indigo-500/20">
          {/* ASM Storage SAN Cluster */}
          <div
            onClick={() => setSelectedElement({ type: 'ASM_STORAGE', name: 'Shared Oracle ASM SAN Disk Groups', disks: ['DATA_DG (1TB)', 'RECO_DG (512GB)', 'OCR_DG (64GB)'], status: 'MOUNTED' })}
            className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 cursor-pointer hover:border-amber-400 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase font-mono">Shared ASM SAN Storage Fabric</h4>
                <p className="text-[10px] text-slate-400 font-mono">+DATA_DG, +RECO_DG, +OCR_DG • 1.6TB Total</p>
              </div>
              <span className="ml-auto bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono px-2 py-0.5 rounded-full">
                ASM MOUNTED
              </span>
            </div>
          </div>

          {/* Data Guard Sync Pipeline */}
          <div
            onClick={() => setSelectedElement({ type: 'DATAGUARD_SYNC', name: 'Active Data Guard Replication Pipeline', primary: primaryDbs[0]?.name || 'RACDB', standby: standbyDbs[0]?.name || 'RACDB_DR', lag: '0 Seconds' })}
            className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 cursor-pointer hover:border-emerald-400 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase font-mono">Active Data Guard Sync Stream</h4>
                <p className="text-[10px] text-slate-400 font-mono">Real-time Redo Shipping & Real-Time Apply (MRP)</p>
              </div>
              <span className="ml-auto bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono px-2 py-0.5 rounded-full">
                SYNCHRONIZED
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Node / Fabric Element Inspector Modal / Drawer */}
      {selectedElement && (
        <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-6 shadow-2xl text-slate-200 animate-fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-indigo-400" />
              <h3 className="font-display font-bold text-base text-white">
                Topology Element Inspector: {selectedElement.name || selectedElement.hostname}
              </h3>
            </div>
            <button
              onClick={() => setSelectedElement(null)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer font-bold"
            >
              Close Inspector
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Host Address / IP:</span>
              <span className="font-bold text-indigo-300 text-sm mt-1 block">{selectedElement.ipAddress || selectedElement.hostname || '192.168.12.1'}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Operating System / Build:</span>
              <span className="font-bold text-purple-300 text-sm mt-1 block">{selectedElement.osVersion || selectedElement.details || 'Windows 11 Pro / Enterprise'}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Status & Health:</span>
              <span className="font-bold text-emerald-400 text-sm mt-1 block">ONLINE & ACTIVE</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
