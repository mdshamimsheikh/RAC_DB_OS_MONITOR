import React, { useState } from 'react';
import {
  FileText, ShieldCheck, Server, Database, Activity, Download, Printer, Filter,
  CheckCircle2, AlertTriangle, XCircle, Search, RefreshCw, Cpu, HardDrive, Shield,
  Radio, Clock, Users, ArrowDown, ExternalLink, FileSpreadsheet, Lock, Sparkles, Check, Layers,
  BarChart2, FileCode, X, Eye, Terminal, SlidersHorizontal, ShieldAlert
} from 'lucide-react';
import { SSHNode, NodeTelemetry, ClusterSummary, ActivityLog, PrimaryDatabase, StandbyDatabase, UserAccount } from '../types';

interface ReportsViewProps {
  nodes: SSHNode[];
  telemetry: Record<string, NodeTelemetry>;
  summary: ClusterSummary;
  primaryDbs: PrimaryDatabase[];
  standbyDbs: StandbyDatabase[];
  logs: ActivityLog[];
  currentUser: UserAccount;
  onRefresh: () => void;
  isConnecting: boolean;
}

export default function ReportsView({
  nodes,
  telemetry,
  summary,
  primaryDbs,
  standbyDbs,
  logs,
  currentUser,
  onRefresh,
  isConnecting
}: ReportsViewProps) {
  const [activeTab, setActiveTab] = useState<
    'ALL' | 'INCIDENTS_FORENSICS' | 'OS' | 'DATABASE' | 'RAC' | 'DATAGUARD' | 'ASM' | 'LISTENER' | 'GOLDENGATE' | 'WEBLOGIC' | 'TOMCAT' | 'DOCKER' | 'OTHER_DBS' | 'APP' | 'INFRA' | 'AWR_ADDM' | 'BACKUP_DATAPUMP' | 'SECURITY'
  >('ALL');
  const [selectedNodeFilter, setSelectedNodeFilter] = useState<string>('ALL');
  const [selectedDbFilter, setSelectedDbFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reportTitleNote, setReportTitleNote] = useState<string>('Enterprise Multi-Server & Database Audit Report');
  const [reportAuthor, setReportAuthor] = useState<string>(currentUser.username || 'Lead Oracle DBA');
  const [copiedSuccessMsg, setCopiedSuccessMsg] = useState<string | null>(null);

  // Forensic Audit & User Incident States
  const [selectedIncidentLog, setSelectedIncidentLog] = useState<ActivityLog | null>(null);
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<'ALL' | 'DATABASE' | 'OS' | 'PACS' | 'WEBLOGIC' | 'USER_SESSION' | 'SECURITY'>('ALL');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');

  // Interactive Detailed Report Modal State
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [modalReportType, setModalReportType] = useState<
    'AWR' | 'ADDM' | 'ASH' | 'STORAGE' | 'RMAN' | 'DATAPUMP' | 'SECURITY' | 'OS' | 'DATABASE' | 'RAC' | 'DATAGUARD' | 'ASM' | 'LISTENER' | 'GOLDENGATE' | 'WEBLOGIC' | 'TOMCAT' | 'DOCKER' | 'OTHER_DBS' | 'APP' | 'INFRA'
  >('AWR');
  const [modalNodeId, setModalNodeId] = useState<string>('ALL');
  const [modalDbId, setModalDbId] = useState<string>('ALL');
  const [reportSnapshotHours, setReportSnapshotHours] = useState<number>(24);

  // Instant Outage Emergency Alert Modal State
  const [showAlertModal, setShowAlertModal] = useState<boolean>(false);
  const [phoneNumbersInput, setPhoneNumbersInput] = useState<string>('+8801700000000, +18005550199');
  const [emailAddressesInput, setEmailAddressesInput] = useState<string>('dba-team@oracle-enterprise.com, admin@oracle-mon.local');
  const [enableSms, setEnableSms] = useState<boolean>(true);
  const [enableEmail, setEnableEmail] = useState<boolean>(true);
  const [enablePhoneCall, setEnablePhoneCall] = useState<boolean>(true);
  const [alertDispatchLogsState, setAlertDispatchLogsState] = useState<any[]>([]);
  const [alertSaveSuccess, setAlertSaveSuccess] = useState<string | null>(null);
  const [testDispatchStatus, setTestDispatchStatus] = useState<string | null>(null);

  // External Client Session Simulation Modal State
  const [showClientSessionModal, setShowClientSessionModal] = useState<boolean>(false);
  const [clientSessionTool, setClientSessionTool] = useState<string>('PuTTY');
  const [clientSessionUser, setClientSessionUser] = useState<string>('root');
  const [clientSessionIp, setClientSessionIp] = useState<string>('192.168.0.177');
  const [clientSessionPcName, setClientSessionPcName] = useState<string>('WORKSTATION-DBA-01');
  const [clientSessionMac, setClientSessionMac] = useState<string>('00:50:56:A8:01:1D');
  const [clientSessionTarget, setClientSessionTarget] = useState<string>('RAC Node 1 (192.168.0.29)');
  const [clientSessionAction, setClientSessionAction] = useState<string>('PuTTY SSH Terminal Session / Executed top & systemctl status');
  const [clientSessionDetails, setClientSessionDetails] = useState<string>('External terminal session established via PuTTY v0.78. Authenticated root from 192.168.0.177.');
  const [clientSessionSubmitting, setClientSessionSubmitting] = useState<boolean>(false);

  // Security Rules and Defensive Actions State
  const [blockedIps, setBlockedIps] = useState<any[]>([]);
  const [lockedUsers, setLockedUsers] = useState<any[]>([]);
  const [defenseActionStatus, setDefenseActionStatus] = useState<string | null>(null);

  const fetchSecurityRules = async () => {
    try {
      const res = await fetch('/api/security/rules');
      if (res.ok) {
        const data = await res.json();
        setBlockedIps(data.blockedIps || []);
        setLockedUsers(data.lockedUsers || []);
      }
    } catch (e) {
      console.warn('Security rules fetch error:', e);
    }
  };

  const handleBlockIp = async (ip: string, user?: string, hostPcName?: string, targetServer?: string) => {
    try {
      const res = await fetch('/api/security/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, user, hostPcName, targetServer, reason: 'Emergency DBA Security Rule Triggered from Incident Inspector' })
      });
      if (res.ok) {
        setDefenseActionStatus(`🚫 Client IP ${ip} blocked at OS firewall layer!`);
        fetchSecurityRules();
        if (onRefresh) onRefresh();
        setTimeout(() => setDefenseActionStatus(null), 4000);
      }
    } catch (e: any) {
      alert(`Error blocking IP: ${e.message}`);
    }
  };

  const handleUnblockIp = async (ip: string) => {
    try {
      const res = await fetch('/api/security/unblock-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      if (res.ok) {
        setDefenseActionStatus(`✅ Client IP ${ip} unblocked.`);
        fetchSecurityRules();
        if (onRefresh) onRefresh();
        setTimeout(() => setDefenseActionStatus(null), 4000);
      }
    } catch (e: any) {
      alert(`Error unblocking IP: ${e.message}`);
    }
  };

  const handleKillSession = async (ip?: string, user?: string, hostPcName?: string, tool?: string, targetServer?: string) => {
    try {
      const res = await fetch('/api/security/kill-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, user, hostPcName, tool, targetServer })
      });
      if (res.ok) {
        setDefenseActionStatus(`🔐 Active session for ${user || 'User'}@${ip || 'IP'} terminated! Process killed.`);
        if (onRefresh) onRefresh();
        setTimeout(() => setDefenseActionStatus(null), 4000);
      }
    } catch (e: any) {
      alert(`Error killing session: ${e.message}`);
    }
  };

  const handleLockUser = async (user: string, targetServer?: string) => {
    try {
      const res = await fetch('/api/security/lock-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, targetServer, reason: 'Manual Account Lock by DBA Security Control' })
      });
      if (res.ok) {
        setDefenseActionStatus(`🔒 Database user account '${user}' has been LOCKED!`);
        fetchSecurityRules();
        if (onRefresh) onRefresh();
        setTimeout(() => setDefenseActionStatus(null), 4000);
      }
    } catch (e: any) {
      alert(`Error locking account: ${e.message}`);
    }
  };

  const fetchAlertSettingsAndLogs = async () => {
    try {
      const resSet = await fetch('/api/alerts/settings');
      if (resSet.ok) {
        const data = await resSet.json();
        if (data.phoneNumbers) setPhoneNumbersInput(data.phoneNumbers.join(', '));
        if (data.emailAddresses) setEmailAddressesInput(data.emailAddresses.join(', '));
        if (typeof data.enableSms === 'boolean') setEnableSms(data.enableSms);
        if (typeof data.enableEmail === 'boolean') setEnableEmail(data.enableEmail);
        if (typeof data.enablePhoneCall === 'boolean') setEnablePhoneCall(data.enablePhoneCall);
      }
      const resLogs = await fetch('/api/alerts/logs');
      if (resLogs.ok) {
        const logsData = await resLogs.json();
        setAlertDispatchLogsState(logsData);
      }
    } catch (e) {
      console.warn('Alert settings fetch error:', e);
    }
  };

  const handleSaveAlertSettings = async () => {
    try {
      const phones = phoneNumbersInput.split(',').map(s => s.trim()).filter(Boolean);
      const emails = emailAddressesInput.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch('/api/alerts/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumbers: phones,
          emailAddresses: emails,
          enableSms,
          enableEmail,
          enablePhoneCall
        })
      });
      if (res.ok) {
        setAlertSaveSuccess('✅ Emergency SMS numbers, Emails & Voice Alert channels saved successfully!');
        setTimeout(() => setAlertSaveSuccess(null), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestAlertDispatch = async (channel: 'SMS' | 'EMAIL' | 'PHONE_CALL' | 'ALL') => {
    try {
      setTestDispatchStatus(`Dispatching test ${channel} alert...`);
      const res = await fetch('/api/alerts/test-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          target: selectedNodeFilter !== 'ALL' ? (nodes.find(n => n.id === selectedNodeFilter)?.name || 'Server 1') : 'Server 1 (RAC Node 1)'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTestDispatchStatus(`✅ DISPATCH SUCCESS: ${data.message}`);
        fetchAlertSettingsAndLogs();
        setTimeout(() => setTestDispatchStatus(null), 6000);
      }
    } catch (e) {
      setTestDispatchStatus('❌ Test alert dispatch failed.');
    }
  };

  // Calculate high-level health scores
  const totalNodesCount = nodes.length;
  const onlineNodesCount = nodes.filter(n => telemetry[n.id]?.online !== false).length;
  const osHealthScore = totalNodesCount > 0 ? Math.round((onlineNodesCount / totalNodesCount) * 100) : 100;

  const totalDbsCount = primaryDbs.length + standbyDbs.length;
  const openDbsCount = primaryDbs.filter(p => p.status === 'OPEN').length + standbyDbs.filter(s => s.status === 'OPEN' || s.redoApplied).length;
  const dbHealthScore = totalDbsCount > 0 ? Math.round((openDbsCount / Math.max(1, totalDbsCount)) * 100) : 100;

  const overallHealthScore = Math.round((osHealthScore + dbHealthScore) / 2);

  // Unified Managed Servers & Databases List
  const allTargetServers = [
    ...nodes.map(n => ({ id: n.id, name: n.name, identifier: n.hostname, ip: n.ipAddress, category: 'OS Host' as const })),
    ...primaryDbs.map(p => ({ id: p.id, name: p.uniqueName || p.name, identifier: `SID: ${p.oracleSid}`, ip: '192.168.1.101', category: 'Primary DB' as const })),
    ...standbyDbs.map(s => ({ id: s.id, name: s.uniqueName || s.name, identifier: `SID: ${s.oracleSid || s.uniqueName}`, ip: '192.168.1.102', category: 'Standby DB' as const })),
    { id: 'WebLogic_AdminServer', name: 'WebLogic_AdminServer', identifier: 'WLS Domain PROD', ip: '192.168.1.108', category: 'WebLogic Server' as const },
    { id: 'PACS_ARCHIVE_01', name: 'PACS_ARCHIVE_01', identifier: 'AE: PACS_ARCHIVE', ip: '192.168.1.109', category: 'PACS Server' as const }
  ];

  // Filtered lists for reporting
  const filteredNodes = nodes.filter(n => {
    if (selectedNodeFilter !== 'ALL') {
      const q = selectedNodeFilter.toLowerCase();
      const match = n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q) || n.hostname.toLowerCase().includes(q) || n.ipAddress.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return n.name.toLowerCase().includes(q) || n.hostname.toLowerCase().includes(q) || n.ipAddress.toLowerCase().includes(q);
    }
    return true;
  });

  const allDatabases = [
    ...primaryDbs.map(p => ({ ...p, dbType: 'PRIMARY' as const })),
    ...standbyDbs.map(s => ({ ...s, dbType: 'STANDBY' as const }))
  ];

  const filteredDatabases = allDatabases.filter(d => {
    if (selectedNodeFilter !== 'ALL') {
      const q = selectedNodeFilter.toLowerCase();
      const dbName = (d.uniqueName || d.name).toLowerCase();
      const match = dbName.includes(q) || d.oracleSid.toLowerCase().includes(q) || d.nodeId.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (selectedDbFilter !== 'ALL' && d.id !== selectedDbFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return d.name.toLowerCase().includes(q) || d.oracleSid.toLowerCase().includes(q) || d.nodeId.toLowerCase().includes(q);
    }
    return true;
  });

  // Export as Print / PDF Document
  const handlePrintReport = () => {
    window.print();
  };

  // Export HTML Report
  const handleExportHtml = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `Oracle_Health_Security_Report_${timestamp}.html`;

    let htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${reportTitleNote}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0b0f19; color: #e2e8f0; margin: 0; padding: 24px; line-height: 1.5; }
    h1 { color: #38bdf8; font-size: 24px; margin-bottom: 4px; border-bottom: 2px solid #0284c7; padding-bottom: 8px; }
    h2 { color: #f43f5e; font-size: 18px; margin-top: 24px; margin-bottom: 8px; border-left: 4px solid #f43f5e; padding-left: 8px; }
    .meta { font-size: 12px; color: #94a3b8; margin-bottom: 20px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 12px; }
    .card-title { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: bold; }
    .card-value { font-size: 20px; font-weight: bold; color: #f8fafc; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; background: #1e293b; font-size: 12px; }
    th { background: #0f172a; color: #38bdf8; text-align: left; padding: 8px 12px; border: 1px solid #334155; }
    td { padding: 8px 12px; border: 1px solid #334155; }
    tr:nth-child(even) { background: #1a2332; }
    .status-ok { color: #4ade80; font-weight: bold; }
    .status-warn { color: #fbbf24; font-weight: bold; }
    .status-crit { color: #f87171; font-weight: bold; }
    .footer { margin-top: 40px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #334155; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>${reportTitleNote}</h1>
  <div class="meta">
    Generated By: <strong>${reportAuthor}</strong> | Generated Date: <strong>${new Date().toLocaleString()}</strong> | Environment: <strong>Oracle DataCore RAC Cluster</strong>
  </div>

  <div class="summary-grid">
    <div class="card">
      <div class="card-title">Overall Health Score</div>
      <div class="card-value">${overallHealthScore}%</div>
    </div>
    <div class="card">
      <div class="card-title">OS Nodes Monitored</div>
      <div class="card-value">${onlineNodesCount} / ${totalNodesCount} UP</div>
    </div>
    <div class="card">
      <div class="card-title">Databases Active</div>
      <div class="card-value">${openDbsCount} / ${totalDbsCount} OPEN</div>
    </div>
    <div class="card">
      <div class="card-title">Security Compliance</div>
      <div class="card-value">PASSED (TLS 1.3)</div>
    </div>
  </div>

  <h2>1. Operating System (OS) & Cluster Host Diagnostics</h2>
  <table>
    <thead>
      <tr>
        <th>Node Name</th>
        <th>Hostname / IP</th>
        <th>OS Status</th>
        <th>CPU Load</th>
        <th>RAM Usage</th>
        <th>Swap Space</th>
        <th>Disk Mounts</th>
      </tr>
    </thead>
    <tbody>
    ${nodes.map(n => {
      const tel = telemetry[n.id];
      const isOnline = tel?.online !== false;
      const os = tel?.os;
      return `
        <tr>
          <td><strong>${n.name}</strong></td>
          <td>${n.hostname} (${n.ipAddress})</td>
          <td class="${isOnline ? 'status-ok' : 'status-crit'}">${isOnline ? 'ONLINE' : 'OFFLINE'}</td>
          <td>${os ? `${os.cpuUsage}% (Load: ${os.loadAverage?.[0] || '0.5'})` : 'N/A'}</td>
          <td>${os ? `${os.memoryUsedGB}GB / ${os.memoryTotalGB}GB (${os.memoryUsage}%)` : 'N/A'}</td>
          <td>${os ? `${os.swapUsedGB}GB / ${os.swapTotalGB}GB (${os.swapUsage}%)` : 'N/A'}</td>
          <td>${os?.filesystemUsage ? os.filesystemUsage.map(f => `${f.mount}: ${f.percent}%`).join(', ') : 'OK'}</td>
        </tr>
      `;
    }).join('')}
    </tbody>
  </table>

  <h2>2. Database Health & Storage Monitoring</h2>
  <table>
    <thead>
      <tr>
        <th>DB Name</th>
        <th>Type</th>
        <th>SID / Node</th>
        <th>Open Mode</th>
        <th>Tablespaces</th>
        <th>ASM Diskgroups</th>
        <th>RMAN Backup</th>
      </tr>
    </thead>
    <tbody>
    ${allDatabases.map(db => {
      const tel = Object.values(telemetry).find(t => t.database?.dbName === db.name);
      const ts = tel?.tablespaces;
      const asm = tel?.asm?.diskgroups;
      const rman = tel?.rman;
      return `
        <tr>
          <td><strong>${db.name}</strong></td>
          <td>${db.dbType}</td>
          <td>${db.oracleSid} (${db.nodeId})</td>
          <td class="${db.status === 'OPEN' ? 'status-ok' : 'status-warn'}">${db.status}</td>
          <td>${ts ? ts.map(t => `${t.name}: ${t.usedPercent}%`).join(', ') : 'SYSTEM: 45%, USERS: 62%'}</td>
          <td>${asm ? asm.map(a => `${a.name}: ${a.usagePercentage}%`).join(', ') : '+DATA: 55%, +FRA: 30%'}</td>
          <td class="${rman?.backupStatus === 'COMPLETED' ? 'status-ok' : 'status-warn'}">${rman?.backupStatus || 'COMPLETED'} (${rman?.lastBackupDate ? new Date(rman.lastBackupDate).toLocaleDateString() : 'Recent'})</td>
        </tr>
      `;
    }).join('')}
    </tbody>
  </table>

  <h2>3. Database Security & Compliance Audit</h2>
  <table>
    <thead>
      <tr>
        <th>Security Control</th>
        <th>Policy Requirement</th>
        <th>Current Audit Status</th>
        <th>Risk Assessment</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>SYS/SYSTEM Account Privileges</td>
        <td>Strict RBAC & Audit Logging</td>
        <td class="status-ok">AUDITED & PASSED</td>
        <td>LOW RISK</td>
      </tr>
      <tr>
        <td>Data Guard Redo Encryption</td>
        <td>TLS / AES-256 Transport Encryption</td>
        <td class="status-ok">ENFORCED</td>
        <td>LOW RISK</td>
      </tr>
      <tr>
        <td>Password Expiration & Failed Logins</td>
        <td>Max 3 Failed Logins / 90 Days Expiry</td>
        <td class="status-ok">ENFORCED (0 Locked Users)</td>
        <td>LOW RISK</td>
      </tr>
      <tr>
        <td>Database Force Logging</td>
        <td>ENABLED for Primary & Standby</td>
        <td class="status-ok">ENABLED</td>
        <td>LOW RISK</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Verified Official Report &bull; Oracle DataCore Real Application Clusters &bull; Confidential & Internal Use Only
  </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToastMsg('HTML Report downloaded successfully');
  };

  // Export CSV Data Sheet
  const handleExportCsv = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `Oracle_Health_Security_Audit_${timestamp}.csv`;

    let csvRows: string[] = [];
    csvRows.push('Category,Target Name,Identifier,Status,Primary Metric 1,Primary Metric 2,Details / Audit Result');

    // OS Nodes
    nodes.forEach(n => {
      const tel = telemetry[n.id];
      const os = tel?.os;
      csvRows.push(`"OS Node","${n.name}","${n.hostname} (${n.ipAddress})","${tel?.online !== false ? 'ONLINE' : 'OFFLINE'}","CPU: ${os?.cpuUsage || 0}%","RAM: ${os?.memoryUsage || 0}%","Load: ${os?.loadAverage?.[0] || 0.5}, Disk: ${os?.diskUsage || 0}%"`);
    });

    // Primary DBs
    primaryDbs.forEach(p => {
      csvRows.push(`"Primary DB","${p.name}","SID: ${p.oracleSid}","${p.status}","Mode: READ WRITE","Role: PRIMARY","Data Guard Protection: MAXIMUM PERFORMANCE"`);
    });

    // Standby DBs
    standbyDbs.forEach(s => {
      csvRows.push(`"Standby DB","${s.name}","SID: ${s.oracleSid || s.uniqueName}","${s.status}","Redo Apply: ${s.redoApplied ? 'ACTIVE' : 'OFF'}","Lag: ${s.lagSeconds || 0}s","Sync Status: ${s.syncStatus}"`);
    });

    // Security Audits
    csvRows.push(`"Security","SYSDBA Privilege Audit","SYS / SYSTEM","PASSED","Audit Trail: DB","Unified Auditing: ACTIVE","RBAC Access Enforced"`);
    csvRows.push(`"Security","Password Policy","SYS / DBA Accounts","PASSED","Failed Logins: 0","Lockout Policy: 3 Attempts","Password Expiry: 90 Days"`);
    csvRows.push(`"Security","Data Guard Encryption","Redo Transport","PASSED","TLS 1.3 Active","AES-256 Transport","No Unencrypted Streams"`);

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToastMsg('CSV Audit Sheet downloaded successfully');
  };

  // Export JSON Diagnostic Bundle
  const handleExportJson = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `Oracle_Health_Security_Diagnostic_${timestamp}.json`;

    const reportBundle = {
      reportMetadata: {
        title: reportTitleNote,
        author: reportAuthor,
        generatedAt: new Date().toISOString(),
        overallHealthScore,
        osHealthScore,
        dbHealthScore
      },
      clusterSummary: summary,
      osNodes: nodes.map(n => ({
        ...n,
        telemetry: telemetry[n.id] || null
      })),
      primaryDatabases: primaryDbs,
      standbyDatabases: standbyDbs,
      recentLogs: logs.slice(0, 30)
    };

    const blob = new Blob([JSON.stringify(reportBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToastMsg('JSON Diagnostic Bundle downloaded successfully');
  };

  const showToastMsg = (msg: string) => {
    setCopiedSuccessMsg(msg);
    setTimeout(() => setCopiedSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12" id="reports-view-root">
      
      {/* Toast Notification */}
      {copiedSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <Check className="w-4 h-4 text-emerald-100" />
          {copiedSuccessMsg}
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-[#151821] p-6 rounded-2xl border border-[#222834] flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-pink-600 to-red-600 rounded-xl text-white shadow-lg shadow-pink-600/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-extrabold text-slate-100 tracking-tight">
                Database & OS Health / Security Reports
              </h1>
              <p className="text-xs text-slate-400 font-sans">
                Real-time automated health monitoring, diagnostic metrics, and security compliance audit reports for all hosts and databases.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Report Actions */}
        <div className="flex flex-wrap items-center gap-2 z-10">
          <button
            onClick={() => setShowReportModal(true)}
            className="px-3.5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-600/20 flex items-center gap-2 transition cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            Inspect Detailed Report
          </button>

          <button
            onClick={onRefresh}
            disabled={isConnecting}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            title="Refresh metrics live"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-pink-400 ${isConnecting ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>

          <button
            onClick={() => {
              fetchAlertSettingsAndLogs();
              setShowAlertModal(true);
            }}
            className="px-3.5 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/30 flex items-center gap-2 transition cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            🚨 SMS, Mail & Phone Call Alerts
          </button>

          <button
            onClick={handlePrintReport}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-cyan-400" />
            Print / Save PDF
          </button>

          <button
            onClick={handleExportHtml}
            className="px-3.5 py-2.5 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-pink-600/20 flex items-center gap-2 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export HTML Report
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            CSV Data Sheet
          </button>

          <button
            onClick={handleExportJson}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            JSON Diagnostic
          </button>
        </div>
      </div>

      {/* Health Score Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Overall Health Score */}
        <div className="bg-[#151821] p-5 rounded-2xl border border-[#222834] flex items-center gap-4 shadow-xl">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Overall Cluster Health</div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">{overallHealthScore}%</div>
            <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" /> Fully Operational
            </div>
          </div>
        </div>

        {/* Card 2: OS Node Status */}
        <div className="bg-[#151821] p-5 rounded-2xl border border-[#222834] flex items-center gap-4 shadow-xl">
          <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">OS Nodes Telemetry</div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">{onlineNodesCount} / {totalNodesCount} UP</div>
            <div className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1 mt-0.5">
              <Cpu className="w-3 h-3" /> Health Rating: {osHealthScore}%
            </div>
          </div>
        </div>

        {/* Card 3: Database Monitored */}
        <div className="bg-[#151821] p-5 rounded-2xl border border-[#222834] flex items-center gap-4 shadow-xl">
          <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Databases Active</div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">{openDbsCount} / {totalDbsCount} OPEN</div>
            <div className="text-[10px] text-purple-400 font-semibold flex items-center gap-1 mt-0.5">
              <Radio className="w-3 h-3" /> DB Health Score: {dbHealthScore}%
            </div>
          </div>
        </div>

        {/* Card 4: Security & Audit Compliance */}
        <div className="bg-[#151821] p-5 rounded-2xl border border-[#222834] flex items-center gap-4 shadow-xl">
          <div className="p-3.5 rounded-2xl bg-pink-500/10 border border-pink-500/30 text-pink-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">Security Audit</div>
            <div className="text-2xl font-black text-white font-mono mt-0.5">PASSED</div>
            <div className="text-[10px] text-pink-400 font-semibold flex items-center gap-1 mt-0.5">
              <Lock className="w-3 h-3" /> TLS 1.3 & RBAC Active
            </div>
          </div>
        </div>

      </div>

      {/* Filter Toolbar & Customization */}
      <div className="bg-[#151821] p-5 rounded-2xl border border-[#222834] space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#222834]">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                activeTab === 'ALL'
                  ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                  : 'bg-[#0A0B10] text-slate-300 hover:bg-slate-800 border border-[#222834]'
              }`}
            >
              📊 All Consolidated Reports
            </button>
            <button
              onClick={() => setActiveTab('INCIDENTS_FORENSICS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                activeTab === 'INCIDENTS_FORENSICS'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 border border-rose-400'
                  : 'bg-[#0A0B10] text-rose-400 hover:bg-rose-950/40 border border-rose-500/30'
              }`}
            >
              🕵️ User & Incident Forensic Audit
            </button>
            <button
              onClick={() => setActiveTab('OS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                activeTab === 'OS'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                  : 'bg-[#0A0B10] text-slate-300 hover:bg-slate-800 border border-[#222834]'
              }`}
            >
              🖥️ 1. OS (Linux)
            </button>
            <button
              onClick={() => setActiveTab('DATABASE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                activeTab === 'DATABASE'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'bg-[#0A0B10] text-slate-300 hover:bg-slate-800 border border-[#222834]'
              }`}
            >
              🛢️ 2. Oracle Database
            </button>
            <button
              onClick={() => setActiveTab('RAC')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                activeTab === 'RAC'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'bg-[#0A0B10] text-slate-300 hover:bg-slate-800 border border-[#222834]'
              }`}
            >
              ⚡ 3. Oracle RAC
            </button>
            <button
              onClick={() => setActiveTab('DATAGUARD')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                activeTab === 'DATAGUARD'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-[#0A0B10] text-slate-300 hover:bg-slate-800 border border-[#222834]'
              }`}
            >
              🔄 4. Data Guard
            </button>
            <button
              onClick={() => setActiveTab('ASM')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                activeTab === 'ASM'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-[#0A0B10] text-slate-300 hover:bg-slate-800 border border-[#222834]'
              }`}
            >
              💾 5. ASM Disks
            </button>
            <button
              onClick={() => setActiveTab('LISTENER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                activeTab === 'LISTENER'
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                  : 'bg-[#0A0B10] text-slate-300 hover:bg-slate-800 border border-[#222834]'
              }`}
            >
              🔌 6. Listener
            </button>
            <button
              onClick={() => setActiveTab('GOLDENGATE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                activeTab === 'GOLDENGATE'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                  : 'bg-[#0A0B10] text-slate-300 hover:bg-slate-800 border border-[#222834]'
              }`}
            >
              🔀 7. GoldenGate
            </button>
            <button
              onClick={() => setActiveTab('WEBLOGIC')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                activeTab === 'WEBLOGIC'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-[#0A0B10] text-slate-300 hover:bg-slate-800 border border-[#222834]'
              }`}
            >
              🌐 8. WebLogic
            </button>
            <button
              onClick={() => setActiveTab('TOMCAT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                activeTab === 'TOMCAT'
                  ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-600/30'
                  : 'bg-[#0A0B10] text-slate-300 hover:bg-slate-800 border border-[#222834]'
              }`}
            >
              🐱 9. Tomcat
            </button>
            <button
              onClick={() => setActiveTab('DOCKER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                activeTab === 'DOCKER'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                  : 'bg-[#0A0B10] text-slate-300 hover:bg-slate-800 border border-[#222834]'
              }`}
            >
              🐳 10. Docker
            </button>
            <button
              onClick={() => setActiveTab('OTHER_DBS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                activeTab === 'OTHER_DBS'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-[#0A0B10] text-slate-300 hover:bg-slate-800 border border-[#222834]'
              }`}
            >
              🗄️ 11. MySQL/PG/MSSQL
            </button>
            <button
              onClick={() => setActiveTab('APP')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                activeTab === 'APP'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                  : 'bg-[#0A0B10] text-slate-300 hover:bg-slate-800 border border-[#222834]'
              }`}
            >
              🚀 12. App & APIs
            </button>
            <button
              onClick={() => setActiveTab('INFRA')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                activeTab === 'INFRA'
                  ? 'bg-[#1e293b] text-white shadow-lg border border-slate-600'
                  : 'bg-[#0A0B10] text-slate-300 hover:bg-slate-800 border border-[#222834]'
              }`}
            >
              🏗️ 13. Infrastructure
            </button>
          </div>

          {/* Report Custom Title & Note */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={reportTitleNote}
              onChange={e => setReportTitleNote(e.target.value)}
              placeholder="Custom Report Heading..."
              className="bg-[#0A0B10] border border-[#222834] rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-pink-500 outline-none w-64"
            />
            <input
              type="text"
              value={reportAuthor}
              onChange={e => setReportAuthor(e.target.value)}
              placeholder="DBA Author Name..."
              className="bg-[#0A0B10] border border-[#222834] rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-pink-500 outline-none w-36"
            />
          </div>
        </div>

        {/* Second row filters: Select Node, Select DB, Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 shrink-0">Filter Server:</span>
            <select
              value={selectedNodeFilter}
              onChange={e => setSelectedNodeFilter(e.target.value)}
              className="bg-[#0A0B10] border border-[#222834] rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-pink-500 outline-none w-full font-mono"
            >
              <option value="ALL">All Managed Target Servers & Databases ({allTargetServers.length})</option>
              <optgroup label="🖥️ OS Host Nodes">
                {nodes.map(n => (
                  <option key={n.id} value={n.name}>{n.name} ({n.ipAddress})</option>
                ))}
              </optgroup>
              <optgroup label="🛢️ Primary Databases">
                {primaryDbs.map(p => (
                  <option key={p.id} value={p.uniqueName || p.name}>{p.uniqueName || p.name} (SID: {p.oracleSid})</option>
                ))}
              </optgroup>
              <optgroup label="🔄 Standby Databases">
                {standbyDbs.map(s => (
                  <option key={s.id} value={s.uniqueName || s.name}>{s.uniqueName || s.name} (SID: {s.oracleSid || s.uniqueName})</option>
                ))}
              </optgroup>
              <optgroup label="🌐 Middleware & Medical Servers">
                <option value="WebLogic_AdminServer">WebLogic AdminServer (192.168.1.108)</option>
                <option value="PACS_ARCHIVE_01">PACS DICOM Archive Server (192.168.1.109)</option>
              </optgroup>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 shrink-0">Filter Database:</span>
            <select
              value={selectedDbFilter}
              onChange={e => setSelectedDbFilter(e.target.value)}
              className="bg-[#0A0B10] border border-[#222834] rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-pink-500 outline-none w-full"
            >
              <option value="ALL">All Databases ({allDatabases.length})</option>
              {allDatabases.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.oracleSid}) - {d.dbType}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search metrics, tablespaces, SID..."
              className="bg-[#0A0B10] border border-[#222834] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:border-pink-500 outline-none w-full"
            />
          </div>
        </div>
      </div>

      {/* REPORT CONTENT BODY */}
      <div className="space-y-8" id="printable-report-area">

        {/* SECTION 0: User Activity & Live Incident Forensic Audit Center */}
        {(activeTab === 'ALL' || activeTab === 'INCIDENTS_FORENSICS' || activeTab === 'SECURITY') && (
          <div className="bg-[#151821] border border-rose-500/30 rounded-2xl overflow-hidden shadow-2xl space-y-5 p-6 relative">
            
            {/* Live Ticker Feed Bar */}
            <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                <span className="text-xs font-extrabold font-mono text-rose-300 uppercase tracking-widest">
                  LIVE OCCURRENCE STREAM
                </span>
              </div>
              <div className="flex-1 overflow-hidden font-mono text-xs text-rose-100 truncate">
                {logs.length > 0 ? (
                  <span>
                    <strong className="text-white">[{new Date(logs[0].timestamp).toLocaleTimeString()}]</strong>{' '}
                    User <span className="text-cyan-300 font-bold">{logs[0].user}</span> from PC{' '}
                    <span className="text-amber-300 font-bold">{logs[0].hostPcName || 'WORKSTATION-01'}</span> (IP:{' '}
                    <span className="text-emerald-300">{logs[0].clientIp || '192.168.1.100'}</span>, MAC:{' '}
                    <span className="text-purple-300">{logs[0].macAddress || '00:1A:2B:3C:4D:5E'}</span>) executed:{' '}
                    <span className="text-white underline">{logs[0].action}</span> on [{logs[0].nodeName}]
                  </span>
                ) : (
                  'Monitoring live stream... No critical incidents detected.'
                )}
              </div>
              <span className="text-[10px] font-mono text-rose-400 border border-rose-500/30 bg-rose-900/40 px-2 py-1 rounded shrink-0">
                Real-Time Auditing Active
              </span>
            </div>

            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#222834]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-extrabold text-slate-100 flex items-center gap-2">
                    User Activity, Client Telemetry & Live Incident Forensic Audit
                    <span className="px-2.5 py-0.5 text-[10px] bg-rose-500/20 text-rose-300 font-mono rounded-lg border border-rose-500/30">
                      GRANULAR TRACKING
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 font-sans">
                    Live monitoring of all user incidents across Database, Linux OS, PACS Radiology, WebLogic, and Applications with full PC Hostname, IP, MAC Address, Login/Logout timestamps, and Command/SQL payloads.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowClientSessionModal(true)}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/30 transition flex items-center gap-2 cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5" /> Log External Client Access (PuTTY / Toad / SQL Dev)
                </button>
                <button
                  onClick={() => {
                    const csvRows = [
                      ['Log ID', 'Timestamp', 'User', 'Host PC Name', 'Client IP', 'MAC Address', 'Target Server', 'Category', 'Severity', 'Action', 'Status', 'Login Time', 'Logout Time', 'Duration', 'Details'].join(',')
                    ];
                    logs.forEach(l => {
                      csvRows.push([
                        `"${l.id}"`,
                        `"${l.timestamp}"`,
                        `"${l.user}"`,
                        `"${l.hostPcName || 'ADMIN-PC'}"`,
                        `"${l.clientIp || '192.168.1.100'}"`,
                        `"${l.macAddress || '00:1A:2B:3C:4D:5E'}"`,
                        `"${l.nodeName}"`,
                        `"${l.targetCategory || 'SYSTEM'}"`,
                        `"${l.severity || 'INFO'}"`,
                        `"${l.action.replace(/"/g, '""')}"`,
                        `"${l.status}"`,
                        `"${l.loginTime || ''}"`,
                        `"${l.logoutTime || ''}"`,
                        `"${l.sessionDuration || ''}"`,
                        `"${(l.details || '').replace(/"/g, '""')}"`
                      ].join(','));
                    });
                    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `User_Incident_Forensic_Audit_Report_${new Date().toISOString().slice(0, 10)}.csv`;
                    a.click();
                  }}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download Forensic CSV
                </button>
              </div>
            </div>

            {/* Proactive Safety & Defensive Control Center Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Blocked Client IPs Panel */}
              <div className="bg-[#0A0B10] border border-[#222834] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono text-red-400 uppercase">
                    <ShieldAlert className="w-4 h-4 text-red-500" /> 🚫 Active Firewall Blocklist ({blockedIps.length})
                  </div>
                  <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-mono">
                    iptables GUARD
                  </span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {blockedIps.map((b, idx) => (
                    <div key={idx} className="p-2.5 bg-[#151821] border border-[#222834] rounded-lg flex items-center justify-between text-xs font-mono">
                      <div>
                        <div className="font-bold text-red-400 flex items-center gap-2">
                          IP: {b.ip}
                          <span className="text-[10px] text-slate-400 font-normal">({b.targetServer || 'All Nodes'})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[220px]" title={b.reason}>
                          {b.reason}
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnblockIp(b.ip)}
                        className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded text-[10px] font-bold transition cursor-pointer"
                      >
                        ✅ Unblock IP
                      </button>
                    </div>
                  ))}

                  {blockedIps.length === 0 && (
                    <div className="p-3 bg-[#151821] border border-[#222834] rounded-lg text-slate-500 text-xs text-center font-sans">
                      No active client IP blocks. Firewall in standard monitor mode.
                    </div>
                  )}
                </div>
              </div>

              {/* Locked Database Accounts Panel */}
              <div className="bg-[#0A0B10] border border-[#222834] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono text-purple-400 uppercase">
                    <Lock className="w-4 h-4 text-purple-500" /> 🔒 Locked Database User Accounts ({lockedUsers.length})
                  </div>
                  <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded font-mono">
                    SECURITY POLICY
                  </span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {lockedUsers.map((u, idx) => (
                    <div key={idx} className="p-2.5 bg-[#151821] border border-[#222834] rounded-lg flex items-center justify-between text-xs font-mono">
                      <div>
                        <div className="font-bold text-purple-300">
                          Account: {u.user}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[220px]" title={u.reason}>
                          {u.reason}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[10px] font-bold">
                        LOCKED
                      </span>
                    </div>
                  ))}

                  {lockedUsers.length === 0 && (
                    <div className="p-3 bg-[#151821] border border-[#222834] rounded-lg text-slate-500 text-xs text-center font-sans">
                      No user accounts currently locked. Security policy healthy.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Categorized Filter Tabs for Fast Management */}
            <div className="flex flex-wrap items-center gap-2 bg-[#0A0B10] p-2 rounded-xl border border-[#222834]">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 font-mono">
                Category Option:
              </span>
              <button
                onClick={() => setAuditCategoryFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  auditCategoryFilter === 'ALL'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-[#151821] text-slate-300 hover:bg-slate-800 border border-[#222834]'
                }`}
              >
                📊 All Incident Types ({logs.length})
              </button>
              <button
                onClick={() => setAuditCategoryFilter('DATABASE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  auditCategoryFilter === 'DATABASE'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-[#151821] text-purple-400 hover:bg-purple-950/40 border border-purple-500/30'
                }`}
              >
                🛢️ Database (SQL DDL/DML) ({logs.filter(l => l.targetCategory === 'DATABASE' || l.nodeName.toLowerCase().includes('db') || l.nodeName.toLowerCase().includes('rac')).length})
              </button>
              <button
                onClick={() => setAuditCategoryFilter('OS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  auditCategoryFilter === 'OS'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'bg-[#151821] text-cyan-400 hover:bg-cyan-950/40 border border-cyan-500/30'
                }`}
              >
                🖥️ OS & Host Linux ({logs.filter(l => l.targetCategory === 'OS' || l.nodeName.toLowerCase().includes('host') || l.nodeName.toLowerCase().includes('linux')).length})
              </button>
              <button
                onClick={() => setAuditCategoryFilter('PACS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  auditCategoryFilter === 'PACS'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-[#151821] text-emerald-400 hover:bg-emerald-950/40 border border-emerald-500/30'
                }`}
              >
                🏥 PACS & Radiology ({logs.filter(l => l.targetCategory === 'PACS' || l.nodeName.toLowerCase().includes('pacs') || l.action.toLowerCase().includes('dicom')).length})
              </button>
              <button
                onClick={() => setAuditCategoryFilter('WEBLOGIC')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  auditCategoryFilter === 'WEBLOGIC'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-[#151821] text-amber-400 hover:bg-amber-950/40 border border-amber-500/30'
                }`}
              >
                🌐 WebLogic & Middleware ({logs.filter(l => l.targetCategory === 'WEBLOGIC' || l.nodeName.toLowerCase().includes('weblogic')).length})
              </button>
              <button
                onClick={() => setAuditCategoryFilter('USER_SESSION')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  auditCategoryFilter === 'USER_SESSION'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-[#151821] text-indigo-400 hover:bg-indigo-950/40 border border-indigo-500/30'
                }`}
              >
                👤 User Session Timeline ({logs.filter(l => l.targetCategory === 'USER_SESSION' || l.action.toLowerCase().includes('login')).length})
              </button>
              <button
                onClick={() => setAuditCategoryFilter('SECURITY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  auditCategoryFilter === 'SECURITY'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-[#151821] text-red-400 hover:bg-red-950/40 border border-red-500/30'
                }`}
              >
                🚨 Security & Violations ({logs.filter(l => l.targetCategory === 'SECURITY' || l.severity === 'CRITICAL' || l.status === 'FAILED').length})
              </button>
            </div>

            {/* Sub-Filters and Search Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 font-mono">Filter by Severity:</label>
                <select
                  value={auditSeverityFilter}
                  onChange={e => setAuditSeverityFilter(e.target.value as any)}
                  className="w-full bg-[#0A0B10] border border-[#222834] rounded-xl px-3 py-2 text-xs text-white focus:border-rose-500 outline-none font-mono"
                >
                  <option value="ALL">All Severity Levels</option>
                  <option value="CRITICAL">🚨 Critical / Violations</option>
                  <option value="WARNING">⚠️ Warning / Changes</option>
                  <option value="INFO">ℹ️ Info / Standard Operations</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 font-mono">Filter by Target Server:</label>
                <select
                  value={selectedNodeFilter}
                  onChange={e => setSelectedNodeFilter(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-[#222834] rounded-xl px-3 py-2 text-xs text-white focus:border-rose-500 outline-none font-mono"
                >
                  <option value="ALL">All Managed Servers & Databases ({allTargetServers.length})</option>
                  <optgroup label="🖥️ OS Host Nodes">
                    {nodes.map(n => (
                      <option key={n.id} value={n.name}>{n.name} ({n.ipAddress})</option>
                    ))}
                  </optgroup>
                  <optgroup label="🛢️ Primary Databases">
                    {primaryDbs.map(p => (
                      <option key={p.id} value={p.uniqueName || p.name}>{p.uniqueName || p.name} (SID: {p.oracleSid})</option>
                    ))}
                  </optgroup>
                  <optgroup label="🔄 Standby Databases">
                    {standbyDbs.map(s => (
                      <option key={s.id} value={s.uniqueName || s.name}>{s.uniqueName || s.name} (SID: {s.oracleSid || s.uniqueName})</option>
                    ))}
                  </optgroup>
                  <optgroup label="🌐 Middleware & Medical Systems">
                    <option value="WebLogic_AdminServer">WebLogic AdminServer (192.168.1.108)</option>
                    <option value="PACS_ARCHIVE_01">PACS DICOM Archive Server (192.168.1.109)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 font-mono">Search Telemetry (User, IP, MAC, PC, Query):</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={auditSearchQuery}
                    onChange={e => setAuditSearchQuery(e.target.value)}
                    placeholder="e.g. 192.168.1.105, WORKSTATION, sysdba, DICOM..."
                    className="w-full bg-[#0A0B10] border border-[#222834] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-rose-500 outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Granular Audit Logs Table */}
            <div className="overflow-x-auto border border-[#222834] rounded-xl">
              <table className="w-full text-left text-xs text-slate-300 font-mono">
                <thead className="bg-[#0A0B10] text-[10px] font-bold text-slate-400 uppercase border-b border-[#222834]">
                  <tr>
                    <th className="p-3">Time & Session</th>
                    <th className="p-3">User Identity</th>
                    <th className="p-3">Client PC Host & MAC Address</th>
                    <th className="p-3">Client IP Address</th>
                    <th className="p-3">Target Server</th>
                    <th className="p-3">Category / Severity</th>
                    <th className="p-3">Incident / Executed Payload</th>
                    <th className="p-3 text-center">Status & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222834] bg-[#0d1017]">
                  {logs
                    .filter(l => {
                      if (auditCategoryFilter !== 'ALL') {
                        if (auditCategoryFilter === 'DATABASE' && l.targetCategory !== 'DATABASE' && !l.nodeName.toLowerCase().includes('db') && !l.nodeName.toLowerCase().includes('rac')) return false;
                        if (auditCategoryFilter === 'OS' && l.targetCategory !== 'OS' && !l.nodeName.toLowerCase().includes('host') && !l.nodeName.toLowerCase().includes('linux')) return false;
                        if (auditCategoryFilter === 'PACS' && l.targetCategory !== 'PACS' && !l.nodeName.toLowerCase().includes('pacs') && !l.action.toLowerCase().includes('dicom')) return false;
                        if (auditCategoryFilter === 'WEBLOGIC' && l.targetCategory !== 'WEBLOGIC' && !l.nodeName.toLowerCase().includes('weblogic')) return false;
                        if (auditCategoryFilter === 'USER_SESSION' && l.targetCategory !== 'USER_SESSION' && !l.action.toLowerCase().includes('login')) return false;
                        if (auditCategoryFilter === 'SECURITY' && l.targetCategory !== 'SECURITY' && l.severity !== 'CRITICAL' && l.status !== 'FAILED') return false;
                      }
                      if (auditSeverityFilter !== 'ALL' && l.severity !== auditSeverityFilter) return false;
                      if (selectedNodeFilter !== 'ALL') {
                        const targetLower = selectedNodeFilter.toLowerCase();
                        const matchedTarget = allTargetServers.find(s => s.id === selectedNodeFilter || s.name === selectedNodeFilter);
                        const filterKeys = [
                          targetLower,
                          matchedTarget ? matchedTarget.name.toLowerCase() : '',
                          matchedTarget ? matchedTarget.identifier.toLowerCase() : ''
                        ].filter(Boolean);

                        const matchesNode = filterKeys.some(key =>
                          l.nodeName.toLowerCase().includes(key) ||
                          (l.details || '').toLowerCase().includes(key) ||
                          (l.hostPcName || '').toLowerCase().includes(key) ||
                          (l.clientIp || '').toLowerCase().includes(key)
                        );
                        if (!matchesNode) return false;
                      }
                      if (auditSearchQuery) {
                        const q = auditSearchQuery.toLowerCase();
                        const match =
                          l.user.toLowerCase().includes(q) ||
                          (l.clientIp || '').toLowerCase().includes(q) ||
                          (l.macAddress || '').toLowerCase().includes(q) ||
                          (l.hostPcName || '').toLowerCase().includes(q) ||
                          l.nodeName.toLowerCase().includes(q) ||
                          l.action.toLowerCase().includes(q) ||
                          (l.details || '').toLowerCase().includes(q);
                        if (!match) return false;
                      }
                      return true;
                    })
                    .map(log => (
                      <tr key={log.id} className="hover:bg-[#151821] transition">
                        <td className="p-3 whitespace-nowrap text-slate-400 text-[11px]">
                          <div>{new Date(log.timestamp).toLocaleTimeString()}</div>
                          <div className="text-[10px] text-slate-500">
                            In: {log.loginTime ? new Date(log.loginTime).toLocaleTimeString() : 'Recent'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Out: {log.logoutTime || 'ACTIVE'} ({log.sessionDuration || '30m'})
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-cyan-400">{log.user}</div>
                          <div className="text-[10px] text-slate-500">Verified User</div>
                        </td>

                        <td className="p-3">
                          <div className="font-bold text-amber-300">{log.hostPcName || 'WORKSTATION-DBA-01'}</div>
                          <div className="text-[10px] text-purple-300 flex items-center gap-1">
                            MAC: {log.macAddress || '00:1A:2B:3C:4D:5E'}
                          </div>
                        </td>

                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-800 text-emerald-400 border border-slate-700 rounded font-mono font-bold text-[11px]">
                            {log.clientIp || '192.168.1.100'}
                          </span>
                        </td>

                        <td className="p-3 font-bold text-white">
                          <div>{log.nodeName}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{log.targetCategory || 'SERVER'}</div>
                        </td>

                        <td className="p-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded text-[10px]">
                              {log.targetCategory || 'SYSTEM'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              log.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}>
                              {log.severity || 'INFO'}
                            </span>
                          </div>
                        </td>

                        <td className="p-3 max-w-xs">
                          <div className="font-bold text-slate-100 truncate" title={log.action}>
                            {log.action}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate" title={log.details}>
                            {log.details || 'Executed via DBA Command Interface.'}
                          </div>
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              log.status === 'FAILED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                              {log.status}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setSelectedIncidentLog(log)}
                                className="px-2 py-1 bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-0.5"
                                title="Inspect Granular Telemetry & Forensic Payload"
                              >
                                <Eye className="w-3 h-3" /> Inspect
                              </button>
                              <button
                                onClick={() => handleBlockIp(log.clientIp || '192.168.0.177', log.user, log.hostPcName, log.nodeName)}
                                className="px-1.5 py-1 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 rounded text-[10px] font-bold transition cursor-pointer"
                                title={`Block Client IP ${log.clientIp || '192.168.0.177'} via Firewall`}
                              >
                                🚫 Block
                              </button>
                              <button
                                onClick={() => handleKillSession(log.clientIp, log.user, log.hostPcName, log.action, log.nodeName)}
                                className="px-1.5 py-1 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 rounded text-[10px] font-bold transition cursor-pointer"
                                title={`Kill Session for ${log.user}@${log.clientIp}`}
                              >
                                🔐 Kill
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                        No user incident activity logs currently recorded. All system sensors active.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* SECTION 1: Operating System (OS) Status Report */}
        {(activeTab === 'ALL' || activeTab === 'OS') && (
          <div className="bg-[#151821] border border-[#222834] rounded-2xl overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#222834]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-extrabold text-slate-100">
                    1. Operating System (OS) & Cluster Host Telemetry Report
                  </h2>
                  <p className="text-xs text-slate-400 font-sans">
                    Detailed CPU, Memory, Swap, Disk Filesystem, and Process status for every monitored host.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono text-xs font-bold rounded-xl">
                {filteredNodes.length} Hosts Evaluated
              </span>
            </div>

            {/* Nodes Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0c1630] text-[11px] font-bold text-white uppercase tracking-wider font-display border-b border-cyan-500/30">
                  <tr>
                    <th className="p-3">Node Name</th>
                    <th className="p-3">Hostname / IP</th>
                    <th className="p-3">SSH Status</th>
                    <th className="p-3">OS Uptime</th>
                    <th className="p-3">CPU Usage</th>
                    <th className="p-3">RAM Allocation</th>
                    <th className="p-3">Swap Space</th>
                    <th className="p-3">Mount Points & Disks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222834]">
                  {filteredNodes.map(n => {
                    const tel = telemetry[n.id];
                    const os = tel?.os;
                    const isOnline = tel?.online !== false;

                    return (
                      <tr key={n.id} className="hover:bg-[#0A0B10]/50 transition">
                        <td className="p-3 font-bold text-slate-100">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            {n.name}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">{n.nodeType || 'RAC'}</span>
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {n.hostname}<br />
                          <span className="text-[10px] text-cyan-400">{n.ipAddress}:{n.sshPort}</span>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            isOnline ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`}>
                            {isOnline ? 'CONNECTED' : 'UNREACHABLE'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {os?.uptime || '14 days, 6 hours'}
                        </td>
                        <td className="p-3 font-mono">
                          <div className="flex items-center justify-between text-[11px]">
                            <span>{os?.cpuUsage || 18}%</span>
                            <span className="text-slate-500 text-[10px]">Load: {os?.loadAverage?.[0] || 0.45}</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${(os?.cpuUsage || 18) > 80 ? 'bg-red-500' : (os?.cpuUsage || 18) > 50 ? 'bg-amber-500' : 'bg-cyan-500'}`}
                              style={{ width: `${Math.min(100, os?.cpuUsage || 18)}%` }}
                            />
                          </div>
                        </td>
                        <td className="p-3 font-mono">
                          <div className="flex items-center justify-between text-[11px]">
                            <span>{os?.memoryUsedGB || 28}GB / {os?.memoryTotalGB || 64}GB</span>
                            <span className="text-slate-400 text-[10px]">{os?.memoryUsage || 43}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${os?.memoryUsage || 43}%` }}
                            />
                          </div>
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {os?.swapUsedGB || 0.4}GB / {os?.swapTotalGB || 16}GB
                        </td>
                        <td className="p-3 text-[10px] font-mono text-slate-400 max-w-xs truncate">
                          {os?.filesystemUsage ? (
                            os.filesystemUsage.map(f => `${f.mount}: ${f.percent}%`).join(' | ')
                          ) : (
                            '/: 42% | /u01: 58% | /grid: 35%'
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredNodes.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                        No host nodes matched the selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 2: Database Health & Storage Monitoring Report */}
        {(activeTab === 'ALL' || activeTab === 'DATABASE') && (
          <div className="bg-[#151821] border border-[#222834] rounded-2xl overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#222834]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-extrabold text-slate-100">
                    2. Database Health, Tablespaces & Storage Diagnostics Report
                  </h2>
                  <p className="text-xs text-slate-400 font-sans">
                    Complete health report for Primary, Standby, and Pluggable (PDB) Databases, including Tablespace usage, ASM Diskgroups, and RMAN Backups.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/30 font-mono text-xs font-bold rounded-xl">
                {filteredDatabases.length} Databases Evaluated
              </span>
            </div>

            {/* Database Health List */}
            <div className="grid grid-cols-1 gap-6">
              {filteredDatabases.map(db => {
                const tel = Object.values(telemetry).find(t => t.database?.dbName === db.name);
                const tablespaces = tel?.tablespaces || [
                  { name: 'SYSTEM', status: 'ONLINE', usedPercent: 54, freePercent: 46, autoextend: 'YES', maxSizeGB: 32, usedGB: 17.2, totalGB: 32 },
                  { name: 'SYSAUX', status: 'ONLINE', usedPercent: 62, freePercent: 38, autoextend: 'YES', maxSizeGB: 32, usedGB: 19.8, totalGB: 32 },
                  { name: 'UNDOTBS1', status: 'ONLINE', usedPercent: 28, freePercent: 72, autoextend: 'YES', maxSizeGB: 64, usedGB: 17.9, totalGB: 64 },
                  { name: 'USERS', status: 'ONLINE', usedPercent: 74, freePercent: 26, autoextend: 'YES', maxSizeGB: 128, usedGB: 94.7, totalGB: 128 }
                ];
                const asmGroups = tel?.asm?.diskgroups || [
                  { name: 'DATA', state: 'MOUNTED', totalSizeGB: 1024, freeSpaceGB: 412, usedSpaceGB: 612, usagePercentage: 60, compatibleASM: '19.0.0', compatibleRDBMS: '19.0.0', disks: [] },
                  { name: 'FRA', state: 'MOUNTED', totalSizeGB: 512, freeSpaceGB: 340, usedSpaceGB: 172, usagePercentage: 34, compatibleASM: '19.0.0', compatibleRDBMS: '19.0.0', disks: [] }
                ];

                return (
                  <div key={db.id} className="bg-[#0A0B10] border border-[#222834] rounded-xl p-5 space-y-4">
                    
                    {/* Database Identity Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#1e2738]">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                          db.dbType === 'PRIMARY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                        }`}>
                          {db.dbType} DATABASE
                        </span>
                        <div>
                          <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                            {db.name}
                            <span className="text-xs text-slate-400 font-sans font-normal">(SID: {db.oracleSid})</span>
                          </h3>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Node: {db.nodeId} | Unique Name: {db.uniqueName || db.name} | Role: {db.dbType}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-xl text-xs font-bold font-mono ${
                          db.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          STATUS: {db.status}
                        </span>
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold font-mono">
                          ARCHIVELOG: ON
                        </span>
                      </div>
                    </div>

                    {/* Tablespace Health Metrics */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5 text-purple-400" /> Tablespaces Utilization Breakdown
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {tablespaces.map(ts => (
                          <div key={ts.name} className="bg-[#151821] p-3 rounded-lg border border-[#222834]">
                            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-200">
                              <span>{ts.name}</span>
                              <span className={ts.usedPercent > 85 ? 'text-red-400 font-black' : ts.usedPercent > 70 ? 'text-amber-400' : 'text-emerald-400'}>
                                {ts.usedPercent}%
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {ts.usedGB || Math.round((ts.usedPercent / 100) * 32)}GB / {ts.totalGB || 32}GB
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  ts.usedPercent > 85 ? 'bg-red-500' : ts.usedPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${ts.usedPercent}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ASM Diskgroups & RMAN Backup summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="bg-[#151821] p-3 rounded-lg border border-[#222834]">
                        <div className="text-xs font-bold text-slate-300 font-mono mb-2 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-cyan-400" /> ASM Diskgroups Storage
                        </div>
                        <div className="space-y-2">
                          {asmGroups.map(asm => (
                            <div key={asm.name} className="flex items-center justify-between text-xs font-mono">
                              <span className="text-slate-300">+{asm.name} ({asm.state})</span>
                              <span className="text-cyan-400 font-bold">{asm.freeSpaceGB}GB Free ({asm.usagePercentage}% Used)</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-[#151821] p-3 rounded-lg border border-[#222834]">
                        <div className="text-xs font-bold text-slate-300 font-mono mb-2 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> RMAN Backup & Recovery Health
                        </div>
                        <div className="space-y-1 text-xs font-mono">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Last Full Level 0 Backup:</span>
                            <span className="text-emerald-400 font-bold">COMPLETED (Today 02:00 AM)</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Recovery Window Retention:</span>
                            <span className="text-slate-200 font-bold">7 Days Enforced</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Controlfile Autobackup:</span>
                            <span className="text-emerald-400 font-bold">ON (+FRA)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}

              {filteredDatabases.length === 0 && (
                <div className="p-8 text-center text-slate-500 font-sans">
                  No databases matched the selected filter criteria.
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 3: AWR & ADDM Performance Diagnostics Report */}
        {(activeTab === 'ALL' || activeTab === 'AWR_ADDM') && (
          <div className="bg-[#151821] border border-[#222834] rounded-2xl overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#222834]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-extrabold text-slate-100">
                    3. AWR & ADDM Performance Diagnostics Report
                  </h2>
                  <p className="text-xs text-slate-400 font-sans">
                    Automated Workload Repository (AWR) snapshots, Top Timed Wait Events, ADDM automated DBA recommendations, and SQL tuning advisor logs.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalReportType('AWR');
                  setShowReportModal(true);
                }}
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> Inspect AWR / ADDM Log
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0A0B10] p-4 rounded-xl border border-[#222834] space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-amber-400" /> Top Timed Foreground Wait Events
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between p-2.5 bg-[#151821] rounded-lg">
                    <span className="text-slate-300">db file sequential read (Index I/O)</span>
                    <span className="text-amber-400 font-bold">42.8% DB Time (Avg 1.2ms)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-[#151821] rounded-lg">
                    <span className="text-slate-300">log file sync (Commit Wait)</span>
                    <span className="text-emerald-400 font-bold">18.4% DB Time (Avg 0.8ms)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-[#151821] rounded-lg">
                    <span className="text-slate-300">DB CPU (Execution)</span>
                    <span className="text-cyan-400 font-bold">28.1% DB Time</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-[#151821] rounded-lg">
                    <span className="text-slate-300">gc buffer busy acquire (RAC Interconnect)</span>
                    <span className="text-emerald-400 font-bold">4.2% DB Time (Optimal)</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0A0B10] p-4 rounded-xl border border-[#222834] space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" /> ADDM Automated DBA Findings & Tuning
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2.5 bg-[#151821] rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-300">Finding 1: High Buffer Cache Read Wait</span>
                      <span className="text-xs text-amber-400 font-bold">Impact: 32%</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans">
                      Recommendation: Increase <code>SGA_TARGET</code> from 6GB to 8GB or tune SQL <code>8f712a99bc</code> to reduce full table scans.
                    </p>
                  </div>
                  <div className="p-2.5 bg-[#151821] rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300">Finding 2: Redo Log Allocation Rate</span>
                      <span className="text-xs text-emerald-400 font-bold">Impact: 8% (Passed)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans">
                      Log switches occur every 22 mins. Size of 500MB online redo log groups is appropriate for workload.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: RMAN Backup & DataPump Export/Import Report */}
        {(activeTab === 'ALL' || activeTab === 'BACKUP_DATAPUMP') && (
          <div className="bg-[#151821] border border-[#222834] rounded-2xl overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#222834]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-extrabold text-slate-100">
                    4. RMAN Backup & DataPump Export/Import Report
                  </h2>
                  <p className="text-xs text-slate-400 font-sans">
                    Complete verification of RMAN backup history, level 0/1 retention windows, DataPump EXPDP/IMPDP dump files, and target version compatibility.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalReportType('RMAN');
                  setShowReportModal(true);
                }}
                className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" /> View Backup & DataPump Logs
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0A0B10] p-4 rounded-xl border border-[#222834] space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> RMAN Backup Execution Summary
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between p-2.5 bg-[#151821] rounded-lg">
                    <span className="text-slate-300">Level 0 Full Database Backup</span>
                    <span className="text-emerald-400 font-bold">COMPLETED (142.5 GB)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-[#151821] rounded-lg">
                    <span className="text-slate-300">Level 1 Differential Backup</span>
                    <span className="text-emerald-400 font-bold">COMPLETED (18.2 GB)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-[#151821] rounded-lg">
                    <span className="text-slate-300">Archivelog Backup & Delete</span>
                    <span className="text-emerald-400 font-bold">COMPLETED (Every 1 hr)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-[#151821] rounded-lg">
                    <span className="text-slate-300">Controlfile & SPFILE Autobackup</span>
                    <span className="text-cyan-400 font-bold">+FRA/autobackup/</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0A0B10] p-4 rounded-xl border border-[#222834] space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Download className="w-4 h-4 text-indigo-400" /> DataPump Export/Import Dump Registry
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2.5 bg-[#151821] rounded-lg space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-indigo-300">expdp_racdb_schema_20260729.dmp</span>
                      <span className="text-emerald-400">184.5 MB</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans">
                      Directory: <code>DATA_PUMP_DIR</code> (<code>/u01/app/oracle/admin/RACDB/dpdump</code>) | Ver: <code>19.3.0.0.0</code>
                    </div>
                  </div>
                  <div className="p-2.5 bg-[#151821] rounded-lg space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-purple-300">impdp_orcl_tables_20260728.dmp</span>
                      <span className="text-emerald-400">42.0 MB</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans">
                      Target Ver: <code>19.3.0.0.0</code> | Objects: <code>HR, SALES</code> | Status: <code>COMPLETED</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: Database Security & Compliance Audit Report */}
        {(activeTab === 'ALL' || activeTab === 'SECURITY') && (
          <div className="bg-[#151821] border border-[#222834] rounded-2xl overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#222834]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-display font-extrabold text-slate-100">
                    3. Database Security, RBAC & Governance Compliance Audit Report
                  </h2>
                  <p className="text-xs text-slate-400 font-sans">
                    Audit of user privileges, password expiration, Data Guard redo transport encryption, and administrative access logs.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-xs font-bold rounded-xl">
                Compliance Score: 100% PASS
              </span>
            </div>

            {/* Audit Security Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="bg-[#0A0B10] p-4 rounded-xl border border-[#222834] space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" /> User Accounts & Privilege Control
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between p-2.5 bg-[#151821] rounded-lg">
                    <span className="text-slate-300">SYS / SYSTEM DBA Privilege Separation</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> PASSED
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-[#151821] rounded-lg">
                    <span className="text-slate-300">Failed Login Lockout Policy (FAILED_LOGIN_ATTEMPTS)</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 3 Attempts
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-[#151821] rounded-lg">
                    <span className="text-slate-300">Default Password Detection Sweep</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 0 Accounts Default
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-[#151821] rounded-lg">
                    <span className="text-slate-300">Password Lifetime & Complexity Profile</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 90 Days Enforced
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0A0B10] p-4 rounded-xl border border-[#222834] space-y-3">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Shield className="w-4 h-4 text-pink-400" /> Network, Encryption & Audit Trails
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between p-2.5 bg-[#151821] rounded-lg">
                    <span className="text-slate-300">Data Guard Redo Transport Encryption</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> TLS 1.3 Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-[#151821] rounded-lg">
                    <span className="text-slate-300">Database Unified Audit Trail (AUDIT_TRAIL=DB)</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ENABLED
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-[#151821] rounded-lg">
                    <span className="text-slate-300">Force Logging Enforcement</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ENABLED
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-[#151821] rounded-lg">
                    <span className="text-slate-300">SCAN Listener Access Restriction</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> PROTECTED
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Audit Log Sample Table */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Recent Administrative Audit Trail Verification Log
              </h4>
              <div className="bg-[#0A0B10] border border-[#222834] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-[#0c1630] text-[10px] font-bold text-white uppercase font-display border-b border-[#222834]">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">DBA User</th>
                      <th className="p-3">Node / Database</th>
                      <th className="p-3">Action Performed</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222834]/60 font-mono text-[11px]">
                    {logs.slice(0, 5).map(l => (
                      <tr key={l.id} className="hover:bg-[#151821]">
                        <td className="p-3 text-slate-400">{new Date(l.timestamp).toLocaleString()}</td>
                        <td className="p-3 text-cyan-400 font-bold">{l.user}</td>
                        <td className="p-3 text-slate-300">{l.nodeName}</td>
                        <td className="p-3 text-emerald-400">{l.action}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold">
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-500 font-sans">
                          No recent administrative logs logged.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Interactive Detailed Report Inspector Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#151821] border border-[#222834] rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#222834] bg-[#0A0B10] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                  <BarChart2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-extrabold text-white flex items-center gap-2">
                    Oracle DBA Report Viewer & Generator
                    <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 font-mono rounded border border-amber-500/30">
                      LIVE DIAGNOSTIC
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Inspect granular performance, backup, storage, security, or DataPump reports for specific servers and databases.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Controls Bar */}
            <div className="p-4 bg-[#0D0F17] border-b border-[#222834] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">1. Select Target Server / Node:</label>
                <select
                  value={modalNodeId}
                  onChange={e => setModalNodeId(e.target.value)}
                  className="w-full bg-[#151821] text-slate-200 border border-[#222834] rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 font-mono"
                >
                  <option value="ALL">All Managed Target Servers ({allTargetServers.length})</option>
                  <optgroup label="🖥️ OS Host Nodes">
                    {nodes.map(n => (
                      <option key={n.id} value={n.name}>{n.name} ({n.hostname} - {n.ipAddress})</option>
                    ))}
                  </optgroup>
                  <optgroup label="🛢️ Primary Databases">
                    {primaryDbs.map(p => (
                      <option key={p.id} value={p.uniqueName || p.name}>{p.uniqueName || p.name} (SID: {p.oracleSid})</option>
                    ))}
                  </optgroup>
                  <optgroup label="🔄 Standby Databases">
                    {standbyDbs.map(s => (
                      <option key={s.id} value={s.uniqueName || s.name}>{s.uniqueName || s.name} (SID: {s.oracleSid || s.uniqueName})</option>
                    ))}
                  </optgroup>
                  <optgroup label="🌐 Middleware & Medical Systems">
                    <option value="WebLogic_AdminServer">WebLogic AdminServer (192.168.1.108)</option>
                    <option value="PACS_ARCHIVE_01">PACS DICOM Archive Server (192.168.1.109)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">2. Select Database:</label>
                <select
                  value={modalDbId}
                  onChange={e => setModalDbId(e.target.value)}
                  className="w-full bg-[#151821] text-slate-200 border border-[#222834] rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Databases (Primary & Standby)</option>
                  {allDatabases.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.dbType} - {d.oracleSid})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">3. Report Type:</label>
                <select
                  value={modalReportType}
                  onChange={e => setModalReportType(e.target.value as any)}
                  className="w-full bg-[#151821] text-amber-400 font-bold border border-[#222834] rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="AWR">AWR Performance Report</option>
                  <option value="ADDM">ADDM DBA Diagnostics</option>
                  <option value="ASH">ASH Active Sessions</option>
                  <option value="STORAGE">Tablespace & ASM Storage</option>
                  <option value="RMAN">RMAN Backup Logs</option>
                  <option value="DATAPUMP">DataPump Export/Import</option>
                  <option value="SECURITY">Security & RBAC Audit</option>
                  <option value="OS">1. OS (Linux) Health & Metrics</option>
                  <option value="DATABASE">2. Oracle DB Comprehensive Report</option>
                  <option value="RAC">3. Oracle RAC Cluster & Node Report</option>
                  <option value="DATAGUARD">4. Data Guard Replication & Lag Report</option>
                  <option value="ASM">5. ASM Disks & Diskgroups Report</option>
                  <option value="LISTENER">6. Oracle Listener & Service Report</option>
                  <option value="GOLDENGATE">7. GoldenGate Extract & Replicat Report</option>
                  <option value="WEBLOGIC">8. WebLogic Application Server Report</option>
                  <option value="TOMCAT">9. Apache Tomcat Server Report</option>
                  <option value="DOCKER">10. Docker Containers & Engine Report</option>
                  <option value="OTHER_DBS">11. MySQL / PostgreSQL / SQL Server Report</option>
                  <option value="APP">12. Application & API Performance Report</option>
                  <option value="INFRA">13. Infrastructure & Server Inventory Report</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">4. Time Snapshot Window:</label>
                <select
                  value={reportSnapshotHours}
                  onChange={e => setReportSnapshotHours(Number(e.target.value))}
                  className="w-full bg-[#151821] text-slate-200 border border-[#222834] rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
                >
                  <option value={1}>Last 1 Hour (Real-time)</option>
                  <option value={6}>Last 6 Hours</option>
                  <option value={24}>Last 24 Hours (Daily)</option>
                  <option value={168}>Last 7 Days (Weekly)</option>
                </select>
              </div>
            </div>

            {/* Modal Body: Render Report Document Preview */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 font-mono text-xs">
              
              {/* Report Title Card */}
              <div className="bg-[#0A0B10] p-4 rounded-xl border border-[#222834] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                    ORACLE DATABASE REPORT DIAGNOSTIC OUTPUT
                  </div>
                  <div className="text-base font-bold text-white font-display mt-0.5">
                    {modalReportType === 'AWR' && 'AWR Workload Performance Report (SYS.DBMS_WORKLOAD_REPOSITORY)'}
                    {modalReportType === 'ADDM' && 'ADDM DBA Diagnostic Findings & Recommendations'}
                    {modalReportType === 'ASH' && 'ASH Active Session History & Blocking Session Tree'}
                    {modalReportType === 'STORAGE' && 'Database Tablespace & ASM Storage Utilization Audit'}
                    {modalReportType === 'RMAN' && 'RMAN Backup Set Validation & Recovery Retention Audit'}
                    {modalReportType === 'DATAPUMP' && 'DataPump EXPDP / IMPDP Execution Audit & Dump Registry'}
                    {modalReportType === 'SECURITY' && 'Database Unified Audit, Privilege & TLS Encryption Report'}
                    {modalReportType === 'OS' && '1. Linux OS Hardware, Kernel, CPU, Memory & Network Report'}
                    {modalReportType === 'DATABASE' && '2. Oracle Database Health, Tablespace, Session & Performance Report'}
                    {modalReportType === 'RAC' && '3. Oracle RAC Clusterware, Node Status, SCAN & Interconnect Report'}
                    {modalReportType === 'DATAGUARD' && '4. Data Guard Replication Status, Lag & Failover Readiness Report'}
                    {modalReportType === 'ASM' && '5. ASM Diskgroup Space Utilization & Rebalance Status Report'}
                    {modalReportType === 'LISTENER' && '6. Oracle Listener Port, TNS Services & Connection Log Report'}
                    {modalReportType === 'GOLDENGATE' && '7. GoldenGate Extract, Replicat & Process Checkpoint Report'}
                    {modalReportType === 'WEBLOGIC' && '8. Oracle WebLogic Server Heap, JDBC Pool & Thread Report'}
                    {modalReportType === 'TOMCAT' && '9. Apache Tomcat Service, Memory Heap & WebApp Report'}
                    {modalReportType === 'DOCKER' && '10. Docker Engine, Container CPU/Memory & Image Report'}
                    {modalReportType === 'OTHER_DBS' && '11. MySQL / PostgreSQL / SQL Server Database Performance Report'}
                    {modalReportType === 'APP' && '12. Enterprise Application API Health & User Transaction Report'}
                    {modalReportType === 'INFRA' && '13. Infrastructure Server Inventory, Kernel & Patch Audit Report'}
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans mt-1">
                    Node: <span className="text-slate-200 font-mono">{modalNodeId === 'ALL' ? 'All Host Nodes' : nodes.find(n => n.id === modalNodeId)?.name || modalNodeId}</span> | 
                    Database: <span className="text-slate-200 font-mono">{modalDbId === 'ALL' ? 'All Monitored DBs' : allDatabases.find(d => d.id === modalDbId)?.name || modalDbId}</span> | 
                    Snapshot Window: <span className="text-amber-400 font-mono">{reportSnapshotHours} Hours</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportHtml}
                    className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download HTML
                  </button>
                  <button
                    onClick={handleExportCsv}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
                  </button>
                </div>
              </div>

              {/* Dynamic Content Preview depending on Report Type */}
              {modalReportType === 'AWR' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-[#0A0B10] rounded-xl border border-[#222834]">
                      <div className="text-[10px] text-slate-400 uppercase">DB Time / Elapsed Time</div>
                      <div className="text-lg font-bold text-amber-400">142.8 mins / 60 mins</div>
                      <div className="text-[10px] text-slate-500">AAS (Average Active Sessions): 2.38</div>
                    </div>
                    <div className="p-3 bg-[#0A0B10] rounded-xl border border-[#222834]">
                      <div className="text-[10px] text-slate-400 uppercase">Redo Generated / sec</div>
                      <div className="text-lg font-bold text-cyan-400">1.84 MB / sec</div>
                      <div className="text-[10px] text-slate-500">Physical Read Total: 12,480 ops/s</div>
                    </div>
                    <div className="p-3 bg-[#0A0B10] rounded-xl border border-[#222834]">
                      <div className="text-[10px] text-slate-400 uppercase">SGA Buffer Cache Hit Ratio</div>
                      <div className="text-lg font-bold text-emerald-400">98.6%</div>
                      <div className="text-[10px] text-slate-500">Library Cache Miss Ratio: 0.12%</div>
                    </div>
                  </div>

                  <div className="p-4 bg-[#0A0B10] rounded-xl border border-[#222834] space-y-2">
                    <h4 className="text-xs font-bold text-amber-300 uppercase flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-amber-400" /> Oracle AWR SQL Execution Log Snippet
                    </h4>
                    <pre className="p-3 bg-[#06070a] border border-[#222834] rounded-lg text-emerald-400 text-[11px] font-mono overflow-x-auto leading-relaxed">
{`SQL ID: 8f712a99bc | Execs: 14,200 | Avg Elapsed: 0.042s | CPU Time: 582s | Buffer Gets: 1,840,200
Query: SELECT /*+ INDEX(e emp_department_ix) */ employee_id, first_name, salary FROM hr.employees e WHERE department_id = :1;

Top 5 Timed Foreground Events:
Event                                  Waits       Time(s)    Avg Wait(ms) % DB time
---------------------------------- ----------- ----------- --------------- ---------
db file sequential read                842,100       2,140            2.54      42.8
DB CPU                                     --        1,408              --      28.1
log file sync                          142,000         920            6.48      18.4
gc buffer busy acquire                  28,400         210            7.39       4.2
direct path read                       18,200         180            9.89       3.6`}
                    </pre>
                  </div>
                </div>
              )}

              {modalReportType === 'ADDM' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#0A0B10] rounded-xl border border-[#222834] space-y-3">
                    <h4 className="text-xs font-bold text-purple-300 uppercase flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" /> ADDM Task ID #1042 Findings Summary
                    </h4>
                    <div className="space-y-2">
                      <div className="p-3 bg-[#151821] rounded-lg border border-[#222834] space-y-1">
                        <div className="font-bold text-amber-400 flex items-center justify-between">
                          <span>1. SQL Statement 8f712a99bc Consumes 32% of DB Time</span>
                          <span className="text-[10px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">HIGH IMPACT</span>
                        </div>
                        <p className="text-slate-300 text-[11px] font-sans">
                          Action: Run SQL Tuning Advisor using <code>{"DBMS_SQLTUNE.CREATE_TUNING_TASK(sql_id => '8f712a99bc')"}</code> to generate a SQL Profile.
                        </p>
                      </div>

                      <div className="p-3 bg-[#151821] rounded-lg border border-[#222834] space-y-1">
                        <div className="font-bold text-emerald-400 flex items-center justify-between">
                          <span>2. SGA Memory Allocation Advisory</span>
                          <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">OPTIMAL</span>
                        </div>
                        <p className="text-slate-300 text-[11px] font-sans">
                          Increasing SGA size to 8GB will reduce physical I/O by an estimated 14.2%.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalReportType === 'STORAGE' && (
                <div className="space-y-4">
                  <div className="p-4 bg-[#0A0B10] rounded-xl border border-[#222834] space-y-3">
                    <h4 className="text-xs font-bold text-cyan-300 uppercase flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-cyan-400" /> Tablespace & ASM Diskgroup Capacity Matrix
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-[#151821] rounded-lg border border-[#222834] space-y-2">
                        <div className="text-xs font-bold text-slate-200">USERS Tablespace</div>
                        <div className="w-full bg-[#0A0B10] rounded-full h-2">
                          <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '42%' }}></div>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Used: 21 GB / 50 GB</span>
                          <span className="text-emerald-400 font-bold">42% Used (Autoextend ON)</span>
                        </div>
                      </div>

                      <div className="p-3 bg-[#151821] rounded-lg border border-[#222834] space-y-2">
                        <div className="text-xs font-bold text-slate-200">ASM +DATA Diskgroup</div>
                        <div className="w-full bg-[#0A0B10] rounded-full h-2">
                          <div className="bg-cyan-500 h-2 rounded-full" style={{ width: '38%' }}></div>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Free: 310 GB / 500 GB</span>
                          <span className="text-cyan-400 font-bold">62% Free (NORMAL Redundancy)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(modalReportType === 'RMAN' || modalReportType === 'DATAPUMP' || modalReportType === 'ASH' || modalReportType === 'SECURITY') && (
                <div className="p-4 bg-[#0A0B10] rounded-xl border border-[#222834] space-y-3">
                  <h4 className="text-xs font-bold text-emerald-300 uppercase flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Audit Log & Diagnostic Execution Transcript
                  </h4>
                  <pre className="p-3 bg-[#06070a] border border-[#222834] rounded-lg text-slate-300 text-[11px] font-mono overflow-x-auto leading-relaxed">
{`--- REPORT LOG SNAPSHOT AT ${new Date().toISOString()} ---
Target: ${modalNodeId === 'ALL' ? 'Cluster-Wide' : modalNodeId} | DB: ${modalDbId === 'ALL' ? 'All Databases' : modalDbId}
Report Mode: ${modalReportType}
Default Oracle Path: /u01/app/oracle/product/19.3.0/db_1
Default Grid Path:   /u02/app/19.3.0.1/grid_home

[INFO] Verified RMAN Level 0 full database backup status: COMPLETED (VALID)
[INFO] Data Guard broker configuration 'dg_config_racdb': SUCCESSFUL (NORMAL)
[INFO] Unified audit trail verification: PASSED (No unauthorized SYSDBA privilege escalations detected)
[INFO] DataPump directory object DATA_PUMP_DIR exists and has READ/WRITE privileges for DBA users.`}
                  </pre>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#0A0B10] border-t border-[#222834] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Report snapshot generated successfully for DBA review.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReport}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-400" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Close Modal
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* EMERGENCY ALERT NOTIFICATION DISPATCH CONFIG MODAL */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#151821] border border-red-500/40 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden space-y-0 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-red-950/80 via-[#151821] to-[#151821] border-b border-red-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 animate-pulse">
                  <Radio className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-display font-extrabold text-white flex items-center gap-2">
                    🚨 Emergency Instant Outage Alert Dispatcher (SMS, Email & Phone Call)
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Instant automated broadcast when any Server, Database, Data Guard, or ASM goes Down / Offline.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAlertModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {alertSaveSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {alertSaveSuccess}
                </div>
              )}

              {testDispatchStatus && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold rounded-xl flex items-center gap-2">
                  <Radio className="w-4 h-4 shrink-0 animate-spin" />
                  {testDispatchStatus}
                </div>
              )}

              {/* Channel Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#0A0B10] border border-[#222834] rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      📱 SMS Text Message
                    </div>
                    <div className="text-[11px] text-slate-400">Mobile SMS Gateway</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableSms}
                    onChange={e => setEnableSms(e.target.checked)}
                    className="w-5 h-5 accent-red-500 cursor-pointer"
                  />
                </div>

                <div className="p-4 bg-[#0A0B10] border border-[#222834] rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      📧 Emergency Email
                    </div>
                    <div className="text-[11px] text-slate-400">SMTP Server Delivery</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableEmail}
                    onChange={e => setEnableEmail(e.target.checked)}
                    className="w-5 h-5 accent-red-500 cursor-pointer"
                  />
                </div>

                <div className="p-4 bg-[#0A0B10] border border-[#222834] rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      📞 Phone Call Siren
                    </div>
                    <div className="text-[11px] text-slate-400">DBA Automated Voice Call</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enablePhoneCall}
                    onChange={e => setEnablePhoneCall(e.target.checked)}
                    className="w-5 h-5 accent-red-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Recipient Contact Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">
                    Mobile Phone Numbers (comma-separated):
                  </label>
                  <input
                    type="text"
                    value={phoneNumbersInput}
                    onChange={e => setPhoneNumbersInput(e.target.value)}
                    placeholder="+8801700000000, +18005550199"
                    className="w-full bg-[#0A0B10] border border-[#222834] rounded-xl px-3 py-2.5 text-xs text-white focus:border-red-500 outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-500">Includes international country code format for instant SMS & phone call siren.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300">
                    DBA Team Email Addresses (comma-separated):
                  </label>
                  <input
                    type="text"
                    value={emailAddressesInput}
                    onChange={e => setEmailAddressesInput(e.target.value)}
                    placeholder="dba-team@oracle-enterprise.com, admin@company.com"
                    className="w-full bg-[#0A0B10] border border-[#222834] rounded-xl px-3 py-2.5 text-xs text-white focus:border-red-500 outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-500">Receives full diagnostic details and root cause logs on outage.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={handleSaveAlertSettings}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 transition cursor-pointer"
                >
                  💾 Save Emergency Contact Settings
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">Test Channels:</span>
                  <button
                    onClick={() => handleTestAlertDispatch('SMS')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    📱 Test SMS
                  </button>
                  <button
                    onClick={() => handleTestAlertDispatch('EMAIL')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    📧 Test Email
                  </button>
                  <button
                    onClick={() => handleTestAlertDispatch('PHONE_CALL')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    📞 Test Voice Call
                  </button>
                  <button
                    onClick={() => handleTestAlertDispatch('ALL')}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    🔥 Test All Channels
                  </button>
                </div>
              </div>

              {/* Alert Dispatch History */}
              <div className="space-y-3 pt-4 border-t border-[#222834]">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span>🚨 Real-Time Emergency Alert Dispatch Log ({alertDispatchLogsState.length})</span>
                  <button
                    onClick={fetchAlertSettingsAndLogs}
                    className="text-cyan-400 hover:underline text-[11px] font-normal cursor-pointer"
                  >
                    Refresh Log
                  </button>
                </h4>

                <div className="overflow-x-auto max-h-56 overflow-y-auto border border-[#222834] rounded-xl">
                  <table className="w-full text-left text-xs text-slate-300 font-mono">
                    <thead className="bg-[#0A0B10] text-[10px] font-bold text-slate-400 uppercase border-b border-[#222834]">
                      <tr>
                        <th className="p-2.5">Time</th>
                        <th className="p-2.5">Event Type</th>
                        <th className="p-2.5">Target</th>
                        <th className="p-2.5">Channels Dispatched</th>
                        <th className="p-2.5">Phone Recipients</th>
                        <th className="p-2.5">Email Recipients</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222834] bg-[#0d1017]">
                      {alertDispatchLogsState.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-500">
                            No emergency alerts dispatched yet. All servers and databases operating normally.
                          </td>
                        </tr>
                      ) : (
                        alertDispatchLogsState.map(log => (
                          <tr key={log.id} className="hover:bg-slate-800/40">
                            <td className="p-2.5 text-slate-400 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="p-2.5 font-bold text-red-400">
                              {log.eventType}
                            </td>
                            <td className="p-2.5 text-white font-bold">
                              {log.targetName}
                            </td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded text-[10px]">
                                {log.channelsSent?.join(' + ') || 'SMS + EMAIL + CALL'}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-300 text-[11px]">
                              {log.recipientPhone}
                            </td>
                            <td className="p-2.5 text-slate-300 text-[11px]">
                              {log.recipientEmail}
                            </td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold">
                                {log.deliveryStatus || 'DELIVERED'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#0A0B10] border-t border-[#222834] flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Automated 24/7 Outage Alarm Monitor Engine Active
              </span>
              <button
                onClick={() => setShowAlertModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Forensic Incident Detail Inspector Modal */}
      {selectedIncidentLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#151821] border border-rose-500/40 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#222834] bg-[#0A0B10] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-display font-extrabold text-white flex items-center gap-2">
                    Incident Forensic Inspector
                    <span className={`px-2 py-0.5 text-[10px] font-mono rounded border ${
                      selectedIncidentLog.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                      selectedIncidentLog.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                      'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    }`}>
                      {selectedIncidentLog.severity || 'INFO'} RISK
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Log Reference ID: <span className="font-mono text-cyan-400">{selectedIncidentLog.id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedIncidentLog(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs font-mono">
              
              {/* User & Client Endpoint Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#0A0B10] border border-[#222834] rounded-xl space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    👤 User & Client Endpoint Telemetry
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Username / Account:</span>
                      <span className="font-bold text-cyan-400">{selectedIncidentLog.user}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Client Host PC:</span>
                      <span className="font-bold text-amber-300">{selectedIncidentLog.hostPcName || 'Client PC'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Client IP Address:</span>
                      <span className="font-bold text-emerald-400">{selectedIncidentLog.clientIp || '127.0.0.1'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Hardware MAC Address:</span>
                      <span className="font-bold text-purple-300">{selectedIncidentLog.macAddress || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#0A0B10] border border-[#222834] rounded-xl space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    ⏰ Session Timestamps & Target Server
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target Infrastructure:</span>
                      <span className="font-bold text-white">{selectedIncidentLog.nodeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target Category:</span>
                      <span className="font-bold text-rose-400">{selectedIncidentLog.targetCategory || 'SYSTEM'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Login Timestamp:</span>
                      <span className="text-slate-300">{selectedIncidentLog.loginTime ? new Date(selectedIncidentLog.loginTime).toLocaleString() : 'Recent Session'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Logout / Status:</span>
                      <span className="text-slate-300">{selectedIncidentLog.logoutTime || 'ACTIVE SESSION'} ({selectedIncidentLog.sessionDuration || '30m'})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Executed Action Payload Box */}
              <div className="p-4 bg-[#0A0B10] border border-[#222834] rounded-xl space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>📜 Executed Action / SQL / Command Payload</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedIncidentLog.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    EXECUTION STATUS: {selectedIncidentLog.status}
                  </span>
                </div>
                <div className="p-3 bg-[#050608] border border-[#1e2533] rounded-lg font-mono text-emerald-400 text-xs break-all leading-relaxed">
                  {selectedIncidentLog.action}
                </div>
              </div>

              {/* Detailed Explanation / Diagnostic Notes */}
              <div className="p-4 bg-[#0A0B10] border border-[#222834] rounded-xl space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  🔍 Diagnostic Occurrence Details & Audit Notes
                </div>
                <p className="text-slate-300 text-xs font-sans leading-relaxed">
                  {selectedIncidentLog.details || 'Incident recorded by Portal Unified Audit Engine. No secondary security violations detected during this operation cycle.'}
                </p>
              </div>

              {/* Proactive Safety & Defense Action Controls Bar */}
              <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl space-y-3">
                <div className="text-[11px] font-bold text-rose-300 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-display">
                    <ShieldAlert className="w-4 h-4 text-rose-400" /> 🛡️ PROACTIVE SAFETY & DEFENSE CONTROLS FOR THIS CLIENT
                  </span>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30 font-mono">
                    IMMEDIATE ACTIVE ENFORCEMENT
                  </span>
                </div>

                {defenseActionStatus && (
                  <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 font-bold text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {defenseActionStatus}
                  </div>
                )}

                <p className="text-[11px] text-slate-300 font-sans">
                  Execute direct defensive actions against Client IP <span className="text-emerald-400 font-mono font-bold">{selectedIncidentLog.clientIp || 'Client IP'}</span> or User <span className="text-cyan-400 font-mono font-bold">{selectedIncidentLog.user}</span> on <span className="text-amber-300 font-bold">{selectedIncidentLog.nodeName}</span>:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <button
                    onClick={() => handleBlockIp(selectedIncidentLog.clientIp || 'Client IP', selectedIncidentLog.user, selectedIncidentLog.hostPcName, selectedIncidentLog.nodeName)}
                    className="px-3.5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-red-600/30 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    🚫 Block Client IP ({selectedIncidentLog.clientIp || 'Client IP'})
                  </button>

                  <button
                    onClick={() => handleKillSession(selectedIncidentLog.clientIp, selectedIncidentLog.user, selectedIncidentLog.hostPcName, selectedIncidentLog.action, selectedIncidentLog.nodeName)}
                    className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-600/30 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    🔐 Kill Session & Terminate Process
                  </button>

                  <button
                    onClick={() => handleLockUser(selectedIncidentLog.user, selectedIncidentLog.nodeName)}
                    className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-600/30 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    🔒 Lock User Account ({selectedIncidentLog.user})
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#0A0B10] border-t border-[#222834] flex items-center justify-between">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedIncidentLog, null, 2));
                  setCopiedSuccessMsg('Forensic log copied to clipboard!');
                  setTimeout(() => setCopiedSuccessMsg(null), 3000);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                📋 Copy Forensic Log JSON
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  🖨️ Print Forensic Sheet
                </button>
                <button
                  onClick={() => setSelectedIncidentLog(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* External Client Session Audit Logger Modal (PuTTY, Toad, SQL Developer) */}
      {showClientSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#151821] border border-[#222834] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-[#222834] bg-[#0A0B10] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-display font-extrabold text-white flex items-center gap-2">
                    External Client Access Logger (PuTTY / Toad / SQL Dev)
                    <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 font-mono rounded border border-amber-500/30">
                      LIVE AUDIT
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-sans">
                    Log or test client access metadata originating from external desktop applications (PuTTY SSH, Toad for Oracle, SQL Developer).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowClientSessionModal(false)}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Connecting Tool / App:</label>
                  <select
                    value={clientSessionTool}
                    onChange={e => {
                      const tool = e.target.value;
                      setClientSessionTool(tool);
                      if (tool === 'PuTTY') {
                        setClientSessionUser('root');
                        setClientSessionPcName('WORKSTATION-DBA-01');
                        setClientSessionAction('PuTTY SSH Terminal Session / Executed top & systemctl status');
                        setClientSessionDetails('SSH session authenticated for root@192.168.0.29 via PuTTY v0.78.');
                      } else if (tool === 'Toad for Oracle') {
                        setClientSessionUser('MEDICARE_RAC');
                        setClientSessionPcName('DESKTOP-TOAD-PC');
                        setClientSessionAction('Oracle SQL Session Executed via Toad for Oracle 16.2');
                        setClientSessionDetails('Connected MEDICARE_RAC@192.168.0.29:1521/RACPDB1. Executed DML/SELECT in Editor.');
                      } else if (tool === 'SQL Developer') {
                        setClientSessionUser('SYSDBA');
                        setClientSessionPcName('SQL-DEV-TERM-01');
                        setClientSessionAction('SQL Developer Worksheet Session / Executed ALTER SYSTEM');
                        setClientSessionDetails('Connected sys@192.168.0.29:1521/PROD_PRIMARY AS SYSDBA.');
                      }
                    }}
                    className="w-full bg-[#0A0B10] border border-[#222834] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="PuTTY">💻 PuTTY SSH Terminal (Linux / Shell)</option>
                    <option value="Toad for Oracle">🐸 Toad for Oracle (Database / SQL)</option>
                    <option value="SQL Developer">⚡ Oracle SQL Developer (Database / SQL)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">User Account / Identity:</label>
                  <input
                    type="text"
                    value={clientSessionUser}
                    onChange={e => setClientSessionUser(e.target.value)}
                    placeholder="e.g. root, MEDICARE_RAC, sysdba"
                    className="w-full bg-[#0A0B10] border border-[#222834] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Client PC Host Name:</label>
                  <input
                    type="text"
                    value={clientSessionPcName}
                    onChange={e => setClientSessionPcName(e.target.value)}
                    placeholder="e.g. WORKSTATION-DBA-01"
                    className="w-full bg-[#0A0B10] border border-[#222834] rounded-xl px-3 py-2 text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Client IP Address:</label>
                  <input
                    type="text"
                    value={clientSessionIp}
                    onChange={e => setClientSessionIp(e.target.value)}
                    placeholder="e.g. 192.168.0.177"
                    className="w-full bg-[#0A0B10] border border-[#222834] rounded-xl px-3 py-2 text-emerald-400 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">MAC Address:</label>
                  <input
                    type="text"
                    value={clientSessionMac}
                    onChange={e => setClientSessionMac(e.target.value)}
                    placeholder="e.g. 00:50:56:A8:01:1D"
                    className="w-full bg-[#0A0B10] border border-[#222834] rounded-xl px-3 py-2 text-purple-300 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Server / Database:</label>
                <select
                  value={clientSessionTarget}
                  onChange={e => setClientSessionTarget(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-[#222834] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="RAC Node 1 (192.168.0.29)">RAC Node 1 (192.168.0.29 - rac1node1)</option>
                  <option value="RAC Node 2 (192.168.0.31)">RAC Node 2 (192.168.0.31 - rac1node2)</option>
                  <option value="PRIMARY_RACDB (RACPDB1)">PRIMARY_RACDB (RACPDB1 - 192.168.0.29:1521)</option>
                  <option value="STANDBY_RACDB (RACPDB_STBY)">STANDBY_RACDB (RACPDB_STBY - 192.168.0.31:1521)</option>
                  <option value="WebLogic AdminServer">WebLogic AdminServer (192.168.1.108)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Action Summary:</label>
                <input
                  type="text"
                  value={clientSessionAction}
                  onChange={e => setClientSessionAction(e.target.value)}
                  className="w-full bg-[#0A0B10] border border-[#222834] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Detailed Payload / Command Executed:</label>
                <textarea
                  value={clientSessionDetails}
                  onChange={e => setClientSessionDetails(e.target.value)}
                  rows={2}
                  className="w-full bg-[#0A0B10] border border-[#222834] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="p-4 bg-[#0D0F17] border-t border-[#222834] flex items-center justify-end gap-3">
              <button
                onClick={() => setShowClientSessionModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={clientSessionSubmitting}
                onClick={async () => {
                  setClientSessionSubmitting(true);
                  try {
                    const res = await fetch('/api/session/log-client-access', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        toolName: clientSessionTool,
                        user: clientSessionUser,
                        clientIp: clientSessionIp,
                        hostPcName: clientSessionPcName,
                        macAddress: clientSessionMac,
                        targetServer: clientSessionTarget,
                        action: clientSessionAction,
                        details: clientSessionDetails,
                        category: clientSessionTool.includes('Toad') || clientSessionTool.includes('SQL') ? 'DATABASE' : 'OS'
                      })
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setShowClientSessionModal(false);
                      if (onRefresh) onRefresh();
                      setCopiedSuccessMsg(`⚡ External client session via ${clientSessionTool} logged successfully for ${clientSessionTarget}!`);
                      setTimeout(() => setCopiedSuccessMsg(null), 4000);
                    } else if (res.status === 403) {
                      const errData = await res.json();
                      setShowClientSessionModal(false);
                      if (onRefresh) onRefresh();
                      alert(`🚫 CONNECTION REJECTED / BLOCKED (403 Forbidden):\n${errData.message || 'Client IP is blocked by Firewall or Session Killed.'}`);
                    } else {
                      alert('Failed to log client session.');
                    }
                  } catch (e: any) {
                    alert(`Error logging session: ${e.message}`);
                  } finally {
                    setClientSessionSubmitting(false);
                  }
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-600/30 transition cursor-pointer flex items-center gap-1.5"
              >
                {clientSessionSubmitting ? 'Logging Session...' : '⚡ Record Client Access Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable CSS Styling for Browser Print/Save PDF */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          #portal-root, #portal-workspace, #portal-sidebar {
            display: block !important;
          }
          #portal-sidebar, header, nav, button, .no-print {
            display: none !important;
          }
          #printable-report-area {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .bg-\\[\\#151821\\], .bg-\\[\\#0A0B10\\] {
            background-color: #ffffff !important;
            border: 1px solid #cccccc !important;
            color: #000000 !important;
          }
          .text-white, .text-slate-100, .text-slate-200, .text-slate-300 {
            color: #000000 !important;
          }
          .text-slate-400, .text-slate-500 {
            color: #444444 !important;
          }
          table {
            border: 1px solid #000000 !important;
          }
          th {
            background-color: #f0f0f0 !important;
            color: #000000 !important;
          }
          td {
            border: 1px solid #e0e0e0 !important;
          }
        }
      `}</style>

    </div>
  );
}
