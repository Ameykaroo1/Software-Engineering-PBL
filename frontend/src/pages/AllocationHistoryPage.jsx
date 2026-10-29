import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ApiClient from '../services/api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ClipboardList,
  Search,
  Filter,
  CheckCircle,
  Eye,
  LogOut,
  Calendar,
  Clock,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export default function AllocationHistoryPage() {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [isReleaseOpen, setIsReleaseOpen] = useState(false);
  const [releaseAllocationID, setReleaseAllocationID] = useState(null);
  const [releaseNotes, setReleaseNotes] = useState('');
  const [releaseNextStatus, setReleaseNextStatus] = useState('CLEANING_MAINTENANCE');
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState(null);

  useEffect(() => {
    fetchInitial();
  }, []);

  useEffect(() => {
    fetchAllocations();
  }, [category, deptFilter, statusFilter]);

  const fetchInitial = async () => {
    try {
      const d = await ApiClient.getDepartments();
      setDepartments(d.departments || []);
      await fetchAllocations();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getAllocations({
        search: search || undefined,
        resourceType: category || undefined,
        departmentID: deptFilter || undefined,
        status: statusFilter || undefined,
        limit: 100
      });
      setAllocations(res.allocations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (alloc) => {
    try {
      const full = await ApiClient.getAllocationById(alloc.allocationID);
      setSelectedAllocation(full);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRelease = async (e) => {
    e.preventDefault();
    if (!releaseAllocationID) return;
    setReleasing(true);
    setReleaseError(null);
    try {
      await ApiClient.releaseAllocation(releaseAllocationID, {
        notes: releaseNotes,
        nextStatus: releaseNextStatus
      });
      setIsReleaseOpen(false);
      setReleaseAllocationID(null);
      setReleaseNotes('');
      fetchAllocations();
    } catch (err) {
      setReleaseError(err.message || 'Failed to release allocation.');
    } finally {
      setReleasing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Enterprise Header */}
      <div className="bg-white px-5 py-4 rounded border border-[#DFE1E6] shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#172B4D] tracking-tight">Clinical Allocation & Admission Ledger</h1>
          <p className="text-xs text-[#5E6C84] mt-0.5">
            Audit-linked historical log of all bed occupancies, theatre schedules, and ambulance dispatches.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium px-2 py-1 rounded bg-[#F4F5F7] text-[#42526E] border border-[#DFE1E6]">
            {allocations.length} total records
          </span>
          <button
            onClick={fetchAllocations}
            title="Refresh database records"
            className="p-1.5 rounded bg-white hover:bg-[#F4F5F7] text-[#5E6C84] border border-[#DFE1E6] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
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
            onKeyDown={(e) => e.key === 'Enter' && fetchAllocations()}
            placeholder="Search purpose, patient MRN, resource..."
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
          <option value="ALLOCATED">Active / Allocated</option>
          <option value="IN_USE">In Use</option>
          <option value="RELEASED">Released</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Dense Ledger Table */}
      <div className="bg-white rounded border border-[#DFE1E6] shadow-card overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Querying allocation records..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left table-dense">
              <thead className="bg-[#FAFBFC] text-[#5E6C84] border-b border-[#DFE1E6]">
                <tr>
                  <th className="px-4">Allocation ID</th>
                  <th className="px-4">Resource & Code</th>
                  <th className="px-4">Purpose / Patient Reference</th>
                  <th className="px-4">Department</th>
                  <th className="px-4">Timeline</th>
                  <th className="px-4">Status</th>
                  <th className="px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBECF0] text-[#172B4D]">
                {allocations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-xs text-[#7A869A]">
                      No allocation records found matching active filter.
                    </td>
                  </tr>
                ) : (
                  allocations.map((a) => (
                    <tr key={a.allocationID} className="hover:bg-[#F4F5F7] transition-colors">
                      <td className="px-4 font-mono text-[11px] text-[#5E6C84] whitespace-nowrap">
                        {a.allocationID.slice(0, 8)}...
                      </td>
                      <td className="px-4">
                        <div className="font-bold text-xs text-[#172B4D]">{a.resource?.resourceName}</div>
                        <div className="text-[10px] text-[#087F8C] font-mono font-semibold">{a.resource?.identifierCode}</div>
                      </td>
                      <td className="px-4 text-xs">
                        <div className="font-medium text-[#172B4D] truncate max-w-xs">{a.purpose}</div>
                        {a.patientReference && <div className="text-[10px] text-[#6B778C] font-mono">{a.patientReference}</div>}
                      </td>
                      <td className="px-4 text-xs text-[#42526E]">{a.department?.departmentName}</td>
                      <td className="px-4 text-xs font-mono text-[#5E6C84] whitespace-nowrap">
                        <div>Start: {new Date(a.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        {a.actualEndTime ? (
                          <div className="text-[#006644] text-[10px]">Rel: {new Date(a.actualEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        ) : a.expectedEndTime ? (
                          <div className="text-[#7A869A] text-[10px]">Exp: {new Date(a.expectedEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        ) : null}
                      </td>
                      <td className="px-4 whitespace-nowrap">
                        <Badge status={a.status} size="sm" />
                      </td>
                      <td className="px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDetails(a)}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-[#F4F5F7] hover:bg-[#EBECF0] text-[#172B4D] rounded border border-[#DFE1E6] transition-colors cursor-pointer"
                        >
                          Details
                        </button>
                        {['ALLOCATED', 'IN_USE'].includes(a.status) && (
                          <button
                            onClick={() => {
                              setReleaseAllocationID(a.allocationID);
                              setReleaseNotes('');
                              setReleaseError(null);
                              setIsReleaseOpen(true);
                            }}
                            className="px-2 py-0.5 text-[11px] font-semibold bg-[#E6F4F6] hover:bg-[#D1ECF0] text-[#087F8C] rounded border border-[#B8E2E8] transition-colors cursor-pointer"
                          >
                            Release
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedAllocation && (
        <Modal
          isOpen={!!selectedAllocation}
          onClose={() => setSelectedAllocation(null)}
          title={`Allocation Ledger Details: ${selectedAllocation.allocationID.slice(0, 8)}...`}
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#F4F5F7] rounded border border-[#DFE1E6] grid grid-cols-2 gap-2.5">
              <div>
                <span className="text-[#5E6C84] uppercase tracking-wider font-bold block mb-0.5 text-[10px]">Resource</span>
                <span className="font-bold text-[#172B4D]">{selectedAllocation.resource?.resourceName}</span>
                <span className="block font-mono text-[#087F8C] text-[11px]">{selectedAllocation.resource?.identifierCode}</span>
              </div>
              <div>
                <span className="text-[#5E6C84] uppercase tracking-wider font-bold block mb-0.5 text-[10px]">Status</span>
                <Badge status={selectedAllocation.status} size="sm" />
              </div>
              <div>
                <span className="text-[#5E6C84] uppercase tracking-wider font-bold block mb-0.5 text-[10px]">Department</span>
                <span className="font-medium text-[#172B4D]">{selectedAllocation.department?.departmentName}</span>
              </div>
              <div>
                <span className="text-[#5E6C84] uppercase tracking-wider font-bold block mb-0.5 text-[10px]">Priority</span>
                <Badge status={selectedAllocation.priority} size="sm" />
              </div>
              <div className="col-span-2">
                <span className="text-[#5E6C84] uppercase tracking-wider font-bold block mb-0.5 text-[10px]">Purpose & Patient MRN</span>
                <p className="font-medium text-[#172B4D]">{selectedAllocation.purpose}</p>
                {selectedAllocation.patientReference && (
                  <p className="text-[#5E6C84] font-mono mt-0.5">MRN / Ref: {selectedAllocation.patientReference}</p>
                )}
              </div>
              <div>
                <span className="text-[#5E6C84] uppercase tracking-wider font-bold block mb-0.5 text-[10px]">Allocating Officer</span>
                <span className="font-medium text-[#172B4D]">
                  {selectedAllocation.user?.fullName || selectedAllocation.user?.username} ({selectedAllocation.user?.role})
                </span>
              </div>
              <div>
                <span className="text-[#5E6C84] uppercase tracking-wider font-bold block mb-0.5 text-[10px]">Start Time</span>
                <span className="font-mono text-[#172B4D]">{new Date(selectedAllocation.startTime).toLocaleString()}</span>
              </div>
              {selectedAllocation.actualEndTime && (
                <div className="col-span-2">
                  <span className="text-[#5E6C84] uppercase tracking-wider font-bold block mb-0.5 text-[10px]">Actual Release Time</span>
                  <span className="font-mono text-[#006644] font-semibold">{new Date(selectedAllocation.actualEndTime).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Related Audit Entries */}
            {selectedAllocation.auditLogs && selectedAllocation.auditLogs.length > 0 && (
              <div>
                <h4 className="font-bold uppercase tracking-wider text-[#5E6C84] text-[10px] mb-1.5">
                  Linked Regulatory Audit Logs ({selectedAllocation.auditLogs.length})
                </h4>
                <div className="space-y-1 border border-[#DFE1E6] rounded overflow-hidden divide-y divide-[#EBECF0]">
                  {selectedAllocation.auditLogs.map((log) => (
                    <div key={log.auditID} className="p-2.5 bg-white text-xs">
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className="font-bold text-[#087F8C]">{log.action}</span>
                        <span className="text-[#7A869A]">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-[#5E6C84] mt-0.5">
                        Officer: <span className="font-medium text-[#172B4D]">{log.user?.fullName || 'System'}</span> • IP: {log.ipAddress || '127.0.0.1'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[#EBECF0]">
              <button
                type="button"
                onClick={() => setSelectedAllocation(null)}
                className="px-3 py-1.5 bg-[#F4F5F7] hover:bg-[#EBECF0] text-[#172B4D] rounded font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Release Resource Modal */}
      <Modal
        isOpen={isReleaseOpen}
        onClose={() => setIsReleaseOpen(false)}
        title="Discharge / Release Clinical Resource"
      >
        <form onSubmit={handleRelease} className="space-y-3 text-xs">
          <p className="text-xs text-[#5E6C84]">
            Releasing this allocation finalizes clinical occupancy, sets the actual release timestamp, and automatically queues the resource for sanitation.
          </p>

          {releaseError && (
            <div className="p-2.5 bg-[#FFEBE6] border border-[#FFBDAD] text-[#BF2600] rounded">
              {releaseError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
              Post-Release Lifecycle Status *
            </label>
            <select
              value={releaseNextStatus}
              onChange={(e) => setReleaseNextStatus(e.target.value)}
              className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
            >
              <option value="CLEANING_MAINTENANCE">CLEANING_MAINTENANCE (Terminal Bio-Cleaning / Sanitization Required)</option>
              <option value="AVAILABLE">AVAILABLE (Direct immediate patient turnaround)</option>
              <option value="OUT_OF_SERVICE">OUT_OF_SERVICE (Defect identified upon discharge)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
              Discharge / Handover Notes
            </label>
            <textarea
              rows={3}
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              placeholder="e.g. Patient transferred to Step-Down ward; surgery concluded without incident; terminal cleaning ordered..."
              className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBECF0]">
            <button
              type="button"
              onClick={() => setIsReleaseOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-[#5E6C84] hover:bg-[#F4F5F7] rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={releasing}
              className="px-4 py-1.5 text-xs font-bold bg-[#087F8C] hover:bg-[#06636D] text-white rounded shadow-sm transition-colors"
            >
              {releasing ? 'Releasing...' : 'Confirm Release'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
