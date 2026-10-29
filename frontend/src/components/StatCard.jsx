import React from 'react';

export default function StatCard({ title, value, subtext, icon: Icon, color = 'teal', trend }) {
  const accentBorder = {
    teal: 'border-l-4 border-l-[#087F8C]',
    navy: 'border-l-4 border-l-[#172B4D]',
    green: 'border-l-4 border-l-[#00875A]',
    amber: 'border-l-4 border-l-[#FF8B00]',
    red: 'border-l-4 border-l-[#DE350B]',
    blue: 'border-l-4 border-l-[#0052CC]'
  };

  const iconColors = {
    teal: 'text-[#087F8C] bg-[#E6F4F6]',
    navy: 'text-[#172B4D] bg-[#EBECF0]',
    green: 'text-[#00875A] bg-[#E3FCEF]',
    amber: 'text-[#B76E00] bg-[#FFFAE6]',
    red: 'text-[#DE350B] bg-[#FFEBE6]',
    blue: 'text-[#0052CC] bg-[#DEEBFF]'
  };

  return (
    <div className={`bg-white rounded border border-[#DFE1E6] p-4 shadow-card hover:shadow-card-hover transition-shadow ${accentBorder[color] || ''}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-[#5E6C84] uppercase tracking-wider truncate">
            {title}
          </p>
          <div className="text-2xl font-bold text-[#172B4D] tracking-tight mt-1 font-mono">
            {value}
          </div>
          {subtext && (
            <p className="text-[11px] text-[#6B778C] mt-1 truncate">
              {subtext}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-2 rounded shrink-0 ${iconColors[color] || 'text-[#42526E] bg-[#F4F5F7]'}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-2.5 pt-2 border-t border-[#EBECF0] text-[11px] text-[#5E6C84] flex items-center justify-between">
          {trend}
        </div>
      )}
    </div>
  );
}
