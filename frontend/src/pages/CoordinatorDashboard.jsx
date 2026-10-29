import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ApiClient from '../services/api';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Bed,
  CheckCircle,
  Clock,
  Wrench,
  AlertOctagon,
  RefreshCw,
  FolderLock,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function CoordinatorDashboard({ onNavigate }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [targetStatus, setTargetStatus] = useState('AVAILABLE');
  const [statusReason, setStatusReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [statusError, setStatusError] = useState(null);

  useEffect(() => {
    fetchDepartmentData();
  }, [user]);

  const fetchDepartmentData = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getResources({
        departmentID: user?.departmentID || undefined,
        limit: 100
      });
      setResources(res.resources || []);
    } catch (err) {
      console.error('Coordinator Dashboard Load Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (e) => {
    e.preventDefault();
    if (!selectedResource) return;
    if (!statusReason.trim()) {
      setStatusError('A clear clinical or operational reason is required for status transitions.');
      return;
    }

    setUpdating(true);
    setStatusError(null);
    try {
      await ApiClient.updateResourceStatus(selectedResource.resourceID, {
        status: targetStatus,
        reason: statusReason
      });
      setSelectedResource(null);
      setStatusReason('');
      fetchDepartmentData();
    } catch (err) {
      setStatusError(err.message || 'Failed to update resource status.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <LoadingSpinner message="Querying departmental asset ledger..." />;

  const availableCount = resources.filter(r => r.status === 'AVAILABLE').length;
  const allocatedCount = resources.filter(r => ['ALLOCATED', 'IN_USE'].includes(r.status)).length;
  const maintenanceCount = resources.filter(r => ['CLEANING_MAINTENANCE', 'UNDER_REPAIR'].includes(r.status)).length;

  return (
    <div className="space-y-4">
      {/* Department Header */}
      <div className="bg-white px-5 py-4 rounded border border-[#DFE1E6] shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#172B4D] tracking-tight">
              {user?.department?.departmentName || 'Departmental'} Operations Control
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6F4F6] text-[#087F8C] border border-[#B8E2E8]">
              Assigned Scope
            </span>
          </div>
          <p className="text-xs text-[#5E6C84] mt-0.5">
            Operational status management, post-procedure bio-cleaning, and equipment inspection.
          </p>
        </div>

        <button
          onClick={fetchDepartmentData}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-white hover:bg-[#F4F5F7] text-[#172B4D] border border-[#DFE1E6] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Live Board</span>
        </button>
      </div>

      {/* 4 Clinical KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Assigned Department Assets"
          value={resources.length}
          subtext="Total clinical assets"
          icon={FolderLock}
          color="navy"
        />
        <StatCard
          title="Clinically Ready / Available"
          value={availableCount}
          subtext="Ready for patient intake"
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Active Occupancy / In Use"
          value={allocatedCount}
          subtext="Procedure or admission"
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Under Maintenance / Cleaning"
          value={maintenanceCount}
          subtext="Sanitization cycle underway"
          icon={Wrench}
          color="amber"
        />
      </div>

      {/* Department Resource Table & Status Transition Actions */}
      <div className="bg-white rounded border border-[#DFE1E6] shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-[#DFE1E6] bg-[#FAFBFC] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xs text-[#172B4D] uppercase tracking-wider">Departmental Asset Roster & Lifecycle Actions</h3>
            <p className="text-[11px] text-[#5E6C84]">Update clinical availability, trigger bio-cleaning, or report mechanical faults</p>
          </div>
          <span className="text-xs font-mono text-[#5E6C84]">
            {resources.length} active units
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left table-dense">
            <thead className="bg-[#FAFBFC] text-[#5E6C84] border-b border-[#DFE1E6]">
              <tr>
                <th className="px-4">Resource Name</th>
                <th className="px-4">Identifier Code</th>
                <th className="px-4">Sub-Type</th>
                <th className="px-4">Location</th>
                <th className="px-4">Available / Total</th>
                <th className="px-4">Current Status</th>
                <th className="px-4 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBECF0] text-[#172B4D]">
              {resources.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-[#7A869A]">
                    No resources assigned to this department yet.
                  </td>
                </tr>
              ) : (
                resources.map((r) => (
                  <tr key={r.resourceID} className="hover:bg-[#F4F5F7] transition-colors">
                    <td className="px-4 font-bold text-xs text-[#172B4D]">{r.resourceName}</td>
                    <td className="px-4 font-mono text-xs text-[#087F8C] font-semibold">{r.identifierCode}</td>
                    <td className="px-4 text-xs text-[#42526E]">{r.subType}</td>
                    <td className="px-4 text-xs text-[#42526E]">{r.location}</td>
                    <td className="px-4 text-xs font-mono font-semibold">
                      {r.quantityAvailable} / {r.quantityTotal} units
                    </td>
                    <td className="px-4">
                      <Badge status={r.status} size="sm" />
                    </td>
                    <td className="px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedResource(r);
                          setStatusReason('');
                          setStatusError(null);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-[#E6F4F6] hover:bg-[#D1ECF0] text-[#087F8C] rounded border border-[#B8E2E8] transition-colors cursor-pointer"
                      >
                        Transition Status
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validated Lifecycle State Transition Modal */}
      {selectedResource && (
        <Modal
          isOpen={!!selectedResource}
          onClose={() => setSelectedResource(null)}
          title={`Update Clinical Lifecycle Status: ${selectedResource.resourceName}`}
        >
          <form onSubmit={handleStatusChange} className="space-y-4">
            <div className="p-3 bg-[#F4F5F7] rounded border border-[#DFE1E6] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#5E6C84]">Resource Identifier:</span>
                <span className="font-mono font-bold text-[#172B4D]">{selectedResource.identifierCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5E6C84]">Current Status:</span>
                <Badge status={selectedResource.status} size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-[#5E6C84]">Physical Location:</span>
                <span className="text-[#172B4D] font-medium">{selectedResource.location}</span>
              </div>
            </div>

            {statusError && (
              <div className="p-2.5 rounded bg-[#FFEBE6] border border-[#FFBDAD] text-[#BF2600] text-xs">
                {statusError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
                Target Status Transition *
              </label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              >
                <option value="AVAILABLE">AVAILABLE (Clinically Cleared & Ready)</option>
                <option value="CLEANING_MAINTENANCE">CLEANING_MAINTENANCE (Terminal Bio-Cleaning / Sanitization)</option>
                <option value="OUT_OF_SERVICE">OUT_OF_SERVICE (Mechanical Defect / Breakdown)</option>
                <option value="UNDER_REPAIR">UNDER_REPAIR (Biomedical Engineering Active Repair)</option>
              </select>
              <p className="text-[11px] text-[#5E6C84] mt-1">
                * Department Coordinators may trigger operational state transitions. Permanent disposal requires Administrator authorization.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
                Clinical / Operational Reason *
              </label>
              <textarea
                required
                rows={3}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="State the justification, e.g. 'Patient discharged; terminal chemical sanitization cycle initiated'..."
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBECF0]">
              <button
                type="button"
                onClick={() => setSelectedResource(null)}
                className="px-3 py-1.5 text-xs font-semibold text-[#5E6C84] hover:bg-[#F4F5F7] rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="px-4 py-1.5 text-xs font-bold bg-[#087F8C] hover:bg-[#06636D] text-white rounded shadow-sm transition-colors disabled:opacity-50"
              >
                {updating ? 'Validating State Machine...' : 'Commit Status Transition'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
