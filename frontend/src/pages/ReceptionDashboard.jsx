import React, { useState, useEffect } from 'react';
import ApiClient from '../services/api';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Bed,
  Activity,
  Siren,
  Search,
  CalendarPlus,
  Stethoscope,
  Radio,
  ArrowRight,
  Clock,
  PhoneCall,
  AlertCircle
} from 'lucide-react';

export default function ReceptionDashboard({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentAllocations, setRecentAllocations] = useState([]);

  useEffect(() => {
    fetchReceptionData();
  }, []);

  const fetchReceptionData = async () => {
    setLoading(true);
    try {
      const [availRes, allocRes] = await Promise.all([
        ApiClient.getAvailabilitySummary(),
        ApiClient.getAllocations({ limit: 5 })
      ]);
      setSummary(availRes.summary);
      setRecentAllocations(allocRes.allocations || []);
    } catch (err) {
      console.error('Reception Dashboard Load Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await ApiClient.getResources({ search: searchQuery, limit: 10 });
      setSearchResults(res.resources || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  if (loading) return <LoadingSpinner message="Checking live triage & bed availability board..." />;

  const byCat = summary?.byCategory || {};

  return (
    <div className="space-y-4">
      {/* Enterprise Header & Emergency Action Header */}
      <div className="bg-white px-5 py-4 rounded border border-[#DFE1E6] shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#172B4D] tracking-tight">Patient Triage & Reception Operations</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6F4F6] text-[#087F8C] border border-[#B8E2E8]">
              Front Desk Portal
            </span>
          </div>
          <p className="text-xs text-[#5E6C84] mt-0.5">
            Rapid bed intake, operating theatre verification, and immediate ambulance callout.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('emergency-ambulance')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-bold bg-[#DE350B] hover:bg-[#BF2600] text-white shadow-sm transition-colors cursor-pointer"
          >
            <Siren className="w-3.5 h-3.5" />
            <span>Emergency Ambulance Callout</span>
          </button>

          <button
            onClick={() => onNavigate('allocation')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#087F8C] hover:bg-[#06636D] text-white transition-colors cursor-pointer shadow-sm"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>New Allocation</span>
          </button>
        </div>
      </div>

      {/* 5 Clinical Category Availability Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Beds */}
        <div className="bg-white p-3.5 rounded border border-[#DFE1E6] shadow-card border-l-4 border-l-[#00875A]">
          <div className="flex items-center justify-between text-[#5E6C84]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Available Beds</span>
            <Bed className="w-4 h-4 text-[#00875A]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#172B4D] mt-1">
            {byCat.HOSPITAL_BED?.available || 0}
          </div>
          <div className="text-[10px] text-[#6B778C] mt-1 border-t border-[#EBECF0] pt-1">
            Total capacity: {byCat.HOSPITAL_BED?.total || 0} beds
          </div>
        </div>

        {/* Operation Theatres */}
        <div className="bg-white p-3.5 rounded border border-[#DFE1E6] shadow-card border-l-4 border-l-[#087F8C]">
          <div className="flex items-center justify-between text-[#5E6C84]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Available OTs</span>
            <Activity className="w-4 h-4 text-[#087F8C]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#172B4D] mt-1">
            {byCat.OPERATION_THEATRE?.available || 0}
          </div>
          <div className="text-[10px] text-[#6B778C] mt-1 border-t border-[#EBECF0] pt-1">
            Total capacity: {byCat.OPERATION_THEATRE?.total || 0} suites
          </div>
        </div>

        {/* Medical Equipment */}
        <div className="bg-white p-3.5 rounded border border-[#DFE1E6] shadow-card border-l-4 border-l-[#0052CC]">
          <div className="flex items-center justify-between text-[#5E6C84]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avail Equipment</span>
            <Stethoscope className="w-4 h-4 text-[#0052CC]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#172B4D] mt-1">
            {byCat.MEDICAL_EQUIPMENT?.available || 0}
          </div>
          <div className="text-[10px] text-[#6B778C] mt-1 border-t border-[#EBECF0] pt-1">
            Total capacity: {byCat.MEDICAL_EQUIPMENT?.total || 0} units
          </div>
        </div>

        {/* Ambulances */}
        <div className="bg-white p-3.5 rounded border border-[#DFE1E6] shadow-card border-l-4 border-l-[#FF8B00]">
          <div className="flex items-center justify-between text-[#5E6C84]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Standby Ambulances</span>
            <Siren className="w-4 h-4 text-[#B76E00]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#172B4D] mt-1">
            {byCat.AMBULANCE?.available || 0}
          </div>
          <div className="text-[10px] text-[#6B778C] mt-1 border-t border-[#EBECF0] pt-1">
            Total capacity: {byCat.AMBULANCE?.total || 0} vehicles
          </div>
        </div>

        {/* Diagnostics */}
        <div className="bg-white p-3.5 rounded border border-[#DFE1E6] shadow-card border-l-4 border-l-[#5243AA]">
          <div className="flex items-center justify-between text-[#5E6C84]">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Diagnostics</span>
            <Radio className="w-4 h-4 text-[#5243AA]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#172B4D] mt-1">
            {byCat.DIAGNOSTIC_FACILITY?.available || 0}
          </div>
          <div className="text-[10px] text-[#6B778C] mt-1 border-t border-[#EBECF0] pt-1">
            Total capacity: {byCat.DIAGNOSTIC_FACILITY?.total || 0} suites
          </div>
        </div>
      </div>

      {/* Instant Search Bar */}
      <div className="bg-white p-4 rounded border border-[#DFE1E6] shadow-card">
        <h3 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider mb-1">
          Instant Resource & Bed Lookup
        </h3>
        <p className="text-[11px] text-[#5E6C84] mb-3">
          Check live occupancy for specific room numbers, bed IDs, or surgical suites across wards.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B778C]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Query by identifier code (e.g. BED-ICU, OT-CARD), wing, or room number..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] focus:ring-1 focus:ring-[#087F8C] text-[#172B4D]"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 bg-[#172B4D] hover:bg-[#091E42] text-white font-semibold text-xs rounded transition-colors cursor-pointer"
          >
            {isSearching ? 'Querying...' : 'Find Resource'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-3 border border-[#DFE1E6] rounded overflow-hidden divide-y divide-[#EBECF0]">
            {searchResults.map((r) => (
              <div key={r.resourceID} className="p-2.5 flex items-center justify-between hover:bg-[#F4F5F7] text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#172B4D]">{r.resourceName}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#EBECF0] text-[#172B4D]">{r.identifierCode}</span>
                  </div>
                  <div className="text-[11px] text-[#5E6C84]">
                    {r.department?.departmentName} • {r.location} • {r.subType}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={r.status} size="sm" />
                  {r.status === 'AVAILABLE' && (
                    <button
                      onClick={() => onNavigate('allocation')}
                      className="px-2.5 py-1 rounded text-[11px] font-bold bg-[#087F8C] text-white hover:bg-[#06636D] transition-colors cursor-pointer"
                    >
                      Allocate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Triage Allocation Outcomes Table */}
      <div className="bg-white rounded border border-[#DFE1E6] shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-[#DFE1E6] bg-[#FAFBFC] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xs text-[#172B4D] uppercase tracking-wider">Recent Admission & Allocation Outcomes</h3>
            <p className="text-[11px] text-[#5E6C84]">Reservations initiated at front desk triage</p>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs font-semibold text-[#087F8C] hover:underline flex items-center gap-1"
          >
            <span>All Allocations</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="divide-y divide-[#EBECF0] text-xs">
          {recentAllocations.length === 0 ? (
            <p className="p-4 text-center text-xs text-[#7A869A]">No recent allocations recorded today.</p>
          ) : (
            recentAllocations.map((a) => (
              <div key={a.allocationID} className="p-3 sm:px-5 flex items-center justify-between hover:bg-[#F4F5F7]">
                <div className="space-y-0.5 min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#172B4D]">{a.resource?.resourceName}</span>
                    <Badge status={a.status} size="sm" />
                    {a.isEmergency && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#DE350B] text-white">EMERGENCY</span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#42526E] truncate">
                    <span className="font-medium">Purpose:</span> {a.purpose}
                    {a.patientReference && <span className="ml-2 text-[#5E6C84] font-mono">({a.patientReference})</span>}
                  </div>
                  <div className="text-[10px] text-[#7A869A] font-mono">
                    Dept: {a.department?.departmentName} • Officer: {a.user?.fullName || a.user?.username} • Time: {new Date(a.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="shrink-0">
                  {a.status === 'ALLOCATED' && (
                    <button
                      onClick={() => onNavigate('history')}
                      className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[#F4F5F7] hover:bg-[#EBECF0] text-[#172B4D] border border-[#DFE1E6] transition-colors"
                    >
                      Manage
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
