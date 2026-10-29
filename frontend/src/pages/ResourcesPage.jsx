import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ApiClient from '../services/api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Bed,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Archive,
  AlertTriangle,
  Layers,
  ArrowRight
} from 'lucide-react';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'HOSPITAL_BED', label: 'Hospital Beds' },
  { value: 'OPERATION_THEATRE', label: 'Operation Theatres' },
  { value: 'MEDICAL_EQUIPMENT', label: 'Medical Equipment' },
  { value: 'AMBULANCE', label: 'Ambulances' },
  { value: 'DIAGNOSTIC_FACILITY', label: 'Diagnostic Facilities' }
];

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ALLOCATED', label: 'Allocated' },
  { value: 'IN_USE', label: 'In Use' },
  { value: 'CLEANING_MAINTENANCE', label: 'Cleaning / Maintenance' },
  { value: 'OUT_OF_SERVICE', label: 'Out of Service' },
  { value: 'UNDER_REPAIR', label: 'Under Repair' },
  { value: 'RETIRED_DISPOSED', label: 'Retired / Disposed' }
];

export default function ResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Modals
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isRetireOpen, setIsRetireOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);

  // Forms
  const [formData, setFormData] = useState({
    resourceName: '',
    resourceType: 'HOSPITAL_BED',
    subType: 'ICU',
    departmentID: '',
    location: '',
    identifierCode: '',
    quantityTotal: 1,
    specifications: ''
  });
  const [statusData, setStatusData] = useState({ status: 'AVAILABLE', reason: '' });
  const [retireReason, setRetireReason] = useState('');
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const canRegister = ['HOSPITAL_ADMINISTRATOR'].includes(user?.role);
  const canRetire = ['HOSPITAL_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'].includes(user?.role);

  useEffect(() => {
    fetchInitial();
  }, []);

  useEffect(() => {
    fetchResources();
  }, [categoryFilter, statusFilter, departmentFilter]);

  const fetchInitial = async () => {
    try {
      const deptRes = await ApiClient.getDepartments();
      setDepartments(deptRes.departments || []);
      if (deptRes.departments && deptRes.departments.length > 0) {
        setFormData(prev => ({ ...prev, departmentID: deptRes.departments[0].departmentID }));
      }
      await fetchResources();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getResources({
        search: search || undefined,
        resourceType: categoryFilter || undefined,
        status: statusFilter || undefined,
        departmentID: departmentFilter || undefined,
        includeRetired: true,
        limit: 100
      });
      setResources(res.resources || []);
    } catch (err) {
      console.error('Resource fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await ApiClient.createResource({
        ...formData,
        quantityTotal: parseInt(formData.quantityTotal, 10),
        quantityAvailable: parseInt(formData.quantityTotal, 10)
      });
      setIsRegisterOpen(false);
      setFormData({
        resourceName: '',
        resourceType: 'HOSPITAL_BED',
        subType: 'ICU',
        departmentID: departments[0]?.departmentID || '',
        location: '',
        identifierCode: '',
        quantityTotal: 1,
        specifications: ''
      });
      fetchResources();
    } catch (err) {
      setFormError(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusTransition = async (e) => {
    e.preventDefault();
    if (!selectedResource) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await ApiClient.updateResourceStatus(selectedResource.resourceID, {
        status: statusData.status,
        reason: statusData.reason
      });
      setIsStatusOpen(false);
      setSelectedResource(null);
      fetchResources();
    } catch (err) {
      setFormError(err.message || 'Status transition rejected.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetire = async (e) => {
    e.preventDefault();
    if (!selectedResource) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await ApiClient.retireResource(selectedResource.resourceID, retireReason);
      setIsRetireOpen(false);
      setSelectedResource(null);
      fetchResources();
    } catch (err) {
      setFormError(err.message || 'Archival failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Enterprise Header */}
      <div className="bg-white px-5 py-4 rounded border border-[#DFE1E6] shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#172B4D] tracking-tight">Hospital Clinical Resource Inventory</h1>
          <p className="text-xs text-[#5E6C84] mt-0.5">
            Full clinical registry across beds, operating theatres, equipment, ambulances, and diagnostic machines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canRegister && (
            <button
              onClick={() => {
                setFormError(null);
                setIsRegisterOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#087F8C] hover:bg-[#06636D] text-white shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Resource</span>
            </button>
          )}
          <button
            onClick={fetchResources}
            title="Refresh database records"
            className="p-1.5 rounded bg-white hover:bg-[#F4F5F7] text-[#5E6C84] border border-[#DFE1E6] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter and Query Ribbon */}
      <div className="bg-white p-3 rounded border border-[#DFE1E6] shadow-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B778C]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchResources()}
            placeholder="Search by code, title, subtype, room number..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="p-1.5 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
        >
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-1.5 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
        >
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="p-1.5 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.departmentID} value={d.departmentID}>{d.departmentName}</option>
          ))}
        </select>
      </div>

      {/* Dense Enterprise Data Table */}
      <div className="bg-white rounded border border-[#DFE1E6] shadow-card overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Querying hospital asset database..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left table-dense">
              <thead className="bg-[#FAFBFC] text-[#5E6C84] border-b border-[#DFE1E6]">
                <tr>
                  <th className="px-4">Identifier & Resource Name</th>
                  <th className="px-4">Category & Subtype</th>
                  <th className="px-4">Department</th>
                  <th className="px-4">Physical Location</th>
                  <th className="px-4">Availability</th>
                  <th className="px-4">Status</th>
                  <th className="px-4 text-right">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBECF0] text-[#172B4D]">
                {resources.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-xs text-[#7A869A]">
                      No clinical resources match the active filter criteria.
                    </td>
                  </tr>
                ) : (
                  resources.map((r) => (
                    <tr key={r.resourceID} className="hover:bg-[#F4F5F7] transition-colors">
                      <td className="px-4">
                        <div className="font-bold text-xs text-[#172B4D]">{r.resourceName}</div>
                        <div className="font-mono text-[11px] text-[#087F8C] font-semibold">{r.identifierCode}</div>
                      </td>
                      <td className="px-4 text-xs text-[#42526E]">
                        <div>{r.resourceType.replace(/_/g, ' ')}</div>
                        <div className="text-[10px] text-[#7A869A]">{r.subType}</div>
                      </td>
                      <td className="px-4 text-xs text-[#42526E] font-medium">{r.department?.departmentName}</td>
                      <td className="px-4 text-xs text-[#5E6C84]">{r.location}</td>
                      <td className="px-4 text-xs font-mono font-medium">
                        <span className="font-bold text-[#172B4D]">{r.quantityAvailable}</span>
                        <span className="text-[#7A869A]"> / {r.quantityTotal} units</span>
                      </td>
                      <td className="px-4">
                        <Badge status={r.status} size="sm" />
                      </td>
                      <td className="px-4 text-right space-x-1.5 whitespace-nowrap">
                        {r.status !== 'RETIRED_DISPOSED' && (
                          <button
                            onClick={() => {
                              setSelectedResource(r);
                              setStatusData({ status: r.status === 'AVAILABLE' ? 'CLEANING_MAINTENANCE' : 'AVAILABLE', reason: '' });
                              setFormError(null);
                              setIsStatusOpen(true);
                            }}
                            className="px-2 py-0.5 text-[11px] font-semibold bg-[#E6F4F6] hover:bg-[#D1ECF0] text-[#087F8C] rounded border border-[#B8E2E8] transition-colors cursor-pointer"
                          >
                            Transition
                          </button>
                        )}
                        {canRetire && r.status !== 'RETIRED_DISPOSED' && (
                          <button
                            onClick={() => {
                              setSelectedResource(r);
                              setRetireReason('');
                              setFormError(null);
                              setIsRetireOpen(true);
                            }}
                            className="px-2 py-0.5 text-[11px] font-semibold bg-white hover:bg-[#FFEBE6] hover:text-[#BF2600] text-[#5E6C84] rounded border border-[#DFE1E6] transition-colors cursor-pointer"
                          >
                            Retire
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

      {/* Registration Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Register Clinical Asset in System"
      >
        <form onSubmit={handleRegister} className="space-y-3 text-xs">
          {formError && (
            <div className="p-2.5 bg-[#FFEBE6] border border-[#FFBDAD] text-[#BF2600] rounded">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Resource Name *</label>
              <input
                type="text"
                required
                value={formData.resourceName}
                onChange={(e) => setFormData({ ...formData, resourceName: e.target.value })}
                placeholder="e.g. ICU Critical Bed 108"
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Unique Identifier Code *</label>
              <input
                type="text"
                required
                value={formData.identifierCode}
                onChange={(e) => setFormData({ ...formData, identifierCode: e.target.value.toUpperCase() })}
                placeholder="e.g. BED-ICU-108"
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs font-mono focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Category *</label>
              <select
                value={formData.resourceType}
                onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              >
                <option value="HOSPITAL_BED">Hospital Bed</option>
                <option value="OPERATION_THEATRE">Operation Theatre</option>
                <option value="MEDICAL_EQUIPMENT">Medical Equipment</option>
                <option value="AMBULANCE">Ambulance</option>
                <option value="DIAGNOSTIC_FACILITY">Diagnostic Facility</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Sub-Type / Model *</label>
              <input
                type="text"
                required
                value={formData.subType}
                onChange={(e) => setFormData({ ...formData, subType: e.target.value })}
                placeholder="e.g. ICU, General Ward, MRI, Ventilator"
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Department *</label>
              <select
                value={formData.departmentID}
                onChange={(e) => setFormData({ ...formData, departmentID: e.target.value })}
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              >
                {departments.map(d => (
                  <option key={d.departmentID} value={d.departmentID}>{d.departmentName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Physical Location *</label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Building A, Level 3, Bay 4"
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Total Unit Capacity *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.quantityTotal}
                onChange={(e) => setFormData({ ...formData, quantityTotal: e.target.value })}
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Clinical Specifications</label>
              <input
                type="text"
                value={formData.specifications}
                onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                placeholder="e.g. Model, serial number, features"
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBECF0]">
            <button
              type="button"
              onClick={() => setIsRegisterOpen(false)}
              className="px-3 py-1.5 text-xs font-semibold text-[#5E6C84] hover:bg-[#F4F5F7] rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs font-bold bg-[#087F8C] hover:bg-[#06636D] text-white rounded shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Register Asset'}
            </button>
          </div>
        </form>
      </Modal>

      {/* State Transition Modal */}
      {selectedResource && (
        <Modal
          isOpen={isStatusOpen}
          onClose={() => setIsStatusOpen(false)}
          title={`Lifecycle State Transition: ${selectedResource.resourceName}`}
        >
          <form onSubmit={handleStatusTransition} className="space-y-3 text-xs">
            <div className="p-3 bg-[#F4F5F7] rounded border border-[#DFE1E6] space-y-1">
              <div className="flex justify-between">
                <span className="text-[#5E6C84]">Identifier:</span>
                <span className="font-mono font-bold text-[#172B4D]">{selectedResource.identifierCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5E6C84]">Current Status:</span>
                <Badge status={selectedResource.status} size="sm" />
              </div>
            </div>

            {formError && (
              <div className="p-2.5 bg-[#FFEBE6] border border-[#FFBDAD] text-[#BF2600] rounded">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Target Status</label>
              <select
                value={statusData.status}
                onChange={(e) => setStatusData({ ...statusData, status: e.target.value })}
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              >
                <option value="AVAILABLE">AVAILABLE (Clinically Cleared)</option>
                <option value="CLEANING_MAINTENANCE">CLEANING_MAINTENANCE (Terminal Bio-Cleaning)</option>
                <option value="OUT_OF_SERVICE">OUT_OF_SERVICE (Mechanical Defect / Fault)</option>
                <option value="UNDER_REPAIR">UNDER_REPAIR (Biomedical Repair)</option>
                <option value="IN_USE">IN_USE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Operational Justification *</label>
              <textarea
                required
                rows={3}
                value={statusData.reason}
                onChange={(e) => setStatusData({ ...statusData, reason: e.target.value })}
                placeholder="State the clinical, biological, or mechanical justification for this transition..."
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBECF0]">
              <button
                type="button"
                onClick={() => setIsStatusOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-[#5E6C84] hover:bg-[#F4F5F7] rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 text-xs font-bold bg-[#087F8C] hover:bg-[#06636D] text-white rounded shadow-sm transition-colors"
              >
                {submitting ? 'Transitioning...' : 'Commit Status'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Retirement Modal */}
      {selectedResource && (
        <Modal
          isOpen={isRetireOpen}
          onClose={() => setIsRetireOpen(false)}
          title={`Permanent Asset Archival: ${selectedResource.resourceName}`}
        >
          <form onSubmit={handleRetire} className="space-y-3 text-xs">
            <div className="p-3 bg-[#FFFAE6] border border-[#FFE380] rounded text-[#7A4100]">
              <p className="font-bold flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4 text-[#FF8B00]" />
                Permanent Regulatory Archival Warning
              </p>
              Once retired, this asset enters a terminal state and cannot return to active service. Historical records and audit entries remain preserved.
            </div>

            {formError && (
              <div className="p-2.5 bg-[#FFEBE6] border border-[#FFBDAD] text-[#BF2600] rounded">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Decommissioning Justification *</label>
              <textarea
                required
                rows={3}
                value={retireReason}
                onChange={(e) => setRetireReason(e.target.value)}
                placeholder="e.g. End of 10-year clinical lifespan; beyond economical repair..."
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#DE350B] text-[#172B4D]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBECF0]">
              <button
                type="button"
                onClick={() => setIsRetireOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-[#5E6C84] hover:bg-[#F4F5F7] rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 text-xs font-bold bg-[#DE350B] hover:bg-[#BF2600] text-white rounded shadow-sm transition-colors"
              >
                {submitting ? 'Archiving...' : 'Permanently Decommission'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
