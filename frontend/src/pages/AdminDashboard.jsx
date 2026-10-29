import React, { useState, useEffect } from 'react';
import ApiClient from '../services/api';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Bed,
  Activity,
  Layers,
  Wrench,
  AlertTriangle,
  PlusCircle,
  FileText,
  CalendarCheck,
  ArrowRight,
  TrendingUp,
  Building2,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const CATEGORY_NAMES = {
  HOSPITAL_BED: 'Hospital Beds',
  OPERATION_THEATRE: 'Operation Theatres',
  MEDICAL_EQUIPMENT: 'Medical Equipment',
  AMBULANCE: 'Ambulances',
  DIAGNOSTIC_FACILITY: 'Diagnostic Facilities'
};

export default function AdminDashboard({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [recentAllocations, setRecentAllocations] = useState([]);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [availRes, allocRes, metricRes] = await Promise.all([
        ApiClient.getAvailabilitySummary(),
        ApiClient.getAllocations({ limit: 6 }),
        ApiClient.getUtilizationReport()
      ]);

      setSummary(availRes.summary);
      setRecentAllocations(allocRes.allocations || []);
      setMetrics(metricRes.metrics);
    } catch (err) {
      console.error('Admin Dashboard Load Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner message="Querying live hospital database records..." />;

  const overall = summary?.overall || {
    total: 0,
    available: 0,
    allocated: 0,
    inUse: 0,
    maintenance: 0,
    outOfService: 0
  };

  // Recharts Data in Enterprise Healthcare Palette (#087F8C, #0052CC, #FF8B00, #DE350B)
  const categoryBarData = Object.entries(summary?.byCategory || {}).map(([key, val]) => ({
    name: CATEGORY_NAMES[key] || key,
    Available: val.available,
    Allocated: val.allocated,
    Maintenance: val.maintenance
  }));

  const pieData = [
    { name: 'Available', value: overall.available, color: '#00875A' },
    { name: 'Allocated', value: overall.allocated, color: '#0052CC' },
    { name: 'In Use', value: overall.inUse, color: '#172B4D' },
    { name: 'Maintenance', value: overall.maintenance, color: '#FF8B00' },
    { name: 'Out of Service', value: overall.outOfService, color: '#DE350B' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      {/* Enterprise Title Bar */}
      <div className="bg-white px-5 py-4 rounded border border-[#DFE1E6] shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#172B4D] tracking-tight">Hospital Operational Overview</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6F4F6] text-[#087F8C] border border-[#B8E2E8]">
              Live Metrics
            </span>
          </div>
          <p className="text-xs text-[#5E6C84] mt-0.5">
            Centralized capacity tracking, equipment states, and surgical suite scheduling.
          </p>
        </div>

        {/* Quick Operational Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('resources')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#087F8C] hover:bg-[#06636D] text-white transition-colors cursor-pointer shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Register Resource</span>
          </button>
          <button
            onClick={() => onNavigate('allocation')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-white hover:bg-[#F4F5F7] text-[#172B4D] border border-[#DFE1E6] transition-colors cursor-pointer"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-[#087F8C]" />
            <span>Allocate</span>
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-white hover:bg-[#F4F5F7] text-[#172B4D] border border-[#DFE1E6] transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#5E6C84]" />
            <span>Reports</span>
          </button>
          <button
            onClick={fetchDashboardData}
            title="Refresh database metrics"
            className="p-1.5 rounded bg-white hover:bg-[#F4F5F7] text-[#5E6C84] border border-[#DFE1E6] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5 Enterprise KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          title="Total Registered Assets"
          value={overall.total}
          subtext="Full clinical capacity"
          icon={Layers}
          color="navy"
        />
        <StatCard
          title="Immediately Available"
          value={overall.available}
          subtext="Ready for patient intake"
          icon={Bed}
          color="green"
        />
        <StatCard
          title="Active Allocations"
          value={overall.allocated}
          subtext="Committed units"
          icon={Activity}
          color="blue"
        />
        <StatCard
          title="Under Maintenance"
          value={overall.maintenance}
          subtext="Cleaning & sterilization"
          icon={Wrench}
          color="amber"
        />
        <StatCard
          title="Out of Service"
          value={overall.outOfService}
          subtext="Under repair or inspection"
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Recharts Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category Breakdown Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded border border-[#DFE1E6] shadow-card">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EBECF0]">
            <div>
              <h3 className="font-bold text-xs text-[#172B4D] uppercase tracking-wider">Capacity by Clinical Category</h3>
              <p className="text-[11px] text-[#5E6C84]">Available vs. allocated vs. maintenance status</p>
            </div>
            <span className="text-[11px] text-[#6B778C] font-mono">Real-time DB query</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBarData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5E6C84' }} />
                <YAxis tick={{ fontSize: 11, fill: '#5E6C84' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DFE1E6', borderRadius: '4px', fontSize: '11px', color: '#172B4D' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="Available" fill="#00875A" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Allocated" fill="#0052CC" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Maintenance" fill="#FF8B00" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Hospital Status Distribution Pie Chart */}
        <div className="bg-white p-5 rounded border border-[#DFE1E6] shadow-card flex flex-col justify-between">
          <div>
            <div className="pb-3 mb-3 border-b border-[#EBECF0]">
              <h3 className="font-bold text-xs text-[#172B4D] uppercase tracking-wider">Facility Utilization Split</h3>
              <p className="text-[11px] text-[#5E6C84]">Overall proportional distribution</p>
            </div>
            <div className="h-44 w-full my-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DFE1E6', borderRadius: '4px', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1 pt-3 border-t border-[#EBECF0]">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[#42526E] text-[11px]">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-[#172B4D] text-xs">{item.value} units</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Allocation Activity Table */}
      <div className="bg-white rounded border border-[#DFE1E6] shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-[#DFE1E6] bg-[#FAFBFC] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xs text-[#172B4D] uppercase tracking-wider">Recent Operational Commitments</h3>
            <p className="text-[11px] text-[#5E6C84]">Latest admissions and procedure reservations</p>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#087F8C] hover:underline"
          >
            <span>Full Ledger</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left table-dense">
            <thead className="bg-[#FAFBFC] text-[#5E6C84] border-b border-[#DFE1E6]">
              <tr>
                <th className="px-4">Resource</th>
                <th className="px-4">Category</th>
                <th className="px-4">Purpose / Patient Reference</th>
                <th className="px-4">Department</th>
                <th className="px-4">Priority</th>
                <th className="px-4">Status</th>
                <th className="px-4">Start Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBECF0] text-[#172B4D]">
              {recentAllocations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-xs text-[#7A869A]">
                    No allocation records currently active.
                  </td>
                </tr>
              ) : (
                recentAllocations.map((a) => (
                  <tr key={a.allocationID} className="hover:bg-[#F4F5F7] transition-colors">
                    <td className="px-4 font-semibold text-xs text-[#172B4D]">
                      <div>{a.resource?.resourceName}</div>
                      <div className="text-[10px] text-[#087F8C] font-mono font-medium">{a.resource?.identifierCode}</div>
                    </td>
                    <td className="px-4 text-xs text-[#42526E]">{CATEGORY_NAMES[a.resource?.resourceType] || a.resource?.resourceType}</td>
                    <td className="px-4 text-xs">
                      <div className="font-medium text-[#172B4D] truncate max-w-xs">{a.purpose}</div>
                      {a.patientReference && <div className="text-[10px] text-[#6B778C] font-mono">{a.patientReference}</div>}
                    </td>
                    <td className="px-4 text-xs text-[#42526E]">{a.department?.departmentName}</td>
                    <td className="px-4">
                      <Badge status={a.priority} size="sm" />
                    </td>
                    <td className="px-4">
                      <Badge status={a.status} size="sm" />
                    </td>
                    <td className="px-4 text-xs font-mono text-[#5E6C84]">
                      {new Date(a.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
