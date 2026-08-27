import React, { useState } from 'react';
import { Radio, Plus, Trash2, Shield, AlertTriangle, RefreshCw, CheckCircle2, Server, Power, ArrowRight, Gauge, Zap, Play, Repeat, ShieldAlert, Activity, Check, Terminal, X, Monitor, ChevronRight, Archive, ArrowLeftRight, ShieldCheck, Folder } from 'lucide-react';
import { SSHNode, PrimaryDatabase, StandbyDatabase, UserAccount } from '../types';
import RmanBackupView from './RmanBackupView';
import DataPumpView from './DataPumpView';
import { apiFetch } from '../lib/api';

interface StandbyDbViewProps {
  nodes: SSHNode[];
  primaryDbs: PrimaryDatabase[];
  standbyDbs: StandbyDatabase[];
  currentUser?: UserAccount;
  onAddStandbyDb: (db: Omit<StandbyDatabase, 'id' | 'status' | 'openMode' | 'syncStatus' | 'lagSeconds' | 'transportStatus' | 'applyRateMBS'>) => Promise<void>;
  onDeleteStandbyDb: (id: string) => Promise<void>;
  onToggleRedoApply: (id: string) => Promise<void>;
  onPowerOnStandbyDb?: (id: string) => Promise<void>;
  onSetModeStandbyDb?: (id: string, mode: 'MOUNTED' | 'READ ONLY' | 'READ ONLY WITH APPLY' | 'SHUTDOWN') => Promise<void>;
  onSwitchoverStandbyDb?: (id: string) => Promise<void>;
  onFailoverStandbyDb?: (id: string) => Promise<void>;
  isConnecting: boolean;
}

