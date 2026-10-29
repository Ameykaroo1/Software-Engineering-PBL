import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, Building2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      setError('Please provide staff username/email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(usernameOrEmail, password);
    } catch (err) {
      setError(err.message || 'Invalid institutional credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8 text-[#172B4D]">
      {/* Institutional Top Header */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between pb-6 border-b border-[#DFE1E6]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded bg-[#087F8C] flex items-center justify-center text-white shadow-sm">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-[#172B4D]">MediCore Healthcare</span>
            <span className="text-xs text-[#5E6C84] block font-medium">Resource Allocation & Clinical Operations Terminal</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#5E6C84]">
          <Building2 className="w-4 h-4 text-[#087F8C]" />
          <span>MetroHealth System • Secure Portal</span>
        </div>
      </div>

      {/* Main Authentication Box */}
      <div className="my-auto sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 sm:px-8 border border-[#DFE1E6] rounded shadow-card">
          <div className="mb-5 pb-4 border-b border-[#EBECF0]">
            <h2 className="text-base font-bold text-[#172B4D]">Authorized Personnel Sign In</h2>
            <p className="text-xs text-[#5E6C84] mt-0.5">
              Enter your assigned institutional credentials to access clinical resource workflows.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded bg-[#FFEBE6] border border-[#FFBDAD] text-[#BF2600] flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
                Staff ID or Institutional Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B778C]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  placeholder="e.g. admin or reception@medicore.hospital"
                  className="block w-full pl-9 pr-3 py-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] focus:ring-1 focus:ring-[#087F8C] text-[#172B4D] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#172B4D] uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B778C]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-9 py-2 bg-white border border-[#DFE1E6] rounded text-xs focus:outline-none focus:border-[#087F8C] focus:ring-1 focus:ring-[#087F8C] text-[#172B4D] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6B778C] hover:text-[#172B4D]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded text-xs font-bold text-white bg-[#087F8C] hover:bg-[#06636D] focus:outline-none focus:ring-2 focus:ring-[#087F8C] disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating Session...
                  </span>
                ) : (
                  <>
                    <span>Sign In to System</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security / HIPAA Notice */}
        <p className="mt-4 text-center text-[11px] text-[#6B778C]">
          Hospital Network Notice: All access attempts, allocations, and transitions are recorded in accordance with institutional security guidelines.
        </p>
      </div>

      {/* Footer */}
      <div className="w-full max-w-4xl mx-auto pt-4 border-t border-[#DFE1E6] text-center text-[11px] text-[#7A869A] flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>MediCore RMS • Enterprise Healthcare Operations v1.4</span>
        <span>ACID Concurrency Locking • 100% Relational Audit Trail</span>
      </div>
    </div>
  );
}
