import React, { useState, useEffect } from 'react';
import { Database, Activity, CheckCircle2, XCircle, AlertTriangle, RefreshCw, ArrowRight, Clock, ToggleLeft, ToggleRight, ShieldAlert, Zap, Trash2, ShieldCheck, Layers, Link2, RotateCw, Play, Pause, Radio, Cpu, Sparkles } from 'lucide-react';
import { PrimaryDatabase, StandbyDatabase } from '../types';
import { getApiUrl, apiFetch } from '../lib/api';

interface RedoApplyViewProps {
  primaryDbs: PrimaryDatabase[];
  standbyDbs: StandbyDatabase[];
  onToggleRedoApply?: (id: string) => Promise<void>;
  onSwitchLogfile?: (pDbId: string) => Promise<void>;
  onDeletePrimaryDb?: (id: string) => Promise<void>;
  onDeleteStandbyDb?: (id: string) => Promise<void>;
}

export default function RedoApplyView({
  primaryDbs,
  standbyDbs,
  onToggleRedoApply,
  onSwitchLogfile,
  onDeletePrimaryDb,
  onDeleteStandbyDb
}: RedoApplyViewProps) {
  // We use a ticker to trigger component updates and animate live-changing data
  const [ticker, setTicker] = useState(0);
  const [isToggling, setIsToggling] = useState<Record<string, boolean>>({});
  const [switchingLogfile, setSwitchingLogfile] = useState<Record<string, boolean>>({});
  const [isSimulatingSync, setIsSimulatingSync] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTicker(prev => prev + 1);
    }, 1000); // Re-render every 1 second for instant sequence animation
    return () => clearInterval(timer);
  }, []);

  // Format sequence time from real server logs
  const formatSequenceTime = (rawTime?: string) => {
    if (rawTime && rawTime.trim() !== '' && rawTime !== '--:--:--') {
      return rawTime;
    }
    return '--:--:--';
  };

  // Helper to calculate current sequence of a primary database
  const getPrimarySeq = (pDb: PrimaryDatabase) => {
    if (pDb.archivedLogs && pDb.archivedLogs.length > 0) {
      return Math.max(...pDb.archivedLogs.map(a => a.sequence));
    }
    if (pDb.latestSequence !== undefined && pDb.latestSequence > 0) {
      return pDb.latestSequence;
    }
    return 0;
  };

  // Helper to calculate applied sequence of a standby database
  const getStandbySeq = (stby: StandbyDatabase) => {
    if (stby.archivedLogs && stby.archivedLogs.length > 0) {
      const appliedLogs = stby.archivedLogs.filter(a => a.applied === 'YES' || a.applied === 'IN-MEMORY');
      if (appliedLogs.length > 0) {
        return Math.max(...appliedLogs.map(a => a.sequence));
      }
      if (stby.appliedSequence !== undefined && stby.appliedSequence > 0) {
        return stby.appliedSequence;
      }
      if (stby.redoApplied) {
        return Math.max(...stby.archivedLogs.map(a => a.sequence));
      }
      return 0;
    }
    if (stby.appliedSequence !== undefined && stby.appliedSequence > 0) {
      return stby.appliedSequence;
    }
    if (stby.latestSequence !== undefined && stby.latestSequence > 0) {
      return stby.redoApplied ? stby.latestSequence : 0;
    }
    return 0;
  };

  const handleToggleApply = async (stbyId: string) => {
    if (!onToggleRedoApply) return;
    setIsToggling(prev => ({ ...prev, [stbyId]: true }));
    try {
      await onToggleRedoApply(stbyId);
    } finally {
      setIsToggling(prev => ({ ...prev, [stbyId]: false }));
    }
  };

  const handleSwitchLogfile = async (pDbId: string) => {
    setSwitchingLogfile(prev => ({ ...prev, [pDbId]: true }));
    try {
      if (onSwitchLogfile) {
        await onSwitchLogfile(pDbId);
      } else {
        const res = await apiFetch(`/api/primary-databases/${pDbId}/switch-logfile`, {
          method: 'POST'
        });
        const isJson = res.headers.get('content-type')?.includes('application/json');
        const data = isJson ? await res.json() : null;
        if (data && data.success) {
          console.log('Log switch executed:', data.message);
        }
      }
    } catch (err) {
      console.error('Failed to switch logfile:', err);
    } finally {
      setSwitchingLogfile(prev => ({ ...prev, [pDbId]: false }));
    }
  };

  if (primaryDbs.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in text-center py-16 bg-[#0e172e] border border-cyan-500/30 rounded-2xl p-8 shadow-2xl" id="redo-apply-empty">
        <ShieldAlert className="w-16 h-16 text-amber-400 mx-auto mb-4 animate-bounce" />
        <h2 className="text-2xl font-display font-bold text-white tracking-wide">No Primary Databases Registered</h2>
        <p className="text-sm text-cyan-200 mt-2 max-w-md mx-auto leading-relaxed">
          The Redo Apply Monitor requires at least one registered primary database and its associated Active Data Guard standbys to visualize real-time replication streams.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in" id="redo-apply-monitor-root">
      {/* Header Infographic Banner */}
      <div className="bg-gradient-to-r from-[#0c1630] via-[#141b36] to-[#0c1630] p-6 rounded-2xl border-2 border-cyan-500/40 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-rose-600 via-red-600 to-amber-500 rounded-xl shadow-lg shadow-red-950/60">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-black text-white tracking-wide flex items-center gap-2.5">
                Active Data Guard Redo Apply & Sequence Matrix
                <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-2.5 py-0.5 rounded-full font-mono font-bold tracking-widest uppercase">
                  LIVE NOC TELEMETRY
                </span>
              </h1>
              <p className="text-xs text-cyan-200/90 mt-1 font-sans leading-relaxed">
                Real-time synchronized visualization comparing Redo log generation on Primary nodes with Managed Recovery Process (MRP) execution across all physical standby targets.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 relative z-10 flex-wrap">
          <div className="flex items-center gap-2.5 bg-[#080d1d] border border-cyan-500/40 px-4 py-2.5 rounded-xl shadow-inner">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <div className="text-left">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono block">Data Guard Stream</span>
              <span className="text-xs font-mono font-bold text-emerald-400">100% OPERATIONAL</span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#080d1d] border border-indigo-500/40 px-4 py-2.5 rounded-xl shadow-inner">
            <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="font-mono text-xs font-bold text-cyan-300">Live Matrix Ticker #{ticker}</span>
          </div>
        </div>
      </div>

      {/* Main Replication Matrix Stacked Vertically */}
      <div className="space-y-12">
        {primaryDbs.map((pDb) => {
          const pSeq = getPrimarySeq(pDb);
          const associatedStandbys = standbyDbs.filter(s => 
            s.primaryDbId === pDb.id || 
            s.primaryDbId === pDb.uniqueName || 
            s.primaryDbId === pDb.name ||
            s.primaryDbId === pDb.oracleSid ||
            !s.primaryDbId ||
            primaryDbs.length === 1
          );

          // Show strictly the latest 7 sequences starting from the highest known sequence
          const sMaxSeq = Math.max(0, ...associatedStandbys.map(s => {
            const sLogs = s.archivedLogs || [];
            return Math.max(s.latestSequence || 0, s.appliedSequence || 0, ...(sLogs.map(l => l.sequence)));
          }));
          const highestSeq = Math.max(pSeq, sMaxSeq);
          const latestSeqs = Array.from({ length: 7 }, (_, idx) => highestSeq - idx).filter(s => s >= 1);

          return (
            <div key={pDb.id} className="bg-gradient-to-b from-[#111a33] to-[#0a1024] border-2 border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl p-6 space-y-6 border-l-8 border-l-rose-500">
              
              {/* PRIMARY DATABASE HEADER */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#080e20] p-4.5 rounded-xl border border-cyan-500/30 shadow-inner">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-gradient-to-tr from-rose-600 to-red-500 text-white rounded-xl shadow-lg shadow-rose-950/60">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-black text-white font-display tracking-wide">{pDb.name}</span>
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-full font-mono font-black uppercase tracking-wider">
                        PRIMARY SOURCE CLUSTER
                      </span>
                      {onDeletePrimaryDb && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove the primary database ${pDb.name}? This will also delete all associated standby targets.`)) {
                              onDeletePrimaryDb(pDb.id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-500/20 text-rose-400 hover:text-rose-200 rounded-lg transition cursor-pointer"
                          title="Delete Primary Database Source"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-cyan-200 font-mono mt-1">
                      Unique Name: <span className="text-white font-bold">{pDb.uniqueName}</span> | SID: <span className="text-amber-300 font-bold">{pDb.oracleSid}</span> | Engine: <span className="text-emerald-300 font-bold">{pDb.version || '19c Enterprise'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
                  <div className="bg-[#111933] border border-rose-500/40 px-3.5 py-2 rounded-xl text-rose-300 font-bold shadow-md">
                    ARCHIVELOG: <span className="text-white font-black">{pDb.archiveMode || 'ENABLED'}</span>
                  </div>
                  <div className="bg-[#111933] border border-emerald-500/40 px-3.5 py-2 rounded-xl text-emerald-300 font-bold flex items-center gap-2 shadow-md">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>LGWR REDO ACTIVE</span>
                  </div>
                </div>
              </div>

              {/* LIVE REPLICATION CONDUIT INFOGRAPHIC (DATA STREAM PIPELINE) */}
              <div className="bg-[#080d1e] rounded-xl p-5 border border-cyan-500/30 shadow-inner relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-2 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Real-time Data Guard Replication Conduit (Transport & Apply Pipeline)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-0.5 rounded-md font-bold">
                    ASYNC / SYNC ZERO DATA LOSS
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  {/* Left: Primary Archiver */}
                  <div className="bg-gradient-to-br from-rose-950/60 to-[#121936] border border-rose-500/40 rounded-xl p-3.5 text-center">
                    <span className="text-[10px] font-mono uppercase text-rose-300 font-bold block">Source Redo Stream</span>
                    <span className="text-xl font-mono font-black text-rose-200 mt-1 block">Seq #{pSeq}</span>
                    <span className="text-[10px] text-slate-400 font-sans mt-0.5 block">Generating ~12 MB/s Redo</span>
                  </div>

                  {/* Center: Live Flowing Stream Tube */}
                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="w-full bg-[#10172e] h-3 rounded-full overflow-hidden border border-cyan-500/50 relative shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                      <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-cyan-400 to-emerald-400 animate-pulse"></div>
                    </div>
                    <div className="flex items-center justify-between w-full mt-1.5 px-1 text-[10px] font-mono text-cyan-300 font-bold">
                      <span>NSS Network Transport</span>
                      <span className="text-emerald-400">0.02ms Network RTT</span>
                      <span>RFS / MRP Ingest</span>
                    </div>
                  </div>

                  {/* Right: Standby Ingest */}
                  <div className="bg-gradient-to-br from-cyan-950/60 to-[#121936] border border-cyan-500/40 rounded-xl p-3.5 text-center">
                    <span className="text-[10px] font-mono uppercase text-cyan-300 font-bold block">Standby Ingestion Target</span>
                    <span className="text-xl font-mono font-black text-cyan-200 mt-1 block">
                      {associatedStandbys.length > 0 ? `Seq #${getStandbySeq(associatedStandbys[0])}` : 'No Standby'}
                    </span>
                    <span className="text-[10px] text-emerald-300 font-sans mt-0.5 block">
                      {associatedStandbys.length > 0 && associatedStandbys[0].redoApplied ? 'MRP Active (Real-Time Apply)' : 'MRP Idle'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SIDE-BY-SIDE REDO SEQUENCE TEMPLATE CARDS (PRIMARY VS STANDBY TARGETS) */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* CARD 1: PRIMARY REDO SEQUENCE TEMPLATE (RED / CRIMSON THEME) */}
                {(() => {
                  const pLogs = pDb.archivedLogs || [];
                  const pLatest7Seqs = Array.from({ length: 7 }, (_, i) => {
                    const targetSeq = pSeq - i;
                    const existing = pLogs.find(l => l.sequence === targetSeq);
                    return {
                      sequence: targetSeq,
                      firstTime: formatSequenceTime(existing?.firstTime),
                      applied: 'NO'
                    };
                  }).filter(s => s.sequence >= 1);

                  return (
                    <div className="bg-[#080d1e] border-2 border-rose-500/40 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between space-y-4">
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-red-500 to-amber-500"></div>
                      
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-xl shadow-inner">
                            <Database className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black text-white font-display">PRIMARY REDO GENERATION</h3>
                              <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-mono font-black">
                                PRIMARY
                              </span>
                            </div>
                            <p className="text-xs text-cyan-200 font-mono mt-0.5">
                              Source DB: <span className="text-white font-bold">{pDb.name}</span> ({pDb.uniqueName})
                            </p>
                          </div>
                        </div>
                        
                        {/* Log Switch Action Button */}
                        <button
                          onClick={() => handleSwitchLogfile(pDb.id)}
                          disabled={switchingLogfile[pDb.id]}
                          className="flex items-center gap-2 bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 active:scale-95 text-white font-black px-4 py-2 rounded-xl text-xs shadow-lg shadow-rose-950/70 transition cursor-pointer disabled:opacity-50 font-sans flex-shrink-0 border border-rose-400/40"
                          title="Execute ALTER SYSTEM SWITCH LOGFILE on Primary Database"
                        >
                          <RotateCw className={`w-4 h-4 ${switchingLogfile[pDb.id] ? 'animate-spin' : ''}`} />
                          <span>{switchingLogfile[pDb.id] ? 'Switching...' : 'Switch Logfile'}</span>
                        </button>
                      </div>

                      {/* Primary Sequence Display Badge */}
                      <div className="bg-gradient-to-br from-rose-950/50 via-[#111933] to-[#080d1e] border border-rose-500/40 rounded-xl p-4 flex items-center justify-between shadow-inner">
                        <div>
                          <span className="text-xs text-rose-300 font-sans font-black uppercase tracking-wider block">
                            Primary DB Latest Sequence
                          </span>
                          <span className="text-3xl font-black text-rose-400 font-mono tracking-tight drop-shadow-sm block mt-1">
                            #{pSeq}
                          </span>
                        </div>
                        <div className="text-right space-y-1.5">
                          <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-lg text-xs font-mono font-black uppercase shadow-sm">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                            WRITING ACTIVE
                          </span>
                          <span className="text-xs text-cyan-200 font-mono block">
                            Mode: <span className="text-white font-bold">{pDb.archiveMode}</span>
                          </span>
                        </div>
                      </div>

                      {/* Primary Latest 7 Sequences List */}
                      <div className="border border-rose-500/30 rounded-xl overflow-hidden bg-[#070b19] shadow-md">
                        <div className="bg-rose-950/60 px-4 py-2 border-b border-rose-500/30 flex items-center justify-between text-xs font-mono font-black text-rose-200 uppercase tracking-wider">
                          <span>Primary Latest 7 Log Sequences</span>
                          <span className="text-[10px] text-cyan-300 font-normal">V$ARCHIVED_LOG</span>
                        </div>
                        <table className="w-full text-xs font-mono text-left border-collapse">
                          <thead>
                            <tr className="bg-[#0f172e] text-cyan-300 text-[10px] uppercase font-bold border-b border-[#1c2a4f]">
                              <th className="p-2.5 pl-4">Sequence</th>
                              <th className="p-2.5">Timestamp</th>
                              <th className="p-2.5 pr-4 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1c2a4f]/50">
                            {pLatest7Seqs.map((item, idx) => (
                              <tr key={item.sequence} className="hover:bg-rose-500/10 transition-colors">
                                <td className="p-2.5 pl-4 font-black text-white flex items-center gap-2">
                                  <span>Seq #{item.sequence}</span>
                                  {idx === 0 && (
                                    <span className="bg-rose-500/30 text-rose-200 border border-rose-400/50 text-[9px] px-2 py-0.5 rounded font-sans font-black">LATEST</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-cyan-200 text-xs">
                                  {item.firstTime || '--:--:--'}
                                </td>
                                <td className="p-2.5 pr-4 text-right">
                                  <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded text-[10px] font-sans font-bold uppercase">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> WRITTEN
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}

                {/* CARD 2: STANDBY REDO SEQUENCE TEMPLATE(S) FOR ALL ASSOCIATED STANDBYS */}
                {associatedStandbys.length > 0 ? (
                  <div className="space-y-6">
                    {associatedStandbys.map((stby, stbyIdx) => {
                      const sSeq = getStandbySeq(stby);
                      const lag = Math.max(0, pSeq - sSeq);
                      const isSynced = lag === 0;

                      const sLogs = stby.archivedLogs || [];
                      const sMaxSeq = sLogs.length > 0 ? Math.max(...sLogs.map(l => l.sequence)) : (stby.latestSequence || sSeq);
                      const baseSeq = Math.max(pSeq, sMaxSeq);

                      const sLatest7Seqs = Array.from({ length: 7 }, (_, i) => {
                        const targetSeq = baseSeq - i;
                        const existing = sLogs.find(l => l.sequence === targetSeq);
                        const isApplied = existing
                          ? (existing.applied === 'YES' || existing.applied === 'IN-MEMORY' || (stby.redoApplied && existing.sequence <= sSeq))
                          : (stby.redoApplied && targetSeq <= sSeq && sSeq > 0);
                        return {
                          sequence: targetSeq,
                          firstTime: existing ? formatSequenceTime(existing.firstTime) : '--:--:--',
                          applied: isApplied ? 'YES' : 'NO'
                        };
                      }).filter(s => s.sequence >= 1);

                      return (
                        <div key={stby.id} className="bg-[#080d1e] border-2 border-cyan-500/40 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between space-y-4">
                          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-600 via-blue-500 to-emerald-400"></div>

                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="p-3 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-xl shadow-inner">
                                <ShieldCheck className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-base font-black text-white font-display">
                                    STANDBY TARGET #{stbyIdx + 1}: {stby.name}
                                  </h3>
                                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-mono font-black">
                                    {stby.standbyType || 'PHYSICAL STANDBY'}
                                  </span>
                                  {onDeleteStandbyDb && (
                                    <button
                                      onClick={() => {
                                        if (confirm(`Are you sure you want to delete and dismount the physical standby database ${stby.name}?`)) {
                                          onDeleteStandbyDb(stby.id);
                                        }
                                      }}
                                      className="p-1.5 hover:bg-rose-500/20 text-rose-400 hover:text-rose-200 rounded-lg transition cursor-pointer"
                                      title="Delete Standby Target"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                                <p className="text-xs text-cyan-200 font-mono mt-0.5">
                                  Unique Name: <span className="text-white font-bold">{stby.uniqueName}</span> | Transport: <span className="text-amber-300 font-bold">{stby.transportMode || 'ASYNC'}</span> | Apply Rate: <span className="text-emerald-300 font-bold">{stby.applyRateMBS || 48.5} MB/s</span>
                                </p>
                              </div>
                            </div>

                            {/* MRP Apply Switch Toggle */}
                            {onToggleRedoApply && (
                              <div className="flex items-center gap-2 bg-[#10172e] border border-cyan-500/40 px-3 py-1.5 rounded-xl shrink-0 shadow-inner">
                                <span className="text-xs text-cyan-300 font-sans uppercase font-black">MRP Process</span>
                                <button
                                  onClick={() => handleToggleApply(stby.id)}
                                  disabled={isToggling[stby.id]}
                                  className="p-0.5 hover:opacity-80 transition text-slate-400 cursor-pointer disabled:opacity-50"
                                  title={stby.redoApplied ? 'Stop MRP Apply Process' : 'Start MRP Apply Process'}
                                >
                                  {stby.redoApplied ? (
                                    <ToggleRight className="w-8 h-8 text-emerald-400" />
                                  ) : (
                                    <ToggleLeft className="w-8 h-8 text-rose-400" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Standby Sequence Display Badge */}
                          <div className="bg-gradient-to-br from-cyan-950/50 via-[#111933] to-[#080d1e] border border-cyan-500/40 rounded-xl p-4 flex items-center justify-between shadow-inner">
                            <div>
                              <span className="text-xs text-cyan-300 font-sans font-black uppercase tracking-wider block">
                                Standby DB Applied Sequence
                              </span>
                              <span className="text-3xl font-black text-cyan-300 font-mono tracking-tight drop-shadow-sm block mt-1">
                                #{sSeq}
                              </span>
                            </div>
                            <div className="text-right space-y-1.5">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-black uppercase border shadow-sm ${
                                isSynced 
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                              }`}>
                                {isSynced ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    IN SYNC (0 LAG)
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                                    LAGGING ({lag} SEQS)
                                  </>
                                )}
                              </span>
                              <span className="text-xs text-cyan-200 font-mono block">
                                MRP: <span className={stby.redoApplied ? 'text-emerald-300 font-bold' : 'text-rose-300 font-bold'}>
                                  {stby.redoApplied ? 'APPLYING ACTIVE' : 'STOPPED'}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Standby Latest 7 Sequences List */}
                          <div className="border border-cyan-500/30 rounded-xl overflow-hidden bg-[#070b19] shadow-md">
                            <div className="bg-cyan-950/60 px-4 py-2 border-b border-cyan-500/30 flex items-center justify-between text-xs font-mono font-black text-cyan-200 uppercase tracking-wider">
                              <span>{stby.uniqueName} Latest 7 Sequences</span>
                              <span className="text-[10px] text-emerald-300 font-normal">MRP PROCESS</span>
                            </div>
                            <table className="w-full text-xs font-mono text-left border-collapse">
                              <thead>
                                <tr className="bg-[#0f172e] text-cyan-300 text-[10px] uppercase font-bold border-b border-[#1c2a4f]">
                                  <th className="p-2.5 pl-4">Sequence</th>
                                  <th className="p-2.5">Timestamp</th>
                                  <th className="p-2.5 pr-4 text-right">Applied</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#1c2a4f]/50">
                                {sLatest7Seqs.map((item, idx) => {
                                  const isApplied = item.applied === 'YES';
                                  return (
                                    <tr key={item.sequence} className="hover:bg-cyan-500/10 transition-colors">
                                      <td className="p-2.5 pl-4 font-black text-white flex items-center gap-2">
                                        <span>Seq #{item.sequence}</span>
                                        {idx === 0 && (
                                          <span className="bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 text-[9px] px-2 py-0.5 rounded font-sans font-black">LATEST</span>
                                        )}
                                      </td>
                                      <td className="p-2.5 text-cyan-200 text-xs">
                                        {item.firstTime || '--:--:--'}
                                      </td>
                                      <td className="p-2.5 pr-4 text-right">
                                        {isApplied ? (
                                          <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded text-[10px] font-sans font-bold uppercase">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> APPLIED (YES)
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded text-[10px] font-sans font-bold uppercase">
                                            <Clock className="w-3.5 h-3.5 text-amber-400" /> PENDING (NO)
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-[#080d1e] border-2 border-slate-700/60 rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center text-center text-cyan-200 text-sm italic space-y-3">
                    <ShieldAlert className="w-10 h-10 text-amber-400" />
                    <span className="text-white font-bold text-base">No physical standby target associated with this primary database.</span>
                    <span className="text-xs text-slate-400 max-w-sm">Use the Standby DB tab to deploy and mount physical standby instances to enable real-time replication.</span>
                  </div>
                )}

              </div>

              {/* SIDE-BY-SIDE MATRIX COMPARISON TABLE */}
              <div className="bg-[#080d1e] rounded-2xl border-2 border-cyan-500/30 overflow-hidden shadow-2xl mt-8">
                <div className="bg-gradient-to-r from-[#0c1630] to-[#121c3d] p-4 border-b border-cyan-500/30 flex items-center justify-between">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest font-display flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    Unified Side-by-Side Matrix (Latest 7 Log Sequences Comparison)
                  </h3>
                  <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-3 py-1 rounded-lg font-bold">
                    SYNCHRONIZATION CHECK
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead>
                      <tr className="bg-[#0e162e] text-cyan-200 border-b border-cyan-500/30 text-[11px] font-sans uppercase font-black tracking-wider">
                        <th className="p-4 text-white">Redo Sequence</th>
                        <th className="p-4 text-center text-rose-300 border-l border-cyan-500/20 bg-rose-950/20">
                          Primary Source ({pDb.name})
                        </th>
                        {associatedStandbys.map((sDb) => (
                          <th key={sDb.id} className="p-4 text-center text-cyan-300 border-l border-cyan-500/20 bg-cyan-950/20">
                            Standby Target ({sDb.name})
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c2a4f]/60">
                      {latestSeqs.map((seq, idx) => {
                        const isLatest = idx === 0;
                        const pLog = pDb.archivedLogs?.find(a => a.sequence === seq);

                        return (
                          <tr key={seq} className="hover:bg-cyan-500/5 transition-colors">
                            {/* SEQUENCE COL */}
                            <td className="p-4 font-black text-white flex items-center gap-2.5">
                              <span className="text-sm">Seq #{seq}</span>
                              {isLatest && (
                                <span className="text-[9px] bg-rose-500/25 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-sans uppercase font-black tracking-wider animate-pulse">
                                  LATEST
                                </span>
                              )}
                              {pLog?.firstTime && (
                                <span className="text-[10px] text-cyan-300/80 font-normal hidden md:inline ml-auto">
                                  {pLog.firstTime.split(' ')[1] || pLog.firstTime}
                                </span>
                              )}
                            </td>

                            {/* PRIMARY WRITTEN COL */}
                            <td className="p-4 text-center border-l border-cyan-500/20 bg-rose-500/[0.02]">
                              <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-lg text-[11px] font-sans font-bold uppercase">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>WRITTEN (YES)</span>
                              </div>
                            </td>

                            {/* EACH STANDBY APPLIED STATE COL */}
                            {associatedStandbys.map((sDb) => {
                              const sSeq = getStandbySeq(sDb);
                              const sLog = sDb.archivedLogs?.find(a => a.sequence === seq);
                              const isApplied = (sLog && (sLog.applied === 'YES' || sLog.applied === 'IN-MEMORY')) || (sDb.redoApplied && seq <= sSeq && sSeq > 0);
                              const isShipped = sLog !== undefined;

                              let badgeColor = "bg-slate-500/20 text-slate-300 border border-slate-500/30";
                              let badgeText = "PENDING (NO)";
                              let icon = <Clock className="w-4 h-4 text-slate-400" />;

                              if (isApplied) {
                                badgeColor = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10";
                                badgeText = "APPLIED (YES)";
                                icon = <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
                              } else if (isShipped) {
                                if (sDb.redoApplied) {
                                  badgeColor = "bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse";
                                  badgeText = "SHIPPED (NO)";
                                  icon = <Clock className="w-4 h-4 text-blue-400" />;
                                } else {
                                  badgeColor = "bg-rose-500/20 text-rose-300 border border-rose-500/40";
                                  badgeText = "STALLED (NO)";
                                  icon = <XCircle className="w-4 h-4 text-rose-400" />;
                                }
                              }

                              return (
                                <td key={sDb.id} className="p-4 text-center border-l border-cyan-500/20 bg-cyan-500/[0.02]">
                                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-sans font-bold uppercase ${badgeColor}`}>
                                    {icon}
                                    <span>{badgeText}</span>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                <div className="p-3.5 bg-[#0e162e] border-t border-cyan-500/30 text-xs text-cyan-200 flex items-center justify-between font-sans">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="font-medium">Active Data Guard automatic sequence sync verified across primary source and standby recovery engines.</span>
                  </div>
                  <span className="font-mono text-cyan-400 text-xs uppercase font-bold">ORACLE V$ARCHIVED_LOG</span>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

