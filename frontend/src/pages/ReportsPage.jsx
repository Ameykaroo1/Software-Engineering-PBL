import React, { useState, useEffect } from 'react';
import ApiClient from '../services/api';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import {
  FileBarChart2,
  Download,
  Printer,
  Calendar,
  Filter,
  Layers,
  Activity,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Archive,
  PlusCircle,
  Search,
  Clock,
  User,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

const CATEGORY_NAMES = {
  HOSPITAL_BED: 'Hospital Beds',
  OPERATION_THEATRE: 'Operation Theatres',
  MEDICAL_EQUIPMENT: 'Medical Equipment',
  AMBULANCE: 'Ambulances',
  DIAGNOSTIC_FACILITY: 'Diagnostic Facilities'
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [periodAllocations, setPeriodAllocations] = useState([]);
  const [snapshots, setSnapshots] = useState([]);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departmentID, setDepartmentID] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Snapshot Creation Modal & State
  const [showSnapshotModal, setShowSnapshotModal] = useState(false);
  const [snapshotType, setSnapshotType] = useState('MONTHLY_EXECUTIVE_SUMMARY');
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotFeedback, setSnapshotFeedback] = useState(null);

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchInitial = async () => {
    try {
      const [deptRes, snapRes] = await Promise.all([
        ApiClient.getDepartments().catch(() => ({ departments: [] })),
        ApiClient.getReportSnapshots().catch(() => ({ reports: [] }))
      ]);
      setDepartments(deptRes.departments || []);
      setSnapshots(snapRes.reports || []);
      await fetchReport();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const [metricRes, allocRes] = await Promise.all([
        ApiClient.getUtilizationReport({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          departmentID: departmentID || undefined,
          resourceType: resourceType || undefined
        }),
        ApiClient.getAllocationsReport({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          departmentID: departmentID || undefined,
          resourceType: resourceType || undefined,
          limit: 100
        }).catch(() => ({ allocations: [] }))
      ]);

      setMetrics(metricRes.metrics);
      setPeriodAllocations(allocRes.allocations || []);
    } catch (err) {
      console.error('Report error:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyQuickRange = (days) => {
    if (days === 0) {
      setStartDate('');
      setEndDate('');
    } else {
      const end = new Date();
      const start = new Date(Date.now() - days * 86400000);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      await ApiClient.exportCSV({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        departmentID: departmentID || undefined,
        resourceType: resourceType || undefined
      });
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleSaveSnapshot = async (e) => {
    e.preventDefault();
    if (!metrics) return;

    setSavingSnapshot(true);
    setSnapshotFeedback(null);
    try {
      const summaryPayload = {
        title: `${snapshotType.replace(/_/g, ' ')}`,
        aggregateRate: metrics.overall?.overallUtilizationRate || 0,
        totalCapacity: metrics.overall?.totalHospitalCapacity || 0,
        availableUnits: metrics.overall?.totalHospitalAvailable || 0,
        occupiedUnits: metrics.overall?.overallBusy || 0,
        totalAllocations: metrics.overall?.totalAllocationsPeriod || 0,
        capturedAt: new Date().toISOString()
      };

      const result = await ApiClient.saveReportSnapshot({
        reportType: snapshotType,
        startDate: startDate ? new Date(startDate).toISOString() : new Date(Date.now() - 30 * 86400000).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : new Date().toISOString(),
        summaryData: summaryPayload
      });

      if (result.success) {
        setSnapshotFeedback('Report snapshot archived successfully.');
        const updatedSnapshots = await ApiClient.getReportSnapshots().catch(() => ({ reports: [] }));
        setSnapshots(updatedSnapshots.reports || []);
        setTimeout(() => {
          setShowSnapshotModal(false);
          setSnapshotFeedback(null);
        }, 1500);
      }
    } catch (err) {
      setSnapshotFeedback(err.message || 'Failed to archive report snapshot.');
    } finally {
      setSavingSnapshot(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !metrics) return <LoadingSpinner message="Calculating database utilization rates and aggregations..." />;

  const overall = metrics?.overall || {};
  const categoryMetrics = metrics?.categoryMetrics || [];
  const departmentMetrics = metrics?.departmentMetrics || [];

  const categoryChartData = categoryMetrics.map((c) => ({
    name: CATEGORY_NAMES[c.resourceType] || c.resourceType,
    Capacity: c.totalCapacity,
    Available: c.availableUnits,
    Allocated: c.allocatedUnits,
    UtilizationRate: c.utilizationRate
  }));

  const filteredAllocations = periodAllocations.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.allocationID?.toLowerCase().includes(q) ||
      a.resource?.resourceName?.toLowerCase().includes(q) ||
      a.resource?.identifierCode?.toLowerCase().includes(q) ||
      a.department?.departmentName?.toLowerCase().includes(q) ||
      a.patientReference?.toLowerCase().includes(q) ||
      a.purpose?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Enterprise Header */}
      <div className="no-print bg-white px-5 py-4 rounded border border-[#DFE1E6] shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#172B4D] tracking-tight">Hospital Clinical Resource Utilization Reports</h1>
          <p className="text-xs text-[#5E6C84] mt-0.5">
            Aggregated operational analytics for bed census, theatre occupancy, equipment draw, and fleet telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowSnapshotModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#172B4D] hover:bg-[#091E42] text-white shadow-sm transition-colors cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archive Snapshot</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#087F8C] hover:bg-[#06636D] text-white shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? 'Generating...' : 'Export CSV'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-white hover:bg-[#F4F5F7] text-[#172B4D] border border-[#DFE1E6] transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#5E6C84]" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Filter Ribbon & Preset Ranges */}
      <div className="no-print bg-white p-3 rounded border border-[#DFE1E6] shadow-card space-y-3">
        <div className="flex items-center justify-between border-b border-[#EBECF0] pb-2 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B778C] flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#087F8C]" />
            Report Timeframe & Quick Presets:
          </span>
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => { applyQuickRange(0); fetchReport(); }}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${!startDate && !endDate ? 'bg-[#087F8C] text-white border-[#087F8C]' : 'bg-[#FAFBFC] text-[#42526E] border-[#DFE1E6] hover:bg-[#F4F5F7]'}`}
            >
              All Time
            </button>
            <button
              onClick={() => { applyQuickRange(1); fetchReport(); }}
              className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[#FAFBFC] text-[#42526E] border border-[#DFE1E6] hover:bg-[#F4F5F7]"
            >
              Past 24 Hours
            </button>
            <button
              onClick={() => { applyQuickRange(7); fetchReport(); }}
              className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[#FAFBFC] text-[#42526E] border border-[#DFE1E6] hover:bg-[#F4F5F7]"
            >
              Past 7 Days
            </button>
            <button
              onClick={() => { applyQuickRange(30); fetchReport(); }}
              className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[#FAFBFC] text-[#42526E] border border-[#DFE1E6] hover:bg-[#F4F5F7]"
            >
              Past 30 Days
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div>
            <label className="block text-[10px] font-bold text-[#6B778C] uppercase tracking-wider mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-1.5 bg-white border border-[#DFE1E6] rounded text-xs text-[#172B4D]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6B778C] uppercase tracking-wider mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-1.5 bg-white border border-[#DFE1E6] rounded text-xs text-[#172B4D]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6B778C] uppercase tracking-wider mb-1">Department</label>
            <select
              value={departmentID}
              onChange={(e) => setDepartmentID(e.target.value)}
              className="w-full p-1.5 bg-white border border-[#DFE1E6] rounded text-xs text-[#172B4D]"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.departmentID} value={d.departmentID}>{d.departmentName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6B778C] uppercase tracking-wider mb-1">Category</label>
            <select
              value={resourceType}
              onChange={(e) => setResourceType(e.target.value)}
              className="w-full p-1.5 bg-white border border-[#DFE1E6] rounded text-xs text-[#172B4D]"
            >
              <option value="">All Categories</option>
              <option value="HOSPITAL_BED">Hospital Beds</option>
              <option value="OPERATION_THEATRE">Operation Theatres</option>
              <option value="MEDICAL_EQUIPMENT">Medical Equipment</option>
              <option value="AMBULANCE">Ambulances</option>
              <option value="DIAGNOSTIC_FACILITY">Diagnostic Facilities</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchReport}
              className="w-full py-1.5 bg-[#087F8C] hover:bg-[#06636D] text-white rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Apply Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transparent Formula Box */}
      <div className="p-3 bg-white rounded border border-[#DFE1E6] shadow-card text-xs text-[#42526E] flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-[#087F8C] shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <span className="font-bold text-[#172B4D]">Standard Hospital Utilization Formula: </span>
          <span className="font-mono text-[#087F8C]">Utilization Rate = ((Total Registered Capacity - Available Standby Units) / Total Capacity) × 100%</span>
          <p className="text-[#6B778C] mt-0.5">
            Aggregated from MySQL relational transactions. Reflects allocated and maintenance locks across all audited departments.
          </p>
        </div>
      </div>

      {/* 4 KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Hospital Capacity"
          value={overall.totalHospitalCapacity || 0}
          subtext="Audited clinical assets"
          icon={Layers}
          color="navy"
        />
        <StatCard
          title="Available Standby"
          value={overall.totalHospitalAvailable || 0}
          subtext="Immediate intake capacity"
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Active Occupancy Load"
          value={overall.overallBusy || 0}
          subtext="Allocated, in use, or service"
          icon={Activity}
          color="blue"
        />
        <StatCard
          title="Hospital-Wide Utilization"
          value={`${overall.overallUtilizationRate || 0}%`}
          subtext={`${overall.totalAllocationsPeriod || 0} commitments in period`}
          icon={FileBarChart2}
          color="teal"
        />
      </div>

      {/* Recharts Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Rates */}
        <div className="bg-white p-5 rounded border border-[#DFE1E6] shadow-card">
          <div className="pb-3 mb-3 border-b border-[#EBECF0]">
            <h3 className="font-bold text-xs text-[#172B4D] uppercase tracking-wider">Utilization Rates by Category (%)</h3>
            <p className="text-[11px] text-[#5E6C84]">Percentage of units currently occupied or committed</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5E6C84' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#5E6C84' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DFE1E6', borderRadius: '4px', fontSize: '11px' }} />
                <Bar dataKey="UtilizationRate" fill="#087F8C" radius={[2, 2, 0, 0]} name="Utilization %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Capacity vs Available Units */}
        <div className="bg-white p-5 rounded border border-[#DFE1E6] shadow-card">
          <div className="pb-3 mb-3 border-b border-[#EBECF0]">
            <h3 className="font-bold text-xs text-[#172B4D] uppercase tracking-wider">Capacity vs Available Standby</h3>
            <p className="text-[11px] text-[#5E6C84]">Total registered capacity compared against immediate readiness</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5E6C84' }} />
                <YAxis tick={{ fontSize: 11, fill: '#5E6C84' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DFE1E6', borderRadius: '4px', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Bar dataKey="Capacity" fill="#172B4D" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Available" fill="#00875A" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Table: Category Breakdown */}
      <div className="bg-white rounded border border-[#DFE1E6] shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-[#DFE1E6] bg-[#FAFBFC] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xs text-[#172B4D] uppercase tracking-wider">Category Breakdown Ledger</h3>
            <p className="text-[11px] text-[#5E6C84]">Verified calculations compiled directly from MySQL database</p>
          </div>
          <span className="text-[11px] font-mono font-medium text-[#5E6C84]">5 Categories Audited</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left table-dense">
            <thead className="bg-[#FAFBFC] text-[#5E6C84] border-b border-[#DFE1E6]">
              <tr>
                <th className="px-4">Resource Category</th>
                <th className="px-4">Total Capacity</th>
                <th className="px-4">Available Units</th>
                <th className="px-4">Allocated Units</th>
                <th className="px-4">In Maintenance</th>
                <th className="px-4">Out of Service</th>
                <th className="px-4">Total Allocations</th>
                <th className="px-4 text-right">Utilization Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBECF0] text-[#172B4D]">
              {categoryMetrics.map((c) => (
                <tr key={c.resourceType} className="hover:bg-[#F4F5F7]">
                  <td className="px-4 font-bold text-xs text-[#172B4D]">
                    {CATEGORY_NAMES[c.resourceType] || c.resourceType}
                  </td>
                  <td className="px-4 text-xs font-mono font-medium">{c.totalCapacity} units</td>
                  <td className="px-4 text-xs font-mono text-[#006644] font-semibold">{c.availableUnits}</td>
                  <td className="px-4 text-xs font-mono text-[#0052CC] font-semibold">{c.allocatedUnits}</td>
                  <td className="px-4 text-xs font-mono text-[#B76E00]">{c.maintenanceUnits}</td>
                  <td className="px-4 text-xs font-mono text-[#DE350B]">{c.outOfServiceUnits}</td>
                  <td className="px-4 text-xs font-mono">{c.totalAllocationsPeriod}</td>
                  <td className="px-4 text-right font-mono font-bold text-xs text-[#087F8C]">
                    {c.utilizationRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Department-wise Utilization */}
      <div className="bg-white rounded border border-[#DFE1E6] shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-[#DFE1E6] bg-[#FAFBFC] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xs text-[#172B4D] uppercase tracking-wider">Departmental Clinical Load Distribution</h3>
            <p className="text-[11px] text-[#5E6C84]">Occupancy rates aggregated by hospital clinical division</p>
          </div>
          <span className="text-[11px] font-mono font-medium text-[#5E6C84]">{departmentMetrics.length} Divisions Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left table-dense">
            <thead className="bg-[#FAFBFC] text-[#5E6C84] border-b border-[#DFE1E6]">
              <tr>
                <th className="px-4">Clinical Department</th>
                <th className="px-4">Total Assets</th>
                <th className="px-4">Available Standby</th>
                <th className="px-4">Active Allocations</th>
                <th className="px-4 text-right">Departmental Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBECF0] text-[#172B4D]">
              {departmentMetrics.map((d) => (
                <tr key={d.departmentName} className="hover:bg-[#F4F5F7]">
                  <td className="px-4 font-bold text-xs text-[#172B4D]">{d.departmentName}</td>
                  <td className="px-4 text-xs font-mono font-medium">{d.totalCapacity} units</td>
                  <td className="px-4 text-xs font-mono text-[#006644] font-semibold">{d.availableUnits}</td>
                  <td className="px-4 text-xs font-mono text-[#0052CC] font-semibold">{d.allocatedUnits}</td>
                  <td className="px-4 text-right font-mono font-bold text-xs text-[#087F8C]">
                    {d.utilizationRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Commitments Ledger in Reporting Period */}
      <div className="bg-white rounded border border-[#DFE1E6] shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-[#DFE1E6] bg-[#FAFBFC] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="font-bold text-xs text-[#172B4D] uppercase tracking-wider">Clinical Commitments & Allocation Ledger in Reporting Window</h3>
            <p className="text-[11px] text-[#5E6C84]">Individual resource allocations, inpatient stays, and surgeries in the selected date range</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B778C]" />
            <input
              type="text"
              placeholder="Search by patient, code, or purpose..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-white border border-[#DFE1E6] rounded text-xs text-[#172B4D] placeholder-[#6B778C]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left table-dense">
            <thead className="bg-[#FAFBFC] text-[#5E6C84] border-b border-[#DFE1E6]">
              <tr>
                <th className="px-4">Allocation ID</th>
                <th className="px-4">Resource</th>
                <th className="px-4">Department</th>
                <th className="px-4">Patient / Subject</th>
                <th className="px-4">Clinical Purpose</th>
                <th className="px-4">Priority</th>
                <th className="px-4">Status</th>
                <th className="px-4">Period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBECF0] text-[#172B4D]">
              {filteredAllocations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-xs text-[#6B778C]">
                    No allocation transactions found matching the selected timeframe and filters.
                  </td>
                </tr>
              ) : (
                filteredAllocations.map((a) => (
                  <tr key={a.allocationID} className="hover:bg-[#F4F5F7]">
                    <td className="px-4 font-mono text-[11px] font-semibold text-[#172B4D]">
                      {a.allocationID.slice(0, 8)}...
                    </td>
                    <td className="px-4">
                      <div className="font-bold text-xs text-[#172B4D]">{a.resource?.resourceName}</div>
                      <div className="text-[10px] text-[#5E6C84] font-mono">{a.resource?.identifierCode}</div>
                    </td>
                    <td className="px-4 text-xs text-[#42526E]">{a.department?.departmentName}</td>
                    <td className="px-4 text-xs font-medium text-[#172B4D]">
                      {a.patientReference || 'System Reserve'}
                    </td>
                    <td className="px-4 text-xs text-[#42526E] max-w-xs truncate" title={a.purpose}>
                      {a.purpose}
                    </td>
                    <td className="px-4">
                      <Badge variant={a.priority}>{a.priority}</Badge>
                    </td>
                    <td className="px-4">
                      <Badge variant={a.status}>{a.status}</Badge>
                    </td>
                    <td className="px-4 text-[11px] font-mono text-[#5E6C84]">
                      <div>{new Date(a.startTime).toLocaleDateString()}</div>
                      <div className="text-[10px] text-[#7A869A]">
                        {new Date(a.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {a.actualEndTime ? ` → ${new Date(a.actualEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ' (Ongoing)'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Archived Reports & Snapshots */}
      {snapshots.length > 0 && (
        <div className="bg-white rounded border border-[#DFE1E6] shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-[#DFE1E6] bg-[#FAFBFC]">
            <h3 className="font-bold text-xs text-[#172B4D] uppercase tracking-wider flex items-center gap-1.5">
              <Archive className="w-3.5 h-3.5 text-[#087F8C]" />
              Archived Official Utilization Snapshots
            </h3>
            <p className="text-[11px] text-[#5E6C84]">Formal institutional census records stored in database audit archives</p>
          </div>
          <div className="divide-y divide-[#EBECF0]">
            {snapshots.map((snap) => {
              let parsedSummary = {};
              try {
                parsedSummary = typeof snap.summaryData === 'string' ? JSON.parse(snap.summaryData) : snap.summaryData;
              } catch (e) {
                parsedSummary = { title: snap.reportType };
              }
              return (
                <div key={snap.reportID} className="p-4 hover:bg-[#F4F5F7] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-[#172B4D] text-xs flex items-center gap-2">
                      <span>{parsedSummary.title || snap.reportType.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-[10px] bg-[#EAE6FF] text-[#403294] px-1.5 py-0.5 rounded font-semibold border border-[#C0B6F2]">
                        {snap.reportType}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5E6C84] mt-0.5 flex items-center gap-3 font-mono">
                      <span>Window: {new Date(snap.startDate).toLocaleDateString()} – {new Date(snap.endDate).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Generated: {new Date(snap.generatedAt).toLocaleString()} by @{snap.user?.username || 'admin'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {parsedSummary.aggregateRate !== undefined && (
                      <div className="text-right">
                        <div className="text-[10px] text-[#6B778C] uppercase font-bold">Overall Rate</div>
                        <div className="font-mono font-bold text-[#087F8C] text-sm">{parsedSummary.aggregateRate}%</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Save Snapshot Modal */}
      <Modal
        isOpen={showSnapshotModal}
        onClose={() => setShowSnapshotModal(false)}
        title="Archive Formal Utilization Report Snapshot"
      >
        <form onSubmit={handleSaveSnapshot} className="space-y-4 text-xs">
          {snapshotFeedback && (
            <div className={`p-3 rounded border text-xs flex items-center gap-2 ${snapshotFeedback.includes('successfully') ? 'bg-[#E3FCEF] border-[#ABF5D1] text-[#006644]' : 'bg-[#FFEBE6] border-[#FFBDAD] text-[#BF2600]'}`}>
              {snapshotFeedback.includes('successfully') ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#006644]" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-[#BF2600]" />
              )}
              <span>{snapshotFeedback}</span>
            </div>
          )}

          <p className="text-xs text-[#5E6C84]">
            Archive an immutable snapshot of current hospital utilization calculations ({overall.overallUtilizationRate || 0}% overall) for institutional compliance records and administrative audits.
          </p>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
              Report Snapshot Type
            </label>
            <select
              value={snapshotType}
              onChange={(e) => setSnapshotType(e.target.value)}
              className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs text-[#172B4D]"
            >
              <option value="MONTHLY_EXECUTIVE_SUMMARY">Monthly Hospital Executive Utilization Summary</option>
              <option value="WEEKLY_CRITICAL_CARE_CENSUS">Weekly Critical Care & Surgical Block Census</option>
              <option value="AMBULANCE_FLEET_READINESS_AUDIT">Emergency Ambulance Fleet Readiness & Telemetry Audit</option>
              <option value="DIAGNOSTIC_EQUIPMENT_CAPACITY_SURVEY">Diagnostic Core Capacity & Throughput Survey</option>
            </select>
          </div>

          <div className="p-3 bg-[#FAFBFC] rounded border border-[#DFE1E6] space-y-1 font-mono text-[11px] text-[#42526E]">
            <div><strong>Active Period:</strong> {startDate || 'Historical Origin'} → {endDate || 'Current'}</div>
            <div><strong>Total Capacity:</strong> {overall.totalHospitalCapacity || 0} units</div>
            <div><strong>Current Utilization:</strong> {overall.overallUtilizationRate || 0}%</div>
            <div><strong>Period Commitments:</strong> {overall.totalAllocationsPeriod || 0} allocations</div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#EBECF0]">
            <button
              type="button"
              onClick={() => setShowSnapshotModal(false)}
              className="px-3.5 py-2 rounded border border-[#DFE1E6] text-[#42526E] hover:bg-[#F4F5F7] font-semibold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingSnapshot}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-[#087F8C] hover:bg-[#06636D] text-white font-semibold text-xs disabled:opacity-50 shadow-sm cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{savingSnapshot ? 'Archiving...' : 'Confirm & Save Snapshot'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
