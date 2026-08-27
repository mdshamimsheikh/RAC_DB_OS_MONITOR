import React, { useState, useEffect } from 'react';
import {
  Shield, Network, Plus, Trash2, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Search, KeyRound, Monitor, UserCheck, Terminal, Cpu, Clock, Check, Zap, Laptop, ArrowRight,
  Globe, Server, Lock, AlertOctagon, ShieldAlert, Eye, MapPin, Radio
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { IntrusionLogEntry, TargetServerProtectionStatus } from '../types';

export interface AllowedIpItem {
  id: string;
  ip: string;
  label: string;
  hostName: string;
  user: string;
  notes?: string;
  addedAt: string;
  lastAccess: string;
}

export interface ClientToolLog {
  id: string;
  timestamp: string;
  clientIp: string;
  hostPcName: string;
  macAddress: string;
  user: string;
  toolName: string;
  endpoint: string;
  method: string;
  status: 'PERMITTED' | 'BLOCKED_BY_FIREWALL';
}

interface IpWhitelistViewProps {
  currentUser?: any;
  onAddAuditLog?: (action: string, target: string, details: string) => void;
}

export default function IpWhitelistView({ currentUser, onAddAuditLog }: IpWhitelistViewProps) {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [allowedIps, setAllowedIps] = useState<AllowedIpItem[]>([]);
  const [clientToolLogs, setClientToolLogs] = useState<ClientToolLog[]>([]);
  const [intrusionLogs, setIntrusionLogs] = useState<IntrusionLogEntry[]>([]);
  const [protectedTargets, setProtectedTargets] = useState<TargetServerProtectionStatus[]>([]);
  const [currentClientIp, setCurrentClientIp] = useState<string>('');
  const [currentClientHost, setCurrentClientHost] = useState<string>('');
  const [currentClientUser, setCurrentClientUser] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [inputIp, setInputIp] = useState<string>('');
  const [inputLabel, setInputLabel] = useState<string>('');
  const [inputHostName, setInputHostName] = useState<string>('');
  const [inputUser, setInputUser] = useState<string>('');
  const [inputNotes, setInputNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Firewall Test State
  const [testIpInput, setTestIpInput] = useState<string>('');
  const [testResult, setTestResult] = useState<{
    ip: string;
    allowed: boolean;
    reason: string;
    mode: string;
    matchedEntry?: AllowedIpItem | null;
  } | null>(null);
  const [testing, setTesting] = useState<boolean>(false);

  // Notice Message Toast
  const [notice, setNotice] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotice({ msg, type });
    setTimeout(() => {
      setNotice(null);
    }, 5000);
  };

  const fetchIntrusionLogs = async () => {
    try {
      const res = await apiFetch('/api/security/intrusion-logs');
      if (res.ok) {
        const data = await res.json();
        setIntrusionLogs(data.intrusionLogs || []);
        setClientToolLogs(data.allowedToolLogs || []);
        setProtectedTargets(data.protectedTargets || []);
        if (data.whitelistEnabled !== undefined) setEnabled(data.whitelistEnabled);
      }
    } catch (e) {
      console.warn('Failed to fetch intrusion logs', e);
    }
  };

  const fetchWhitelistConfig = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/security/ip-whitelist');
      if (res.ok) {
        const data = await res.json();
        setEnabled(Boolean(data.enabled));
        setAllowedIps(data.allowedIps || []);
        if (data.currentClientIp) setCurrentClientIp(data.currentClientIp);
        if (data.currentClientHost) setCurrentClientHost(data.currentClientHost);
        if (data.currentClientUser) setCurrentClientUser(data.currentClientUser);
      }
      await fetchIntrusionLogs();
    } catch (e) {
      console.warn('Failed to fetch IP whitelist config', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWhitelistConfig();
    const timer = setInterval(() => {
      fetchIntrusionLogs();
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleSimulateIntrusion = async (customIp?: string) => {
    try {
      const res = await apiFetch('/api/security/simulate-intrusion', {
        method: 'POST',
        body: JSON.stringify({
          testIp: customIp || '185.220.101.99',
          hostPcName: 'ROGUE-EXTERNAL-PC',
          toolName: 'PuTTY SSH Tool',
          targetServer: 'Oracle RAC Node 1 (racnode1.company.local)'
        })
      });
      if (res.ok) {
        const data = await res.json();
        showNotification(data.message, 'error');
        await fetchIntrusionLogs();
      }
    } catch (e) {
      showNotification('Simulation failed', 'error');
    }
  };

  const handleToggleMode = async (nextState: boolean) => {
    try {
      const res = await apiFetch('/api/security/ip-whitelist/toggle', {
        method: 'POST',
        body: JSON.stringify({ enabled: nextState })
      });
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled);
        const actionStr = data.enabled
          ? 'STRICT IP WHITELIST ENABLED: All unapproved client IPs will be dropped!'
          : 'MONITOR MODE: Whitelist disabled, all IPs permitted.';
        showNotification(actionStr, data.enabled ? 'error' : 'info');
        if (onAddAuditLog) {
          onAddAuditLog('TOGGLE_IP_WHITELIST', 'PORTAL_FIREWALL', actionStr);
        }
      }
    } catch (e: any) {
      showNotification('Failed to toggle whitelist mode.', 'error');
    }
  };

  const handleAddIpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputIp.trim()) {
      showNotification('IP address is required.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiFetch('/api/security/ip-whitelist/add', {
        method: 'POST',
        body: JSON.stringify({
          ip: inputIp.trim(),
          label: inputLabel.trim() || 'Workstation Client',
          hostName: inputHostName.trim() || 'Client PC',
          user: inputUser.trim() || currentUser?.username || 'Authorized User',
          notes: inputNotes.trim() || 'Assigned via Access Control Panel'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        showNotification(data.error || 'Failed to add IP.', 'error');
        return;
      }

      setAllowedIps(data.allowedIps || []);
      showNotification(`Client IP '${inputIp.trim()}' added to authorized whitelist!`, 'success');
      if (onAddAuditLog) {
        onAddAuditLog('ADD_ALLOWED_IP', inputIp.trim(), `Assigned allowed client machine IP ${inputIp.trim()}`);
      }

      // Reset form
      setInputIp('');
      setInputLabel('');
      setInputHostName('');
      setInputUser('');
      setInputNotes('');
      setShowAddModal(false);
    } catch (err: any) {
      showNotification('Network error adding IP.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAllowMyCurrentIp = async () => {
    if (!currentClientIp) {
      showNotification('Current client IP not detected yet.', 'error');
      return;
    }

    // Check if already in list
    const existing = allowedIps.find(i => i.ip === currentClientIp);
    if (existing) {
      showNotification(`Your current IP (${currentClientIp}) is ALREADY in the allowed whitelist.`, 'info');
      return;
    }

    try {
      const res = await apiFetch('/api/security/ip-whitelist/add', {
        method: 'POST',
        body: JSON.stringify({
          ip: currentClientIp,
          label: 'Current Admin Workstation',
          hostName: currentClientHost || 'DESKTOP-ADMIN-PC',
          user: currentUser?.username || currentClientUser || 'Admin User',
          notes: 'Auto-added via 1-click Allow My IP button'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAllowedIps(data.allowedIps || []);
        showNotification(`Success! Your client IP (${currentClientIp}) is now WHITELISTED.`, 'success');
      } else {
        showNotification(data.error || 'Could not auto-add current IP.', 'error');
      }
    } catch (e) {
      showNotification('Network error auto-adding IP.', 'error');
    }
  };

  const handleDeleteIp = async (id: string, ipStr: string) => {
    if (!window.confirm(`Are you sure you want to REVOKE whitelist access for IP '${ipStr}'?`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/security/ip-whitelist/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setAllowedIps(data.allowedIps || []);
        showNotification(`Revoked access for IP '${ipStr}'.`, 'info');
        if (onAddAuditLog) {
          onAddAuditLog('REVOKE_ALLOWED_IP', ipStr, `Removed IP ${ipStr} from Whitelist`);
        }
      }
    } catch (e) {
      showNotification('Failed to revoke IP access.', 'error');
    }
  };

  const handleRunFirewallTest = async () => {
    if (!testIpInput.trim()) {
      showNotification('Enter an IP address to test firewall rules.', 'error');
      return;
    }

    try {
      setTesting(true);
      const res = await apiFetch('/api/security/ip-whitelist/test', {
        method: 'POST',
        body: JSON.stringify({ ip: testIpInput.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
      }
    } catch (e) {
      showNotification('Error testing firewall IP.', 'error');
    } finally {
      setTesting(false);
    }
  };

  const filteredAllowedIps = allowedIps.filter(item => {
    const q = searchTerm.toLowerCase();
    return (
      item.ip.toLowerCase().includes(q) ||
      item.label.toLowerCase().includes(q) ||
      item.hostName.toLowerCase().includes(q) ||
      item.user.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in p-6" id="ip-whitelist-view-root">
      
      {/* Toast Notice */}
      {notice && (
        <div className={`p-4 rounded-xl shadow-2xl border flex items-center justify-between gap-3 text-xs font-bold font-mono transition-all ${
          notice.type === 'error' ? 'bg-red-950/90 text-red-200 border-red-500/80 shadow-red-900/30' :
          notice.type === 'success' ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/80 shadow-emerald-900/30' :
          'bg-blue-950/90 text-blue-200 border-blue-500/80 shadow-blue-900/30'
        }`}>
          <div className="flex items-center gap-2">
            {notice.type === 'error' ? <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" /> :
             notice.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> :
             <Shield className="w-5 h-5 text-blue-400 shrink-0" />}
            <span>{notice.msg}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-white uppercase text-[10px]">Dismiss</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#151821] p-6 rounded-2xl border border-[#222834] flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-600/30">
              <Network className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-extrabold text-white tracking-tight flex items-center gap-2">
                Client IP Whitelist & Firewall Access Control
              </h1>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Strict machine-level connection rule manager. Only explicitly authorized client machine IPs can connect to the server.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 border shadow-md ${
              enabled
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60 shadow-emerald-900/20'
                : 'bg-amber-950 text-amber-300 border-amber-500/60 shadow-amber-900/20'
            }`}>
              <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              {enabled ? 'STRICT WHITELIST MODE ACTIVE (DROP ALL UNLISTED IPs)' : 'MONITOR ALL MODE (DEFAULT PERMIT)'}
            </span>

            <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-blue-400" />
              Connected Client IP: <strong className="text-cyan-300 font-bold">{currentClientIp || '127.0.0.1'}</strong>
            </span>

            <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              Authorized IPs Count: <strong className="text-purple-300 font-bold">{allowedIps.length}</strong>
            </span>
          </div>
        </div>

        {/* Master Control Toggle Button */}
        <div className="bg-[#0b0e17] p-5 rounded-xl border border-indigo-500/30 flex flex-col items-center justify-center gap-3 shrink-0 shadow-inner w-full lg:w-72">
          <div className="text-center">
            <span className="text-xs font-mono font-bold uppercase text-slate-300 block">Firewall Policy Switch</span>
            <span className="text-[10px] text-slate-500 font-sans block mt-0.5">
              {enabled ? 'Reject any request from non-whitelisted IPs' : 'Allow all IP connections and log details'}
            </span>
          </div>

          <button
            onClick={() => handleToggleMode(!enabled)}
            className={`w-full py-3 px-4 rounded-xl font-mono text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
              enabled
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 border border-red-400'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 border border-emerald-400'
            }`}
          >
            <Shield className="w-4 h-4" />
            {enabled ? 'DISABLE STRICT FIREWALL' : 'TURN ON STRICT WHITELIST MODE'}
          </button>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Allow My Current IP Button */}
        <button
          onClick={handleAllowMyCurrentIp}
          className="p-5 bg-gradient-to-br from-[#121d33] to-[#1a2847] hover:from-[#172642] hover:to-[#213359] border border-cyan-500/40 rounded-xl text-left transition-all cursor-pointer shadow-xl group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/30 group-hover:scale-110 transition-transform">
              <Laptop className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">1-CLICK ADD</span>
          </div>
          <h3 className="text-sm font-bold text-slate-100 font-display">➕ Allow My Current Client IP</h3>
          <p className="text-xs text-slate-400 font-mono mt-1 truncate">
            Auto-detect & add <strong className="text-cyan-300">{currentClientIp || '127.0.0.1'}</strong> to Whitelist so you never lock yourself out.
          </p>
        </button>

        {/* 2. Assign New Client IP Modal Trigger */}
        <button
          onClick={() => setShowAddModal(true)}
          className="p-5 bg-gradient-to-br from-[#1b1536] to-[#271d4d] hover:from-[#221a45] hover:to-[#312561] border border-purple-500/40 rounded-xl text-left transition-all cursor-pointer shadow-xl group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/30 group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">ASSIGN IP</span>
          </div>
          <h3 className="text-sm font-bold text-slate-100 font-display">➕ Add Authorized Machine IP</h3>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Specify IP address, host PC name, department, and user notes to authorize server entry.
          </p>
        </button>

        {/* 3. Refresh Status */}
        <button
          onClick={fetchWhitelistConfig}
          className="p-5 bg-gradient-to-br from-[#131f24] to-[#1b2b30] hover:from-[#192930] hover:to-[#22373e] border border-emerald-500/40 rounded-xl text-left transition-all cursor-pointer shadow-xl group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/30 group-hover:scale-110 transition-transform">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">SYNC STATE</span>
          </div>
          <h3 className="text-sm font-bold text-slate-100 font-display">🔄 Refresh Whitelist Rules</h3>
          <p className="text-xs text-slate-400 font-sans mt-1">
            Reload current active firewall rules and client access state from the backend.
          </p>
        </button>
      </div>

      {/* Main Grid: Allowed IPs Table & Firewall Test Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Authorized Client IPs List (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#151821] p-5 rounded-xl border border-[#222834] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <h2 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                Authorized Client IP Registry ({filteredAllowedIps.length})
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Machines listed below are permitted to connect when Strict Whitelist Mode is active.
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search IP, host, or user..."
                className="bg-[#0A0B10] border border-[#222834] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 w-full sm:w-56"
              />
            </div>
          </div>

          <div className="bg-[#151821] border border-[#222834] rounded-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0c1328] text-slate-300 font-bold uppercase tracking-wider font-mono border-b border-[#222834]">
                  <tr>
                    <th className="p-3.5">Client IP Address</th>
                    <th className="p-3.5">Host Machine PC</th>
                    <th className="p-3.5">Assigned User / Label</th>
                    <th className="p-3.5">Last Access</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222834]/60 font-sans">
                  {filteredAllowedIps.map(item => {
                    const isMyIp = item.ip === currentClientIp;
                    return (
                      <tr key={item.id} className={`hover:bg-[#0A0B10]/60 transition ${isMyIp ? 'bg-cyan-950/20' : ''}`}>
                        <td className="p-3.5 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-400 text-sm">{item.ip}</span>
                            {isMyIp && (
                              <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold rounded uppercase">
                                YOUR PC
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <span className="text-[10px] text-slate-500 block truncate max-w-xs">{item.notes}</span>
                          )}
                        </td>

                        <td className="p-3.5 font-semibold text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <Monitor className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span>{item.hostName || 'Workstation'}</span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-medium text-slate-300">{item.label}</div>
                          <span className="text-[10px] font-mono text-slate-500 block">{item.user}</span>
                        </td>

                        <td className="p-3.5 font-mono text-[11px] text-slate-400">
                          {item.lastAccess ? new Date(item.lastAccess).toLocaleString() : 'Just Now'}
                        </td>

                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleDeleteIp(item.id, item.ip)}
                            className="p-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/30 rounded-lg text-xs font-bold transition cursor-pointer inline-flex items-center gap-1"
                            title="Revoke / Delete IP access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Revoke</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredAllowedIps.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-500 italic">
                        No authorized IP addresses found matching filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: IP Firewall Connection Simulator */}
        <div className="space-y-4">
          <div className="bg-[#151821] p-5 rounded-xl border border-[#222834] shadow-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-100 font-display flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Firewall Rule Tester
              </h2>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Simulate connection request from any IP address to check if the firewall permits or drops it.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                  Test Client IP Address:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testIpInput}
                    onChange={e => setTestIpInput(e.target.value)}
                    placeholder="e.g. 103.145.22.18"
                    className="flex-1 bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={handleRunFirewallTest}
                    disabled={testing}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-bold font-mono text-xs rounded-lg transition cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {testing ? 'Testing...' : 'Test IP'}
                  </button>
                </div>
              </div>

              {testResult && (
                <div className={`p-4 rounded-xl border space-y-2 animate-fade-in ${
                  testResult.allowed
                    ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-200'
                    : 'bg-red-950/80 border-red-500/80 text-red-200'
                }`}>
                  <div className="flex items-center gap-2 font-mono font-extrabold text-xs">
                    {testResult.allowed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                    )}
                    <span>
                      {testResult.allowed ? '✅ CONNECTION GRANTED (PERMITTED)' : '🚫 CONNECTION DROPPED (403 FORBIDDEN)'}
                    </span>
                  </div>

                  <p className="text-xs font-sans leading-relaxed text-slate-200">
                    {testResult.reason}
                  </p>

                  <div className="text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-2 flex justify-between">
                    <span>Mode: {testResult.mode}</span>
                    <span>IP: {testResult.ip}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Firewall Security Information Card */}
          <div className="bg-[#151821] p-5 rounded-xl border border-indigo-500/20 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-200 font-display flex items-center gap-2 uppercase tracking-wide">
              <KeyRound className="w-4 h-4 text-indigo-400" />
              How Portal IP Whitelist Works
            </h3>
            <ul className="text-xs text-slate-400 space-y-2 font-sans list-disc list-inside leading-relaxed">
              <li>When <strong className="text-emerald-400">Strict Whitelist Mode</strong> is ON, every incoming request to server APIs is validated against the authorized IP registry.</li>
              <li>Requests originating from unlisted IP addresses are immediately rejected with <strong className="text-red-400">HTTP 403 Forbidden</strong> and recorded in security audit logs.</li>
              <li>Localhost (127.0.0.1) and internal server processes are always permitted to prevent accidental self-lockout.</li>
              <li>You can wildcard subnets using asterisks, e.g. <strong className="text-cyan-300">192.168.0.*</strong> to allow all devices on a local office LAN segment.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Added Target Servers Firewall Guard Protection Matrix */}
      <div className="bg-[#151821] p-6 rounded-2xl border border-indigo-500/30 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222834] pb-4">
          <div>
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-400" />
              Added Target Servers & OS Database Protection Matrix
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono rounded font-bold uppercase">
                Strict Whitelist Guard Active
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              All servers, databases, and OS environments added to this portal are strictly isolated. Unassigned IPs attempting to connect to these target servers are automatically dropped (403 Forbidden).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              100% Closed to Unassigned IPs
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {protectedTargets.map(srv => (
            <div key={srv.id} className="bg-[#0b1021] p-4 rounded-xl border border-[#222834] hover:border-indigo-500/40 transition space-y-3">
              <div className="flex items-start justify-between">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
                  <Server className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono rounded font-bold">
                  GUARANTEED CLOSED
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-white font-display truncate">{srv.name}</h4>
                <p className="text-[11px] font-mono text-cyan-300 mt-0.5">{srv.ipAddress} • {srv.hostname}</p>
                <p className="text-[10px] font-sans text-slate-400">{srv.osType} Target Node</p>
              </div>

              <div className="pt-2 border-t border-[#1a2133] text-[11px] font-mono space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Firewall Guard:</span>
                  <span className="text-emerald-400 font-bold">STRICT_ACTIVE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Allowed IPs:</span>
                  <span className="text-cyan-300 font-bold">{srv.allowedClientsCount} Workstations</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Blocked Intrusions:</span>
                  <span className="text-red-400 font-bold">{srv.blockedAttemptsCount} Dropped</span>
                </div>
              </div>
            </div>
          ))}

          {protectedTargets.length === 0 && (
            <div className="col-span-full py-6 text-center text-slate-500 text-xs italic font-mono">
              Loading added target servers and database nodes...
            </div>
          )}
        </div>
      </div>

      {/* Unauthorized Connection & Unassigned IP Intrusion Forensic Inspector */}
      <div className="bg-[#151821] p-6 rounded-2xl border border-red-500/30 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#222834] pb-4">
          <div>
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
              Unauthorized Connection & Unassigned IP Forensic Inspector
              <span className="px-2.5 py-0.5 bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-mono rounded font-bold uppercase">
                Full Threat Location Telemetry
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Live security audit table tracking every attempt from unassigned or blocked client IPs trying to access your added target servers, database instances, or OS shells.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSimulateIntrusion('185.220.101.99')}
              className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-500/50 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
              <span>Simulate Attack from Germany 🇩🇪</span>
            </button>

            <button
              onClick={() => handleSimulateIntrusion('203.190.45.12')}
              className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-500/50 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Attack from Bangladesh 🇧🇩</span>
            </button>

            <button
              onClick={fetchIntrusionLogs}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-mono font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Refresh Logs</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-red-950/80">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-[#0c0814] text-red-200 font-bold uppercase text-[11px] border-b border-red-900/60">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Location & ISP</th>
                <th className="p-3">Client Machine IP</th>
                <th className="p-3">Host PC & MAC</th>
                <th className="p-3">Tool / Agent Used</th>
                <th className="p-3">Target Added Server</th>
                <th className="p-3">Action Attempted</th>
                <th className="p-3 text-right">Firewall Enforcement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-red-950/40 bg-[#0d0912]">
              {intrusionLogs.map(log => (
                <tr key={log.id} className="hover:bg-red-950/20 transition">
                  <td className="p-3 text-slate-400 text-[11px] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-bold text-slate-100">
                      <span className="text-base">{log.location.flag}</span>
                      <span>{log.location.city}, {log.location.country}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans">{log.location.isp}</div>
                  </td>
                  <td className="p-3 font-bold text-red-300 whitespace-nowrap">
                    {log.clientIp}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <div className="text-slate-200 font-semibold">{log.hostPcName}</div>
                    <div className="text-[10px] text-purple-300">{log.macAddress}</div>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-500/30 rounded text-[10px] font-bold">
                      {log.toolName}
                    </span>
                  </td>
                  <td className="p-3 text-cyan-300 font-semibold whitespace-nowrap">
                    {log.targetServer}
                  </td>
                  <td className="p-3 text-slate-300 text-[11px] font-mono max-w-xs truncate" title={log.actionAttempted}>
                    {log.actionAttempted}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <span className="px-2.5 py-1 bg-red-950 text-red-300 border border-red-500/60 rounded text-[10px] font-bold shadow-lg shadow-red-950 animate-pulse">
                      🚫 DROPPED (403 FORBIDDEN)
                    </span>
                  </td>
                </tr>
              ))}

              {intrusionLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500 italic">
                    No unauthorized intrusion attempts detected. Whitelist firewall is actively enforcing security.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-Time External Tools & Client Machine Access Telemetry Section */}
      <div className="bg-[#151821] p-6 rounded-2xl border border-[#222834] shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222834] pb-4">
          <div>
            <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              Permitted Workstation & Tool Access Inspector
              <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono rounded font-bold uppercase">
                PuTTY • Toad • SQL Dev • API • Curl
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Live incoming traffic inspector capturing permitted client tool connections from whitelisted DBA machines.
            </p>
          </div>

          <button
            onClick={fetchIntrusionLogs}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-mono font-bold flex items-center gap-2 shrink-0 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
            <span>Poll Connections</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#222834]">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-[#0b1021] text-slate-300 font-bold uppercase text-[11px] border-b border-[#222834]">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Client Machine IP</th>
                <th className="p-3">Host PC & MAC</th>
                <th className="p-3">Tool / User Agent</th>
                <th className="p-3">User Email</th>
                <th className="p-3">Target Endpoint</th>
                <th className="p-3 text-right">Firewall Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222834]/60">
              {clientToolLogs.map(log => (
                <tr key={log.id} className="hover:bg-[#0A0B10]/80 transition">
                  <td className="p-3 text-slate-400 text-[11px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="p-3 font-bold text-cyan-300">
                    {log.clientIp}
                  </td>
                  <td className="p-3">
                    <div className="text-slate-200 font-semibold">{log.hostPcName}</div>
                    <div className="text-[10px] text-purple-300">{log.macAddress}</div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-500/30 rounded text-[10px] font-bold">
                      {log.toolName}
                    </span>
                  </td>
                  <td className="p-3 text-amber-300 font-medium">
                    {log.user}
                  </td>
                  <td className="p-3 text-slate-300">
                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded mr-1 text-slate-400">{log.method}</span>
                    {log.endpoint}
                  </td>
                  <td className="p-3 text-right">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold border ${
                      log.status === 'PERMITTED'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                        : 'bg-red-950 text-red-300 border-red-500/50 animate-pulse'
                    }`}>
                      {log.status === 'PERMITTED' ? '✓ PERMITTED' : '🚫 BLOCKED (403)'}
                    </span>
                  </td>
                </tr>
              ))}

              {clientToolLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 italic">
                    Listening for incoming connections from client workstations...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Navigation Map: Where to Find Reports in Portal */}
      <div className="bg-gradient-to-r from-[#0d162d] via-[#121c38] to-[#181536] p-6 rounded-2xl border border-indigo-500/30 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 border-b border-indigo-500/20 pb-3">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30">
            <ArrowRight className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-display font-extrabold text-white">
              🗺️ Portal Navigation Map: Where to Find All Telemetry Reports & Logs
            </h3>
            <p className="text-xs text-slate-300 font-sans mt-0.5">
              Access all audit logs, incident forensi, and client access reports from these three primary menu hubs:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#0a0f21] border border-[#1e2a4a] rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-cyan-300 text-xs font-mono">
              <Network className="w-4 h-4 text-cyan-400" />
              1. IP Access Control & Whitelist
            </div>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              <strong>Location:</strong> Side Menu &rarr; <span className="text-cyan-300 font-mono">IP Access Control & Whitelist</span>
              <br />
              <strong>Contents:</strong> Live client machine IP Whitelist, Firewall toggle, PuTTY / Toad / SQL Developer tool connection inspector.
            </p>
          </div>

          <div className="p-4 bg-[#0a0f21] border border-[#1e2a4a] rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300 text-xs font-mono">
              <Shield className="w-4 h-4 text-amber-400" />
              2. Health & Security Reports
            </div>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              <strong>Location:</strong> Side Menu &rarr; <span className="text-amber-300 font-mono">Health & Security Reports</span>
              <br />
              <strong>Contents:</strong> Incident Forensic Inspector, Host & DB Threat Detection, Emergency Defensive Actions (Block IP, Kill Session, Lock Account).
            </p>
          </div>

          <div className="p-4 bg-[#0a0f21] border border-[#1e2a4a] rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-300 text-xs font-mono">
              <Clock className="w-4 h-4 text-emerald-400" />
              3. Global Audit Activity Logs
            </div>
            <p className="text-xs text-slate-400 font-sans leading-relaxed">
              <strong>Location:</strong> Side Menu &rarr; <span className="text-emerald-300 font-mono">Global System Audit Logs</span>
              <br />
              <strong>Contents:</strong> Complete filterable audit trail of every database command, RMAN backup, Data Pump, and node action.
            </p>
          </div>
        </div>
      </div>

      {/* Add IP Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#151821] border border-purple-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-display font-bold text-slate-100">Assign Authorized Client IP</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-xs text-slate-400 hover:text-white uppercase font-mono cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddIpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                  Client IP Address / Subnet (Required):
                </label>
                <input
                  type="text"
                  required
                  value={inputIp}
                  onChange={e => setInputIp(e.target.value)}
                  placeholder="e.g. 192.168.0.177 or 10.0.0.*"
                  className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 focus:border-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                    Host PC Name:
                  </label>
                  <input
                    type="text"
                    value={inputHostName}
                    onChange={e => setInputHostName(e.target.value)}
                    placeholder="e.g. WORKSTATION-DBA-01"
                    className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                    Label / Workstation:
                  </label>
                  <input
                    type="text"
                    value={inputLabel}
                    onChange={e => setInputLabel(e.target.value)}
                    placeholder="e.g. Lead DBA Machine"
                    className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                  Assigned User / Department:
                </label>
                <input
                  type="text"
                  value={inputUser}
                  onChange={e => setInputUser(e.target.value)}
                  placeholder="e.g. mdshamimsheikh553@gmail.com"
                  className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                  Security Notes / Purpose:
                </label>
                <textarea
                  rows={2}
                  value={inputNotes}
                  onChange={e => setInputNotes(e.target.value)}
                  placeholder="e.g. Primary DBA remote access workstation for Oracle RAC maintenance."
                  className="w-full bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-xs font-sans text-slate-200 focus:border-purple-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {submitting ? 'Saving Rule...' : 'Save Allowed IP'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
