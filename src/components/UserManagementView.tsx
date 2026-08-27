import React, { useState } from 'react';
import {
  Users, UserPlus, Shield, Lock, Unlock, Key, Trash2, Eye, EyeOff, AlertTriangle,
  CheckCircle2, Clock, Mail, Phone, RefreshCw, ShieldAlert, ShieldCheck, Check, UserCheck, Edit, Settings
} from 'lucide-react';
import { UserAccount, UserRole, UserPermissions } from '../types';

interface UserManagementViewProps {
  users: UserAccount[];
  currentUser: UserAccount;
  onCreateUser: (newUser: Omit<UserAccount, 'id' | 'createdAt' | 'lastUpdated'>) => void;
  onUpdateUser: (updatedUser: UserAccount) => void;
  onDeleteUser: (userId: string) => void;
}

const ALL_MODULES = [
  { key: 'dashboard', label: 'Cluster Dashboard' },
  { key: 'nodes', label: 'Node Inventory' },
  { key: 'primary-dbs', label: 'Primary DBs' },
  { key: 'standby-dbs', label: 'Standby DBs' },
  { key: 'redo-apply', label: 'Redo Apply Monitor' },
  { key: 'logs', label: 'Audit Action Logs' },
  { key: 'users', label: 'User Directory & RBAC' },
  { key: 'backup-rman', label: 'RMAN Backup' },
  { key: 'datapump', label: 'DataPump Export/Import' }
];

const DEFAULT_MODULES: Record<UserRole, string[]> = {
  ADMIN: ['dashboard', 'nodes', 'primary-dbs', 'standby-dbs', 'redo-apply', 'logs', 'users', 'backup-rman', 'datapump'],
  POWER_USER: ['dashboard', 'nodes', 'primary-dbs', 'standby-dbs', 'redo-apply', 'logs', 'backup-rman', 'datapump'],
  OPERATOR: ['dashboard', 'nodes', 'primary-dbs', 'standby-dbs', 'redo-apply', 'logs'],
  VIEWER: ['dashboard', 'nodes'],
  CUSTOM: ['dashboard', 'nodes']
};

const DEFAULT_PERMISSIONS: Record<UserRole, UserPermissions> = {
  ADMIN: {
    canViewDashboard: true,
    canViewNodes: true,
    canExecuteNodeActions: true,
    canAddEditNodes: true,
    canManagePrimaryDb: true,
    canManageStandbyDb: true,
    canManageUsers: true,
    canAdd: true,
    canEdit: true,
    canDelete: true,
  },
  POWER_USER: {
    canViewDashboard: true,
    canViewNodes: true,
    canExecuteNodeActions: true,
    canAddEditNodes: true,
    canManagePrimaryDb: true,
    canManageStandbyDb: true,
    canManageUsers: false,
    canAdd: true,
    canEdit: true,
    canDelete: true,
  },
  OPERATOR: {
    canViewDashboard: true,
    canViewNodes: true,
    canExecuteNodeActions: true,
    canAddEditNodes: false,
    canManagePrimaryDb: false,
    canManageStandbyDb: false,
    canManageUsers: false,
    canAdd: false,
    canEdit: false,
    canDelete: false,
  },
  VIEWER: {
    canViewDashboard: true,
    canViewNodes: true,
    canExecuteNodeActions: false,
    canAddEditNodes: false,
    canManagePrimaryDb: false,
    canManageStandbyDb: false,
    canManageUsers: false,
    canAdd: false,
    canEdit: false,
    canDelete: false,
  },
  CUSTOM: {
    canViewDashboard: true,
    canViewNodes: true,
    canExecuteNodeActions: false,
    canAddEditNodes: false,
    canManagePrimaryDb: false,
    canManageStandbyDb: false,
    canManageUsers: false,
    canAdd: false,
    canEdit: false,
    canDelete: false,
  },
};

