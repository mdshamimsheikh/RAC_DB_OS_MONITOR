import React, { useState, useEffect } from 'react';
import { Database, Plus, Trash2, CheckCircle2, Shield, Play, RotateCcw, AlertTriangle, Layers, Activity, Archive, ArrowLeftRight, Server, Monitor, HardDrive, Cpu, Check, ChevronRight, Folder } from 'lucide-react';
import { SSHNode, PrimaryDatabase, StandbyDatabase, UserAccount, OsType } from '../types';
import RmanBackupView from './RmanBackupView';
import DataPumpView from './DataPumpView';
import { apiFetch } from '../lib/api';

interface PrimaryDbViewProps {
  nodes: SSHNode[];
  primaryDbs: PrimaryDatabase[];
  standbyDbs?: StandbyDatabase[];
  standbyDbsCountMap: Record<string, number>;
  currentUser?: UserAccount;
  onAddPrimaryDb: (db: Omit<PrimaryDatabase, 'id' | 'status' | 'openMode'>) => Promise<void>;
  onDeletePrimaryDb: (id: string) => Promise<void>;
  isConnecting: boolean;
  onNavigateMenu?: (menuId: string) => void;
}

export default function PrimaryDbView({
  nodes,
  primaryDbs,
  standbyDbs = [],
  standbyDbsCountMap,
  currentUser,
  onAddPrimaryDb,
  onDeletePrimaryDb,
  isConnecting,
  onNavigateMenu
}: PrimaryDbViewProps) {
  const canAdd = currentUser ? (currentUser.username === 'admin' || currentUser.role === 'ADMIN' || (currentUser.permissions?.canAdd ?? currentUser.role !== 'VIEWER')) : true;
  const canDelete = currentUser ? (currentUser.username === 'admin' || currentUser.role === 'ADMIN' || (currentUser.permissions?.canDelete ?? currentUser.role !== 'VIEWER')) : true;
  const isViewOnly = !canAdd && !canDelete;
  const canManage = canAdd;

  const [subTab, setSubTab] = useState<'instances' | 'rman' | 'datapump'>('instances');
  const [showAddForm, setShowAddForm] = useState(false);

  // Setup Database Topology Type
  const [dbSetupType, setDbSetupType] = useState<'RAC' | 'SINGLE_INSTANCE' | 'WINDOWS_RAC' | 'WINDOWS_SINGLE'>('RAC');

  // Form Fields
  const [name, setName] = useState('');
  const [uniqueName, setUniqueName] = useState('');
  const [oracleSid, setOracleSid] = useState('');
  const [clusterName, setClusterName] = useState('PROD-RAC-CLUSTER');
  const [scanName, setScanName] = useState('rac-scan.corp.internal');
  const [scanPort, setScanPort] = useState(1521);
  const [oracleHome, setOracleHome] = useState('/u01/app/oracle/product/19.3.0/db_1');
  const [oracleBase, setOracleBase] = useState('/u01/app/oracle');
  const [tnsAdmin, setTnsAdmin] = useState('/u01/app/oracle/product/19.3.0/db_1/network/admin');
  const [datafilePath, setDatafilePath] = useState('+DATA/PRODDB/DATAFILE');
  const [fraPath, setFraPath] = useState('+RECO/PRODDB');
  const [archiveLogDest, setArchiveLogDest] = useState('LOCATION=+RECO/PRODDB/ARCHIVELOG');
  const [redoLogPath, setRedoLogPath] = useState('+DATA, +RECO (Multiplexed)');
  const [dgBrokerConfigPath, setDgBrokerConfigPath] = useState('/u01/app/oracle/product/19.3.0/db_1/dbs/dr1proddb.dat');
  const [auditFileDest, setAuditFileDest] = useState('/u01/app/oracle/admin/proddb/adump');
  const [passwordFilePath, setPasswordFilePath] = useState('/u01/app/oracle/product/19.3.0/db_1/dbs/orapwproddb');
  const [showPrimaryPathId, setShowPrimaryPathId] = useState<string | null>(null);
  const [gridHome, setGridHome] = useState('/u02/app/19.3.0.1/grid_home');
  const [asmSid, setAsmSid] = useState('+ASM1');
  const [archiveMode, setArchiveMode] = useState<'ARCHIVELOG' | 'NOARCHIVELOG'>('ARCHIVELOG');
  const [version, setVersion] = useState('19c (19.3.0.0.0)');
  const [redoLogSizeMB, setRedoLogSizeMB] = useState(512);

  // Selected Nodes for Database
  const [selectedSingleNodeId, setSelectedSingleNodeId] = useState('');
  const [selectedRacNodeIds, setSelectedRacNodeIds] = useState<string[]>([]);
  const [racNodeInstanceConfigs, setRacNodeInstanceConfigs] = useState<Record<string, { instanceName: string; oracleSid: string; asmSid: string }>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Update defaults when switching setup type
  const handleTypeChange = (type: 'RAC' | 'SINGLE_INSTANCE' | 'WINDOWS_RAC' | 'WINDOWS_SINGLE') => {
    setDbSetupType(type);
    setError('');

    if (type === 'WINDOWS_SINGLE') {
      setName('WINDB');
      setUniqueName('WINDB_PRI');
      setOracleSid('windb1');
      setOracleHome('C:\\app\\oracle\\product\\19.3.0\\dbhome_1');
      setGridHome('N/A');
      setAsmSid('N/A');
      const winNode = nodes.find(n => n.osType === 'Windows') || nodes[0];
      if (winNode) setSelectedSingleNodeId(winNode.id);
    } else if (type === 'WINDOWS_RAC') {
      setName('WINRAC');
      setUniqueName('WINRAC_PRI');
      setOracleSid('winrac');
      setClusterName('WIN-RAC-CLUSTER');
      setScanName('winrac-scan.corp.internal');
      setOracleHome('C:\\app\\oracle\\product\\19.3.0\\dbhome_1');
      setGridHome('C:\\app\\19.3.0\\grid');
      setAsmSid('+ASM1');
      const winNodes = nodes.filter(n => n.osType === 'Windows');
      setSelectedRacNodeIds(winNodes.length > 0 ? winNodes.map(n => n.id) : (nodes.length >= 2 ? [nodes[0].id, nodes[1].id] : nodes.map(n => n.id)));
    } else if (type === 'SINGLE_INSTANCE') {
      setName('PRODDB');
      setUniqueName('PRODDB_PRI');
      setOracleSid('proddb');
      setOracleHome('/u01/app/oracle/product/19.3.0/db_1');
      setGridHome('N/A');
      setAsmSid('N/A');
      const linuxNode = nodes.find(n => n.osType !== 'Windows') || nodes[0];
      if (linuxNode) setSelectedSingleNodeId(linuxNode.id);
    } else {
      // Standard Linux RAC
      setName('ORCL');
      setUniqueName('ORCL_PRI');
      setOracleSid('racdb');
      setClusterName('PROD-RAC-CLUSTER');
      setScanName('rac-scan.corp.internal');
      setOracleHome('/u01/app/oracle/product/19.3.0/db_1');
      setGridHome('/u02/app/19.3.0.1/grid_home');
      setAsmSid('+ASM1');
      const linuxNodes = nodes.filter(n => n.osType !== 'Windows');
      setSelectedRacNodeIds(linuxNodes.length >= 2 ? [linuxNodes[0].id, linuxNodes[1].id] : nodes.map(n => n.id));
    }
  };

  // Sync RAC Instance configs when selectedRacNodeIds or db name changes
  useEffect(() => {
    const nextConfig: Record<string, { instanceName: string; oracleSid: string; asmSid: string }> = {};
    const baseName = (name || 'orcl').toLowerCase();
    selectedRacNodeIds.forEach((nId, idx) => {
      const instNum = idx + 1;
      nextConfig[nId] = {
        instanceName: `${baseName}${instNum}`,
        oracleSid: `${baseName}${instNum}`,
        asmSid: `+ASM${instNum}`
      };
    });
    setRacNodeInstanceConfigs(nextConfig);
  }, [selectedRacNodeIds, name]);

  const toggleRacNode = (nodeId: string) => {
    setSelectedRacNodeIds(prev => {
      if (prev.includes(nodeId)) {
        return prev.filter(id => id !== nodeId);
      } else {
        return [...prev, nodeId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !uniqueName) {
      setError('Please fill in Database Name and DB Unique Name.');
      return;
    }

    const isRacType = dbSetupType === 'RAC' || dbSetupType === 'WINDOWS_RAC';

    if (isRacType && selectedRacNodeIds.length === 0) {
      setError('Please select at least 1 or 2 Host Server Nodes for this RAC Cluster Database.');
      return;
    }

    if (!isRacType && !selectedSingleNodeId) {
      setError('Please select the Target Host Server Node for this Single Instance Database.');
      return;
    }

    const targetPrimaryNodeId = isRacType ? selectedRacNodeIds[0] : selectedSingleNodeId;

    // Check duplicate
    if (primaryDbs.some(db => db.name.toLowerCase() === name.toLowerCase() && db.nodeId === targetPrimaryNodeId)) {
      setError('A Primary database with this Name already exists on the selected Host.');
      return;
    }

    const instances = isRacType ? selectedRacNodeIds.map((nId, idx) => {
      const conf = racNodeInstanceConfigs[nId] || { instanceName: `${name.toLowerCase()}${idx + 1}`, oracleSid: `${name.toLowerCase()}${idx + 1}`, asmSid: `+ASM${idx + 1}` };
      const nodeObj = nodes.find(n => n.id === nId);
      return {
        nodeId: nId,
        nodeName: nodeObj?.name || `Node ${idx + 1}`,
        instanceName: conf.instanceName,
        instanceNumber: idx + 1,
        oracleSid: conf.oracleSid,
        asmSid: conf.asmSid,
        status: 'OPEN' as const
      };
    }) : undefined;

    setIsSubmitting(true);
    try {
      await onAddPrimaryDb({
        name,
        uniqueName,
        oracleSid: isRacType ? (instances?.[0]?.oracleSid || `${name.toLowerCase()}1`) : oracleSid,
        nodeId: targetPrimaryNodeId,
        nodeIds: isRacType ? selectedRacNodeIds : [selectedSingleNodeId],
        dbType: dbSetupType,
        clusterName: isRacType ? clusterName : undefined,
        scanName: isRacType ? scanName : undefined,
        scanPort: isRacType ? scanPort : undefined,
        oracleBase,
        oracleHome,
        gridHome: isRacType ? gridHome : undefined,
        tnsAdmin,
        datafilePath,
        fraPath,
        archiveLogDest,
        redoLogPath,
        dgBrokerConfigPath,
        auditFileDest,
        passwordFilePath,
        asmSid: isRacType ? asmSid : undefined,
        osType: dbSetupType.includes('WINDOWS') ? 'Windows' : 'Linux',
        instances,
        archiveMode,
        version,
        redoLogSizeMB: Number(redoLogSizeMB)
      });

      // Reset
      setShowAddForm(false);
      setName('');
      setUniqueName('');
      setActionSuccessMsg(`Database "${name}" configured and registered successfully!`);
      setTimeout(() => setActionSuccessMsg(null), 6000);
    } catch (err: any) {
      setError(err.message || 'Failed to register primary database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchLog = async (db: PrimaryDatabase) => {
    try {
      const res = await apiFetch(`/api/primary-databases/${db.id}/switch-logfile`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data && data.success) {
        setActionSuccessMsg(`Log switch completed on ${db.name}. New Sequence: #${data.newSequence}`);
        setTimeout(() => setActionSuccessMsg(null), 5000);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to switch logfile');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="primary-db-root">
      {/* Header section */}
      {isViewOnly && (
        <div className="bg-pink-950/60 border-2 border-pink-500/60 rounded-xl p-3.5 text-pink-200 text-xs font-bold flex items-center gap-3 shadow-lg">
          <Database className="w-5 h-5 text-pink-400 shrink-0 animate-pulse" />
          <span>VIEW-ONLY USER ROLE ACTIVE: You are logged in with Read-Only permissions. Registering primary databases, running RMAN backups, and triggering Data Pump exports are restricted.</span>
        </div>
      )}

      {actionSuccessMsg && (
        <div className="bg-emerald-950/70 border-2 border-emerald-500/70 rounded-xl p-3.5 text-emerald-200 text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-[#0d1326] p-6 rounded-xl border border-[#1e2a4a] shadow-2xl gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="header-banner-icon-box p-2.5 text-sky-400 shrink-0 flex items-center justify-center">
              <Database className="w-6 h-6 text-sky-400" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-slate-100 tracking-tight">Primary Databases &amp; Setup Console</h1>
              <p className="text-slate-400 text-sm mt-0.5 font-sans">
                Configure Oracle RAC Clusters, Standalone Single Instances, and Windows Databases from your registered host servers.
              </p>
            </div>
          </div>
        </div>

        {subTab === 'instances' && (
          canManage ? (
            <div className="flex items-center gap-2">
              {nodes.length === 0 && (
                <button
                  onClick={() => onNavigateMenu?.('dashboard')}
                  className="px-3.5 py-2 bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Server className="w-3.5 h-3.5" /> + Add Host Server First
                </button>
              )}
              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  if (!showAddForm) handleTypeChange('RAC');
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg font-medium text-xs transition cursor-pointer self-start md:self-auto shadow-md"
                id="toggle-add-db-form"
              >
                <Plus className="w-4 h-4" />
                {showAddForm ? 'Close Setup Form' : 'Setup New Database'}
              </button>
            </div>
          ) : (
            <div className="px-3 py-1.5 bg-slate-800/80 border border-pink-500/30 rounded-lg text-xs font-mono font-bold text-pink-300">
              🔒 Actions Restricted (Read-Only)
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
          <Database className="w-4 h-4 text-white" />
          Primary DB Instances ({primaryDbs.length})
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
          {/* DATABASE REGISTRATION & TOPOLOGY BUILDER FORM */}
          {showAddForm && (
            <form onSubmit={handleSubmit} className="bg-[#121b33] p-6 rounded-xl border border-[#1e2a4a] shadow-2xl space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1e2a4a] gap-2">
                <div>
                  <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-display flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-400" />
                    Configure &amp; Register Oracle Database
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select your database architecture topology and assign it to your added host servers.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-[#070c19] p-1 rounded-lg border border-[#1e2a4a]">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('RAC')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      dbSetupType === 'RAC' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" /> Oracle RAC (Linux)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('SINGLE_INSTANCE')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      dbSetupType === 'SINGLE_INSTANCE' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" /> Single Instance (Linux)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('WINDOWS_RAC')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      dbSetupType === 'WINDOWS_RAC' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" /> Windows RAC
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('WINDOWS_SINGLE')}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      dbSetupType === 'WINDOWS_SINGLE' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" /> Windows Single
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Host Server Node Selector Section */}
              <div className="bg-[#070c19] p-4 rounded-xl border border-[#1e2a4a] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 font-display">
                    <Server className="w-4 h-4 text-emerald-400" />
                    {dbSetupType === 'RAC' || dbSetupType === 'WINDOWS_RAC' ? 'Select Clustered Host Nodes *' : 'Select Target Host Node *'}
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {nodes.length} Host Servers Available
                  </span>
                </div>

                {nodes.length === 0 ? (
                  <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-xl text-center space-y-2">
                    <p className="text-xs text-amber-200 font-medium">No host servers have been registered yet.</p>
                    <button
                      type="button"
                      onClick={() => onNavigateMenu?.('dashboard')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      + Add Host Server on Master Dashboard First
                    </button>
                  </div>
                ) : (
                  dbSetupType === 'RAC' || dbSetupType === 'WINDOWS_RAC' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {nodes.map((node) => {
                        const isChecked = selectedRacNodeIds.includes(node.id);
                        return (
                          <div
                            key={node.id}
                            onClick={() => toggleRacNode(node.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              isChecked
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 shadow-md'
                                : 'bg-[#0f1830] border-[#1e2a4a] text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <div>
                                <div className="text-xs font-bold font-mono">{node.name}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{node.ipAddress} ({node.osType || 'Linux'})</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              Port {node.sshPort || 22}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {nodes.map((node) => {
                        const isSelected = selectedSingleNodeId === node.id;
                        return (
                          <div
                            key={node.id}
                            onClick={() => setSelectedSingleNodeId(node.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 shadow-md ring-1 ring-cyan-400'
                                : 'bg-[#0f1830] border-[#1e2a4a] text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="radio"
                                name="singleNodeSelect"
                                checked={isSelected}
                                onChange={() => {}}
                                className="text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                              />
                              <div>
                                <div className="text-xs font-bold font-mono">{node.name}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{node.ipAddress} ({node.osType || 'Linux'})</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              Port {node.sshPort || 22}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>

              {/* Database Core Identification */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-bold">Database Name (DB_NAME) *</label>
                  <input
                    type="text"
                    placeholder="e.g. ORCL or PRODDB"
                    value={name}
                    onChange={e => setName(e.target.value.toUpperCase())}
                    className="w-full bg-[#070c19] border border-[#1e2a4a] rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-bold">DB Unique Name (DB_UNIQUE_NAME) *</label>
                  <input
                    type="text"
                    placeholder="e.g. ORCL_PRI"
                    value={uniqueName}
                    onChange={e => setUniqueName(e.target.value.toUpperCase())}
                    className="w-full bg-[#070c19] border border-[#1e2a4a] rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                {dbSetupType === 'RAC' || dbSetupType === 'WINDOWS_RAC' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-bold">Cluster SCAN Hostname / Port</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="rac-scan.corp.internal"
                        value={scanName}
                        onChange={e => setScanName(e.target.value)}
                        className="flex-1 bg-[#070c19] border border-[#1e2a4a] rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-blue-500 outline-none"
                      />
                      <input
                        type="number"
                        placeholder="1521"
                        value={scanPort}
                        onChange={e => setScanPort(Number(e.target.value))}
                        className="w-20 bg-[#070c19] border border-[#1e2a4a] rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-bold">Instance SID (ORACLE_SID) *</label>
                    <input
                      type="text"
                      placeholder="e.g. orcl or proddb"
                      value={oracleSid}
                      onChange={e => setOracleSid(e.target.value)}
                      className="w-full bg-[#070c19] border border-[#1e2a4a] rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-blue-500 outline-none"
                      required
                    />
                  </div>
                )}
              </div>

              {/* RAC Specific Node Instances Mapping */}
              {(dbSetupType === 'RAC' || dbSetupType === 'WINDOWS_RAC') && selectedRacNodeIds.length > 0 && (
                <div className="bg-[#070c19] p-4 rounded-xl border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-300 uppercase font-mono tracking-wider">
                      RAC Cluster Node Instance Mapping ({selectedRacNodeIds.length} Nodes)
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Cluster Name: {clusterName}</span>
                  </div>

                  <div className="space-y-2">
                    {selectedRacNodeIds.map((nId, idx) => {
                      const nodeObj = nodes.find(n => n.id === nId);
                      const conf = racNodeInstanceConfigs[nId] || { instanceName: `${name.toLowerCase()}${idx + 1}`, oracleSid: `${name.toLowerCase()}${idx + 1}`, asmSid: `+ASM${idx + 1}` };

                      return (
                        <div key={nId} className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-[#0f172a] p-2.5 rounded-lg border border-slate-700 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-white font-mono">{nodeObj?.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{nodeObj?.ipAddress}</div>
                            </div>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 block font-semibold">Instance Name</span>
                            <input
                              type="text"
                              value={conf.instanceName}
                              onChange={e => {
                                const val = e.target.value;
                                setRacNodeInstanceConfigs(prev => ({
                                  ...prev,
                                  [nId]: { ...prev[nId], instanceName: val, oracleSid: val }
                                }));
                              }}
                              className="w-full bg-[#070c19] border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                            />
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 block font-semibold">Instance SID</span>
                            <input
                              type="text"
                              value={conf.oracleSid}
                              onChange={e => {
                                const val = e.target.value;
                                setRacNodeInstanceConfigs(prev => ({
                                  ...prev,
                                  [nId]: { ...prev[nId], oracleSid: val }
                                }));
                              }}
                              className="w-full bg-[#070c19] border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                            />
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 block font-semibold">ASM SID</span>
                            <input
                              type="text"
                              value={conf.asmSid}
                              onChange={e => {
                                const val = e.target.value;
                                setRacNodeInstanceConfigs(prev => ({
                                  ...prev,
                                  [nId]: { ...prev[nId], asmSid: val }
                                }));
                              }}
                              className="w-full bg-[#070c19] border border-slate-700 rounded px-2 py-1 text-xs text-emerald-300 font-mono"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Paths and Options */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Oracle Home Path</label>
                  <input
                    type="text"
                    value={oracleHome}
                    onChange={e => setOracleHome(e.target.value)}
                    className="w-full bg-[#070c19] border border-[#1e2a4a] rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Archivelog Mode</label>
                  <select
                    value={archiveMode}
                    onChange={e => setArchiveMode(e.target.value as any)}
                    className="w-full bg-[#070c19] border border-[#1e2a4a] rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-blue-500 outline-none"
                  >
                    <option value="ARCHIVELOG">ARCHIVELOG (Recommended for Data Guard / Recovery)</option>
                    <option value="NOARCHIVELOG">NOARCHIVELOG</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Database Version</label>
                  <select
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    className="w-full bg-[#070c19] border border-[#1e2a4a] rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none"
                  >
                    <option value="19c (19.3.0.0.0)">Oracle Database 19c (19.3.0.0)</option>
                    <option value="21c (21.3.0.0.0)">Oracle Database 21c (21.3.0.0)</option>
                    <option value="23c Free (23.3.0.0.0)">Oracle Database 23c Free</option>
                    <option value="12c R2 (12.2.0.1.0)">Oracle Database 12c R2 (12.2.0.1)</option>
                    <option value="11g R2 (11.2.0.4.0)">Oracle Database 11g R2 (11.2.0.4)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Redo Log Size (MB)</label>
                  <input
                    type="number"
                    value={redoLogSizeMB}
                    onChange={e => setRedoLogSizeMB(Number(e.target.value))}
                    className="w-full bg-[#070c19] border border-[#1e2a4a] rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* OFA Storage & System Paths Section */}
              <div className="p-3 bg-[#0a1020] border border-[#1c2c4c] rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-300">
                  <span>OFA Storage Paths & System Directories</span>
                  <span className="text-[10px] text-slate-400 font-normal">Standard OFA / ASM Configuration</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">ORACLE_BASE</label>
                    <input
                      type="text"
                      value={oracleBase}
                      onChange={e => setOracleBase(e.target.value)}
                      className="w-full bg-[#070c19] border border-[#1e2a4a] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-400 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Datafiles Path (DB_CREATE_FILE_DEST)</label>
                    <input
                      type="text"
                      value={datafilePath}
                      onChange={e => setDatafilePath(e.target.value)}
                      className="w-full bg-[#070c19] border border-[#1e2a4a] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-400 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Fast Recovery Area (FRA)</label>
                    <input
                      type="text"
                      value={fraPath}
                      onChange={e => setFraPath(e.target.value)}
                      className="w-full bg-[#070c19] border border-[#1e2a4a] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-400 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Archive Log Dest (LOG_ARCHIVE_DEST_1)</label>
                    <input
                      type="text"
                      value={archiveLogDest}
                      onChange={e => setArchiveLogDest(e.target.value)}
                      className="w-full bg-[#070c19] border border-[#1e2a4a] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-400 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">Online Redo Logs</label>
                    <input
                      type="text"
                      value={redoLogPath}
                      onChange={e => setRedoLogPath(e.target.value)}
                      className="w-full bg-[#070c19] border border-[#1e2a4a] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-400 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400">DG Broker Config File</label>
                    <input
                      type="text"
                      value={dgBrokerConfigPath}
                      onChange={e => setDgBrokerConfigPath(e.target.value)}
                      className="w-full bg-[#070c19] border border-[#1e2a4a] rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-400 outline-none"
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
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-lg"
                >
                  {isSubmitting ? 'Registering Database...' : 'Register Database Topology'}
                </button>
              </div>
            </form>
          )}

          {/* PRIMARY DATABASES LIST */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {primaryDbs.map(db => {
              const isRac = db.dbType === 'RAC' || db.dbType === 'WINDOWS_RAC' || (db.nodeIds && db.nodeIds.length > 1) || (db.instances && db.instances.length > 1);
              const targetNode = nodes.find(n => n.id === db.nodeId);
              const associatedStandbyCount = standbyDbsCountMap[db.id] || 0;

              return (
                <div key={db.id} className="bg-[#121b33] p-5 rounded-xl border border-[#1e2a4a] shadow-lg flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-6 -mt-6"></div>

                  <div>
                    {/* Database Header Info */}
                    <div className="flex items-start justify-between border-b border-[#1e2a4a]/60 pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg text-white shadow-md ${
                          isRac ? 'bg-gradient-to-tr from-emerald-600 to-teal-500' :
                          db.dbType?.includes('WINDOWS') ? 'bg-gradient-to-tr from-sky-600 to-indigo-600' :
                          'bg-gradient-to-tr from-blue-600 to-cyan-500'
                        }`}>
                          {isRac ? <Layers className="w-5 h-5" /> : <Database className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-md font-bold text-slate-100 font-display">{db.name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-black uppercase border shadow-sm ${
                              isRac ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                              db.dbType?.includes('WINDOWS') ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' :
                              'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            }`}>
                              {isRac ? `ORACLE RAC (${db.instances?.length || db.nodeIds?.length || 2} NODES)` : db.dbType?.includes('WINDOWS') ? 'WINDOWS DB' : 'STANDALONE LINUX'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 font-mono block mt-0.5">Unique: {db.uniqueName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSwitchLog(db)}
                          className="px-2.5 py-1 bg-[#070c19] hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-[#1e2a4a] text-[11px] font-mono font-bold transition cursor-pointer"
                          title="ALTER SYSTEM SWITCH LOGFILE"
                        >
                          Switch Log
                        </button>
                        {canDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeletePrimaryDb(db.id); }}
                            className="p-1.5 bg-[#070c19] hover:bg-red-500/15 text-slate-500 hover:text-red-400 rounded-lg border border-[#1e2a4a] hover:border-red-500/25 transition cursor-pointer"
                            title="Remove Database Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Metadata details */}
                    <div className="grid grid-cols-2 gap-4 py-4 text-xs font-sans">
                      <div className="space-y-1">
                        <span className="text-slate-500 font-medium">Running Node(s):</span>
                        <span className="text-slate-200 block font-semibold truncate font-mono">
                          {isRac && db.instances && db.instances.length > 0
                            ? db.instances.map(i => i.nodeName || i.instanceName).join(', ')
                            : (targetNode ? targetNode.name : 'Target Host Node')}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 font-medium">Oracle SID(s):</span>
                        <span className="text-slate-300 block font-mono font-semibold truncate">
                          {isRac && db.instances && db.instances.length > 0
                            ? db.instances.map(i => i.oracleSid).join(' / ')
                            : db.oracleSid}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 font-medium">Status / Mode:</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="text-emerald-400 font-mono font-bold text-xs uppercase glow-green">{db.status || 'OPEN'}</span>
                          <span className="text-slate-400">({db.openMode || 'READ WRITE'})</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 font-medium">Version:</span>
                        <span className="text-slate-300 block font-mono truncate">{db.version || '19c (19.3.0.0)'}</span>
                      </div>
                    </div>

                    {/* RAC Clustered Instances breakdown if RAC */}
                    {isRac && db.instances && db.instances.length > 0 && (
                      <div className="mb-3 p-2.5 bg-[#070c19] rounded-lg border border-[#1e2a4a] space-y-1.5">
                        <div className="text-[10px] text-slate-400 uppercase font-mono font-bold flex items-center justify-between">
                          <span>Active RAC Node Instances</span>
                          <span>SCAN: {db.scanName || '1521'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {db.instances.map(inst => (
                            <div key={inst.instanceName} className="p-1.5 bg-[#0f172a] rounded border border-slate-800 flex items-center justify-between text-[11px] font-mono">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span className="font-bold text-white">{inst.instanceName}</span>
                              </div>
                              <span className="text-emerald-300 text-[10px] font-bold">{inst.asmSid || '+ASM'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dynamic Metrics & Standby Relationship Summary */}
                    <div className="grid grid-cols-2 gap-3 bg-[#070c19] p-3 rounded-lg border border-[#1e2a4a]/80 text-xs font-mono">
                      <div>
                        <div className="text-slate-500 font-sans text-[10px]">REDO LOG SIZE / SEQ</div>
                        <div className="text-slate-300 font-bold mt-0.5">{db.redoLogSizeMB || 512} MB • Seq #{db.latestSequence || 100}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 font-sans text-[10px]">LOG MODE</div>
                        <div className={`font-bold mt-0.5 flex items-center gap-1 ${db.archiveMode === 'ARCHIVELOG' ? 'text-emerald-400' : 'text-amber-500'}`}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {db.archiveMode || 'ARCHIVELOG'}
                        </div>
                      </div>
                    </div>

                    {/* OFA Machine & Storage Paths Quick Inspector */}
                    <div className="mt-2.5 bg-[#070c19] p-2.5 rounded-xl border border-[#1e2a4a] text-xs font-mono space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Folder className="w-3 h-3 text-cyan-400" />
                          Host Server & Storage Paths
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPrimaryPathId(showPrimaryPathId === db.id ? null : db.id)}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-bold cursor-pointer"
                        >
                          {showPrimaryPathId === db.id ? 'Hide Paths ▲' : 'View Paths ▼'}
                        </button>
                      </div>
                      {showPrimaryPathId === db.id && (
                        <div className="space-y-1.5 pt-1.5 border-t border-[#1c2c4c] text-[10px] text-slate-300">
                          <div><span className="text-slate-500">ORACLE_HOME:</span> <span className="text-amber-300 font-mono">{db.oracleHome || targetNode?.oracleHome || '/u01/app/oracle/product/19.3.0/db_1'}</span></div>
                          <div><span className="text-slate-500">DATAFILES:</span> <span className="text-emerald-300 font-mono">{db.datafilePath || `+DATA/${db.uniqueName}/DATAFILE`}</span></div>
                          <div><span className="text-slate-500">FRA / ARCHIVE:</span> <span className="text-cyan-300 font-mono">{db.fraPath || db.archiveLogDest || `+RECO/${db.uniqueName}`}</span></div>
                          <div><span className="text-slate-500">ONLINE REDO:</span> <span className="text-blue-300 font-mono">{db.redoLogPath || `+DATA, +RECO (Multiplexed)`}</span></div>
                          <div><span className="text-slate-500">DG BROKER CONFIG:</span> <span className="text-purple-300 font-mono">{db.dgBrokerConfigPath || `/u01/app/oracle/product/19.3.0/db_1/dbs/dr1${db.uniqueName.toLowerCase()}.dat`}</span></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Associated Standby DB banner */}
                  <div className="mt-4 pt-3 border-t border-[#1e2a4a]/40 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-400" />
                      <span>Associated Data Guard Standbys:</span>
                    </div>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded ${associatedStandbyCount > 0 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-slate-800 text-slate-500'}`}>
                      {associatedStandbyCount} active replication links
                    </span>
                  </div>
                </div>
              );
            })}

            {primaryDbs.length === 0 && (
              <div className="lg:col-span-2 bg-[#121b33] border border-[#1e2a4a] rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-3">
                <Database className="w-12 h-12 text-slate-600 animate-pulse" />
                <h3 className="text-md font-bold text-slate-300 font-display">No Registered Primary Databases</h3>
                <p className="text-slate-400 text-xs max-w-md">
                  Register your Oracle RAC or Single Instance database from your added host servers to monitor instances, manage redo transport, and initiate Data Guard disaster recovery.
                </p>
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    handleTypeChange('RAC');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow"
                >
                  + Setup First Primary Database
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
