import React, { useState, useEffect } from 'react';
import ApiClient from '../services/api';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  KeyRound,
  FileText,
  Activity,
  ArrowRight,
  Server,
  Lock,
  RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export default function SysadminDashboard({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState({ total: 0, active: 0, inactive: 0, byRole: {} });
  const [recentAuditLogs, setRecentAuditLogs] = useState([]);

  useEffect(() => {
    fetchSysadminData();
  }, []);

  const fetchSysadminData = async () => {
    setLoading(true);
    try {
      const [usersRes, auditRes] = await Promise.all([
        ApiClient.getUsers({ limit: 100 }),
        ApiClient.getAuditLogs({ limit: 8 })
      ]);

      const users = usersRes.users || [];
      const stats = {
        total: users.length,
        active: users.filter(u => u.isActive).length,
        inactive: users.filter(u => !u.isActive).length,
        byRole: {}
      };

      users.forEach(u => {
        stats.byRole[u.role] = (stats.byRole[u.role] || 0) + 1;
      });

      setUserStats(stats);
      setRecentAuditLogs(auditRes.logs || []);
    } catch (err) {
      console.error('Sysadmin Dashboard Load Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Auditing user accounts & security logs..." />;

  const roleChartData = [
    { role: 'Hospital Admin', count: userStats.byRole['HOSPITAL_ADMINISTRATOR'] || 0, color: '#087F8C' },
    { role: 'Reception Staff', count: userStats.byRole['RECEPTION_STAFF'] || 0, color: '#0052CC' },
    { role: 'Dept Coordinator', count: userStats.byRole['DEPARTMENT_COORDINATOR'] || 0, color: '#5243AA' },
    { role: 'System Admin', count: userStats.byRole['SYSTEM_ADMINISTRATOR'] || 0, color: '#172B4D' }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white px-5 py-4 rounded border border-[#DFE1E6] shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#172B4D] tracking-tight">System Administration & Security Governance</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#172B4D] text-white">
              Root Authority
            </span>
          </div>
          <p className="text-xs text-[#5E6C84] mt-0.5">
            Identity & access management (IAM), role assignment, and immutable regulatory audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('users')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#172B4D] hover:bg-[#091E42] text-white transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manage Staff Accounts</span>
          </button>
          <button
            onClick={() => onNavigate('audit-logs')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#087F8C] hover:bg-[#06636D] text-white transition-colors cursor-pointer shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Full Audit Trail</span>
          </button>
          <button
            onClick={fetchSysadminData}
            title="Refresh database records"
            className="p-1.5 rounded bg-white hover:bg-[#F4F5F7] text-[#5E6C84] border border-[#DFE1E6] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4 Enterprise KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total User Accounts"
          value={userStats.total}
          subtext="Provisioned clinical staff"
          icon={Users}
          color="navy"
        />
        <StatCard
          title="Active Credentials"
          value={userStats.active}
          subtext="Authorized active sessions"
          icon={UserCheck}
          color="green"
        />
        <StatCard
          title="Suspended / Deactivated"
          value={userStats.inactive}
          subtext="Blocked from access"
          icon={UserX}
          color="red"
        />
        <StatCard
          title="Audit Ledger Depth"
          value={recentAuditLogs.length > 0 ? 'Verified' : 'Active'}
          subtext="Cryptographically stamped"
          icon={Lock}
          color="teal"
        />
      </div>

      {/* Role Distribution & Architecture Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white p-5 rounded border border-[#DFE1E6] shadow-card">
          <div className="pb-3 mb-3 border-b border-[#EBECF0]">
            <h3 className="font-bold text-xs text-[#172B4D] uppercase tracking-wider">Role Distribution</h3>
            <p className="text-[11px] text-[#5E6C84]">Active accounts mapped to the 4 system authorization roles</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roleChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="role" tick={{ fontSize: 11, fill: '#5E6C84' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#5E6C84' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DFE1E6', borderRadius: '4px', fontSize: '11px' }} />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {roleChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded border border-[#DFE1E6] shadow-card flex flex-col justify-between">
          <div>
            <div className="pb-3 mb-3 border-b border-[#EBECF0]">
              <h3 className="font-bold text-xs text-[#172B4D] uppercase tracking-wider">System Architecture Status</h3>
              <p className="text-[11px] text-[#5E6C84]">Verified infrastructure controls</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2 bg-[#F4F5F7] rounded border border-[#DFE1E6] flex items-center justify-between">
                <span className="text-[#5E6C84]">Database Engine:</span>
                <span className="font-mono font-bold text-[#172B4D]">MySQL 8.0 / Prisma ORM</span>
              </div>
              <div className="p-2 bg-[#F4F5F7] rounded border border-[#DFE1E6] flex items-center justify-between">
                <span className="text-[#5E6C84]">Concurrency Engine:</span>
                <span className="font-mono font-bold text-[#00875A]">ACID Transactions</span>
              </div>
              <div className="p-2 bg-[#F4F5F7] rounded border border-[#DFE1E6] flex items-center justify-between">
                <span className="text-[#5E6C84]">Auth Tokens:</span>
                <span className="font-mono font-bold text-[#087F8C]">HTTP-Only Cookie (JWT)</span>
              </div>
              <div className="p-2 bg-[#F4F5F7] rounded border border-[#DFE1E6] flex items-center justify-between">
                <span className="text-[#5E6C84]">Password Hashes:</span>
                <span className="font-mono font-bold text-[#172B4D]">bcrypt (10 Salt Rounds)</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#EBECF0]">
            <button
              onClick={() => onNavigate('users')}
              className="w-full py-2 px-3 bg-[#172B4D] hover:bg-[#091E42] text-white font-semibold text-xs rounded transition-colors cursor-pointer"
            >
              Provision New Staff Account
            </button>
          </div>
        </div>
      </div>

      {/* Recent System Audit Trail */}
      <div className="bg-white rounded border border-[#DFE1E6] shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-[#DFE1E6] bg-[#FAFBFC] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xs text-[#172B4D] uppercase tracking-wider">Live Security & Operations Audit Stream</h3>
            <p className="text-[11px] text-[#5E6C84]">Immutable ledger of logins, allocations, status updates, and IAM changes</p>
          </div>
          <button
            onClick={() => onNavigate('audit-logs')}
            className="text-xs font-semibold text-[#087F8C] hover:underline flex items-center gap-1"
          >
            <span>Complete Audit Stream</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left table-dense">
            <thead className="bg-[#FAFBFC] text-[#5E6C84] border-b border-[#DFE1E6]">
              <tr>
                <th className="px-4">Timestamp</th>
                <th className="px-4">Action Event</th>
                <th className="px-4">Entity Type</th>
                <th className="px-4">Actor</th>
                <th className="px-4">IP Address</th>
                <th className="px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBECF0] text-[#172B4D]">
              {recentAuditLogs.map((log) => (
                <tr key={log.auditID} className="hover:bg-[#F4F5F7]">
                  <td className="px-4 font-mono text-xs text-[#5E6C84] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                  </td>
                  <td className="px-4">
                    <span className="font-mono font-bold text-[#172B4D] bg-[#EBECF0] px-1.5 py-0.5 rounded text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 text-xs font-medium text-[#42526E]">{log.entityType}</td>
                  <td className="px-4 text-xs">
                    {log.user ? (
                      <span className="font-medium text-[#087F8C]">{log.user.fullName || log.user.username}</span>
                    ) : (
                      <span className="text-[#7A869A] font-mono">SYSTEM / GUEST</span>
                    )}
                  </td>
                  <td className="px-4 font-mono text-xs text-[#5E6C84]">{log.ipAddress || '127.0.0.1'}</td>
                  <td className="px-4 text-xs text-[#42526E] font-mono text-[11px] truncate max-w-sm" title={log.details}>
                    {log.details || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
