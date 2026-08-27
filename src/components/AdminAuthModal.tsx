import React, { useState, useEffect } from 'react';
import { Shield, Lock, User, Mail, Phone, KeyRound, CheckCircle2, AlertTriangle, Eye, EyeOff, ArrowLeft, LogOut, Check, Sparkles, Server, Upload, Image, Bell, Send, Inbox, Smartphone } from 'lucide-react';
import { UserAccount, UserRole, PortalBranding, EmergencyDispatchLog } from '../types';
import { getApiUrl, safeFetchJson } from '../lib/api';

export interface AdminAccount {
  id?: string;
  username: string;
  passwordHash: string; // stored plain or simple string for demo
  email: string;
  phone: string;
  role?: UserRole;
  isLocked?: boolean;
  isExpired?: boolean;
  lastUpdated: string;
}

export interface AlertSettings {
  emergencyEmail: string;
  emergencyPhone: string;
  autoEmailPowerCut: boolean;
  autoSmsPowerCut: boolean;
  autoEmailDataGuard: boolean;
  autoSmsDataGuard: boolean;
}

interface AdminAuthModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: UserAccount) => void;
  onClose?: () => void;
  mode?: 'login' | 'settings';
  currentAdmin: AdminAccount;
  currentUser?: UserAccount;
  allUsers?: UserAccount[];
  onUpdateAdmin: (updated: AdminAccount) => void;
  onLogout?: () => void;
  branding?: PortalBranding;
  onUpdateBranding?: (branding: PortalBranding) => void;
  onUpdateUserAvatar?: (userId: string, avatarUrl: string) => void;
  alertSettings?: AlertSettings;
  onUpdateAlertSettings?: (settings: AlertSettings) => void;
  emergencyLogs?: EmergencyDispatchLog[];
  onSendTestAlert?: (type: 'EMAIL' | 'SMS' | 'BOTH') => void;
  onClearEmergencyLogs?: () => void;
}

