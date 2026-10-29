import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ApiClient from '../services/api';
import Badge from '../components/Badge';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2
} from 'lucide-react';

const CATEGORIES = [
  { value: 'HOSPITAL_BED', label: 'Hospital Beds' },
  { value: 'OPERATION_THEATRE', label: 'Operation Theatres' },
  { value: 'MEDICAL_EQUIPMENT', label: 'Medical Equipment' },
  { value: 'AMBULANCE', label: 'Ambulances' },
  { value: 'DIAGNOSTIC_FACILITY', label: 'Diagnostic Facilities' }
];

export default function AllocationPage({ onNavigate }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [availableResources, setAvailableResources] = useState([]);

  // Form State
  const [category, setCategory] = useState('HOSPITAL_BED');
  const [selectedResourceID, setSelectedResourceID] = useState('');
  const [selectedDeptID, setSelectedDeptID] = useState('');
  const [patientReference, setPatientReference] = useState('');
  const [purpose, setPurpose] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [quantity, setQuantity] = useState(1);
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [expectedEndTime, setExpectedEndTime] = useState(
    new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState('');

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    fetchPrerequisites();
  }, []);

  useEffect(() => {
    fetchAvailableResourcesByCategory(category);
  }, [category]);

  const fetchPrerequisites = async () => {
    setLoading(true);
    try {
      const d = await ApiClient.getDepartments();
      setDepartments(d.departments || []);
      if (d.departments && d.departments.length > 0) {
        setSelectedDeptID(user?.departmentID || d.departments[0].departmentID);
      }
      await fetchAvailableResourcesByCategory(category);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableResourcesByCategory = async (cat) => {
    try {
      const res = await ApiClient.getResources({
        resourceType: cat,
        status: 'AVAILABLE',
        limit: 100
      });
      const valid = res.resources || [];
      setAvailableResources(valid);
      if (valid.length > 0) {
        setSelectedResourceID(valid[0].resourceID);
      } else {
        setSelectedResourceID('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResourceID) {
      setErrorMessage('Please select an available resource to allocate.');
      return;
    }
    if (!purpose.trim()) {
      setErrorMessage('Allocation purpose is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessResult(null);

    try {
      const result = await ApiClient.createAllocation({
        resourceID: selectedResourceID,
        departmentID: selectedDeptID,
        patientReference: patientReference.trim() || undefined,
        purpose: purpose.trim(),
        priority,
        quantity: parseInt(quantity, 10) || 1,
        startTime: new Date(startTime).toISOString(),
        expectedEndTime: expectedEndTime ? new Date(expectedEndTime).toISOString() : undefined,
        notes: notes.trim() || undefined
      });

      setSuccessResult(result.allocation);
      setPurpose('');
      setPatientReference('');
      setNotes('');
      fetchAvailableResourcesByCategory(category);
    } catch (err) {
      setErrorMessage(err.message || 'Allocation request was rejected by server business rules.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Checking real-time resource availability matrix..." />;

  const selectedResource = availableResources.find(r => r.resourceID === selectedResourceID);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Enterprise Title Bar */}
      <div className="bg-white px-5 py-4 rounded border border-[#DFE1E6] shadow-card">
        <h1 className="text-lg font-bold text-[#172B4D] tracking-tight">Clinical Resource Allocation Order</h1>
        <p className="text-xs text-[#5E6C84] mt-0.5">
          Order reservation with ACID transactional concurrency locks, double-check availability verification, and tamper-proof audit trails.
        </p>
      </div>

      {/* Success Notification */}
      {successResult && (
        <div className="bg-[#E3FCEF] border border-[#ABF5D1] rounded p-4 shadow-card flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#006644] shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h3 className="font-bold text-[#006644] text-sm">Resource Allocation Committed Successfully</h3>
            <p className="text-[#006644] mt-0.5">
              Record committed to MySQL. Resource status updated to <strong>ALLOCATED</strong>.
            </p>

            <div className="mt-3 p-3 bg-white/90 rounded border border-[#ABF5D1] grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#172B4D] font-mono text-[11px]">
              <div>Allocation ID: <span className="font-bold">{successResult.allocationID}</span></div>
              <div>Resource: <span className="font-bold">{successResult.resource?.resourceName}</span></div>
              <div>Identifier: <span className="font-bold text-[#087F8C]">{successResult.resource?.identifierCode}</span></div>
              <div>Priority: <span className="font-bold">{successResult.priority}</span></div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setSuccessResult(null)}
                className="px-3 py-1.5 bg-[#006644] hover:bg-[#004D34] text-white rounded text-xs font-semibold"
              >
                New Allocation
              </button>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('history')}
                  className="px-3 py-1.5 bg-white hover:bg-[#F4F5F7] text-[#006644] border border-[#ABF5D1] rounded text-xs font-semibold"
                >
                  View in Allocation Ledger
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-[#FFEBE6] border border-[#FFBDAD] rounded p-3.5 shadow-card flex items-start gap-2.5 text-[#BF2600] text-xs">
          <AlertCircle className="w-4 h-4 text-[#DE350B] shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold">Allocation Conflict / Rule Rejection</h4>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Structured Clinical Allocation Form */}
      <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded border border-[#DFE1E6] shadow-card space-y-5 text-xs">
        {/* Step 1: Category Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#172B4D] mb-2">
            1. Select Clinical Classification
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`py-2 px-2.5 rounded border text-xs font-semibold text-center transition-colors cursor-pointer ${
                  category === c.value
                    ? 'border-[#087F8C] bg-[#E6F4F6] text-[#087F8C]'
                    : 'border-[#DFE1E6] bg-white text-[#42526E] hover:bg-[#F4F5F7]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Available Resource Dropdown & Metadata */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#172B4D] mb-2">
            2. Select Available Resource Unit
          </label>

          {availableResources.length === 0 ? (
            <div className="p-3 bg-[#FFFAE6] border border-[#FFE380] rounded text-xs text-[#7A4100] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#FF8B00] shrink-0" />
              <span>No units currently available in this category. Check the Availability Board for maintenance turnaround.</span>
            </div>
          ) : (
            <div className="space-y-2">
              <select
                required
                value={selectedResourceID}
                onChange={(e) => setSelectedResourceID(e.target.value)}
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs font-medium focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              >
                {availableResources.map(r => (
                  <option key={r.resourceID} value={r.resourceID}>
                    {r.resourceName} ({r.identifierCode}) — {r.department?.departmentName} [{r.location}] - Avail: {r.quantityAvailable} of {r.quantityTotal}
                  </option>
                ))}
              </select>

              {selectedResource && (
                <div className="p-2.5 bg-[#F4F5F7] rounded border border-[#DFE1E6] text-[11px] flex flex-wrap gap-4 text-[#5E6C84]">
                  <div>Department: <span className="font-semibold text-[#172B4D]">{selectedResource.department?.departmentName}</span></div>
                  <div>Location: <span className="font-semibold text-[#172B4D]">{selectedResource.location}</span></div>
                  <div>Subtype: <span className="font-semibold text-[#172B4D]">{selectedResource.subType}</span></div>
                  <div>Available: <span className="font-bold text-[#006644]">{selectedResource.quantityAvailable} units</span></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 3: Clinical Purpose, Patient Reference & Schedule */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#172B4D] mb-2">
            3. Patient Order & Scheduling Details
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
                Clinical Purpose *
              </label>
              <input
                type="text"
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Post-operative recovery / Urgent observation"
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
                Patient MRN / Reference ID
              </label>
              <input
                type="text"
                value={patientReference}
                onChange={(e) => setPatientReference(e.target.value)}
                placeholder="e.g. PT-2026-9482 (Fictional Patient)"
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs font-mono focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
                Clinical Department *
              </label>
              <select
                value={selectedDeptID}
                onChange={(e) => setSelectedDeptID(e.target.value)}
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              >
                {departments.map(d => (
                  <option key={d.departmentID} value={d.departmentID}>{d.departmentName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
                Priority Level *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs font-semibold focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              >
                <option value="NORMAL">ROUTINE (Standard Inpatient Schedule)</option>
                <option value="URGENT">URGENT (Time-Critical Admission)</option>
                <option value="EMERGENCY">EMERGENCY (Immediate Trauma Response)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
                Allocation Start Time *
              </label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
                Expected Release Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={expectedEndTime}
                onChange={(e) => setExpectedEndTime(e.target.value)}
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              />
            </div>

            {selectedResource && selectedResource.quantityTotal > 1 && (
              <div>
                <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
                  Quantity Required (Available: {selectedResource.quantityAvailable})
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedResource.quantityAvailable}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
                />
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
                Clinical Handover / Admission Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Include relevant clinical requirements (e.g. continuous monitoring, isolation precautions)..."
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
              />
            </div>
          </div>
        </div>

        {/* Footer Submit */}
        <div className="pt-3 border-t border-[#EBECF0] flex items-center justify-between">
          <div className="text-[11px] text-[#6B778C]">
            Ordering Officer: <span className="font-semibold text-[#172B4D]">{user?.fullName || user?.username}</span> ({user?.role})
          </div>

          <button
            type="submit"
            disabled={submitting || availableResources.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold bg-[#087F8C] hover:bg-[#06636D] text-white shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <span>Validating Availability & Locking...</span>
            ) : (
              <>
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Commit Allocation Order</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
