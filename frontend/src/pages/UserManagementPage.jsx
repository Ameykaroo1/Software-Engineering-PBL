import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ApiClient from '../services/api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Users,
  UserPlus,
  KeyRound,
  ShieldCheck,
  UserX,
  UserCheck,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

const ROLES = [
  { value: 'HOSPITAL_ADMINISTRATOR', label: 'Hospital Administrator' },
  { value: 'RECEPTION_STAFF', label: 'Reception Staff' },
  { value: 'DEPARTMENT_COORDINATOR', label: 'Department Coordinator' },
  { value: 'SYSTEM_ADMINISTRATOR', label: 'System Administrator' }
];

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Forms
  const [newUserData, setNewUserData] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    role: 'RECEPTION_STAFF',
    departmentID: ''
  });
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    fetchInitial();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchInitial = async () => {
    try {
      const d = await ApiClient.getDepartments();
      setDepartments(d.departments || []);
      await fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        limit: 100
      });
      setUsers(res.users || []);
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await ApiClient.createUser({
        ...newUserData,
        departmentID: newUserData.departmentID || null
      });
      setIsCreateOpen(false);
      setNewUserData({
        username: '',
        email: '',
        fullName: '',
        password: '',
        role: 'RECEPTION_STAFF',
        departmentID: ''
      });
      setSuccessMessage('Staff account created successfully.');
      fetchUsers();
    } catch (err) {
      setFormError(err.message || 'Failed to create user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (u) => {
    try {
      await ApiClient.toggleUserStatus(u.userID, !u.isActive);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to update account status.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await ApiClient.resetUserPassword(selectedUser.userID, newPassword);
      setIsResetOpen(false);
      setSelectedUser(null);
      setNewPassword('');
      setSuccessMessage(`Password for @${selectedUser.username} was successfully reset.`);
    } catch (err) {
      setFormError(err.message || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'HOSPITAL_ADMINISTRATOR':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E6F4F6] text-[#087F8C] border border-[#B8E2E8]">Hospital Admin</span>;
      case 'RECEPTION_STAFF':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#DEEBFF] text-[#0052CC] border border-[#B3D4FF]">Reception Staff</span>;
      case 'DEPARTMENT_COORDINATOR':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EAE6FF] text-[#5243AA] border border-[#C0B6F2]">Dept Coordinator</span>;
      case 'SYSTEM_ADMINISTRATOR':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#172B4D] text-white">System Admin</span>;
      default:
        return <span>{r}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Enterprise Header */}
      <div className="bg-white px-5 py-4 rounded border border-[#DFE1E6] shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#172B4D] tracking-tight">Staff Account Directory & Access Control</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#172B4D] text-white">
              IAM Module
            </span>
          </div>
          <p className="text-xs text-[#5E6C84] mt-0.5">
            Provision staff accounts, assign authorization roles, and enforce security policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFormError(null);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#172B4D] hover:bg-[#091E42] text-white shadow-sm transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Provision Account</span>
          </button>
          <button
            onClick={fetchUsers}
            title="Refresh database records"
            className="p-1.5 rounded bg-white hover:bg-[#F4F5F7] text-[#5E6C84] border border-[#DFE1E6] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-[#E3FCEF] border border-[#ABF5D1] rounded text-[#006644] text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#00875A]" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-[#5E6C84] hover:text-[#172B4D] text-xs">Dismiss</button>
        </div>
      )}

      {/* Filter Ribbon */}
      <div className="bg-white p-3 rounded border border-[#DFE1E6] shadow-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B778C]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
            placeholder="Search by staff full name, username, or email..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#172B4D] text-[#172B4D]"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="p-1.5 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#172B4D] text-[#172B4D]"
        >
          <option value="">All Hospital Roles</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {/* Dense User Directory Table */}
      <div className="bg-white rounded border border-[#DFE1E6] shadow-card overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Querying staff credentials and permissions..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left table-dense">
              <thead className="bg-[#FAFBFC] text-[#5E6C84] border-b border-[#DFE1E6]">
                <tr>
                  <th className="px-4">Staff Name & Username</th>
                  <th className="px-4">Assigned Role</th>
                  <th className="px-4">Assigned Department</th>
                  <th className="px-4">Email</th>
                  <th className="px-4">Account Status</th>
                  <th className="px-4 text-right">Access Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBECF0] text-[#172B4D]">
                {users.map((u) => {
                  const isSelf = u.userID === currentUser?.userID;
                  return (
                    <tr key={u.userID} className="hover:bg-[#F4F5F7]">
                      <td className="px-4">
                        <div className="font-bold text-xs text-[#172B4D] flex items-center gap-1.5">
                          <span>{u.fullName}</span>
                          {isSelf && <span className="px-1 py-0.2 text-[9px] bg-[#EBECF0] text-[#172B4D] rounded font-mono">Current User</span>}
                        </div>
                        <div className="font-mono text-[#5E6C84] text-[11px]">@{u.username}</div>
                      </td>
                      <td className="px-4">{getRoleBadge(u.role)}</td>
                      <td className="px-4 text-xs text-[#42526E]">{u.department?.departmentName || 'Hospital Wide'}</td>
                      <td className="px-4 font-mono text-xs text-[#5E6C84]">{u.email}</td>
                      <td className="px-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[#006644] font-medium bg-[#E3FCEF] px-1.5 py-0.5 rounded border border-[#ABF5D1] text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00875A]" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#BF2600] font-medium bg-[#FFEBE6] px-1.5 py-0.5 rounded border border-[#FFBDAD] text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#DE350B]" />
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td className="px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setNewPassword('');
                            setFormError(null);
                            setIsResetOpen(true);
                          }}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-[#F4F5F7] hover:bg-[#EBECF0] text-[#172B4D] rounded border border-[#DFE1E6] transition-colors cursor-pointer"
                        >
                          Reset Password
                        </button>

                        {!isSelf && (
                          <button
                            onClick={() => handleToggleActive(u)}
                            className={`px-2 py-0.5 text-[11px] font-semibold rounded border transition-colors cursor-pointer ${
                              u.isActive
                                ? 'bg-[#FFEBE6] hover:bg-[#FFBDAD] text-[#BF2600] border-[#FFBDAD]'
                                : 'bg-[#E3FCEF] hover:bg-[#ABF5D1] text-[#006644] border-[#ABF5D1]'
                            }`}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision User Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Provision Institutional Staff Account"
      >
        <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
          {formError && (
            <div className="p-2.5 bg-[#FFEBE6] border border-[#FFBDAD] text-[#BF2600] rounded">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Full Legal Name *</label>
              <input
                type="text"
                required
                value={newUserData.fullName}
                onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                placeholder="e.g. Dr. Catherine Brooks, MD"
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#172B4D] text-[#172B4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Staff Username *</label>
              <input
                type="text"
                required
                value={newUserData.username}
                onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g. cbrooks"
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs font-mono focus:outline-none focus:border-[#172B4D] text-[#172B4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Institutional Email *</label>
              <input
                type="email"
                required
                value={newUserData.email}
                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                placeholder="e.g. cbrooks@medicore.hospital"
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#172B4D] text-[#172B4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Temporary Password *</label>
              <input
                type="password"
                required
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                placeholder="Min 8 characters"
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#172B4D] text-[#172B4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Assigned Role *</label>
              <select
                value={newUserData.role}
                onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#172B4D] text-[#172B4D] font-semibold"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Department</label>
              <select
                value={newUserData.departmentID}
                onChange={(e) => setNewUserData({ ...newUserData, departmentID: e.target.value })}
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#172B4D] text-[#172B4D]"
              >
                <option value="">Hospital Wide / None</option>
                {departments.map(d => (
                  <option key={d.departmentID} value={d.departmentID}>{d.departmentName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBECF0]">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-[#5E6C84] hover:bg-[#F4F5F7] rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs font-bold bg-[#172B4D] hover:bg-[#091E42] text-white rounded shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Provisioning...' : 'Provision Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      {selectedUser && (
        <Modal
          isOpen={isResetOpen}
          onClose={() => setIsResetOpen(false)}
          title={`Reset Credentials: @${selectedUser.username}`}
        >
          <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
            <p className="text-xs text-[#5E6C84]">
              Provide a new temporary password for <strong>{selectedUser.fullName}</strong> ({selectedUser.email}).
            </p>

            {formError && (
              <div className="p-2.5 bg-[#FFEBE6] border border-[#FFBDAD] text-[#BF2600] rounded">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">New Password *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 8 characters..."
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#172B4D] text-[#172B4D]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBECF0]">
              <button
                type="button"
                onClick={() => setIsResetOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-[#5E6C84] hover:bg-[#F4F5F7] rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 text-xs font-bold bg-[#172B4D] hover:bg-[#091E42] text-white rounded shadow-sm transition-colors"
              >
                {submitting ? 'Updating...' : 'Set Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
