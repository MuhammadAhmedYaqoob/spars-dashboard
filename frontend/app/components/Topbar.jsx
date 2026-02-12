'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { Search, User, Bell, LogOut, Settings, ChevronDown, X, HelpCircle } from 'lucide-react';
import { apiGet } from '@/utils/api';
import toast from 'react-hot-toast';

export default function Topbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activityCount, setActivityCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch recent activities
    const fetchActivities = async () => {
      try {
        const activities = await apiGet('/activities?limit=10');
        setRecentActivities(activities || []);
        setActivityCount(activities?.length || 0);
      } catch (error) {
        // Try alternative endpoint
        try {
          const activities = await apiGet('/activities/recent?limit=10');
          setRecentActivities(activities || []);
          setActivityCount(activities?.length || 0);
        } catch (e) {
          console.warn('Failed to fetch activities:', e);
          setRecentActivities([]);
          setActivityCount(0);
        }
      }
    };
    
    if (user) {
      fetchActivities();
      const interval = setInterval(fetchActivities, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [user]);

  // Don't show topbar on login page (after all hooks)
  if (pathname === '/login') return null;

  const handleLogout = () => {
    logout();
    router.push('/login');
    toast.success('Logged out successfully');
  };

  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    if (paths.length === 0) return [{ label: 'Dashboard', path: '/dashboard' }];
    
    const breadcrumbs = [{ label: 'Dashboard', path: '/dashboard' }];
    let currentPath = '';
    
    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      const label = path
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      breadcrumbs.push({ label, path: currentPath });
    });
    
    return breadcrumbs;
  };

  const getRoleBadgeColor = (roleName) => {
    switch (roleName) {
      case 'Super Admin':
        return { bg: '#EA5455', text: '#fff' };
      case 'Sales Manager':
        return { bg: '#1E73FF', text: '#fff' };
      case 'Marketing User':
        return { bg: '#28C76F', text: '#fff' };
      case 'Read-Only User':
        return { bg: '#FF9F43', text: '#fff' };
      default:
        return { bg: '#666', text: '#fff' };
    }
  };

  const roleColor = user?.role_name ? getRoleBadgeColor(user.role_name) : { bg: '#666', text: '#fff' };

  return (
    <div className="topbar" style={{
      background: '#fff',
      borderBottom: '1px solid var(--gray-200)',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Logo and Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 14px',
          borderRadius: '10px',
          background: 'linear-gradient(180deg, #0A2342 0%, #1a3a5a 100%)',
          boxShadow: '0 2px 8px rgba(10, 35, 66, 0.2)',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(10, 35, 66, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(10, 35, 66, 0.2)';
        }}
        onClick={() => router.push('/dashboard')}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '16px',
            color: '#fff',
            flexShrink: 0
          }}>
            S
          </div>
          <div style={{
            color: '#fff',
            fontWeight: 700,
            fontSize: '16px',
            letterSpacing: '0.3px',
            whiteSpace: 'nowrap'
          }}>
            SPARS CRM
          </div>
        </div>
        
        {/* Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          {getBreadcrumbs().map((crumb, index, array) => (
            <div key={crumb.path} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {index > 0 && <span style={{ color: '#999' }}>/</span>}
              <span
                style={{
                  color: index === array.length - 1 ? '#333' : '#666',
                  fontWeight: index === array.length - 1 ? 600 : 400,
                  cursor: index < array.length - 1 ? 'pointer' : 'default'
                }}
                onClick={() => index < array.length - 1 && router.push(crumb.path)}
              >
                {crumb.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ 
        position: 'relative', 
        flex: 1, 
        maxWidth: '400px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Search size={18} style={{ 
          position: 'absolute', 
          left: '14px', 
          color: '#999',
          pointerEvents: 'none',
          zIndex: 1
        }} />
        <input 
          type="text"
          placeholder="Search leads, users, submissions... (Ctrl+K)" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchQuery.trim()) {
              // Navigate to activities page with search query
              router.push(`/activities?search=${encodeURIComponent(searchQuery)}`);
            }
            if (e.key === 'Escape') {
              setSearchQuery('');
            }
          }}
          style={{ 
            paddingLeft: '44px', 
            paddingRight: searchQuery ? '40px' : '12px',
            width: '100%',
            border: '1px solid var(--gray-200)',
            borderRadius: '8px',
            paddingTop: '10px',
            paddingBottom: '10px',
            fontSize: '14px',
            background: '#f8f9fa',
            transition: 'all 0.2s ease'
          }}
          onFocus={(e) => {
            e.target.style.background = '#fff';
            e.target.style.borderColor = '#1E73FF';
            e.target.style.boxShadow = '0 0 0 3px rgba(30, 115, 255, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.background = '#f8f9fa';
            e.target.style.borderColor = 'var(--gray-200)';
            e.target.style.boxShadow = 'none';
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              color: '#999'
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Right Side Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Help Icon */}
        <button
          onClick={() => router.push('/help')}
          title="Help & Documentation"
          style={{
            position: 'relative',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            color: '#666',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--gray-100)';
            e.currentTarget.style.color = '#1E73FF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
            e.currentTarget.style.color = '#666';
          }}
        >
          <HelpCircle size={20} />
        </button>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              position: 'relative',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              color: '#666',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--gray-100)';
              e.currentTarget.style.color = '#1E73FF';
            }}
            onMouseLeave={(e) => {
              if (!showNotifications) {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = '#666';
              }
            }}
          >
            <Bell size={20} />
            {activityCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                background: '#EA5455',
                color: '#fff',
                borderRadius: '10px',
                padding: '2px 6px',
                fontSize: '10px',
                fontWeight: 600,
                minWidth: '18px',
                textAlign: 'center'
              }}>
                {activityCount > 9 ? '9+' : activityCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 998
                }}
                onClick={() => setShowNotifications(false)}
              />
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: '#fff',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                border: '1px solid var(--gray-200)',
                minWidth: '320px',
                maxWidth: '400px',
                maxHeight: '500px',
                overflow: 'hidden',
                zIndex: 999
              }}>
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--gray-200)',
                  background: 'var(--gray-100)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Notifications</h3>
                  <button
                    onClick={() => router.push('/activities')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#1E73FF',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                  >
                    View All →
                  </button>
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {recentActivities.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                      <Bell size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                      <p style={{ margin: 0 }}>No recent activities</p>
                    </div>
                  ) : (
                    recentActivities.map((activity, index) => {
                      const activityDate = activity.created_at ? new Date(activity.created_at) : new Date();
                      const timeAgo = activityDate.toLocaleDateString() + ' ' + activityDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      
                      return (
                        <div
                          key={activity.id || index}
                          onClick={() => {
                            if (activity.entity_type === 'lead' && activity.entity_id) {
                              router.push(`/leads/${activity.entity_id}`);
                              setShowNotifications(false);
                            } else {
                              router.push('/activities');
                              setShowNotifications(false);
                            }
                          }}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--gray-200)',
                            cursor: activity.entity_id ? 'pointer' : 'default',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (activity.entity_id) {
                              e.currentTarget.style.background = 'var(--gray-100)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fff';
                          }}
                        >
                          <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px', color: '#333' }}>
                            {activity.description || (activity.action_type ? activity.action_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Activity')}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {timeAgo}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--gray-100)',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--gray-200)';
            }}
            onMouseLeave={(e) => {
              if (!showUserMenu) {
                e.currentTarget.style.background = 'var(--gray-100)';
              }
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: roleColor.bg,
              color: roleColor.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '14px'
            }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>
                {user?.name || 'User'}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {user?.role_name || 'No Role'}
              </div>
            </div>
            <ChevronDown size={16} style={{ color: '#666' }} />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <>
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 998
                }}
                onClick={() => setShowUserMenu(false)}
              />
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: '#fff',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                border: '1px solid var(--gray-200)',
                minWidth: '200px',
                zIndex: 999,
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--gray-200)',
                  background: 'var(--gray-100)'
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                    {user?.name || 'User'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {user?.email || ''}
                  </div>
                  <div style={{
                    marginTop: '8px',
                    display: 'inline-block',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: roleColor.bg,
                    color: roleColor.text
                  }}>
                    {user?.role_name || 'No Role'}
                  </div>
                </div>
                <div style={{ padding: '8px' }}>
                  <button
                    onClick={() => {
                      router.push('/settings');
                      setShowUserMenu(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      background: 'none',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#333',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--gray-100)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                    }}
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      background: 'none',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#EA5455',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#FEE';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                    }}
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
