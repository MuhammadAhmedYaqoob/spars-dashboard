'use client';
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Filter, TrendingUp, Building, Mail, Phone, Eye, Plus, X, Trash2 } from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '@/utils/api';
import { useAuth } from '@/app/components/AuthProvider';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function LeadsPage(){
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source_type: '',
    source: '',
    designation: '',
    status: 'New',
    assigned_to_id: ''
  });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [leadsData, usersData] = await Promise.all([
          apiGet('/leads').catch(() => []),
          apiGet('/users/assignable').catch(() => [])
        ]);
        // Backend now filters leads by assigned user for Sales Executives
        setLeads(leadsData);
        setAssignableUsers(usersData);
      } catch (error) {
        toast.error('Failed to fetch leads');
        console.error('Failed to fetch leads:', error);
        setLeads([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function createLead() {
    if (!newLead.name.trim() || !newLead.email.trim() || !newLead.company.trim() || !newLead.source_type.trim()) {
      toast.error('Please fill all required fields (Name, Email, Company, Source Type)');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newLead.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      const leadData = {
        name: newLead.name.trim(),
        email: newLead.email.trim(),
        company: newLead.company.trim(),
        source_type: newLead.source_type,
        source: newLead.source.trim() || null,
        status: newLead.status,
        phone: newLead.phone.trim() || null,
        designation: newLead.designation.trim() || null,
        assigned_to_id: newLead.assigned_to_id ? Number(newLead.assigned_to_id) : null
      };

      await apiPost('/leads', leadData);
      toast.success('Lead created successfully');
      setShowAddModal(false);
      setNewLead({
        name: '',
        email: '',
        phone: '',
        company: '',
        source_type: '',
        source: '',
        designation: '',
        status: 'New',
        assigned_to_id: ''
      });
      
      // Refresh leads list
      const data = await apiGet('/leads');
      setLeads(data);
    } catch (error) {
      toast.error('Failed to create lead');
      console.error(error);
    }
  }

  function openDeleteModal(lead) {
    setLeadToDelete(lead);
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
    setLeadToDelete(null);
  }

  async function deleteLead() {
    if (!leadToDelete) return;
    
    try {
      await apiDelete(`/leads/${leadToDelete.id}`);
      toast.success('Lead deleted successfully');
      closeDeleteModal();
      
      // Refresh leads list
      const data = await apiGet('/leads');
      setLeads(data);
    } catch (error) {
      toast.error('Failed to delete lead');
      console.error(error);
    }
  }

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.source_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.source?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = !statusFilter || lead.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [leads, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = leads.length;
    const byStatus = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});
    return { total, byStatus };
  }, [leads]);

  const getStatusBadgeClass = (status) => {
    const statusLower = status?.toLowerCase().replace(/\s+/g, '-') || '';
    // Map statuses to badge classes per spec
    if (statusLower === 'new') return 'badge status-new';
    if (statusLower === 'contacted') return 'badge status-contacted';
    if (statusLower === 'qualified') return 'badge status-qualified';
    if (statusLower === 'proposal' || statusLower === 'proposal-sent') return 'badge status-proposal-sent';
    if (statusLower === 'in-discussion') return 'badge status-in-discussion';
    if (statusLower === 'closed-won' || statusLower === 'won' || statusLower === 'converted') return 'badge status-closed-won';
    if (statusLower === 'closed-lost' || statusLower === 'lost') return 'badge status-closed-lost';
    return 'badge status-new'; // Default to New
  };

  const statusOptions = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'In Discussion', 'Closed Won', 'Closed Lost'];

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const sourceOptions = [
    'Website',
    'Referral',
    'Trade Show',
    'Email Campaign',
    'Cold Call',
    'Partner',
    'Social Media',
    'LinkedIn',
    'Event',
    'Webinar',
    'Other'
  ];

  const formSourceOptions = [
    'Request a Demo',
    'Talk to Sales',
    'General Inquiry',
    'Product Profile Download',
    'Brochure Download'
  ];

  return (
    <div className="page">
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Leads Management</h1>
          <p style={{ color: '#666', fontSize: '14px' }}>View and manage all your leads</p>
        </div>
        <button 
          className="btn primary" 
          onClick={() => setShowAddModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} />
          Add New Lead
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid2" style={{ marginBottom: '24px' }}>
        <motion.div 
          className="card card-hover"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px 0' }}>Total Leads</p>
              <h2 style={{ fontSize: '32px', fontWeight: 700, margin: 0, color: '#1E73FF' }}>{stats.total}</h2>
            </div>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '12px', 
              background: '#1E73FF15', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Users size={28} color="#1E73FF" />
            </div>
          </div>
        </motion.div>
        <motion.div 
          className="card card-hover"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px 0' }}>Active Leads</p>
              <h2 style={{ fontSize: '32px', fontWeight: 700, margin: 0, color: '#28C76F' }}>
                {stats.total - (stats.byStatus['Lost'] || 0) - (stats.byStatus['Converted'] || 0)}
              </h2>
            </div>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '12px', 
              background: '#28C76F15', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <TrendingUp size={28} color="#28C76F" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
            <input
              type="text"
              placeholder="Search by name, company, email, or source..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '40px', width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="#666" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value="">All Status</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Showing {filteredLeads.length} of {leads.length} leads
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <motion.div 
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Users size={20} color="#1E73FF" />
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>All Leads</h2>
        </div>

        {filteredLeads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            <Users size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', margin: 0 }}>No leads found</p>
            <p style={{ fontSize: '14px', margin: '8px 0 0 0' }}>
              {searchTerm || statusFilter ? 'Try adjusting your filters' : 'Start by converting form submissions to leads'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Lead</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Company</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Status</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Source Type</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Source</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666', width: '100px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead, index) => (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    style={{ 
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F8F9FB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fff';
                    }}
                  >
                    <td style={{ padding: '16px' }}>
                      <div>
                        <Link 
                          href={`/leads/${lead.id}`}
                          style={{ 
                            fontWeight: 600, 
                            color: '#1E73FF', 
                            textDecoration: 'none',
                            fontSize: '15px',
                            display: 'block',
                            marginBottom: '4px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {lead.name}
                        </Link>
                        <div style={{ fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          {lead.email && (
                            <>
                              <Mail size={12} />
                              <span>{lead.email}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building size={16} color="#666" style={{ opacity: 0.7 }} />
                        <span style={{ fontSize: '14px' }}>{lead.company}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span className={getStatusBadgeClass(lead.status)} style={{ fontSize: '12px', padding: '6px 12px' }}>
                        {lead.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ fontSize: '14px', color: '#666' }}>{lead.source_type || '-'}</span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ fontSize: '14px', color: '#666' }}>{lead.source || '-'}</span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <Link href={`/leads/${lead.id}`}>
                          <button 
                            className="btn secondary" 
                            style={{ 
                              padding: '8px 12px', 
                              fontSize: '12px', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px' 
                            }}
                          >
                            <Eye size={14} />
                            View
                          </button>
                        </Link>
                        <button 
                          onClick={() => openDeleteModal(lead)}
                          style={{ 
                            padding: '8px', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            background: '#EA5455',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#d43f3f';
                            e.target.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#EA5455';
                            e.target.style.transform = 'scale(1)';
                          }}
                          title="Delete lead"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Add New Lead Modal */}
      {showAddModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowAddModal(false)}
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
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #1E73FF 0%, #0A5FCC 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Plus size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Add New Lead</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>Manually add a new lead to the system</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#666'
                }}
              >
                <X size={20} />
              </button>
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
                  type="text"
                  placeholder="Enter full name" 
                  value={newLead.name} 
                  onChange={e=>setNewLead({...newLead, name:e.target.value})}
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
                  value={newLead.email} 
                  onChange={e=>setNewLead({...newLead, email:e.target.value})}
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
                  Phone
                </label>
                <input 
                  type="tel"
                  placeholder="+1-555-0100" 
                  value={newLead.phone} 
                  onChange={e=>setNewLead({...newLead, phone:e.target.value})}
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
                  Company <span style={{ color: '#EA5455' }}>*</span>
                </label>
                <input 
                  type="text"
                  placeholder="Company name" 
                  value={newLead.company} 
                  onChange={e=>setNewLead({...newLead, company:e.target.value})}
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
                  Source Type <span style={{ color: '#EA5455' }}>*</span>
                </label>
                <select 
                  value={newLead.source_type} 
                  onChange={e=>setNewLead({...newLead, source_type:e.target.value})}
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
                  <option value="">Select source type</option>
                  {sourceOptions.map(source => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  color: '#333',
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  Source
                </label>
                {newLead.source_type === 'Website' ? (
                  <select 
                    value={newLead.source || ''} 
                    onChange={e=>setNewLead({...newLead, source:e.target.value})}
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
                      e.currentTarget.style.borderColor = '#1E73FF';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 115, 255, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--gray-200)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Select form...</option>
                    {formSourceOptions.map(form => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    type="text"
                    placeholder="Enter source name" 
                    value={newLead.source} 
                    onChange={e=>setNewLead({...newLead, source:e.target.value})}
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
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  color: '#333',
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  Designation
                </label>
                <input 
                  type="text"
                  placeholder="Job title or designation" 
                  value={newLead.designation} 
                  onChange={e=>setNewLead({...newLead, designation:e.target.value})}
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
                  Status
                </label>
                <select 
                  value={newLead.status} 
                  onChange={e=>setNewLead({...newLead, status:e.target.value})}
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
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  color: '#333',
                  marginBottom: '8px',
                  display: 'block'
                }}>
                  Assign To
                </label>
                <select 
                  value={newLead.assigned_to_id || ''} 
                  onChange={e=>setNewLead({...newLead, assigned_to_id: e.target.value ? Number(e.target.value) : ''})}
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
                  <option value="">Unassigned</option>
                  {assignableUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                  ))}
                </select>
              </div>
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
                onClick={() => {
                  setShowAddModal(false);
                  setNewLead({
                    name: '',
                    email: '',
                    phone: '',
                    company: '',
                    source_type: '',
                    source: '',
                    designation: '',
                    status: 'New',
                    assigned_to_id: ''
                  });
                }}
                style={{ padding: '10px 20px' }}
              >
                Cancel
              </button>
              <button 
                className="btn primary" 
                onClick={createLead}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '10px 20px'
                }}
              >
                <Plus size={16} />
                Create Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && leadToDelete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeDeleteModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}
          >
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#0A2342' }}>
                Delete Lead
              </h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#666' }}>
                Are you sure you want to delete this lead? This action cannot be undone.
              </p>
            </div>

            {leadToDelete && (
              <div style={{ 
                background: '#f8f9fa', 
                borderRadius: '8px', 
                padding: '12px', 
                marginBottom: '20px' 
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '4px' }}>
                  {leadToDelete.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {leadToDelete.email} • {leadToDelete.company}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={closeDeleteModal}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  background: '#f0f0f0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button 
                onClick={deleteLead}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  background: '#EA5455',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={16} />
                Delete Lead
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
