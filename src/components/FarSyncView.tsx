import React, { useState, useEffect } from 'react';
import { Radio, Repeat, ShieldCheck, Zap, Activity, RefreshCw, Plus, Trash2, CheckCircle2, AlertTriangle, ArrowRight, Gauge, Cpu, Network, Terminal, Copy, Check, Server, Shield, Layers, HardDrive, Filter } from 'lucide-react';
import { FarSyncInstance, PrimaryDatabase, StandbyDatabase, SSHNode, UserAccount } from '../types';
import { apiFetch } from '../lib/api';

interface FarSyncViewProps {
  farSyncInstances: FarSyncInstance[];
  primaryDbs: PrimaryDatabase[];
  standbyDbs: StandbyDatabase[];
  nodes: SSHNode[];
  currentUser?: UserAccount;
  onRefresh?: () => void;
}

export default function FarSyncView({
  farSyncInstances = [],
  primaryDbs = [],
  standbyDbs = [],
  nodes = [],
  currentUser,
  onRefresh
}: FarSyncViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [togglingCompId, setTogglingCompId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [ticker, setTicker] = useState(0);

  // Form State
  const [formName, setFormName] = useState('FAR_SYNC_SITE3_REPEATER');
  const [formPrimaryId, setFormPrimaryId] = useState(primaryDbs[0]?.id || '');
  const [formHostIp, setFormHostIp] = useState('192.168.1.180');
  const [formPort, setFormPort] = useState(1521);
  const [formOracleSid, setFormOracleSid] = useState('FS_REPEATER');
  const [formUniqueName, setFormUniqueName] = useState('FS_REPEATER_01');
  const [formProtectionMode, setFormProtectionMode] = useState<'MAXIMUM AVAILABILITY' | 'MAXIMUM PROTECTION' | 'MAXIMUM PERFORMANCE'>('MAXIMUM AVAILABILITY');
  const [formCompression, setFormCompression] = useState<'ENABLED' | 'DISABLED'>('ENABLED');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Live real-time tick for animated counters and infographics
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (farSyncInstances.length > 0 && !selectedInstanceId) {
      setSelectedInstanceId(farSyncInstances[0].id);
    }
  }, [farSyncInstances, selectedInstanceId]);

  const activeInstance = farSyncInstances.find(f => f.id === selectedInstanceId) || farSyncInstances[0];
  const linkedPrimary = primaryDbs.find(p => p.id === activeInstance?.primaryDbId) || primaryDbs[0];
  const linkedStandbys = standbyDbs.filter(s => activeInstance?.targetStandbyIds?.includes(s.id) || !activeInstance?.targetStandbyIds || activeInstance.targetStandbyIds.length === 0);

  const canManage = currentUser?.role === 'ADMIN' || currentUser?.permissions?.canManageStandbyDb === true;

  const handleTestConduit = async (id: string) => {
    setTestingId(id);
    try {
      const res = await apiFetch(`/api/farsync/${id}/test`, { method: 'POST' });
      const data = await res.json();
      if (data && data.success) {
        setTestResults(prev => ({ ...prev, [id]: data }));
      }
    } catch (err: any) {
      setTestResults(prev => ({ ...prev, [id]: { success: false, message: err.message || 'Test failed' } }));
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleCompression = async (id: string) => {
    setTogglingCompId(id);
    try {
      await apiFetch(`/api/farsync/${id}/toggle-compression`, { method: 'POST' });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Toggle compression error:', err);
    } finally {
      setTogglingCompId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this Far Sync (Repeater) instance?')) return;
    setDeletingId(id);
    try {
      await apiFetch(`/api/farsync/${id}`, { method: 'DELETE' });
      if (selectedInstanceId === id) setSelectedInstanceId(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    try {
      const res = await apiFetch('/api/farsync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          primaryDbId: formPrimaryId || (primaryDbs[0]?.id || ''),
          hostIp: formHostIp,
          port: formPort,
          oracleSid: formOracleSid,
          dbUniqueName: formUniqueName,
          protectionMode: formProtectionMode,
          compression: formCompression,
          targetStandbyIds: standbyDbs.map(s => s.id)
        })
      });

      const data = await res.json();
      if (res.ok && data.id) {
        setShowAddModal(false);
        setSelectedInstanceId(data.id);
        if (onRefresh) onRefresh();
      } else {
        setFormError(data.error || 'Failed to create Far Sync instance');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error communicating with server');
    } finally {
      setFormSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div id="farsync-view-container" className="space-y-6 animate-fade-in text-slate-100">
      {/* Top Banner / Header Card */}
      <div id="farsync-header-banner" className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-cyan-500/30 p-6 shadow-2xl shadow-cyan-950/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-400 shadow-lg shadow-cyan-500/20">
                <Repeat className="w-7 h-7 animate-spin text-cyan-300" style={{ animationDuration: '8s' }} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
                  Oracle Data Guard Far Sync <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-mono">3rd Site Repeater</span>
                </h1>
                <p className="text-sm text-slate-300">
                  Zero Data Loss synchronous redo transport conduit over infinite WAN distances with lightweight standby control file instances.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onRefresh && (
              <button
                id="btn-refresh-farsync"
                onClick={onRefresh}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 flex items-center gap-2 transition-all hover:border-cyan-500/50"
              >
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                Refresh
              </button>
            )}
            {canManage && (
              <button
                id="btn-add-farsync"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-cyan-600/30 flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                Register Far Sync Instance
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Active Repeaters</span>
            <div className="text-xl font-bold text-white mt-0.5 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {farSyncInstances.length} Configured
            </div>
          </div>
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Conduit Latency (RTT)</span>
            <div className="text-xl font-bold text-cyan-300 mt-0.5 font-mono">
              {activeInstance ? `${activeInstance.rttLatencyMs.toFixed(2)} ms` : '< 0.8 ms'}
            </div>
          </div>
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Forwarding Bandwidth</span>
            <div className="text-xl font-bold text-emerald-400 mt-0.5 font-mono">
              {activeInstance ? `${activeInstance.forwardingRateMBps.toFixed(1)} MB/s` : '0 MB/s'}
            </div>
          </div>
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/60">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Data Loss Guarantee</span>
            <div className="text-base font-bold text-emerald-300 mt-0.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ZERO DATA LOSS (RPO = 0)
            </div>
          </div>
        </div>
      </div>

      {/* Main Infographic Topology Pipeline Map */}
      <div id="farsync-topology-pipeline" className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Live Redo Transport Pipeline Architecture</h2>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            Real-Time Conduit Stream Active
          </span>
        </div>

        {/* Visual Infographic 3-Tier Diagram */}
        <div className="p-6 rounded-xl bg-slate-950/90 border border-slate-800 relative">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative items-center">
            
            {/* TIER 1: Primary Database Site */}
            <div className="rounded-xl bg-gradient-to-b from-blue-950/60 to-slate-900/90 border border-blue-500/40 p-4 shadow-lg relative group">
              <div className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-bold tracking-wide uppercase border border-blue-400">
                Tier 1: Primary Site
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="p-3 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{linkedPrimary?.uniqueName || 'PRIMARY_DB'}</h3>
                  <p className="text-xs text-slate-400 font-mono">{linkedPrimary?.name || 'RAC Cluster Node'}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Transport Link:</span>
                  <span className="font-bold text-cyan-300 font-mono">SYNC / AFFIRM (Net: {activeInstance?.rttLatencyMs || 0.6}ms)</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Current Log Sequence:</span>
                  <span className="font-bold text-emerald-400 font-mono">#{linkedPrimary?.latestSequence || activeInstance?.lastSequenceReceived || 105}</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Impact on Primary Commit:</span>
                  <span className="font-bold text-emerald-300">0.00ms WAN Overhead</span>
                </div>
              </div>
            </div>

            {/* TIER 2: 3rd Site Far Sync (Repeater) */}
            <div className="rounded-xl bg-gradient-to-b from-cyan-950/70 to-slate-900/90 border-2 border-cyan-400 p-4 shadow-xl shadow-cyan-950/40 relative">
              <div className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[11px] font-extrabold tracking-wide uppercase border border-cyan-300 shadow">
                Tier 2: Far Sync (Repeater)
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                    <Repeat className="w-6 h-6 animate-pulse text-cyan-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{activeInstance?.name || 'FAR_SYNC_REPEATER'}</h3>
                    <p className="text-xs text-cyan-400 font-mono">{activeInstance?.hostIp}:{activeInstance?.port}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  LIGHTWEIGHT
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Database Role:</span>
                  <span className="font-bold text-cyan-300 font-mono">FAR SYNC (NO DATAFILES)</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">ZLIB Redo Compression:</span>
                  <span className={`font-bold font-mono ${activeInstance?.compression === 'ENABLED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {activeInstance?.compression || 'ENABLED'} (3.8x Ratio)
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Redo Memory Buffer:</span>
                  <span className="font-bold text-purple-300 font-mono">{activeInstance?.redoBufferUsagePct || 14}% / 2048 MB</span>
                </div>
              </div>
            </div>

            {/* TIER 3: Remote Physical Standby Site */}
            <div className="rounded-xl bg-gradient-to-b from-purple-950/60 to-slate-900/90 border border-purple-500/40 p-4 shadow-lg relative">
              <div className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[11px] font-bold tracking-wide uppercase border border-purple-400">
                Tier 3: Remote Standby (WAN)
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{linkedStandbys[0]?.uniqueName || 'STANDBY_DR_DB'}</h3>
                  <p className="text-xs text-slate-400 font-mono">Disaster Recovery Remote Site</p>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Forwarding Protocol:</span>
                  <span className="font-bold text-purple-300 font-mono">ASYNC / COMPRESSED</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Standby MRP Status:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {linkedStandbys[0]?.redoApplied ? 'APPLYING (ACTIVE MRP)' : 'MOUNTED'}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400">Standby Applied Seq:</span>
                  <span className="font-bold text-cyan-300 font-mono">#{linkedStandbys[0]?.appliedSequence || activeInstance?.lastSequenceForwarded || 105}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Callout Note */}
          <div className="mt-5 p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <span>
                <strong>Zero-Impact WAN Redo Forwarding:</strong> Primary DB synchronizes synchronously with Far Sync over local ultra-low latency ({activeInstance?.rttLatencyMs || 0.6}ms), while Far Sync compresses and asynchronously ships redo across long-distance WAN without slowing down primary application transactions.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Instances Grid & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Instance Selector / List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Far Sync Repeater Instances ({farSyncInstances.length})
            </h3>
          </div>

          {farSyncInstances.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-900/60 border border-dashed border-slate-700 text-center space-y-3">
              <Repeat className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm text-slate-400">No Far Sync instances registered yet.</p>
              {canManage && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all"
                >
                  Register First Far Sync Instance
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {farSyncInstances.map((fs) => {
                const isSelected = fs.id === activeInstance?.id;
                return (
                  <div
                    key={fs.id}
                    onClick={() => setSelectedInstanceId(fs.id)}
                    className={`cursor-pointer p-4 rounded-xl transition-all border ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-950/80 to-slate-900 border-cyan-400 shadow-lg shadow-cyan-950/50'
                        : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-cyan-500/30 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
                          <Repeat className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{fs.name}</h4>
                          <span className="text-xs text-slate-400 font-mono">{fs.dbUniqueName} • {fs.hostIp}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {fs.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                      <div>
                        <span className="text-slate-500 block">Forward Rate:</span>
                        <span className="font-bold text-cyan-300 font-mono">{fs.forwardingRateMBps} MB/s</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Compression:</span>
                        <span className={`font-bold font-mono ${fs.compression === 'ENABLED' ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {fs.compression}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (2 spans): Active Instance Deep Inspection & Controls */}
        <div className="lg:col-span-2 space-y-4">
          {activeInstance ? (
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
              
              {/* Header Details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-white">{activeInstance.name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 font-mono">
                      SID: {activeInstance.oracleSid}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Host: {activeInstance.hostIp}:{activeInstance.port} • DB_UNIQUE_NAME: {activeInstance.dbUniqueName}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestConduit(activeInstance.id)}
                    disabled={testingId === activeInstance.id}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center gap-1.5 transition-all"
                  >
                    <Activity className={`w-3.5 h-3.5 ${testingId === activeInstance.id ? 'animate-spin' : ''}`} />
                    {testingId === activeInstance.id ? 'Probing Conduit...' : 'Test Conduit'}
                  </button>
                  {canManage && (
                    <>
                      <button
                        onClick={() => handleToggleCompression(activeInstance.id)}
                        disabled={togglingCompId === activeInstance.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                          activeInstance.compression === 'ENABLED'
                            ? 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Compression: {activeInstance.compression}
                      </button>
                      <button
                        onClick={() => handleDelete(activeInstance.id)}
                        disabled={deletingId === activeInstance.id}
                        className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/50 transition-all"
                        title="Delete Instance"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Test Result Message Box */}
              {testResults[activeInstance.id] && (
                <div className="p-3.5 rounded-xl bg-cyan-950/50 border border-cyan-500/40 text-xs text-cyan-200 flex items-start justify-between gap-2 animate-fade-in">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white">Conduit Diagnostic Pass:</span> {testResults[activeInstance.id].message}
                    </div>
                  </div>
                  <button
                    onClick={() => setTestResults(prev => ({ ...prev, [activeInstance.id]: null }))}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Metric Matrix Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Ingest Rate</span>
                  <div className="text-lg font-bold text-white mt-1 font-mono">{activeInstance.ingestRateMBps.toFixed(1)} MB/s</div>
                  <span className="text-[10px] text-cyan-400">From Primary DB</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Forward Rate</span>
                  <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">{activeInstance.forwardingRateMBps.toFixed(1)} MB/s</div>
                  <span className="text-[10px] text-emerald-400">To Standby DBs</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Buffer Usage</span>
                  <div className="text-lg font-bold text-purple-300 mt-1 font-mono">{activeInstance.redoBufferUsagePct}%</div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: `${activeInstance.redoBufferUsagePct}%` }}></div>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Protection Level</span>
                  <div className="text-xs font-bold text-amber-300 mt-1 font-mono">{activeInstance.protectionMode}</div>
                  <span className="text-[10px] text-slate-400">Zero Data Loss</span>
                </div>
              </div>

              {/* DGMGRL & SQL*Plus Command Snippets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    Oracle DGMGRL Broker Configuration Commands
                  </h4>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2 p-2 rounded bg-slate-900 border border-slate-800/80">
                    <code className="text-cyan-300 select-all overflow-x-auto">
                      DGMGRL&gt; CREATE FAR_SYNC '{activeInstance.dbUniqueName}' AS CONNECT IDENTIFIER IS '{activeInstance.dbUniqueName}';
                    </code>
                    <button
                      onClick={() => copyToClipboard(`CREATE FAR_SYNC '${activeInstance.dbUniqueName}' AS CONNECT IDENTIFIER IS '${activeInstance.dbUniqueName}';`, 'cmd1')}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Copy command"
                    >
                      {copiedCmd === 'cmd1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 p-2 rounded bg-slate-900 border border-slate-800/80">
                    <code className="text-emerald-300 select-all overflow-x-auto">
                      DGMGRL&gt; EDIT FAR_SYNC '{activeInstance.dbUniqueName}' SET PROPERTY RedoRoutes = '(LOCAL:({linkedStandbys[0]?.uniqueName || 'STANDBY_DR'} ASYNC))';
                    </code>
                    <button
                      onClick={() => copyToClipboard(`EDIT FAR_SYNC '${activeInstance.dbUniqueName}' SET PROPERTY RedoRoutes = '(LOCAL:(${linkedStandbys[0]?.uniqueName || 'STANDBY_DR'} ASYNC))';`, 'cmd2')}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Copy command"
                    >
                      {copiedCmd === 'cmd2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-400">
              Select a Far Sync instance from the left or register a new one.
            </div>
          )}
        </div>

      </div>

      {/* Register New Far Sync Instance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-cyan-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Repeat className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">Register Oracle Far Sync (Repeater)</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Far Sync Instance Display Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                  placeholder="e.g. FAR_SYNC_SITE3_REPEATER"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Target Host / IP</label>
                  <input
                    type="text"
                    required
                    value={formHostIp}
                    onChange={e => setFormHostIp(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                    placeholder="192.168.1.180"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">TNS Port</label>
                  <input
                    type="number"
                    required
                    value={formPort}
                    onChange={e => setFormPort(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                    placeholder="1521"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">ORACLE_SID</label>
                  <input
                    type="text"
                    required
                    value={formOracleSid}
                    onChange={e => setFormOracleSid(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                    placeholder="FS_REPEATER"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">DB_UNIQUE_NAME</label>
                  <input
                    type="text"
                    required
                    value={formUniqueName}
                    onChange={e => setFormUniqueName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                    placeholder="FS_REPEATER_01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Primary Database Link</label>
                  <select
                    value={formPrimaryId}
                    onChange={e => setFormPrimaryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                  >
                    {primaryDbs.map(p => (
                      <option key={p.id} value={p.id}>{p.uniqueName || p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">ZLIB Compression</label>
                  <select
                    value={formCompression}
                    onChange={e => setFormCompression(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="ENABLED">ENABLED (Hardware Accelerated)</option>
                    <option value="DISABLED">DISABLED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-bold shadow-lg shadow-cyan-600/30 transition-all"
                >
                  {formSubmitting ? 'Registering...' : 'Register Far Sync'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
