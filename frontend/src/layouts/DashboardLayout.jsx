import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Bed,
  CalendarCheck,
  ClipboardList,
  FileBarChart2,
  FolderTree,
  HeartPulse,
  Home,
  LogOut,
  Menu,
  ShieldCheck,
  Siren,
  User,
  Users,
  X,
  Clock,
  Building2,
  ChevronRight
} from 'lucide-react';

export default function DashboardLayout({ currentView, onViewChange, children }) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const role = user?.role;

  // Grouped Navigation for Production Healthcare Software
  const getNavSections = () => {
    const clinicalOps = [
      { id: 'dashboard', label: 'Operations Dashboard', icon: Home, roles: ['HOSPITAL_ADMINISTRATOR', 'RECEPTION_STAFF', 'DEPARTMENT_COORDINATOR', 'SYSTEM_ADMINISTRATOR'] },
      { id: 'availability', label: 'Availability Board', icon: Activity, roles: ['HOSPITAL_ADMINISTRATOR', 'RECEPTION_STAFF', 'DEPARTMENT_COORDINATOR'] },
      { id: 'allocation', label: 'Resource Allocation', icon: CalendarCheck, roles: ['HOSPITAL_ADMINISTRATOR', 'RECEPTION_STAFF'] },
      { id: 'emergency-ambulance', label: 'Emergency Ambulance', icon: Siren, roles: ['RECEPTION_STAFF', 'HOSPITAL_ADMINISTRATOR'], alert: true },
      { id: 'history', label: 'Allocation History', icon: ClipboardList, roles: ['HOSPITAL_ADMINISTRATOR', 'RECEPTION_STAFF'] },
    ].filter(item => item.roles.includes(role));

    const facilityMgmt = [
      { id: 'resources', label: 'Resource Inventory', icon: Bed, roles: ['HOSPITAL_ADMINISTRATOR', 'DEPARTMENT_COORDINATOR'] },
      { id: 'departments', label: 'Clinical Departments', icon: FolderTree, roles: ['SYSTEM_ADMINISTRATOR', 'HOSPITAL_ADMINISTRATOR'] },
      { id: 'reports', label: 'Utilization Reports', icon: FileBarChart2, roles: ['HOSPITAL_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'] },
    ].filter(item => item.roles.includes(role));

    const governance = [
      { id: 'users', label: 'Staff Accounts', icon: Users, roles: ['SYSTEM_ADMINISTRATOR'] },
      { id: 'audit-logs', label: 'Audit Trail', icon: ShieldCheck, roles: ['SYSTEM_ADMINISTRATOR'] },
      { id: 'profile', label: 'My Session & Role', icon: User, roles: ['HOSPITAL_ADMINISTRATOR', 'RECEPTION_STAFF', 'DEPARTMENT_COORDINATOR', 'SYSTEM_ADMINISTRATOR'] }
    ].filter(item => item.roles.includes(role));

    return [
      { title: 'Clinical Operations', items: clinicalOps },
      { title: 'Facility Management', items: facilityMgmt },
      { title: 'System Governance', items: governance }
    ].filter(sec => sec.items.length > 0);
  };

  const navSections = getNavSections();

  const getRoleDisplayName = (r) => {
    switch (r) {
      case 'HOSPITAL_ADMINISTRATOR': return 'Hospital Administrator';
      case 'RECEPTION_STAFF': return 'Reception & Triage';
      case 'DEPARTMENT_COORDINATOR': return 'Department Coordinator';
      case 'SYSTEM_ADMINISTRATOR': return 'System Administrator';
      default: return r;
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex flex-col text-[#172B4D]">
      {/* Enterprise Top Banner / Hospital Status Bar */}
      <header className="sticky top-0 z-40 bg-[#172B4D] text-white border-b border-[#091E42] shadow-sm">
        <div className="px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Left: Branding & Campus */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded text-[#C1C7D0] hover:text-white hover:bg-[#253858]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-[#087F8C] flex items-center justify-center text-white font-bold text-base shadow-sm">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm tracking-tight text-white">MediCore</span>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 bg-[#253858] text-[#97A0AF] rounded border border-[#344563]">
                    RMS Enterprise
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#A5ADBA]">
                  <Building2 className="w-3 h-3 text-[#087F8C]" />
                  <span>MetroHealth Central Hospital • Main Campus</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Operational Telemetry & Active User Identity */}
          <div className="flex items-center gap-4 sm:gap-6 text-xs">
            {/* Live Clock & Status */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-[#091E42]/80 border border-[#253858] text-[#DFE1E6] font-mono text-[11px]">
              <div className="w-2 h-2 rounded-full bg-[#00875A]" />
              <span className="text-[#A5ADBA]">OPS STATUS: NORMAL</span>
              <span className="text-[#6B778C]">|</span>
              <span className="text-white font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#087F8C]" />
                {currentTime}
              </span>
            </div>

            {/* Quick Emergency Ambulance Button */}
            {['RECEPTION_STAFF', 'HOSPITAL_ADMINISTRATOR'].includes(role) && (
              <button
                onClick={() => onViewChange('emergency-ambulance')}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold bg-[#DE350B] hover:bg-[#BF2600] text-white transition-colors cursor-pointer"
              >
                <Siren className="w-3.5 h-3.5" />
                <span>Ambulance Callout</span>
              </button>
            )}

            {/* User Profile Info */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right leading-tight">
                <span className="font-semibold text-white text-xs">{user?.fullName || user?.username}</span>
                <span className="text-[11px] text-[#087F8C] font-medium">{getRoleDisplayName(user?.role)}</span>
              </div>

              <div className="h-6 w-px bg-[#253858] hidden sm:block" />

              <button
                onClick={logout}
                title="Sign out of hospital terminal"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-[#C1C7D0] hover:text-white hover:bg-[#253858] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Enterprise Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-60 bg-white border-r border-[#DFE1E6] py-4 px-3 shrink-0">
          {/* Active Context Banner */}
          <div className="px-2 pb-3 mb-2 border-b border-[#EBECF0]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B778C]">Active Workspace</p>
            <div className="mt-1 flex items-center justify-between">
              <div className="truncate">
                <p className="text-xs font-bold text-[#172B4D] truncate">{getRoleDisplayName(user?.role)}</p>
                {user?.department && (
                  <p className="text-[11px] text-[#087F8C] font-medium truncate">{user.department.departmentName}</p>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Items Grouped */}
          <nav className="flex-1 space-y-4 overflow-y-auto">
            {navSections.map((sec, i) => (
              <div key={sec.title || i}>
                <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-[#6B778C]">
                  {sec.title}
                </p>
                <div className="space-y-0.5">
                  {sec.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onViewChange(item.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#E6F4F6] text-[#087F8C] font-semibold border-l-3 border-[#087F8C]'
                            : 'text-[#42526E] hover:bg-[#F4F5F7] hover:text-[#172B4D]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#087F8C]' : 'text-[#6B778C]'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.alert && (
                          <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-[#FFEBE6] text-[#DE350B] border border-[#FFBDAD]">
                            SOS
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer Security Badge */}
          <div className="pt-3 border-t border-[#EBECF0] text-[10px] text-[#6B778C] flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#00875A]" />
              <span>HIPAA Audit Active</span>
            </span>
            <span className="font-mono text-[#7A869A]">v1.4</span>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="fixed inset-0 bg-[#091E42]/60" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative w-64 max-w-[80vw] bg-white h-full shadow-modal flex flex-col p-4 z-10">
              <div className="flex items-center justify-between pb-3 border-b border-[#EBECF0] mb-3">
                <span className="font-bold text-sm text-[#172B4D]">Navigation Portal</span>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded text-[#6B778C] hover:bg-[#F4F5F7]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 space-y-4 overflow-y-auto">
                {navSections.map((sec, i) => (
                  <div key={sec.title || i}>
                    <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-wider text-[#6B778C]">
                      {sec.title}
                    </p>
                    <div className="space-y-0.5">
                      {sec.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              onViewChange(item.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-xs font-medium ${
                              isActive
                                ? 'bg-[#E6F4F6] text-[#087F8C] font-semibold border-l-3 border-[#087F8C]'
                                : 'text-[#42526E] hover:bg-[#F4F5F7]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <Icon className={`w-4 h-4 ${isActive ? 'text-[#087F8C]' : 'text-[#6B778C]'}`} />
                              <span>{item.label}</span>
                            </div>
                            {item.alert && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[#FFEBE6] text-[#DE350B]">
                                SOS
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Content Workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
