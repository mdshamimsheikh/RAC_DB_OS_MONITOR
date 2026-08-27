import React, { useState, useEffect, useRef } from 'react';
import {
  Video, Play, Pause, RefreshCw, Maximize2, Minimize2, Radio, Activity,
  Database, Server, Cpu, HardDrive, Zap, Shield, Eye, Layers, Wifi,
  Volume2, VolumeX, Sparkles, Terminal, CheckCircle2, AlertTriangle, ArrowRight,
  Share2, Crosshair, ChevronRight, Gauge, CornerDownRight
} from 'lucide-react';
import { SSHNode, NodeTelemetry, ClusterSummary, PrimaryDatabase, StandbyDatabase, FarSyncInstance } from '../types';

interface LiveInfographicVideoFeedProps {
  nodes: SSHNode[];
  telemetry: Record<string, NodeTelemetry>;
  summary: ClusterSummary;
  primaryDbs?: PrimaryDatabase[];
  standbyDbs?: StandbyDatabase[];
  farSyncInstances?: FarSyncInstance[];
  onNavigateMenu?: (menuId: string) => void;
}

type CameraChannel = 'RAC_GRID' | 'REDO_STREAM' | 'FAR_SYNC' | 'PACS_WEBLOGIC' | 'DATACENTER' | 'QUAD_SPLIT';

