import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ApiClient from '../services/api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  Siren,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  MapPin,
  ShieldAlert,
  Flame,
  Truck
} from 'lucide-react';

export default function EmergencyAmbulancePage({ onNavigate }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fleet, setFleet] = useState([]);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);

  // Form State
  const [emergencyPurpose, setEmergencyPurpose] = useState('');
  const [patientReference, setPatientReference] = useState('');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successResult, setSuccessResult] = useState(null);

  const canDispatch = ['RECEPTION_STAFF', 'HOSPITAL_ADMINISTRATOR'].includes(user?.role);

  useEffect(() => {
    fetchFleet();
  }, []);

  const fetchFleet = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getAmbulanceFleet();
      setFleet(res.fleet || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!selectedAmbulance) return;
    if (!emergencyPurpose.trim()) {
      setErrorMessage('Emergency purpose / incident description is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await ApiClient.allocateEmergencyAmbulance(selectedAmbulance.resourceID, {
        emergencyPurpose: emergencyPurpose.trim(),
        patientReference: patientReference.trim() || undefined,
        notes: dispatchNotes.trim() || undefined
      });

      setSuccessResult(result.allocation);
      setSelectedAmbulance(null);
      setEmergencyPurpose('');
      setPatientReference('');
      setDispatchNotes('');
      fetchFleet();
    } catch (err) {
      setErrorMessage(err.message || 'Emergency allocation failed. Unit may have been assigned by another staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Checking emergency ambulance telemetry and readiness..." />;

  const availableUnits = fleet.filter(a => a.status === 'AVAILABLE');
  const activeDispatches = fleet.filter(a => ['ALLOCATED', 'IN_USE'].includes(a.status));

  return (
    <div className="space-y-4">
      {/* Hospital Emergency Operations Header */}
      <div className="bg-white px-5 py-4 rounded border border-[#DFE1E6] shadow-card border-l-4 border-l-[#DE350B] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFEBE6] text-[#BF2600] border border-[#FFBDAD]">
              <Siren className="w-3.5 h-3.5" />
              EMERGENCY FLEET BOARD
            </span>
            <span className="text-xs text-[#5E6C84]">• Priority 1 Dispatch</span>
          </div>
          <h1 className="text-lg font-bold text-[#172B4D] tracking-tight mt-1">
            Emergency Ambulance Fleet & Dispatch
          </h1>
          <p className="text-xs text-[#5E6C84] mt-0.5">
            Atomic allocation of advanced and basic life-support ambulances. Prevents overlapping dispatches with database locks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded bg-[#FAFBFC] border border-[#DFE1E6] text-right">
            <span className="block text-base font-bold font-mono text-[#006644] leading-tight">{availableUnits.length}</span>
            <span className="text-[10px] uppercase font-bold text-[#5E6C84]">Standby Ready</span>
          </div>
          <div className="px-3 py-1.5 rounded bg-[#FAFBFC] border border-[#DFE1E6] text-right">
            <span className="block text-base font-bold font-mono text-[#B76E00] leading-tight">{activeDispatches.length}</span>
            <span className="text-[10px] uppercase font-bold text-[#5E6C84]">On Callout</span>
          </div>
          <button
            onClick={fetchFleet}
            title="Refresh fleet telemetry"
            className="p-2 rounded bg-white hover:bg-[#F4F5F7] text-[#5E6C84] border border-[#DFE1E6] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successResult && (
        <div className="bg-[#E3FCEF] border border-[#ABF5D1] rounded p-4 shadow-card flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#006644] shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <h3 className="font-bold text-[#006644] text-sm">Emergency Ambulance Allocation Committed</h3>
            <p className="text-[#006644] mt-0.5">
              Unit marked as <strong>ALLOCATED</strong>. Allocation ID: <span className="font-mono font-bold">{successResult.allocationID}</span>.
            </p>
            <p className="text-[11px] text-[#5E6C84] mt-1">
              * Operational Note: Application records and tracks allocation integrity; actual vehicle dispatch follows institutional field protocols.
            </p>
            <button
              onClick={() => setSuccessResult(null)}
              className="mt-2.5 px-3 py-1 text-xs font-semibold bg-[#006644] text-white rounded hover:bg-[#004D34]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Available Standby Fleet Grid */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">Available Standby Units</h2>
          <span className="text-xs font-mono text-[#5E6C84]">{availableUnits.length} vehicles cleared</span>
        </div>

        {availableUnits.length === 0 ? (
          <div className="bg-[#FFFAE6] border border-[#FFE380] p-6 rounded text-center">
            <AlertTriangle className="w-6 h-6 text-[#FF8B00] mx-auto mb-1.5" />
            <h3 className="font-bold text-xs text-[#7A4100]">All Hospital Ambulances Are Currently Allocated or In Service</h3>
            <p className="text-[11px] text-[#7A4100] mt-0.5">
              Review active callouts below or coordinate with mutual-aid hospital networks.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {availableUnits.map((amb) => {
              let specs = {};
              try {
                specs = typeof amb.specifications === 'string' ? JSON.parse(amb.specifications) : amb.specifications || {};
              } catch (e) {}

              return (
                <div
                  key={amb.resourceID}
                  className="bg-white rounded border border-[#DFE1E6] p-4 shadow-card hover:shadow-card-hover transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-[#087F8C] px-1.5 py-0.2 rounded bg-[#E6F4F6] border border-[#B8E2E8]">
                          {amb.identifierCode}
                        </span>
                        <h4 className="font-bold text-sm text-[#172B4D] mt-1.5">{amb.resourceName}</h4>
                        <p className="text-[11px] text-[#5E6C84]">{amb.subType}</p>
                      </div>
                      <Badge status={amb.status} size="sm" />
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#EBECF0] space-y-1 text-xs text-[#5E6C84]">
                      <div className="flex justify-between">
                        <span>License Plate:</span>
                        <span className="font-mono font-bold text-[#172B4D]">{specs.vehiclePlate || 'MH-01-EQ-REG'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Assigned Crew:</span>
                        <span className="font-medium text-[#172B4D]">{specs.crew || 'Paramedic + EMT Driver'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bay Station:</span>
                        <span className="font-medium text-[#172B4D]">{amb.location}</span>
                      </div>
                    </div>
                  </div>

                  {canDispatch && (
                    <div className="mt-3 pt-2.5 border-t border-[#EBECF0]">
                      <button
                        onClick={() => {
                          setSelectedAmbulance(amb);
                          setErrorMessage(null);
                        }}
                        className="w-full py-2 px-3 rounded text-xs font-bold bg-[#DE350B] hover:bg-[#BF2600] text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                      >
                        <Siren className="w-3.5 h-3.5" />
                        <span>Allocate Unit in Emergency</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Callouts & Fleet Table */}
      <div className="bg-white rounded border border-[#DFE1E6] shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-[#DFE1E6] bg-[#FAFBFC]">
          <h3 className="font-bold text-xs text-[#172B4D] uppercase tracking-wider">Active Deployments & Maintenance Units</h3>
          <p className="text-[11px] text-[#5E6C84]">Ambulances currently committed or undergoing mechanical repair</p>
        </div>

        <div className="divide-y divide-[#EBECF0] text-xs">
          {fleet.filter(a => a.status !== 'AVAILABLE').map((amb) => (
            <div key={amb.resourceID} className="p-3 sm:px-5 flex items-center justify-between hover:bg-[#F4F5F7]">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#172B4D]">{amb.resourceName}</span>
                  <span className="font-mono text-[10px] text-[#087F8C]">[{amb.identifierCode}]</span>
                  <Badge status={amb.status} size="sm" />
                </div>
                <div className="text-[11px] text-[#5E6C84]">
                  {amb.allocations && amb.allocations[0] ? (
                    <span>
                      Incident: <strong className="text-[#172B4D]">{amb.allocations[0].purpose}</strong> (Authorizing Officer: {amb.allocations[0].user?.fullName})
                    </span>
                  ) : (
                    <span>Maintenance: Under scheduled vehicle service / repair</span>
                  )}
                </div>
              </div>

              <div>
                {amb.allocations && amb.allocations[0] && onNavigate && (
                  <button
                    onClick={() => onNavigate('history')}
                    className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[#F4F5F7] hover:bg-[#EBECF0] text-[#172B4D] border border-[#DFE1E6] transition-colors"
                  >
                    View Record
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Allocation Modal */}
      {selectedAmbulance && (
        <Modal
          isOpen={!!selectedAmbulance}
          onClose={() => setSelectedAmbulance(null)}
          title={`Emergency Dispatch Order: ${selectedAmbulance.resourceName}`}
        >
          <form onSubmit={handleDispatch} className="space-y-3 text-xs">
            <div className="p-3 bg-[#FFEBE6] border border-[#FFBDAD] rounded text-[#BF2600] space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-xs">
                <Flame className="w-3.5 h-3.5 text-[#DE350B]" />
                <span>CLINICAL PRIORITY: EMERGENCY CALLOUT</span>
              </div>
              <div className="text-[11px]">Unit: <span className="font-mono font-bold text-[#172B4D]">{selectedAmbulance.identifierCode}</span> ({selectedAmbulance.subType})</div>
              <div className="text-[11px]">Dispatching Officer: <span className="font-semibold text-[#172B4D]">{user?.fullName || user?.username}</span> ({user?.role})</div>
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-[#FFEBE6] border border-[#FFBDAD] text-[#BF2600] rounded">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
                Emergency Incident / Nature of Callout *
              </label>
              <textarea
                required
                rows={2}
                value={emergencyPurpose}
                onChange={(e) => setEmergencyPurpose(e.target.value)}
                placeholder="e.g. Major trauma collision on Highway 101; severe respiratory distress callout..."
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#DE350B] text-[#172B4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
                Dispatch Reference / Case Number
              </label>
              <input
                type="text"
                value={patientReference}
                onChange={(e) => setPatientReference(e.target.value)}
                placeholder="e.g. CAD-2026-8921"
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs font-mono focus:outline-none focus:border-[#DE350B] text-[#172B4D]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
                Paramedic & Equipment Instructions
              </label>
              <input
                type="text"
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="e.g. ALS Life Support Pack, portable ventilator dock, telemetry en-route"
                className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#DE350B] text-[#172B4D]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBECF0]">
              <button
                type="button"
                onClick={() => setSelectedAmbulance(null)}
                className="px-3 py-1.5 text-xs font-semibold text-[#5E6C84] hover:bg-[#F4F5F7] rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 text-xs font-bold bg-[#DE350B] hover:bg-[#BF2600] text-white rounded shadow-sm transition-colors disabled:opacity-50"
              >
                {submitting ? 'Verifying & Allocating...' : 'Confirm Emergency Allocation'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
