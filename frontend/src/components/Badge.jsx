import React from 'react';

const STATUS_CONFIGS = {
  // Resource Lifecycle Statuses
  AVAILABLE: {
    label: 'Available',
    classes: 'bg-[#E3FCEF] text-[#006644] border-[#ABF5D1]'
  },
  ALLOCATED: {
    label: 'Allocated',
    classes: 'bg-[#DEEBFF] text-[#0747A6] border-[#B3D4FF]'
  },
  IN_USE: {
    label: 'In Use',
    classes: 'bg-[#EAE6FF] text-[#403294] border-[#C0B6F2]'
  },
  CLEANING_MAINTENANCE: {
    label: 'Cleaning / Maint',
    classes: 'bg-[#FFFAE6] text-[#974F00] border-[#FFE380]'
  },
  OUT_OF_SERVICE: {
    label: 'Out of Service',
    classes: 'bg-[#FFEBE6] text-[#BF2600] border-[#FFBDAD]'
  },
  UNDER_REPAIR: {
    label: 'Under Repair',
    classes: 'bg-[#FFF0B3] text-[#7A4100] border-[#FFE380]'
  },
  RETIRED_DISPOSED: {
    label: 'Retired / Archived',
    classes: 'bg-[#F4F5F7] text-[#5E6C84] border-[#DFE1E6]'
  },

  // Allocation Statuses
  REQUESTED: {
    label: 'Requested',
    classes: 'bg-[#FFFAE6] text-[#974F00] border-[#FFE380]'
  },
  RELEASED: {
    label: 'Released',
    classes: 'bg-[#E6F4F6] text-[#06636D] border-[#B8E2E8]'
  },
  REJECTED: {
    label: 'Rejected',
    classes: 'bg-[#FFEBE6] text-[#BF2600] border-[#FFBDAD]'
  },
  CANCELLED: {
    label: 'Cancelled',
    classes: 'bg-[#F4F5F7] text-[#5E6C84] border-[#DFE1E6]'
  },

  // Clinical Priorities
  NORMAL: {
    label: 'Routine',
    classes: 'bg-[#F4F5F7] text-[#42526E] border-[#DFE1E6]'
  },
  URGENT: {
    label: 'Urgent',
    classes: 'bg-[#FFFAE6] text-[#B76E00] border-[#FFE380] font-semibold'
  },
  EMERGENCY: {
    label: 'EMERGENCY',
    classes: 'bg-[#DE350B] text-white border-[#DE350B] font-bold tracking-wide'
  }
};

export default function Badge({ status, customLabel, size = 'md' }) {
  const config = STATUS_CONFIGS[status] || {
    label: status,
    classes: 'bg-[#F4F5F7] text-[#42526E] border-[#DFE1E6]'
  };

  const sizeClasses = size === 'sm' 
    ? 'px-1.5 py-0.5 text-[10px] leading-tight' 
    : 'px-2 py-0.5 text-[11px] leading-snug';

  return (
    <span className={`inline-flex items-center font-medium rounded border ${sizeClasses} ${config.classes}`}>
      {customLabel || config.label}
    </span>
  );
}
