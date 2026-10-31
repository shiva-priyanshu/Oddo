import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StaffMember } from '../types/auth';
import { apiClient } from '../lib/api';
import {
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  UserPlus,
  Key,
  Mail,
  User as UserIcon,
  AlertCircle,
  Loader2,
  X,
  Edit2,
  Check,
  Power,
} from 'lucide-react';

const PERMISSION_DEFINITIONS = [
  {
    id: 'manage_customers',
    label: 'Customer Management',
    desc: 'View customer directory, view customer details, create customer records',
    category: 'Customers',
  },
  {
    id: 'manage_plans',
    label: 'Plan Management',
    desc: 'Create new pricing tiers, modify descriptions, toggle plan active status',
    category: 'Catalog',
  },
  {
    id: 'manage_subscriptions',
    label: 'Subscription Operations',
    desc: 'Assign plans to customers, execute immediate or period-end cancellations',
    category: 'Subscriptions',
  },
  {
    id: 'manage_invoices',
    label: 'Invoicing & Invoices View',
    desc: 'View all company invoices and generate custom ad-hoc line-item invoices',
    category: 'Billing',
  },
  {
    id: 'manage_payments',
    label: 'Payment Processing',
    desc: 'Record simulated payment transactions and reconcile outstanding balances',
    category: 'Billing',
  },
  {
    id: 'view_reports',
    label: 'Operational Analytics & Reports',
    desc: 'Access MRR/ARR summaries, renewal pipeline, and business activity feeds',
    category: 'Analytics',
  },
];

