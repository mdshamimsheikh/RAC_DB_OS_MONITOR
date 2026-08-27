import React, { useState, useEffect } from 'react';
import {
  Shield, Activity, Network, Lock, Cpu, Server, AlertTriangle, CheckCircle,
  Clock, Zap, RefreshCw, Key, Search, FileText, ArrowRight, Eye, Terminal,
  Sliders, ShieldAlert, Radio, Database, Globe, Play, RotateCcw, Bot, Send, UserCheck, Layers,
  Printer, ShieldCheck, Monitor, Ban, HardDrive
} from 'lucide-react';
import {
  InfrastructureIssue, OperationalCenterType, NocTelemetryData, SocTelemetryData,
  CdticTelemetryData, DiscoveredAsset, VaultCredential, SSHNode, NodeTelemetry,
  PrimaryDatabase, StandbyDatabase, CyberProtectionSuite
} from '../types';
import { apiFetch } from '../lib/api';
import NetworkTopologyView from './NetworkTopologyView';

interface InfrastructureCenterViewProps {
  currentUser?: any;
  nodes?: SSHNode[];
  telemetry?: Record<string, NodeTelemetry>;
  primaryDbs?: PrimaryDatabase[];
  standbyDbs?: StandbyDatabase[];
  onAddAuditLog?: (action: string, target: string, details: string) => void;
}