export default function UserManagementView({
  users,
  currentUser,
  onCreateUser,
  onUpdateUser,
  onDeleteUser
}: UserManagementViewProps) {
  const isAdmin = currentUser.role === 'ADMIN' || currentUser.permissions?.canManageUsers === true;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSelfChangePassModal, setShowSelfChangePassModal] = useState(false);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<UserAccount | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Self password change state
  const [selfOldPass, setSelfOldPass] = useState('');
  const [selfNewPass, setSelfNewPass] = useState('');
  const [selfPassError, setSelfPassError] = useState<string | null>(null);
  const [selfPassSuccess, setSelfPassSuccess] = useState<string | null>(null);

  // New User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('VIEWER');
  const [newAllowedModules, setNewAllowedModules] = useState<string[]>(DEFAULT_MODULES.VIEWER);
  const [newPermissions, setNewPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS.VIEWER);
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Edit Permissions Modal State
  const [editRole, setEditRole] = useState<UserRole>('VIEWER');
  const [editAllowedModules, setEditAllowedModules] = useState<string[]>(DEFAULT_MODULES.VIEWER);
  const [editPermissions, setEditPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS.VIEWER);

  // Password reset inline state
  const [resetPassUserId, setResetPassUserId] = useState<string | null>(null);
  const [resetPassVal, setResetPassVal] = useState('');

  const togglePasswordVisibility = (userId: string) => {
    if (!isAdmin) return;
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleRolePresetChange = (role: UserRole) => {
    setNewRole(role);
    setNewPermissions(DEFAULT_PERMISSIONS[role]);
    setNewAllowedModules(DEFAULT_MODULES[role]);
  };

  const handleEditRolePresetChange = (role: UserRole) => {
    setEditRole(role);
    setEditPermissions(DEFAULT_PERMISSIONS[role]);
    setEditAllowedModules(DEFAULT_MODULES[role]);
  };

  const toggleNewModule = (modKey: string) => {
    setNewAllowedModules(prev =>
      prev.includes(modKey) ? prev.filter(m => m !== modKey) : [...prev, modKey]
    );
  };

  const toggleEditModule = (modKey: string) => {
    setEditAllowedModules(prev =>
      prev.includes(modKey) ? prev.filter(m => m !== modKey) : [...prev, modKey]
    );
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isAdmin) {
      setFormError('Access Denied: Only administrators can create users.');
      return;
    }

    if (!newUsername.trim() || !newEmail.trim() || !newPassword.trim()) {
      setFormError('Username, Email, and Password are required.');
      return;
    }

    // Check duplicate
    const exists = users.some(u =>
      u.username.toLowerCase() === newUsername.trim().toLowerCase() ||
      u.email.toLowerCase() === newEmail.trim().toLowerCase()
    );

    if (exists) {
      setFormError('A user with this username or email already exists.');
      return;
    }

    onCreateUser({
      username: newUsername.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim() || '+8801700000000',
      passwordHash: newPassword,
      role: newRole,
      allowedModules: newAllowedModules,
      permissions: newPermissions,
      isLocked: false,
      isExpired: false,
      expiresAt: newExpiresAt || undefined
    });

    // Reset Form
    setNewUsername('');
    setNewEmail('');
    setNewPhone('');
    setNewPassword('');
    setNewRole('VIEWER');
    setNewAllowedModules(DEFAULT_MODULES.VIEWER);
    setNewPermissions(DEFAULT_PERMISSIONS.VIEWER);
    setNewExpiresAt('');
    setShowCreateModal(false);
    setFormSuccess(`User ${newUsername.trim()} created successfully with assigned role & menu module permissions!`);
    setTimeout(() => setFormSuccess(null), 4000);
  };

  const handleSelfPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSelfPassError(null);
    setSelfPassSuccess(null);

    if (selfOldPass !== currentUser.passwordHash) {
      setSelfPassError('Incorrect current password.');
      return;
    }

    if (!selfNewPass.trim() || selfNewPass.length < 4) {
      setSelfPassError('New password must be at least 4 characters long.');
      return;
    }

    onUpdateUser({
      ...currentUser,
      passwordHash: selfNewPass.trim(),
      lastUpdated: new Date().toISOString()
    });

    setSelfPassSuccess('Your password has been changed successfully!');
    setSelfOldPass('');
    setSelfNewPass('');
    setTimeout(() => {
      setSelfPassSuccess(null);
      setShowSelfChangePassModal(false);
    }, 2000);
  };

  const handleOpenEditPermissions = (user: UserAccount) => {
    setEditingPermissionsUser(user);
    setEditRole(user.role);
    setEditAllowedModules(user.allowedModules || DEFAULT_MODULES[user.role]);
    setEditPermissions(user.permissions || DEFAULT_PERMISSIONS[user.role]);
  };

  const handleSaveEditPermissions = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPermissionsUser) return;

    onUpdateUser({
      ...editingPermissionsUser,
      role: editRole,
      allowedModules: editAllowedModules,
      permissions: editPermissions,
      lastUpdated: new Date().toISOString()
    });

    setFormSuccess(`Role, allowed menu modules, and permissions updated for ${editingPermissionsUser.username}.`);
    setEditingPermissionsUser(null);
    setTimeout(() => setFormSuccess(null), 4000);
  };

  const handleToggleLock = (user: UserAccount) => {
    if (!isAdmin) return;
    onUpdateUser({
      ...user,
      isLocked: !user.isLocked,
      lastUpdated: new Date().toISOString()
    });
  };

  const handleToggleExpire = (user: UserAccount) => {
    if (!isAdmin) return;
    onUpdateUser({
      ...user,
      isExpired: !user.isExpired,
      lastUpdated: new Date().toISOString()
    });
  };

  const handleSavePasswordReset = (user: UserAccount) => {
    if (!isAdmin || !resetPassVal.trim()) return;
    onUpdateUser({
      ...user,
      passwordHash: resetPassVal.trim(),
      lastUpdated: new Date().toISOString()
    });
    setResetPassUserId(null);
    setResetPassVal('');
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm shadow-red-500/10">
            <Shield className="w-3 h-3 text-red-400" /> Super Admin
          </span>
        );
      case 'POWER_USER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 shadow-sm">
            <ShieldCheck className="w-3 h-3 text-fuchsia-400" /> Power User
          </span>
        );
      case 'OPERATOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm">
            <UserCheck className="w-3 h-3 text-blue-400" /> Operator
          </span>
        );
      case 'VIEWER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-slate-500/20 text-slate-300 border border-slate-500/40 shadow-sm">
            <Clock className="w-3 h-3 text-slate-400" /> Viewer (Read Only)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="user-management-root">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-slate-800/90 rounded-2xl border border-slate-700/60 shadow-xl gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/15 rounded-xl border border-red-500/30 text-red-400 shadow-md shadow-red-500/10">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-display font-bold text-slate-100 tracking-tight">
                  Enterprise User Management & RBAC Role Template
                </h1>
                {!isAdmin && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono">
                    Read-Only User Session
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Role permission template assignment, account locking, password inspection, and user self-password recovery.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Change My Password Button */}
          <button
            onClick={() => setShowSelfChangePassModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-mono border border-slate-600 transition cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" /> Change My Password
          </button>

          {isAdmin ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl text-xs font-bold font-mono uppercase tracking-wider shadow-lg shadow-yellow-400/25 active:scale-95 transition cursor-pointer"
              id="create-user-btn"
            >
              <UserPlus className="w-4 h-4 text-slate-950" /> Create New User
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Created users cannot edit or add users (View Only).</span>
            </div>
          )}
        </div>
      </div>

      {formSuccess && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Role Definitions Guide Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-800/80 rounded-2xl border border-red-500/30 space-y-1.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-400 font-mono uppercase">Super Admin</span>
            <Shield className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Full system control, create/delete users, lock/expire accounts, view all passwords, grant permissions.
          </p>
        </div>

        <div className="p-4 bg-slate-800/80 rounded-2xl border border-fuchsia-500/30 space-y-1.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-fuchsia-400 font-mono uppercase">Power User</span>
            <ShieldCheck className="w-4 h-4 text-fuchsia-400" />
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Full DBA operations, Node deployment, Switchover/Failover, Redo Apply — restricted from User Management.
          </p>
        </div>

        <div className="p-4 bg-slate-800/80 rounded-2xl border border-blue-500/30 space-y-1.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 font-mono uppercase">Operator</span>
            <UserCheck className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Execute Node actions (CRS Restart, Clear Logs), monitor telemetry — cannot modify DB roles or schema.
          </p>
        </div>

        <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-600 space-y-1.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 font-mono uppercase">Viewer (Read-Only)</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Read-Only telemetry and log inspector. Cannot add or edit any nodes, databases, or user accounts.
          </p>
        </div>
      </div>

      {/* User Directory Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
              System User Directory ({users.length})
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Logged in as: <strong className="text-slate-200">{currentUser.username}</strong> ({currentUser.role})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-[#0c1630] text-white uppercase tracking-wider font-bold border-b-2 border-blue-500 text-xs">
              <tr>
                <th className="p-3.5 text-white font-bold">User Details</th>
                <th className="p-3.5 text-white font-bold">Role & Permissions</th>
                <th className="p-3.5 text-white font-bold">Contact</th>
                <th className="p-3.5 text-white font-bold">Password</th>
                <th className="p-3.5 text-white font-bold">Status</th>
                <th className="p-3.5 text-right text-white font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                const isUserPasswordVisible = visiblePasswords[u.id];
                const p = u.permissions || DEFAULT_PERMISSIONS[u.role];

                return (
                  <tr key={u.id} className={`hover:bg-slate-800/50 transition ${isSelf ? 'bg-red-500/5' : ''}`}>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-slate-800 rounded-lg text-slate-200 font-bold border border-slate-700">
                          {u.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-100">{u.username}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 bg-red-500/20 text-red-300 border border-red-500/40 rounded text-[9px]">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block">ID: {u.id}</span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 space-y-1">
                      <div>{getRoleBadge(u.role)}</div>
                      <div className="flex flex-wrap gap-1 mt-1 text-[9px]">
                        <span className={`px-1 py-0.2 rounded border ${p.canAddEditNodes ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                          Nodes: {p.canAddEditNodes ? 'Edit' : 'View'}
                        </span>
                        <span className={`px-1 py-0.2 rounded border ${p.canManageStandbyDb ? 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                          Standby: {p.canManageStandbyDb ? 'Ops' : 'View'}
                        </span>
                        <span className={`px-1 py-0.2 rounded border ${p.canManageUsers ? 'bg-red-500/10 text-red-300 border-red-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                          Users: {p.canManageUsers ? 'Admin' : 'None'}
                        </span>
                      </div>
                    </td>

                    <td className="p-3.5 space-y-1">
                      <div className="flex items-center gap-1 text-slate-300 text-[11px]">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[150px]">{u.email}</span>
                      </div>
                      {u.phone && (
                        <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                          <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{u.phone}</span>
                        </div>
                      )}
                    </td>

                    <td className="p-3.5">
                      {isAdmin ? (
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-slate-200 font-mono tracking-wider text-[11px]">
                            {isUserPasswordVisible ? u.passwordHash : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(u.id)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition cursor-pointer"
                            title={isUserPasswordVisible ? 'Hide Password' : 'Inspect Password'}
                          >
                            {isUserPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Protected</span>
                      )}
                    </td>

                    <td className="p-3.5 space-y-1">
                      {u.isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      ) : u.isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          <Clock className="w-3 h-3" /> Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right">
                      {isAdmin ? (
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Permissions Button */}
                          <button
                            onClick={() => handleOpenEditPermissions(u)}
                            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30 cursor-pointer transition"
                            title="Edit User Role & Template Permissions"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>

                          {/* Lock / Unlock Toggle */}
                          <button
                            onClick={() => handleToggleLock(u)}
                            className={`p-1.5 rounded-lg border text-xs cursor-pointer transition ${
                              u.isLocked
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                            }`}
                            title={u.isLocked ? 'Unlock Account' : 'Lock Account'}
                          >
                            {u.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>

                          {/* Expire Toggle */}
                          <button
                            onClick={() => handleToggleExpire(u)}
                            className={`p-1.5 rounded-lg border text-xs cursor-pointer transition ${
                              u.isExpired
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                            }`}
                            title={u.isExpired ? 'Reactivate Account' : 'Mark Expired'}
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete user */}
                          {u.username !== 'admin' && (
                            <button
                              onClick={() => onDeleteUser(u.id)}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/25 text-red-400 rounded-lg border border-red-500/30 cursor-pointer transition"
                              title="Delete User Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500">Restricted</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to Create New User with Template Checkboxes */}
      {showCreateModal && isAdmin && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/80 mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-bold text-slate-100 font-display">Create System User & Role Permissions Template</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 bg-slate-800 rounded border border-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. dba_john"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Initial Password *</label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="e.g. Pass123!"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. john@oracle.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+8801700000000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Select Role Preset Template *</label>
                <select
                  value={newRole}
                  onChange={(e) => handleRolePresetChange(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 font-mono focus:border-red-500 focus:outline-none"
                >
                  <option value="VIEWER">VIEWER - Read Only (View Telemetry & Logs Only)</option>
                  <option value="OPERATOR">OPERATOR - Node Actions (Restart CRS, Sync, Clear Logs)</option>
                  <option value="POWER_USER">POWER_USER - Full DBA Ops (Nodes, Failover, Redo Apply - No Admin)</option>
                  <option value="ADMIN">ADMIN - Super Admin (Full User Management & Global Access)</option>
                </select>
              </div>

              {/* ASSIGNED MENU MODULES CHECKBOX MATRIX */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                    Allowed Menu Modules (Visible in Sidebar):
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {newAllowedModules.length}/{ALL_MODULES.length} Selected
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono pt-1">
                  {ALL_MODULES.map(mod => (
                    <label key={mod.key} className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={newAllowedModules.includes(mod.key)}
                        onChange={() => toggleNewModule(mod.key)}
                        className="rounded accent-amber-500"
                      />
                      <span>{mod.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* PERMISSION CHECKBOX TEMPLATE MATRIX */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="text-xs font-mono font-bold text-red-400 block border-b border-slate-800 pb-1.5 uppercase">
                  Action & Operations Permissions:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.canAdd ?? false}
                      onChange={(e) => setNewPermissions(prev => ({ ...prev, canAdd: e.target.checked }))}
                      className="rounded accent-red-500"
                    />
                    <span className="text-emerald-400 font-bold">Can Add / Create Records</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.canEdit ?? false}
                      onChange={(e) => setNewPermissions(prev => ({ ...prev, canEdit: e.target.checked }))}
                      className="rounded accent-red-500"
                    />
                    <span className="text-sky-400 font-bold">Can Edit / Modify Records</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.canDelete ?? false}
                      onChange={(e) => setNewPermissions(prev => ({ ...prev, canDelete: e.target.checked }))}
                      className="rounded accent-red-500"
                    />
                    <span className="text-pink-400 font-bold">Can Delete / Remove Records</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.canExecuteNodeActions}
                      onChange={(e) => setNewPermissions(prev => ({ ...prev, canExecuteNodeActions: e.target.checked }))}
                      className="rounded accent-red-500"
                    />
                    <span>Execute Node Operations</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.canAddEditNodes}
                      onChange={(e) => setNewPermissions(prev => ({ ...prev, canAddEditNodes: e.target.checked, canAdd: e.target.checked, canEdit: e.target.checked, canDelete: e.target.checked }))}
                      className="rounded accent-red-500"
                    />
                    <span>Deploy / Remove Host Nodes</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.canManagePrimaryDb}
                      onChange={(e) => setNewPermissions(prev => ({ ...prev, canManagePrimaryDb: e.target.checked }))}
                      className="rounded accent-red-500"
                    />
                    <span>Manage Primary DBs</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.canManageStandbyDb}
                      onChange={(e) => setNewPermissions(prev => ({ ...prev, canManageStandbyDb: e.target.checked }))}
                      className="rounded accent-red-500"
                    />
                    <span>Manage Standby DBs (Data Guard)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPermissions.canManageUsers}
                      onChange={(e) => setNewPermissions(prev => ({ ...prev, canManageUsers: e.target.checked }))}
                      className="rounded accent-red-500"
                    />
                    <span className="text-red-400 font-bold">User Management (Admin Only)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Account Expiration Date (Optional)</label>
                <input
                  type="date"
                  value={newExpiresAt}
                  onChange={(e) => setNewExpiresAt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs font-mono uppercase tracking-wider cursor-pointer shadow-lg shadow-red-600/20"
                >
                  Create & Assign Role Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal for Existing User */}
      {editingPermissionsUser && isAdmin && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/80 mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-slate-100 font-display">
                  Edit Role & Template Permissions: {editingPermissionsUser.username}
                </h3>
              </div>
              <button
                onClick={() => setEditingPermissionsUser(null)}
                className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 bg-slate-800 rounded border border-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveEditPermissions} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Select Role Preset Template *</label>
                <select
                  value={editRole}
                  onChange={(e) => handleEditRolePresetChange(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 font-mono focus:border-red-500 focus:outline-none"
                >
                  <option value="VIEWER">VIEWER - Read Only (View Telemetry & Logs Only)</option>
                  <option value="OPERATOR">OPERATOR - Node Actions (Restart CRS, Sync, Clear Logs)</option>
                  <option value="POWER_USER">POWER_USER - Full DBA Ops (Nodes, Failover, Redo Apply - No Admin)</option>
                  <option value="ADMIN">ADMIN - Super Admin (Full User Management & Global Access)</option>
                </select>
              </div>

              {/* ASSIGNED MENU MODULES CHECKBOX MATRIX */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                    Allowed Menu Modules (Visible in Sidebar):
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {editAllowedModules.length}/{ALL_MODULES.length} Selected
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono pt-1">
                  {ALL_MODULES.map(mod => (
                    <label key={mod.key} className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={editAllowedModules.includes(mod.key)}
                        onChange={() => toggleEditModule(mod.key)}
                        className="rounded accent-amber-500"
                      />
                      <span>{mod.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* PERMISSION CHECKBOX TEMPLATE MATRIX */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <span className="text-xs font-mono font-bold text-blue-400 block border-b border-slate-800 pb-1.5 uppercase">
                  Action & Operations Permissions:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.canAdd ?? false}
                      onChange={(e) => setEditPermissions(prev => ({ ...prev, canAdd: e.target.checked }))}
                      className="rounded accent-blue-500"
                    />
                    <span className="text-emerald-400 font-bold">Can Add / Create Records</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.canEdit ?? false}
                      onChange={(e) => setEditPermissions(prev => ({ ...prev, canEdit: e.target.checked }))}
                      className="rounded accent-blue-500"
                    />
                    <span className="text-sky-400 font-bold">Can Edit / Modify Records</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.canDelete ?? false}
                      onChange={(e) => setEditPermissions(prev => ({ ...prev, canDelete: e.target.checked }))}
                      className="rounded accent-blue-500"
                    />
                    <span className="text-pink-400 font-bold">Can Delete / Remove Records</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.canExecuteNodeActions}
                      onChange={(e) => setEditPermissions(prev => ({ ...prev, canExecuteNodeActions: e.target.checked }))}
                      className="rounded accent-blue-500"
                    />
                    <span>Execute Node Operations</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.canAddEditNodes}
                      onChange={(e) => setEditPermissions(prev => ({ ...prev, canAddEditNodes: e.target.checked, canAdd: e.target.checked, canEdit: e.target.checked, canDelete: e.target.checked }))}
                      className="rounded accent-blue-500"
                    />
                    <span>Deploy / Remove Host Nodes</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.canManagePrimaryDb}
                      onChange={(e) => setEditPermissions(prev => ({ ...prev, canManagePrimaryDb: e.target.checked }))}
                      className="rounded accent-blue-500"
                    />
                    <span>Manage Primary DBs</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.canManageStandbyDb}
                      onChange={(e) => setEditPermissions(prev => ({ ...prev, canManageStandbyDb: e.target.checked }))}
                      className="rounded accent-blue-500"
                    />
                    <span>Manage Standby DBs</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPermissions.canManageUsers}
                      onChange={(e) => setEditPermissions(prev => ({ ...prev, canManageUsers: e.target.checked }))}
                      className="rounded accent-blue-500"
                    />
                    <span className="text-red-400 font-bold">User Management & Granting Roles</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPermissionsUser(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs font-mono uppercase tracking-wider cursor-pointer"
                >
                  Save Permissions Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Self Password Change Modal */}
      {showSelfChangePassModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/80 mb-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100 font-display">Change My Password</h3>
              </div>
              <button
                onClick={() => setShowSelfChangePassModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 bg-slate-800 rounded border border-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>

            {selfPassError && (
              <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{selfPassError}</span>
              </div>
            )}

            {selfPassSuccess && (
              <div className="p-3 mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{selfPassSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSelfPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Current Password *</label>
                <input
                  type="password"
                  required
                  value={selfOldPass}
                  onChange={(e) => setSelfOldPass(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  value={selfNewPass}
                  onChange={(e) => setSelfNewPass(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSelfChangePassModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs font-mono uppercase tracking-wider cursor-pointer shadow-lg shadow-amber-600/20"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
