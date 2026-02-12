'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Mail, 
  BarChart3, 
  UserCog, 
  Shield, 
  Settings,
  LogOut,
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Tag,
  UserCheck
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, canAccessResource } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Don't show sidebar on login page or if no user
  if (pathname === '/login' || !user) return null;

  // Check if user has assigned leads (Sales Executive only)
  const userRole = user?.role_name || '';
  const isSalesExecutive = userRole === 'Sales Executive';
  const isMarketing = userRole === 'Marketing';
  // Show "My Assigned Leads" only for Sales Executives (Sales Managers assign leads to others, not themselves)
  const hasAssignedLeads = isSalesExecutive;

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: null },
    { href: '/submissions', label: 'Form Submissions', icon: FileText, permission: 'submissions' },
    // Show "Leads" for all users including Sales Executives (for manually created leads)
    { href: '/leads', label: 'Leads', icon: Users, permission: 'leads' },
    ...(hasAssignedLeads ? [{ href: '/assigned-leads', label: 'My Assigned Leads', icon: UserCheck, permission: null }] : []),
    { href: '/calendar', label: 'Calendar', icon: Calendar, permission: null }, // Accessible to all users
    { href: '/activities', label: 'Activities', icon: Activity, permission: null },
    // Hide Newsletter from Sales Executives and Marketing
    ...(isSalesExecutive || isMarketing ? [] : [{ href: '/newsletter', label: 'Newsletter', icon: Mail, permission: null }]),
    // Hide Reports from Marketing
    ...(isMarketing ? [] : [{ href: '/reports', label: 'Reports', icon: BarChart3, permission: 'reports' }]),
    { href: '/users', label: 'Users', icon: UserCog, permission: 'users' },
    { href: '/roles', label: 'Roles', icon: Shield, permission: 'roles' },
    { href: '/settings', label: 'Settings', icon: Settings, permission: null },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (!item.permission) {
      return true;
    }
    return canAccessResource(item.permission);
  });

  return (
    <aside 
      className="sidebar"
      style={{
        width: collapsed ? '80px' : '260px',
        transition: 'width 0.3s ease',
        position: 'relative',
        background: 'linear-gradient(180deg, #0A2342 0%, #1a3a5a 100%)',
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
      }}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          position: 'absolute',
          top: '16px',
          right: '-14px',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: '#fff',
          border: '2px solid var(--gray-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 1000,
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#1E73FF';
          e.currentTarget.style.borderColor = '#1E73FF';
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#fff';
          e.currentTarget.style.borderColor = 'var(--gray-200)';
          e.currentTarget.style.color = '#333';
        }}
      >
        {collapsed ? <ChevronRight size={16} color="#333" /> : <ChevronLeft size={16} color="#333" />}
      </button>

      {/* Logo */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        marginBottom: '16px'
      }}>
        <div style={{
          fontSize: collapsed ? '18px' : '20px',
          fontWeight: 700,
          color: '#fff',
          textAlign: collapsed ? 'center' : 'left',
          transition: 'all 0.3s ease',
          letterSpacing: '1px',
          lineHeight: '1.2'
        }}>
          {collapsed ? 'S' : 'SPARS CRM'}
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '0 12px' }}>
        {filteredNavItems.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : ''}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? '0' : '12px',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.75)',
                textDecoration: 'none',
                padding: '12px',
                borderRadius: '10px',
                margin: '4px 0',
                background: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
                transition: 'all 0.2s ease',
                justifyContent: collapsed ? 'center' : 'flex-start',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = isActive ? '#fff' : 'rgba(255,255,255,0.75)';
              }}
            >
              <Icon size={20} style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span style={{ fontSize: '14px', whiteSpace: 'nowrap' }}>{item.label}</span>
              )}
              {isActive && !collapsed && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '3px',
                  height: '60%',
                  background: '#1E73FF',
                  borderRadius: '0 3px 3px 0'
                }} />
              )}
            </Link>
          );
        })}
        
        {/* Logout */}
        <div style={{ 
          marginTop: '24px', 
          paddingTop: '24px', 
          borderTop: '1px solid rgba(255,255,255,0.1)' 
        }}>
          <button
            onClick={logout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? '0' : '12px',
              color: 'rgba(255,255,255,0.75)',
              background: 'none',
              border: 'none',
              padding: '12px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease',
              justifyContent: collapsed ? 'center' : 'flex-start'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
            }}
            title={collapsed ? 'Logout' : ''}
          >
            <LogOut size={20} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </nav>

      {/* Quick Stats (when not collapsed) */}
      {!collapsed && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '16px',
          right: '16px',
          padding: '16px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
            Quick Stats
          </div>
          <div style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>
            {user?.role_name || 'User'}
          </div>
        </div>
      )}
    </aside>
  );
}

