import React, { useState, useEffect } from 'react';
import ApiClient from '../services/api';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { FolderTree, Plus, Users, Bed, RefreshCw } from 'lucide-react';

export default function DepartmentManagementPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ departmentName: '', code: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getDepartments();
      setDepartments(res.departments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await ApiClient.createDepartment(formData);
      setIsCreateOpen(false);
      setFormData({ departmentName: '', code: '', description: '' });
      fetchDepartments();
    } catch (err) {
      setError(err.message || 'Failed to create department.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading hospital organizational units..." />;

  return (
    <div className="space-y-4">
      <div className="bg-white px-5 py-4 rounded border border-[#DFE1E6] shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#172B4D] tracking-tight">Clinical Departments & Facilities</h1>
          <p className="text-xs text-[#5E6C84] mt-0.5">
            Operational divisions, intensive care units, surgical suites, and inpatient wards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setError(null);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-[#087F8C] hover:bg-[#06636D] text-white shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Department</span>
          </button>
          <button
            onClick={fetchDepartments}
            title="Refresh database records"
            className="p-1.5 rounded bg-white hover:bg-[#F4F5F7] text-[#5E6C84] border border-[#DFE1E6] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {departments.map((d) => (
          <div key={d.departmentID} className="bg-white p-4 rounded border border-[#DFE1E6] shadow-card hover:shadow-card-hover transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#EBECF0] text-[#172B4D] uppercase">
                    {d.code}
                  </span>
                  <h3 className="text-sm font-bold text-[#172B4D] mt-1">{d.departmentName}</h3>
                </div>
                <div className="p-2 bg-[#E6F4F6] text-[#087F8C] rounded">
                  <FolderTree className="w-4 h-4" />
                </div>
              </div>

              <p className="text-xs text-[#5E6C84] mt-2 line-clamp-2">
                {d.description || 'No division description recorded.'}
              </p>
            </div>

            <div className="pt-2.5 mt-3 border-t border-[#EBECF0] flex items-center justify-between text-xs text-[#5E6C84] font-medium font-mono">
              <span className="flex items-center gap-1">
                <Bed className="w-3.5 h-3.5 text-[#087F8C]" />
                <span>{d._count?.resources || 0} Assets</span>
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#0052CC]" />
                <span>{d._count?.users || 0} Staff</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Clinical Department">
        <form onSubmit={handleCreate} className="space-y-3 text-xs">
          {error && <div className="p-2.5 bg-[#FFEBE6] border border-[#FFBDAD] text-[#BF2600] rounded">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Department Name *</label>
            <input
              type="text"
              required
              value={formData.departmentName}
              onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
              placeholder="e.g. Oncology & Chemotherapy Suite"
              className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Code / Prefix *</label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
              placeholder="e.g. ONCOLOGY"
              className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs font-mono focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Clinical scope, inpatient bed allocation, and primary care function..."
              className="w-full p-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] text-[#172B4D]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EBECF0]">
            <button type="button" onClick={() => setIsCreateOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-[#5E6C84] hover:bg-[#F4F5F7] rounded">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-1.5 text-xs font-bold bg-[#087F8C] hover:bg-[#06636D] text-white rounded shadow-sm transition-colors">
              {submitting ? 'Creating...' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
