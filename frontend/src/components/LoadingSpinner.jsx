import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading hospital operations data...', fullScreen = false }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-[#F4F5F7]/80 backdrop-blur-xs z-50 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center p-6 bg-white rounded border border-[#DFE1E6] shadow-card max-w-sm text-center">
          <Loader2 className="w-8 h-8 text-[#087F8C] animate-spin mb-3" />
          <h4 className="font-bold text-sm text-[#172B4D]">MediCore Operations</h4>
          <p className="text-xs text-[#5E6C84] mt-1">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Loader2 className="w-6 h-6 text-[#087F8C] animate-spin mb-2" />
      <p className="text-xs text-[#5E6C84] font-medium">{message}</p>
    </div>
  );
}
