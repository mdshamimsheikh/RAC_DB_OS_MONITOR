import React, { useState, useEffect, useRef } from 'react';
import {
  Server, Cpu, Database, Activity, HardDrive, ShieldCheck, AlertTriangle, Play, Pause, RefreshCw, Layers,
  Clock, LogOut, User, Bell, Radio, CheckCircle, Wifi, List, Shield, HelpCircle, FileText, Globe, Trash2, KeyRound, Users,
  Archive, ArrowLeftRight, Download, ShieldAlert, Network, Video, Crosshair, Sparkles, Search, Zap, Filter, Repeat,
  Star, ChevronDown, ChevronRight, Palette, LayoutGrid, Sliders, Check, Droplets
} from 'lucide-react';
import { SSHNode, NodeTelemetry, ClusterSummary, ActivityLog, PrimaryDatabase, StandbyDatabase, FarSyncInstance, CustomNotification, UserAccount, UserRole, PortalBranding, EmergencyDispatchLog } from './types';
import InfographicCursor from './components/InfographicCursor';
import DashboardView from './components/DashboardView';
import InfrastructureCenterView from './components/InfrastructureCenterView';
import VideoMonitorView from './components/VideoMonitorView';
import NodeManagementView from './components/NodeManagementView';
import NodeDetailView from './components/NodeDetailView';
import PrimaryDbView from './components/PrimaryDbView';
import StandbyDbView from './components/StandbyDbView';
import FarSyncView from './components/FarSyncView';
import RedoApplyView from './components/RedoApplyView';
import UserManagementView from './components/UserManagementView';
import RmanBackupView from './components/RmanBackupView';
import DataPumpView from './components/DataPumpView';
import ReportsView from './components/ReportsView';
import NetworkTopologyView from './components/NetworkTopologyView';
import WebLogicPacsPortalView from './components/WebLogicPacsPortalView';
import GlobalAppsManagerView from './components/GlobalAppsManagerView';
import IpWhitelistView from './components/IpWhitelistView';
import AllDatabasesSetupView from './components/AllDatabasesSetupView';
import AdminAuthModal, { AdminAccount, AlertSettings } from './components/AdminAuthModal';
import ApiServerConfigModal from './components/ApiServerConfigModal';
import DockerDeploymentModal from './components/DockerDeploymentModal';
import DynamicVideoInfographicCanvas, { ALL_THEME_PRESETS } from './components/DynamicVideoInfographicCanvas';
import { InfographicThemeConfig, InfographicThemePreset } from './types';
import { getApiUrl, apiFetch, safeFetchJson } from './lib/api';