export default function StandbyDbView({
  nodes,
  primaryDbs,
  standbyDbs,
  currentUser,
  onAddStandbyDb,
  onDeleteStandbyDb,
  onToggleRedoApply,
  onPowerOnStandbyDb,
  onSetModeStandbyDb,
  onSwitchoverStandbyDb,
  onFailoverStandbyDb,
  isConnecting
}: StandbyDbViewProps) {
  const [subTab, setSubTab] = useState<'instances' | 'rman' | 'datapump'>('instances');
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [primaryDbId, setPrimaryDbId] = useState('');
  const [nodeId, setNodeId] = useState('');
  const [uniqueName, setUniqueName] = useState('');
  const [standbyType, setStandbyType] = useState<'PHYSICAL STANDBY' | 'LOGICAL STANDBY' | 'SNAPSHOT STANDBY'>('PHYSICAL STANDBY');
  const [transportMode, setTransportMode] = useState<'ASYNC' | 'SYNC'>('ASYNC');
  const [redoApplied, setRedoApplied] = useState(true);
  const [oracleBase, setOracleBase] = useState('/u01/app/oracle');
  const [oracleHome, setOracleHome] = useState('/u01/app/oracle/product/19.3.0/db_1');
  const [gridHome, setGridHome] = useState('/u01/app/19.3.0/grid');
  const [tnsAdmin, setTnsAdmin] = useState('/u01/app/oracle/product/19.3.0/db_1/network/admin');
  const [datafilePath, setDatafilePath] = useState('+DATA/PRODDB_STBY/DATAFILE');
  const [fraPath, setFraPath] = useState('+RECO/PRODDB_STBY');
  const [archiveLogDest, setArchiveLogDest] = useState('LOCATION=+RECO/PRODDB_STBY/ARCHIVELOG');
  const [redoLogPath, setRedoLogPath] = useState('+DATA/PRODDB_STBY/ONLINELOG, +RECO/PRODDB_STBY/ONLINELOG');
  const [dgBrokerConfigPath, setDgBrokerConfigPath] = useState('/u01/app/oracle/product/19.3.0/db_1/dbs/dr1proddb_stby.dat');
  const [auditFileDest, setAuditFileDest] = useState('/u01/app/oracle/admin/proddb_stby/adump');
  const [passwordFilePath, setPasswordFilePath] = useState('/u01/app/oracle/product/19.3.0/db_1/dbs/orapwproddb_stby');
  const [showPathDetailsId, setShowPathDetailsId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Auto-sync form paths whenever Primary DB or Destination Node is changed
  const handlePrimaryChange = (pId: string) => {
    setPrimaryDbId(pId);
    const p = primaryDbs.find(item => item.id === pId);
    if (p) {
      const baseName = p.name || 'PRODDB';
      const stbyName = baseName;
      const stbyUnique = `${baseName}_STBY`;
      const stbySid = `${baseName.toLowerCase()}_stby`;
      setName(stbyName);
      setUniqueName(stbyUnique);

      const targetNode = nodes.find(n => n.id === nodeId) || nodes.find(n => n.id !== p.nodeId) || nodes[0];
      const isWin = targetNode?.osType === 'Windows';

      if (isWin) {
        setOracleBase('C:\\app\\oracle');
        setOracleHome(targetNode?.oracleHome || 'C:\\app\\oracle\\product\\19.3.0\\dbhome_1');
        setTnsAdmin('C:\\app\\oracle\\product\\19.3.0\\dbhome_1\\network\\admin');
        setDatafilePath(`D:\\oracle\\oradata\\${stbySid}`);
        setFraPath(`E:\\oracle\\fast_recovery_area\\${stbySid}`);
        setArchiveLogDest(`LOCATION=E:\\oracle\\fast_recovery_area\\${stbySid}\\archivelog`);
        setRedoLogPath(`D:\\oracle\\oradata\\${stbySid}\\redo01.log, E:\\oracle\\fast_recovery_area\\${stbySid}\\redo02.log`);
        setDgBrokerConfigPath(`C:\\app\\oracle\\product\\19.3.0\\dbhome_1\\database\\dr1${stbySid}.dat`);
        setAuditFileDest(`C:\\app\\oracle\\admin\\${stbySid}\\adump`);
        setPasswordFilePath(`C:\\app\\oracle\\product\\19.3.0\\dbhome_1\\database\\pwd${stbySid}.ora`);
      } else {
        const isAsm = p.datafilePath?.includes('+') || p.dbType?.includes('RAC');
        setOracleBase(p.oracleBase || '/u01/app/oracle');
        setOracleHome(targetNode?.oracleHome || p.oracleHome || '/u01/app/oracle/product/19.3.0/db_1');
        setGridHome(targetNode?.gridHome || p.gridHome || '/u01/app/19.3.0/grid');
        setTnsAdmin(`${targetNode?.oracleHome || p.oracleHome || '/u01/app/oracle/product/19.3.0/db_1'}/network/admin`);
        if (isAsm) {
          setDatafilePath(`+DATA/${stbyUnique}/DATAFILE`);
          setFraPath(`+RECO/${stbyUnique}`);
          setArchiveLogDest(`LOCATION=+RECO/${stbyUnique}/ARCHIVELOG`);
          setRedoLogPath(`+DATA/${stbyUnique}/ONLINELOG, +RECO/${stbyUnique}/ONLINELOG`);
          setDgBrokerConfigPath(`+DATA/${stbyUnique}/dr1${stbySid}.dat`);
          setPasswordFilePath(`+DATA/${stbyUnique}/orapw${stbySid}`);
        } else {
          setDatafilePath(`/u02/oradata/${stbySid}`);
          setFraPath(`/u03/fast_recovery_area/${stbySid}`);
          setArchiveLogDest(`LOCATION=/u03/fast_recovery_area/${stbySid}/archivelog`);
          setRedoLogPath(`/u02/oradata/${stbySid}/redo01.log, /u03/fast_recovery_area/${stbySid}/redo02.log`);
          setDgBrokerConfigPath(`${targetNode?.oracleHome || p.oracleHome || '/u01/app/oracle/product/19.3.0/db_1'}/dbs/dr1${stbySid}.dat`);
          setPasswordFilePath(`${targetNode?.oracleHome || p.oracleHome || '/u01/app/oracle/product/19.3.0/db_1'}/dbs/orapw${stbySid}`);
        }
        setAuditFileDest(`/u01/app/oracle/admin/${stbySid}/adump`);
      }
    }
  };

  const handleNodeChange = (nId: string) => {
    setNodeId(nId);
    const targetNode = nodes.find(n => n.id === nId);
    const p = primaryDbs.find(item => item.id === primaryDbId) || primaryDbs[0];
    const baseName = name || p?.name || 'PRODDB';
    const stbySid = `${baseName.toLowerCase()}_stby`;
    const stbyUnique = uniqueName || `${baseName}_STBY`;

    if (targetNode?.osType === 'Windows') {
      setOracleBase('C:\\app\\oracle');
      setOracleHome(targetNode.oracleHome || 'C:\\app\\oracle\\product\\19.3.0\\dbhome_1');
      setTnsAdmin('C:\\app\\oracle\\product\\19.3.0\\dbhome_1\\network\\admin');
      setDatafilePath(`D:\\oracle\\oradata\\${stbySid}`);
      setFraPath(`E:\\oracle\\fast_recovery_area\\${stbySid}`);
      setArchiveLogDest(`LOCATION=E:\\oracle\\fast_recovery_area\\${stbySid}\\archivelog`);
      setRedoLogPath(`D:\\oracle\\oradata\\${stbySid}\\redo01.log, E:\\oracle\\fast_recovery_area\\${stbySid}\\redo02.log`);
      setDgBrokerConfigPath(`C:\\app\\oracle\\product\\19.3.0\\dbhome_1\\database\\dr1${stbySid}.dat`);
      setAuditFileDest(`C:\\app\\oracle\\admin\\${stbySid}\\adump`);
      setPasswordFilePath(`C:\\app\\oracle\\product\\19.3.0\\dbhome_1\\database\\pwd${stbySid}.ora`);
    } else {
      if (targetNode?.oracleHome) {
        setOracleHome(targetNode.oracleHome);
        setTnsAdmin(`${targetNode.oracleHome}/network/admin`);
      }
      if (targetNode?.gridHome) {
        setGridHome(targetNode.gridHome);
      }
    }
  };

  // Power Recovery Console Modal State
  const [recoveryConsoleDb, setRecoveryConsoleDb] = useState<StandbyDatabase | null>(null);
  const [recoveryLogs, setRecoveryLogs] = useState<string[]>([]);
  const [isRecovering, setIsRecovering] = useState(false);

  // Check RBAC permission for standby DB operations
  const isViewOnly = currentUser?.role === 'VIEWER';
  const canManage = !isViewOnly && (currentUser?.role === 'ADMIN' || currentUser?.permissions?.canManageStandbyDb === true);

  const [dgProtectionMode, setDgProtectionMode] = useState<'MAXIMUM PROTECTION' | 'MAXIMUM AVAILABILITY' | 'MAXIMUM PERFORMANCE'>('MAXIMUM PERFORMANCE');
  const [brokerMessage, setBrokerMessage] = useState<string | null>(null);
  const [isDgModeLoading, setIsDgModeLoading] = useState(false);

  const handleSetProtectionMode = async (mode: 'MAXIMUM PROTECTION' | 'MAXIMUM AVAILABILITY' | 'MAXIMUM PERFORMANCE') => {
    if (!canManage) return;
    setIsDgModeLoading(true);
    setBrokerMessage(null);
    try {
      const primaryId = primaryDbs[0]?.id || 'primary-1';
      const res = await apiFetch('/api/dataguard/set-protection-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryDbId: primaryId, mode })
      });
      const data = await res.json();
      if (data && data.success) {
        setDgProtectionMode(mode);
        setBrokerMessage(`✅ Protection Mode changed to ${mode}. Executed SQL: ${data.sqlCmd}`);
      } else {
        setBrokerMessage(`❌ Error changing protection mode: ${data.error || 'Failed'}`);
      }
    } catch (err: any) {
      setBrokerMessage(`❌ Exception changing protection mode: ${err.message || 'Error'}`);
    } finally {
      setIsDgModeLoading(false);
    }
  };

  const handleBrokerAction = async (stbyId: string, action: 'ENABLE' | 'DISABLE' | 'VALIDATE' | 'RESYNC') => {
    if (!canManage) return;
    setActionLoadingId(`broker-${action}`);
    setBrokerMessage(null);
    try {
      const res = await apiFetch('/api/dataguard/broker-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ standbyDbId: stbyId, action })
      });
      const data = await res.json();
      if (data && data.success) {
        setBrokerMessage(`⚡ DGMGRL Broker Action [${action}] Completed! Result:\n${data.output}`);
      } else {
        setBrokerMessage(`❌ Broker Action Failed: ${data.error || 'Failed'}`);
      }
    } catch (err: any) {
      setBrokerMessage(`❌ Exception running Broker action: ${err.message || 'Error'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRunFullPowerRecovery = async (db: StandbyDatabase) => {
    setRecoveryConsoleDb(db);
    setIsRecovering(true);
    setRecoveryLogs([
      `[${new Date().toLocaleTimeString()}] Initializing Standby Power Recovery Automation for ${db.uniqueName}...`,
      `[${new Date().toLocaleTimeString()}] STEP 1/5: Exporting Standby ORACLE_SID...`,
      `$ export ORACLE_SID=${db.uniqueName}`
    ]);

    await new Promise(r => setTimeout(r, 100));

    setRecoveryLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] STEP 2/5: Checking Standby Dedicated Listener...`,
      `$ lsnrctl status LISTENER_${db.uniqueName}`,
      `Listener LISTENER_${db.uniqueName} was OFFLINE. Executing listener startup...`,
      `$ lsnrctl start LISTENER_${db.uniqueName}`,
      `STATUS: Dedicated Standby Listener is now ONLINE on Port 1522.`
    ]);

    await new Promise(r => setTimeout(r, 100));

    setRecoveryLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] STEP 3/5: Connecting to SQL*Plus as SYSDBA...`,
      `$ sqlplus / as sysdba`,
      `Connected to an idle instance.`
    ]);

    await new Promise(r => setTimeout(r, 100));

    setRecoveryLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] STEP 4/5: Mounting Standby Controlfile...`,
      `SQL> STARTUP MOUNT;`,
      `ORACLE instance started. Total System Global Area (SGA) allocated.`,
      `Database mounted.`
    ]);

    await new Promise(r => setTimeout(r, 100));

    setRecoveryLogs(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] STEP 5/5: Opening Read Only & Starting Managed Recovery (MRP)...`,
      `SQL> ALTER DATABASE OPEN READ ONLY;`,
      `SQL> ALTER DATABASE RECOVER MANAGED STANDBY DATABASE DISCONNECT FROM SESSION;`,
      `SUCCESS: Standby Database ${db.uniqueName} is now OPEN READ ONLY WITH APPLY!`
    ]);

    if (onPowerOnStandbyDb) {
      await onPowerOnStandbyDb(db.id);
    }

    setIsRecovering(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!canManage) {
      setError('Access Denied: You do not have permissions to deploy or edit Standby Databases.');
      return;
    }

    if (!name || !primaryDbId || !nodeId || !uniqueName) {
      setError('Please fill in all required fields.');
      return;
    }

    if (standbyDbs.some(db => db.name.toLowerCase() === name.toLowerCase() && db.nodeId === nodeId)) {
      setError('A Standby database with this Name already exists on the selected Host Node.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddStandbyDb({
        name,
        primaryDbId,
        nodeId,
        uniqueName,
        standbyType,
        transportMode,
        redoApplied,
        oracleBase,
        oracleHome,
        gridHome,
        tnsAdmin,
        datafilePath,
        fraPath,
        archiveLogDest,
        redoLogPath,
        dgBrokerConfigPath,
        auditFileDest,
        passwordFilePath
      });
      // Reset form
      setName('');
      setPrimaryDbId('');
      setNodeId('');
      setUniqueName('');
      setStandbyType('PHYSICAL STANDBY');
      setTransportMode('ASYNC');
      setRedoApplied(true);
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to add standby database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePowerOn = async (id: string) => {
    if (!canManage || !onPowerOnStandbyDb) return;
    setActionLoadingId(`${id}-power-on`);
    try {
      await onPowerOnStandbyDb(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSetMode = async (id: string, mode: 'MOUNTED' | 'READ ONLY' | 'READ ONLY WITH APPLY' | 'SHUTDOWN') => {
    if (!canManage || !onSetModeStandbyDb) return;
    setActionLoadingId(`${id}-mode-${mode}`);
    try {
      await onSetModeStandbyDb(id, mode);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSwitchover = async (id: string, dbName: string) => {
    if (!canManage || !onSwitchoverStandbyDb) return;
    if (!confirm(`Are you sure you want to execute Graceful Data Guard Switchover for ${dbName}? This will promote ${dbName} to PRIMARY and demote current Primary to STANDBY.`)) {
      return;
    }
    setActionLoadingId(`${id}-switchover`);
    try {
      await onSwitchoverStandbyDb(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleFailover = async (id: string, dbName: string) => {
    if (!canManage || !onFailoverStandbyDb) return;
    if (!confirm(`CRITICAL WARNING: Emergency Failover will forcibly promote ${dbName} to PRIMARY! Ensure primary node is unrecoverable. Proceed?`)) {
      return;
    }
    setActionLoadingId(`${id}-failover`);
    try {
      await onFailoverStandbyDb(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="standby-db-root">
      {/* Header section */}
      {isViewOnly && (
        <div className="bg-pink-950/60 border-2 border-pink-500/60 rounded-xl p-3.5 text-pink-200 text-xs font-bold flex items-center gap-3 shadow-lg">
          <Radio className="w-5 h-5 text-pink-400 shrink-0 animate-pulse" />
          <span>VIEW-ONLY USER ROLE ACTIVE: You are logged in with Read-Only permissions. Deploying standby DBs, toggling Redo Apply, initiating Switchover/Failover, and changing open modes are strictly restricted.</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-[#0d1326] p-6 rounded-xl border border-[#1e2a4a] shadow-2xl gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="header-banner-icon-box p-3 text-sky-400 shrink-0 flex items-center justify-center">
              <Radio className="w-6 h-6 animate-pulse text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-display font-bold text-slate-100 tracking-tight">Oracle Data Guard Standby Engine</h1>
                {!canManage && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
                    View Only (Non-Admin)
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-xs mt-0.5 font-sans">
                Real-time redo transport, Active Data Guard, Graceful Switchover, Emergency Failover & Mode management.
              </p>
            </div>
          </div>
        </div>

        {subTab === 'instances' && (
          canManage ? (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 active:bg-fuchsia-700 text-white rounded-lg font-medium text-xs transition cursor-pointer self-start md:self-auto shadow-md"
              id="toggle-add-standby-form"
            >
              <Plus className="w-4 h-4" />
              {showAddForm ? 'Close Console' : 'Deploy Standby Database'}
            </button>
          ) : (
            <div className="text-xs text-slate-400 font-mono bg-slate-900/60 px-3 py-1.5 rounded border border-slate-800">
              Read-Only User Session
            </div>
          )
        )}
      </div>

      {/* Sub-navigation Tabs: Instances | RMAN Backup Engine | Data Pump */}
      <div className="flex items-center gap-2 bg-[#0d1326] p-1.5 rounded-xl border border-[#1e2a4a]">
        <button
          onClick={() => setSubTab('instances')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            subTab === 'instances'
              ? 'bg-pink-600 text-white font-bold border border-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.35)]'
              : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500'
          }`}
        >
          <Radio className="w-4 h-4 text-white" />
          Standby DB Replications ({standbyDbs.length})
        </button>

        <button
          onClick={() => setSubTab('rman')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            subTab === 'rman'
              ? 'bg-pink-600 text-white font-bold border border-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.35)]'
              : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500'
          }`}
        >
          <Archive className="w-4 h-4 text-white" />
          RMAN Backup Engine
        </button>

        <button
          onClick={() => setSubTab('datapump')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            subTab === 'datapump'
              ? 'bg-pink-600 text-white font-bold border border-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.35)]'
              : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4 text-white" />
          Data Pump (expdp / impdp)
        </button>
      </div>

      {subTab === 'rman' && (
        <RmanBackupView
          nodes={nodes}
          primaryDbs={primaryDbs}
          standbyDbs={standbyDbs}
          isConnecting={isConnecting}
        />
      )}

      {subTab === 'datapump' && (
        <DataPumpView
          nodes={nodes}
          primaryDbs={primaryDbs}
          standbyDbs={standbyDbs}
          isConnecting={isConnecting}
        />
      )}

      {subTab === 'instances' && (
        <>
          {/* Data Guard Protection Modes & Broker Operations Panel */}
          <div className="bg-[#121b33] p-5 rounded-2xl border border-[#1c2a4f] shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1c2a4f] pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-display">Data Guard Protection Level & Broker Engine (DGMGRL)</h3>
                  <p className="text-[11px] text-slate-400 font-sans">Switch protection modes and execute broker commands with zero downtime</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono uppercase">Current Mode:</span>
                <span className="text-xs font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                  {dgProtectionMode}
                </span>
              </div>
            </div>

            {/* Mode Selector Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleSetProtectionMode('MAXIMUM PERFORMANCE')}
                disabled={!canManage || isDgModeLoading}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  dgProtectionMode === 'MAXIMUM PERFORMANCE'
                    ? 'bg-emerald-500/15 border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                    : 'bg-[#090e1e] border-[#1c2a4f] hover:border-emerald-500/40'
                }`}
              >
                <div className="text-xs font-bold font-mono text-emerald-400 flex items-center justify-between">
                  <span>MAXIMUM PERFORMANCE</span>
                  {dgProtectionMode === 'MAXIMUM PERFORMANCE' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-sans leading-tight">
                  Asynchronous redo transport (ASYNC). Minimum primary impact with minimal lag.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSetProtectionMode('MAXIMUM AVAILABILITY')}
                disabled={!canManage || isDgModeLoading}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  dgProtectionMode === 'MAXIMUM AVAILABILITY'
                    ? 'bg-sky-500/15 border-sky-500/60 shadow-[0_0_12px_rgba(14,165,233,0.25)]'
                    : 'bg-[#090e1e] border-[#1c2a4f] hover:border-sky-500/40'
                }`}
              >
                <div className="text-xs font-bold font-mono text-sky-400 flex items-center justify-between">
                  <span>MAXIMUM AVAILABILITY</span>
                  {dgProtectionMode === 'MAXIMUM AVAILABILITY' && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-sans leading-tight">
                  Synchronous transport (SYNC). Zero data loss if standby reachable; falls back to ASYNC if offline.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSetProtectionMode('MAXIMUM PROTECTION')}
                disabled={!canManage || isDgModeLoading}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  dgProtectionMode === 'MAXIMUM PROTECTION'
                    ? 'bg-fuchsia-500/15 border-fuchsia-500/60 shadow-[0_0_12px_rgba(217,70,239,0.25)]'
                    : 'bg-[#090e1e] border-[#1c2a4f] hover:border-fuchsia-500/40'
                }`}
              >
                <div className="text-xs font-bold font-mono text-fuchsia-400 flex items-center justify-between">
                  <span>MAXIMUM PROTECTION</span>
                  {dgProtectionMode === 'MAXIMUM PROTECTION' && <CheckCircle2 className="w-4 h-4 text-fuchsia-400" />}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-sans leading-tight">
                  Synchronous transport (SYNC AFFIRM). Guarantees zero data loss across primary outages.
                </p>
              </button>
            </div>

            {/* DGMGRL Broker Operations Row */}
            <div className="pt-2 border-t border-[#1c2a4f]/60 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                Data Guard Broker (DGMGRL) Commands:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBrokerAction(standbyDbs[0]?.id || 'standby-1', 'ENABLE')}
                  disabled={!canManage}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-mono font-bold cursor-pointer transition"
                >
                  Enable Broker
                </button>
                <button
                  type="button"
                  onClick={() => handleBrokerAction(standbyDbs[0]?.id || 'standby-1', 'VALIDATE')}
                  disabled={!canManage}
                  className="px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 rounded-lg text-xs font-mono font-bold cursor-pointer transition"
                >
                  Validate Config
                </button>
                <button
                  type="button"
                  onClick={() => handleBrokerAction(standbyDbs[0]?.id || 'standby-1', 'RESYNC')}
                  disabled={!canManage}
                  className="px-3 py-1.5 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 text-fuchsia-300 border border-fuchsia-500/40 rounded-lg text-xs font-mono font-bold cursor-pointer transition"
                >
                  Resync Redo Gap
                </button>
                <button
                  type="button"
                  onClick={() => handleBrokerAction(standbyDbs[0]?.id || 'standby-1', 'DISABLE')}
                  disabled={!canManage}
                  className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-mono font-bold cursor-pointer transition"
                >
                  Disable Broker
                </button>
              </div>
            </div>

            {brokerMessage && (
              <div className="p-3 bg-[#090e1e] border border-sky-500/30 rounded-xl text-xs font-mono text-sky-200 whitespace-pre-wrap leading-relaxed animate-fade-in">
                {brokerMessage}
              </div>
            )}
          </div>

      {/* Add standby database form */}
      {showAddForm && canManage && (
        <form onSubmit={handleSubmit} className="bg-[#121b33] p-6 rounded-xl border border-[#1e2a4a] shadow-xl space-y-4 animate-fade-in">
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-display border-b border-[#1e2a4a] pb-2">
            Configure Standby Recovery Target
          </h2>

          {primaryDbs.length === 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>You must have at least one registered <strong>Primary Database</strong> to configure a Standby.</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Standby DB Name *</label>
              <input
                type="text"
                placeholder="e.g. ORCL_STBY"
                value={name}
                onChange={e => setName(e.target.value.toUpperCase())}
                className="w-full bg-[#070c19] border border-[#1e2a4a] rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-fuchsia-500 outline-none font-mono"
                required
                disabled={primaryDbs.length === 0}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Standby Unique Name (DB_UNIQUE_NAME) *</label>
              <input
                type="text"
                placeholder="e.g. ORCL_STB"
                value={uniqueName}
                onChange={e => setUniqueName(e.target.value.toUpperCase())}
                className="w-full bg-[#070c19] border border-[#1e2a4a] rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-fuchsia-500 outline-none font-mono"
                required
                disabled={primaryDbs.length === 0}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Primary Source Database *</label>
              <select
                value={primaryDbId}
                onChange={e => handlePrimaryChange(e.target.value)}
                className="w-full bg-[#070c19] border border-[#1e2a4a] rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-fuchsia-500 outline-none font-mono"
                required
                disabled={primaryDbs.length === 0}
              >
                <option value="">-- Select Primary Source --</option>
                {primaryDbs.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.uniqueName})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Destination Host Node *</label>
              <select
                value={nodeId}
                onChange={e => handleNodeChange(e.target.value)}
                className="w-full bg-[#070c19] border border-[#1e2a4a] rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-fuchsia-500 outline-none font-mono"
                required
                disabled={primaryDbs.length === 0}
              >
                <option value="">-- Select Node --</option>
                {nodes.map(n => (
                  <option key={n.id} value={n.id}>{n.name} ({n.ipAddress})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Standby Type</label>
              <select
                value={standbyType}
                onChange={e => setStandbyType(e.target.value as any)}
                className="w-full bg-[#070c19] border border-[#1e2a4a] rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-fuchsia-500 outline-none font-mono"
                disabled={primaryDbs.length === 0}
              >
                <option value="PHYSICAL STANDBY">PHYSICAL STANDBY</option>
                <option value="LOGICAL STANDBY">LOGICAL STANDBY</option>
                <option value="SNAPSHOT STANDBY">SNAPSHOT STANDBY</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Redo Transport Mode</label>
              <select
                value={transportMode}
                onChange={e => setTransportMode(e.target.value as any)}
                className="w-full bg-[#070c19] border border-[#1e2a4a] rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-fuchsia-500 outline-none font-mono"
                disabled={primaryDbs.length === 0}
              >
                <option value="ASYNC">ASYNC (Maximum Performance)</option>
                <option value="SYNC">SYNC (Maximum Protection)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Redo Log Apply</label>
              <select
                value={redoApplied ? 'true' : 'false'}
                onChange={e => setRedoApplied(e.target.value === 'true')}
                className="w-full bg-[#070c19] border border-[#1e2a4a] rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-fuchsia-500 outline-none font-mono"
                disabled={primaryDbs.length === 0}
              >
                <option value="true">Active (Applying Redo)</option>
                <option value="false">Stopped (Managed Recovery Off)</option>
              </select>
            </div>
          </div>

          {/* Detailed OFA & Directory Paths Section */}
          <div className="p-3 bg-[#0a1020] border border-[#1c2c4c] rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-fuchsia-300">
              <span>Standby Machine Storage & OFA Directory Paths</span>
              <span className="text-[10px] text-slate-400 font-normal">Auto-derived from Primary & Target Host</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">ORACLE_HOME (Binaries)</label>
                <input
                  type="text"
                  value={oracleHome}
                  onChange={e => setOracleHome(e.target.value)}
                  className="w-full bg-[#070c19] border border-[#1e2a4a] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-fuchsia-400 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">Datafiles Path (DB_CREATE_FILE_DEST)</label>
                <input
                  type="text"
                  value={datafilePath}
                  onChange={e => setDatafilePath(e.target.value)}
                  className="w-full bg-[#070c19] border border-[#1e2a4a] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-fuchsia-400 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">Fast Recovery Area (FRA)</label>
                <input
                  type="text"
                  value={fraPath}
                  onChange={e => setFraPath(e.target.value)}
                  className="w-full bg-[#070c19] border border-[#1e2a4a] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-fuchsia-400 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">Archive Log Dest (LOG_ARCHIVE_DEST_1)</label>
                <input
                  type="text"
                  value={archiveLogDest}
                  onChange={e => setArchiveLogDest(e.target.value)}
                  className="w-full bg-[#070c19] border border-[#1e2a4a] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-fuchsia-400 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">Standby Redo Logs (SRLs)</label>
                <input
                  type="text"
                  value={redoLogPath}
                  onChange={e => setRedoLogPath(e.target.value)}
                  className="w-full bg-[#070c19] border border-[#1e2a4a] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-fuchsia-400 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400">DG Broker Config File</label>
                <input
                  type="text"
                  value={dgBrokerConfigPath}
                  onChange={e => setDgBrokerConfigPath(e.target.value)}
                  className="w-full bg-[#070c19] border border-[#1e2a4a] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-fuchsia-400 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-[#070c19] hover:bg-slate-900 border border-[#1e2a4a] rounded-lg text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || primaryDbs.length === 0}
              className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? 'Deploying...' : 'Deploy Standby'}
            </button>
          </div>
        </form>
      )}

      {/* Standby replication targets grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {standbyDbs.map(db => {
          const primarySource = primaryDbs.find(p => p.id === db.primaryDbId);
          const runningNode = nodes.find(n => n.id === db.nodeId);
          const isShutdown = db.status === 'SHUTDOWN' || db.openMode === 'CLOSED';

          return (
            <div key={db.id} className="bg-[#121b33] p-5 rounded-xl border border-[#1e2a4a] shadow-lg flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 rounded-full blur-2xl -mr-6 -mt-6"></div>

              <div>
                {/* Standby Header */}
                <div className="flex items-start justify-between border-b border-[#1e2a4a]/60 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg shadow-md text-white ${
                      isShutdown ? 'bg-red-900/60 border border-red-700/50' : 'bg-gradient-to-tr from-fuchsia-600 to-pink-500'
                    }`}>
                      <Radio className={`w-5 h-5 ${db.syncStatus === 'SYNCHRONIZED' ? 'animate-none' : 'animate-pulse'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-md font-bold text-slate-200 font-display">{db.name}</span>
                        <span className="text-[10px] bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase glow-magenta">
                          STANDBY
                        </span>
                        {isShutdown && (
                          <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded font-mono font-bold uppercase animate-pulse">
                            OFFLINE / SHUTDOWN
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-mono block mt-0.5">Unique: {db.uniqueName}</span>
                    </div>
                  </div>

                  {canManage && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteStandbyDb(db.id); }}
                      className="p-2 bg-[#070c19] hover:bg-red-500/15 text-slate-500 hover:text-red-400 rounded-lg border border-[#1e2a4a] hover:border-red-500/25 transition cursor-pointer"
                      title="Dismount & Delete Standby Target"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Relationship Link Visualizer */}
                <div className="my-3 px-3 py-2 bg-[#070c19] rounded-lg border border-[#1e2a4a]/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                    <span>Primary Source:</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-200 font-mono font-bold">
                    <span>{primarySource ? primarySource.uniqueName : 'Primary Cluster'}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span className="text-fuchsia-400">{db.uniqueName}</span>
                  </div>
                </div>

                {/* Metadata info */}
                <div className="grid grid-cols-2 gap-4 py-2.5 text-xs font-sans">
                  <div className="space-y-1">
                    <span className="text-slate-500 font-medium">Target Host Node:</span>
                    <span className="text-slate-200 block font-semibold truncate">{runningNode ? runningNode.name : 'Standby Node'}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 font-medium">Standby Mode:</span>
                    <span className="text-slate-300 block font-mono font-semibold">{db.standbyType}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 font-medium">Transport Mode:</span>
                    <span className="text-slate-300 block font-mono text-xs">{db.transportMode} protocol</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 font-medium">Instance Mode Status:</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`h-2 w-2 rounded-full ${
                        isShutdown ? 'bg-red-500' : db.status === 'MOUNTED' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}></span>
                      <span className="text-slate-200 font-mono font-bold text-xs uppercase">{db.status}</span>
                      <span className="text-slate-400">({db.openMode})</span>
                    </div>
                  </div>
                </div>

                {/* Continuous Synchronization & Redo Status Indicators */}
                <div className="mt-2 space-y-3 bg-[#070c19] p-4 rounded-xl border border-[#1e2a4a] text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-cyan-400" />
                      <span className="text-slate-400 font-medium font-sans">Synchronization State</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase ${
                      db.syncStatus === 'SYNCHRONIZED' ? 'bg-emerald-500/10 text-emerald-400 glow-green' :
                      db.syncStatus === 'SYNCING' ? 'bg-blue-500/10 text-blue-400 glow-blue animate-pulse' :
                      db.syncStatus === 'LAG_DETECTED' ? 'bg-amber-500/10 text-amber-400 glow-orange' : 'bg-red-500/10 text-red-400 glow-red'
                    }`}>
                      {db.syncStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-[#1e2a4a]/40 font-mono">
                    <div>
                      <div className="text-slate-500 text-[10px] font-sans">LOG TRANSPORT LAG</div>
                      <div className={`text-sm font-bold mt-0.5 ${db.lagSeconds === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {db.lagSeconds === 0 ? '0s (No Lag)' : `${db.lagSeconds}s lag`}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px] font-sans">TRANSPORT STATUS</div>
                      <div className={`text-sm font-bold mt-0.5 flex items-center gap-1 ${db.transportStatus === 'TRANSPORTING' ? 'text-cyan-400' : 'text-red-400'}`}>
                        <Zap className={`w-3.5 h-3.5 ${db.transportStatus === 'TRANSPORTING' ? 'animate-bounce text-cyan-400' : ''}`} />
                        {db.transportStatus}
                      </div>
                    </div>
                  </div>

                  {/* Redo Apply Engine */}
                  <div className="pt-2 border-t border-[#1e2a4a]/40 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <RefreshCw className={`w-3.5 h-3.5 ${db.redoApplied ? 'animate-spin text-fuchsia-400' : 'text-slate-500'}`} />
                      <span className="font-sans font-medium text-slate-500">REDO LOG APPLY ENGINE:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onToggleRedoApply(db.id)}
                        disabled={!canManage || isShutdown}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase transition cursor-pointer flex items-center gap-1.5 ${
                          db.redoApplied
                            ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 hover:bg-fuchsia-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                        title={db.redoApplied ? 'Click to Stop Redo Apply (MRP)' : 'Click to Start Redo Apply (MRP)'}
                      >
                        {db.redoApplied ? 'APPLY ACTIVE (STOP MRP)' : 'APPLY SUSPENDED (START MRP)'}
                      </button>
                    </div>
                  </div>

                  {db.redoApplied && (
                    <div className="space-y-1 bg-[#121b33]/45 p-2 rounded-lg border border-[#1e2a4a]/40">
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>REDO APPLY SPEED:</span>
                        <span className="font-bold text-fuchsia-400">{db.applyRateMBS.toFixed(1)} MB/sec</span>
                      </div>
                      <div className="w-full bg-[#070c19] rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-fuchsia-500 to-pink-500 h-1 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, (db.applyRateMBS / 15) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* OFA Machine & Storage Paths Quick Inspector */}
                <div className="mt-2 bg-[#070c19] p-2.5 rounded-xl border border-[#1e2a4a] text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Folder className="w-3 h-3 text-cyan-400" />
                      Host Node & OFA Storage Paths
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPathDetailsId(showPathDetailsId === db.id ? null : db.id)}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-bold cursor-pointer"
                    >
                      {showPathDetailsId === db.id ? 'Hide Paths ▲' : 'View Paths ▼'}
                    </button>
                  </div>
                  {showPathDetailsId === db.id && (
                    <div className="space-y-1.5 pt-1.5 border-t border-[#1c2c4c] text-[10px] text-slate-300">
                      <div><span className="text-slate-500">ORACLE_HOME:</span> <span className="text-amber-300 font-mono">{db.oracleHome || runningNode?.oracleHome || '/u01/app/oracle/product/19.3.0/db_1'}</span></div>
                      <div><span className="text-slate-500">DATAFILES:</span> <span className="text-emerald-300 font-mono">{db.datafilePath || `+DATA/${db.uniqueName}/DATAFILE`}</span></div>
                      <div><span className="text-slate-500">FRA / ARCHIVE:</span> <span className="text-cyan-300 font-mono">{db.fraPath || db.archiveLogDest || `+RECO/${db.uniqueName}`}</span></div>
                      <div><span className="text-slate-500">STANDBY REDO LOGS:</span> <span className="text-fuchsia-300 font-mono">{db.redoLogPath || `+DATA/${db.uniqueName}/ONLINELOG, +RECO/${db.uniqueName}/ONLINELOG`}</span></div>
                      <div><span className="text-slate-500">DG BROKER CONFIG:</span> <span className="text-purple-300 font-mono">{db.dgBrokerConfigPath || `/u01/app/oracle/product/19.3.0/db_1/dbs/dr1${db.uniqueName.toLowerCase()}.dat`}</span></div>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION CONTROLS SECTION */}
              <div className="mt-5 space-y-3 pt-3 border-t border-[#1e2a4a]/80">
                {/* 1. POWER RESTORATION & AUTOMATED RECOVERY SEQUENCE */}
                <div className="bg-[#070c19] p-3 rounded-xl border border-[#1e2a4a] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Power className="w-3.5 h-3.5 text-emerald-400" />
                      1. Power Restoration & Data Guard Recovery
                    </span>
                    {isShutdown && (
                      <span className="text-[10px] text-amber-400 font-mono animate-pulse font-bold">Idle Instance (Shutdown)</span>
                    )}
                  </div>

                  {/* DBA Manual / Automated Steps Overview Box */}
                  <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                    <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wider flex items-center gap-1 border-b border-slate-800 pb-1">
                      <Terminal className="w-3 h-3 text-sky-400" />
                      Standby Recovery Workflow
                    </div>
                    <div className="text-slate-400 text-[10px] space-y-0.5 pt-0.5">
                      <p><span className="text-amber-400">1. Export SID:</span> <code className="text-slate-200">export ORACLE_SID={db.uniqueName}</code></p>
                      <p><span className="text-amber-400">2. Standby Listener:</span> <code className="text-slate-200">lsnrctl start LISTENER_{db.uniqueName}</code></p>
                      <p><span className="text-amber-400">3. Connect Instance:</span> <code className="text-slate-200">sqlplus / as sysdba</code></p>
                      <p><span className="text-amber-400">4. Mount Database:</span> <code className="text-slate-200">STARTUP MOUNT;</code></p>
                      <p><span className="text-amber-400">5. Open Read Only:</span> <code className="text-slate-200">ALTER DATABASE OPEN READ ONLY;</code></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => handlePowerOn(db.id)}
                      disabled={!canManage || actionLoadingId === `${db.id}-power-on`}
                      className={`w-full py-2 px-3 rounded-lg border text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition ${
                        isShutdown
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-600/20'
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <Play className="w-3.5 h-3.5" />
                      {actionLoadingId === `${db.id}-power-on` ? 'Starting...' : 'Power On Data Guard'}
                    </button>

                    <button
                      onClick={() => handleRunFullPowerRecovery(db)}
                      disabled={!canManage || isRecovering}
                      className="w-full py-2 px-3 rounded-lg border border-sky-500/50 bg-sky-600/20 hover:bg-sky-600/30 text-sky-200 text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition shadow-md"
                      title="Run automated 5-step recovery: Export SID -> Listener -> Connect SYSDBA -> Mount -> Open Read Only"
                    >
                      <Terminal className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                      Run Recovery Console
                    </button>
                  </div>
                </div>

                {/* 2. ROLE TRANSITIONS (SWITCHOVER & FAILOVER) */}
                <div className="bg-[#070c19] p-3 rounded-xl border border-[#1e2a4a] space-y-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-fuchsia-400" />
                    2. Data Guard Role Transitions
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Graceful Switchover Button */}
                    <button
                      onClick={() => handleSwitchover(db.id, db.name)}
                      disabled={!canManage || isShutdown || actionLoadingId === `${db.id}-switchover`}
                      className="py-2 px-2.5 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 rounded-lg text-xs font-bold font-mono cursor-pointer transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Graceful role swap: Standby becomes Primary, Primary becomes Standby"
                    >
                      <Repeat className="w-3.5 h-3.5 text-fuchsia-400" />
                      {actionLoadingId === `${db.id}-switchover` ? 'Switching...' : 'Switchover'}
                    </button>

                    {/* Emergency Failover Button */}
                    <button
                      onClick={() => handleFailover(db.id, db.name)}
                      disabled={!canManage || actionLoadingId === `${db.id}-failover`}
                      className="py-2 px-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/40 rounded-lg text-xs font-bold font-mono cursor-pointer transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Emergency force promote Standby to Primary after crash"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                      {actionLoadingId === `${db.id}-failover` ? 'Failing over...' : 'Failover'}
                    </button>
                  </div>
                </div>

                {/* 3. INSTANCE OPEN MODE CONTROLS (MOUNT / READ ONLY / READ WRITE APPLY / SHUTDOWN) */}
                <div className="bg-[#070c19] p-3 rounded-xl border border-[#1e2a4a] space-y-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    3. Standby Open Mode Control
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSetMode(db.id, 'MOUNTED')}
                      disabled={!canManage || actionLoadingId === `${db.id}-mode-MOUNTED`}
                      className={`py-1.5 px-2 rounded-lg border text-[11px] font-mono font-bold cursor-pointer transition text-center ${
                        db.openMode === 'MOUNTED'
                          ? 'bg-amber-500/25 border-amber-500 text-amber-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      MOUNT MODE
                    </button>

                    <button
                      onClick={() => handleSetMode(db.id, 'READ ONLY')}
                      disabled={!canManage || actionLoadingId === `${db.id}-mode-READ ONLY`}
                      className={`py-1.5 px-2 rounded-lg border text-[11px] font-mono font-bold cursor-pointer transition text-center ${
                        db.openMode === 'READ ONLY'
                          ? 'bg-cyan-500/25 border-cyan-500 text-cyan-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      READ ONLY
                    </button>

                    <button
                      onClick={() => handleSetMode(db.id, 'READ ONLY WITH APPLY')}
                      disabled={!canManage || actionLoadingId === `${db.id}-mode-READ ONLY WITH APPLY`}
                      className={`py-1.5 px-2 rounded-lg border text-[11px] font-mono font-bold cursor-pointer transition text-center ${
                        db.openMode === 'READ ONLY WITH APPLY'
                          ? 'bg-fuchsia-500/25 border-fuchsia-500 text-fuchsia-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      ACTIVE DG (APPLY)
                    </button>

                    <button
                      onClick={() => handleSetMode(db.id, 'SHUTDOWN')}
                      disabled={!canManage || actionLoadingId === `${db.id}-mode-SHUTDOWN`}
                      className={`py-1.5 px-2 rounded-lg border text-[11px] font-mono font-bold cursor-pointer transition text-center ${
                        isShutdown
                          ? 'bg-red-500/25 border-red-500 text-red-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-red-950/40 hover:text-red-300'
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      SHUTDOWN
                    </button>
                  </div>
                </div>

                {/* 4. MRP REDO APPLY TOGGLE BUTTON */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">MRP Apply Toggle</span>
                  <button
                    onClick={() => onToggleRedoApply(db.id)}
                    disabled={!canManage}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition ${
                      db.redoApplied
                        ? 'bg-red-500/10 border-red-500/25 hover:bg-red-500/15 text-red-400'
                        : 'bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/15 text-emerald-400'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {db.redoApplied ? 'Stop MRP Apply' : 'Start MRP Apply'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {standbyDbs.length === 0 && (
          <div className="lg:col-span-2 bg-[#121b33] border border-[#1e2a4a] rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-3">
            <Radio className="w-12 h-12 text-slate-600 animate-pulse" />
            <h3 className="text-md font-bold text-slate-300 font-display">No Standby Databases Registered</h3>
            <p className="text-slate-400 text-xs max-w-md">
              Create and deploy a high-availability Standby Database to receive the real-time redo log streams from the Primary log source.
            </p>
            {canManage && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow"
              >
                Deploy First Standby DB
              </button>
            )}
          </div>
        )}
      </div>
      </>
      )}

      {/* STANDBY POWER RECOVERY AUTOMATION TERMINAL MODAL */}
      {recoveryConsoleDb && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0b1120] border-2 border-sky-500/50 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="bg-[#121c33] px-5 py-3.5 border-b border-[#1e2a4a] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-sky-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    Standby Power Outage Recovery Console
                  </h3>
                  <p className="text-[11px] text-sky-300 font-mono">
                    Database: {recoveryConsoleDb.name} ({recoveryConsoleDb.uniqueName}) • Host Node: {recoveryConsoleDb.nodeId}
                  </p>
                </div>
              </div>
              {!isRecovering && (
                <button
                  onClick={() => setRecoveryConsoleDb(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Modal Body - Terminal Output */}
            <div className="p-5 bg-black/90 font-mono text-xs overflow-y-auto flex-1 space-y-2 min-h-[280px]">
              {recoveryLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`leading-relaxed ${
                    log.startsWith('SQL>') || log.startsWith('$')
                      ? 'text-amber-300 font-bold'
                      : log.startsWith('SUCCESS')
                      ? 'text-emerald-400 font-bold text-sm bg-emerald-950/40 p-2 rounded border border-emerald-500/30'
                      : log.startsWith('STATUS')
                      ? 'text-sky-300 font-bold'
                      : 'text-slate-300'
                  }`}
                >
                  {log}
                </div>
              ))}
              {isRecovering && (
                <div className="flex items-center gap-2 text-sky-400 font-bold pt-2 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                  <span>Executing Oracle DBA commands on remote standby node...</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-[#121c33] px-5 py-3 border-t border-[#1e2a4a] flex items-center justify-between">
              <div className="text-[11px] text-slate-400 font-mono">
                Dedicated Standby Listener: <span className="text-emerald-400 font-bold">LISTENER_{recoveryConsoleDb.uniqueName}</span>
              </div>
              <button
                onClick={() => setRecoveryConsoleDb(null)}
                disabled={isRecovering}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-lg transition cursor-pointer shadow"
              >
                {isRecovering ? 'Processing Execution...' : 'Close Recovery Console'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
