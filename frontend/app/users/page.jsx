'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Edit, Trash2, X, Save, Users as UsersIcon, ChevronDown, ChevronRight, Building } from 'lucide-react';
import { apiGet, apiPost, apiDelete, apiPatch } from '@/utils/api';
import { useAuth } from '@/app/components/AuthProvider';
import toast from 'react-hot-toast';

export default function Users(){
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [hierarchy, setHierarchy] = useState({ managers: [], admin_users: [], marketing_users: [], unassigned_executives: [] });
  const [form, setForm] = useState({ name:'', email:'', password:'', role_id:'', manager_id: null });
  const [salesManagers, setSalesManagers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name:'', email:'', role_id:'', password:'', manager_id: null });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedManagers, setExpandedManagers] = useState(new Set());

  // Get current user's role hierarchy level
  const currentUserRole = roles.find(r => r.id === user?.role_id);
  const currentUserLevel = currentUserRole?.hierarchy_level ?? 999;
  const isAdmin = currentUserRole?.permissions?.all === true || currentUserLevel === 0;
  
  // Filter roles based on hierarchy - users can only create users with roles at lower hierarchy levels
  // Admin (level 0 or permissions.all === true) can assign any role
  const availableRoles = roles.filter(r => {
    if (!r.hierarchy_level && r.hierarchy_level !== 0) return false;
    // Admin can assign any role
    if (isAdmin) return true;
    // Current user can only create users with roles at higher hierarchy levels (lower number = higher level)
    return r.hierarchy_level > currentUserLevel;
  });

  async function load(){
    try {
      setLoading(true);
      const [usersData, rolesData, hierarchyData, managersData] = await Promise.all([
        apiGet('/users').catch(()=>[]),
        apiGet('/roles').catch(()=>[]),
        apiGet('/users/hierarchy').catch(()=>({ managers: [], admin_users: [], marketing_users: [], unassigned_executives: [] })),
        apiGet('/users?role=Sales Manager').catch(()=>[])
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setHierarchy(hierarchyData);
      setSalesManagers(managersData);
    } catch (error) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }
  
  useEffect(()=>{ load(); },[]);

  async function create(){
    if (!form.name || !form.email || !form.password || !form.role_id) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      const selectedRole = roles.find(r => r.id === form.role_id);
      const formData = { ...form };
      
      // Validation: Sales Executive must have a manager
      if (selectedRole?.role_name === 'Sales Executive') {
        if (isAdmin && !formData.manager_id) {
          toast.error('Please select a Sales Manager for this Sales Executive');
          return;
        }
        // Auto-set manager_id for Sales Executives created by Sales Managers
        if (currentUserRole?.role_name === 'Sales Manager') {
          formData.manager_id = user.id;
        }
      }
      
      // Marketing users should have no manager
      if (selectedRole?.role_name === 'Marketing') {
        formData.manager_id = null;
      }
      
      // Admin users should have no manager
      if (selectedRole?.role_name === 'Admin') {
        formData.manager_id = null;
      }
      
      await apiPost('/users', formData);
      toast.success('User created successfully');
      setForm({ name:'', email:'', password:'', role_id:'', manager_id: null });
      setShowForm(false);
      load();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
      console.error(error);
    }
  }

  function startEdit(user){
    setEditingId(user.id);
    setEditForm({ 
      name: user.name, 
      email: user.email, 
      role_id: user.role_id,
      password: '',
      manager_id: user.manager_id || null
    });
  }

  function cancelEdit(){
    setEditingId(null);
    setEditForm({ name:'', email:'', role_id:'', password:'', manager_id: null });
  }
  
  function toggleManager(managerId) {
    const newExpanded = new Set(expandedManagers);
    if (newExpanded.has(managerId)) {
      newExpanded.delete(managerId);
    } else {
      newExpanded.add(managerId);
    }
    setExpandedManagers(newExpanded);
  }

  async function update(id){
    if (!editForm.name || !editForm.email || !editForm.role_id) {
      toast.error('Please fill all required fields');
      return;
    }
    
    try {
      const updateData = { ...editForm };
      if (!updateData.password) {
        delete updateData.password;
      }
      await apiPatch(`/users/${id}`, updateData);
      toast.success('User updated successfully');
      cancelEdit();
      load();
    } catch (error) {
      toast.error('Failed to update user');
      console.error(error);
    }
  }

  async function remove(id){
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await apiDelete(`/users/${id}`);
      toast.success('User deleted successfully');
      load();
    } catch (error) {
      toast.error('Failed to delete user');
      console.error(error);
    }
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
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Users Management</h1>
          <p style={{ color: '#666', fontSize: '14px' }}>Manage system users and their roles</p>
        </div>
        <button 
          className="btn primary" 
          onClick={() => setShowForm(!showForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <UserPlus size={18} />
          {showForm ? 'Cancel' : 'Add User'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            className="card"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ 
              marginBottom: '20px', 
              overflow: 'hidden',
              padding: '24px',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: '1px solid var(--gray-200)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #1E73FF 0%, #0A5FCC 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <UserPlus size={20} color="#fff" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#333' }}>Create New User</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>Add a new user to the system</p>
              </div>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '20px', 
              marginBottom: '24px' 
            }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  color: '#333',
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  Name <span style={{ color: '#EA5455' }}>*</span>
                </label>
                <input 
                  placeholder="Enter full name" 
                  value={form.name} 
                  onChange={e=>setForm({...form, name:e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '8px',
                    background: '#fff',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1E73FF';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 115, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--gray-200)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  color: '#333',
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  Email <span style={{ color: '#EA5455' }}>*</span>
                </label>
                <input 
                  type="email"
                  placeholder="email@example.com" 
                  value={form.email} 
                  onChange={e=>setForm({...form, email:e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '8px',
                    background: '#fff',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1E73FF';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 115, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--gray-200)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  color: '#333',
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  Password <span style={{ color: '#EA5455' }}>*</span>
                </label>
                <input 
                  type="password"
                  placeholder="Enter password" 
                  value={form.password} 
                  onChange={e=>setForm({...form, password:e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '8px',
                    background: '#fff',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1E73FF';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 115, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--gray-200)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  color: '#333',
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  Role <span style={{ color: '#EA5455' }}>*</span>
                </label>
                <select 
                  value={form.role_id || ''} 
                  onChange={e=>{
                    const newRoleId = e.target.value ? Number(e.target.value) : '';
                    const newRole = roles.find(r => r.id === newRoleId);
                    // Reset manager_id when role changes
                    setForm({...form, role_id: newRoleId, manager_id: null});
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '8px',
                    background: '#fff',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 16px center',
                    paddingRight: '40px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#1E73FF';
                    e.target.style.boxShadow = '0 0 0 3px rgba(30, 115, 255, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'var(--gray-200)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">Select a role</option>
                  {roles.map(r => {
                    // Admin can assign any role
                    const canAssign = isAdmin || (r.hierarchy_level !== null && r.hierarchy_level !== undefined && r.hierarchy_level > currentUserLevel);
                    const isMarketing = r.role_name === 'Marketing';
                    const isSalesExecutive = r.role_name === 'Sales Executive';
                    return (
                      <option 
                        key={r.id} 
                        value={r.id}
                        disabled={!canAssign}
                        style={{
                          background: canAssign ? '#fff' : '#f5f5f5',
                          color: canAssign ? '#333' : '#999'
                        }}
                      >
                        {r.role_name}
                        {isMarketing && !isAdmin ? ' (Admin only)' : ''}
                        {!canAssign && !isMarketing ? ' (Not authorized)' : ''}
                      </option>
                    );
                  })}
                </select>
                {roles.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                    Loading roles...
                  </p>
                )}
                {roles.length > 0 && availableRoles.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#FF9F43', marginTop: '8px' }}>
                    You don't have permission to create users with any available roles.
                  </p>
                )}
              </div>

              {/* Show Manager Selection for Sales Executive when Admin creates */}
              {form.role_id && roles.find(r => r.id === form.role_id)?.role_name === 'Sales Executive' && isAdmin && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: '#333',
                    marginBottom: '8px',
                    display: 'block'
                  }}>
                    Assign to Sales Manager <span style={{ color: '#EA5455' }}>*</span>
                  </label>
                  <select 
                    value={form.manager_id || ''} 
                    onChange={e=>setForm({...form, manager_id: e.target.value ? Number(e.target.value) : null})}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '14px',
                      border: '1px solid var(--gray-200)',
                      borderRadius: '8px',
                      background: '#fff',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 16px center',
                      paddingRight: '40px'
                    }}
                  >
                    <option value="">Select Sales Manager</option>
                    {salesManagers.map(manager => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name} ({manager.email})
                      </option>
                    ))}
                  </select>
                  {salesManagers.length === 0 && (
                    <p style={{ fontSize: '12px', color: '#FF9F43', marginTop: '8px' }}>
                      No Sales Managers available. Please create a Sales Manager first.
                    </p>
                  )}
                </div>
              )}

              {/* Show info when Sales Manager creates Sales Executive */}
              {form.role_id && roles.find(r => r.id === form.role_id)?.role_name === 'Sales Executive' && currentUserRole?.role_name === 'Sales Manager' && (
                <div style={{ 
                  padding: '12px', 
                  background: '#E3F2FD', 
                  borderRadius: '8px',
                  border: '1px solid #1E73FF30',
                  marginBottom: '16px'
                }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#1E73FF', fontWeight: 500 }}>
                    ℹ️ This Sales Executive will be automatically assigned to you ({user?.name})
                  </p>
                </div>
              )}
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end',
              paddingTop: '20px',
              borderTop: '1px solid var(--gray-200)'
            }}>
              <button 
                className="btn secondary" 
                onClick={() => setShowForm(false)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '10px 20px'
                }}
              >
                Cancel
              </button>
              <button 
                className="btn primary" 
                onClick={create} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '10px 20px'
                }}
              >
                <UserPlus size={16} />
                Create User
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users Tree View */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <UsersIcon size={20} color="#1E73FF" />
          <h2 style={{ margin: 0 }}>All Users ({users.length})</h2>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        ) : (!hierarchy.managers || hierarchy.managers.length === 0) && (!hierarchy.admin_users || hierarchy.admin_users.length === 0) && (!hierarchy.marketing_users || hierarchy.marketing_users.length === 0) && (!hierarchy.unassigned_executives || hierarchy.unassigned_executives.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <UsersIcon size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>No users found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Admin Users */}
            {hierarchy.admin_users && hierarchy.admin_users.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                {hierarchy.admin_users.map(admin => {
                  const adminUser = users.find(u => u.id === admin.id);
                  return (
                    <div key={admin.id} style={{ 
                      padding: '16px', 
                      border: '1px solid var(--gray-200)', 
                      borderRadius: '8px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#fff'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <UsersIcon size={18} color="#7367F0" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '15px', color: '#333' }}>{admin.name}</div>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{admin.email}</div>
                        </div>
                        <span className="badge" style={{ background: '#7367F020', color: '#7367F0' }}>
                          {roles.find(r => r.id === admin.role_id)?.role_name || 'Admin'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn secondary" 
                          onClick={() => startEdit(adminUser)}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          className="btn secondary" 
                          onClick={() => remove(admin.id)}
                          style={{ padding: '6px 12px', fontSize: '12px', color: '#EA5455' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sales Managers with their Teams */}
            {hierarchy.managers && hierarchy.managers.map(manager => {
              const isExpanded = expandedManagers.has(manager.id);
              const managerRole = roles.find(r => r.id === manager.role_id);
              return (
                <div key={manager.id} style={{ 
                  border: '1px solid var(--gray-200)', 
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    padding: '16px', 
                    background: 'linear-gradient(135deg, #1E73FF10 0%, #1E73FF05 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: manager.team.length > 0 ? 'pointer' : 'default'
                  }}
                  onClick={() => manager.team.length > 0 && toggleManager(manager.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      {manager.team.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {isExpanded ? <ChevronDown size={16} color="#666" /> : <ChevronRight size={16} color="#666" />}
                        </div>
                      )}
                      <Building size={18} color="#1E73FF" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: '#333' }}>{manager.name}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{manager.email}</div>
                      </div>
                      <span className="badge info">{managerRole?.role_name || 'Sales Manager'}</span>
                      <span style={{ 
                        fontSize: '12px', 
                        color: '#666',
                        background: '#fff',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--gray-200)'
                      }}>
                        {manager.team.length} {manager.team.length === 1 ? 'member' : 'members'}
                      </span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn secondary" 
                          onClick={(e) => { e.stopPropagation(); startEdit(users.find(u => u.id === manager.id)); }}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          className="btn secondary" 
                          onClick={(e) => { e.stopPropagation(); remove(manager.id); }}
                          style={{ padding: '6px 12px', fontSize: '12px', color: '#EA5455' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sales Executives under this manager */}
                  {isExpanded && manager.team.length > 0 && (
                    <div style={{ background: '#F8F9FB', borderTop: '1px solid var(--gray-200)' }}>
                      {manager.team.map(exec => {
                        const execUser = users.find(u => u.id === exec.id);
                        return (
                          <div key={exec.id} style={{ 
                            padding: '12px 16px 12px 48px',
                            borderBottom: '1px solid var(--gray-200)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#fff',
                            marginLeft: '16px',
                            marginRight: '16px',
                            marginTop: '8px',
                            marginBottom: '8px',
                            borderRadius: '6px',
                            border: '1px solid var(--gray-200)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                              <UsersIcon size={16} color="#28C76F" />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, fontSize: '14px', color: '#333' }}>{exec.name}</div>
                                <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{exec.email}</div>
                              </div>
                              <span className="badge" style={{ background: '#28C76F20', color: '#28C76F' }}>
                                {roles.find(r => r.id === exec.role_id)?.role_name || 'Sales Executive'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                className="btn secondary" 
                                onClick={() => startEdit(execUser)}
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                className="btn secondary" 
                                onClick={() => remove(exec.id)}
                                style={{ padding: '6px 12px', fontSize: '12px', color: '#EA5455' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Unassigned Sales Executives */}
            {hierarchy.unassigned_executives && hierarchy.unassigned_executives.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <div style={{ 
                  padding: '12px 16px', 
                  background: '#FFF3E0', 
                  borderRadius: '8px',
                  marginBottom: '16px',
                  border: '1px solid #FF9F43',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <UsersIcon size={18} color="#FF9F43" />
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#FF9F43' }}>
                    Unassigned Sales Executives ({hierarchy.unassigned_executives.length})
                  </h3>
                </div>
                {hierarchy.unassigned_executives.map(exec => {
                  const execUser = users.find(u => u.id === exec.id);
                  return (
                    <div key={exec.id} style={{ 
                      padding: '16px', 
                      border: '1px solid #FF9F43', 
                      borderRadius: '8px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#FFFBF5'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <UsersIcon size={18} color="#FF9F43" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '15px', color: '#333' }}>{exec.name}</div>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{exec.email}</div>
                          <div style={{ fontSize: '11px', color: '#FF9F43', marginTop: '4px', fontWeight: 500 }}>
                            ⚠️ No Sales Manager assigned
                          </div>
                        </div>
                        <span className="badge" style={{ background: '#FF9F4320', color: '#FF9F43' }}>
                          {roles.find(r => r.id === exec.role_id)?.role_name || 'Sales Executive'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn primary" 
                          onClick={() => startEdit(execUser)}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          <Edit size={14} /> Assign Manager
                        </button>
                        <button 
                          className="btn secondary" 
                          onClick={() => remove(exec.id)}
                          style={{ padding: '6px 12px', fontSize: '12px', color: '#EA5455' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Marketing Users */}
            {hierarchy.marketing_users && hierarchy.marketing_users.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                {hierarchy.marketing_users.map(marketing => {
                  const marketingUser = users.find(u => u.id === marketing.id);
                  return (
                    <div key={marketing.id} style={{ 
                      padding: '16px', 
                      border: '1px solid var(--gray-200)', 
                      borderRadius: '8px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#fff'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <UsersIcon size={18} color="#FF9F43" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 500, fontSize: '14px', color: '#333' }}>{marketing.name}</div>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{marketing.email}</div>
                        </div>
                        <span className="badge" style={{ background: '#FF9F4320', color: '#FF9F43' }}>
                          {roles.find(r => r.id === marketing.role_id)?.role_name || 'Marketing'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn secondary" 
                          onClick={() => startEdit(marketingUser)}
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          className="btn secondary" 
                          onClick={() => remove(marketing.id)}
                          style={{ padding: '6px 12px', fontSize: '12px', color: '#EA5455' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Edit Modal */}
      <AnimatePresence>
        {editingId && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancelEdit}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
              }}
            >
              <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 600 }}>Edit User</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label>Name</label>
                  <input 
                    value={editForm.name} 
                    onChange={e=>setEditForm({...editForm, name:e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input 
                    type="email"
                    value={editForm.email} 
                    onChange={e=>setEditForm({...editForm, email:e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select 
                    value={editForm.role_id} 
                    onChange={e=>{
                      const newRoleId = Number(e.target.value);
                      const newRole = roles.find(r => r.id === newRoleId);
                      // Reset manager_id when role changes
                      setEditForm({...editForm, role_id: newRoleId, manager_id: null});
                    }}
                  >
                    {roles.map(r => {
                      const canAssign = isAdmin || (r.hierarchy_level !== null && r.hierarchy_level !== undefined && r.hierarchy_level > currentUserLevel);
                      return (
                        <option key={r.id} value={r.id} disabled={!canAssign}>
                          {r.role_name} {!canAssign ? ' - Insufficient permissions' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                
                {/* Show Manager Selection for Sales Executive */}
                {editForm.role_id && roles.find(r => r.id === editForm.role_id)?.role_name === 'Sales Executive' && isAdmin && (
                  <div className="form-group">
                    <label>Assign to Sales Manager</label>
                    {(() => {
                      const currentUser = users.find(u => u.id === editingId);
                      const currentManager = currentUser?.manager_id ? salesManagers.find(m => m.id === currentUser.manager_id) : null;
                      return (
                        <>
                          {currentManager && (
                            <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px', padding: '8px', background: '#f0f4f8', borderRadius: '4px' }}>
                              Current Manager: <strong>{currentManager.name}</strong>
                            </p>
                          )}
                          <select 
                            value={editForm.manager_id || ''} 
                            onChange={e=>setEditForm({...editForm, manager_id: e.target.value ? Number(e.target.value) : null})}
                          >
                            <option value="">Select Sales Manager (or leave unassigned)</option>
                            {salesManagers.map(manager => (
                              <option key={manager.id} value={manager.id}>
                                {manager.name} ({manager.email})
                              </option>
                            ))}
                          </select>
                          {salesManagers.length === 0 && (
                            <p style={{ fontSize: '12px', color: '#FF9F43', marginTop: '8px' }}>
                              No Sales Managers available.
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
                
                <div className="form-group">
                  <label>New Password (leave blank to keep current)</label>
                  <input 
                    type="password"
                    value={editForm.password} 
                    onChange={e=>setEditForm({...editForm, password:e.target.value})}
                    placeholder="Enter new password"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button className="btn secondary" onClick={cancelEdit}>Cancel</button>
                <button className="btn primary" onClick={() => update(editingId)}>Save Changes</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
