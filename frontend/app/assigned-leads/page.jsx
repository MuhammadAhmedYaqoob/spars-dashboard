'use client';
import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Filter, Building, Mail, Phone, Eye, Calendar, MessageSquare, PhoneCall } from 'lucide-react';
import { apiGet } from '@/utils/api';
import { useAuth } from '@/app/components/AuthProvider';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { format } from 'date-fns';

export default function AssignedLeadsPage(){
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignedLeads();
  }, []);

  async function loadAssignedLeads() {
    try {
      setLoading(true);
      // Backend already filters leads by assigned_to for Sales Executives
      const leadsData = await apiGet('/leads').catch(() => []);
      
      // Filter to only show leads assigned to current user
      const assignedLeads = leadsData.filter(lead => 
        lead.assigned_to === user?.id || lead.assigned === user?.name
      );
      setLeads(assignedLeads);
    } catch (error) {
      toast.error('Failed to fetch assigned leads');
      console.error('Failed to fetch assigned leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  // Helper function to get the name of who assigned the lead
  function getAssignedByName(lead) {
    if (lead.created_by_name) return lead.created_by_name;
    if (!lead.created_by) return 'System';
    return 'Unknown';
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
    const withFollowUp = leads.filter(l => l.follow_up_required).length;
    return { total, byStatus, withFollowUp };
  }, [leads]);

  const getStatusBadgeClass = (status) => {
    const statusLower = status?.toLowerCase().replace(/\s+/g, '-') || '';
    if (statusLower === 'new') return 'badge status-new';
    if (statusLower === 'contacted') return 'badge status-contacted';
    if (statusLower === 'qualified') return 'badge status-qualified';
    if (statusLower === 'proposal' || statusLower === 'proposal-sent') return 'badge status-proposal-sent';
    if (statusLower === 'in-discussion') return 'badge status-in-discussion';
    if (statusLower === 'closed-won' || statusLower === 'won' || statusLower === 'converted') return 'badge status-closed-won';
    if (statusLower === 'closed-lost' || statusLower === 'lost') return 'badge status-closed-lost';
    return 'badge status-new';
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

  return (
    <div className="page">
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>My Assigned Leads</h1>
          <p style={{ color: '#666', fontSize: '14px' }}>Leads assigned to you - manage follow-ups, log calls, and track progress</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/calendar">
            <button 
              className="btn secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Calendar size={18} />
              View Calendar
            </button>
          </Link>
        </div>
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
              <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px 0' }}>Total Assigned</p>
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
              <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px 0' }}>Follow-ups Required</p>
              <h2 style={{ fontSize: '32px', fontWeight: 700, margin: 0, color: '#FF9F43' }}>
                {stats.withFollowUp}
              </h2>
            </div>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '12px', 
              background: '#FF9F4315', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Calendar size={28} color="#FF9F43" />
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
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>My Assigned Leads</h2>
        </div>

        {filteredLeads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
            <Users size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', margin: 0 }}>No assigned leads found</p>
            <p style={{ fontSize: '14px', margin: '8px 0 0 0' }}>
              {searchTerm || statusFilter ? 'Try adjusting your filters' : 'You don\'t have any assigned leads yet'}
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
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Assigned By</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Source Type</th>
                  <th style={{ padding: '16px', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666' }}>Follow-up</th>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={14} color="#666" style={{ opacity: 0.7 }} />
                        <span style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>
                          {getAssignedByName(lead)}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ fontSize: '14px', color: '#666' }}>{lead.source_type || '-'}</span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {lead.follow_up_required && lead.follow_up_date ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#FF9F43' }}>
                          <Calendar size={14} />
                          <span>{format(new Date(lead.follow_up_date), 'MMM dd, yyyy')}</span>
                          {lead.follow_up_time && (
                            <span style={{ color: '#666' }}>at {lead.follow_up_time}</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '14px', color: '#999' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
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
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}