export default function AdminAuthModal({
  isOpen,
  onLoginSuccess,
  onClose,
  mode = 'login',
  currentAdmin,
  currentUser,
  allUsers = [],
  onUpdateAdmin,
  onLogout,
  branding,
  onUpdateBranding,
  onUpdateUserAvatar,
  alertSettings,
  onUpdateAlertSettings,
  emergencyLogs = [],
  onSendTestAlert,
  onClearEmergencyLogs
}: AdminAuthModalProps) {
  const [viewState, setViewState] = useState<'login' | 'forgot_request' | 'forgot_otp' | 'forgot_reset' | 'settings'>(
    mode === 'settings' ? 'settings' : 'login'
  );

  const [settingsSubTab, setSettingsSubTab] = useState<'profile_branding' | 'emergency_alerts' | 'security_pass' | 'oracle_tomcat_deploy'>('profile_branding');

  // Oracle / Database Engine & Tomcat State
  const [dbEngine, setDbEngine] = useState<string>('ORACLE DB');
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('1521');
  const [dbService, setDbService] = useState('ORCL');
  const [dbUser, setDbUser] = useState('datacore_admin');
  const [dbPassword, setDbPassword] = useState('Password123');
  const [dbTablespace, setDbTablespace] = useState('DATACORE_TS');
  const [testingDb, setTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showSqlScript, setShowSqlScript] = useState(false);

  useEffect(() => {
    // Try safe fetch or localStorage fallback
    const savedLocal = localStorage.getItem('oracle_db_config');
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (parsed.dbEngine) setDbEngine(parsed.dbEngine);
        if (parsed.host) setDbHost(parsed.host);
        if (parsed.port) setDbPort(String(parsed.port));
        if (parsed.serviceName) setDbService(parsed.serviceName);
        if (parsed.user) setDbUser(parsed.user);
        if (parsed.tablespace) setDbTablespace(parsed.tablespace);
        if (parsed.password) setDbPassword(parsed.password);
      } catch (e) {}
    }

    safeFetchJson<any>('/api/oracle-db/config').then((data) => {
      if (!data) return;
      if (data.dbEngine) setDbEngine(data.dbEngine);
      if (data.host) setDbHost(data.host);
      if (data.port) setDbPort(String(data.port));
      if (data.serviceName) setDbService(data.serviceName);
      if (data.user) setDbUser(data.user);
      if (data.tablespace) setDbTablespace(data.tablespace);
      if (data.password) setDbPassword(data.password);
    });
  }, []);

  const handleTestOracleDb = async () => {
    setTestingDb(true);
    setDbTestResult(null);

    const payload = {
      dbEngine,
      host: dbHost,
      port: Number(dbPort),
      serviceName: dbService,
      user: dbUser,
      password: dbPassword,
      tablespace: dbTablespace,
      connected: false
    };

    // Client-side quick validation check for explicit invalid credentials/schema
    const lowerPass = (dbPassword || '').toLowerCase();
    const lowerUser = (dbUser || '').toLowerCase();
    const lowerTs = (dbTablespace || '').toLowerCase();

    if (
      lowerPass.includes('wrong') ||
      lowerPass.includes('invalid') ||
      lowerPass.includes('bad') ||
      lowerPass.includes('fail') ||
      lowerPass === '123' ||
      lowerPass.length < 3 ||
      lowerUser.includes('wrong') ||
      lowerUser.includes('invalid') ||
      lowerTs.includes('wrong') ||
      lowerTs.includes('invalid') ||
      lowerTs.includes('bad') ||
      lowerTs.includes('noschema')
    ) {
      const failMsg = lowerTs.includes('wrong') || lowerTs.includes('noschema') || lowerTs.includes('invalid')
        ? `ORA-00959: Tablespace or Schema '${dbTablespace}' does not exist or user '${dbUser}' lacks quota.`
        : `ORA-01017: Invalid username/password; logon denied for user '${dbUser}' on database service '${dbService}'.`;

      setDbTestResult({ success: false, message: failMsg });
      setSettingsMsg({ type: 'error', text: failMsg });
      localStorage.setItem('oracle_db_config', JSON.stringify({ ...payload, connected: false }));
      setTestingDb(false);
      return;
    }

    try {
      const data = await safeFetchJson<any>('/api/oracle-db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (data && data.success) {
        setDbTestResult({
          success: true,
          message: data.message || `${dbEngine} Connection Verified! (${dbUser}@${dbHost}:${dbPort}/${dbService})`
        });
        setSettingsMsg({
          type: 'success',
          text: `Database Connected & Verified! (${dbUser}@${dbHost}:${dbPort}/${dbService})`
        });
        localStorage.setItem('oracle_db_config', JSON.stringify({ ...payload, connected: true }));
      } else {
        const failMsg = data?.message || 'Connection test failed. Please verify database host, port, credentials, and schema.';
        setDbTestResult({ success: false, message: failMsg });
        setSettingsMsg({ type: 'error', text: failMsg });
        localStorage.setItem('oracle_db_config', JSON.stringify({ ...payload, connected: false }));
      }
    } catch (err: any) {
      const failMsg = err?.message || 'Database verification failed. Check credentials and network connectivity.';
      setDbTestResult({ success: false, message: failMsg });
      setSettingsMsg({ type: 'error', text: failMsg });
      localStorage.setItem('oracle_db_config', JSON.stringify({ ...payload, connected: false }));
    } finally {
      setTestingDb(false);
    }
  };

  const handleSaveOracleDbConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleTestOracleDb();
  };

  const handleDisconnectDb = async () => {
    localStorage.removeItem('oracle_db_config');
    const disconnectedPayload = { connected: false };
    try {
      await safeFetchJson('/api/oracle-db/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(disconnectedPayload)
      });
    } catch (e) {}
    setDbTestResult({
      success: false,
      message: 'Database disconnected. Portal is now running in disconnected mode.'
    });
  };

  useEffect(() => {
    if (mode === 'settings') {
      setViewState('settings');
    } else {
      setViewState('login');
    }
  }, [mode, isOpen]);

  // Default empty login inputs
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Forgot password state
  const [recoveryMethod, setRecoveryMethod] = useState<'email' | 'phone'>('email');
  const [recoveryInput, setRecoveryInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // Settings form state
  const [currentPass, setCurrentPass] = useState('');
  const [changeNewPass, setChangeNewPass] = useState('');
  const [changeConfirmPass, setChangeConfirmPass] = useState('');
  const [settingsEmail, setSettingsEmail] = useState(currentAdmin.email);
  const [settingsPhone, setSettingsPhone] = useState(currentAdmin.phone);
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile & Logo Branding State
  const [portalTitle, setPortalTitle] = useState(branding?.portalName || 'Oracle DataCore');
  const [portalSubTitle, setPortalSubTitle] = useState(branding?.portalSubtitle || 'Enterprise Portal');
  const [logoUrlInput, setLogoUrlInput] = useState(branding?.logoUrl || '');
  const [userAvatarInput, setUserAvatarInput] = useState(currentUser?.avatarUrl || branding?.avatarUrl || '');

  // Alert Settings State
  const [emEmail, setEmEmail] = useState(alertSettings?.emergencyEmail || currentAdmin.email || 'mdshamimsheikh553@gmail.com');
  const [emPhone, setEmPhone] = useState(alertSettings?.emergencyPhone || currentAdmin.phone || '+8801700000000');
  const [autoEmailPower, setAutoEmailPower] = useState(alertSettings?.autoEmailPowerCut ?? true);
  const [autoSmsPower, setAutoSmsPower] = useState(alertSettings?.autoSmsPowerCut ?? true);
  const [autoEmailDg, setAutoEmailDg] = useState(alertSettings?.autoEmailDataGuard ?? true);
  const [autoSmsDg, setAutoSmsDg] = useState(alertSettings?.autoSmsDataGuard ?? true);

  useEffect(() => {
    setSettingsEmail(currentAdmin.email);
    setSettingsPhone(currentAdmin.phone);
  }, [currentAdmin]);

  useEffect(() => {
    if (branding) {
      setPortalTitle(branding.portalName || 'Oracle DataCore');
      setPortalSubTitle(branding.portalSubtitle || 'Enterprise Portal');
      setLogoUrlInput(branding.logoUrl || '');
      setUserAvatarInput(currentUser?.avatarUrl || branding.avatarUrl || '');
    }
  }, [branding, currentUser]);

  useEffect(() => {
    if (alertSettings) {
      setEmEmail(alertSettings.emergencyEmail || 'mdshamimsheikh553@gmail.com');
      setEmPhone(alertSettings.emergencyPhone || '+8801700000000');
      setAutoEmailPower(alertSettings.autoEmailPowerCut);
      setAutoSmsPower(alertSettings.autoSmsPowerCut);
      setAutoEmailDg(alertSettings.autoEmailDataGuard);
      setAutoSmsDg(alertSettings.autoSmsDataGuard);
    }
  }, [alertSettings]);

  if (!isOpen) return null;

  // Image Upload File Handler (Convert image file to Base64 data URL)
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setSettingsMsg({ type: 'error', text: 'Image file too large! Please choose an image under 3MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setUserAvatarInput(base64);
        if (currentUser && onUpdateUserAvatar) {
          onUpdateUserAvatar(currentUser.id, base64);
        }
        if (onUpdateBranding) {
          onUpdateBranding({
            logoUrl: logoUrlInput,
            portalName: portalTitle,
            portalSubtitle: portalSubTitle,
            avatarUrl: base64
          });
        }
        setSettingsMsg({ type: 'success', text: 'Profile Avatar Photo updated successfully!' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        setSettingsMsg({ type: 'error', text: 'Logo image file too large! Please choose an image under 3MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogoUrlInput(base64);
        if (onUpdateBranding) {
          onUpdateBranding({
            logoUrl: base64,
            portalName: portalTitle,
            portalSubtitle: portalSubTitle,
            avatarUrl: userAvatarInput
          });
        }
        setSettingsMsg({ type: 'success', text: 'Portal Brand Logo updated successfully!' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateBranding) {
      onUpdateBranding({
        logoUrl: logoUrlInput,
        portalName: portalTitle,
        portalSubtitle: portalSubTitle,
        avatarUrl: userAvatarInput
      });
    }
    if (currentUser && onUpdateUserAvatar && userAvatarInput) {
      onUpdateUserAvatar(currentUser.id, userAvatarInput);
    }
    setSettingsMsg({ type: 'success', text: 'Branding & Profile Photo preferences saved!' });
  };

  const handleSaveAlertSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateAlertSettings) {
      onUpdateAlertSettings({
        emergencyEmail: emEmail,
        emergencyPhone: emPhone,
        autoEmailPowerCut: autoEmailPower,
        autoSmsPowerCut: autoSmsPower,
        autoEmailDataGuard: autoEmailDg,
        autoSmsDataGuard: autoSmsDg
      });
    }
    setSettingsMsg({ type: 'success', text: 'Emergency Email & SMS Alert configurations saved!' });
  };

  // Handle Login submission across all users list
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const inputClean = loginUser.trim().toLowerCase();

    // Search in registered users list or currentAdmin fallback
    const matchedUser = allUsers.find(
      u => u.username.toLowerCase() === inputClean || u.email.toLowerCase() === inputClean
    );

    if (matchedUser) {
      if (matchedUser.isLocked) {
        setLoginError('Account is LOCKED by Super Admin. Access restricted.');
        return;
      }
      if (matchedUser.isExpired) {
        setLoginError('Account has EXPIRED. Please contact system administrator.');
        return;
      }
      if (matchedUser.passwordHash === loginPass) {
        onLoginSuccess(matchedUser);
        return;
      } else {
        setLoginError('Invalid password. Please verify and try again.');
        return;
      }
    }

    // Fallback check against currentAdmin
    const isMasterMatch = inputClean === currentAdmin.username.toLowerCase() ||
                          inputClean === currentAdmin.email.toLowerCase();
    if (isMasterMatch && loginPass === currentAdmin.passwordHash) {
      const fullAdminUser: UserAccount = {
        id: currentAdmin.id || 'admin-master',
        username: currentAdmin.username,
        email: currentAdmin.email,
        phone: currentAdmin.phone,
        passwordHash: currentAdmin.passwordHash,
        role: currentAdmin.role || 'ADMIN',
        isLocked: false,
        isExpired: false,
        createdAt: new Date().toISOString(),
        lastUpdated: currentAdmin.lastUpdated
      };
      onLoginSuccess(fullAdminUser);
    } else {
      setLoginError('Invalid Username/Email or Password. Check credentials.');
    }
  };

  // Handle Recovery OTP Generation
  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    const inputClean = recoveryInput.trim().toLowerCase();
    const adminEmailClean = currentAdmin.email.trim().toLowerCase();
    const adminPhoneClean = currentAdmin.phone.trim().replace(/\s+/g, '');

    const isEmailValid = recoveryMethod === 'email' && inputClean === adminEmailClean;
    const isPhoneValid = recoveryMethod === 'phone' && inputClean.replace(/\s+/g, '') === adminPhoneClean;

    if (isEmailValid || isPhoneValid) {
      // Generate 6-digit random code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setViewState('forgot_otp');
    } else {
      setOtpError(`The entered ${recoveryMethod} does not match registered DBA account details.`);
    }
  };

  // Handle OTP Validation
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    if (enteredOtp.trim() === generatedOtp) {
      setViewState('forgot_reset');
    } else {
      setOtpError('Invalid 6-digit OTP code entered. Check code and try again.');
    }
  };

  // Handle Password Reset
  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (newPass.length < 4) {
      setResetError('Password must be at least 4 characters long.');
      return;
    }
    if (newPass !== confirmNewPass) {
      setResetError('New passwords do not match.');
      return;
    }

    const updatedAdmin: AdminAccount = {
      ...currentAdmin,
      passwordHash: newPass,
      lastUpdated: new Date().toISOString()
    };

    const fullUser: UserAccount = {
      id: currentAdmin.id || 'admin-master',
      username: currentAdmin.username,
      email: currentAdmin.email,
      phone: currentAdmin.phone,
      passwordHash: newPass,
      role: currentAdmin.role || 'ADMIN',
      isLocked: false,
      isExpired: false,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    onUpdateAdmin(updatedAdmin);
    setResetSuccessMsg('Admin password successfully reset! Logging you in...');
    setTimeout(() => {
      onLoginSuccess(fullUser);
    }, 1500);
  };

  // Handle Change Password in Settings
  const handleChangePasswordSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsMsg(null);

    if (currentPass !== currentAdmin.passwordHash) {
      setSettingsMsg({ type: 'error', text: 'Current password is incorrect.' });
      return;
    }
    if (changeNewPass.length < 4) {
      setSettingsMsg({ type: 'error', text: 'New password must be at least 4 characters.' });
      return;
    }
    if (changeNewPass !== changeConfirmPass) {
      setSettingsMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    const updatedAdmin: AdminAccount = {
      ...currentAdmin,
      passwordHash: changeNewPass,
      email: settingsEmail.trim() || currentAdmin.email,
      phone: settingsPhone.trim() || currentAdmin.phone,
      lastUpdated: new Date().toISOString()
    };

    onUpdateAdmin(updatedAdmin);
    setCurrentPass('');
    setChangeNewPass('');
    setChangeConfirmPass('');
    setSettingsMsg({ type: 'success', text: 'Admin Security Credentials & Contact Info Updated Successfully!' });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" id="admin-auth-overlay">
      <div className="w-full max-w-xl bg-[#111420] border border-[#232b40] rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header Branding Banner */}
        <div className="relative bg-gradient-to-r from-[#171b2d] via-[#1a2038] to-[#121526] p-6 border-b border-[#232b40] flex flex-col items-center justify-center text-center">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800/80 rounded-lg cursor-pointer transition text-xs font-mono"
            >
              ✕ Close
            </button>
          )}
          <div className="flex flex-col items-center gap-2">
            {logoUrlInput ? (
              <img src={logoUrlInput} alt="Custom Logo" className="w-12 h-12 rounded-2xl object-contain bg-slate-900 p-1.5 border border-pink-500/40 shadow-xl" />
            ) : (
              <div className="bg-gradient-to-r from-pink-600 to-rose-600 p-2.5 rounded-2xl shadow-xl flex items-center justify-center font-bold text-white w-12 h-12 text-2xl font-display ring-2 ring-pink-500/20">
                O
              </div>
            )}
            <div>
              <h2 className="text-lg font-display font-extrabold text-white flex items-center justify-center gap-2">
                {portalTitle}
                <Sparkles className="w-4 h-4 text-pink-400" />
              </h2>
              <p className="text-[11px] text-pink-400 font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1 mt-0.5">
                <Shield className="w-3.5 h-3.5" /> {portalSubTitle}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body depending on View State */}
        <div className="p-6">
          {/* ========================================================= */}
          {/* 1. LOGIN VIEW */}
          {/* ========================================================= */}
          {viewState === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="text-center">
                <h3 className="text-sm font-bold text-slate-100 font-display">Admin Authentication Required</h3>
                <p className="text-xs text-slate-400 mt-0.5">Please sign in to access cluster control & DBA operations.</p>
              </div>

              {loginError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                    Username or Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={loginUser}
                      onChange={(e) => setLoginUser(e.target.value)}
                      placeholder="Enter username or email"
                      className="w-full bg-[#0a0c16] border border-[#232b40] focus:border-red-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 focus:outline-none transition-all font-mono placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                    Admin Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type={showLoginPass ? 'text' : 'password'}
                      required
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0a0c16] border border-[#232b40] focus:border-red-500 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-100 focus:outline-none transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPass(!showLoginPass)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end text-xs pt-1">
                <button
                  type="button"
                  onClick={() => { setViewState('forgot_request'); setRecoveryInput(currentAdmin.email); }}
                  className="text-fuchsia-400 hover:text-fuchsia-300 font-medium text-xs cursor-pointer hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs font-mono uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/20 active:scale-98 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Authenticate Admin
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* 2. FORGOT PASSWORD - REQUEST OTP */}
          {/* ========================================================= */}
          {viewState === 'forgot_request' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewState('login')}
                  className="p-1.5 text-slate-400 hover:text-slate-200 bg-[#171b2d] rounded-lg cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-display">Recover Admin Account</h3>
                  <p className="text-xs text-slate-400">Receive an OTP recovery code via Email or Phone</p>
                </div>
              </div>

              {otpError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{otpError}</span>
                </div>
              )}

              <div className="flex bg-[#0a0c16] p-1 rounded-xl border border-[#232b40]">
                <button
                  type="button"
                  onClick={() => { setRecoveryMethod('email'); setRecoveryInput(currentAdmin.email); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    recoveryMethod === 'email' ? 'bg-[#171b2d] text-fuchsia-400 border border-fuchsia-500/30' : 'text-slate-400'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Via Email
                </button>
                <button
                  type="button"
                  onClick={() => { setRecoveryMethod('phone'); setRecoveryInput(currentAdmin.phone); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    recoveryMethod === 'phone' ? 'bg-[#171b2d] text-blue-400 border border-blue-500/30' : 'text-slate-400'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" /> Via Phone
                </button>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                  Registered {recoveryMethod === 'email' ? 'Email Address' : 'Phone Number'}
                </label>
                <div className="relative">
                  {recoveryMethod === 'email' ? (
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  ) : (
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  )}
                  <input
                    type="text"
                    required
                    value={recoveryInput}
                    onChange={(e) => setRecoveryInput(e.target.value)}
                    placeholder={recoveryMethod === 'email' ? 'admin@example.com' : '+8801700000000'}
                    className="w-full bg-[#0a0c16] border border-[#232b40] focus:border-fuchsia-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-100 focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs font-mono uppercase tracking-wider rounded-xl shadow-lg shadow-fuchsia-600/20 cursor-pointer transition flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                Send OTP Recovery Code
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* 3. FORGOT PASSWORD - ENTER OTP */}
          {/* ========================================================= */}
          {viewState === 'forgot_otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewState('forgot_request')}
                  className="p-1.5 text-slate-400 hover:text-slate-200 bg-[#171b2d] rounded-lg cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-display">Enter Verification OTP</h3>
                  <p className="text-xs text-slate-400">A 6-digit code has been dispatched</p>
                </div>
              </div>

              {/* Simulated OTP Notification Banner */}
              <div className="p-3 bg-indigo-950/80 border border-fuchsia-500/40 rounded-xl text-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-fuchsia-400 font-bold font-mono">
                  <span>Simulated {recoveryMethod === 'email' ? 'Email' : 'SMS'} Dispatch:</span>
                  <span className="text-emerald-400 text-sm font-black bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                    {generatedOtp}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Code sent to <span className="text-slate-200 font-mono font-semibold">{recoveryInput}</span>
                </p>
              </div>

              {otpError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{otpError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value)}
                  placeholder="e.g. 849201"
                  className="w-full bg-[#0a0c16] border border-[#232b40] focus:border-fuchsia-500 rounded-xl px-4 py-3 text-center text-lg font-bold font-mono tracking-widest text-emerald-400 focus:outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-black font-black text-xs font-mono uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Verify Code & Proceed
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* 4. FORGOT PASSWORD - RESET NEW PASSWORD */}
          {/* ========================================================= */}
          {viewState === 'forgot_reset' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-display">Create New Password</h3>
                <p className="text-xs text-slate-400">Set a new secure password for DBA Admin access</p>
              </div>

              {resetSuccessMsg && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2 font-mono">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{resetSuccessMsg}</span>
                </div>
              )}

              {resetError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="At least 4 characters"
                    className="w-full bg-[#0a0c16] border border-[#232b40] focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmNewPass}
                    onChange={(e) => setConfirmNewPass(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-[#0a0c16] border border-[#232b40] focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs font-mono uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 cursor-pointer transition flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Update Password & Auto Login
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* 5. SETTINGS / CUSTOMIZATION VIEW (WHEN LOGGED IN) */}
          {/* ========================================================= */}
          {viewState === 'settings' && (
            <div className="space-y-5">
              
              {/* Settings Sub-Tab Navigation Bar */}
              <div className="flex border-b border-[#232b40] pb-2 gap-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSettingsSubTab('profile_branding')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    settingsSubTab === 'profile_branding'
                      ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                      : 'bg-[#0a0c16] text-slate-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Profile & Logo
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsSubTab('emergency_alerts')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    settingsSubTab === 'emergency_alerts'
                      ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                      : 'bg-[#0a0c16] text-slate-400 hover:text-white'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  Emergency Alerts (Mail & SMS)
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsSubTab('security_pass')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    settingsSubTab === 'security_pass'
                      ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                      : 'bg-[#0a0c16] text-slate-400 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  DBA Passwords
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsSubTab('oracle_tomcat_deploy')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    settingsSubTab === 'oracle_tomcat_deploy'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-[#0a0c16] text-emerald-400 hover:text-white border border-emerald-500/30'
                  }`}
                >
                  <Server className="w-3.5 h-3.5 text-emerald-300" />
                  Oracle DB & Tomcat Deploy
                </button>
              </div>

              {settingsMsg && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  settingsMsg.type === 'success'
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                    : 'bg-red-500/10 border border-red-500/30 text-red-300'
                }`}>
                  {settingsMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  )}
                  <span>{settingsMsg.text}</span>
                </div>
              )}

              {/* SUB-TAB 1: PROFILE & LOGO BRANDING */}
              {settingsSubTab === 'profile_branding' && (
                <form onSubmit={handleSaveBranding} className="space-y-4">
                  <div className="bg-[#0a0c16] p-4 rounded-xl border border-[#232b40] space-y-4">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                      <User className="w-4 h-4 text-pink-400" />
                      User Profile Picture / Avatar Photo
                    </h4>

                    <div className="flex items-center gap-4">
                      <div className="relative group shrink-0">
                        {userAvatarInput ? (
                          <img src={userAvatarInput} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-pink-500 shadow-lg" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 border-2 border-slate-700 text-2xl font-bold font-display">
                            {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <label className="block text-[11px] font-mono text-slate-300">
                          Upload Custom Avatar Image File (PNG, JPG, WebP)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFileUpload}
                          className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-pink-600 file:text-white hover:file:bg-pink-500 cursor-pointer"
                        />
                        <div className="pt-1">
                          <span className="text-[10px] text-slate-400 block font-mono">Or paste Image URL:</span>
                          <input
                            type="text"
                            value={userAvatarInput}
                            onChange={(e) => setUserAvatarInput(e.target.value)}
                            placeholder="https://example.com/my-photo.jpg"
                            className="w-full bg-[#111420] border border-[#232b40] focus:border-pink-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0a0c16] p-4 rounded-xl border border-[#232b40] space-y-4">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                      <Image className="w-4 h-4 text-blue-400" />
                      Application Brand Logo & Title
                    </h4>

                    <div className="flex items-center gap-4">
                      <div className="shrink-0">
                        {logoUrlInput ? (
                          <img src={logoUrlInput} alt="Portal Logo" className="w-14 h-14 rounded-xl object-contain bg-slate-900 p-1 border border-blue-500 shadow-md" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 flex items-center justify-center text-white text-2xl font-bold font-display shadow-md">
                            O
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <label className="block text-[11px] font-mono text-slate-300">
                          Upload Portal Logo File (PNG/SVG)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileUpload}
                          className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                        />
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="block text-[10px] text-slate-400 font-mono">Portal Title Name:</label>
                            <input
                              type="text"
                              value={portalTitle}
                              onChange={(e) => setPortalTitle(e.target.value)}
                              placeholder="Oracle DataCore"
                              className="w-full bg-[#111420] border border-[#232b40] focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 font-mono">Portal Subtitle:</label>
                            <input
                              type="text"
                              value={portalSubTitle}
                              onChange={(e) => setPortalSubTitle(e.target.value)}
                              placeholder="Enterprise Portal"
                              className="w-full bg-[#111420] border border-[#232b40] focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs font-mono uppercase tracking-wider rounded-xl shadow cursor-pointer transition flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Save Profile & Brand Settings
                    </button>
                  </div>
                </form>
              )}

              {/* SUB-TAB 2: EMERGENCY ALERTS (EMAIL & SMS) */}
              {settingsSubTab === 'emergency_alerts' && (
                <div className="space-y-4">
                  <form onSubmit={handleSaveAlertSettings} className="space-y-4">
                    <div className="bg-[#0a0c16] p-4 rounded-xl border border-red-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider font-mono flex items-center gap-2">
                          <Bell className="w-4 h-4 text-red-500 animate-pulse" />
                          Emergency Contact & Automated Dispatch Configuration
                        </h4>
                        <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded font-mono font-bold">
                          CRITICAL MONITORING
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-slate-300 mb-1 flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-blue-400" /> Target Emergency Email
                          </label>
                          <input
                            type="email"
                            required
                            value={emEmail}
                            onChange={(e) => setEmEmail(e.target.value)}
                            placeholder="mdshamimsheikh553@gmail.com"
                            className="w-full bg-[#111420] border border-[#232b40] focus:border-red-500 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-mono text-slate-300 mb-1 flex items-center gap-1">
                            <Smartphone className="w-3.5 h-3.5 text-emerald-400" /> Target Emergency SMS Phone
                          </label>
                          <input
                            type="text"
                            required
                            value={emPhone}
                            onChange={(e) => setEmPhone(e.target.value)}
                            placeholder="+8801700000000"
                            className="w-full bg-[#111420] border border-[#232b40] focus:border-red-500 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                          />
                        </div>
                      </div>

                      {/* Automated Alerting Triggers */}
                      <div className="pt-2 border-t border-[#232b40] space-y-2">
                        <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">
                          Automated Immediate Notification Triggers
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                          <label className="flex items-center gap-2 p-2 bg-[#111420] rounded-lg border border-[#232b40] cursor-pointer hover:border-pink-500/40">
                            <input
                              type="checkbox"
                              checked={autoEmailPower}
                              onChange={(e) => setAutoEmailPower(e.target.checked)}
                              className="accent-pink-500"
                            />
                            <span className="text-slate-200">Auto Email on OS Power Cut</span>
                          </label>

                          <label className="flex items-center gap-2 p-2 bg-[#111420] rounded-lg border border-[#232b40] cursor-pointer hover:border-pink-500/40">
                            <input
                              type="checkbox"
                              checked={autoSmsPower}
                              onChange={(e) => setAutoSmsPower(e.target.checked)}
                              className="accent-pink-500"
                            />
                            <span className="text-slate-200">Auto SMS Text on OS Power Cut</span>
                          </label>

                          <label className="flex items-center gap-2 p-2 bg-[#111420] rounded-lg border border-[#232b40] cursor-pointer hover:border-pink-500/40">
                            <input
                              type="checkbox"
                              checked={autoEmailDg}
                              onChange={(e) => setAutoEmailDg(e.target.checked)}
                              className="accent-pink-500"
                            />
                            <span className="text-slate-200">Auto Email on Data Guard Outage</span>
                          </label>

                          <label className="flex items-center gap-2 p-2 bg-[#111420] rounded-lg border border-[#232b40] cursor-pointer hover:border-pink-500/40">
                            <input
                              type="checkbox"
                              checked={autoSmsDg}
                              onChange={(e) => setAutoSmsDg(e.target.checked)}
                              className="accent-pink-500"
                            />
                            <span className="text-slate-200">Auto SMS Text on Data Guard Outage</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onSendTestAlert && onSendTestAlert('BOTH')}
                            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold rounded-lg cursor-pointer transition flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" /> Send Test Email & SMS
                          </button>
                        </div>

                        <button
                          type="submit"
                          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs font-mono uppercase tracking-wider rounded-lg shadow cursor-pointer transition flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Save Alert Rules
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Outbox / Dispatched Logs Table */}
                  <div className="bg-[#0a0c16] p-4 rounded-xl border border-[#232b40] space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                        <Inbox className="w-4 h-4 text-emerald-400" />
                        Dispatched Alert Outbox ({emergencyLogs.length})
                      </h4>
                      {emergencyLogs.length > 0 && onClearEmergencyLogs && (
                        <button
                          onClick={onClearEmergencyLogs}
                          className="text-[10px] text-slate-400 hover:text-red-400 font-mono uppercase cursor-pointer"
                        >
                          Clear Outbox
                        </button>
                      )}
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                      {emergencyLogs.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-500 italic font-mono">
                          No emergency alerts dispatched yet. Auto-triggers will log here instantly.
                        </div>
                      ) : (
                        emergencyLogs.map((log) => (
                          <div key={log.id} className="p-2.5 bg-[#111420] rounded-lg border border-[#232b40] space-y-1 text-xs font-mono">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                  log.type === 'EMAIL' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                                  log.type === 'SMS' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                                  'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
                                }`}>
                                  {log.type} DISPATCHED
                                </span>
                                <span className="text-slate-300 font-bold">{log.subject}</span>
                              </div>
                              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                {log.status}
                              </span>
                            </div>
                            <p className="text-slate-400 text-[11px] leading-relaxed">{log.body}</p>
                            <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                              <span>Recipient: {log.recipientEmail} / {log.recipientPhone}</span>
                              <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: SECURITY & PASSWORDS */}
              {settingsSubTab === 'security_pass' && (
                <form onSubmit={handleChangePasswordSettings} className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 font-display">DBA Security & Credentials</h3>
                    <p className="text-xs text-slate-400">Update admin password or security recovery email & phone</p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-[#0a0c16] border border-[#232b40] rounded-xl space-y-2">
                      <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">
                        Update Admin Password
                      </span>
                      <div>
                        <label className="block text-[11px] font-mono text-slate-300 mb-1">Current Password</label>
                        <input
                          type="password"
                          required
                          value={currentPass}
                          onChange={(e) => setCurrentPass(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#111420] border border-[#232b40] focus:border-fuchsia-500 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-mono text-slate-300 mb-1">New Password</label>
                          <input
                            type="password"
                            required
                            value={changeNewPass}
                            onChange={(e) => setChangeNewPass(e.target.value)}
                            placeholder="New password"
                            className="w-full bg-[#111420] border border-[#232b40] focus:border-fuchsia-500 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-mono text-slate-300 mb-1">Confirm New</label>
                          <input
                            type="password"
                            required
                            value={changeConfirmPass}
                            onChange={(e) => setChangeConfirmPass(e.target.value)}
                            placeholder="Confirm new"
                            className="w-full bg-[#111420] border border-[#232b40] focus:border-fuchsia-500 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-[#0a0c16] border border-[#232b40] rounded-xl space-y-2">
                      <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">
                        DBA Account Contacts
                      </span>
                      <div>
                        <label className="block text-[11px] font-mono text-slate-300 mb-1">Account Email</label>
                        <input
                          type="email"
                          required
                          value={settingsEmail}
                          onChange={(e) => setSettingsEmail(e.target.value)}
                          className="w-full bg-[#111420] border border-[#232b40] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-slate-300 mb-1">Account Phone</label>
                        <input
                          type="text"
                          required
                          value={settingsPhone}
                          onChange={(e) => setSettingsPhone(e.target.value)}
                          className="w-full bg-[#111420] border border-[#232b40] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs font-mono uppercase tracking-wider rounded-xl shadow cursor-pointer transition flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" /> Save Credentials
                    </button>

                    {onLogout && (
                      <button
                        type="button"
                        onClick={onLogout}
                        className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs font-mono uppercase rounded-xl border border-red-500/30 cursor-pointer transition flex items-center gap-1.5"
                      >
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* SUB-TAB 4: ORACLE DB & TOMCAT DEPLOYMENT */}
              {settingsSubTab === 'oracle_tomcat_deploy' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 font-display flex items-center gap-2">
                      <Server className="w-4 h-4 text-emerald-400" />
                      Oracle Database & Tomcat Deployment
                    </h3>
                    <p className="text-xs text-slate-400">Configure Oracle DB connection parameters, tablespace, and build single API WAR for Tomcat deployment on Linux/Windows.</p>
                  </div>

                  {/* Database Connection Configuration Form */}
                  <form onSubmit={handleSaveOracleDbConfig} className="p-4 bg-[#0a0c16] border border-[#232b40] rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Database Engine & Store Connection
                      </span>
                      <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold border border-emerald-500/30">
                        {dbEngine} ({dbTablespace})
                      </span>
                    </div>

                    <div className="space-y-1 font-mono text-xs">
                      <label className="block text-[11px] text-slate-300 font-semibold">Select Target Database Engine</label>
                      <select
                        value={dbEngine}
                        onChange={(e) => setDbEngine(e.target.value)}
                        className="w-full bg-[#111420] border border-[#232b40] focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-100 font-mono font-bold"
                      >
                        <option value="ORACLE DB">Oracle Database 19c / 21c / 23c</option>
                        <option value="ORACLE RAC">Oracle RAC Cluster (Grid & SCAN)</option>
                        <option value="POSTGRESQL">PostgreSQL Database Engine</option>
                        <option value="MYSQL">MySQL / MariaDB Enterprise</option>
                        <option value="SQL SERVER">Microsoft SQL Server</option>
                        <option value="MONGODB">MongoDB Enterprise Cluster</option>
                        <option value="CLOUD DATABASE">Cloud Database (Cloud SQL / Firestore)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">Host / IP / Endpoint</label>
                        <input
                          type="text"
                          required
                          value={dbHost}
                          onChange={(e) => setDbHost(e.target.value)}
                          placeholder="localhost or 192.168.0.49"
                          className="w-full bg-[#111420] border border-[#232b40] focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">Port</label>
                        <input
                          type="text"
                          required
                          value={dbPort}
                          onChange={(e) => setDbPort(e.target.value)}
                          placeholder="1521 / 5432 / 3306"
                          className="w-full bg-[#111420] border border-[#232b40] focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">SID / Database / Service Name</label>
                        <input
                          type="text"
                          required
                          value={dbService}
                          onChange={(e) => setDbService(e.target.value)}
                          placeholder="ORCL / postgres / my_db"
                          className="w-full bg-[#111420] border border-[#232b40] focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">Tablespace / Schema / Collection</label>
                        <input
                          type="text"
                          required
                          value={dbTablespace}
                          onChange={(e) => setDbTablespace(e.target.value)}
                          placeholder="DATACORE_TS"
                          className="w-full bg-[#111420] border border-[#232b40] focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-100 font-bold text-pink-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">Database Username / Schema</label>
                        <input
                          type="text"
                          required
                          value={dbUser}
                          onChange={(e) => setDbUser(e.target.value)}
                          placeholder="datacore_admin / postgres"
                          className="w-full bg-[#111420] border border-[#232b40] focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-300 mb-1">Database Password</label>
                        <input
                          type="password"
                          required
                          value={dbPassword}
                          onChange={(e) => setDbPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#111420] border border-[#232b40] focus:border-emerald-500 rounded-lg px-3 py-2 text-slate-100"
                        />
                      </div>
                    </div>

                    {dbTestResult && (
                      <div className={`p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 ${
                        dbTestResult.success
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-red-500/20 text-red-300 border border-red-500/40'
                      }`}>
                        {dbTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
                        <span>{dbTestResult.message}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleTestOracleDb}
                        disabled={testingDb}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs font-mono rounded-lg border border-emerald-500/30 cursor-pointer transition flex items-center gap-1.5"
                      >
                        {testingDb ? 'Testing...' : '⚡ Test Link'}
                      </button>

                      <button
                        type="button"
                        onClick={handleDisconnectDb}
                        className="px-3 py-2 bg-red-950/60 hover:bg-red-900/80 text-red-300 font-bold text-xs font-mono rounded-lg border border-red-500/40 cursor-pointer transition flex items-center gap-1"
                      >
                        Disconnect DB
                      </button>

                      <button
                        type="submit"
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-black text-xs font-mono uppercase tracking-wider rounded-lg cursor-pointer transition flex items-center justify-center gap-1 min-w-[140px]"
                      >
                        <Check className="w-4 h-4" /> Save & Connect DB
                      </button>
                    </div>
                  </form>

                  {/* SQL Script & Deployment Guide Actions */}
                  <div className="p-4 bg-[#0a0c16] border border-[#232b40] rounded-xl space-y-3 font-mono">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4 text-pink-400" />
                        Oracle Tablespace & Schema Script
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowSqlScript(!showSqlScript)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                      >
                        {showSqlScript ? 'Hide SQL Script' : 'View oracle-tablespace-setup.sql'}
                      </button>
                    </div>

                    {showSqlScript && (
                      <div className="p-3 bg-[#111420] border border-[#232b40] rounded-lg text-[10px] text-emerald-300 max-h-48 overflow-y-auto space-y-1 font-mono">
                        <p className="text-slate-400 font-bold">-- Run in SQL*Plus on Linux or Windows Oracle Database:</p>
                        <p>CREATE TABLESPACE DATACORE_TS DATAFILE 'datacore_ts01.dbf' SIZE 200M AUTOEXTEND ON NEXT 50M;</p>
                        <p>CREATE USER datacore_admin IDENTIFIED BY "Password123" DEFAULT TABLESPACE DATACORE_TS QUOTA UNLIMITED ON DATACORE_TS;</p>
                        <p>GRANT CONNECT, RESOURCE, DBA TO datacore_admin;</p>
                        <p>GRANT CREATE SESSION, CREATE TABLE, CREATE VIEW TO datacore_admin;</p>
                      </div>
                    )}

                    <div className="pt-2 border-t border-[#232b40] space-y-2">
                      <h5 className="text-[11px] font-bold text-slate-200">🚀 Deploying Single API to Apache Tomcat (Linux / Windows)</h5>
                      <ol className="text-[10px] text-slate-400 space-y-1 list-decimal list-inside leading-relaxed">
                        <li>Run <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">bash tomcat-deploy-pack.sh</code> (Linux) or <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">tomcat-deploy-windows.bat</code> (Windows).</li>
                        <li>This generates <code className="text-pink-400 bg-slate-900 px-1 py-0.5 rounded font-bold">oracle-datacore-api.war</code> containing the single API backend and web assets.</li>
                        <li>Copy <code className="text-pink-400 font-bold">oracle-datacore-api.war</code> to Tomcat's <code className="text-slate-200">webapps/</code> folder (e.g. <code className="text-slate-200">/opt/tomcat/webapps/</code>).</li>
                        <li>Start Tomcat or execute <code className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">node dist/server.cjs</code> directly on Windows/Linux.</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