export default function LiveInfographicVideoFeed({
  nodes,
  telemetry,
  summary,
  primaryDbs = [],
  standbyDbs = [],
  farSyncInstances = [],
  onNavigateMenu
}: LiveInfographicVideoFeedProps) {
  const [activeChannel, setActiveChannel] = useState<CameraChannel>('RAC_GRID');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [scanlinesActive, setScanlinesActive] = useState(true);
  const [hudStatsVisible, setHudStatsVisible] = useState(true);
  const [timecode, setTimecode] = useState('00:00:00:00');
  const [fps, setFps] = useState(60);
  const [bitrate, setBitrate] = useState(24.5);
  const [selectedSubItem, setSelectedSubItem] = useState<string | null>(null);

  // Dynamic animation counter
  const [animTick, setAnimTick] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setAnimTick(prev => (prev + 1) % 3600);
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Video Timecode and Bitrate fluctuation generator
  useEffect(() => {
    let frame = 0;
    const interval = setInterval(() => {
      if (!isPlaying) return;
      frame = (frame + 1) % 60;
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      const f = String(frame).padStart(2, '0');
      setTimecode(`${h}:${m}:${s}:${f}`);
      setBitrate(+(24.2 + Math.sin(frame * 0.1) * 2.1).toFixed(1));
    }, 1000 / 30);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Calculate live stats
  const isWindowsNode = (n: SSHNode) => Boolean(n.osType === 'Windows' || n.shellType === 'powershell');
  const racNodes = nodes.filter(n => !isWindowsNode(n) && (n.nodeType === 'RAC' || (n as any).isRac));
  const singleNodes = nodes.filter(n => !isWindowsNode(n) && (n.nodeType === 'SINGLE' || (n.nodeType as string)?.includes('SINGLE')));
  const activeNodesCount = nodes.filter(n => telemetry[n.id]?.online !== false).length;

  const redoRateMB = +(18.4 + Math.sin(animTick * 0.05) * 6.2).toFixed(1);
  const primaryDbName = primaryDbs[0]?.name || 'ORCLPROD';
  const standbyDbName = standbyDbs[0]?.name || 'ORCLDR';
  const farSyncCount = farSyncInstances.length;

  const channels: { id: CameraChannel; label: string; sub: string; color: string; bg: string; border: string; icon: any }[] = [
    {
      id: 'RAC_GRID',
      label: 'CAM 01: RAC CLUSTER',
      sub: 'Grid Infrastructure & Active RAC Nodes',
      color: 'text-cyan-300',
      bg: 'bg-cyan-950/80',
      border: 'border-cyan-400/50',
      icon: Server
    },
    {
      id: 'REDO_STREAM',
      label: 'CAM 02: REDO MOTION',
      sub: 'Real-Time Data Guard Transport & MRP',
      color: 'text-pink-300',
      bg: 'bg-pink-950/80',
      border: 'border-pink-400/50',
      icon: Activity
    },
    {
      id: 'FAR_SYNC',
      label: 'CAM 03: FAR SYNC CONDUIT',
      sub: '3rd-Site Zero-Data-Loss Repeater',
      color: 'text-teal-300',
      bg: 'bg-teal-950/80',
      border: 'border-teal-400/50',
      icon: Radio
    },
    {
      id: 'PACS_WEBLOGIC',
      label: 'CAM 04: PACS & WEBLOGIC',
      sub: 'DICOM Archive & Enterprise J2EE',
      color: 'text-purple-300',
      bg: 'bg-purple-950/80',
      border: 'border-purple-400/50',
      icon: HardDrive
    },
    {
      id: 'DATACENTER',
      label: 'CAM 05: DATACENTER GRID',
      sub: 'All Nodes Hardware Telemetry',
      color: 'text-amber-300',
      bg: 'bg-amber-950/80',
      border: 'border-amber-400/50',
      icon: Cpu
    },
    {
      id: 'QUAD_SPLIT',
      label: 'QUAD 4-SPLIT VIEW',
      sub: 'Simultaneous 4-Camera Live Stream',
      color: 'text-emerald-300',
      bg: 'bg-emerald-950/80',
      border: 'border-emerald-400/50',
      icon: Layers
    }
  ];

  return (
    <div
      className={`rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-[#060a1a] via-[#0d122b] to-[#170c2a] shadow-2xl shadow-cyan-950/70 overflow-hidden relative transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 flex flex-col p-4 bg-slate-950/98' : 'p-4 md:p-5'
      }`}
      id="live-infographic-video-feed"
    >
      {/* Top Header Bar with Live Video Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-3 border-b border-cyan-500/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 font-black shadow-lg shadow-cyan-500/30 flex items-center justify-center">
            <Video className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-md shadow-red-500"></span>
              </span>
              <h2 className="text-base md:text-lg font-black text-white tracking-wide uppercase font-display flex items-center gap-2">
                Live Infrastructure Video Infographic Monitor
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-pink-600 text-white font-mono font-bold border border-red-400 shadow-sm animate-pulse">
                  ● LIVE BROADCAST
                </span>
              </h2>
            </div>
            <p className="text-xs text-cyan-200/90 font-mono flex items-center gap-2 mt-0.5">
              <span>ACTIVE PIPELINE:</span>
              <span className="text-emerald-400 font-bold font-mono">ORACLE 19c RAC ⇄ FAR SYNC ⇄ DATA GUARD DR</span>
              <span className="text-slate-500">•</span>
              <span className="text-cyan-300 font-bold">{activeNodesCount}/{nodes.length} NODES UP</span>
            </p>
          </div>
        </div>

        {/* Video Player Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pause / Play */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isPlaying
                ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-400/40 shadow-md shadow-cyan-500/20'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-400/40'
            }`}
            id="video-feed-play-pause-btn"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'PAUSE MOTION' : 'RESUME LIVE'}</span>
          </button>

          {/* Scanline Toggle */}
          <button
            onClick={() => setScanlinesActive(!scanlinesActive)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer border ${
              scanlinesActive
                ? 'bg-purple-500/20 text-purple-300 border-purple-400/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle Holographic CRT Scanlines"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SCANLINES</span>
          </button>

          {/* HUD Stats Toggle */}
          <button
            onClick={() => setHudStatsVisible(!hudStatsVisible)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer border ${
              hudStatsVisible
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Toggle Live Telemetry HUD Overlay"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">HUD TELEMETRY</span>
          </button>

          {/* Audio Simulator */}
          <button
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className={`p-2 rounded-xl text-xs font-mono transition cursor-pointer border ${
              isAudioEnabled
                ? 'bg-pink-500/20 text-pink-300 border-pink-400/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title={isAudioEnabled ? 'Mute Redo Frequency Audio' : 'Enable Redo Pulse Audio'}
          >
            {isAudioEnabled ? <Volume2 className="w-3.5 h-3.5 text-pink-400 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Video to Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Camera Angle Selectors (Vibrant Multi-Color Tabs) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-3.5">
        {channels.map(ch => {
          const isSelected = activeChannel === ch.id;
          const Icon = ch.icon;
          return (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`p-2.5 rounded-2xl text-left transition-all duration-200 cursor-pointer relative overflow-hidden border flex flex-col justify-between gap-1.5 ${
                isSelected
                  ? `${ch.bg} ${ch.border} ring-2 ring-cyan-400/70 shadow-lg shadow-cyan-950/80`
                  : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-700/60 hover:border-cyan-500/40'
              }`}
              id={`cam-select-${ch.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${ch.color}`} />
                  <span className={`text-[11px] font-black tracking-tight ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                    {ch.label}
                  </span>
                </div>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
                )}
              </div>
              <span className={`text-[9px] font-mono truncate block ${isSelected ? 'text-cyan-200 font-bold' : 'text-slate-400'}`}>
                {ch.sub}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Video Screen Canvas Container */}
      <div className="relative w-full rounded-2xl bg-black border-2 border-cyan-500/50 overflow-hidden min-h-[300px] md:min-h-[380px] lg:min-h-[420px] flex flex-col justify-between shadow-2xl">
        
        {/* Holographic Video Scanlines Layer */}
        {scanlinesActive && (
          <>
            <div className="absolute inset-0 video-hud-overlay pointer-events-none z-10 opacity-60" />
            <div className="absolute inset-0 video-scanline-beam pointer-events-none z-10" />
          </>
        )}

        {/* Video HUD Corner Brackets */}
        <div className="absolute top-2 left-2 z-20 pointer-events-none text-cyan-400 font-mono text-[9px] font-bold flex items-center gap-1.5 bg-black/70 px-2 py-0.5 rounded border border-cyan-500/40">
          <Crosshair className="w-3 h-3 text-cyan-400 animate-spin" />
          <span>CAM FEED: {activeChannel}</span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-400">STATUS: ACTIVE</span>
        </div>

        <div className="absolute top-2 right-2 z-20 pointer-events-none flex items-center gap-2">
          <div className="bg-black/70 border border-red-500/50 px-2 py-0.5 rounded flex items-center gap-1.5 text-[9px] font-mono text-red-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-rec-dot" />
            <span>REC {timecode}</span>
          </div>
          <div className="bg-black/70 border border-cyan-500/40 px-2 py-0.5 rounded text-[9px] font-mono text-cyan-300 font-bold hidden sm:block">
            {fps} FPS / {bitrate} Mbps
          </div>
        </div>

        {/* Video Canvas Content Rendering based on Camera Selection */}
        <div className="flex-1 w-full relative z-0 flex items-center justify-center p-4">
          
          {/* CHANNEL 1: ORACLE RAC GRID INFOGRAPHIC */}
          {activeChannel === 'RAC_GRID' && (
            <div className="w-full max-w-5xl space-y-4 animate-fade-in text-white">
              
              {/* RAC Heartbeat & Node Interconnect Graphic */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                
                {/* RAC Node 1 */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-blue-950/90 via-slate-900/90 to-blue-950/90 border-2 border-blue-500/60 shadow-xl shadow-blue-950/60 relative group hover:border-blue-400 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold border border-blue-400/40">
                      RAC INSTANCE 1
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      CRS ONLINE
                    </span>
                  </div>
                  <h4 className="text-base font-black text-white">{racNodes[0]?.name || 'rac-node01.prod'}</h4>
                  <p className="text-xs font-mono text-cyan-300">{racNodes[0]?.ipAddress || '192.168.10.11'} • VIP: 192.168.10.21</p>
                  
                  {/* Telemetry Meter */}
                  <div className="mt-3 space-y-2 text-xs font-mono">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-300">
                        <span>CPU CORE LOAD</span>
                        <span className="text-cyan-400 font-bold">{(28 + Math.sin(animTick * 0.08) * 8).toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                          style={{ width: `${(28 + Math.sin(animTick * 0.08) * 8).toFixed(0)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-300">
                        <span>GLOBAL CACHE TRANSFER</span>
                        <span className="text-purple-400 font-bold">{(1420 + Math.sin(animTick * 0.1) * 210).toFixed(0)} BLKS/s</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                        <div className="h-full bg-gradient-to-r from-purple-400 to-pink-500 w-3/4" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Central Interconnect & SCAN Switch Graphic */}
                <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950/80 border border-cyan-500/40 text-center space-y-2 relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 p-0.5 shadow-lg shadow-cyan-500/30 animate-pulse flex items-center justify-center">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                      <Wifi className="w-6 h-6 text-cyan-300" />
                    </div>
                  </div>
                  <div className="font-mono text-xs font-bold text-white">
                    <span className="text-cyan-300">SCAN LISTENER 1521</span>
                    <p className="text-[10px] text-slate-400">10GbE Private Interconnect</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/40">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span>LATENCY 0.28ms • 0 PACKET LOSS</span>
                  </div>
                  {/* Moving laser pulses */}
                  <div className="w-full flex items-center justify-between px-4 text-cyan-400 text-[10px] font-mono animate-pulse">
                    <span>◀◀ CACHE FUSION</span>
                    <span>HEARTBEAT ▶▶</span>
                  </div>
                </div>

                {/* RAC Node 2 */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-indigo-950/90 via-slate-900/90 to-indigo-950/90 border-2 border-indigo-500/60 shadow-xl shadow-indigo-950/60 relative group hover:border-indigo-400 transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-400/40">
                      RAC INSTANCE 2
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      CRS ONLINE
                    </span>
                  </div>
                  <h4 className="text-base font-black text-white">{racNodes[1]?.name || 'rac-node02.prod'}</h4>
                  <p className="text-xs font-mono text-cyan-300">{racNodes[1]?.ipAddress || '192.168.10.12'} • VIP: 192.168.10.22</p>
                  
                  {/* Telemetry Meter */}
                  <div className="mt-3 space-y-2 text-xs font-mono">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-300">
                        <span>CPU CORE LOAD</span>
                        <span className="text-indigo-400 font-bold">{(34 + Math.cos(animTick * 0.08) * 7).toFixed(0)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-300"
                          style={{ width: `${(34 + Math.cos(animTick * 0.08) * 7).toFixed(0)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-300">
                        <span>GLOBAL CACHE TRANSFER</span>
                        <span className="text-pink-400 font-bold">{(1380 + Math.cos(animTick * 0.1) * 190).toFixed(0)} BLKS/s</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5">
                        <div className="h-full bg-gradient-to-r from-pink-400 to-rose-500 w-2/3" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Disk Group ASM Telemetry Strip */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-cyan-300">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold">+DATA DISKGROUP: 1.8 TB / 4.0 TB (45%) MOUNTED</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-300">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold">+RECO FRA: 580 GB / 2.0 TB (29%) HEALTHY</span>
                </div>
                <div className="flex items-center gap-2 text-purple-300">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span className="font-bold">VOTING DISK: 3/3 QUORUM REACHED</span>
                </div>
              </div>

            </div>
          )}

          {/* CHANNEL 2: REAL-TIME REDO STREAM & MRP0 APPLY */}
          {activeChannel === 'REDO_STREAM' && (
            <div className="w-full max-w-5xl space-y-4 animate-fade-in text-white">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                
                {/* Primary DB Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-emerald-950/90 via-slate-900/90 to-emerald-950/90 border-2 border-emerald-500/60 shadow-xl relative">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-400/40">
                    PRIMARY DATABASE
                  </span>
                  <h4 className="text-lg font-black text-white mt-1">{primaryDbName}</h4>
                  <p className="text-xs font-mono text-emerald-300">READ WRITE • MAXIMUM AVAILABILITY</p>

                  <div className="mt-3 p-2 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-[11px] font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Log Sequence:</span>
                      <span className="text-emerald-400 font-bold">#49,820</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Redo Generation Rate:</span>
                      <span className="text-cyan-300 font-bold">{redoRateMB} MB/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">LGWR / NSS Process:</span>
                      <span className="text-purple-300 font-bold">NSS2 ACTIVE (SYNC)</span>
                    </div>
                  </div>
                </div>

                {/* Animated Redo Transport Pipe */}
                <div className="flex flex-col items-center justify-center p-3 text-center space-y-2">
                  <span className="text-[10px] font-mono font-bold text-pink-400 uppercase tracking-wider">
                    ⚡ REAL-TIME REDO TRANSPORT
                  </span>
                  
                  {/* Pulsing Redo Vector Cable */}
                  <div className="w-full h-3 bg-slate-900 rounded-full border border-pink-500/50 p-0.5 relative overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 via-pink-500 to-cyan-400 rounded-full animate-pulse shadow-[0_0_12px_#ec4899]"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="font-mono text-xs text-white">
                    <span className="text-pink-300 font-extrabold">{redoRateMB} MB/s Stream Flow</span>
                    <p className="text-[10px] text-slate-400">Compression: ZSTD / Fast-Sync</p>
                  </div>

                  <div className="px-3 py-1 rounded-full bg-pink-950/80 border border-pink-500/40 text-[10px] font-mono text-pink-300 flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-pink-400 animate-spin" />
                    <span>MRP0 REAL-TIME APPLY: 0.00s LAG</span>
                  </div>
                </div>

                {/* Standby DR Database Box */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-950/90 via-slate-900/90 to-purple-950/90 border-2 border-purple-500/60 shadow-xl relative">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold border border-purple-400/40">
                    PHYSICAL STANDBY (DR)
                  </span>
                  <h4 className="text-lg font-black text-white mt-1">{standbyDbName}</h4>
                  <p className="text-xs font-mono text-purple-300">READ ONLY WITH APPLY • ACTIVE DG</p>

                  <div className="mt-3 p-2 rounded-xl bg-slate-950/80 border border-purple-500/30 text-[11px] font-mono space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Applied Sequence:</span>
                      <span className="text-purple-300 font-bold">#49,820 (SYNCHRONIZED)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Replication Lag:</span>
                      <span className="text-emerald-400 font-bold">0 Seconds (Real-Time)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">MRP0 Process:</span>
                      <span className="text-cyan-300 font-bold">APPLYING_REDO (PID 8492)</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Data Guard Command & Verification Banner */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-700/80 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">
                  <span className="text-pink-400 font-bold">DGMGRL Broker:</span> SUCCESS (Database status NORMAL - Zero Data Loss Protection Active)
                </span>
                <span className="text-emerald-400 font-bold">FAST-START FAILOVER: READY</span>
              </div>

            </div>
          )}

          {/* CHANNEL 3: FAR SYNC 3RD-SITE REPEATER CONDUIT */}
          {activeChannel === 'FAR_SYNC' && (
            <div className="w-full max-w-5xl space-y-4 animate-fade-in text-white">
              <div className="text-center space-y-1">
                <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 font-mono text-xs font-bold border border-teal-400/40">
                  FAR SYNC 3-TIER ZERO DATA LOSS ARCHITECTURE
                </span>
                <p className="text-xs text-slate-300 font-sans">
                  Primary transmits SYNC to nearby lightweight Far Sync instance; Far Sync compresses and forwards ASYNC to distant DR site.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Tier 1 Primary */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/50 text-center">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">TIER 1 • PRIMARY RAC</span>
                  <h4 className="text-base font-bold text-white mt-1">{primaryDbName}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Main DC (Site A)</p>
                  <div className="mt-2 text-xs font-mono text-emerald-300 font-bold bg-emerald-950/60 py-1 rounded">
                    SYNC REDO DISPATCH
                  </div>
                </div>

                {/* Tier 2 Far Sync Instance */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-teal-950 via-slate-900 to-teal-950 border-2 border-teal-400 shadow-xl text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 mx-auto flex items-center justify-center border border-teal-400">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-teal-400 font-bold">TIER 2 • FAR SYNC INSTANCE</span>
                    <h4 className="text-base font-extrabold text-white">farsync_site_c</h4>
                    <p className="text-[10px] text-slate-300 font-mono">3rd Site Facility (Low Latency)</p>
                  </div>
                  <div className="text-[11px] font-mono text-teal-200 bg-teal-950/90 p-2 rounded-lg border border-teal-500/40 space-y-0.5">
                    <div className="flex justify-between"><span>Standby Redo Logs:</span> <span className="font-bold text-white">8 ACTIVE</span></div>
                    <div className="flex justify-between"><span>Compression:</span> <span className="font-bold text-emerald-400">ZSTD 65% SAVED</span></div>
                    <div className="flex justify-between"><span>Forwarder NSS:</span> <span className="font-bold text-cyan-300">STREAMING</span></div>
                  </div>
                </div>

                {/* Tier 3 Distant DR Standby */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/50 text-center">
                  <span className="text-[10px] font-mono text-purple-400 font-bold">TIER 3 • DISTANT DR SITE</span>
                  <h4 className="text-base font-bold text-white mt-1">{standbyDbName}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Remote DR Facility (Site B &gt; 500KM)</p>
                  <div className="mt-2 text-xs font-mono text-purple-300 font-bold bg-purple-950/60 py-1 rounded">
                    ASYNC CONTINUOUS APPLY
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CHANNEL 4: PACS DICOM & WEBLOGIC ENTERPRISE */}
          {activeChannel === 'PACS_WEBLOGIC' && (
            <div className="w-full max-w-5xl space-y-4 animate-fade-in text-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* PACS DICOM Container */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-purple-950/90 via-slate-900/90 to-purple-950/90 border-2 border-purple-500/60 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold border border-purple-400/40">
                      PACS DICOM MEDICAL ARCHIVE
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">PORT 104 / ACTIVE</span>
                  </div>
                  <h4 className="text-base font-bold text-white">PACS_ARCHIVE_MAIN</h4>
                  <p className="text-xs font-mono text-purple-300">AE TITLE: ORTHANC_PROD • MODALITIES: CT, MRI, XRAY</p>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-purple-500/30">
                      <span className="text-[10px] text-slate-400 block">TOTAL STUDIES</span>
                      <span className="text-sm font-bold text-white">142,890</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-purple-500/30">
                      <span className="text-[10px] text-slate-400 block">C-STORE / MIN</span>
                      <span className="text-sm font-bold text-purple-300">48 RECV</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-purple-500/30">
                      <span className="text-[10px] text-slate-400 block">STORAGE FRA</span>
                      <span className="text-sm font-bold text-cyan-300">4.2 TB</span>
                    </div>
                  </div>
                </div>

                {/* WebLogic Enterprise Domain */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-indigo-950/90 via-slate-900/90 to-indigo-950/90 border-2 border-indigo-500/60 shadow-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-400/40">
                      ORACLE WEBLOGIC ENTERPRISE
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">ADMIN 7001 / RUNNING</span>
                  </div>
                  <h4 className="text-base font-bold text-white">base_domain_prod</h4>
                  <p className="text-xs font-mono text-indigo-300">ORACLE FUSION MIDDLEWARE 14.1.1</p>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-indigo-500/30">
                      <span className="text-[10px] text-slate-400 block">MANAGED SERVERS</span>
                      <span className="text-sm font-bold text-white">4 ACTIVE</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-indigo-500/30">
                      <span className="text-[10px] text-slate-400 block">JDBC POOL</span>
                      <span className="text-sm font-bold text-indigo-300">92/100</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-indigo-500/30">
                      <span className="text-[10px] text-slate-400 block">JMS QUEUES</span>
                      <span className="text-sm font-bold text-cyan-300">12 READY</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* CHANNEL 5: DATACENTER MATRIX */}
          {activeChannel === 'DATACENTER' && (
            <div className="w-full max-w-5xl space-y-3 animate-fade-in text-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-amber-300 font-bold uppercase tracking-wider">
                  ALL CLUSTER HOSTS &amp; HARDWARE TELEMETRY MATRIX
                </span>
                <span className="text-xs font-mono text-slate-400">Total {nodes.length} Configured Node Hosts</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {nodes.map(node => {
                  const nodeTel = telemetry[node.id];
                  const isOnline = nodeTel?.online !== false;
                  const cpuVal = nodeTel?.os?.cpuUsage ?? Math.floor(20 + Math.random() * 30);
                  const memVal = nodeTel?.os?.memoryUsage ?? Math.floor(40 + Math.random() * 30);

                  return (
                    <div
                      key={node.id}
                      className={`p-3 rounded-xl border text-left font-mono text-xs space-y-1.5 transition-all ${
                        isOnline
                          ? 'bg-slate-900/90 border-cyan-500/40 hover:border-cyan-400'
                          : 'bg-red-950/40 border-red-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white truncate max-w-[120px]">{node.name}</span>
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                      </div>
                      <p className="text-[10px] text-cyan-300 truncate">{node.ipAddress} • {node.nodeType || 'NODE'}</p>
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>CPU: {cpuVal}%</span>
                          <span>MEM: {memVal}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-400" style={{ width: `${cpuVal}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CHANNEL 6: QUAD SPLIT VIEW */}
          {activeChannel === 'QUAD_SPLIT' && (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in text-white">
              
              {/* Mini Cam 1 */}
              <div className="p-3 rounded-xl bg-slate-950/90 border border-cyan-500/50 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-cyan-400 font-bold">CAM 01: RAC CLUSTER</span>
                  <span className="text-emerald-400">2/2 NODES ONLINE</span>
                </div>
                <div className="h-20 bg-slate-900 rounded-lg flex items-center justify-center text-xs font-mono text-cyan-300 border border-slate-800">
                  <div className="text-center">
                    <Server className="w-5 h-5 mx-auto text-cyan-400 animate-pulse mb-1" />
                    <span>CACHE FUSION 0.28ms</span>
                  </div>
                </div>
              </div>

              {/* Mini Cam 2 */}
              <div className="p-3 rounded-xl bg-slate-950/90 border border-pink-500/50 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-pink-400 font-bold">CAM 02: REDO MOTION</span>
                  <span className="text-emerald-400">0s LAG SYNCHRONIZED</span>
                </div>
                <div className="h-20 bg-slate-900 rounded-lg flex items-center justify-center text-xs font-mono text-pink-300 border border-slate-800">
                  <div className="text-center">
                    <Activity className="w-5 h-5 mx-auto text-pink-400 animate-pulse mb-1" />
                    <span>{redoRateMB} MB/s REDO STREAM</span>
                  </div>
                </div>
              </div>

              {/* Mini Cam 3 */}
              <div className="p-3 rounded-xl bg-slate-950/90 border border-teal-500/50 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-teal-400 font-bold">CAM 03: FAR SYNC REPEATER</span>
                  <span className="text-teal-300">ZSTD COMPRESSION ACTIVE</span>
                </div>
                <div className="h-20 bg-slate-900 rounded-lg flex items-center justify-center text-xs font-mono text-teal-300 border border-slate-800">
                  <div className="text-center">
                    <Radio className="w-5 h-5 mx-auto text-teal-400 animate-pulse mb-1" />
                    <span>3RD-SITE CONDUIT ACTIVE</span>
                  </div>
                </div>
              </div>

              {/* Mini Cam 4 */}
              <div className="p-3 rounded-xl bg-slate-950/90 border border-purple-500/50 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-purple-400 font-bold">CAM 04: PACS &amp; WEBLOGIC</span>
                  <span className="text-purple-300">PORT 104 / 7001</span>
                </div>
                <div className="h-20 bg-slate-900 rounded-lg flex items-center justify-center text-xs font-mono text-purple-300 border border-slate-800">
                  <div className="text-center">
                    <HardDrive className="w-5 h-5 mx-auto text-purple-400 animate-pulse mb-1" />
                    <span>DICOM ARCHIVE READY</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Live Audio / Equalizer Waveform Footer Bar */}
        <div className="w-full bg-slate-950/90 border-t border-cyan-500/30 p-2.5 z-20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          
          {/* Waveform Equalizer */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold">REDO HARMONIC EQUALIZER:</span>
            <div className="flex items-end gap-0.5 h-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-t-sm bg-gradient-to-t from-cyan-500 via-blue-400 to-pink-500 animate-pulse"
                  style={{
                    height: `${isPlaying ? 20 + Math.sin(animTick * 0.2 + i) * 60 : 15}%`,
                    animationDuration: `${0.3 + (i % 4) * 0.1}s`
                  }}
                />
              ))}
            </div>
          </div>

          {/* Quick Jump Buttons to Specific Modules */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-slate-400">QUICK INSPECT:</span>
            <button
              onClick={() => onNavigateMenu?.('primary-dbs')}
              className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition cursor-pointer text-[10px] font-bold"
            >
              Primary RAC
            </button>
            <button
              onClick={() => onNavigateMenu?.('standby-dbs')}
              className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition cursor-pointer text-[10px] font-bold"
            >
              Standby DR
            </button>
            <button
              onClick={() => onNavigateMenu?.('farsync')}
              className="px-2 py-0.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30 transition cursor-pointer text-[10px] font-bold"
            >
              Far Sync
            </button>
            <button
              onClick={() => onNavigateMenu?.('redo-apply')}
              className="px-2 py-0.5 rounded-lg bg-pink-500/20 text-pink-300 border border-pink-500/40 hover:bg-pink-500/30 transition cursor-pointer text-[10px] font-bold"
            >
              Redo Apply
            </button>
            <button
              onClick={() => onNavigateMenu?.('network-topology')}
              className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition cursor-pointer text-[10px] font-bold"
            >
              Mesh Topology
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
