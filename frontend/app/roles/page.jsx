'use client';
import { useEffect, useState } from 'react';
import { Shield, CheckCircle } from 'lucide-react';
import { apiGet } from '@/utils/api';
import toast from 'react-hot-toast';

export default function Roles(){
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load(){ 
    try {
      setLoading(true);
      setRoles(await apiGet('/roles').catch(()=>[]));
    } catch (error) {
      toast.error('Failed to load roles');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }
  
  useEffect(()=>{ load(); },[]);

  // Format permissions into readable list
  function formatPermissions(permissions) {
    if (!permissions) return 'No specific permissions';
    
    // If admin has all permissions
    if (permissions.all === true) {
      return 'Full access to all features';
    }

    const permissionLabels = {
      'submissions': 'View Submissions',
      'leads': 'View Leads',
      'lead_assignment': 'Assign Leads',
      'lead_status_update': 'Update Lead Status',
      'lead_comments': 'Add Comments',
      'reminders': 'Set Reminders',
      'reports': 'View Reports',
      'users': 'Manage Users',
      'email_templates': 'Manage Email Templates',
      'convert_to_lead': 'Convert to Lead',
      'delete_submission': 'Delete Submissions'
    };

    const activePermissions = [];
    for (const [key, value] of Object.entries(permissions)) {
      if (value === true && key !== 'all') {
        activePermissions.push(permissionLabels[key] || key);
      }
    }

    if (activePermissions.length === 0) {
      return 'No specific permissions';
    }

    return activePermissions.join(', ');
  }

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Roles Management</h1>
        <p style={{ color: '#666', fontSize: '14px' }}>View user roles and their permissions</p>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Shield size={20} color="#1E73FF" />
          <h2 style={{ margin: 0 }}>All Roles ({roles.length})</h2>
        </div>
        {roles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <Shield size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>No roles found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th style={{ width: '200px' }}>Role Name</th>
                  <th>Authorized Permissions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map(r => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>
                      <span className="badge info" style={{ fontSize: '14px', padding: '6px 12px' }}>
                        {r.role_name}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <CheckCircle size={16} color="#28C76F" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span style={{ fontSize: '14px', color: '#333', lineHeight: '1.6' }}>
                          {formatPermissions(r.permissions)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