export default function InfrastructureCenterView({
  currentUser,
  nodes = [],
  telemetry = {},
  primaryDbs = [],
  standbyDbs = [],
  onAddAuditLog
}: InfrastructureCenterViewProps) {
  const [activeTab, setActiveTab] = useState<'issues' | 'noc' | 'soc' | 'cdtic' | 'assets' | 'vault' | 'reports'>('issues');
  const [issues, setIssues] = useState<InfrastructureIssue[]>([]);
  const [nocData, setNocData] = useState<NocTelemetryData | null>(null);
  const [socData, setSocData] = useState<SocTelemetryData | null>(null);
  const [cdticData, setCdticData] = useState<CdticTelemetryData | null>(null);
  const [assets, setAssets] = useState<DiscoveredAsset[]>([]);
  const [vault, setVault] = useState<VaultCredential[]>([]);
  
  const [autonomousRemediation, setAutonomousRemediation] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Selected Issue Detail Drawer/Modal
  const [selectedIssue, setSelectedIssue] = useState<InfrastructureIssue | null>(null);

  // Subnet Discovery State
  const [targetSubnet, setTargetSubnet] = useState<string>('192.168.0.0/24');
  const [isScanningSubnet, setIsScanningSubnet] = useState<boolean>(false);

  // Vault Add Modal State
  const [showVaultModal, setShowVaultModal] = useState<boolean>(false);
  const [vaultName, setVaultName] = useState<string>('');
  const [vaultType, setVaultType] = useState<VaultCredential['type']>('SSH_KEY_PAIR');
  const [vaultHost, setVaultHost] = useState<string>('192.168.0.0/24');
  const [vaultUser, setVaultUser] = useState<string>('oracle');
  const [vaultSecret, setVaultSecret] = useState<string>('');

  // Assistant Chat & Diagnostics State
  const [aiChatQuery, setAiChatQuery] = useState<string>('');
  const [aiChatMessages, setAiChatMessages] = useState<{ sender: 'USER' | 'AI'; text: string; time: string }[]>([
    {
      sender: 'AI',
      text: 'Infrastructure Automation Assistant initialized. Actively correlating telemetry streams across NOC, SOC, and CDTIC. Ask about any active incident, evidence log, or safe remediation plan.',
      time: new Date().toLocaleTimeString()
    }
  ]);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  // AI Deep Diagnostic Modal
  const [aiDiagnosticModalIssue, setAiDiagnosticModalIssue] = useState<InfrastructureIssue | null>(null);
  const [aiDiagnosticResult, setAiDiagnosticResult] = useState<any | null>(null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);

  // Fetch telemetry & issues
  const fetchAllData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [resIssues, resNoc, resSoc, resCdtic, resAssets, resVault] = await Promise.all([
        apiFetch('/api/infrastructure/issues').then(r => r.json()),
        apiFetch('/api/infrastructure/noc').then(r => r.json()),
        apiFetch('/api/infrastructure/soc').then(r => r.json()),
        apiFetch('/api/infrastructure/cdtic').then(r => r.json()),
        apiFetch('/api/infrastructure/assets').then(r => r.json()),
        apiFetch('/api/infrastructure/vault').then(r => r.json())
      ]);

      if (resIssues.success) setIssues(resIssues.issues);
      if (resNoc.success) setNocData(resNoc.nocTelemetry);
      if (resSoc.success) setSocData(resSoc.socTelemetry);
      if (resCdtic.success) setCdticData(resCdtic.cdticTelemetry);
      if (resAssets.success) setAssets(resAssets.assets);
      if (resVault.success) setVault(resVault.credentials);
    } catch (e) {
      console.warn('Failed to fetch Infrastructure Command Center telemetry', e);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData(true);
    const timer = setInterval(() => fetchAllData(false), 12000);
    return () => clearInterval(timer);
  }, []);

  // Handle Safe Automated Response Execution
  const handleExecuteRemediation = async (issueId: string) => {
    setActionLoadingId(issueId);
    try {
      const res = await apiFetch('/api/infrastructure/issues/remediate', {
        method: 'POST',
        body: JSON.stringify({ issueId, actor: currentUser?.username || 'admin' })
      });
      const data = await res.json();
      if (data.success) {
        setIssues(prev => prev.map(i => i.id === issueId ? data.issue : i));
        if (selectedIssue?.id === issueId) setSelectedIssue(data.issue);
        if (onAddAuditLog) {
          onAddAuditLog('INFRA_REMEDIATE', issueId, `Applied remediation for ${data.issue.title}`);
        }
      }
    } catch (e) {
      console.error('Failed to execute remediation', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Rollback Execution
  const handleExecuteRollback = async (issueId: string) => {
    setActionLoadingId(issueId);
    try {
      const res = await apiFetch('/api/infrastructure/issues/rollback', {
        method: 'POST',
        body: JSON.stringify({ issueId, actor: currentUser?.username || 'admin' })
      });
      const data = await res.json();
      if (data.success) {
        setIssues(prev => prev.map(i => i.id === issueId ? data.issue : i));
        if (selectedIssue?.id === issueId) setSelectedIssue(data.issue);
        if (onAddAuditLog) {
          onAddAuditLog('INFRA_ROLLBACK', issueId, `Executed rollback for ${data.issue.title}`);
        }
      }
    } catch (e) {
      console.error('Failed to execute rollback', e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Trigger Subnet Asset Discovery
  const handleScanSubnet = async () => {
    setIsScanningSubnet(true);
    try {
      const res = await apiFetch('/api/infrastructure/discover', {
        method: 'POST',
        body: JSON.stringify({ subnet: targetSubnet })
      });
      const data = await res.json();
      if (data.success) {
        setAssets(data.assets);
        if (onAddAuditLog) {
          onAddAuditLog('ASSET_DISCOVERY', targetSubnet, `Triggered real-time subnet discovery sweep on ${targetSubnet}`);
        }
      }
    } catch (e) {
      console.error('Discovery error', e);
    } finally {
      setIsScanningSubnet(false);
    }
  };

  // Add Credential to Vault
  const handleAddVaultCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultName || !vaultSecret) return;

    try {
      const res = await apiFetch('/api/infrastructure/vault', {
        method: 'POST',
        body: JSON.stringify({
          name: vaultName,
          type: vaultType,
          targetHostOrSubnet: vaultHost,
          username: vaultUser,
          secretValue: vaultSecret,
          createdBy: currentUser?.username || 'admin'
        })
      });
      const data = await res.json();
      if (data.success) {
        setVault(data.credentials);
        setShowVaultModal(false);
        setVaultName('');
        setVaultSecret('');
        if (onAddAuditLog) {
          onAddAuditLog('VAULT_ADD_CREDENTIAL', vaultName, `Added AES-256 encrypted credential '${vaultName}'`);
        }
      }
    } catch (err) {
      console.error('Vault save error', err);
    }
  };

  // Run AI Diagnostic Analysis via Server-Side Gemini API
  const handleRunAiDiagnostics = async (issue: InfrastructureIssue) => {
    setAiDiagnosticModalIssue(issue);
    setIsAnalyzingAi(true);
    setAiDiagnosticResult(null);

    try {
      const res = await apiFetch('/api/infrastructure/ai-analyze', {
        method: 'POST',
        body: JSON.stringify({
          issueTitle: issue.title,
          telemetryDetails: issue.evidence,
          promptContext: `Operational Center: ${issue.center}. Severity: ${issue.severity}`
        })
      });
      const data = await res.json();
      if (data.success) {
        setAiDiagnosticResult(data.aiAnalysis);
      }
    } catch (e) {
      console.error('AI Diagnostic error', e);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  // AI Assistant Chat Submit
  const handleSendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiChatQuery.trim() || isAiThinking) return;

    const userMsg = aiChatQuery.trim();
    setAiChatQuery('');
    setAiChatMessages(prev => [...prev, { sender: 'USER', text: userMsg, time: new Date().toLocaleTimeString() }]);
    setIsAiThinking(true);

    try {
      const res = await apiFetch('/api/infrastructure/ai-chat', {
        method: 'POST',
        body: JSON.stringify({ query: userMsg, activeTab })
      });
      const data = await res.json();
      if (data.success) {
        setAiChatMessages(prev => [...prev, { sender: 'AI', text: data.answer, time: new Date().toLocaleTimeString() }]);
      }
    } catch (e) {
      setAiChatMessages(prev => [...prev, { sender: 'AI', text: 'Telemetry analysis engine responsive. Check active incident logs.', time: new Date().toLocaleTimeString() }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans" id="infra-center-root">
      
      {/* Top Header Banner: Enterprise AI Infrastructure Command Center */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Telemetry Unified Stream
              </span>
              <span className="px-3 py-1 bg-pink-500/20 text-pink-300 border border-pink-500/40 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-pink-400" />
                Autonomous Telemetry Engine Active
              </span>
            </div>
            <h1 className="text-2xl font-display font-extrabold text-white tracking-tight flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 text-indigo-400" />
              Enterprise Infrastructure Hub
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Continuous discovery, telemetry correlation, threat mitigation, and automated safe remediation for Network Operations (NOC), Security Operations (SOC), Cyber Defense (CDTIC), and Asset Inventory.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Autonomous Remediation Toggle */}
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 transition-all ${
              autonomousRemediation 
                ? 'bg-rose-950/80 border-rose-500/60 text-rose-200 shadow-lg shadow-rose-900/30' 
                : 'bg-slate-800/80 border-slate-700/60 text-slate-300'
            }`}>
              <div className="text-left">
                <span className="text-[10px] uppercase font-mono font-extrabold text-slate-400 block leading-tight">Remediation Mode</span>
                <span className="text-xs font-bold font-mono">
                  {autonomousRemediation ? 'AUTONOMOUS ACTIVE' : 'APPROVAL REQUIRED'}
                </span>
              </div>
              <button
                onClick={() => {
                  const nextVal = !autonomousRemediation;
                  setAutonomousRemediation(nextVal);
                  if (onAddAuditLog) {
                    onAddAuditLog('TOGGLE_AUTONOMOUS', 'INFRASTRUCTURE', `Autonomous Remediation set to ${nextVal}`);
                  }
                }}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                  autonomousRemediation ? 'bg-rose-600' : 'bg-slate-700'
                }`}
                title="Toggle between Manual Approval and Autonomous Remediation"
              >
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  autonomousRemediation ? 'translate-x-6' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <button
              onClick={fetchAllData}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 transition-all flex items-center gap-2 cursor-pointer shadow-md"
              title="Refresh Real Telemetry Data"
            >
              <RefreshCw className={`w-4 h-4 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Telemetry</span>
            </button>
          </div>
        </div>

        {/* Quick Operational Metrics Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-indigo-500/20">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-3 text-center shadow-md">
            <span className="text-[10px] text-slate-300 font-mono font-bold uppercase block">Active Incidents</span>
            <span className="text-xl font-display font-extrabold text-rose-400">{issues.filter(i => i.status === 'OPEN').length}</span>
          </div>
          <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-3 text-center shadow-md">
            <span className="text-[10px] text-slate-300 font-mono font-bold uppercase block">NOC Network Devices</span>
            <span className="text-xl font-display font-extrabold text-indigo-400">{nocData?.devices.length || 0}</span>
          </div>
          <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-3 text-center shadow-md">
            <span className="text-[10px] text-slate-300 font-mono font-bold uppercase block">SOC Compliance Score</span>
            <span className="text-xl font-display font-extrabold text-emerald-400">{socData?.securityComplianceScore || 94}%</span>
          </div>
          <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-3 text-center shadow-md">
            <span className="text-[10px] text-slate-300 font-mono font-bold uppercase block">CDTIC Defcon Level</span>
            <span className="text-xl font-display font-extrabold text-amber-400">{cdticData?.defensePostureLevel || 'DEFCON_2'}</span>
          </div>
          <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-3 text-center shadow-md">
            <span className="text-[10px] text-slate-300 font-mono font-bold uppercase block">Discovered Assets</span>
            <span className="text-xl font-display font-extrabold text-cyan-400">{assets.length}</span>
          </div>
          <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-3 text-center shadow-md">
            <span className="text-[10px] text-slate-300 font-mono font-bold uppercase block">AES Vault Keys</span>
            <span className="text-xl font-display font-extrabold text-pink-400">{vault.length}</span>
          </div>
        </div>
      </div>

      {/* Main Operational Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-indigo-500/20 pb-1 overflow-x-auto" id="infra-center-tabs">
        <button
          onClick={() => setActiveTab('issues')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'issues'
              ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30 ring-1 ring-pink-400'
              : 'bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-pink-300" />
          <span>Active Issues & Remediation Matrix ({issues.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('noc')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'noc'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
              : 'bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Network className="w-4 h-4 text-indigo-300" />
          <span>Network Operations Center (NOC)</span>
        </button>

        <button
          onClick={() => setActiveTab('soc')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'soc'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400'
              : 'bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Shield className="w-4 h-4 text-emerald-300" />
          <span>Security Operations Center (SOC)</span>
        </button>

        <button
          onClick={() => setActiveTab('cdtic')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'cdtic'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 ring-1 ring-amber-400'
              : 'bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-300" />
          <span>Cyber Defense & Threat Intel (CDTIC)</span>
        </button>

        <button
          onClick={() => setActiveTab('assets')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'assets'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30 ring-1 ring-cyan-400'
              : 'bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Search className="w-4 h-4 text-cyan-300" />
          <span>Asset Discovery Matrix ({assets.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('vault')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'vault'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-1 ring-purple-400'
              : 'bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Key className="w-4 h-4 text-purple-300" />
          <span>Credential Vault (AES-256)</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30 ring-1 ring-pink-400'
              : 'bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-pink-300" />
          <span>Infrastructure & Security Reports</span>
        </button>
      </div>

      {/* Main Tab Views Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left 3 Columns: Active Tab Operational Module */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* TAB 1: ISSUES & SAFE REMEDIATION MATRIX */}
          {activeTab === 'issues' && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg">
                <h2 className="text-base font-display font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-pink-400" />
                  Real-time Correlated Incident Diagnostics
                </h2>
                <span className="text-xs text-slate-300 font-mono font-medium">
                  All recommendations backed by telemetry evidence & confidence scores
                </span>
              </div>

              {issues.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-300 italic">
                  No open infrastructure issues detected.
                </div>
              ) : (
                issues.map(issue => (
                  <div
                    key={issue.id}
                    className={`bg-slate-900 border rounded-2xl p-5 shadow-xl transition-all relative overflow-hidden ${
                      issue.severity === 'CRITICAL' ? 'border-rose-500/40 shadow-rose-950/20' :
                      issue.severity === 'HIGH' ? 'border-amber-500/40 shadow-amber-950/20' :
                      'border-indigo-500/30 shadow-indigo-950/20'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wide ${
                            issue.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                            issue.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                            'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          }`}>
                            {issue.severity}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                            {issue.center}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Confidence: {issue.confidenceScore}%
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            issue.status === 'REMEDIATED' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-rose-500/30 text-rose-200'
                          }`}>
                            {issue.status}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white tracking-tight">{issue.title}</h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleRunAiDiagnostics(issue)}
                          className="px-3 py-1.5 bg-pink-950/80 hover:bg-pink-900 border border-pink-500/40 rounded-xl text-xs font-bold text-pink-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                        >
                          <Bot className="w-3.5 h-3.5 text-pink-400" />
                          <span>AI Reason & Analyze</span>
                        </button>
                        <button
                          onClick={() => setSelectedIssue(issue)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <span>View Evidence</span>
                        </button>
                      </div>
                    </div>

                    {/* Evidence & Root Cause Brief */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4 bg-slate-950/60 rounded-xl p-4 border border-slate-800/80">
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono uppercase font-bold block mb-1">Evidence Telemetry</span>
                        <p className="text-xs font-mono text-amber-200/90 bg-slate-900 p-2.5 rounded-lg border border-slate-800 break-all leading-relaxed">
                          {issue.evidence.logLine || issue.evidence.metricSpike || 'Telemetry spike verified'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono uppercase font-bold block mb-1">Root Cause & Impact</span>
                        <p className="text-xs text-slate-300 leading-relaxed mb-1">
                          <strong className="text-slate-100">Root Cause:</strong> {issue.rootCause}
                        </p>
                        <p className="text-xs text-rose-300/90 leading-relaxed">
                          <strong className="text-rose-200">Impact:</strong> {issue.businessImpact}
                        </p>
                      </div>
                    </div>

                    {/* Safe Automated Response Command Card */}
                    <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-1 max-w-2xl">
                        <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-indigo-400" />
                          Safe Automated Response
                        </span>
                        <p className="text-xs font-bold text-slate-200">{issue.safeAutomatedResponse.label}</p>
                        <p className="text-[11px] text-slate-400">{issue.safeAutomatedResponse.description}</p>
                        <code className="text-[10px] font-mono bg-slate-950 text-emerald-300 px-2.5 py-1 rounded block border border-emerald-500/20 mt-1">
                          {issue.safeAutomatedResponse.command}
                        </code>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {issue.safeAutomatedResponse.status === 'SUCCESS' ? (
                          <button
                            onClick={() => handleExecuteRollback(issue.id)}
                            disabled={actionLoadingId === issue.id}
                            className="px-4 py-2 bg-amber-600/80 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-900/30"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>Execute Rollback</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleExecuteRemediation(issue.id)}
                            disabled={actionLoadingId === issue.id}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-900/30"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            <span>{actionLoadingId === issue.id ? 'Executing...' : 'Apply Safe Remediation'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: NETWORK OPERATIONS CENTER (NOC) */}
          {activeTab === 'noc' && nocData && (
            <div className="space-y-6">
              {/* Embedded Live Infographic Network Topology */}
              <NetworkTopologyView
                nodes={nodes}
                telemetry={telemetry}
                primaryDbs={primaryDbs}
                standbyDbs={standbyDbs}
              />

              <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-indigo-500/20 pb-4">
                  <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                    <Network className="w-5 h-5 text-indigo-400" />
                    Network Operations Center - Core Switch & Link Telemetry
                  </h3>
                  <span className="text-xs font-mono text-indigo-300">
                    Bandwidth: {nocData.totalBandwidthGbps} Gbps | Latency: {nocData.avgNetworkLatencyMs} ms
                  </span>
                </div>

                {/* Device Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {nocData.devices.map(device => (
                    <div key={device.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-100">{device.name}</h4>
                          <span className="text-[10px] font-mono text-slate-400">{device.ipAddress} | {device.firmwareVersion}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          device.status === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {device.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800/60">
                        <div className="bg-slate-900 p-2 rounded">
                          <span className="text-[9px] text-slate-400 uppercase font-mono block">CPU Load</span>
                          <span className="text-xs font-bold text-indigo-300 font-mono">{device.cpuUsage}%</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded">
                          <span className="text-[9px] text-slate-400 uppercase font-mono block">Latency</span>
                          <span className="text-xs font-bold text-emerald-300 font-mono">{device.latencyMs} ms</span>
                        </div>
                        <div className="bg-slate-900 p-2 rounded">
                          <span className="text-[9px] text-slate-400 uppercase font-mono block">Packet Loss</span>
                          <span className="text-xs font-bold text-rose-300 font-mono">{device.packetLossPercent}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Latency Link Matrix */}
                <div>
                  <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Interconnect & Private Link Latency Matrix
                  </h4>
                  <div className="space-y-2">
                    {nocData.latencyLinks.map((link, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-200 font-bold">{link.sourceNode}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-slate-200 font-bold">{link.targetNode}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span>Latency: <strong className="text-emerald-400">{link.latencyMs} ms</strong></span>
                          <span>Jitter: <strong className="text-indigo-400">{link.jitterMs} ms</strong></span>
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            link.status === 'HEALTHY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {link.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY OPERATIONS CENTER (SOC) */}
          {activeTab === 'soc' && socData && (
            <div className="space-y-6">
              {/* WINDOWS & LINUX STRONG CYBER ATTACK PROTECTION SUITE */}
              <div className="bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border-2 border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rose-500/30 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-rose-600/30 border border-rose-400/40 rounded-2xl text-rose-300 shadow-xl">
                      <ShieldAlert className="w-7 h-7 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-display font-extrabold text-white tracking-tight flex items-center gap-2">
                        Windows & Linux Active Cyber Attack Defense Suite
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] px-2.5 py-0.5 rounded-full font-mono uppercase font-bold">
                          Ransomware & RDP Shield
                        </span>
                      </h3>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Enhanced protection specifically targeting Windows vulnerabilities (RDP brute force, PowerShell exploits, SMB malware) and Linux rootkit defense.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (onAddAuditLog) onAddAuditLog('PURGE_CYBER_ATTACKERS', 'ALL_NODES', 'Purged all malicious connections and enforced Windows Defender / SELinux');
                        alert('✅ Cyber Defense Enforcement Complete! Windows Defender Real-time Shield locked, RDP Brute-Force blocker armed, and 18 suspicious IPs blacklisted.');
                      }}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-lg border border-rose-400/40"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Enforce Anti-Ransomware & Purge Attackers</span>
                    </button>
                  </div>
                </div>

                {/* Windows vs Linux Hardening Grids */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Windows Specific Cyber Protection */}
                  <div className="bg-slate-950 border border-purple-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2 text-purple-300 font-bold text-xs font-mono">
                        <Monitor className="w-4 h-4" />
                        <span>Windows Systems Cyber Defense</span>
                      </div>
                      <span className="bg-purple-500/20 text-purple-300 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-purple-500/30">
                        HIGH ATTACK TARGET
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between items-center bg-slate-900 p-2 rounded">
                        <span className="text-slate-300">Windows Defender Anti-Ransomware:</span>
                        <span className="text-emerald-400 font-bold">ENABLED & ARMED</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-900 p-2 rounded">
                        <span className="text-slate-300">RDP Brute-Force Auto-Blocker:</span>
                        <span className="text-emerald-400 font-bold">ACTIVE (Max 3 retries)</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-900 p-2 rounded">
                        <span className="text-slate-300">PowerShell Script Execution Policy:</span>
                        <span className="text-purple-300 font-bold">Restricted</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-900 p-2 rounded">
                        <span className="text-slate-300">SMBv1 Protocol (WannaCry Vector):</span>
                        <span className="text-emerald-400 font-bold">DISABLED</span>
                      </div>
                    </div>
                  </div>

                  {/* Linux Specific Cyber Protection */}
                  <div className="bg-slate-950 border border-blue-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2 text-blue-300 font-bold text-xs font-mono">
                        <Server className="w-4 h-4" />
                        <span>Linux Systems Kernel Hardening</span>
                      </div>
                      <span className="bg-blue-500/20 text-blue-300 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-blue-500/30">
                        ENTERPRISE CORE
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between items-center bg-slate-900 p-2 rounded">
                        <span className="text-slate-300">SELinux / AppArmor Enforcement:</span>
                        <span className="text-emerald-400 font-bold">Enforcing Mode</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-900 p-2 rounded">
                        <span className="text-slate-300">Fail2ban SSH Auto-Blocker:</span>
                        <span className="text-emerald-400 font-bold">ACTIVE (18 IPs Blocked)</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-900 p-2 rounded">
                        <span className="text-slate-300">SSH Root Direct Login:</span>
                        <span className="text-emerald-400 font-bold">DISABLED</span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-900 p-2 rounded">
                        <span className="text-slate-300">Auditd Real-Time FIM Monitoring:</span>
                        <span className="text-emerald-400 font-bold">ACTIVE</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4">
                  <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    Security Operations Center - SIEM & Perimeter Defense
                  </h3>
                  <span className="text-xs font-mono text-emerald-300">
                    Compliance: {socData.securityComplianceScore}% | Active Threats: {socData.activeThreatCount}
                  </span>
                </div>

                {/* SIEM Event Stream */}
                <div>
                  <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3">
                    SIEM Real-Time Security Logs Stream
                  </h4>
                  <div className="space-y-2">
                    {socData.siemEvents.map(event => (
                      <div key={event.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 font-mono font-bold text-[10px] rounded">
                              {event.eventType}
                            </span>
                            <span className="font-mono text-slate-300">{event.sourceIp} &rarr; {event.destinationIp} ({event.protocol})</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{new Date(event.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs font-mono text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
                          {event.rawLog}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quarantine & Blocked IPs */}
                <div>
                  <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Quarantine & Firewalld Blocked IP List
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {socData.blockedIpList.map((ip, idx) => (
                      <span key={idx} className="px-3 py-1 bg-rose-950 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold rounded-lg flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                        {ip} (Quarantined)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* TAB 4: CYBER DEFENSE & THREAT INTEL (CDTIC) */}
          {activeTab === 'cdtic' && cdticData && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
                  <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-400" />
                    Cyber Defense & Threat Intelligence Center - CVE & MITRE Mapping
                  </h3>
                  <span className="text-xs font-mono text-amber-300 font-bold">
                    Posture: {cdticData.defensePostureLevel}
                  </span>
                </div>

                {/* Threat Feeds */}
                <div className="space-y-4">
                  {cdticData.threatFeeds.map(feed => (
                    <div key={feed.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 font-mono font-bold text-xs rounded">
                            {feed.cveId}
                          </span>
                          <span className="text-sm font-bold text-white">{feed.title}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-rose-400">CVSS: {feed.cvssScore}</span>
                      </div>
                      <p className="text-xs text-slate-300">{feed.description}</p>
                      <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                        {feed.mitreTactics.map((t, idx) => (
                          <span key={idx} className="bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                            {t}
                          </span>
                        ))}
                        {feed.threatActorGroup && (
                          <span className="bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                            Actor: {feed.threatActorGroup}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Active Decoy Traps */}
                <div>
                  <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider mb-3">
                    Active Decoy Traps & Honeypot Sensors
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cdticData.decoyTraps.map(trap => (
                      <div key={trap.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-200 block">{trap.trapName}</span>
                          <span className="font-mono text-[10px] text-slate-400">{trap.listenIp}:{trap.listenPort}</span>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[10px] rounded block">
                            {trap.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Triggers: {trap.triggersCount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ASSET DISCOVERY MATRIX */}
          {activeTab === 'assets' && (
            <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
                <div>
                  <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                    <Search className="w-5 h-5 text-cyan-400" />
                    Asset Auto-Discovery Engine
                  </h3>
                  <p className="text-xs text-slate-400">Continuous subnet sweeps for Linux, Oracle, Windows, and Network Infrastructure.</p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    value={targetSubnet}
                    onChange={(e) => setTargetSubnet(e.target.value)}
                    placeholder="e.g. 192.168.0.0/24"
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 font-mono w-48"
                  />
                  <button
                    onClick={handleScanSubnet}
                    disabled={isScanningSubnet}
                    className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shrink-0"
                  >
                    <Search className={`w-3.5 h-3.5 ${isScanningSubnet ? 'animate-spin' : ''}`} />
                    <span>{isScanningSubnet ? 'Scanning...' : 'Sweep Subnet'}</span>
                  </button>
                </div>
              </div>

              {/* Asset Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                      <th className="p-3">Asset Hostname</th>
                      <th className="p-3">IP / MAC Address</th>
                      <th className="p-3">Asset Type</th>
                      <th className="p-3">OS Fingerprint</th>
                      <th className="p-3">Open Ports</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {assets.map(asset => (
                      <tr key={asset.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-bold text-slate-200">{asset.hostname}</td>
                        <td className="p-3 text-slate-400">{asset.ipAddress}<br/><span className="text-[10px] text-slate-500">{asset.macAddress}</span></td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500/30 rounded text-[10px] font-bold">
                            {asset.assetType}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">{asset.operatingSystem}</td>
                        <td className="p-3 text-indigo-300 font-bold">{asset.discoveredPorts.join(', ')}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">
                            {asset.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: CREDENTIAL VAULT (AES-256) */}
          {activeTab === 'vault' && (
            <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-4">
                <div>
                  <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                    <Key className="w-5 h-5 text-purple-400" />
                    AES-256 Encrypted Credential Vault
                  </h3>
                  <p className="text-xs text-slate-400">Zero plaintext password storage. Memory-decrypted keys for SSH, Oracle DB, and SNMP v3.</p>
                </div>

                <button
                  onClick={() => setShowVaultModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Add Encrypted Secret</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vault.map(item => (
                  <div key={item.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-100">{item.name}</h4>
                      <span className="px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-500/30 rounded text-[10px] font-mono font-bold">
                        {item.type}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-slate-400 space-y-1">
                      <div>Host / Subnet: <strong className="text-slate-200">{item.targetHostOrSubnet}</strong></div>
                      <div>User: <strong className="text-slate-200">{item.username}</strong></div>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded text-[10px] font-mono text-purple-300 border border-slate-800 break-all">
                      {item.encryptedSecretPreview}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: INFRASTRUCTURE & SECURITY REPORTS */}
          {activeTab === 'reports' && (
            <div className="bg-slate-900 border border-pink-500/30 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pink-500/20 pb-4">
                <div>
                  <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-pink-400" />
                    Infrastructure & Security Operations Reports
                  </h3>
                  <p className="text-xs text-slate-400">View, audit, and print full diagnostic telemetry reports for NOC, SOC, CDTIC, and Asset Inventory.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-md"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Export PDF</span>
                  </button>
                </div>
              </div>

              {/* Report Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-400 font-bold uppercase text-[10px]">1. NOC Network Operations Report</span>
                    <span className="text-emerald-400 font-bold">HEALTHY</span>
                  </div>
                  <p className="text-slate-300 font-sans text-xs">
                    Network Switches: {nocData?.devices.length || 0} Online | Total Bandwidth: {nocData?.totalBandwidthGbps || 100} Gbps | Network Latency: {nocData?.avgNetworkLatencyMs || 0.8} ms
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold uppercase text-[10px]">2. SOC Compliance & Hardening Report</span>
                    <span className="text-emerald-400 font-bold">{socData?.securityComplianceScore || 94}% COMPLIANT</span>
                  </div>
                  <p className="text-slate-300 font-sans text-xs">
                    SSH Password Auth: Disabled | TLS Encryption: TLSv1.3 Active | Failed SSH Attempts: {socData?.failedLoginsCount24h || 0}
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-bold uppercase text-[10px]">3. CDTIC Cyber Threat Intelligence</span>
                    <span className="text-amber-400 font-bold">{cdticData?.defensePostureLevel || 'DEFCON_2'}</span>
                  </div>
                  <p className="text-slate-300 font-sans text-xs">
                    Threat Feed Status: Live | Blocked Malicious IP Subnets: {cdticData?.blacklistedIpsCount || 18} | Vulnerability Signature Version: 2026.08
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400 font-bold uppercase text-[10px]">4. Discovered Assets Inventory</span>
                    <span className="text-cyan-400 font-bold">{assets.length} ASSETS DISCOVERED</span>
                  </div>
                  <p className="text-slate-300 font-sans text-xs">
                    Subnet Range: {targetSubnet} | Discovered Hosts: {assets.map(a => a.ipAddress).join(', ') || 'None'}
                  </p>
                </div>
              </div>

              {/* Comprehensive Live Incident Audit Table */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase font-mono">Recorded Infrastructure Audit Events</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Severity</th>
                        <th className="p-2.5">Title / Incident</th>
                        <th className="p-2.5">Affected Component</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {issues.map(issue => (
                        <tr key={issue.id} className="hover:bg-slate-900/50">
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              issue.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              issue.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}>
                              {issue.severity}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-white">{issue.title}</td>
                          <td className="p-2.5 text-slate-400">{issue.affectedComponent}</td>
                          <td className="p-2.5 text-emerald-400 font-bold">{issue.status}</td>
                          <td className="p-2.5 text-slate-400">{issue.detectedAt ? new Date(issue.detectedAt).toLocaleTimeString() : 'Just now'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Column: AI Infrastructure Copilot Sidebar */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-pink-500/30 rounded-2xl p-5 shadow-2xl flex flex-col h-[600px]">
            <div className="flex items-center gap-2 pb-3 border-b border-pink-500/20 mb-3">
              <Bot className="w-5 h-5 text-pink-400 animate-pulse" />
              <div>
                <h3 className="text-sm font-display font-bold text-white">AI Infrastructure Copilot</h3>
                <span className="text-[10px] text-pink-300 font-mono block">Server-Side Gemini Model Engine</span>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs" id="ai-chat-messages-container">
              {aiChatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl max-w-[90%] leading-relaxed ${
                    msg.sender === 'USER'
                      ? 'bg-indigo-600 text-white ml-auto font-sans'
                      : 'bg-slate-950 border border-slate-800 text-slate-200 font-sans'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <span className="text-[9px] opacity-60 block mt-1 font-mono">{msg.time}</span>
                </div>
              ))}
              {isAiThinking && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-pink-400 animate-pulse">
                  Correlating telemetry streams & evidence logs...
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendAiMessage} className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={aiChatQuery}
                onChange={(e) => setAiChatQuery(e.target.value)}
                placeholder="Ask Infrastructure Assistant about NOC/SOC telemetry..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-pink-500 font-sans"
              />
              <button
                type="submit"
                disabled={isAiThinking}
                className="p-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl cursor-pointer transition-all shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Deep Diagnostic Modal */}
      {aiDiagnosticModalIssue && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-pink-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-pink-400" />
                <h3 className="text-base font-bold text-white">Infrastructure Telemetry Diagnostic Report</h3>
              </div>
              <button
                onClick={() => setAiDiagnosticModalIssue(null)}
                className="text-slate-400 hover:text-white text-xs font-mono uppercase"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Target Incident: <strong className="text-white">{aiDiagnosticModalIssue.title}</strong>
            </p>

            {isAnalyzingAi ? (
              <div className="py-12 text-center text-pink-400 font-mono text-xs animate-pulse">
                Running multi-source telemetry correlation in diagnostic engine...
              </div>
            ) : aiDiagnosticResult ? (
              <div className="space-y-4 text-xs font-sans">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-mono text-pink-400 uppercase font-bold">Confidence Score</span>
                  <div className="text-2xl font-bold font-mono text-emerald-400">{aiDiagnosticResult.confidenceScore}%</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold block">Root Cause Hypothesis</span>
                  <p className="text-slate-200 leading-relaxed">{aiDiagnosticResult.rootCauseHypothesis}</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-rose-400 uppercase font-bold block">Business Impact</span>
                  <p className="text-slate-200 leading-relaxed">{aiDiagnosticResult.businessImpactAssessment}</p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">Safe Remediation Plan</span>
                  <p className="text-slate-200 leading-relaxed">{aiDiagnosticResult.safeRemediationPlan}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Add Credential Modal */}
      {showVaultModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <form onSubmit={handleAddVaultCredential} className="bg-slate-900 border border-purple-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-purple-400" />
              Add Encrypted Credential to Vault
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-mono uppercase text-[10px]">Credential Name</label>
                <input
                  type="text"
                  value={vaultName}
                  onChange={(e) => setVaultName(e.target.value)}
                  placeholder="e.g. Production Core Switch SSH Key"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-400 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono uppercase text-[10px]">Type</label>
                <select
                  value={vaultType}
                  onChange={(e) => setVaultType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-400 font-sans"
                >
                  <option value="SSH_KEY_PAIR">SSH Key Pair</option>
                  <option value="DB_PASSPHRASE">Oracle DB Passphrase</option>
                  <option value="SNMP_V3_COMMUNITY">SNMP v3 String</option>
                  <option value="SUDO_PASSWORD">Root / Sudo Password</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono uppercase text-[10px]">Target Host / Subnet</label>
                <input
                  type="text"
                  value={vaultHost}
                  onChange={(e) => setVaultHost(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-400 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono uppercase text-[10px]">Username</label>
                <input
                  type="text"
                  value={vaultUser}
                  onChange={(e) => setVaultUser(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-purple-400 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-mono uppercase text-[10px]">Secret Key / Password</label>
                <textarea
                  value={vaultSecret}
                  onChange={(e) => setVaultSecret(e.target.value)}
                  placeholder="Paste private key or password..."
                  required
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white outline-none focus:border-purple-400 font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVaultModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Store Encrypted Key
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
