import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, ShieldCheck, Mail, Building, Key, CheckCircle, Clock } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Identity Card */}
      <div className="bg-white p-5 rounded border border-[#DFE1E6] shadow-card flex items-start justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded bg-[#087F8C] text-white flex items-center justify-center font-bold text-lg shadow-sm">
            {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </div>
          <div>
            <h1 className="text-base font-bold text-[#172B4D]">{user?.fullName || user?.username}</h1>
            <p className="text-xs text-[#5E6C84] font-mono">Institutional ID: @{user?.username}</p>
            <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6F4F6] text-[#087F8C] border border-[#B8E2E8]">
              <ShieldCheck className="w-3 h-3 text-[#087F8C]" />
              <span>{user?.role?.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-flex items-center gap-1 text-[#006644] font-medium bg-[#E3FCEF] px-2 py-0.5 rounded border border-[#ABF5D1] text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00875A]" />
            Session Authenticated
          </span>
        </div>
      </div>

      {/* Access Credentials & Scope */}
      <div className="bg-white p-5 rounded border border-[#DFE1E6] shadow-card space-y-3">
        <h3 className="font-bold text-xs uppercase tracking-wider text-[#172B4D] border-b border-[#EBECF0] pb-2">
          Staff Account Credentials & Assigned Scope
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#F4F5F7] rounded border border-[#DFE1E6] space-y-0.5">
            <span className="text-[#5E6C84] font-bold uppercase text-[10px] flex items-center gap-1">
              <Mail className="w-3 h-3 text-[#6B778C]" />
              Institutional Email
            </span>
            <span className="font-semibold text-[#172B4D] block font-mono">{user?.email}</span>
          </div>

          <div className="p-3 bg-[#F4F5F7] rounded border border-[#DFE1E6] space-y-0.5">
            <span className="text-[#5E6C84] font-bold uppercase text-[10px] flex items-center gap-1">
              <Building className="w-3 h-3 text-[#6B778C]" />
              Departmental Unit
            </span>
            <span className="font-semibold text-[#172B4D] block">
              {user?.department?.departmentName || 'All Hospital Divisions'}
            </span>
          </div>

          <div className="p-3 bg-[#F4F5F7] rounded border border-[#DFE1E6] space-y-0.5">
            <span className="text-[#5E6C84] font-bold uppercase text-[10px] flex items-center gap-1">
              <Key className="w-3 h-3 text-[#6B778C]" />
              Authentication Token
            </span>
            <span className="font-semibold text-[#172B4D] block">
              JWT with Secure HTTP-Only Cookie
            </span>
          </div>

          <div className="p-3 bg-[#F4F5F7] rounded border border-[#DFE1E6] space-y-0.5">
            <span className="text-[#5E6C84] font-bold uppercase text-[10px] flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#6B778C]" />
              Session Policy
            </span>
            <span className="font-semibold text-[#172B4D] block">
              8-Hour Rolling Invalidation
            </span>
          </div>
        </div>
      </div>

      {/* RBAC Integrity Card */}
      <div className="bg-[#E6F4F6] border border-[#B8E2E8] rounded p-4 text-xs text-[#06636D] space-y-1">
        <h4 className="font-bold flex items-center gap-1.5 text-[#06636D] text-xs">
          <CheckCircle className="w-4 h-4 text-[#087F8C]" />
          <span>Server-Side RBAC Enforcement Active</span>
        </h4>
        <p className="text-[11px] leading-relaxed text-[#06636D]">
          Your session token holds cryptographic claims verifying authorization as <strong>{user?.role}</strong>. Every state transition and resource allocation is independently verified against the backend state machine before commitment.
        </p>
      </div>
    </div>
  );
}
