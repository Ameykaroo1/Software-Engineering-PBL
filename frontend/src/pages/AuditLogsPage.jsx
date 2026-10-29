import React, { useState, useEffect } from 'react';
import ApiClient from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Lock,
  Calendar,
  User,
  Globe
} from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [entityFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getAuditLogs({
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 100
      });
      setLogs(res.logs || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Enterprise Header */}
      <div className="bg-white px-5 py-4 rounded border border-[#DFE1E6] shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#172B4D] tracking-tight">Hospital System Audit Trail & Compliance Ledger</h1>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#172B4D] text-white">
              <Lock className="w-3 h-3 text-[#087F8C]" />
              Immutable Stream
            </span>
          </div>
          <p className="text-xs text-[#5E6C84] mt-0.5">
            Tamper-proof chronological log of authentication, resource state transitions, allocations, and user accounts.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          title="Refresh audit stream"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-white hover:bg-[#F4F5F7] text-[#172B4D] border border-[#DFE1E6] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#5E6C84]" />
          <span>Refresh Stream</span>
        </button>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white p-3 rounded border border-[#DFE1E6] shadow-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B778C]" />
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            placeholder="Search action e.g. LOGIN, ALLOCATION..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#DFE1E6] rounded text-xs font-mono focus:outline-none focus:border-[#172B4D] text-[#172B4D]"
          />
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="p-1.5 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#172B4D] text-[#172B4D]"
        >
          <option value="">All Entity Types</option>
          <option value="RESOURCE">RESOURCE</option>
          <option value="ALLOCATION">ALLOCATION</option>
          <option value="AUTH">AUTH</option>
          <option value="USER">USER</option>
          <option value="SYSTEM">SYSTEM</option>
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="p-1.5 bg-white border border-[#DFE1E6] rounded text-xs text-[#172B4D]"
        />

        <button
          onClick={fetchLogs}
          className="py-1.5 px-3 bg-[#172B4D] hover:bg-[#091E42] text-white rounded text-xs font-semibold transition-colors"
        >
          Apply Query Filter
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded border border-[#DFE1E6] shadow-card overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Querying regulatory audit log records..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left table-dense">
              <thead className="bg-[#FAFBFC] text-[#5E6C84] border-b border-[#DFE1E6]">
                <tr>
                  <th className="px-4">Timestamp</th>
                  <th className="px-4">Action Event</th>
                  <th className="px-4">Entity Type & Target</th>
                  <th className="px-4">Authorizing Actor</th>
                  <th className="px-4">IP Address</th>
                  <th className="px-4">Event Context Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBECF0] text-[#172B4D]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-[#7A869A]">
                      No audit log records found matching query criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.auditID} className="hover:bg-[#F4F5F7]">
                      <td className="px-4 font-mono text-xs text-[#5E6C84] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                      </td>
                      <td className="px-4">
                        <span className="font-mono font-bold text-[#172B4D] bg-[#EBECF0] px-1.5 py-0.5 rounded text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 text-xs font-medium whitespace-nowrap">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#E6F4F6] text-[#087F8C] border border-[#B8E2E8]">
                          {log.entityType}
                        </span>
                        <span className="ml-1 font-mono text-[10px] text-[#7A869A]">{log.entityID.slice(0, 8)}</span>
                      </td>
                      <td className="px-4 text-xs font-medium text-[#172B4D] whitespace-nowrap">
                        {log.user ? (
                          <div>
                            <div>{log.user.fullName}</div>
                            <div className="text-[10px] text-[#5E6C84] font-mono">@{log.user.username}</div>
                          </div>
                        ) : (
                          <span className="text-[#7A869A] font-mono text-[11px]">SYSTEM / UNKNOWN</span>
                        )}
                      </td>
                      <td className="px-4 font-mono text-xs text-[#5E6C84] whitespace-nowrap">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="px-4 text-xs text-[#42526E] font-mono text-[11px] max-w-sm truncate" title={log.details}>
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
