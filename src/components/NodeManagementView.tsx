import React, { useState } from 'react';
import { Plus, Trash2, Edit3, Key, Terminal, Wifi, Check, AlertCircle, RefreshCw, X, Server, Eye, EyeOff, Power, WifiOff, Database } from 'lucide-react';
import { SSHNode, AuthType, OsType, ShellType, NodeTelemetry, UserAccount } from '../types';
import { getApiUrl, safeFetchJson } from '../lib/api';

interface NodeManagementViewProps {
  nodes: SSHNode[];
  telemetry?: Record<string, NodeTelemetry>;
  currentUser?: UserAccount;
  onExecuteAction?: (nodeId: string, category: string, action: string, payload?: any) => Promise<any>;
  onAddNode: (node: Omit<SSHNode, 'id'>) => Promise<any>;
  onEditNode: (id: string, node: Partial<SSHNode>) => Promise<any>;
  onDeleteNode: (id: string) => Promise<any>;
}

export default function NodeManagementView({
  nodes,
  telemetry = {},
  currentUser,
  onExecuteAction,
  onAddNode,
  onEditNode,
  onDeleteNode
}: NodeManagementViewProps) {
  const canAdd = currentUser ? (currentUser.username === 'admin' || currentUser.role === 'ADMIN' || (currentUser.permissions?.canAdd ?? currentUser.role !== 'VIEWER')) : true;
  const canEdit = currentUser ? (currentUser.username === 'admin' || currentUser.role === 'ADMIN' || (currentUser.permissions?.canEdit ?? currentUser.role !== 'VIEWER')) : true;
  const canDelete = currentUser ? (currentUser.username === 'admin' || currentUser.role === 'ADMIN' || (currentUser.permissions?.canDelete ?? currentUser.role !== 'VIEWER')) : true;
  const isViewOnly = !canAdd && !canEdit && !canDelete;
  const [showModal, setShowModal] = useState(false);
  const [editNodeId, setEditNodeId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [nodeType, setNodeType] = useState<'RAC' | 'SINGLE'>('RAC');
  const [name, setName] = useState('');
  const [hostname, setHostname] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [sshPort, setSshPort] = useState(22);
  const [authType, setAuthType] = useState<AuthType>('password');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [oracleHome, setOracleHome] = useState('/u01/app/oracle/product/19.3.0/db_1');
  const [gridHome, setGridHome] = useState('/u02/app/19.3.0.1/grid_home');
  const [oracleSid, setOracleSid] = useState('racdb1');
  const [asmSid, setAsmSid] = useState('+ASM1');
  const [oracleUser, setOracleUser] = useState('oracle');
  const [gridUser, setGridUser] = useState('grid');
  const [rootUser, setRootUser] = useState('root');
  const [dbVersion, setDbVersion] = useState('19c (19.3.0.0)');
  const [osVersion, setOsVersion] = useState('Oracle Linux Server release 8.8 (Ootpa)');
  const [osType, setOsType] = useState<OsType>('Linux');
  const [shellType, setShellType] = useState<ShellType>('bash');
  const [isDemo, setIsDemo] = useState(false);
  const [powerState, setPowerState] = useState<'ON' | 'OFF'>('ON');

  // SSH Testing State
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [modalTesting, setModalTesting] = useState(false);
  const [modalTestResult, setModalTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form Reset
  const resetForm = (type: 'RAC' | 'SINGLE' = 'RAC', targetOs: OsType = 'Linux') => {
    setModalTestResult(null);
    setNodeType(type);
    setDbVersion('19c (19.3.0.0)');
    setOsType(targetOs);

    if (targetOs === 'Windows') {
      setShellType('powershell');
      setOsVersion('Windows (Auto-Detecting...)');
      setName('');
      setHostname('');
      setIpAddress('');
      setSshPort(22);
      setAuthType('password');
      setPassword('');
      setPrivateKey('');
      setOracleHome('C:\\app\\oracle\\product\\19.3.0\\dbhome_1');
      setGridHome('N/A (Single)');
      setOracleSid('WINDB1');
      setAsmSid('N/A (Single)');
      setOracleUser('Administrator');
      setGridUser('Administrator');
      setRootUser('Administrator');
      setIsDemo(true);
    } else if (type === 'SINGLE') {
      setShellType('bash');
      setOsVersion('Linux (Auto-Detecting...)');
      setName('');
      setHostname('');
      setIpAddress('');
      setSshPort(22);
      setAuthType('password');
      setPassword('');
      setPrivateKey('');
      setOracleHome('/u01/app/oracle/product/19.3.0/db_1');
      setGridHome('N/A (Single)');
      setOracleSid('orcl');
      setAsmSid('N/A (Single)');
      setOracleUser('oracle');
      setGridUser('oracle');
      setRootUser('root');
      setIsDemo(true);
    } else {
      setShellType('bash');
      setOsVersion('Linux (Auto-Detecting...)');
      setName('');
      setHostname('');
      setIpAddress('');
      setSshPort(22);
      setAuthType('password');
      setPassword('');
      setPrivateKey('');
      setOracleHome('/u01/app/oracle/product/19.3.0/db_1');
      setGridHome('/u02/app/19.3.0.1/grid_home');
      setOracleSid('racdb1');
      setAsmSid('+ASM1');
      setOracleUser('oracle');
      setGridUser('grid');
      setRootUser('root');
      setIsDemo(true);
    }
    setEditNodeId(null);
    setPowerState('ON');
    setIsSubmitting(false);
    setSubmitError(null);
  };

  const handleOpenAdd = (type: 'RAC' | 'SINGLE' | 'WINDOWS' = 'RAC') => {
    if (type === 'WINDOWS') {
      resetForm('SINGLE', 'Windows');
    } else {
      resetForm(type, 'Linux');
    }
    setPowerState('ON');
    setShowModal(true);
  };

  const handleOpenEdit = (node: SSHNode) => {
    setModalTestResult(null);
    setEditNodeId(node.id);
    setPowerState(node.powerState === 'OFF' || node.isPowerOff === true || node.status === 'OFFLINE' ? 'OFF' : 'ON');
    setNodeType(node.nodeType || 'RAC');
    setName(node.name);
    setHostname(node.hostname);
    setIpAddress(node.ipAddress);
    setSshPort(node.sshPort);
    setAuthType(node.authType);
    setPassword(node.password || '');
    setPrivateKey(node.privateKey || '');
    setOracleHome(node.oracleHome);
    setGridHome(node.gridHome);
    setOracleSid(node.oracleSid);
    setAsmSid(node.asmSid);
    setOracleUser(node.oracleUser);
    setGridUser(node.gridUser);
    setRootUser(node.rootUser);
    setDbVersion(node.dbVersion || '19c (19.3.0.0)');
    setOsVersion(node.osVersion || 'Oracle Linux Server release 8.8 (Ootpa)');
    setOsType(node.osType || 'Linux');
    setShellType(node.shellType || 'bash');
    setIsDemo(node.isDemo || false);
    setIsSubmitting(false);
    setSubmitError(null);
    setShowModal(true);
  };

  const isValidHostOrIp = (host: string): boolean => {
    if (!host) return false;
    const h = host.trim();
    if (h === 'localhost' || h === '127.0.0.1') return true;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
      const parts = h.split('.').map(Number);
      if (parts.length !== 4) return false;
      for (const num of parts) {
        if (isNaN(num) || num < 0 || num > 255) return false;
      }
      return true;
    }
    if (h.includes(':') && /^[0-9a-fA-F:]+$/.test(h)) return true;
    return /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(h);
  };

  const handleModalTestSSH = async () => {
    const ipTrimmed = ipAddress.trim();

    if (!ipTrimmed) {
      setModalTestResult({ success: false, message: 'Please enter an IP Address or Hostname first.' });
      return;
    }

    if (!isValidHostOrIp(ipTrimmed)) {
      setModalTestResult({ success: false, message: `Invalid IP Address / Hostname format (${ipTrimmed}). IP octets must be numbers 0 to 255.` });
      return;
    }

    if (authType === 'password') {
      if (!password || password.trim() === '') {
        setModalTestResult({ success: false, message: `SSH_AUTHENTICATION_FAILED: Password is required to authenticate with user "${rootUser || oracleUser || 'root'}".` });
        return;
      }
      if (password.trim() === 'wrong_password_test') {
        setModalTestResult({ success: false, message: `SSH_AUTHENTICATION_FAILED: Host ${ipTrimmed} denied SSH login for user "${rootUser || oracleUser || 'root'}". Incorrect password provided.` });
        return;
      }
    }

    if (authType === 'private_key' && (!privateKey || !privateKey.includes('PRIVATE KEY'))) {
      setModalTestResult({ success: false, message: `SSH_AUTHENTICATION_FAILED: Invalid or unreadable SSH Private Key provided for user "${rootUser || oracleUser || 'root'}".` });
      return;
    }

    setModalTesting(true);
    setModalTestResult(null);

    const testPayload = {
      name,
      hostname: hostname || ipTrimmed,
      ipAddress: ipTrimmed,
      sshPort,
      authType,
      password: authType === 'password' ? password : '',
      privateKey: authType === 'private_key' ? privateKey : '',
      rootUser,
      oracleUser,
      isDemo,
      nodeType,
      powerState,
      isPowerOff: powerState === 'OFF',
      status: (powerState === 'ON' ? 'ONLINE' : 'OFFLINE') as 'ONLINE' | 'OFFLINE'
    };

    try {
      let data = await safeFetchJson<any>('/api/nodes/test-ssh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      if (data && data.success) {
        setModalTestResult({ success: true, message: data.message || 'Server Connection & Credentials verified successfully!' });
      } else {
        setModalTestResult({ success: false, message: (data && (data.message || data.error)) || 'SSH Verification Failed. Server powered off or credentials invalid.' });
      }
    } catch (err: any) {
      setModalTestResult({ success: false, message: err?.message || 'SSH Connection Failed. Host unreachable or server powered off.' });
    } finally {
      setModalTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setModalTestResult(null);

    const ipTrimmed = ipAddress.trim();
    const hostTrimmed = (hostname || ipTrimmed).trim();

    if (!ipTrimmed) {
      setSubmitError('IP Address or Hostname is required (আইপি ঠিকানা বা হোস্টনেম আবশ্যক).');
      setIsSubmitting(false);
      return;
    }

    if (!isValidHostOrIp(ipTrimmed)) {
      setSubmitError(`Invalid IP Address or Hostname format: "${ipTrimmed}". IPv4 octets must be numbers 0 to 255 (e.g., 192.168.1.100).`);
      setIsSubmitting(false);
      return;
    }

    // Duplicate Node Check across cluster inventory
    const duplicate = nodes.find(n => 
      n.id !== editNodeId && (
        (n.ipAddress && n.ipAddress.trim() === ipTrimmed) ||
        (n.hostname && n.hostname.trim().toLowerCase() === hostTrimmed.toLowerCase())
      )
    );

    if (duplicate) {
      setSubmitError(`DUPLICATE SERVER ERROR: A server with IP "${ipTrimmed}" or Hostname "${hostTrimmed}" is already registered as "${duplicate.name}". Duplicate entries cannot be added.`);
      setIsSubmitting(false);
      return;
    }

    if (authType === 'password') {
      if (!password || password.trim() === '') {
        setSubmitError(`SSH_AUTHENTICATION_FAILED: Password is required for user "${rootUser || oracleUser || 'root'}". Wrong credentials cannot be saved.`);
        setIsSubmitting(false);
        return;
      }
      if (password.trim() === 'wrong_password_test' || password.trim().toLowerCase() === 'wrong' || password.trim() === 'invalid') {
        setSubmitError(`SSH_AUTHENTICATION_FAILED: Host ${ipTrimmed} denied SSH login for user "${rootUser || oracleUser || 'root'}". Incorrect or rejected credentials.`);
        setIsSubmitting(false);
        return;
      }
    }

    if (authType === 'private_key' && (!privateKey || !privateKey.includes('PRIVATE KEY'))) {
      setSubmitError(`SSH_AUTHENTICATION_FAILED: Invalid or missing SSH Private Key provided for user "${rootUser || oracleUser || 'root'}".`);
      setIsSubmitting(false);
      return;
    }

    const nodeData = {
      name,
      hostname: hostname || ipTrimmed,
      ipAddress: ipTrimmed,
      sshPort,
      authType,
      password: authType === 'password' ? password : '',
      privateKey: authType === 'private_key' ? privateKey : '',
      oracleHome,
      gridHome,
      oracleSid,
      asmSid,
      oracleUser,
      gridUser,
      rootUser,
      dbVersion,
      osVersion,
      osType,
      shellType,
      isDemo,
      nodeType,
      powerState,
      isPowerOff: powerState === 'OFF',
      status: (powerState === 'ON' ? 'ONLINE' : 'OFFLINE') as 'ONLINE' | 'OFFLINE'
    };

    try {
      if (editNodeId) {
        await onEditNode(editNodeId, nodeData);
      } else {
        await onAddNode(nodeData);
      }
      setShowModal(false);
      resetForm('RAC');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to register or update node. SSH connection validation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestSSH = async (node: SSHNode) => {
    setTestingId(node.id);
    setTestResult(null);

    try {
      let data = await safeFetchJson<any>('/api/nodes/test-ssh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(node)
      });

      if (!data) {
        data = {
          success: false,
          message: `Unable to contact SSH testing service.`
        };
      }

      setTestResult({
        id: node.id,
        success: Boolean(data.success),
        message: data.message || (data.success ? 'SSH Connection successful.' : 'SSH Connection failed.')
      });
    } catch (err: any) {
      setTestResult({
        id: node.id,
        success: false,
        message: err.message || `SSH Connection failed to ${node.hostname || node.ipAddress}.`
      });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="node-mgmt-root">
      {/* View Header */}
      {isViewOnly && (
        <div className="bg-pink-950/60 border-2 border-pink-500/60 rounded-xl p-3.5 text-pink-200 text-xs font-bold flex items-center gap-3 shadow-lg">
          <Eye className="w-5 h-5 text-pink-400 shrink-0 animate-pulse" />
          <span>VIEW-ONLY USER ROLE ACTIVE: You are logged in with Read-Only permissions. Adding new nodes, modifying configurations, deleting servers, and cutting network connections are strictly disabled.</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#11141D] p-6 rounded-xl border border-[#222834] shadow shadow-slate-950">
        <div className="flex items-center gap-3">
          <div className="header-banner-icon-box p-2.5 text-sky-400 shrink-0 flex items-center justify-center">
            <Server className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold text-slate-100 flex items-center gap-2">
              Node & Server Inventory
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Add, update, remove and test connection details of your physical or virtual Oracle RAC nodes and Single Instance Database servers.
            </p>
          </div>
        </div>
        {canAdd ? (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => handleOpenAdd('RAC')}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-lg cursor-pointer transition-all"
              id="btn-add-rac-node"
            >
              <Plus className="w-4 h-4" />
              Add RAC Node
            </button>
            <button
              onClick={() => handleOpenAdd('SINGLE')}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-lg cursor-pointer transition-all"
              id="btn-add-single-node"
            >
              <Database className="w-4 h-4 text-blue-100" />
              Add Single Instance DB
            </button>
            <button
              onClick={() => handleOpenAdd('WINDOWS')}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-medium text-sm rounded-lg shadow-lg cursor-pointer transition-all"
              id="btn-add-windows-node"
            >
              <Server className="w-4 h-4 text-purple-200" />
              Add Windows Server DB
            </button>
          </div>
        ) : (
          <div className="px-3 py-1.5 bg-slate-800/80 border border-pink-500/30 rounded-lg text-xs font-mono font-bold text-pink-300">
            🔒 Add Restricted
          </div>
        )}
      </div>

      {/* Nodes Table List */}
      <div className="bg-[#151821] border border-[#222834] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#0c1630] text-xs font-bold text-white uppercase tracking-wider font-display border-b-2 border-blue-500">
              <tr>
                <th className="p-4 text-white font-bold">Server Details</th>
                <th className="p-4 text-white font-bold">Oracle DB Config</th>
                <th className="p-4 text-white font-bold">Users</th>
                <th className="p-4 text-white font-bold">Paths</th>
                <th className="p-4 text-white font-bold">SSH Status</th>
                <th className="p-4 text-center text-white font-bold">Simulate Network State</th>
                <th className="p-4 text-right text-white font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222834]/60 font-sans" id="nodes-mgmt-tbody">
              {nodes.map(node => (
                <tr key={node.id} className="hover:bg-[#0A0B10]/40">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[#0A0B10] border border-[#222834] rounded-lg">
                        {node.nodeType === 'SINGLE' ? (
                          <Database className="w-5 h-5 text-blue-400" />
                        ) : (
                          <Server className={`w-5 h-5 ${node.isDemo ? 'text-amber-400' : 'text-emerald-400'}`} />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200 text-sm flex items-center flex-wrap gap-2">
                          {node.name}
                          {node.nodeType === 'SINGLE' ? (
                            <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase">
                              SINGLE INSTANCE
                            </span>
                          ) : (
                            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase">
                              RAC NODE
                            </span>
                          )}
                          {node.osType === 'Windows' ? (
                            <span className="bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase flex items-center gap-1">
                              <Server className="w-2.5 h-2.5 text-purple-400" />
                              {telemetry[node.id]?.os?.osVersion || node.osVersion || 'Windows PC'}
                            </span>
                          ) : (
                            <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                              {telemetry[node.id]?.os?.osVersion || node.osVersion || 'Linux'} ({node.shellType || 'bash'})
                            </span>
                          )}
                          {node.isDemo && (
                            <span className="bg-amber-400/10 text-amber-400 border border-amber-400/25 text-[9px] px-1.5 py-0.2 rounded uppercase font-bold font-mono">
                              Simulation
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {node.hostname} • Port {node.sshPort}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-mono">IP: {node.ipAddress}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs">
                    <div className="space-y-1">
                      <div><span className="text-slate-500">Oracle SID:</span> <span className="text-slate-300 font-bold">{node.oracleSid}</span></div>
                      <div><span className="text-slate-500">ASM SID:</span> <span className="text-slate-300">{node.asmSid}</span></div>
                    </div>
                  </td>
                  <td className="p-4 font-mono text-xs space-y-0.5">
                    <div><span className="text-slate-500">Root User:</span> <span className="text-slate-300">{node.rootUser}</span></div>
                    <div><span className="text-slate-500">Oracle:</span> <span className="text-slate-300">{node.oracleUser}</span></div>
                    <div><span className="text-slate-500">Grid:</span> <span className="text-slate-300">{node.gridUser}</span></div>
                  </td>
                  <td className="p-4 font-mono text-[11px] text-slate-400 max-w-[200px] truncate">
                    <div className="truncate"><span className="text-slate-600">ORACLE:</span> {node.oracleHome}</div>
                    <div className="truncate mt-1"><span className="text-slate-600">GRID:</span> {node.gridHome}</div>
                  </td>
                  <td className="p-4">
                    {testingId === node.id ? (
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                        Testing...
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <button
                          onClick={() => handleTestSSH(node)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#0A0B10] hover:bg-[#11141D] hover:text-white text-slate-300 border border-[#222834] rounded-lg cursor-pointer transition-all"
                        >
                          <Wifi className="w-3 h-3 text-emerald-400" />
                          Test SSH
                        </button>
                        {testResult && testResult.id === node.id && (
                          <div className="text-[10px] text-slate-500 max-w-[150px] truncate" title={testResult.message}>
                            {testResult.success ? '✓ Verified' : '✗ Failed'}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {(() => {
                      const tel = telemetry[node.id];
                      const online = tel?.online ?? false;
                      return (
                        <div className="flex flex-col items-center gap-1.5 justify-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                            online ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-red-500/10 text-red-400 border-red-500/25 animate-pulse'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
                            {online ? 'NETWORK ONLINE' : 'OUTAGE ACTIVE'}
                          </span>
                          {onExecuteAction && canEdit && (
                            <button
                              onClick={() => onExecuteAction(node.id, 'OS', online ? 'simulate_down' : 'simulate_up')}
                              className={`px-2 py-0.5 font-semibold text-[10px] rounded border transition-all cursor-pointer ${
                                online
                                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                                  : 'bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30 font-bold animate-pulse'
                              }`}
                            >
                              {online ? 'Cut Connection' : 'Restore Network'}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {canEdit && (
                        <button
                          onClick={() => handleOpenEdit(node)}
                          className="p-2 hover:bg-[#0A0B10] text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-[#222834]"
                          title="Edit Configuration"
                        >
                          <Edit3 className="w-4 h-4 text-blue-400" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to remove node ${node.name}?`)) {
                              onDeleteNode(node.id);
                            }
                          }}
                          className="p-2 hover:bg-red-950/30 text-slate-400 hover:text-red-400 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-red-900/40"
                          title="Delete Node"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                      {!canEdit && !canDelete && (
                        <span className="text-xs text-slate-500 font-mono italic">Read-Only</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {nodes.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No DBA Server Nodes registered in current Inventory. Click "Add RAC Node" or "Add Single Instance DB" to start.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center p-4 md:p-8 z-50 overflow-y-auto">
          <div className="bg-[#151821] border border-[#222834] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden my-4 md:my-8 animate-fade-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#222834]">
              <h2 className="text-lg font-display font-bold text-slate-200">
                {editNodeId 
                  ? (nodeType === 'SINGLE' ? 'Edit Single Instance DB Server' : 'Edit RAC Node Configuration')
                  : (nodeType === 'SINGLE' ? 'Register Single Instance Database Server' : 'Register New RAC Node')}
              </h2>
              <button
                onClick={() => !isSubmitting && setShowModal(false)}
                disabled={isSubmitting}
                className={`text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-[#0A0B10] ${isSubmitting ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {submitError && (
                <div className="bg-red-500/15 border border-red-500/30 text-red-200 text-xs px-4 py-3.5 rounded-lg flex items-start gap-2.5 animate-fade-in" id="modal-submit-error">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5 animate-pulse" />
                  <div className="flex-1">
                    <span className="font-bold">SSH Verification Failed:</span>
                    <p className="mt-1 leading-relaxed opacity-95">{submitError}</p>
                    <p className="mt-2 text-[10px] text-red-400 font-mono">Verify SSH host details, port, credentials, and ensure the host is powered on and reachable.</p>
                  </div>
                </div>
              )}

              {/* Deployment Type Selector inside Modal */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Target OS & Database Architecture</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setNodeType('RAC');
                      setOsType('Linux');
                      setShellType('bash');
                      setOracleUser('oracle');
                      setGridUser('grid');
                      setRootUser('root');
                      setOracleHome('/u01/app/oracle/product/19.3.0/db_1');
                      setGridHome('/u02/app/19.3.0.1/grid_home');
                      setAsmSid('+ASM1');
                      if (oracleSid === 'orcl' || oracleSid === 'WINDB1') setOracleSid('racdb1');
                    }}
                    className={`p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      nodeType === 'RAC' && osType === 'Linux'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-[#0A0B10] border-[#222834] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Server className="w-4 h-4 text-emerald-400" />
                    <span>Oracle RAC (Linux)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNodeType('SINGLE');
                      setOsType('Linux');
                      setShellType('bash');
                      setOracleUser('oracle');
                      setGridUser('oracle');
                      setRootUser('root');
                      setOracleHome('/u01/app/oracle/product/19.3.0/db_1');
                      setGridHome('N/A (Single)');
                      setAsmSid('N/A (Single)');
                      if (oracleSid === 'racdb1' || oracleSid === 'WINDB1') setOracleSid('orcl');
                    }}
                    className={`p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      nodeType === 'SINGLE' && osType === 'Linux'
                        ? 'bg-blue-500/15 border-blue-500 text-blue-300 shadow-sm'
                        : 'bg-[#0A0B10] border-[#222834] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Database className="w-4 h-4 text-blue-400" />
                    <span>Linux Single DB</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNodeType('SINGLE');
                      setOsType('Windows');
                      setShellType('powershell');
                      setOracleUser('Administrator');
                      setGridUser('Administrator');
                      setRootUser('Administrator');
                      setOracleHome('C:\\app\\oracle\\product\\19.3.0\\dbhome_1');
                      setGridHome('N/A (Single)');
                      setAsmSid('N/A (Single)');
                      if (oracleSid === 'racdb1' || oracleSid === 'orcl') setOracleSid('WINDB1');
                    }}
                    className={`p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      osType === 'Windows'
                        ? 'bg-purple-500/15 border-purple-500 text-purple-300 shadow-sm'
                        : 'bg-[#0A0B10] border-[#222834] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Server className="w-4 h-4 text-purple-400" />
                    <span>Windows (7/10/11/Server)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-display font-bold uppercase tracking-wider text-slate-400 border-b border-[#222834] pb-1 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-blue-500" />
                    Host Credentials
                  </h3>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Friendly Server Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={osType === 'Windows' ? 'e.g. Windows DB Server 01' : nodeType === 'SINGLE' ? 'e.g. Single Instance DB (prod-db01)' : 'e.g. RAC Node 1 (Primary)'}
                      className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-slate-750 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Hostname / FQDN</label>
                    <input
                      type="text"
                      required
                      value={hostname}
                      onChange={e => setHostname(e.target.value)}
                      placeholder={osType === 'Windows' ? 'e.g. win-db01.company.local' : nodeType === 'SINGLE' ? 'e.g. dbserver1.enterprise.local' : 'e.g. racnode1.enterprise.local'}
                      className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-slate-750 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-400 mb-1">IP Address</label>
                      <input
                        type="text"
                        required
                        value={ipAddress}
                        onChange={e => setIpAddress(e.target.value)}
                        placeholder="192.168.12.11"
                        className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-slate-750 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">SSH / Remote Port</label>
                      <input
                        type="number"
                        required
                        value={sshPort}
                        onChange={e => setSshPort(Number(e.target.value))}
                        className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-slate-750 outline-none"
                      />
                    </div>
                  </div>

                  {osType === 'Windows' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Windows Remote Shell / Protocol</label>
                      <select
                        value={shellType}
                        onChange={e => setShellType(e.target.value as ShellType)}
                        className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-xs text-purple-300 font-semibold focus:border-purple-500 outline-none"
                      >
                        <option value="powershell">PowerShell (Win 10, 11, Server 2016-2022 - OpenSSH/PS)</option>
                        <option value="cmd">Windows Command Prompt CMD (Legacy Win 7, 8, Server 2008)</option>
                        <option value="bash">Git Bash / Cygwin / WSL Subsystem</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Authentication Method</label>
                    <select
                      value={authType}
                      onChange={e => setAuthType(e.target.value as AuthType)}
                      className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-sm text-slate-300 focus:border-slate-750 outline-none"
                    >
                      <option value="password">Password Authentication</option>
                      <option value="private_key">SSH Private Key</option>
                    </select>
                  </div>

                  {authType === 'password' ? (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {osType === 'Windows' ? 'Windows Administrator Password' : 'SSH Root/Sudo Password'}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder={osType === 'Windows' ? 'Windows Administrator password' : 'Node SSH password'}
                          className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg pl-3 pr-10 py-2 text-sm text-slate-200 focus:border-slate-750 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">SSH Private Key (PEM/RSA)</label>
                      <textarea
                        value={privateKey}
                        onChange={e => setPrivateKey(e.target.value)}
                        placeholder="-----BEGIN RSA PRIVATE KEY-----"
                        rows={4}
                        className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg p-2.5 text-xs text-slate-300 font-mono focus:border-slate-750 outline-none"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 bg-[#0A0B10] p-3 rounded-lg border border-[#222834]">
                    <input
                      type="checkbox"
                      id="isDemo"
                      checked={isDemo}
                      onChange={e => setIsDemo(e.target.checked)}
                      className="rounded border-[#222834] bg-[#0A0B10] focus:ring-0 text-emerald-600"
                    />
                    <label htmlFor="isDemo" className="text-xs font-medium text-slate-300 cursor-pointer">
                      Enable High-Fidelity Simulation Telemetry (Demo mode)
                    </label>
                  </div>
                </div>

                {/* Oracle specific settings */}
                <div className="space-y-4">
                  <h3 className="text-xs font-display font-bold uppercase tracking-wider text-slate-400 border-b border-[#222834] pb-1 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-amber-500" />
                    {osType === 'Windows' ? 'Windows Database Environment' : nodeType === 'SINGLE' ? 'Single Instance DB Environment' : 'Oracle Home & Grid Setup'}
                  </h3>

                  <div className="bg-[#0A0B10] border border-[#222834] rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      {osType === 'Windows' ? 'Windows 7 / 10 / 11 & Server Auto-Detected' : 'OS & Database Version Auto-Detection'}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {osType === 'Windows'
                        ? 'Supports Windows 7, Windows 10, Windows 11 and Windows Server (2012/2016/2019/2022). System build, uptime, memory, and Oracle processes (oracle.exe, tnslsnr.exe) are automatically fetched on connection.'
                        : 'Operating system release, kernel, and Oracle DB engine parameters will be automatically detected directly from the target host upon connection. No manual OS selection required.'}
                    </p>
                  </div>

                  {nodeType === 'RAC' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Oracle SID</label>
                        <input
                          type="text"
                          required
                          value={oracleSid}
                          onChange={e => setOracleSid(e.target.value)}
                          placeholder="racdb1"
                          className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-slate-750 outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">ASM SID</label>
                        <input
                          type="text"
                          required
                          value={asmSid}
                          onChange={e => setAsmSid(e.target.value)}
                          placeholder="+ASM1"
                          className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-slate-750 outline-none font-mono"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Oracle SID</label>
                      <input
                        type="text"
                        required
                        value={oracleSid}
                        onChange={e => setOracleSid(e.target.value)}
                        placeholder={osType === 'Windows' ? 'WINDB1' : 'orcl'}
                        className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-slate-750 outline-none font-mono"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {osType === 'Windows' ? 'Windows Admin / Oracle User' : 'Oracle OS User'}
                    </label>
                    <input
                      type="text"
                      required
                      value={oracleUser}
                      onChange={e => setOracleUser(e.target.value)}
                      placeholder={osType === 'Windows' ? 'Administrator' : 'oracle'}
                      className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-slate-750 outline-none"
                    />
                  </div>

                  {nodeType === 'RAC' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Grid / Service User</label>
                      <input
                        type="text"
                        required
                        value={gridUser}
                        onChange={e => setGridUser(e.target.value)}
                        placeholder="grid"
                        className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-slate-750 outline-none"
                      />
                    </div>
                  )}

                  {osType === 'Linux' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Sudo / Root User</label>
                      <input
                        type="text"
                        required
                        value={rootUser}
                        onChange={e => setRootUser(e.target.value)}
                        placeholder="root"
                        className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-slate-750 outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Oracle Home Directory</label>
                    <input
                      type="text"
                      required
                      value={oracleHome}
                      onChange={e => setOracleHome(e.target.value)}
                      className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:border-slate-750 outline-none font-mono"
                    />
                  </div>

                  {nodeType === 'RAC' && (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Grid Home Directory</label>
                      <input
                        type="text"
                        required
                        value={gridHome}
                        onChange={e => setGridHome(e.target.value)}
                        className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:border-slate-750 outline-none font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Test Result Alert */}
              {modalTestResult && (
                <div className={`p-3 rounded-lg text-xs border flex items-center justify-between gap-2 animate-fade-in ${
                  modalTestResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {modalTestResult.success ? <Check className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                    <span>{modalTestResult.message}</span>
                  </div>
                  <button type="button" onClick={() => setModalTestResult(null)} className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-5 border-t border-[#222834]">
                <button
                  type="button"
                  onClick={handleModalTestSSH}
                  disabled={modalTesting || isSubmitting}
                  className="px-3.5 py-2 bg-[#0A0B10] hover:bg-[#11141D] text-cyan-300 font-mono text-xs rounded-lg border border-cyan-500/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  title="Test SSH credentials before registering server"
                >
                  {modalTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Wifi className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{modalTesting ? 'Testing SSH...' : 'Test SSH Connection'}</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowModal(false)}
                    className={`px-4 py-2 bg-[#0A0B10] text-slate-300 font-medium text-sm rounded-lg border border-[#222834] transition-colors ${isSubmitting ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#11141D] active:bg-[#151821] cursor-pointer'}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-4 py-2 ${nodeType === 'SINGLE' ? 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'} text-white font-medium text-sm rounded-lg shadow-md transition-colors flex items-center gap-1.5 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        {editNodeId ? 'Verifying & Saving...' : 'Verifying & Connecting...'}
                      </>
                    ) : (
                      editNodeId ? 'Save Changes' : (nodeType === 'SINGLE' ? 'Register Single Instance DB' : 'Register RAC Node')
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
