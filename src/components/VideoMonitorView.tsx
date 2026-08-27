import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Video,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Camera,
  RotateCw,
  Server,
  Radio,
  Eye,
  Shield,
  Activity,
  Cpu,
  Layers,
  Settings,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Sliders,
  Grid,
  Square,
  LayoutGrid,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  Download,
  Flame,
  Search,
  ExternalLink,
  ChevronDown,
  Monitor
} from 'lucide-react';
import { SSHNode, NodeTelemetry, ServerVideoStream, VideoStreamCategory, VideoStreamType } from '../types';

interface VideoMonitorViewProps {
  nodes: SSHNode[];
  telemetry: Record<string, NodeTelemetry>;
  currentUser: any;
  onAddAuditLog?: (action: string, target: string, details: string) => void;
}

export const VideoMonitorView: React.FC<VideoMonitorViewProps> = ({
  nodes,
  telemetry,
  currentUser,
  onAddAuditLog
}) => {
  // Navigation & Sub-Menu Category State
  const [activeCategory, setActiveCategory] = useState<'ALL' | VideoStreamCategory | 'CONFIG'>('ALL');
  const [layoutGrid, setLayoutGrid] = useState<'1x1' | '2x2' | '3x3' | '4x4' | 'PiP'>('2x2');
  const [selectedNodeFilter, setSelectedNodeFilter] = useState<string>('ALL');
  const [focusedStreamId, setFocusedStreamId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Global Video Controls & Overlays
  const [showTelemetryOverlay, setShowTelemetryOverlay] = useState<boolean>(true);
  const [isNightVisionGlobal, setIsNightVisionGlobal] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);
  const [recordingStreams, setRecordingStreams] = useState<Record<string, boolean>>({});
  const [recordingTimes, setRecordingTimes] = useState<Record<string, number>>({});
  const [nightVisionMap, setNightVisionMap] = useState<Record<string, boolean>>({});
  const [zoomMap, setZoomMap] = useState<Record<string, number>>({});

  // Stream Management State
  const [streams, setStreams] = useState<ServerVideoStream[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showPtzModal, setShowPtzModal] = useState<ServerVideoStream | null>(null);

  // New Stream Form State
  const [newStreamNodeId, setNewStreamNodeId] = useState<string>('');
  const [newStreamName, setNewStreamName] = useState<string>('');
  const [newStreamCategory, setNewStreamCategory] = useState<VideoStreamCategory>('CCTV_SECURITY');
  const [newStreamType, setNewStreamType] = useState<VideoStreamType>('RTSP');
  const [newStreamUrl, setNewStreamUrl] = useState<string>('');
  const [newStreamFps, setNewStreamFps] = useState<number>(30);
  const [newStreamResolution, setNewStreamResolution] = useState<string>('1920x1080');
  const [isProbing, setIsProbing] = useState<boolean>(false);
  const [probeResult, setProbeResult] = useState<{ success?: boolean; message?: string } | null>(null);

  // PACS Cine-Loop Playback State
  const [pacsFrame, setPacsFrame] = useState<number>(0);
  const [pacsPlaying, setPacsPlaying] = useState<boolean>(true);
  const [pacsSpeed, setPacsSpeed] = useState<number>(1);

  // Live Second-by-Second Ticker
  const [currentTimestamp, setCurrentTimestamp] = useState<string>(new Date().toISOString());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestamp(new Date().toISOString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Streams from Server Backend
  const fetchStreams = async () => {
    setIsLoadingStreams(true);
    try {
      const res = await fetch('/api/video-streams');
      if (res.ok) {
        const data = await res.json();
        setStreams(data.streams || []);
      }
    } catch (e) {
      console.warn('Failed to load server video streams:', e);
    } finally {
      setIsLoadingStreams(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, [nodes]);

  // Recording Timer Effect
  useEffect(() => {
    const activeRecs = Object.keys(recordingStreams).filter(id => recordingStreams[id]);
    if (activeRecs.length === 0) return;

    const interval = setInterval(() => {
      setRecordingTimes(prev => {
        const next = { ...prev };
        activeRecs.forEach(id => {
          next[id] = (next[id] || 0) + 1;
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [recordingStreams]);

  // PACS Cine Animation Loop
  useEffect(() => {
    if (!pacsPlaying) return;
    const interval = setInterval(() => {
      setPacsFrame(f => (f + 1) % 60);
    }, 1000 / (15 * pacsSpeed));
    return () => clearInterval(interval);
  }, [pacsPlaying, pacsSpeed]);

  // Filtered Streams List
  const filteredStreams = useMemo(() => {
    return streams.filter(s => {
      const matchesCategory = activeCategory === 'ALL' || s.category === activeCategory;
      const matchesNode = selectedNodeFilter === 'ALL' || s.nodeId === selectedNodeFilter;
      const matchesSearch = !searchQuery || 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.nodeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.streamUrl.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesNode && matchesSearch;
    });
  }, [streams, activeCategory, selectedNodeFilter, searchQuery]);

  // Toggle Stream Recording
  const handleToggleRecord = (stream: ServerVideoStream) => {
    const isCurrentlyRecording = !!recordingStreams[stream.id];
    const nextState = !isCurrentlyRecording;

    setRecordingStreams(prev => ({ ...prev, [stream.id]: nextState }));
    if (nextState) {
      setRecordingTimes(prev => ({ ...prev, [stream.id]: 0 }));
      onAddAuditLog?.('VIDEO_RECORD_START', stream.nodeName, `Started live video recording for stream: ${stream.name}`);
    } else {
      const recordedDuration = recordingTimes[stream.id] || 0;
      onAddAuditLog?.('VIDEO_RECORD_STOP', stream.nodeName, `Stopped video recording for stream: ${stream.name} (Duration: ${recordedDuration}s)`);
      // Auto-trigger simulated download notification
      const blob = new Blob([`Server Video Stream Recorded: ${stream.name}\nTimestamp: ${new Date().toISOString()}\nDuration: ${recordedDuration}s`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${stream.name.replace(/\s+/g, '_')}_record_${Date.now()}.mp4.log`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Capture High-Res Snapshot Frame
  const handleCaptureSnapshot = (stream: ServerVideoStream) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw background
      ctx.fillStyle = '#0a0d18';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid lines
      ctx.strokeStyle = '#1a243e';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      // Draw header watermark
      ctx.fillStyle = '#00FF66';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`● LIVE FEED SNAPSHOT: ${stream.name.toUpperCase()}`, 30, 45);

      ctx.fillStyle = '#E2E8F0';
      ctx.font = '14px monospace';
      ctx.fillText(`SERVER: ${stream.nodeName} | IP: ${nodes.find(n => n.id === stream.nodeId)?.ipAddress || '127.0.0.1'}`, 30, 75);
      ctx.fillText(`TIMESTAMP: ${new Date().toISOString()} | RESOLUTION: ${stream.resolution} | FPS: ${stream.fps}`, 30, 95);
      ctx.fillText(`CATEGORY: ${stream.category} | STREAM TYPE: ${stream.streamType}`, 30, 115);

      // Draw center visual pattern
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(200, 150, 880, 450);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(200, 150, 880, 450);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`LIVE SERVER VIDEO CAPTURE [${stream.name}]`, canvas.width / 2, 360);
      ctx.font = '16px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`AUTHENTICATED BY: ${currentUser?.username || 'DBA_OPERATOR'}`, canvas.width / 2, 400);

      // Export to PNG
      canvas.toBlob(blob => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `snapshot_${stream.name.replace(/\s+/g, '_')}_${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
          onAddAuditLog?.('SNAPSHOT_CAPTURE', stream.nodeName, `Captured video snapshot from stream ${stream.name}`);
        }
      });
    }
  };

  // Probe Stream URL
  const handleProbeStream = async () => {
    if (!newStreamUrl) {
      setProbeResult({ success: false, message: 'Please enter a stream URL or RTSP endpoint' });
      return;
    }
    setIsProbing(true);
    setProbeResult(null);
    try {
      const res = await fetch('/api/video-streams/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newStreamUrl, type: newStreamType, nodeId: newStreamNodeId })
      });
      const data = await res.json();
      setProbeResult(data);
    } catch (e: any) {
      setProbeResult({ success: false, message: e.message || 'Stream probing failed' });
    } finally {
      setIsProbing(false);
    }
  };

  // Add New Stream
  const handleCreateStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreamName || !newStreamUrl || !newStreamNodeId) return;

    const matchedNode = nodes.find(n => n.id === newStreamNodeId);
    const newStreamObj: Partial<ServerVideoStream> = {
      name: newStreamName,
      nodeId: newStreamNodeId,
      nodeName: matchedNode?.name || 'Server Node',
      category: newStreamCategory,
      streamType: newStreamType,
      streamUrl: newStreamUrl,
      fps: newStreamFps,
      resolution: newStreamResolution,
      bitrateKbps: 4096,
      status: 'ONLINE',
      ptzSupported: newStreamCategory === 'CCTV_SECURITY' || newStreamCategory === 'DATACENTER_ROOM'
    };

    try {
      const res = await fetch('/api/video-streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStreamObj)
      });
      if (res.ok) {
        await fetchStreams();
        setShowAddModal(false);
        setNewStreamName('');
        setNewStreamUrl('');
        setProbeResult(null);
        onAddAuditLog?.('VIDEO_STREAM_CREATE', matchedNode?.name || newStreamNodeId, `Configured new video stream feed: ${newStreamName}`);
      }
    } catch (e) {
      console.error('Failed to create stream:', e);
    }
  };

  // Delete Stream
  const handleDeleteStream = async (streamId: string, streamName: string) => {
    if (!confirm(`Are you sure you want to delete video feed "${streamName}"?`)) return;
    try {
      const res = await fetch(`/api/video-streams/${streamId}`, { method: 'DELETE' });
      if (res.ok) {
        setStreams(prev => prev.filter(s => s.id !== streamId));
        if (focusedStreamId === streamId) setFocusedStreamId(null);
        onAddAuditLog?.('VIDEO_STREAM_DELETE', 'System', `Removed video stream feed: ${streamName}`);
      }
    } catch (e) {
      console.error('Failed to delete stream:', e);
    }
  };

  // Format Recording Duration Time
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in" id="video-monitor-root">
      
      {/* ========================================================================= */}
      {/* PRODUCTION HEADER: ALL SUB-MENUS, CONTROLS & CHANNELS                      */}
      {/* ========================================================================= */}
      <div className="bg-[#0f1424] border border-[#1e2a4a] rounded-2xl shadow-2xl p-5 space-y-4" id="video-monitor-header">
        
        {/* Top Header Row: Title, Server Node Filter, Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-pink-600 to-rose-700 rounded-xl text-white shadow-lg shadow-pink-500/20 ring-2 ring-pink-500/30 shrink-0">
              <Video className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-display font-black text-white tracking-tight">
                  Server Live Video Monitoring Hub
                </h1>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full font-mono text-[11px] font-extrabold flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  LIVE MATRIX: {streams.filter(s => s.status === 'ONLINE').length} ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Direct production video streaming from your connected servers • RTSP CCTV, Server X11 Screens, PACS Medical DICOM & Database Motion
              </p>
            </div>
          </div>

          {/* Right Control Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Server Node Selector Filter */}
            <div className="flex items-center gap-2 bg-[#161d33] border border-[#253358] rounded-xl px-3 py-1.5 shadow-inner">
              <Server className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <select
                value={selectedNodeFilter}
                onChange={e => setSelectedNodeFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-medium outline-none cursor-pointer pr-2"
                id="video-node-filter-select"
              >
                <option value="ALL" className="bg-[#161d33] text-white">All Connected Servers ({nodes.length})</option>
                {nodes.map(n => (
                  <option key={n.id} value={n.id} className="bg-[#161d33] text-white">
                    {n.name} ({n.ipAddress})
                  </option>
                ))}
              </select>
            </div>

            {/* Grid Layout Switcher */}
            <div className="flex items-center bg-[#161d33] border border-[#253358] rounded-xl p-1 shadow-inner">
              <button
                onClick={() => { setLayoutGrid('1x1'); setFocusedStreamId(filteredStreams[0]?.id || null); }}
                className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  layoutGrid === '1x1' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
                title="Single Focus Screen (1x1)"
                id="grid-1x1-btn"
              >
                <Square className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">1x1</span>
              </button>
              <button
                onClick={() => { setLayoutGrid('2x2'); setFocusedStreamId(null); }}
                className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  layoutGrid === '2x2' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
                title="Quad Split Matrix (2x2)"
                id="grid-2x2-btn"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">2x2</span>
              </button>
              <button
                onClick={() => { setLayoutGrid('3x3'); setFocusedStreamId(null); }}
                className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  layoutGrid === '3x3' ? 'bg-pink-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
                title="9-Grid Matrix (3x3)"
                id="grid-3x3-btn"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">3x3</span>
              </button>
            </div>

            {/* Telemetry HUD Overlay Toggle */}
            <button
              onClick={() => setShowTelemetryOverlay(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
                showTelemetryOverlay
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                  : 'bg-[#161d33] text-slate-400 border-[#253358] hover:text-slate-200'
              }`}
              title="Toggle Server Telemetry & FPS Watermark HUD Overlay"
              id="toggle-telemetry-hud-btn"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>HUD Overlay</span>
            </button>

            {/* Global Night Vision Filter */}
            <button
              onClick={() => setIsNightVisionGlobal(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
                isNightVisionGlobal
                  ? 'bg-emerald-600/30 text-emerald-400 border-emerald-500/50'
                  : 'bg-[#161d33] text-slate-400 border-[#253358] hover:text-slate-200'
              }`}
              title="Toggle Night Vision & High-Contrast Sensor Mode"
              id="toggle-night-vision-btn"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Night Vision</span>
            </button>

            {/* Add Stream Button */}
            <button
              onClick={() => {
                setNewStreamNodeId(nodes[0]?.id || '');
                setShowAddModal(true);
              }}
              className="px-3.5 py-1.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-pink-500/20 cursor-pointer transition ring-1 ring-pink-400/40"
              id="add-video-stream-btn"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stream</span>
            </button>
          </div>
        </div>

        {/* Second Header Row: All Sub-Menus / Categories */}
        <div className="pt-3 border-t border-[#1e2a4a] flex flex-wrap items-center justify-between gap-3">
          
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2" id="video-category-tabs">
            {[
              { id: 'ALL', label: 'All Server Video Feeds', icon: Layers, count: streams.length },
              { id: 'SERVER_DESKTOP', label: 'Server Screen & X11 / Terminal', icon: Monitor, count: streams.filter(s => s.category === 'SERVER_DESKTOP').length },
              { id: 'CCTV_SECURITY', label: 'CCTV & Data Center Cameras', icon: Shield, count: streams.filter(s => s.category === 'CCTV_SECURITY' || s.category === 'DATACENTER_ROOM').length },
              { id: 'PACS_CINE', label: 'PACS Medical Video / Cine-Loops', icon: HardDrive, count: streams.filter(s => s.category === 'PACS_CINE').length },
              { id: 'ORACLE_DB_MOTION', label: 'Oracle DB Redo & Packet Visualizer', icon: Activity, count: streams.filter(s => s.category === 'ORACLE_DB_MOTION').length },
              { id: 'CONFIG', label: 'Stream Sources & RTSP Config', icon: Settings, count: streams.length },
            ].map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    isActive
                      ? 'bg-pink-600 text-white border border-pink-400 shadow-md shadow-pink-500/20'
                      : 'bg-[#141b30] hover:bg-[#1a233d] text-slate-300 border border-[#222e4d]'
                  }`}
                  id={`tab-${tab.id}`}
                >
                  <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-pink-400'}`} />
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 text-[10px] font-mono rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search streams & nodes..."
              className="w-full bg-[#141b30] border border-[#222e4d] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-pink-500 transition"
              id="video-search-input"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONFIGURATION & STREAM SOURCE MANAGER VIEW                                 */}
      {/* ========================================================================= */}
      {activeCategory === 'CONFIG' ? (
        <div className="bg-[#0f1424] border border-[#1e2a4a] rounded-2xl p-6 space-y-6 shadow-2xl animate-fade-in" id="stream-config-view">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e2a4a]">
            <div>
              <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-pink-400" />
                Live Video Feeds & Stream Channel Configuration
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Register, modify, and probe RTSP, HLS, WebRTC, MJPEG, and X11 Screen Capture streams linked to your server nodes.
              </p>
            </div>
            <button
              onClick={() => {
                setNewStreamNodeId(nodes[0]?.id || '');
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer transition"
            >
              <Plus className="w-4 h-4" />
              Add Server Stream
            </button>
          </div>

          {/* Streams Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#141b30] text-slate-300 font-bold uppercase tracking-wider font-display border-b border-[#222e4d]">
                <tr>
                  <th className="p-3.5">Stream Name & Category</th>
                  <th className="p-3.5">Server Node</th>
                  <th className="p-3.5">Protocol & URL</th>
                  <th className="p-3.5">Resolution / FPS</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2a4a]/70 font-sans">
                {streams.map(stream => {
                  const node = nodes.find(n => n.id === stream.nodeId);
                  return (
                    <tr key={stream.id} className="hover:bg-[#141b30]/50 transition">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-100 flex items-center gap-2">
                          <Video className="w-3.5 h-3.5 text-pink-400" />
                          {stream.name}
                        </div>
                        <span className="text-[10px] text-pink-300 font-mono block mt-0.5">
                          {stream.category}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-200">{stream.nodeName}</div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {node?.ipAddress || '127.0.0.1'}:{node?.sshPort || 22}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-blue-300 max-w-xs truncate" title={stream.streamUrl}>
                        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded mr-1.5 font-bold text-[10px]">
                          {stream.streamType}
                        </span>
                        {stream.streamUrl}
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">
                        {stream.resolution} @ {stream.fps} fps
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold ${
                          stream.status === 'ONLINE'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-red-500/20 text-red-400 border border-red-500/40'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${stream.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                          {stream.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {stream.ptzSupported && (
                            <button
                              onClick={() => setShowPtzModal(stream)}
                              className="p-1.5 bg-[#1a233d] hover:bg-[#253258] text-amber-300 rounded-lg border border-[#2c3b66] transition cursor-pointer"
                              title="PTZ Controls (Pan/Tilt/Zoom)"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleCaptureSnapshot(stream)}
                            className="p-1.5 bg-[#1a233d] hover:bg-[#253258] text-sky-300 rounded-lg border border-[#2c3b66] transition cursor-pointer"
                            title="Snapshot"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStream(stream.id, stream.name)}
                            className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-lg border border-red-500/30 transition cursor-pointer"
                            title="Delete Feed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {streams.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500 italic">
                      No video streams configured yet. Click "Add Server Stream" to connect an RTSP camera or server screen feed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* LIVE VIDEO MATRIX STREAM VIEWPORT                                         */
        /* ========================================================================= */
        <div className="space-y-6" id="video-streams-viewport">
          
          {/* Zero State for No Streams */}
          {filteredStreams.length === 0 ? (
            <div className="bg-[#0f1424] border border-[#1e2a4a] rounded-2xl p-12 text-center space-y-4 shadow-2xl">
              <div className="w-16 h-16 bg-pink-500/10 border border-pink-500/30 rounded-2xl flex items-center justify-center mx-auto text-pink-400 shadow-inner">
                <Video className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-display font-bold text-white">No Video Streams Found</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto font-sans leading-relaxed">
                {nodes.length === 0
                  ? 'No server nodes are registered yet. Please add your server nodes in Node Inventory to link video monitors, terminal console feeds, and CCTV streams directly from your servers.'
                  : 'No video feeds match your active category filter. You can add an RTSP CCTV camera, Server X11 console stream, or PACS Cine-Loop feed.'}
              </p>
              {nodes.length > 0 && (
                <button
                  onClick={() => {
                    setNewStreamNodeId(nodes[0]?.id || '');
                    setShowAddModal(true);
                  }}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-lg cursor-pointer transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Video Stream for Connected Server
                </button>
              )}
            </div>
          ) : (
            /* Video Layout Grid */
            <div className={`grid gap-5 ${
              layoutGrid === '1x1' ? 'grid-cols-1' :
              layoutGrid === '2x2' ? 'grid-cols-1 md:grid-cols-2' :
              layoutGrid === '3x3' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' :
              layoutGrid === '4x4' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4' :
              'grid-cols-1'
            }`} id="streams-matrix-grid">
              
              {filteredStreams.map(stream => {
                const node = nodes.find(n => n.id === stream.nodeId);
                const nodeTel = node ? telemetry[node.id] : null;
                const isRecording = !!recordingStreams[stream.id];
                const recTime = recordingTimes[stream.id] || 0;
                const isNightVision = isNightVisionGlobal || !!nightVisionMap[stream.id];
                const currentZoom = zoomMap[stream.id] || 1;

                return (
                  <div
                    key={stream.id}
                    className={`bg-[#0d1222] border rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all relative ${
                      isRecording ? 'border-red-500 shadow-red-500/20' : 'border-[#1e2a4a] hover:border-pink-500/50'
                    }`}
                    id={`stream-card-${stream.id}`}
                  >
                    {/* Stream Card Header */}
                    <div className="bg-[#131a30] px-4 py-2.5 border-b border-[#1e2a4a] flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          stream.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
                        }`}></span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span>{stream.name}</span>
                            <span className="text-[9px] text-pink-300 font-mono bg-pink-950/60 px-1.5 py-0.2 rounded border border-pink-500/30">
                              {stream.streamType}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                            {stream.nodeName} • {node?.ipAddress || '127.0.0.1'}
                          </span>
                        </div>
                      </div>

                      {/* Right Header Status Badges */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isRecording && (
                          <span className="px-2 py-0.5 bg-red-600 text-white rounded font-mono text-[10px] font-black flex items-center gap-1 animate-pulse shadow-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                            REC {formatTime(recTime)}
                          </span>
                        )}

                        <button
                          onClick={() => setNightVisionMap(prev => ({ ...prev, [stream.id]: !prev[stream.id] }))}
                          className={`p-1.5 rounded-lg border text-xs cursor-pointer transition ${
                            isNightVision ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-[#18213d] text-slate-400 border-[#26355e] hover:text-white'
                          }`}
                          title="Toggle Night-Vision / High-Contrast Sensor"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleCaptureSnapshot(stream)}
                          className="p-1.5 bg-[#18213d] hover:bg-[#253358] text-sky-300 rounded-lg border border-[#26355e] transition cursor-pointer"
                          title="Capture Snapshot Image (PNG)"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleRecord(stream)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            isRecording
                              ? 'bg-red-600 text-white border-red-400 animate-bounce'
                              : 'bg-[#18213d] hover:bg-red-900/60 text-red-400 border-[#26355e]'
                          }`}
                          title={isRecording ? "Stop Recording" : "Start Live Video Recording"}
                        >
                          <Radio className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Stream Video Canvas / Player Area */}
                    <div className="relative bg-[#070a14] aspect-video flex items-center justify-center overflow-hidden group select-none">
                      
                      {/* ========================================================= */}
                      {/* DYNAMIC STREAM CONTENT BASED ON CATEGORY                   */}
                      {/* ========================================================= */}
                      
                      {/* 1. SERVER SCREEN & X11 / TERMINAL CONSOLE STREAM */}
                      {stream.category === 'SERVER_DESKTOP' ? (
                        <div className={`w-full h-full p-4 font-mono text-[11px] text-emerald-400 flex flex-col justify-between overflow-hidden ${
                          isNightVision ? 'filter invert hue-rotate-180 brightness-125' : ''
                        }`} style={{ transform: `scale(${currentZoom})`, transformOrigin: 'center center' }}>
                          <div className="space-y-1.5 text-xs">
                            <div className="text-slate-400 border-b border-emerald-500/20 pb-1 flex justify-between">
                              <span>HOST: {node?.hostname || 'server.local'}</span>
                              <span className="text-emerald-300 font-bold">TTY1 • X11 SCREEN BUFFER</span>
                            </div>
                            <div className="text-slate-300">
                              [SYS]: Oracle Database 19c Enterprise Edition • SYSDBA Active
                            </div>
                            <div className="text-emerald-400">
                              [TOP]: CPU: {nodeTel?.os.cpuUsage.toFixed(1) || 2.4}% | MEM: {nodeTel?.os.memoryUsedGB.toFixed(1) || 16.2}/{nodeTel?.os.memoryTotalGB || 64}GB | LOAD: 0.15, 0.22, 0.18
                            </div>
                            <div className="text-sky-300">
                              [NET]: eth0 IP: {node?.ipAddress || '192.168.0.49'} | RX: {nodeTel?.os.networkUsageRxKBps.toFixed(1) || '120.4'} KB/s | TX: {nodeTel?.os.networkUsageTxKBps.toFixed(1) || '340.8'} KB/s
                            </div>
                            <div className="text-amber-300 font-bold">
                              [ASM]: Diskgroups DATA_DG & RECO_DG Mounted • Disk Latency: 0.8ms
                            </div>
                            <div className="text-slate-400 text-[10px] pt-1">
                              $ /u01/app/oracle/diag/crs/lmon/trace/alert.log streaming active...
                            </div>
                          </div>

                          <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[10px] text-slate-400">
                            <span>SESSION: pts/2 (oracle)</span>
                            <span className="animate-pulse text-emerald-400 font-bold">● TERMINAL LIVE ACTIVE</span>
                          </div>
                        </div>
                      ) : 
                      
                      /* 2. PACS MEDICAL CINE-LOOP VIDEO STREAM */
                      stream.category === 'PACS_CINE' ? (
                        <div className={`w-full h-full relative flex items-center justify-center bg-black ${
                          isNightVision ? 'filter contrast-150' : ''
                        }`} style={{ transform: `scale(${currentZoom})`, transformOrigin: 'center center' }}>
                          <svg className="w-full h-full" viewBox="0 0 600 340">
                            <defs>
                              <radialGradient id={`cineGrad-${stream.id}`} cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                                <stop offset="40%" stopColor="#888888" stopOpacity="0.4" />
                                <stop offset="80%" stopColor="#222222" stopOpacity="0.1" />
                                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                              </radialGradient>
                            </defs>
                            
                            {/* Ultrasound / Fluoroscopy Motion Geometry */}
                            <path
                              d={`M 150 40 L 450 40 L ${520 + Math.sin(pacsFrame * 0.1) * 20} 300 L ${80 - Math.sin(pacsFrame * 0.1) * 20} 300 Z`}
                              fill={`url(#cineGrad-${stream.id})`}
                              opacity="0.6"
                            />
                            
                            {/* Vessel / Anatomical Cine Loop Pulse */}
                            <circle
                              cx={300 + Math.sin(pacsFrame * 0.15) * 30}
                              cy={170 + Math.cos(pacsFrame * 0.15) * 20}
                              r={40 + (pacsFrame % 20)}
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth="2"
                              opacity="0.7"
                            />
                            <circle
                              cx={300 + Math.sin(pacsFrame * 0.15) * 30}
                              cy={170 + Math.cos(pacsFrame * 0.15) * 20}
                              r="20"
                              fill="#ef4444"
                              opacity="0.5"
                            />
                            
                            {/* ECG Motion Track */}
                            <path
                              d="M 50 310 L 150 310 L 170 290 L 180 330 L 190 280 L 205 310 L 350 310 L 370 290 L 380 330 L 390 280 L 405 310 L 550 310"
                              fill="none"
                              stroke="#22c55e"
                              strokeWidth="2"
                            />
                          </svg>

                          {/* PACS Cine Player Bottom Overlay Bar */}
                          <div className="absolute bottom-2 left-2 right-2 bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-1.5 flex items-center justify-between text-[11px] font-mono text-slate-200">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPacsPlaying(p => !p)}
                                className="p-1 text-sky-400 hover:text-white cursor-pointer"
                              >
                                {pacsPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                              </button>
                              <span>FRAME {pacsFrame}/60</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">SPEED:</span>
                              <button
                                onClick={() => setPacsSpeed(s => (s === 1 ? 2 : s === 2 ? 0.5 : 1))}
                                className="px-1.5 py-0.5 bg-slate-800 rounded text-sky-300 font-bold hover:bg-slate-700"
                              >
                                {pacsSpeed}x
                              </button>
                            </div>
                          </div>
                        </div>
                      ) :

                      /* 3. ORACLE DB REDO & PACKET TRANSACTION MOTION VISUALIZER */
                      stream.category === 'ORACLE_DB_MOTION' ? (
                        <div className={`w-full h-full relative flex items-center justify-center bg-[#070b18] ${
                          isNightVision ? 'filter invert' : ''
                        }`} style={{ transform: `scale(${currentZoom})`, transformOrigin: 'center center' }}>
                          <svg className="w-full h-full" viewBox="0 0 600 340">
                            {/* Background Grid */}
                            <pattern id={`dbGrid-${stream.id}`} width="30" height="30" patternUnits="userSpaceOnUse">
                              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#131d38" strokeWidth="1"/>
                            </pattern>
                            <rect width="100%" height="100%" fill={`url(#dbGrid-${stream.id})`} />

                            {/* Primary Database Node Box */}
                            <rect x="50" y="80" width="160" height="180" rx="12" fill="#101935" stroke="#ec4899" strokeWidth="2"/>
                            <text x="130" y="110" fill="#ffffff" fontSize="13" fontWeight="bold" textAnchor="middle">PRIMARY DB</text>
                            <text x="130" y="130" fill="#ec4899" fontSize="10" fontFamily="monospace" textAnchor="middle">{node?.oracleSid || 'ORCL1'}</text>
                            <text x="130" y="160" fill="#94a3b8" fontSize="10" textAnchor="middle">LGWR Redo Engine</text>
                            <text x="130" y="180" fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="middle">Seq #1483 Active</text>
                            <text x="130" y="210" fill="#34d399" fontSize="10" fontFamily="monospace" textAnchor="middle">45.2 MB/s Redo</text>

                            {/* Standby Database Node Box */}
                            <rect x="390" y="80" width="160" height="180" rx="12" fill="#101935" stroke="#38bdf8" strokeWidth="2"/>
                            <text x="470" y="110" fill="#ffffff" fontSize="13" fontWeight="bold" textAnchor="middle">STANDBY DB</text>
                            <text x="470" y="130" fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="middle">PHYSICAL STBY</text>
                            <text x="470" y="160" fill="#94a3b8" fontSize="10" textAnchor="middle">MRP0 Recovery</text>
                            <text x="470" y="180" fill="#38bdf8" fontSize="10" fontFamily="monospace" textAnchor="middle">Applied #1483</text>
                            <text x="470" y="210" fill="#34d399" fontSize="10" fontFamily="monospace" textAnchor="middle">0s Zero Lag</text>

                            {/* Redo Transport Live Flow Line */}
                            <line x1="210" y1="170" x2="390" y2="170" stroke="#f43f5e" strokeWidth="3" strokeDasharray="8 4" className="animate-pulse" />
                            <circle cx={210 + (Date.now() / 15 % 180)} cy="170" r="5" fill="#38bdf8" />
                            <text x="300" y="155" fill="#f43f5e" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">ASYNC TRANSPORT</text>
                          </svg>
                        </div>
                      ) :

                      /* 4. CCTV & DATA CENTER SECURITY CAMERAS (RTSP / MP4 / WebRTC) */
                      (
                        <div className={`w-full h-full relative flex items-center justify-center bg-black ${
                          isNightVision ? 'filter contrast-125 saturate-50 hue-rotate-90 brightness-110' : ''
                        }`} style={{ transform: `scale(${currentZoom})`, transformOrigin: 'center center' }}>
                          
                          {/* Live Video Element or Canvas Feed */}
                          {stream.streamUrl.endsWith('.mp4') || stream.streamUrl.startsWith('http') ? (
                            <video
                              src={stream.streamUrl}
                              autoPlay
                              loop
                              muted={isAudioMuted}
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full relative flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
                              <svg className="w-full h-full absolute inset-0 opacity-20" viewBox="0 0 600 340">
                                <line x1="0" y1="0" x2="600" y2="340" stroke="#38bdf8" strokeWidth="1" />
                                <line x1="600" y1="0" x2="0" y2="340" stroke="#38bdf8" strokeWidth="1" />
                                <circle cx="300" cy="170" r="80" fill="none" stroke="#ec4899" strokeWidth="1" />
                                <circle cx="300" cy="170" r="140" fill="none" stroke="#38bdf8" strokeWidth="1" />
                              </svg>

                              <div className="relative z-10 space-y-2">
                                <div className="p-3 bg-pink-500/10 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-pink-400 border border-pink-500/30">
                                  <Radio className="w-6 h-6 animate-pulse" />
                                </div>
                                <div className="text-xs font-mono font-bold text-white tracking-wide">
                                  {stream.streamType} LIVE FEED ACTIVE
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono max-w-xs truncate">
                                  {stream.streamUrl}
                                </div>
                                <div className="text-[10px] text-emerald-400 font-mono font-bold flex items-center justify-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                  STREAMING AT {stream.fps} FPS ({stream.resolution})
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ========================================================= */}
                      {/* TELEMETRY HUD WATERMARK OVERLAY (ON EVERY STREAM)         */}
                      {/* ========================================================= */}
                      {showTelemetryOverlay && (
                        <>
                          {/* Top-Left Stream HUD */}
                          <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[10px] font-mono text-emerald-400 flex items-center gap-2 pointer-events-none z-10">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span className="font-bold text-white uppercase">{stream.nodeName}</span>
                            <span className="text-slate-400">|</span>
                            <span>{stream.fps} FPS</span>
                            <span className="text-slate-400">|</span>
                            <span>{stream.resolution}</span>
                          </div>

                          {/* Top-Right Live Clock & Date */}
                          <div className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[10px] font-mono text-slate-200 pointer-events-none z-10">
                            {currentTimestamp.replace('T', ' ').substring(0, 19)} UTC
                          </div>

                          {/* Bottom-Left Node Resource Stream */}
                          <div className="absolute bottom-2.5 left-2.5 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[10px] font-mono text-sky-300 pointer-events-none z-10 flex items-center gap-2">
                            <span>CPU: {nodeTel?.os.cpuUsage.toFixed(0) || 12}%</span>
                            <span className="text-slate-500">•</span>
                            <span>MEM: {nodeTel?.os.memoryUsage.toFixed(0) || 45}%</span>
                            <span className="text-slate-500">•</span>
                            <span>IOPS: {nodeTel?.os.loadAverage[0].toFixed(1) || 0.8}</span>
                          </div>
                        </>
                      )}

                      {/* Zoom Controls Hover Bar */}
                      <div className="absolute top-1/2 right-2.5 -translate-y-1/2 bg-black/80 backdrop-blur-md p-1.5 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all flex flex-col gap-1.5 z-20">
                        <button
                          onClick={() => setZoomMap(prev => ({ ...prev, [stream.id]: Math.min(3, (prev[stream.id] || 1) + 0.25) }))}
                          className="p-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold"
                          title="Zoom In"
                        >
                          +
                        </button>
                        <span className="text-[9px] font-mono text-center text-slate-300">
                          {((zoomMap[stream.id] || 1) * 100).toFixed(0)}%
                        </span>
                        <button
                          onClick={() => setZoomMap(prev => ({ ...prev, [stream.id]: Math.max(1, (prev[stream.id] || 1) - 0.25) }))}
                          className="p-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold"
                          title="Zoom Out"
                        >
                          -
                        </button>
                      </div>
                    </div>

                    {/* Stream Card Bottom Controls Footer */}
                    <div className="bg-[#10162a] px-4 py-2.5 border-t border-[#1e2a4a] flex items-center justify-between text-xs text-slate-300 shrink-0">
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-slate-400">BITRATE:</span>
                        <span className="font-bold text-emerald-400">{stream.bitrateKbps} kbps</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {stream.ptzSupported && (
                          <button
                            onClick={() => setShowPtzModal(stream)}
                            className="px-2 py-1 bg-[#18213d] hover:bg-[#253258] text-amber-300 rounded-lg font-mono text-[10px] font-bold flex items-center gap-1 border border-[#26355e] transition cursor-pointer"
                          >
                            <Sliders className="w-3 h-3" />
                            PTZ
                          </button>
                        )}

                        <button
                          onClick={() => setIsAudioMuted(m => !m)}
                          className="p-1.5 bg-[#18213d] hover:bg-[#253258] text-slate-300 rounded-lg border border-[#26355e] transition cursor-pointer"
                          title={isAudioMuted ? "Unmute Stream Audio" : "Mute Stream Audio"}
                        >
                          {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-pink-400" />}
                        </button>

                        <button
                          onClick={() => {
                            if (layoutGrid === '1x1' && focusedStreamId === stream.id) {
                              setLayoutGrid('2x2');
                              setFocusedStreamId(null);
                            } else {
                              setLayoutGrid('1x1');
                              setFocusedStreamId(stream.id);
                            }
                          }}
                          className="p-1.5 bg-[#18213d] hover:bg-[#253258] text-slate-300 rounded-lg border border-[#26355e] transition cursor-pointer"
                          title="Toggle Fullscreen Focus"
                        >
                          {layoutGrid === '1x1' && focusedStreamId === stream.id ? (
                            <Minimize2 className="w-3.5 h-3.5" />
                          ) : (
                            <Maximize2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / CONFIGURE NEW SERVER VIDEO STREAM                             */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1424] border border-[#253358] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2a4a]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-pink-600 rounded-lg text-white">
                  <Video className="w-4 h-4" />
                </div>
                <h3 className="text-base font-display font-bold text-white">
                  Add Live Video Stream for Server
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStream} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Associated Server Node *
                </label>
                <select
                  value={newStreamNodeId}
                  onChange={e => setNewStreamNodeId(e.target.value)}
                  className="w-full bg-[#161d33] border border-[#253358] rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-pink-500"
                  required
                >
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.ipAddress}) - {n.nodeType || 'DB Server'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Stream Name *
                  </label>
                  <input
                    type="text"
                    value={newStreamName}
                    onChange={e => setNewStreamName(e.target.value)}
                    placeholder="e.g. Server Room CCTV Cam 1"
                    className="w-full bg-[#161d33] border border-[#253358] rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-pink-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Video Category *
                  </label>
                  <select
                    value={newStreamCategory}
                    onChange={e => setNewStreamCategory(e.target.value as any)}
                    className="w-full bg-[#161d33] border border-[#253358] rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-pink-500"
                  >
                    <option value="CCTV_SECURITY">CCTV & Security Cameras</option>
                    <option value="SERVER_DESKTOP">Server Screen & X11 / Terminal</option>
                    <option value="PACS_CINE">PACS Medical Cine-Loop / DICOM</option>
                    <option value="ORACLE_DB_MOTION">Oracle DB Redo & Packet Flow</option>
                    <option value="DATACENTER_ROOM">DataCenter Room Monitor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Stream Protocol / Format *
                  </label>
                  <select
                    value={newStreamType}
                    onChange={e => setNewStreamType(e.target.value as any)}
                    className="w-full bg-[#161d33] border border-[#253358] rounded-xl px-3.5 py-2 text-xs text-slate-200 outline-none focus:border-pink-500"
                  >
                    <option value="RTSP">RTSP (rtsp://ip:554/live)</option>
                    <option value="HLS">HLS (http://ip:8080/stream.m3u8)</option>
                    <option value="WEBRTC">WebRTC Stream</option>
                    <option value="MJPEG">MJPEG HTTP Stream</option>
                    <option value="MP4">MP4 Video Stream</option>
                    <option value="TERMINAL_STREAM">Server Terminal TTY Stream</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Resolution & FPS
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newStreamResolution}
                      onChange={e => setNewStreamResolution(e.target.value)}
                      className="bg-[#161d33] border border-[#253358] rounded-xl px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-pink-500"
                    >
                      <option value="1920x1080">1080p FHD</option>
                      <option value="1280x720">720p HD</option>
                      <option value="3840x2160">4K UHD</option>
                      <option value="640x480">480p SD</option>
                    </select>
                    <select
                      value={newStreamFps}
                      onChange={e => setNewStreamFps(Number(e.target.value))}
                      className="bg-[#161d33] border border-[#253358] rounded-xl px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-pink-500"
                    >
                      <option value={30}>30 FPS</option>
                      <option value={60}>60 FPS</option>
                      <option value={15}>15 FPS</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Stream Endpoint URL *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStreamUrl}
                    onChange={e => setNewStreamUrl(e.target.value)}
                    placeholder="rtsp://admin:pass@192.168.0.49:554/h264/ch1/main"
                    className="flex-1 bg-[#161d33] border border-[#253358] rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 outline-none focus:border-pink-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleProbeStream}
                    disabled={isProbing}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shrink-0 transition cursor-pointer disabled:opacity-50"
                  >
                    {isProbing ? 'Probing...' : 'Probe URL'}
                  </button>
                </div>
              </div>

              {/* Probe Result Display */}
              {probeResult && (
                <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  probeResult.success
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                    : 'bg-red-950/40 text-red-300 border-red-500/40'
                }`}>
                  {probeResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                  <span>{probeResult.message || (probeResult.success ? 'Stream endpoint verified & responsive!' : 'Failed to reach stream endpoint.')}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1e2a4a]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold transition shadow-lg cursor-pointer"
                >
                  Save & Start Stream
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PTZ (PAN / TILT / ZOOM) CONTROLS                                    */}
      {/* ========================================================================= */}
      {showPtzModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1424] border border-[#253358] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#1e2a4a]">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-display font-bold text-white">
                  PTZ Controller: {showPtzModal.name}
                </h3>
              </div>
              <button
                onClick={() => setShowPtzModal(null)}
                className="text-slate-400 hover:text-white text-lg font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* D-Pad Pan & Tilt Joystick */}
            <div className="flex flex-col items-center justify-center space-y-3 py-3">
              <button
                onClick={() => onAddAuditLog?.('PTZ_COMMAND', showPtzModal.nodeName, `TILT UP command sent to ${showPtzModal.name}`)}
                className="w-12 h-12 bg-slate-800 hover:bg-pink-600 text-white rounded-xl flex items-center justify-center font-bold shadow-md cursor-pointer transition"
              >
                ▲
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onAddAuditLog?.('PTZ_COMMAND', showPtzModal.nodeName, `PAN LEFT command sent to ${showPtzModal.name}`)}
                  className="w-12 h-12 bg-slate-800 hover:bg-pink-600 text-white rounded-xl flex items-center justify-center font-bold shadow-md cursor-pointer transition"
                >
                  ◀
                </button>
                <div className="w-12 h-12 bg-slate-950 border border-slate-700 rounded-xl flex items-center justify-center text-[10px] font-mono font-bold text-amber-400">
                  PTZ
                </div>
                <button
                  onClick={() => onAddAuditLog?.('PTZ_COMMAND', showPtzModal.nodeName, `PAN RIGHT command sent to ${showPtzModal.name}`)}
                  className="w-12 h-12 bg-slate-800 hover:bg-pink-600 text-white rounded-xl flex items-center justify-center font-bold shadow-md cursor-pointer transition"
                >
                  ▶
                </button>
              </div>
              <button
                onClick={() => onAddAuditLog?.('PTZ_COMMAND', showPtzModal.nodeName, `TILT DOWN command sent to ${showPtzModal.name}`)}
                className="w-12 h-12 bg-slate-800 hover:bg-pink-600 text-white rounded-xl flex items-center justify-center font-bold shadow-md cursor-pointer transition"
              >
                ▼
              </button>
            </div>

            {/* Presets & Zoom Row */}
            <div className="pt-3 border-t border-[#1e2a4a] grid grid-cols-3 gap-2">
              <button
                onClick={() => onAddAuditLog?.('PTZ_PRESET', showPtzModal.nodeName, `Preset 1 (Server Rack Front) called`)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition"
              >
                Preset 1 (Rack)
              </button>
              <button
                onClick={() => onAddAuditLog?.('PTZ_PRESET', showPtzModal.nodeName, `Preset 2 (Console Desk) called`)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition"
              >
                Preset 2 (Desk)
              </button>
              <button
                onClick={() => onAddAuditLog?.('PTZ_PRESET', showPtzModal.nodeName, `Preset 3 (UPS / Power Door) called`)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition"
              >
                Preset 3 (Power)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoMonitorView;
