import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import AdminDashboard from './pages/AdminDashboard';
import ReceptionDashboard from './pages/ReceptionDashboard';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import SysadminDashboard from './pages/SysadminDashboard';
import ResourcesPage from './pages/ResourcesPage';
import AvailabilityPage from './pages/AvailabilityPage';
import AllocationPage from './pages/AllocationPage';
import AllocationHistoryPage from './pages/AllocationHistoryPage';
import EmergencyAmbulancePage from './pages/EmergencyAmbulancePage';
import ReportsPage from './pages/ReportsPage';
import UserManagementPage from './pages/UserManagementPage';
import AuditLogsPage from './pages/AuditLogsPage';
import DepartmentManagementPage from './pages/DepartmentManagementPage';
import ProfilePage from './pages/ProfilePage';
import LoadingSpinner from './components/LoadingSpinner';
import { ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';

const VALID_ROLES = [
  'HOSPITAL_ADMINISTRATOR',
  'RECEPTION_STAFF',
  'DEPARTMENT_COORDINATOR',
  'SYSTEM_ADMINISTRATOR'
];

function AccessDeniedView({ message, onBack, onLogout }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded bg-[#FFEBE6] border border-[#FFBDAD] flex items-center justify-center text-[#BF2600] mb-4">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h2 className="text-base font-bold text-[#172B4D] mb-1">Access Denied</h2>
      <p className="text-xs text-[#5E6C84] max-w-md mb-6">{message}</p>
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded bg-[#087F8C] text-white hover:bg-[#06636D] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </button>
        )}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded border border-[#DFE1E6] text-[#172B4D] bg-white hover:bg-[#FAFBFC] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-[#5E6C84]" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  if (loading) {
    return <LoadingSpinner message="Checking secure hospital authentication..." fullScreen />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Security Check: Validate role against allowed roles
  if (!user?.role || !VALID_ROLES.includes(user.role)) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex flex-col items-center justify-center p-4">
        <AccessDeniedView
          message={`Your account role '${user?.role || 'UNASSIGNED'}' is unauthorized or invalid for clinical resource operations. Please contact the System Administrator.`}
          onLogout={logout}
        />
      </div>
    );
  }

  // Render Role-specific Dashboard
  const renderDashboardByRole = () => {
    switch (user.role) {
      case 'HOSPITAL_ADMINISTRATOR':
        return <AdminDashboard onNavigate={setCurrentView} />;
      case 'RECEPTION_STAFF':
        return <ReceptionDashboard onNavigate={setCurrentView} />;
      case 'DEPARTMENT_COORDINATOR':
        return <CoordinatorDashboard onNavigate={setCurrentView} />;
      case 'SYSTEM_ADMINISTRATOR':
        return <SysadminDashboard onNavigate={setCurrentView} />;
      default:
        // Never fallback to AdminDashboard
        return (
          <AccessDeniedView
            message="No dashboard available for this account."
            onLogout={logout}
          />
        );
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboardByRole();
      case 'availability':
        return <AvailabilityPage onNavigate={setCurrentView} />;
      case 'resources':
        return <ResourcesPage />;
      case 'allocation':
        return <AllocationPage onNavigate={setCurrentView} />;
      case 'emergency-ambulance':
        return <EmergencyAmbulancePage onNavigate={setCurrentView} />;
      case 'history':
        return <AllocationHistoryPage />;
      case 'reports':
        if (!['HOSPITAL_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'].includes(user.role)) {
          return (
            <AccessDeniedView
              message="Access restricted: Resource utilization reports require Hospital Administrator or System Administrator authorization."
              onBack={() => setCurrentView('dashboard')}
            />
          );
        }
        return <ReportsPage />;
      case 'users':
        if (user.role !== 'SYSTEM_ADMINISTRATOR') {
          return (
            <AccessDeniedView
              message="Access restricted: User management and role assignment requires System Administrator authorization."
              onBack={() => setCurrentView('dashboard')}
            />
          );
        }
        return <UserManagementPage />;
      case 'departments':
        return <DepartmentManagementPage />;
      case 'audit-logs':
        if (user.role !== 'SYSTEM_ADMINISTRATOR') {
          return (
            <AccessDeniedView
              message="Access restricted: Tamper-proof audit logs require System Administrator authorization."
              onBack={() => setCurrentView('dashboard')}
            />
          );
        }
        return <AuditLogsPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return renderDashboardByRole();
    }
  };

  return (
    <DashboardLayout currentView={currentView} onViewChange={setCurrentView}>
      {renderContent()}
    </DashboardLayout>
  );
}