export const StaffManager: React.FC = () => {
  const { isAdmin } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Staff Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createPermissions, setCreatePermissions] = useState<string[]>([
    'manage_customers',
    'manage_subscriptions',
  ]);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Staff Modal State
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editPassword, setEditPassword] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Quick Action Toggling State
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchStaff = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient<{ staff: StaffMember[] }>('/api/staff');
      setStaff(data.staff || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load staff directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [isAdmin]);

  // Access Denied Guard if not Admin
  if (!isAdmin) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 shadow-xs text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">Access Denied: Administrator Privileges Required</h2>
          <p className="text-sm text-slate-500">
            Staff account management and permission delegations are strictly restricted to System Administrators.
          </p>
        </div>
        <div className="pt-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
            HTTP 403 Forbidden &bull; Staff Privilege Guard
          </span>
        </div>
      </div>
    );
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);

    if (createPassword.length < 6) {
      setCreateError('Password must be at least 6 characters');
      setCreateSubmitting(false);
      return;
    }

    try {
      await apiClient('/api/staff', {
        method: 'POST',
        body: JSON.stringify({
          name: createName.trim(),
          email: createEmail.trim(),
          password: createPassword,
          permissions: createPermissions,
        }),
      });

      // Reset and close
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      setCreatePermissions(['manage_customers', 'manage_subscriptions']);
      setIsCreateOpen(false);
      await fetchStaff();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create staff member');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const openEditModal = (member: StaffMember) => {
    setEditingStaff(member);
    setEditName(member.name);
    setEditPermissions(member.permissionsList || []);
    setEditIsActive(member.isActive);
    setEditPassword('');
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setEditSubmitting(true);
    setEditError(null);

    const payload: any = {
      name: editName.trim(),
      isActive: editIsActive,
      permissions: editPermissions,
    };

    if (editPassword.trim().length > 0) {
      if (editPassword.trim().length < 6) {
        setEditError('New password must be at least 6 characters');
        setEditSubmitting(false);
        return;
      }
      payload.password = editPassword.trim();
    }

    try {
      await apiClient(`/api/staff/${editingStaff.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setEditingStaff(null);
      await fetchStaff();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update staff member');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleQuickToggleActive = async (member: StaffMember) => {
    try {
      setTogglingId(member.id);
      await apiClient(`/api/staff/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      await fetchStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle account status');
    } finally {
      setTogglingId(null);
    }
  };

  const togglePermission = (
    currentList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    permId: string
  ) => {
    if (currentList.includes(permId)) {
      setList(currentList.filter((p) => p !== permId));
    } else {
      setList([...currentList, permId]);
    }
  };

  const activeCount = staff.filter((s) => s.isActive).length;
  const inactiveCount = staff.filter((s) => !s.isActive).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff Management</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
              Admin Only
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Delegate operational capabilities to team members with granular module permissions.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition shadow-xs flex items-center space-x-2 shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{staff.length}</div>
            <div className="text-xs text-slate-500 font-medium">Total Staff Accounts</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-600">{activeCount}</div>
            <div className="text-xs text-slate-500 font-medium">Active Staff Members</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <UserX className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-600">{inactiveCount}</div>
            <div className="text-xs text-slate-500 font-medium">Deactivated Accounts</div>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-800 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Staff Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Operational Staff Directory
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Role: <span className="font-mono text-purple-700 font-semibold">STAFF</span>
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            <span className="text-xs font-medium">Loading staff members...</span>
          </div>
        ) : staff.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Shield className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm font-medium text-slate-700">No staff members created yet</p>
            <p className="text-xs text-slate-500">
              Click "Add Staff Member" above to create an operational staff account.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Granted Permissions</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs uppercase">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{member.name}</div>
                          <div className="text-slate-500 font-mono text-[11px]">{member.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {member.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
                          Deactivated
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 max-w-md">
                      <div className="flex flex-wrap gap-1">
                        {member.permissionsList && member.permissionsList.length > 0 ? (
                          member.permissionsList.map((p) => {
                            const def = PERMISSION_DEFINITIONS.find((d) => d.id === p);
                            return (
                              <span
                                key={p}
                                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                title={def?.desc || p}
                              >
                                {def?.label.split(' ')[0] || p}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">No permissions assigned</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {new Date(member.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(member)}
                          className="px-2.5 py-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md text-xs font-semibold border border-slate-200 transition flex items-center space-x-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          disabled={togglingId === member.id}
                          onClick={() => handleQuickToggleActive(member)}
                          className={`p-1.5 rounded-md border text-xs font-semibold transition ${
                            member.isActive
                              ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={member.isActive ? 'Deactivate Account' : 'Activate Account'}
                        >
                          {togglingId === member.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Power className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE STAFF MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden relative animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Create Staff Member</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign secure credentials and explicit functional permissions.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {createError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-rose-800 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="Sarah Jenkins"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="sarah.jenkins@company.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Password (min 6 characters)
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                  />
                </div>
              </div>

              {/* Permissions Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Assigned Module Permissions
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {createPermissions.length} of {PERMISSION_DEFINITIONS.length} selected
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {PERMISSION_DEFINITIONS.map((def) => {
                    const checked = createPermissions.includes(def.id);
                    return (
                      <div
                        key={def.id}
                        onClick={() =>
                          togglePermission(createPermissions, setCreatePermissions, def.id)
                        }
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-start space-x-3 ${
                          checked
                            ? 'bg-teal-50/50 border-teal-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                            checked
                              ? 'bg-teal-600 border-teal-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {checked && <Check className="h-3 w-3" />}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{def.label}</div>
                          <div className="text-[11px] text-slate-500">{def.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {createSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Create Staff Member</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden relative animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Edit Staff Account</h3>
                <p className="text-xs text-slate-500 mt-0.5">{editingStaff.email}</p>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-rose-800 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                />
              </div>

              {/* Account Status Switch */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Account Status</div>
                  <div className="text-[11px] text-slate-500">
                    {editIsActive
                      ? 'Account is ACTIVE. Staff can log in.'
                      : 'Account is DEACTIVATED. Login attempts are blocked.'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditIsActive(!editIsActive)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    editIsActive
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {editIsActive ? 'Active' : 'Deactivated'}
                </button>
              </div>

              {/* Password Reset (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reset Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                />
              </div>

              {/* Permissions Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Permissions
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {editPermissions.length} of {PERMISSION_DEFINITIONS.length} active
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {PERMISSION_DEFINITIONS.map((def) => {
                    const checked = editPermissions.includes(def.id);
                    return (
                      <div
                        key={def.id}
                        onClick={() =>
                          togglePermission(editPermissions, setEditPermissions, def.id)
                        }
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-start space-x-3 ${
                          checked
                            ? 'bg-teal-50/50 border-teal-300'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                            checked
                              ? 'bg-teal-600 border-teal-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {checked && <Check className="h-3 w-3" />}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{def.label}</div>
                          <div className="text-[11px] text-slate-500">{def.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {editSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