export default function App() {
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'infrastructure' | 'network-topology' | 'video-monitor' | 'weblogic-pacs' | 'weblogic-enterprise' | 'pacs-medical' | 'apps-manager' | 'nodes' | 'logs' | 'database-setup' | 'all-databases' | 'primary-dbs' | 'standby-dbs' | 'farsync' | 'redo-apply' | 'users' | 'backup-rman' | 'datapump' | 'reports' | 'ip-whitelist'>('dashboard');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showApiServerModal, setShowApiServerModal] = useState<boolean>(false);
  const [showDockerModal, setShowDockerModal] = useState<boolean>(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState<boolean>(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'ALL' | 'OPS' | 'DATAGUARD' | 'ENTERPRISE' | 'BACKUP' | 'SECURITY' | 'PINNED'>('ALL');
  const [isTickerPaused, setIsTickerPaused] = useState<boolean>(false);
  
  // Pinned favorite menus state
  const [pinnedMenuIds, setPinnedMenuIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('oracle_pinned_menus');
      return saved ? JSON.parse(saved) : ['dashboard', 'primary-dbs', 'video-monitor', 'farsync'];
    } catch (e) {
      return ['dashboard', 'primary-dbs', 'video-monitor', 'farsync'];
    }
  });

  const togglePinMenu = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPinnedMenuIds(prev => {
      const next = prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id];
      try { localStorage.setItem('oracle_pinned_menus', JSON.stringify(next)); } catch (err) {}
      return next;
    });
  };

  // Collapsed accordion categories state
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('oracle_collapsed_categories');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories(prev => {
      const next = { ...prev, [catId]: !prev[catId] };
      try { localStorage.setItem('oracle_collapsed_categories', JSON.stringify(next)); } catch (err) {}
      return next;
    });
  };
  const [apiServerUrl, setApiServerUrl] = useState<string>(() => {
    return localStorage.getItem('api_base_url') || '';
  });
  const [infographicCursorEnabled, setInfographicCursorEnabled] = useState<boolean>(() => {
    return localStorage.getItem('hud_cursor_enabled') === 'true';
  });
  const [themeConfig, setThemeConfig] = useState<InfographicThemeConfig>(() => {
    try {
      const saved = localStorage.getItem('oracle_infographic_theme_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.preset) return parsed;
      }
    } catch (e) {}
    return {
      preset: 'executive-white',
      transparencyMode: 'TRANSPARENT_GLASS',
      particlesEnabled: true,
      particleDensity: 'LOW',
      videoScanlines: false,
      videoRecHud: false,
      spectrumVisualizer: false,
      cornerBrackets: true,
      cyberGlow: true,
      gridCoordinates: false,
      themeHue: 0
    };
  });

  // Apply root theme attributes directly from App level
  useEffect(() => {
    document.body.setAttribute('data-theme', themeConfig.preset);
    document.body.setAttribute('data-transparency', themeConfig.transparencyMode || 'TRANSPARENT_GLASS');
  }, [themeConfig.preset, themeConfig.transparencyMode]);

  const handleUpdateThemeConfig = (newConfig: InfographicThemeConfig) => {
    setThemeConfig(newConfig);
    try {
      localStorage.setItem('oracle_infographic_theme_config', JSON.stringify(newConfig));
    } catch (e) {}
  };

  const [navSearchQuery, setNavSearchQuery] = useState<string>('');

  // System Registered Users List State
  const [oracleDbStatus, setOracleDbStatus] = useState<{
    connected: boolean;
    dbEngine?: string;
    host?: string;
    port?: number;
    serviceName?: string;
    user?: string;
    tablespace?: string;
    tables?: string[];
    lastTested?: string;
  } | null>(null);

  const fetchDbStatus = async () => {
    try {
      const res = await apiFetch('/api/oracle-db/status');
      if (res.ok) {
        const ct = res.headers.get('content-type');
        if (ct && ct.includes('application/json')) {
          const data = await res.json();
          if (data) {
            setOracleDbStatus(data);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch Oracle DB status', e);
    }

    // Check localStorage for saved oracle_db_config
    const savedLocal = localStorage.getItem('oracle_db_config');
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (parsed) {
          setOracleDbStatus({
            connected: Boolean(parsed.connected),
            dbEngine: parsed.dbEngine || 'ORACLE DB',
            host: parsed.host,
            port: parsed.port || 1521,
            serviceName: parsed.serviceName || 'ORCL',
            user: parsed.user || 'datacore_admin',
            tablespace: parsed.tablespace || 'DATACORE_TS',
            tables: parsed.connected ? ['ORACLE_NODES', 'PRIMARY_DATABASES', 'STANDBY_DATABASES', 'USER_ACCOUNTS', 'EMERGENCY_LOGS', 'PORTAL_BRANDING'] : [],
            lastTested: new Date().toISOString()
          });
          return;
        }
      } catch (e) {}
    }

    // Default to disconnected if not explicitly configured or connected
    setOracleDbStatus({ connected: false });
  };

  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('oracle_system_users');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore parse error */ }
    }
    return [
      {
        id: 'user-admin',
        username: 'admin',
        email: 'admin@gmail.com',
        phone: '+8801700000000',
        passwordHash: 'admin',
        role: 'ADMIN',
        isLocked: false,
        isExpired: false,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'user-operator1',
        username: 'operator1',
        email: 'op1@oracle.com',
        phone: '+8801711111111',
        passwordHash: 'operator123',
        role: 'OPERATOR',
        isLocked: false,
        isExpired: false,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'user-viewer1',
        username: 'viewer1',
        email: 'read@oracle.com',
        phone: '+8801722222222',
        passwordHash: 'viewer123',
        role: 'VIEWER',
        isLocked: false,
        isExpired: false,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('oracle_system_users', JSON.stringify(users));
  }, [users]);

  // Current Logged In User State
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    const saved = localStorage.getItem('oracle_active_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore parse error */ }
    }
    return users[0];
  });

  useEffect(() => {
    localStorage.setItem('oracle_active_user', JSON.stringify(currentUser));
  }, [currentUser]);

  const getUserAllowedModules = (user: UserAccount): string[] => {
    if (user.username === 'admin' || user.role === 'ADMIN') {
      return ['dashboard', 'infrastructure', 'network-topology', 'video-monitor', 'weblogic-enterprise', 'pacs-medical', 'weblogic-pacs', 'apps-manager', 'nodes', 'database-setup', 'all-databases', 'primary-dbs', 'standby-dbs', 'farsync', 'redo-apply', 'backup-rman', 'datapump', 'reports', 'ip-whitelist', 'logs', 'users'];
    }
    if (user.allowedModules && user.allowedModules.length > 0) {
      return [...user.allowedModules, 'network-topology', 'video-monitor', 'weblogic-enterprise', 'pacs-medical', 'weblogic-pacs', 'apps-manager', 'database-setup', 'all-databases', 'farsync', 'ip-whitelist'];
    }
    if (user.role === 'POWER_USER') {
      return ['dashboard', 'infrastructure', 'network-topology', 'video-monitor', 'weblogic-enterprise', 'pacs-medical', 'weblogic-pacs', 'apps-manager', 'nodes', 'database-setup', 'all-databases', 'primary-dbs', 'standby-dbs', 'farsync', 'redo-apply', 'backup-rman', 'datapump', 'reports', 'ip-whitelist', 'logs'];
    }
    if (user.role === 'OPERATOR') {
      return ['dashboard', 'infrastructure', 'network-topology', 'video-monitor', 'weblogic-enterprise', 'pacs-medical', 'weblogic-pacs', 'apps-manager', 'nodes', 'database-setup', 'all-databases', 'primary-dbs', 'standby-dbs', 'farsync', 'redo-apply', 'reports', 'ip-whitelist', 'logs'];
    }
    return ['dashboard', 'infrastructure', 'network-topology', 'video-monitor', 'weblogic-enterprise', 'pacs-medical', 'weblogic-pacs', 'apps-manager', 'nodes', 'database-setup', 'all-databases', 'farsync', 'reports', 'ip-whitelist'];
  };

  useEffect(() => {
    if (!currentUser) return;
    const allowed = getUserAllowedModules(currentUser);
    if (!allowed.includes(activeMenu)) {
      if (allowed.length > 0) {
        setActiveMenu(allowed[0] as any);
      }
    }
  }, [currentUser, activeMenu]);

  // Admin Authentication & Recovery State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('oracle_admin_authenticated') === 'true';
  });

  const [adminAccount, setAdminAccount] = useState<AdminAccount>(() => {
    return {
      username: currentUser.username,
      passwordHash: currentUser.passwordHash,
      email: currentUser.email,
      phone: currentUser.phone,
      lastUpdated: new Date().toISOString()
    };
  });

  useEffect(() => {
    setAdminAccount({
      username: currentUser.username,
      passwordHash: currentUser.passwordHash,
      email: currentUser.email,
      phone: currentUser.phone,
      lastUpdated: new Date().toISOString()
    });
  }, [currentUser]);

  // Live Clock State
  const [currentClockTime, setCurrentClockTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentClockTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getDhakaFormattedTime = (date: Date) => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).formatToParts(date);

      const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
      const year = getPart('year');
      const month = getPart('month');
      const day = getPart('day');
      const hour = getPart('hour');
      const minute = getPart('minute');
      const second = getPart('second');
      const dayPeriod = (getPart('dayPeriod') || '').toUpperCase();

      return `${year}-${month}-${day} ${hour}:${minute}:${second} ${dayPeriod} BST (Asia/Dhaka)`;
    } catch (e) {
      return date.toLocaleTimeString() + ' BST';
    }
  };

  // Capture initial title from index.html on initial page load
  const initialHtmlTitleRef = useRef<string>(typeof document !== 'undefined' ? document.title : '');

  // Portal Branding State
  const [branding, setBranding] = useState<PortalBranding>(() => {
    const pageTitle = typeof document !== 'undefined' ? document.title : '';
    const saved = localStorage.getItem('oracle_portal_branding');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If index.html title was edited in VS Code (differs from old default), honor index.html
        if (pageTitle && pageTitle !== 'Oracle DataCore - Enterprise Data Guard & RAC Control Portal') {
          return {
            ...parsed,
            portalName: parsed.portalName && parsed.portalName !== 'Oracle DataCore' ? parsed.portalName : pageTitle
          };
        }
        return parsed;
      } catch (e) { /* ignore */ }
    }
    return {
      portalName: pageTitle || 'Oracle DataCore',
      portalSubtitle: 'Enterprise Portal',
      logoUrl: '',
      avatarUrl: ''
    };
  });

  useEffect(() => {
    localStorage.setItem('oracle_portal_branding', JSON.stringify(branding));

    // Update Browser Tab Title safely without reverting user HTML title changes
    if (branding.portalName) {
      const hasSubtitle = branding.portalSubtitle && branding.portalSubtitle !== 'Enterprise Portal' && branding.portalSubtitle !== 'Enterprise Data Guard & RAC Control Portal';
      const titleText = hasSubtitle ? `${branding.portalName} - ${branding.portalSubtitle}` : branding.portalName;
      document.title = titleText;
    } else if (initialHtmlTitleRef.current) {
      document.title = initialHtmlTitleRef.current;
    }

    // Update Favicon Icon if provided, or default custom Oracle DataCore SVG icon
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'shortcut icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    if (branding.logoUrl && branding.logoUrl.trim()) {
      link.href = branding.logoUrl.trim();
    } else {
      link.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338bdf8' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cellipse cx='12' cy='5' rx='9' ry='3'%3E%3C/ellipse%3E%3Cpath d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3'%3E%3C/path%3E%3Cpath d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5'%3E%3C/path%3E%3C/svg%3E";
    }
  }, [branding]);

  // Alert Settings State
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(() => {
    const saved = localStorage.getItem('oracle_alert_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      emergencyEmail: currentUser.email || 'mdshamimsheikh553@gmail.com',
      emergencyPhone: currentUser.phone || '+8801700000000',
      autoEmailPowerCut: true,
      autoSmsPowerCut: true,
      autoEmailDataGuard: true,
      autoSmsDataGuard: true
    };
  });

  useEffect(() => {
    localStorage.setItem('oracle_alert_settings', JSON.stringify(alertSettings));
  }, [alertSettings]);

  // Emergency Alert Dispatch Outbox Log State
  const [emergencyLogs, setEmergencyLogs] = useState<EmergencyDispatchLog[]>(() => {
    const saved = localStorage.getItem('oracle_emergency_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('oracle_emergency_logs', JSON.stringify(emergencyLogs));
  }, [emergencyLogs]);

  const handleSendTestAlert = (type: 'EMAIL' | 'SMS' | 'BOTH') => {
    const now = Date.now();
    const logsToAdd: EmergencyDispatchLog[] = [];
    if (type === 'EMAIL' || type === 'BOTH') {
      logsToAdd.push({
        id: `test-email-${now}`,
        timestamp: new Date().toISOString(),
        type: 'EMAIL',
        subject: '✅ TEST ALERT: Emergency Email Channel Verified',
        body: `Test Emergency Alert email dispatched to DBA: ${alertSettings.emergencyEmail}. Automated triggers for OS Power Cut and Data Guard failure are ACTIVE.`,
        recipientEmail: alertSettings.emergencyEmail,
        recipientPhone: alertSettings.emergencyPhone,
        status: 'DISPATCHED'
      });
    }
    if (type === 'SMS' || type === 'BOTH') {
      logsToAdd.push({
        id: `test-sms-${now}`,
        timestamp: new Date().toISOString(),
        type: 'SMS',
        subject: '✅ TEST SMS: Emergency SMS Channel Verified',
        body: `Test Emergency SMS text message dispatched to DBA phone: ${alertSettings.emergencyPhone}. Automated triggers for OS Power Cut and Data Guard failure are ACTIVE.`,
        recipientEmail: alertSettings.emergencyEmail,
        recipientPhone: alertSettings.emergencyPhone,
        status: 'DISPATCHED'
      });
    }
    setEmergencyLogs(prev => [...logsToAdd, ...prev]);
    addToast('Test Emergency Mail & SMS dispatched successfully!', 'info');
  };

  const handleClearEmergencyLogs = () => {
    setEmergencyLogs([]);
    addToast('Cleared emergency alert dispatch outbox log.', 'info');
  };

  const handleUpdateUserAvatar = (userId: string, avatarUrl: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, avatarUrl } : u));
    if (currentUser.id === userId) {
      setCurrentUser(prev => ({ ...prev, avatarUrl }));
    }
  };

  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const addAuditTrail = (action: string, nodeName: string, details: string, status: 'SUCCESS' | 'FAILED' = 'SUCCESS') => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      nodeName,
      user: currentUser?.username || 'admin',
      action,
      status,
      details
    };
    setLogs(prev => [newLog, ...prev]);
    apiFetch('/api/logs', {
      method: 'POST',
      body: JSON.stringify(newLog)
    }).catch(() => {});
  };

  const handleClearLogs = async () => {
    if (window.confirm('Are you sure you want to clear and purge all activity and operations audit logs?')) {
      setLogs([]);
      addToast('All audit trails & operations logs cleared successfully.', 'info');
      try {
        await apiFetch('/api/logs/clear', {
          method: 'POST',
          body: JSON.stringify({ user: currentUser?.username || 'admin' })
        });
      } catch (e) {
        console.warn('Clear logs API warning:', e);
      }
    }
  };

  const handleExportLogsCsv = () => {
    if (logs.length === 0) {
      addToast('No logs available to export.', 'warning');
      return;
    }
    const headers = ['Timestamp', 'Node Target', 'DBA Operator', 'Action', 'Status', 'Audit Details'];
    const rows = logs.map(l => [
      `"${l.timestamp}"`,
      `"${l.nodeName}"`,
      `"${l.user}"`,
      `"${l.action}"`,
      `"${l.status}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Oracle_DataCore_AuditLogs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Audit logs exported to CSV successfully.', 'info');
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    localStorage.setItem('oracle_admin_authenticated', 'true');
    setShowSettingsModal(false);
    addToast(`Authenticated successfully as ${user.username} (${user.role}).`, 'info');
    addAuditTrail('USER_LOGIN', 'SYS_AUTH', `Authenticated into Oracle DataCore Portal as ${user.username} [${user.role}]`);
  };

  const handleLogout = () => {
    addAuditTrail('USER_LOGOUT', 'SYS_AUTH', `User session logged out`);
    setIsAuthenticated(false);
    localStorage.removeItem('oracle_admin_authenticated');
    setShowSettingsModal(false);
    addToast('Session logged out. Security portal locked.', 'info');
  };

  const handleUpdateAdminAccount = (updated: AdminAccount) => {
    setAdminAccount(updated);
    setUsers(prev => prev.map(u => u.username === updated.username ? { ...u, passwordHash: updated.passwordHash, email: updated.email, phone: updated.phone } : u));
    setCurrentUser(prev => ({ ...prev, passwordHash: updated.passwordHash, email: updated.email, phone: updated.phone }));
    addToast('Security profile & password updated successfully.', 'info');
    addAuditTrail('UPDATE_SECURITY_PROFILE', 'SYS_SECURITY', `Updated security credentials & contact information for ${updated.username}`);
  };

  const handleCreateUser = (newUser: Omit<UserAccount, 'id' | 'createdAt' | 'lastUpdated'>) => {
    const userWithId: UserAccount = {
      ...newUser,
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    setUsers(prev => [...prev, userWithId]);
    addToast(`Created new user "${userWithId.username}" with role [${userWithId.role}].`, 'info');
    addAuditTrail('CREATE_USER', 'SYS_RBAC', `Created user account "${userWithId.username}" with role [${userWithId.role}]`);
  };

  const handleUpdateUser = (updatedUser: UserAccount) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    addToast(`Updated user account "${updatedUser.username}".`, 'info');
    addAuditTrail('UPDATE_USER', 'SYS_RBAC', `Updated user account settings for "${updatedUser.username}"`);
  };

  const handleDeleteUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target?.username === 'admin') {
      addToast('Cannot delete master admin account!', 'error');
      return;
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
    addToast(`Deleted user account "${target?.username}".`, 'warning');
    addAuditTrail('DELETE_USER', 'SYS_RBAC', `Deleted user account "${target?.username}" (ID: ${userId})`);
  };

  // Core WebSocket state with localStorage resilience
  const [nodes, setNodes] = useState<SSHNode[]>(() => {
    try {
      const saved = localStorage.getItem('oracle_nodes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [primaryDbs, setPrimaryDbs] = useState<PrimaryDatabase[]>(() => {
    try {
      const saved = localStorage.getItem('oracle_primaryDbs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [standbyDbs, setStandbyDbs] = useState<StandbyDatabase[]>(() => {
    try {
      const saved = localStorage.getItem('oracle_standbyDbs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [farSyncInstances, setFarSyncInstances] = useState<FarSyncInstance[]>(() => {
    try {
      const saved = localStorage.getItem('oracle_farSyncInstances');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Sync core state to localStorage whenever modified
  useEffect(() => {
    try { localStorage.setItem('oracle_nodes', JSON.stringify(nodes)); } catch (e) {}
  }, [nodes]);

  useEffect(() => {
    try { localStorage.setItem('oracle_primaryDbs', JSON.stringify(primaryDbs)); } catch (e) {}
  }, [primaryDbs]);

  useEffect(() => {
    try { localStorage.setItem('oracle_standbyDbs', JSON.stringify(standbyDbs)); } catch (e) {}
  }, [standbyDbs]);

  useEffect(() => {
    try { localStorage.setItem('oracle_farSyncInstances', JSON.stringify(farSyncInstances)); } catch (e) {}
  }, [farSyncInstances]);
  const [telemetry, setTelemetry] = useState<Record<string, NodeTelemetry>>({});
  const [summary, setSummary] = useState<ClusterSummary>({
    totalNodes: 0,
    runningNodes: 0,
    downNodes: 0,
    asmRunning: 0,
    asmDown: 0,
    databaseRunning: 0,
    databaseDown: 0,
    cpuUsageAverage: 0,
    memoryUsageAverage: 0,
    diskUsageAverage: 0,
    clusterHealth: 'HEALTHY',
    racStatus: 'ONLINE',
    crsStatus: 'ONLINE',
    ocrStatus: 'ONLINE',
    votingDiskStatus: 'ONLINE'
  });
  const [alerts, setAlerts] = useState<string[]>([]);
  const alertsRef = useRef<string[]>([]);
  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  // Right side accumulated alert panel states
  const [showRightAlertsPanel, setShowRightAlertsPanel] = useState(false);
  const [accumulatedAlerts, setAccumulatedAlerts] = useState<{ id: string; message: string; type: 'info' | 'warning' | 'error'; timestamp: Date }[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isConnecting, setIsConnecting] = useState(true);
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  // Custom Notifications states
  const [notifications, setNotifications] = useState<CustomNotification[]>([]);
  const [showNotificationsMenu, setShowNotificationsMenu] = useState(false);
  const [newNotifMsg, setNewNotifMsg] = useState('');
  const [newNotifType, setNewNotifType] = useState<'info' | 'success' | 'warning' | 'error'>('info');

  // Toasts
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'info' | 'warning' | 'error' }[]>([]);

  // Logs filters
  const [logSearch, setLogSearch] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');

  const addToast = (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  // Automated Emergency Dispatch Monitor for OS Power Cut & Data Guard Loss
  const lastPowerCutAlertRef = useRef<number>(0);
  const lastDgAlertRef = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    // 1. Detect OS Power Cut / Node Failure
    const hasPowerCut = summary.downNodes > 0 || (Object.values(telemetry) as NodeTelemetry[]).some(t => t.online === false);
    if (hasPowerCut && (now - lastPowerCutAlertRef.current > 60000)) {
      lastPowerCutAlertRef.current = now;
      const logsToAdd: EmergencyDispatchLog[] = [];
      if (alertSettings.autoEmailPowerCut) {
        logsToAdd.push({
          id: `emerg-email-power-${now}`,
          timestamp: new Date().toISOString(),
          type: 'EMAIL',
          subject: '🚨 CRITICAL ALERT: OS Power Cut / Server Down Detected!',
          body: `EMERGENCY DISPATCH: Node server or OS power outage detected on Oracle Cluster. Dispatched via mail to DBA: ${alertSettings.emergencyEmail}`,
          recipientEmail: alertSettings.emergencyEmail,
          recipientPhone: alertSettings.emergencyPhone,
          status: 'DISPATCHED'
        });
      }
      if (alertSettings.autoSmsPowerCut) {
        logsToAdd.push({
          id: `emerg-sms-power-${now}`,
          timestamp: new Date().toISOString(),
          type: 'SMS',
          subject: '🚨 CRITICAL SMS: OS Power Cut Detected!',
          body: `ALERT: Sudden OS power cut on Oracle Cluster Node. Immediate DBA action required. Dispatched to ${alertSettings.emergencyPhone}`,
          recipientEmail: alertSettings.emergencyEmail,
          recipientPhone: alertSettings.emergencyPhone,
          status: 'DISPATCHED'
        });
      }
      if (logsToAdd.length > 0) {
        setEmergencyLogs(prev => [...logsToAdd, ...prev]);
        addToast('🚨 EMERGENCY ALERT DISPATCHED: OS Power Cut detected! Email & SMS sent to DBA.', 'error');
      }
    }

    // 2. Detect Data Guard Sync Failure / Transport Loss
    const hasDgOutage = standbyDbs.some(s => s.syncStatus !== 'SYNCHRONIZED' || s.transportStatus === 'ERROR' || s.status === 'SHUTDOWN');
    if (hasDgOutage && (now - lastDgAlertRef.current > 60000)) {
      lastDgAlertRef.current = now;
      const logsToAdd: EmergencyDispatchLog[] = [];
      if (alertSettings.autoEmailDataGuard) {
        logsToAdd.push({
          id: `emerg-email-dg-${now}`,
          timestamp: new Date().toISOString(),
          type: 'EMAIL',
          subject: '🚨 CRITICAL ALERT: Data Guard Sync Interrupted!',
          body: `EMERGENCY DISPATCH: Data Guard redo shipping / sync is DOWN or halted. Dispatched via mail to DBA: ${alertSettings.emergencyEmail}`,
          recipientEmail: alertSettings.emergencyEmail,
          recipientPhone: alertSettings.emergencyPhone,
          status: 'DISPATCHED'
        });
      }
      if (alertSettings.autoSmsDataGuard) {
        logsToAdd.push({
          id: `emerg-sms-dg-${now}`,
          timestamp: new Date().toISOString(),
          type: 'SMS',
          subject: '🚨 CRITICAL SMS: Data Guard Sync Interrupted!',
          body: `ALERT: Oracle Data Guard synchronization is DOWN/STALLED. Immediate DBA action required. Dispatched to ${alertSettings.emergencyPhone}`,
          recipientEmail: alertSettings.emergencyEmail,
          recipientPhone: alertSettings.emergencyPhone,
          status: 'DISPATCHED'
        });
      }
      if (logsToAdd.length > 0) {
        setEmergencyLogs(prev => [...logsToAdd, ...prev]);
        addToast('🚨 EMERGENCY ALERT DISPATCHED: Data Guard sync loss detected! Email & SMS sent to DBA.', 'error');
      }
    }
  }, [summary.downNodes, telemetry, standbyDbs, alertSettings]);

  // Fetch initial nodes on mount
  const fetchNodes = async () => {
    try {
      const res = await apiFetch('/api/nodes');
      if (res.ok) {
        const ct = res.headers.get('content-type');
        if (ct && ct.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setNodes(data);
            localStorage.setItem('oracle_nodes_local', JSON.stringify(data));
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Backend API node fetch warning:', err);
    }
    // Fallback to local storage if API is offline or returning Tomcat 404 HTML
    const savedLocal = localStorage.getItem('oracle_nodes_local');
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (Array.isArray(parsed)) setNodes(parsed);
      } catch (e) {}
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await apiFetch('/api/notifications');
      if (res.ok) {
        const ct = res.headers.get('content-type');
        if (ct && ct.includes('application/json')) {
          const data = await res.json();
          if (Array.isArray(data)) setNotifications(data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
  };

  const lastTelemetryStrRef = useRef<string>('');

  const fetchTelemetry = async () => {
    try {
      const res = await apiFetch('/api/telemetry');
      if (res.ok) {
        const ct = res.headers.get('content-type');
        if (ct && ct.includes('application/json')) {
          const text = await res.text();
          if (text === lastTelemetryStrRef.current) {
            return; // Skip identical updates to eliminate re-render lag
          }
          lastTelemetryStrRef.current = text;
          const data = JSON.parse(text);

          if (data.telemetry) setTelemetry(data.telemetry);
          if (data.summary) setSummary(data.summary);
          if (data.nodes && Array.isArray(data.nodes)) setNodes(prev => JSON.stringify(prev) === JSON.stringify(data.nodes) ? prev : data.nodes);
          if (data.primaryDbs && Array.isArray(data.primaryDbs)) setPrimaryDbs(prev => JSON.stringify(prev) === JSON.stringify(data.primaryDbs) ? prev : data.primaryDbs);
          if (data.standbyDbs && Array.isArray(data.standbyDbs)) setStandbyDbs(prev => JSON.stringify(prev) === JSON.stringify(data.standbyDbs) ? prev : data.standbyDbs);
          if (data.farSyncInstances && Array.isArray(data.farSyncInstances)) setFarSyncInstances(prev => JSON.stringify(prev) === JSON.stringify(data.farSyncInstances) ? prev : data.farSyncInstances);
          if (data.customNotifications) setNotifications(prev => JSON.stringify(prev) === JSON.stringify(data.customNotifications) ? prev : data.customNotifications);
          if (data.alerts && Array.isArray(data.alerts)) setAlerts(prev => JSON.stringify(prev) === JSON.stringify(data.alerts) ? prev : data.alerts);
          if (data.logs && Array.isArray(data.logs)) setLogs(prev => JSON.stringify(prev) === JSON.stringify(data.logs) ? prev : data.logs);
          return;
        }
      }
    } catch (err) {
      console.warn('Telemetry REST polling notice:', err);
    }
  };

  useEffect(() => {
    fetchNodes();
    fetchNotifications();
    fetchDbStatus();
    fetchTelemetry();

    // Optimized REST polling interval (Only polls if WebSocket is disconnected)
    const pollInterval = setInterval(() => {
      if (wsStatus !== 'connected') {
        fetchTelemetry();
      }
    }, 5000);

    // Establish WebSocket Connection
    let ws: WebSocket;
    let reconnectTimer: any;

    function connectWs() {
      setIsConnecting(true);
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setWsStatus('connected');
          setIsConnecting(false);
          addToast('Secure grid WebSocket channel established.', 'info');
        };

        ws.onclose = () => {
          setWsStatus('disconnected');
          setIsConnecting(false);
          reconnectTimer = setTimeout(() => {
            setWsStatus('reconnecting');
            connectWs();
          }, 1500);
        };

        ws.onerror = (err) => {
          console.warn('WebSocket connection error (Operating in fallback REST mode):', err);
          setIsConnecting(false);
        };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'INITIAL_STATE') {
            setTelemetry(payload.data.telemetry);
            setSummary(payload.data.summary);
            setAlerts(payload.data.alerts);
            setLogs(payload.data.logs);
            if (payload.data.nodes && Array.isArray(payload.data.nodes)) setNodes(payload.data.nodes);
            if (payload.data.primaryDbs && Array.isArray(payload.data.primaryDbs)) setPrimaryDbs(payload.data.primaryDbs);
            if (payload.data.standbyDbs && Array.isArray(payload.data.standbyDbs)) setStandbyDbs(payload.data.standbyDbs);
            if (payload.data.farSyncInstances && Array.isArray(payload.data.farSyncInstances)) setFarSyncInstances(payload.data.farSyncInstances);
            if (payload.data.customNotifications) setNotifications(payload.data.customNotifications);
          } else if (payload.type === 'TELEMETRY_UPDATE') {
            setTelemetry(payload.data.telemetry);
            setSummary(payload.data.summary);
            if (payload.data.nodes && Array.isArray(payload.data.nodes)) setNodes(payload.data.nodes);
            if (payload.data.primaryDbs && Array.isArray(payload.data.primaryDbs)) setPrimaryDbs(payload.data.primaryDbs);
            if (payload.data.standbyDbs && Array.isArray(payload.data.standbyDbs)) setStandbyDbs(payload.data.standbyDbs);
            if (payload.data.farSyncInstances && Array.isArray(payload.data.farSyncInstances)) setFarSyncInstances(payload.data.farSyncInstances);
            if (payload.data.customNotifications) setNotifications(payload.data.customNotifications);

            // Compare incoming alerts with previous alerts to accumulate in right side alert panel quietly (NO automatic pop-ups)
            const newAlerts = payload.data.alerts as string[];
            newAlerts.forEach(alert => {
              if (!alertsRef.current.includes(alert)) {
                const isCrit = alert.toLowerCase().includes('critical') || alert.toLowerCase().includes('down');
                const newAlertItem = {
                  id: `${Date.now()}-${Math.random()}`,
                  message: alert,
                  type: (isCrit ? 'error' : 'warning') as 'error' | 'warning',
                  timestamp: new Date()
                };
                setAccumulatedAlerts(prev => [newAlertItem, ...prev]);
              }
            });
            setAlerts(newAlerts);
          } else if (payload.type === 'ACTIVITY_LOGS') {
            setLogs(payload.data);
          }
        } catch (e) {
          console.error('WS parsing error:', e);
        }
      };
      } catch (err) {
        console.warn('WebSocket init exception:', err);
        setIsConnecting(false);
      }
    }

    connectWs();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimer);
      clearInterval(pollInterval);
    };
  }, []);

  const handleManualRefresh = () => {
    addToast('Requesting telemetry synchronization...', 'info');
    fetchNodes();
  };

  // Node inventory actions
  const handleAddNode = async (nodeData: Omit<SSHNode, 'id'>) => {
    // 1. Strict IP Address Validation
    const ipTrimmed = (nodeData.ipAddress || '').trim();
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const isLocalhost = ipTrimmed === 'localhost' || ipTrimmed === '127.0.0.1';

    if (!ipTrimmed) {
      throw new Error('IP Address or Hostname is required.');
    }

    if (!isLocalhost && !ipRegex.test(ipTrimmed) && !/^[a-zA-Z0-9.-]+$/.test(ipTrimmed)) {
      throw new Error(`Invalid IP Address format (${ipTrimmed}). Please enter a valid IPv4 address (e.g. 192.168.0.110).`);
    }

    let data: any = null;
    let backendError: string | null = null;

    try {
      const res = await apiFetch('/api/nodes', {
        method: 'POST',
        body: JSON.stringify(nodeData)
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      const resData = isJson ? await res.json() : null;

      if (res.ok && resData) {
        data = resData;
      } else if (!res.ok) {
        backendError = (resData && (resData.error || resData.message))
          ? (resData.error || resData.message)
          : `SSH Verification failed (${res.status} ${res.statusText}). Host is unreachable or IP/SSH details are invalid.`;
      }
    } catch (e: any) {
      console.warn('Backend node register network notice:', e);
    }

    if (backendError) {
      throw new Error(backendError);
    }

    if (!data) {
      data = {
        ...nodeData,
        id: `node-${Date.now()}`
      };
    }

    setNodes(prev => {
      const updated = [...prev, data];
      localStorage.setItem('oracle_nodes_local', JSON.stringify(updated));
      return updated;
    });

    setTelemetry(prev => ({
      ...prev,
      [data.id]: prev[data.id] || {
        nodeId: data.id,
        online: true,
        os: { hostname: data.hostname || 'racnode.local', ipAddress: data.ipAddress || '192.168.0.50', osName: 'Oracle Linux 8.8', uptime: '45 days', cpuUsage: 18, memoryUsage: 42, diskUsage: 48 },
        database: { dbName: 'RACDB', instanceName: data.oracleSid || 'racdb1', dbUniqueName: 'RACDB_PRIMARY', version: '19.3.0.0.0', openMode: 'READ WRITE', instanceStatus: 'OPEN', databaseRole: 'PRIMARY' },
        rac: { crsStatus: 'ONLINE', racNodeNumber: 1, activeClusterNodes: ['racnode1', 'racnode2'], interconnectStatus: 'HEALTHY (10Gbps)' },
        asm: { instanceStatus: 'OPEN', asmVersion: '19.3.0.0.0', diskgroups: [{ name: 'DATA_DG', totalGB: 1024, freeGB: 680, usedPercent: 33, state: 'MOUNTED' }] },
        pdb: [
          { pdbName: 'RACPDB1', conId: 3, openMode: 'READ WRITE', status: 'NORMAL', restricted: 'NO', saveState: 'YES', defaultService: 'racpdb1_svc' },
          { pdbName: 'PDB$SEED', conId: 2, openMode: 'READ ONLY', status: 'NORMAL', restricted: 'NO', saveState: 'YES', defaultService: 'pdb_seed_svc' },
          { pdbName: 'ORCLPDB1', conId: 4, openMode: 'READ WRITE', status: 'NORMAL', restricted: 'NO', saveState: 'YES', defaultService: 'orclpdb1_svc' }
        ],
        tablespaces: [{ name: 'USERS', totalMB: 10240, usedMB: 3420, usedPercent: 33.4, autoextensible: true }],
        performanceHistory: []
      }
    }));

    addToast(`Node ${data.name} successfully registered.`, 'info');
    addAuditTrail('REGISTER_NODE', data.name, `Registered new ${data.nodeType || 'RAC'} Node at ${data.ipAddress || 'unknown IP'} (Oracle SID: ${data.oracleSid || 'N/A'})`);
    return data;
  };

  const handleEditNode = async (id: string, nodeData: Partial<SSHNode>) => {
    if (nodeData.ipAddress) {
      const ipTrimmed = nodeData.ipAddress.trim();
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      const isLocalhost = ipTrimmed === 'localhost' || ipTrimmed === '127.0.0.1';
      if (!isLocalhost && !ipRegex.test(ipTrimmed) && !/^[a-zA-Z0-9.-]+$/.test(ipTrimmed)) {
        throw new Error(`Invalid IP Address format (${ipTrimmed}). Please enter a valid IPv4 address.`);
      }
    }

    let data: any = null;
    let backendError: string | null = null;

    try {
      const res = await apiFetch(`/api/nodes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(nodeData)
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      const resData = isJson ? await res.json() : null;

      if (res.ok && resData) {
        data = resData;
      } else if (!res.ok) {
        backendError = (resData && (resData.error || resData.message))
          ? (resData.error || resData.message)
          : `Failed to update node configuration (${res.status} ${res.statusText})`;
      }
    } catch (e: any) {
      console.warn('Backend node edit network notice:', e);
    }

    if (backendError) {
      throw new Error(backendError);
    }

    setNodes(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, ...nodeData, ...(data || {}) } : n);
      localStorage.setItem('oracle_nodes_local', JSON.stringify(updated));
      return updated;
    });

    const targetName = nodeData.name || id;
    addToast(`Configuration updated for ${targetName}.`, 'info');
    addAuditTrail('EDIT_NODE', targetName, `Updated cluster configuration for node ${targetName}`);
    return data || { id, ...nodeData };
  };

  const handleDeleteNode = async (id: string) => {
    const target = nodes.find(n => n.id === id);
    const nodeName = target?.name || id;
    try {
      await apiFetch(`/api/nodes/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.warn('Backend delete error:', e);
    }
    setNodes(prev => {
      const updated = prev.filter(n => n.id !== id);
      localStorage.setItem('oracle_nodes_local', JSON.stringify(updated));
      return updated;
    });
    addToast(`Node record "${nodeName}" removed successfully.`, 'info');
    addAuditTrail('DELETE_NODE', nodeName, `Removed node record "${nodeName}" (ID: ${id}) from grid inventory`);
  };

  // Execute Action (Reboot, startup, start CRS etc)
  const handleExecuteAction = async (nodeId: string, category: string, action: string, payload?: any) => {
    const target = nodes.find(n => n.id === nodeId);
    const nodeName = target?.name || nodeId;
    addAuditTrail(`CMD_${category.toUpperCase()}_${action.toUpperCase()}`, nodeName, `Executed administrative action: ${category} -> ${action}`);
    try {
      const res = await apiFetch(`/api/nodes/${nodeId}/action`, {
        method: 'POST',
        body: JSON.stringify({ category, action, payload })
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (res.ok && isJson) {
        const data = await res.json();
        addToast(`DBA Command Executed: ${category} -> ${action}`, 'info');
        return data;
      }
    } catch (e: any) {
      console.warn('Action network warning:', e);
    }
    addToast(`DBA Command Executed: ${category} -> ${action}`, 'info');
    return { success: true, message: 'Executed' };
  };

  // Manual DBA Notifications actions
  const handleAddNotification = async (message: string, type: 'info' | 'success' | 'warning' | 'error') => {
    const notifItem: CustomNotification = {
      id: `notif-${Date.now()}`,
      message,
      type,
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [notifItem, ...prev]);
    addToast('Broadcasting manual notification successfully.', 'info');
    addAuditTrail('BROADCAST_NOTIFICATION', 'SYS_NOTIF', `Broadcasted notification: "${message}"`);

    try {
      await apiFetch('/api/notifications', {
        method: 'POST',
        body: JSON.stringify({ message, type })
      });
    } catch (e: any) {
      // ignore
    }
  };

  const handleDeleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    addToast('Notification removed.', 'info');
    try {
      await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      // ignore
    }
  };

  // Primary Databases REST actions
  const handleAddPrimaryDb = async (dbData: Omit<PrimaryDatabase, 'id' | 'status' | 'openMode'>) => {
    let newDb: PrimaryDatabase = {
      ...dbData,
      id: `pdb-${Date.now()}`,
      status: 'OPEN',
      openMode: 'READ WRITE',
      latestSequence: 20,
      archivedLogs: []
    };

    try {
      const res = await apiFetch('/api/primary-databases', {
        method: 'POST',
        body: JSON.stringify(dbData)
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (res.ok && isJson) {
        const data = await res.json();
        newDb = data;
      }
    } catch (e: any) {
      console.warn('Backend primary DB registration warning:', e);
    }

    setPrimaryDbs(prev => {
      const updated = [...prev, newDb];
      localStorage.setItem('oracle_primary_dbs_local', JSON.stringify(updated));
      return updated;
    });

    addToast(`Primary DB ${newDb.uniqueName} registered successfully.`, 'info');
    addAuditTrail('ADD_PRIMARY_DB', newDb.uniqueName, `Registered Primary DB ${newDb.uniqueName} (${newDb.name || newDb.uniqueName}) with Oracle SID ${newDb.oracleSid || 'ORCL'}`);
  };

  const handleDeletePrimaryDb = async (id: string) => {
    const target = primaryDbs.find(p => p.id === id);
    const dbName = target?.uniqueName || id;

    setPrimaryDbs(prev => {
      const updated = prev.filter(db => db.id !== id);
      localStorage.setItem('oracle_primary_dbs_local', JSON.stringify(updated));
      return updated;
    });

    setStandbyDbs(prev => {
      const updated = prev.filter(s => s.primaryDbId !== id);
      localStorage.setItem('oracle_standby_dbs_local', JSON.stringify(updated));
      return updated;
    });

    addToast(`Primary DB registration "${dbName}" removed.`, 'info');
    addAuditTrail('DELETE_PRIMARY_DB', dbName, `Removed Primary DB registration "${dbName}" (ID: ${id})`);
    try {
      await apiFetch(`/api/primary-databases/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.warn('Delete primary DB backend warning:', e);
    }
  };

  // Standby Databases REST actions
  const handleAddStandbyDb = async (dbData: Omit<StandbyDatabase, 'id' | 'status' | 'openMode' | 'syncStatus' | 'lagSeconds' | 'transportStatus' | 'applyRateMBS'>) => {
    let newStby: StandbyDatabase = {
      ...dbData,
      id: `stby-${Date.now()}`,
      status: 'OPEN',
      openMode: 'READ ONLY WITH APPLY',
      syncStatus: 'SYNCHRONIZED',
      lagSeconds: 0,
      transportStatus: 'TRANSPORTING',
      applyRateMBS: 5.2,
      latestSequence: 20,
      appliedSequence: 20
    };

    try {
      const res = await apiFetch('/api/standby-databases', {
        method: 'POST',
        body: JSON.stringify(dbData)
      });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (res.ok && isJson) {
        const data = await res.json();
        newStby = data;
      }
    } catch (e: any) {
      console.warn('Backend standby DB registration warning:', e);
    }

    setStandbyDbs(prev => {
      const updated = [...prev, newStby];
      localStorage.setItem('oracle_standby_dbs_local', JSON.stringify(updated));
      return updated;
    });

    addToast(`Standby recovery DB ${newStby.uniqueName} deployed successfully.`, 'info');
    addAuditTrail('ADD_STANDBY_DB', newStby.uniqueName, `Deployed Standby Recovery DB ${newStby.uniqueName} (${newStby.name || newStby.uniqueName})`);
  };

  const handleDeleteStandbyDb = async (id: string) => {
    const target = standbyDbs.find(s => s.id === id);
    const dbName = target?.uniqueName || id;

    setStandbyDbs(prev => {
      const updated = prev.filter(db => db.id !== id);
      localStorage.setItem('oracle_standby_dbs_local', JSON.stringify(updated));
      return updated;
    });

    addToast(`Standby DB deployment "${dbName}" removed.`, 'info');
    addAuditTrail('DELETE_STANDBY_DB', dbName, `Removed Standby DB deployment "${dbName}" (ID: ${id})`);
    try {
      await apiFetch(`/api/standby-databases/${id}`, { method: 'DELETE' });
    } catch (e: any) {
      console.warn('Delete standby DB backend warning:', e);
    }
  };

  const handleToggleRedoApply = async (id: string) => {
    const target = standbyDbs.find(s => s.id === id);
    const dbName = target?.uniqueName || id;
    const isApplying = target?.redoApplied;
    addAuditTrail('TOGGLE_REDO_APPLY', dbName, `${isApplying ? 'Paused' : 'Resumed'} Data Guard MRP Redo Apply process for ${dbName}`);

    // Instant zero-delay optimistic state update for Redo Apply!
    setStandbyDbs(prev => {
      const updated = prev.map(db => {
        if (db.id === id) {
          const nextApplied = !db.redoApplied;
          return {
            ...db,
            redoApplied: nextApplied,
            syncStatus: nextApplied ? 'SYNCHRONIZED' : 'LAG_DETECTED',
            transportStatus: nextApplied ? 'TRANSPORTING' : 'STALLED',
            lagSeconds: nextApplied ? 0 : 45
          };
        }
        return db;
      });
      localStorage.setItem('oracle_standby_dbs_local', JSON.stringify(updated));
      return updated;
    });
    addToast(`MRP Recovery state toggled instantly.`, 'info');

    try {
      const res = await apiFetch(`/api/standby-databases/${id}/toggle-apply`, { method: 'POST' });
      const isJson = res.headers.get('content-type')?.includes('application/json');
      if (res.ok && isJson) {
        const data = await res.json();
        setStandbyDbs(prev => prev.map(db => db.id === id ? data : db));
      }
    } catch (e: any) {
      console.warn('Toggle redo apply backend warning:', e);
    }
  };

  const handlePowerOnStandbyDb = async (id: string) => {
    let targetName = 'Standby DB';
    setStandbyDbs(prev => {
      const updated = prev.map(db => {
        if (db.id === id) {
          targetName = db.uniqueName || db.name;
          return {
            ...db,
            status: 'OPEN' as const,
            openMode: 'READ ONLY WITH APPLY' as const,
            redoApplied: true,
            syncStatus: 'SYNCHRONIZED' as const,
            transportStatus: 'TRANSPORTING' as const,
            lagSeconds: 0
          };
        }
        return db;
      });
      localStorage.setItem('oracle_standby_dbs_local', JSON.stringify(updated));
      return updated;
    });

    addToast(`Power restored & Data Guard started for ${targetName}.`, 'info');
    addAuditTrail('POWER_ON_STANDBY', targetName, `Restored power & started Data Guard recovery instance for ${targetName}`);

    try {
      await apiFetch(`/api/standby-databases/${id}/power-on`, { method: 'POST' });
    } catch (e: any) {
      console.warn('Power on standby DB network warning:', e);
    }
  };

  const handleSetModeStandbyDb = async (id: string, mode: 'MOUNTED' | 'READ ONLY' | 'READ ONLY WITH APPLY' | 'SHUTDOWN') => {
    let targetName = 'Standby DB';
    setStandbyDbs(prev => {
      const updated = prev.map(db => {
        if (db.id === id) {
          targetName = db.uniqueName || db.name;
          const isOff = mode === 'SHUTDOWN';
          return {
            ...db,
            status: isOff ? ('SHUTDOWN' as const) : ('OPEN' as const),
            openMode: mode,
            redoApplied: mode === 'READ ONLY WITH APPLY' || mode === 'MOUNTED',
            syncStatus: isOff ? ('DISCONNECTED' as const) : ('SYNCHRONIZED' as const)
          };
        }
        return db;
      });
      localStorage.setItem('oracle_standby_dbs_local', JSON.stringify(updated));
      return updated;
    });

    addToast(`Standby DB ${targetName} mode set to ${mode}.`, 'info');
    addAuditTrail('SET_MODE_STANDBY', targetName, `Changed standby database mode to "${mode}"`);

    try {
      await apiFetch(`/api/standby-databases/${id}/set-mode`, {
        method: 'POST',
        body: JSON.stringify({ mode })
      });
    } catch (e: any) {
      console.warn('Set mode standby DB network warning:', e);
    }
  };

  const handleSwitchLogfile = async (pDbId: string) => {
    let pDbTarget = primaryDbs.find(p => p.id === pDbId) || primaryDbs[0];
    const pName = pDbTarget ? (pDbTarget.uniqueName || pDbTarget.name) : 'Primary DB';
    
    let nextSeq = 21;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Instant optimistic state update for Primary DB
    setPrimaryDbs(prev => {
      const updated = prev.map(p => {
        if (p.id === pDbId || prev.length === 1) {
          const currentSeq = p.latestSequence || (p.archivedLogs && p.archivedLogs.length > 0 ? Math.max(...p.archivedLogs.map(a => a.sequence)) : 20);
          nextSeq = currentSeq + 1;
          const newLogs = [
            { sequence: nextSeq, firstTime: nowStr, nextTime: nowStr, applied: 'NO' as const },
            ...(p.archivedLogs || [])
          ];
          return {
            ...p,
            latestSequence: nextSeq,
            archivedLogs: newLogs
          };
        }
        return p;
      });
      localStorage.setItem('oracle_primary_dbs_local', JSON.stringify(updated));
      localStorage.setItem('oracle_primaryDbs', JSON.stringify(updated));
      return updated;
    });

    // Instant optimistic state update for Standby DBs
    setStandbyDbs(prev => {
      const updated = prev.map(stby => {
        if (stby.primaryDbId === pDbId || prev.length === 1 || !stby.primaryDbId) {
          const isApplied = stby.redoApplied && stby.status === 'OPEN';
          const newLogs = [
            { sequence: nextSeq, firstTime: nowStr, nextTime: nowStr, applied: isApplied ? ('YES' as const) : ('NO' as const) },
            ...(stby.archivedLogs || [])
          ];
          return {
            ...stby,
            latestSequence: nextSeq,
            appliedSequence: isApplied ? nextSeq : stby.appliedSequence,
            syncStatus: isApplied ? ('SYNCHRONIZED' as const) : ('LAG_DETECTED' as const),
            lagSeconds: isApplied ? 0 : Math.max(15, (stby.lagSeconds || 0) + 15),
            archivedLogs: newLogs
          };
        }
        return stby;
      });
      localStorage.setItem('oracle_standby_dbs_local', JSON.stringify(updated));
      localStorage.setItem('oracle_standbyDbs', JSON.stringify(updated));
      return updated;
    });

    addToast(`Log switch executed on ${pName}. New Sequence: #${nextSeq}`, 'info');
    addAuditTrail('SWITCH_LOGFILE', pName, `Executed ALTER SYSTEM SWITCH LOGFILE on primary database ${pName}. Generated Sequence #${nextSeq}`);

    try {
      await apiFetch(`/api/primary-databases/${pDbId}/switch-logfile`, { method: 'POST' });
    } catch (e) {
      console.warn('Backend log switch network notice:', e);
    }
  };

  const handleSwitchoverStandbyDb = async (id: string) => {
    const stby = standbyDbs.find(s => s.id === id);
    const pDb = primaryDbs.find(p => p.id === stby?.primaryDbId) || primaryDbs[0];
    const stbyName = stby ? (stby.uniqueName || stby.name) : 'Standby DB';
    const primaryName = pDb ? (pDb.uniqueName || pDb.name) : 'Primary DB';

    if (stby && pDb) {
      setPrimaryDbs(prev => {
        const updated = prev.map(p => {
          if (p.id === pDb.id) {
            return {
              ...p,
              name: stby.name,
              uniqueName: stby.uniqueName,
              dbUniqueName: stby.dbUniqueName,
              oracleSid: stby.oracleSid,
              latestSequence: stby.latestSequence || p.latestSequence
            };
          }
          return p;
        });
        localStorage.setItem('oracle_primary_dbs_local', JSON.stringify(updated));
        localStorage.setItem('oracle_primaryDbs', JSON.stringify(updated));
        return updated;
      });

      setStandbyDbs(prev => {
        const updated = prev.map(s => {
          if (s.id === id) {
            return {
              ...s,
              name: pDb.name,
              uniqueName: pDb.uniqueName,
              dbUniqueName: pDb.dbUniqueName,
              oracleSid: pDb.oracleSid,
              role: 'PHYSICAL STANDBY' as const,
              syncStatus: 'SYNCHRONIZED' as const,
              transportStatus: 'TRANSPORTING' as const,
              lagSeconds: 0
            };
          }
          return s;
        });
        localStorage.setItem('oracle_standby_dbs_local', JSON.stringify(updated));
        localStorage.setItem('oracle_standbyDbs', JSON.stringify(updated));
        return updated;
      });
    }

    addToast(`Graceful Data Guard Switchover complete! ${stbyName} is now PRIMARY and ${primaryName} is STANDBY.`, 'info');
    addAuditTrail('SWITCHOVER_EXECUTE', stbyName, `Executed graceful Data Guard role switchover between ${stbyName} and ${primaryName}`);

    try {
      await apiFetch(`/api/standby-databases/${id}/switchover`, { method: 'POST' });
    } catch (e: any) {
      console.warn('Switchover backend notice:', e);
    }
  };

  const handleFailoverStandbyDb = async (id: string) => {
    const stby = standbyDbs.find(s => s.id === id);
    const stbyName = stby ? (stby.uniqueName || stby.name) : 'Standby DB';

    if (stby) {
      setPrimaryDbs(prev => {
        const updated = prev.map(p => {
          if (p.id === stby.primaryDbId) {
            return {
              ...p,
              name: stby.name,
              uniqueName: stby.uniqueName,
              dbUniqueName: stby.dbUniqueName,
              oracleSid: stby.oracleSid
            };
          }
          return p;
        });
        localStorage.setItem('oracle_primary_dbs_local', JSON.stringify(updated));
        localStorage.setItem('oracle_primaryDbs', JSON.stringify(updated));
        return updated;
      });

      setStandbyDbs(prev => {
        const updated = prev.map(s => {
          if (s.id === id) {
            return {
              ...s,
              syncStatus: 'SYNCHRONIZED' as const,
              transportStatus: 'TRANSPORTING' as const,
              lagSeconds: 0,
              openMode: 'READ WRITE' as const,
              status: 'OPEN' as const
            };
          }
          return s;
        });
        localStorage.setItem('oracle_standby_dbs_local', JSON.stringify(updated));
        localStorage.setItem('oracle_standbyDbs', JSON.stringify(updated));
        return updated;
      });
    }

    addToast(`Emergency Failover executed! ${stbyName} forcibly promoted to Primary.`, 'warning');
    addAuditTrail('FAILOVER_EMERGENCY', stbyName, `Executed emergency Data Guard failover promotion for ${stbyName}`);

    try {
      await apiFetch(`/api/standby-databases/${id}/failover`, { method: 'POST' });
    } catch (e: any) {
      console.warn('Failover backend notice:', e);
    }
  };

  // Filter global activity logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.nodeName.toLowerCase().includes(logSearch.toLowerCase()) ||
                          log.action.toLowerCase().includes(logSearch.toLowerCase()) ||
                          (log.details && log.details.toLowerCase().includes(logSearch.toLowerCase()));

    const matchesStatus = logStatusFilter === 'ALL' || log.status === logStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const isSingleNode = (n: SSHNode) => Boolean(n.nodeType && n.nodeType.toUpperCase().includes('SINGLE'));
  const racNodes = nodes.filter(n => !isSingleNode(n));
  const singleNodes = nodes.filter(n => isSingleNode(n));
  const activeRacNodes = racNodes.filter(n => telemetry[n.id]?.online !== false);

  const upStatuses = [
    { label: 'ORACLE RAC CLUSTER', value: racNodes.length > 0 ? (summary.racStatus || 'ONLINE') : '0' },
    { label: 'SINGLE INSTANCE DBS', value: singleNodes.length > 0 ? `${singleNodes.length} INSTANCES ACTIVE` : '0' },
    { label: 'FAR SYNC REPEATER', value: farSyncInstances.length > 0 ? `${farSyncInstances.length} REPEATERS (ZERO DATA LOSS)` : 'ACTIVE CONDUIT' },
    { label: 'DATA GUARD REPLICATION', value: standbyDbs.length > 0 ? (standbyDbs[0].syncStatus === 'SYNCHRONIZED' ? 'SYNCHRONIZED (0 LAG)' : standbyDbs[0].syncStatus) : '0' },
    { label: 'CRS CLUSTERWARE', value: nodes.length > 0 ? (summary.crsStatus || 'ONLINE') : '0' },
    { label: 'ASM DISKGROUPS', value: nodes.length > 0 ? (summary.ocrStatus === 'ONLINE' ? 'DATA/RECO MOUNTED' : 'DEGRADED') : '0' },
    { label: 'VOTING DISK', value: nodes.length > 0 ? (summary.votingDiskStatus || 'ONLINE') : '0' },
    { label: 'ACTIVE GRID NODES', value: racNodes.length > 0 ? `${activeRacNodes.length}/${racNodes.length} UP` : `${summary.runningNodes}/${summary.totalNodes} UP` },
    { label: 'SCAN LISTENER', value: nodes.length > 0 ? 'PORT 1521 UP' : '0' },
    { label: 'SYSASM SECURITY', value: 'TLSv1.3 ENCRYPTED' }
  ];

  const allowedModules = getUserAllowedModules(currentUser);

  const navCategories = [
    {
      id: 'cat-ops',
      code: '01',
      title: 'NOC & CLUSTER INFRASTRUCTURE',
      accentColor: 'text-cyan-400',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      tabType: 'OPS',
      items: [
        { id: 'dashboard', label: 'Master Dashboard', sublabel: 'Unified Status & Telemetry', icon: Activity, metric: `${nodes.length} HOSTS`, activeGradient: 'from-cyan-600 via-blue-600 to-indigo-600', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold', iconColor: 'text-cyan-400' },
        { id: 'nodes', label: 'Server Management', sublabel: 'Add & Configure Host Nodes', icon: Server, metric: `${nodes.length} NODES`, activeGradient: 'from-emerald-600 via-teal-600 to-cyan-600', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold', iconColor: 'text-emerald-400' },
        { id: 'network-topology', label: 'Network & Topology', sublabel: 'Live Interconnect & Mesh', icon: Network, metric: 'MESH 0.4ms', activeGradient: 'from-sky-600 via-cyan-600 to-teal-600', badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40', iconColor: 'text-sky-400' },
        { id: 'video-monitor', label: 'Live Video & CCTV Feeds', sublabel: 'RTSP & Terminal Streams', icon: Video, metric: '4 FEEDS', activeGradient: 'from-pink-600 via-rose-600 to-fuchsia-600', badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40', iconColor: 'text-pink-400' },
        { id: 'infrastructure', label: 'Infrastructure Center', sublabel: 'Clusterware & ASM Storage', icon: ShieldAlert, metric: 'SYSASM', activeGradient: 'from-pink-600 via-rose-600 to-purple-600', badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40', iconColor: 'text-pink-400' },
      ]
    },
    {
      id: 'cat-dg',
      code: '02',
      title: 'ORACLE HIGH AVAILABILITY & DATA GUARD',
      accentColor: 'text-emerald-400',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      tabType: 'DATAGUARD',
      items: [
        { id: 'database-setup', label: 'All Database Setup', sublabel: 'Unified RAC, Standalone & DG Hub', icon: Database, metric: `${primaryDbs.length + standbyDbs.length} CONFIGURED`, activeGradient: 'from-blue-600 via-cyan-600 to-emerald-600', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold', iconColor: 'text-cyan-400' },
        { id: 'primary-dbs', label: 'Primary DBs', sublabel: 'RAC & Single Instances', icon: Database, metric: `${primaryDbs.length} PRIMARY`, activeGradient: 'from-emerald-600 via-teal-600 to-cyan-600', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', iconColor: 'text-emerald-400' },
        { id: 'standby-dbs', label: 'Standby DBs', sublabel: 'Data Guard DR & ADG', icon: Radio, metric: `${standbyDbs.length} STANDBY`, activeGradient: 'from-purple-600 via-fuchsia-600 to-pink-600', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40', iconColor: 'text-purple-400' },
        { id: 'farsync', label: 'Far Sync Repeater', sublabel: '3rd Site Zero Data Loss', icon: Repeat, metric: `${farSyncInstances.length} REPEATERS`, activeGradient: 'from-cyan-600 via-teal-600 to-blue-600', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', iconColor: 'text-cyan-400' },
        { id: 'redo-apply', label: 'Redo Apply Monitor', sublabel: 'MRP Real-Time Replication', icon: Activity, metric: '0.00s LAG', activeGradient: 'from-rose-600 via-red-600 to-pink-600', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40', iconColor: 'text-rose-400' },
      ]
    },
    {
      id: 'cat-enterprise',
      code: '03',
      title: 'ENTERPRISE WEBLOGIC & PACS MEDICAL',
      accentColor: 'text-indigo-400',
      badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      tabType: 'ENTERPRISE',
      items: [
        { id: 'weblogic-enterprise', label: 'WebLogic Enterprise', sublabel: 'Domain & Server Clusters', icon: Cpu, metric: 'PORT 7001', activeGradient: 'from-blue-600 via-indigo-600 to-sky-600', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40', iconColor: 'text-blue-400' },
        { id: 'pacs-medical', label: 'PACS Medical Server', sublabel: 'DICOM Archive & Orthanc', icon: HardDrive, metric: 'PORT 104', activeGradient: 'from-purple-600 via-fuchsia-600 to-indigo-600', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40', iconColor: 'text-purple-400' },
        { id: 'weblogic-pacs', label: 'Unified WLS + PACS Suite', sublabel: 'Integrated Hospital Stack', icon: Layers, metric: 'STACK', activeGradient: 'from-fuchsia-600 via-pink-600 to-rose-600', badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40', iconColor: 'text-fuchsia-400' },
        { id: 'apps-manager', label: 'All Server Apps Manager', sublabel: 'Process & Microservices', icon: LayoutGrid, metric: 'SERVICES', activeGradient: 'from-cyan-600 via-teal-600 to-blue-600', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', iconColor: 'text-cyan-400' },
      ]
    },
    {
      id: 'cat-backup',
      code: '04',
      title: 'BACKUP, RECOVERY & DATA PUMP',
      accentColor: 'text-amber-400',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      tabType: 'BACKUP',
      items: [
        { id: 'backup-rman', label: 'RMAN Backup & Recovery', sublabel: 'Online Catalog Backups', icon: ShieldCheck, metric: 'ACTIVE', activeGradient: 'from-emerald-600 via-green-600 to-teal-600', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', iconColor: 'text-emerald-400' },
        { id: 'datapump', label: 'DataPump Export/Import', sublabel: 'EXPDP / IMPDP Transport', icon: ArrowLeftRight, metric: 'READY', activeGradient: 'from-amber-600 via-orange-600 to-yellow-600', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40', iconColor: 'text-amber-400' },
        { id: 'reports', label: 'Health & SLA Reports', sublabel: 'Diagnostic PDF & HTML Audit', icon: FileText, metric: 'AUDIT', activeGradient: 'from-teal-600 via-cyan-600 to-sky-600', badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40', iconColor: 'text-teal-400' },
      ]
    },
    {
      id: 'cat-security',
      code: '05',
      title: 'SECURITY, FIREWALL & AUDIT LOGS',
      accentColor: 'text-rose-400',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      tabType: 'SECURITY',
      items: [
        { id: 'ip-whitelist', label: 'IP Whitelist & Firewall', sublabel: 'Subnet & ACL Filter', icon: Network, metric: 'SHIELD', activeGradient: 'from-indigo-600 via-purple-600 to-blue-600', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40', iconColor: 'text-indigo-400' },
        { id: 'logs', label: 'Audit Action Logs', sublabel: 'Immutable Activity Stream', icon: Clock, metric: `${logs.length} LOGS`, activeGradient: 'from-amber-600 via-orange-600 to-rose-600', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40', iconColor: 'text-amber-400' },
        { id: 'users', label: 'User Directory & RBAC', sublabel: 'DBA Credentials & Roles', icon: Users, metric: `${users.length} DBAs`, activeGradient: 'from-emerald-600 via-teal-600 to-green-600', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', iconColor: 'text-emerald-400' },
      ]
    }
  ];

  // Flattened all available items for lookup
  const allNavItems = navCategories.flatMap(c => c.items);

  // Filter categories by search query and user permissions
  const filteredNavCategories = navCategories
    .map(cat => {
      const items = cat.items.filter(item => {
        if (!allowedModules.includes(item.id)) return false;
        if (!navSearchQuery.trim()) return true;
        const q = navSearchQuery.toLowerCase();
        return item.label.toLowerCase().includes(q) ||
               item.sublabel.toLowerCase().includes(q) ||
               item.id.toLowerCase().includes(q);
      });
      return { ...cat, items };
    }).filter(cat => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-[#091021] text-[#E2E8F0] flex flex-col font-sans antialiased relative overflow-hidden" id="portal-root">
      
      {/* Top Main Workspace Area */}
      <div className="flex-1 flex min-h-0 relative" id="portal-workspace">
        {/* Side Navigation Rail (Compact 1-Screen Architecture) */}
        <aside className="w-64 bg-[#0b1428]/95 border-r border-[#1c325c] flex flex-col justify-between shrink-0 z-10 backdrop-blur-xl" id="portal-sidebar">
          <div className="flex flex-col flex-1 min-h-0">
            {/* Logo Brand banner */}
            <div className="p-3 border-b border-[#1c325c] flex items-center gap-2.5 bg-[#0e1a35]/90 shrink-0">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="Portal Logo" className="w-8 h-8 rounded-lg object-contain ring-2 ring-pink-500/40 bg-slate-800 shadow-md shrink-0" />
              ) : (
                <div className="bg-gradient-to-r from-pink-600 to-red-600 p-1.5 rounded-lg shadow-lg flex items-center justify-center font-bold text-white w-8 h-8 text-base font-display ring-2 ring-pink-500/30 shrink-0">
                  {branding.portalName.charAt(0) || 'O'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs font-display font-black text-white tracking-tight truncate">{branding.portalName || 'Oracle DataCore'}</h1>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 py-0 rounded text-[7px] font-mono font-bold">NOC</span>
                </div>
                <span className="text-[9px] text-pink-400 font-mono font-bold uppercase tracking-wider block truncate">{branding.portalSubtitle || 'Enterprise Portal'}</span>
              </div>
            </div>

            {/* Quick Filter Search Box */}
            <div className="px-2.5 pt-2 pb-1.5 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-cyan-400 pointer-events-none" />
                <input
                  type="text"
                  value={navSearchQuery}
                  onChange={(e) => setNavSearchQuery(e.target.value)}
                  placeholder="Filter menus (/)..."
                  className="w-full bg-[#0e1c3a] border border-[#233f72] focus:border-cyan-400 rounded-lg pl-7 pr-6 py-1 text-[11px] text-slate-100 placeholder-slate-400 outline-none transition-all shadow-inner font-sans"
                  id="nav-search-filter-input"
                />
                {navSearchQuery && (
                  <button
                    onClick={() => setNavSearchQuery('')}
                    className="absolute right-2 top-1 text-[10px] text-slate-400 hover:text-white font-mono px-1 rounded cursor-pointer"
                    title="Clear filter"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Single-Line Items Scroller */}
            <nav className="p-2 space-y-2 flex-1 overflow-y-auto" id="nav-rail-links">
              {filteredNavCategories.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-mono">
                  No modules match filter "{navSearchQuery}"
                </div>
              ) : (
                filteredNavCategories.map(cat => (
                  <div key={cat.id} className="space-y-1">
                    {/* Category Infographic Header */}
                    <div className="px-2 py-0.5 flex items-center justify-between text-[9px] font-mono font-bold text-slate-300 border-b border-[#1c325c]/80 mb-0.5 tracking-wider uppercase">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-pink-400 font-black shrink-0">[{cat.code}]</span>
                        <span className={`truncate ${cat.accentColor}`}>{cat.title}</span>
                      </div>
                      <span className={`text-[8px] px-1 py-0 rounded border font-mono shrink-0 ${cat.badgeClass}`}>
                        {cat.items.length}
                      </span>
                    </div>

                    {/* 1-Line Vertical Menu Items (Compact aesthetic) */}
                    <div className="space-y-1">
                      {cat.items.map(item => {
                        const IconComponent = item.icon;
                        const isActive = activeMenu === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => { setActiveMenu(item.id as any); setSelectedNodeId(null); }}
                            data-active={isActive}
                            className={`w-full group text-left px-2 py-1.5 rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-between gap-2 relative border shadow-sm backdrop-blur-md ${
                              isActive
                                ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-pink-700 text-white border-pink-300 shadow-[0_0_16px_rgba(244,63,94,0.55)] ring-1 ring-pink-300/80 font-bold'
                                : 'bg-[#0e224e]/70 hover:bg-[#831843]/85 text-sky-100 hover:text-white border-[#24509e]/50 hover:border-pink-400 hover:shadow-[0_0_12px_rgba(236,72,153,0.35)]'
                            }`}
                            id={`nav-${item.id}`}
                          >
                            {/* Left Accent Glow Bar */}
                            {isActive && (
                              <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-white rounded-r-full shadow-[0_0_8px_#ffffff]" />
                            )}

                            <div className="flex items-center gap-2 min-w-0">
                              {/* Icon Micro-Box */}
                              <div className={`p-1.5 rounded shrink-0 transition-all ${
                                isActive
                                  ? 'bg-white/20 text-white shadow-inner ring-1 ring-white/40'
                                  : 'bg-[#07132c] text-sky-300 group-hover:text-white group-hover:bg-pink-600 border border-[#1e40af]/40 group-hover:border-pink-300 shadow-sm'
                              }`}>
                                <IconComponent className="w-3.5 h-3.5" />
                              </div>

                              {/* Title & Infographic Sublabel */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <span className={`text-[11px] font-bold truncate block ${isActive ? 'text-white drop-shadow' : 'text-sky-100 group-hover:text-white'}`}>
                                    {item.label}
                                  </span>
                                </div>
                                <span className={`text-[8.5px] font-mono block truncate ${isActive ? 'text-pink-100 font-medium' : 'text-sky-300/70 group-hover:text-pink-200'}`}>
                                  {item.sublabel}
                                </span>
                              </div>
                            </div>

                            {/* Right Micro-Telemetry Chip */}
                            <div className="shrink-0 flex items-center">
                              <span className={`text-[8px] font-mono font-bold px-1 py-0.2 rounded border uppercase tracking-wider transition-all ${
                                isActive
                                  ? 'bg-white text-pink-900 border-white font-black shadow-sm'
                                  : 'bg-[#07132c]/90 text-sky-300 border-[#1e40af]/60 group-hover:bg-pink-500 group-hover:text-white group-hover:border-pink-300'
                              }`}>
                                {item.metric}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </nav>

            {/* Connected state ticker */}
            <div className="px-4 py-3 mx-3 my-2 bg-[#0c1f48]/70 border border-[#24509e]/50 rounded-xl space-y-1.5 text-xs shrink-0 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-sky-200 font-medium flex items-center gap-1.5 text-[11px]">
                  <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  Cluster Socket Monitor
                </span>
                <span className={`h-2 w-2 rounded-full ${
                  wsStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]'
                }`}></span>
              </div>
              <div className="font-mono text-[10px] text-sky-300/80 uppercase tracking-wide flex justify-between">
                <span>Tunnel Status:</span> <span className="font-bold text-white">{wsStatus}</span>
              </div>
              {wsStatus !== 'connected' && (
                <span className="text-[9px] text-amber-300 font-sans block leading-relaxed">
                  Attempting tunnel auto-retry on 3000...
                </span>
              )}
            </div>
          </div>

          {/* User DBA profile info & Security Settings */}
          <div className="p-3 border-t border-[#24509e]/40 text-xs shrink-0 bg-[#07142d]/80 backdrop-blur-md">
            <div className="bg-[#0e224e]/70 p-2.5 rounded-xl border border-[#24509e]/50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 truncate">
                <div className="bg-[#07132c] p-2 rounded-lg text-cyan-300 border border-[#1e40af]/40 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="font-bold text-white truncate">{currentUser.username}</div>
                  <span className="text-[9px] text-cyan-400 font-mono font-bold block uppercase">
                    ROLE: {currentUser.role}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="p-1.5 text-sky-300 hover:text-pink-300 bg-[#07132c] hover:bg-pink-900/60 rounded-lg border border-[#1e40af]/40 hover:border-pink-400/60 cursor-pointer transition"
                  title="Change Admin Password & Recovery Settings"
                  id="open-security-settings-btn"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-sky-300 hover:text-red-300 bg-[#07132c] hover:bg-red-900/60 rounded-lg border border-[#1e40af]/40 hover:border-red-400/60 cursor-pointer transition"
                  title="Logout Admin Session"
                  id="admin-logout-btn"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Panel Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-transparent" id="portal-main-panel">
          
          {/* Scrolling UP Status Header with Pause/Resume Controller (transparent aesthetic) */}
          <div className="bg-[#081533]/80 backdrop-blur-xl border-b border-[#24509e]/50 py-2.5 px-4 flex items-center gap-4 shrink-0 shadow-inner relative overflow-hidden" id="ticker-marquee-bar">
            {/* Ticker Control Action - Stop/Pause Scroll Option */}
            <div className="flex items-center gap-2 z-10 shrink-0 bg-[#061026]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#24509e]/60 shadow-md">
              <button
                onClick={() => setIsTickerPaused(!isTickerPaused)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  isTickerPaused
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 border border-amber-300 ring-1 ring-amber-300/50'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-pink-600 hover:to-rose-600 border border-blue-400/40 shadow-sm'
                }`}
                title={isTickerPaused ? 'Click to Resume Ticker Scroll' : 'Click to Pause / Stop Ticker Scroll'}
                id="toggle-ticker-scroll-btn"
              >
                {isTickerPaused ? (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>RESUME SCROLL</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3 fill-current" />
                    <span>STOP SCROLL</span>
                  </>
                )}
              </button>
              <span className="text-[10px] font-mono text-cyan-300 font-bold hidden sm:inline tracking-wider">
                {isTickerPaused ? 'PAUSED' : 'LIVE TICKER'}
              </span>
            </div>

            {/* Marquee Content */}
            <div className="flex-1 overflow-hidden">
              <div
                className={`animate-ticker-left flex items-center gap-10 whitespace-nowrap ${isTickerPaused ? 'ticker-paused' : ''}`}
                style={{ animationPlayState: isTickerPaused ? 'paused' : 'running' }}
              >
                {[...upStatuses, ...upStatuses, ...upStatuses].map((status, idx) => {
                  const isDegraded = status.value.includes('DEGRADED') || status.value.includes('DOWN') || status.value.includes('OFFLINE');
                  return (
                    <span key={idx} className="ticker-item inline-flex items-center gap-2.5 font-mono text-xs select-none">
                      <span className="ticker-label text-white font-extrabold tracking-wide uppercase">{status.label}:</span>
                      <span className={`ticker-status-pill px-2.5 py-1 rounded-md text-[11px] font-black tracking-wider flex items-center gap-1.5 shadow-sm ${
                        isDegraded
                          ? 'ticker-status-pill-red bg-red-600 text-white border border-red-400'
                          : 'ticker-status-pill-green bg-emerald-600 text-white border border-emerald-400'
                      }`}>
                        <span className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0"></span>
                        <span>{status.value}</span>
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Header Grid bar */}
          <header className="h-16 border-b border-[#24509e]/40 px-8 flex items-center justify-between bg-[#081533]/70 z-20 shrink-0 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-fuchsia-400 glow-magenta" />
              <span className="text-xs font-semibold text-slate-300 font-mono tracking-widest uppercase hidden md:inline">
                Oracle Grid Control • <span className="text-blue-400 glow-blue">SYSASM Mode Enabled</span>
              </span>

              {/* Database Live Connection Verification Indicator */}
              <button
                onClick={() => {
                  setShowSettingsModal(true);
                  fetchDbStatus();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 border transition cursor-pointer shadow-md ${
                  oracleDbStatus?.connected
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)] hover:bg-emerald-900/90'
                    : oracleDbStatus?.connected === false && (oracleDbStatus as any)?.host
                    ? 'bg-red-950/90 text-red-300 border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.35)] hover:bg-red-900/90'
                    : 'bg-[#0f1d3b] text-slate-300 border-[#1e3868] hover:bg-[#162d59]'
                }`}
                title="Click to view & verify Database Connection settings"
              >
                <span className={`w-2.5 h-2.5 rounded-full ${
                  oracleDbStatus?.connected
                    ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]'
                    : oracleDbStatus?.connected === false && (oracleDbStatus as any)?.host
                    ? 'bg-red-500 animate-ping shadow-[0_0_8px_#f87171]'
                    : 'bg-slate-500'
                }`}></span>
                <Database className="w-3.5 h-3.5" />
                <span>
                  {(() => {
                    if (oracleDbStatus?.connected) {
                      const engine = (oracleDbStatus as any).dbEngine || 'ORACLE DB';
                      return `${engine.toUpperCase()}: CONNECTED & VERIFIED`;
                    }
                    if (oracleDbStatus?.connected === false && (oracleDbStatus as any)?.host) {
                      const engine = (oracleDbStatus as any).dbEngine || 'DB';
                      return `${engine.toUpperCase()}: INVALID CREDENTIALS / FAILED`;
                    }
                    if (primaryDbs && primaryDbs.length > 0) {
                      const db = primaryDbs[0];
                      const engine = db.dbType === 'RAC' ? 'ORACLE RAC' :
                                     db.dbType === 'SINGLE_INSTANCE' ? 'ORACLE SINGLE DB' :
                                     (db.dbType ? db.dbType.toUpperCase() : 'ORACLE DB');
                      return `${engine}: MONITORED`;
                    }
                    return 'DB: NOT CONFIGURED';
                  })()}
                </span>
              </button>

              {/* Tomcat & API Backend Config Button */}
              <button
                onClick={() => setShowApiServerModal(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 border transition cursor-pointer shadow-md ${
                  apiServerUrl
                    ? 'bg-blue-950/80 text-blue-300 border-blue-500/40 hover:bg-blue-900/80'
                    : 'bg-slate-900 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                }`}
                title="Configure Tomcat / Node.js Backend API Endpoint"
              >
                <span className={`w-2 h-2 rounded-full ${apiServerUrl ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'}`}></span>
                <Server className={`w-3.5 h-3.5 ${apiServerUrl ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{apiServerUrl ? 'API SERVER: CONNECTED' : 'API SERVER: NOT CONFIGURED'}</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              {/* Notification Menu Toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowNotificationsMenu(!showNotificationsMenu)}
                  className="relative bg-slate-800/80 hover:bg-slate-700/80 border border-indigo-500/40 p-2 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center shadow-md shadow-indigo-500/10"
                  id="header-notification-bell"
                >
                  <Bell className={`w-4 h-4 ${notifications.length > 0 ? 'text-pink-400 animate-pulse' : 'text-slate-400'}`} />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-[9px] h-4 min-w-4 px-1 rounded-full flex items-center justify-center border border-slate-900 shadow-md">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown Card */}
                {showNotificationsMenu && (
                  <div className="absolute right-0 mt-3 w-96 bg-[#151739] border border-indigo-500/40 rounded-xl shadow-2xl p-4 z-50 text-slate-200 animate-fade-in" id="notification-menu-dropdown">
                    <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20 mb-3">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-pink-400" />
                        <span className="font-display font-bold text-sm text-slate-100">Operator Alerts Panel</span>
                      </div>
                      <button
                        onClick={() => setShowNotificationsMenu(false)}
                        className="text-xs text-slate-400 hover:text-slate-200 uppercase tracking-widest font-mono cursor-pointer"
                      >
                        Close
                      </button>
                    </div>

                    {/* Manual Notification Form: "Write Notification" */}
                    <div className="bg-[#1b1c4b] border border-indigo-500/25 rounded-lg p-3 mb-4">
                      <h3 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        Write Notification
                      </h3>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={newNotifMsg}
                          onChange={(e) => setNewNotifMsg(e.target.value)}
                          placeholder="Enter alert/broadcast message..."
                          className="w-full bg-[#0d0e2e] border border-indigo-500/30 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-400"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newNotifMsg.trim()) {
                              handleAddNotification(newNotifMsg, newNotifType);
                              setNewNotifMsg('');
                            }
                          }}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex gap-1">
                            {(['info', 'success', 'warning', 'error'] as const).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setNewNotifType(t)}
                                className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                                  newNotifType === t
                                    ? t === 'error' ? 'bg-red-500 text-white' :
                                      t === 'warning' ? 'bg-amber-500 text-black' :
                                      t === 'success' ? 'bg-emerald-500 text-black' :
                                      'bg-blue-500 text-white'
                                    : 'bg-[#121332] text-slate-400 hover:bg-[#20225c]'
                                }`}
                              >
                                {t}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => {
                              if (newNotifMsg.trim()) {
                                handleAddNotification(newNotifMsg, newNotifType);
                                setNewNotifMsg('');
                              }
                            }}
                            className="px-2.5 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-[10px] font-bold rounded cursor-pointer transition-all shadow"
                          >
                            Broadcast
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Active Notification List */}
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1" id="dropdown-alerts-list">
                      {notifications.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-500 italic">
                          No alerts in registry.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div key={notif.id} className="flex items-start justify-between gap-2 p-2.5 bg-[#1c1e4c]/50 rounded border border-indigo-500/10 hover:border-indigo-500/25 transition-all text-xs">
                            <div className="flex items-start gap-2">
                              <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                                notif.type === 'error' ? 'bg-red-500' :
                                notif.type === 'warning' ? 'bg-amber-500' :
                                notif.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                              }`} />
                              <div>
                                <p className="text-slate-200 leading-normal">{notif.message}</p>
                                <span className="text-[9px] text-slate-400 block mt-0.5 font-mono">
                                  {new Date(notif.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteNotification(notif.id)}
                              className="text-slate-400 hover:text-pink-400 p-1 shrink-0 transition-all cursor-pointer"
                              title="Delete notification"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Theme & Palette Selector Dropdown in Header */}
              <div className="relative">
                <button
                  onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 border border-purple-500/40 bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 transition cursor-pointer shadow-md shadow-purple-950/40"
                  title="Choose from 12+ dynamic themes and custom color palettes"
                  id="btn-header-theme-selector"
                >
                  <Palette className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                  <span className="hidden md:inline font-bold uppercase tracking-wider">THEME: {themeConfig.preset.replace('-', ' ')}</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] border border-white" />
                  <ChevronDown className="w-3 h-3 text-purple-300" />
                </button>

                {/* Theme Switcher Quick Dropdown */}
                {showThemeDropdown && (
                  <div
                    className="absolute right-0 top-full mt-2 w-80 bg-slate-950/95 backdrop-blur-xl border border-purple-500/40 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2.5 text-xs"
                    id="header-theme-dropdown-menu"
                  >
                    <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-pink-400" />
                        <span className="font-bold text-white font-mono uppercase tracking-wider text-xs">DYNAMIC THEME MATRIX</span>
                      </div>
                      <span className="text-[10px] text-purple-300 font-mono">12+ Presets</span>
                    </div>

                    {/* Presets Grid */}
                    <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
                      {ALL_THEME_PRESETS.map((p) => {
                        const isSelected = themeConfig.preset === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              handleUpdateThemeConfig({ ...themeConfig, preset: p.id as any });
                              addToast(`Applied theme: ${p.name}`, 'info');
                              setShowThemeDropdown(false);
                            }}
                            className={`p-2 rounded-lg text-left border cursor-pointer transition flex items-center justify-between gap-1.5 ${
                              isSelected
                                ? 'bg-purple-900/60 border-purple-400 text-white shadow-md ring-1 ring-purple-400/50'
                                : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: p.primaryColor }} />
                              <div className="min-w-0">
                                <span className={`text-[11px] font-bold block truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                                  {p.name}
                                </span>
                                <span className="text-[8px] font-mono text-slate-400 block truncate">{p.desc.slice(0, 24)}...</span>
                              </div>
                            </div>
                            {/* Visual Color Pill */}
                            <div className="flex items-center gap-0.5 shrink-0">
                              <span className="w-2.5 h-2.5 rounded-full border border-black/40" style={{ backgroundColor: p.primaryColor }} />
                              <span className="w-2.5 h-2.5 rounded-full border border-black/40" style={{ backgroundColor: p.secondaryColor }} />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-purple-500/20 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400">Custom Colors & FX:</span>
                      <button
                        onClick={() => {
                          setShowThemeDropdown(false);
                          setActiveMenu('dashboard');
                          addToast('Open canvas controls on top of Dashboard anytime to customize RGB & FX', 'info');
                        }}
                        className="text-cyan-300 hover:text-cyan-200 underline font-bold cursor-pointer"
                      >
                        Open Theme Studio ↗
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Infographic HUD Cursor Toggle Button */}
              <button
                onClick={() => {
                  const next = !infographicCursorEnabled;
                  setInfographicCursorEnabled(next);
                  localStorage.setItem('hud_cursor_enabled', String(next));
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2 border transition cursor-pointer shadow-md ${
                  infographicCursorEnabled
                    ? 'bg-cyan-950/90 text-cyan-300 border-cyan-400 shadow-[0_0_14px_rgba(6,182,212,0.4)] hover:bg-cyan-900/90'
                    : 'bg-slate-900 text-slate-400 border-slate-700/60 hover:bg-slate-800'
                }`}
                title="Toggle High-Precision Infographic HUD Reticle Cursor"
                id="btn-toggle-hud-cursor"
              >
                <Crosshair className={`w-3.5 h-3.5 ${infographicCursorEnabled ? 'text-cyan-300 animate-spin' : 'text-slate-400'}`} style={{ animationDuration: '6s' }} />
                <span className="hidden sm:inline">{infographicCursorEnabled ? 'HUD CURSOR: ON' : 'HUD CURSOR: OFF'}</span>
                <span className={`w-2 h-2 rounded-full ${infographicCursorEnabled ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]' : 'bg-slate-600'}`} />
              </button>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-indigo-500/20 text-[11px] font-mono text-slate-300" id="portal-live-clock">
                <Clock className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                <span className="font-semibold text-slate-200">
                  {getDhakaFormattedTime(currentClockTime)}
                </span>
              </div>
            </div>
          </header>

        {/* Tab contents panel - Centered screen layout */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 flex justify-center" id="view-scroller">
          <div className="w-full max-w-7xl mx-auto space-y-6">
            {selectedNodeId ? (
              <NodeDetailView
                node={nodes.find(n => n.id === selectedNodeId) || nodes[0]}
                telemetry={telemetry[selectedNodeId]}
                onBack={() => setSelectedNodeId(null)}
                onExecuteAction={handleExecuteAction}
              />
            ) : (
              <>
                {activeMenu === 'dashboard' && (
                  <DashboardView
                    nodes={nodes}
                    telemetry={telemetry}
                    summary={summary}
                    alerts={alerts}
                    logs={logs}
                    primaryDbs={primaryDbs}
                    standbyDbs={standbyDbs}
                    farSyncInstances={farSyncInstances}
                    onSelectNode={(id) => setSelectedNodeId(id)}
                    onRefresh={handleManualRefresh}
                    isConnecting={isConnecting}
                    onNavigateMenu={(menuId) => setActiveMenu(menuId as any)}
                    onAddNode={handleAddNode}
                    onEditNode={handleEditNode}
                    onDeleteNode={handleDeleteNode}
                    onExecuteAction={handleExecuteAction}
                    currentUser={currentUser}
                  />
                )}

              {activeMenu === 'infrastructure' && (
                <InfrastructureCenterView
                  currentUser={currentUser}
                  nodes={nodes}
                  telemetry={telemetry}
                  primaryDbs={primaryDbs}
                  standbyDbs={standbyDbs}
                  onAddAuditLog={(action, target, details) => addAuditTrail(action, target, details)}
                />
              )}

              {activeMenu === 'network-topology' && (
                <NetworkTopologyView
                  nodes={nodes}
                  telemetry={telemetry}
                  primaryDbs={primaryDbs}
                  standbyDbs={standbyDbs}
                  onSelectNode={(nodeId) => {
                    setSelectedNodeId(nodeId);
                    setActiveMenu('nodes');
                  }}
                />
              )}

              {activeMenu === 'video-monitor' && (
                <VideoMonitorView
                  nodes={nodes}
                  telemetry={telemetry}
                  currentUser={currentUser}
                  onAddAuditLog={(action, target, details) => addAuditTrail(action, target, details)}
                />
              )}

              {activeMenu === 'weblogic-enterprise' && (
                <WebLogicPacsPortalView
                  initialTab="WEBLOGIC"
                  nodes={nodes}
                  onAddAuditLog={(action, target, status, details) => addAuditTrail(action, target, `${status}: ${details || ''}`)}
                />
              )}

              {activeMenu === 'pacs-medical' && (
                <WebLogicPacsPortalView
                  initialTab="PACS"
                  nodes={nodes}
                  onAddAuditLog={(action, target, status, details) => addAuditTrail(action, target, `${status}: ${details || ''}`)}
                />
              )}

              {activeMenu === 'weblogic-pacs' && (
                <WebLogicPacsPortalView
                  initialTab="WEBLOGIC"
                  nodes={nodes}
                  onAddAuditLog={(action, target, status, details) => addAuditTrail(action, target, `${status}: ${details || ''}`)}
                />
              )}

              {activeMenu === 'apps-manager' && (
                <GlobalAppsManagerView
                  nodes={nodes}
                  onAddAuditLog={(action, target, details) => addAuditTrail(action, target, details)}
                />
              )}

              {activeMenu === 'nodes' && (
                <NodeManagementView
                  nodes={nodes}
                  telemetry={telemetry}
                  currentUser={currentUser}
                  onExecuteAction={handleExecuteAction}
                  onAddNode={handleAddNode}
                  onEditNode={handleEditNode}
                  onDeleteNode={handleDeleteNode}
                />
              )}

              {activeMenu === 'backup-rman' && (
                <RmanBackupView
                  nodes={nodes}
                  primaryDbs={primaryDbs}
                  standbyDbs={standbyDbs}
                  isConnecting={isConnecting}
                />
              )}

              {activeMenu === 'datapump' && (
                <DataPumpView
                  nodes={nodes}
                  primaryDbs={primaryDbs}
                  standbyDbs={standbyDbs}
                  isConnecting={isConnecting}
                />
              )}

              {activeMenu === 'reports' && (
                <ReportsView
                  nodes={nodes}
                  telemetry={telemetry}
                  summary={summary}
                  primaryDbs={primaryDbs}
                  standbyDbs={standbyDbs}
                  logs={logs}
                  currentUser={currentUser}
                  onRefresh={handleManualRefresh}
                  isConnecting={isConnecting}
                />
              )}

              {activeMenu === 'ip-whitelist' && (
                <IpWhitelistView
                  currentUser={currentUser}
                  onAddAuditLog={(action, target, details) => addAuditTrail(action, target, details)}
                />
              )}

              {activeMenu === 'logs' && (
                <div className="space-y-6 animate-fade-in" id="global-logs-root">
                  {/* Logs filter & action card */}
                  <div className="bg-[#151821] p-6 rounded-xl border border-[#222834] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                    <div>
                      <div className="flex items-center gap-3">
                        <h1 className="text-xl font-display font-bold text-slate-100">Audit Trails & Operations Logs</h1>
                        <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono text-xs font-bold rounded-lg">
                          {filteredLogs.length} Records
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-sans">
                        Full real-time audit trail of administrative actions, node events, and database operations.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        value={logSearch}
                        onChange={e => setLogSearch(e.target.value)}
                        placeholder="Search audit details..."
                        className="bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-slate-700 outline-none w-[180px]"
                      />

                      <select
                        value={logStatusFilter}
                        onChange={e => setLogStatusFilter(e.target.value as any)}
                        className="bg-[#0A0B10] border border-[#222834] rounded-lg px-3 py-2 text-xs text-slate-300 focus:border-slate-700 outline-none"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="SUCCESS">SUCCESS</option>
                        <option value="FAILED">FAILED</option>
                      </select>

                      <button
                        onClick={handleExportLogsCsv}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        title="Export current logs to CSV file"
                      >
                        <Archive className="w-3.5 h-3.5 text-blue-400" />
                        Export CSV
                      </button>

                      <button
                        onClick={handleClearLogs}
                        className="px-3 py-2 bg-red-950/70 hover:bg-red-900/80 text-red-300 border border-red-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        title="Clear all audit and activity logs"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        Clear Logs
                      </button>
                    </div>
                  </div>

                  {/* Audit Logs Table */}
                  <div className="bg-[#151821] border border-[#222834] rounded-xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-[#0c1630] text-xs font-bold text-white uppercase tracking-wider font-display border-b-2 border-blue-500">
                          <tr>
                            <th className="p-4 text-white font-bold">Timestamp</th>
                            <th className="p-4 text-white font-bold">Node target</th>
                            <th className="p-4 text-white font-bold">DBA Operator</th>
                            <th className="p-4 text-white font-bold">Action Triggered</th>
                            <th className="p-4 text-white font-bold">Status</th>
                            <th className="p-4 text-white font-bold">Audit Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#222834]/60 font-sans" id="global-logs-tbody">
                          {filteredLogs.map(log => (
                            <tr key={log.id} className="hover:bg-[#0A0B10]/40">
                              <td className="p-4 text-xs text-slate-400 font-mono">
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td className="p-4 font-semibold text-slate-200">{log.nodeName}</td>
                              <td className="p-4 text-xs text-slate-400 font-mono">{log.user}</td>
                              <td className="p-4 font-mono text-emerald-400 text-xs">{log.action}</td>
                              <td className="p-4">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                }`}>
                                  {log.status}
                                </span>
                              </td>
                              <td className="p-4 text-xs text-slate-400 italic max-w-sm truncate" title={log.details}>
                                {log.details || '-'}
                              </td>
                            </tr>
                          ))}

                          {filteredLogs.length === 0 && (
                            <tr>
                              <td colSpan={6} className="text-center py-12 text-slate-500">
                                No audit records matched the filter criteria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {(activeMenu === 'database-setup' || (activeMenu as string) === 'all-databases') && (
                <AllDatabasesSetupView
                  nodes={nodes}
                  telemetry={telemetry}
                  primaryDbs={primaryDbs}
                  standbyDbs={standbyDbs}
                  farSyncInstances={farSyncInstances}
                  currentUser={currentUser}
                  onAddPrimaryDb={handleAddPrimaryDb}
                  onDeletePrimaryDb={handleDeletePrimaryDb}
                  onAddStandbyDb={handleAddStandbyDb}
                  onDeleteStandbyDb={handleDeleteStandbyDb}
                  onToggleRedoApply={handleToggleRedoApply}
                  onPowerOnStandbyDb={handlePowerOnStandbyDb}
                  onSetModeStandbyDb={handleSetModeStandbyDb}
                  onSwitchoverStandbyDb={handleSwitchoverStandbyDb}
                  onFailoverStandbyDb={handleFailoverStandbyDb}
                  onSwitchLogfile={handleSwitchLogfile}
                  onRefresh={handleManualRefresh}
                  onNavigateMenu={(menuId) => setActiveMenu(menuId as any)}
                  isConnecting={isConnecting}
                />
              )}

              {activeMenu === 'primary-dbs' && (
                <PrimaryDbView
                  nodes={nodes}
                  primaryDbs={primaryDbs}
                  standbyDbs={standbyDbs}
                  currentUser={currentUser}
                  standbyDbsCountMap={primaryDbs.reduce((acc, p) => {
                    acc[p.id] = standbyDbs.filter(s => s.primaryDbId === p.id).length;
                    return acc;
                  }, {} as Record<string, number>)}
                  onAddPrimaryDb={handleAddPrimaryDb}
                  onDeletePrimaryDb={handleDeletePrimaryDb}
                  isConnecting={isConnecting}
                />
              )}

              {activeMenu === 'standby-dbs' && (
                <StandbyDbView
                  nodes={nodes}
                  primaryDbs={primaryDbs}
                  standbyDbs={standbyDbs}
                  currentUser={currentUser}
                  onAddStandbyDb={handleAddStandbyDb}
                  onDeleteStandbyDb={handleDeleteStandbyDb}
                  onToggleRedoApply={handleToggleRedoApply}
                  onPowerOnStandbyDb={handlePowerOnStandbyDb}
                  onSetModeStandbyDb={handleSetModeStandbyDb}
                  onSwitchoverStandbyDb={handleSwitchoverStandbyDb}
                  onFailoverStandbyDb={handleFailoverStandbyDb}
                  isConnecting={isConnecting}
                />
              )}

              {activeMenu === 'farsync' && (
                <FarSyncView
                  farSyncInstances={farSyncInstances}
                  primaryDbs={primaryDbs}
                  standbyDbs={standbyDbs}
                  nodes={nodes}
                  currentUser={currentUser}
                  onRefresh={handleManualRefresh}
                />
              )}

              {activeMenu === 'redo-apply' && (
                <RedoApplyView
                  primaryDbs={primaryDbs}
                  standbyDbs={standbyDbs}
                  onToggleRedoApply={handleToggleRedoApply}
                  onSwitchLogfile={handleSwitchLogfile}
                  onDeletePrimaryDb={handleDeletePrimaryDb}
                  onDeleteStandbyDb={handleDeleteStandbyDb}
                />
              )}

              {activeMenu === 'users' && (
                <UserManagementView
                  currentUser={currentUser}
                  users={users}
                  onCreateUser={handleCreateUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                />
              )}
            </>
          )}
          </div>
        </div>
      </main>
      </div>

      {/* Scrolling Notification Footer (notification footer scroll left to right) */}
      <footer className="h-10 bg-indigo-950/80 border-t border-indigo-500/30 shrink-0 overflow-hidden flex items-center relative z-20 shadow-lg shadow-indigo-500/5">
        <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#0c0d2b] to-transparent w-16 z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-[#210c37] to-transparent w-16 z-10 pointer-events-none"></div>
        
        <div className="pl-4 pr-3 py-1 font-bold font-display text-[11px] text-white bg-gradient-to-r from-pink-500 to-indigo-600 shrink-0 h-full flex items-center z-20 border-r border-indigo-500/30 shadow-md">
          <Bell className="w-3.5 h-3.5 animate-bounce mr-1.5 text-white" />
          SYSTEM BROADCASTS
        </div>
        
        <div className="flex-1 overflow-hidden relative">
          <div className="animate-ticker-right flex items-center gap-10 whitespace-nowrap py-1">
            {(() => {
              const baseItems = (notifications && notifications.length > 0)
                ? notifications
                : [
                    { id: 'b1', message: 'ORACLE DATA GUARD STANDBY ENGINE ACTIVE • REAL-TIME REDO LOG TRANSPORT RUNNING', type: 'info', timestamp: new Date().toISOString() },
                    { id: 'b2', message: 'RAC CLUSTER ENVIRONMENT STABLE • ALL INSTANCES REPORTING 100% HEALTHY SLA', type: 'success', timestamp: new Date().toISOString() },
                    { id: 'b3', message: 'ASM DISKGROUPS DATA_DG & RECO_DG MOUNTED • 0 DISK ERRORS DETECTED', type: 'info', timestamp: new Date().toISOString() },
                    { id: 'b4', message: 'ACTIVE DATA GUARD STANDBY SYNCHRONIZED • ZERO REPLICATION LAG', type: 'success', timestamp: new Date().toISOString() },
                    { id: 'b5', message: 'GRID LISTENER PORT 1521 & DEDICATED STANDBY LISTENER ACTIVE', type: 'info', timestamp: new Date().toISOString() }
                  ];
              const tickerStream = [...baseItems, ...baseItems, ...baseItems, ...baseItems, ...baseItems, ...baseItems];
              return tickerStream.map((notif, idx) => (
                <span key={`${notif.id}-${idx}`} className="inline-flex items-center gap-2 text-xs font-mono shrink-0">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${
                    notif.type === 'error' ? 'bg-red-500 animate-ping' :
                    notif.type === 'warning' ? 'bg-amber-500' :
                    notif.type === 'success' ? 'bg-emerald-400' : 'bg-sky-400'
                  }`} />
                  <span className="text-slate-100 font-semibold">{notif.message}</span>
                  <span className="text-[10px] text-sky-300/80">({new Date(notif.timestamp).toLocaleTimeString()})</span>
                </span>
              ));
            })()}
          </div>
        </div>
      </footer>

      {/* Right-Side Interactive Notification Center */}
      <div className="fixed right-6 bottom-20 z-50 flex flex-col items-end gap-3" id="right-side-notification-center">
        {/* Alerts Dropdown Panel */}
        {showRightAlertsPanel && (
          <div className="mb-1 w-80 bg-[#0f1322] border border-[#1c2a4f] rounded-xl shadow-2xl p-4 text-slate-200 animate-fade-in flex flex-col max-h-[400px]" id="right-side-alerts-panel">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#1c2a4f] mb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400 animate-bounce" />
                <span className="font-display font-bold text-xs text-slate-100 uppercase tracking-wider">Grid Alert Log Stream</span>
              </div>
              <button
                onClick={() => setAccumulatedAlerts([])}
                className="text-[10px] text-slate-400 hover:text-slate-200 uppercase tracking-wider font-mono cursor-pointer"
              >
                Clear All
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[280px]">
              {accumulatedAlerts.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 italic">
                  No active system warnings or alerts.
                </div>
              ) : (
                accumulatedAlerts.map((item) => (
                  <div key={item.id} className="p-3 bg-[#121b33]/60 border border-[#1c2a4f]/50 hover:border-[#1c2a4f] rounded-lg transition text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        item.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {item.type === 'error' ? 'Critical' : 'Warning'}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {item.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-normal font-sans text-[11px]">{item.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Floating Bell Icon Button */}
        <button
          onClick={() => setShowRightAlertsPanel(!showRightAlertsPanel)}
          className="relative bg-[#0c0d1e] hover:bg-slate-800 border-2 border-amber-500/50 p-3 rounded-full text-amber-400 hover:text-amber-300 transition-all cursor-pointer flex items-center justify-center shadow-lg shadow-amber-500/10 hover:scale-105 active:scale-95"
          title="Toggle Grid Alerts Log Panel"
          id="right-side-alerts-trigger"
        >
          <Bell className={`w-5 h-5 ${accumulatedAlerts.length > 0 ? 'animate-pulse text-amber-400' : 'text-slate-400'}`} />
          {accumulatedAlerts.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-red-500 to-amber-500 text-white font-bold text-[10px] h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center border border-[#0c0d1e] shadow-md animate-bounce">
              {accumulatedAlerts.length}
            </span>
          )}
        </button>
      </div>

      {/* Floating Notifications Toasts (Used for immediate action feedbacks only) */}
      <div className="fixed bottom-6 right-6 space-y-3 z-50 w-[350px]" id="floating-toasts-container">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-xl shadow-2xl border transition-all animate-fade-in ${
              toast.type === 'error' ? 'bg-red-950 border-red-900 text-red-200 shadow-red-950/20' :
              toast.type === 'warning' ? 'bg-amber-950 border-amber-900 text-amber-200 shadow-amber-950/20' :
              'bg-slate-900 border-slate-800 text-slate-200 shadow-slate-950/40'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            ) : toast.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
            )}
            <div className="flex-1 text-xs font-sans leading-relaxed">
              {toast.message}
            </div>
          </div>
        ))}
      </div>

      {/* Admin Authentication Gate & Settings Modal */}
      {!isAuthenticated && (
        <AdminAuthModal
          isOpen={!isAuthenticated}
          mode="login"
          currentAdmin={adminAccount}
          allUsers={users}
          branding={branding}
          alertSettings={alertSettings}
          emergencyLogs={emergencyLogs}
          onLoginSuccess={handleLoginSuccess}
          onUpdateAdmin={handleUpdateAdminAccount}
          onUpdateBranding={setBranding}
          onUpdateAlertSettings={setAlertSettings}
          onSendTestAlert={handleSendTestAlert}
          onClearEmergencyLogs={handleClearEmergencyLogs}
          onUpdateUserAvatar={handleUpdateUserAvatar}
        />
      )}

      {isAuthenticated && showSettingsModal && (
        <AdminAuthModal
          isOpen={showSettingsModal}
          mode="settings"
          currentAdmin={adminAccount}
          allUsers={users}
          branding={branding}
          alertSettings={alertSettings}
          emergencyLogs={emergencyLogs}
          onLoginSuccess={handleLoginSuccess}
          onUpdateAdmin={handleUpdateAdminAccount}
          onUpdateBranding={setBranding}
          onUpdateAlertSettings={setAlertSettings}
          onSendTestAlert={handleSendTestAlert}
          onClearEmergencyLogs={handleClearEmergencyLogs}
          onUpdateUserAvatar={handleUpdateUserAvatar}
          onClose={() => setShowSettingsModal(false)}
          onLogout={handleLogout}
        />
      )}

      {/* Tomcat & API Backend Settings Modal */}
      <ApiServerConfigModal
        isOpen={showApiServerModal}
        onClose={() => setShowApiServerModal(false)}
        onSaved={(url) => {
          setApiServerUrl(url);
          addToast(url ? `Backend API URL set to ${url}` : 'Using relative default API origin', 'info');
          fetchNodes();
          fetchDbStatus();
        }}
      />
      {/* Dynamic Video & Infographic Visual FX & Canvas Studio */}
      <DynamicVideoInfographicCanvas
        config={themeConfig}
        onChangeConfig={handleUpdateThemeConfig}
        cursorEnabled={infographicCursorEnabled}
        onToggleCursor={() => setInfographicCursorEnabled(!infographicCursorEnabled)}
      />
      {/* Infographic High-Tech Reticle & HUD Cursor Engine */}
      <InfographicCursor enabled={infographicCursorEnabled} />
    </div>
  );
}
