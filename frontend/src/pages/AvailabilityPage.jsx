import React, { useState, useEffect } from 'react';
import ApiClient from '../services/api';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Activity,
  Bed,
  Search,
  RefreshCw,
  Siren,
  Clock,
  Wrench,
  AlertCircle,
  MapPin,
  CalendarCheck
} from 'lucide-react';

export default function AvailabilityPage({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('AVAILABLE');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchInitial();
  }, []);

  useEffect(() => {
    fetchAvailability();
  }, [category, deptFilter, statusFilter]);

  // Polling every 15s if enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAvailability(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, category, deptFilter, statusFilter, search]);

  const fetchInitial = async () => {
    try {
      const d = await ApiClient.getDepartments();
      setDepartments(d.departments || []);
      await fetchAvailability();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAvailability = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await ApiClient.getResources({
        search: search || undefined,
        resourceType: category || undefined,
        departmentID: deptFilter || undefined,
        status: statusFilter || undefined,
        limit: 100
      });
      setResources(res.resources || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const availableAmbulances = resources.filter(r => r.resourceType === 'AMBULANCE' && r.status === 'AVAILABLE');
  const maintenanceResources = resources.filter(r => ['CLEANING_MAINTENANCE', 'UNDER_REPAIR'].includes(r.status));

  return (
    <div className="space-y-4">
      {/* Enterprise Header */}
      <div className="bg-white px-5 py-4 rounded border border-[#DFE1E6] shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#172B4D] tracking-tight">Live Resource Availability Board</h1>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#E3FCEF] text-[#006644] border border-[#ABF5D1]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00875A]" />
              Telemetry Feed Active
            </span>
          </div>
          <p className="text-xs text-[#5E6C84] mt-0.5">
            Continuous occupancy telemetry for hospital beds, surgical suites, and mobile units.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-[#5E6C84] cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-[#087F8C] focus:ring-[#087F8C]"
            />
            <span>Auto-refresh (15s)</span>
          </label>
          <button
            onClick={() => fetchAvailability(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-white hover:bg-[#F4F5F7] text-[#172B4D] border border-[#DFE1E6] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#5E6C84]" />
            <span>Refresh Board</span>
          </button>
        </div>
      </div>

      {/* Highlights: Standby Ambulances & Sanitation Watch */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Ambulance Readiness */}
        <div className="bg-white p-3.5 rounded border border-[#DFE1E6] shadow-card border-l-4 border-l-[#FF8B00]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Siren className="w-4 h-4 text-[#B76E00]" />
              <h3 className="font-bold text-xs text-[#172B4D] uppercase tracking-wider">Emergency Ambulance Standby</h3>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#FFFAE6] text-[#B76E00] border border-[#FFE380] rounded">
              {availableAmbulances.length} Units Ready
            </span>
          </div>
          {availableAmbulances.length === 0 ? (
            <p className="text-xs text-[#7A869A] italic">No ambulance currently on standby.</p>
          ) : (
            <div className="space-y-1.5">
              {availableAmbulances.slice(0, 3).map(a => (
                <div key={a.resourceID} className="bg-[#FAFBFC] p-2 rounded border border-[#EBECF0] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#172B4D]">{a.resourceName}</span>
                    <span className="text-[10px] text-[#5E6C84] font-mono ml-2">[{a.identifierCode}]</span>
                  </div>
                  <span className="font-semibold text-[#006644] text-[11px]">Standby Ready</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Maintenance / Sanitation Queue */}
        <div className="bg-white p-3.5 rounded border border-[#DFE1E6] shadow-card border-l-4 border-l-[#5E6C84]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-[#5E6C84]" />
              <h3 className="font-bold text-xs text-[#172B4D] uppercase tracking-wider">Bio-Cleaning & Service Queue</h3>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#F4F5F7] text-[#42526E] border border-[#DFE1E6] rounded">
              {maintenanceResources.length} Units In Cycle
            </span>
          </div>
          {maintenanceResources.length === 0 ? (
            <p className="text-xs text-[#7A869A] italic">All clinical assets cleared for patient use.</p>
          ) : (
            <div className="space-y-1.5">
              {maintenanceResources.slice(0, 3).map(m => (
                <div key={m.resourceID} className="bg-[#FAFBFC] p-2 rounded border border-[#EBECF0] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-medium text-[#172B4D]">{m.resourceName}</span>
                    <span className="text-[10px] text-[#7A869A] font-mono ml-2">({m.identifierCode})</span>
                  </div>
                  <Badge status={m.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white p-3 rounded border border-[#DFE1E6] shadow-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B778C]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAvailability(true)}
            placeholder="Search bed, suite, room..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="p-1.5 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
        >
          <option value="">All Categories</option>
          <option value="HOSPITAL_BED">Hospital Beds</option>
          <option value="OPERATION_THEATRE">Operation Theatres</option>
          <option value="MEDICAL_EQUIPMENT">Medical Equipment</option>
          <option value="AMBULANCE">Ambulances</option>
          <option value="DIAGNOSTIC_FACILITY">Diagnostic Facilities</option>
        </select>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="p-1.5 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.departmentID} value={d.departmentID}>{d.departmentName}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-1.5 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
        >
          <option value="">All Statuses</option>
          <option value="AVAILABLE">AVAILABLE ONLY</option>
          <option value="ALLOCATED">ALLOCATED ONLY</option>
          <option value="CLEANING_MAINTENANCE">MAINTENANCE / CLEANING</option>
          <option value="OUT_OF_SERVICE">OUT OF SERVICE</option>
        </select>
      </div>

      {/* Grid of Clinical Asset Tiles */}
      {loading ? (
        <LoadingSpinner message="Checking real-time database locks and availability..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {resources.length === 0 ? (
            <div className="col-span-full bg-white p-8 text-center rounded border border-[#DFE1E6] text-xs text-[#7A869A]">
              No clinical assets found matching the specified query.
            </div>
          ) : (
            resources.map((r) => {
              const isAvail = r.status === 'AVAILABLE' && r.quantityAvailable > 0;
              return (
                <div
                  key={r.resourceID}
                  className={`bg-white rounded border p-4 shadow-card hover:shadow-card-hover transition-shadow flex flex-col justify-between ${
                    isAvail ? 'border-l-4 border-l-[#00875A]' : 'border-[#DFE1E6]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#EBECF0] text-[#172B4D] font-bold">
                          {r.identifierCode}
                        </span>
                        <h4 className="font-bold text-sm text-[#172B4D] mt-1.5">{r.resourceName}</h4>
                        <p className="text-[11px] text-[#5E6C84]">{r.subType} • {r.department?.departmentName}</p>
                      </div>
                      <Badge status={r.status} size="sm" />
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#EBECF0] space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[#5E6C84]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#7A869A]" />
                          <span>Location:</span>
                        </span>
                        <span className="font-medium text-[#172B4D]">{r.location}</span>
                      </div>

                      <div className="flex items-center justify-between text-[#5E6C84]">
                        <span>Available Units:</span>
                        <span className="font-mono font-bold text-[#172B4D]">{r.quantityAvailable} of {r.quantityTotal}</span>
                      </div>

                      {r.allocations && r.allocations.length > 0 && (
                        <div className="p-2 bg-[#F4F5F7] rounded border border-[#EBECF0] mt-2 text-[11px]">
                          <p className="text-[9px] uppercase font-bold text-[#6B778C]">Active Allocation</p>
                          <p className="font-semibold text-[#172B4D] truncate">{r.allocations[0].purpose}</p>
                          <p className="text-[10px] text-[#5E6C84]">
                            Officer: {r.allocations[0].user?.fullName || r.allocations[0].user?.username}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {isAvail && onNavigate && (
                    <div className="mt-3 pt-2.5 border-t border-[#EBECF0]">
                      <button
                        onClick={() => onNavigate('allocation')}
                        className="w-full py-1.5 px-3 rounded text-xs font-bold bg-[#087F8C] hover:bg-[#06636D] text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <CalendarCheck className="w-3.5 h-3.5" />
                        <span>Allocate Unit</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
