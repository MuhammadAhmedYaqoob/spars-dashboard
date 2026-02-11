'use client';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, X, Eye } from 'lucide-react';
import { apiGet, apiPost } from '@/utils/api';
import { useAuth } from '@/app/components/AuthProvider';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function SubmissionsByType(){
  const pathname = usePathname();
  const { canEditResource } = useAuth();
  const type = useMemo(()=> pathname.split('/').pop(), [pathname]);
  const [subs, setSubs] = useState([]);
  const [filteredSubs, setFilteredSubs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [convertForm, setConvertForm] = useState({ source: 'Website', assigned_to_id: '' });
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if user can convert submissions to leads
  const canConvertToLead = canEditResource('leads');

  useEffect(()=>{
    if(!type) return;
    (async()=>{
      try {
        setLoading(true);
        const [data, usersData] = await Promise.all([
          apiGet(`/form-submissions/${type}`).catch(()=>[]),
          apiGet('/users/assignable').catch(()=>[])
        ]);
        setSubs(data);
        setFilteredSubs(data);
        // Filter out Marketing users - only show Sales Executives
        const salesExecutivesOnly = usersData.filter(user => {
          // Exclude Marketing users - backend should already filter, but double-check here
          return user.role_name !== 'Marketing' && user.role_name !== 'marketing';
        });
        setAssignableUsers(salesExecutivesOnly);
      } catch (error) {
        toast.error('Failed to load submissions');
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  },[type]);

  useEffect(() => {
    let filtered = [...subs];
    
    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.name?.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term) ||
        s.company?.toLowerCase().includes(term)
      );
    }
    
    setFilteredSubs(filtered);
  }, [subs, searchTerm]);

  // Map form_type to source name
  const getSourceFromFormType = (formType) => {
    if (!formType) return 'Website Form';
    
    // Normalize form type (handle variations)
    const normalizedType = formType.toLowerCase().replace(/-/g, '_');
    
    const mapping = {
      'contact': 'General Inquiry',
      'talk_to_sales': 'Talk to Sales',
      'talk': 'Talk to Sales',
      'brochure': 'Brochure Download',
      'product_profile': 'Product Profile Download',
      'product-profile': 'Product Profile Download',
      'demo': 'Request a Demo'
    };
    return mapping[normalizedType] || mapping[formType] || 'Website Form';
  };

  function openConvertModal(submission) {
    setSelectedSubmission(submission);
    const source = getSourceFromFormType(submission.form_type || type);
    setConvertForm({ source, assigned_to_id: '' });
    setShowConvertModal(true);
  }

  function closeConvertModal() {
    setShowConvertModal(false);
    setSelectedSubmission(null);
    setConvertForm({ source: '', assigned_to_id: '' });
  }

  async function convert(){
    if (!convertForm.source.trim()) {
      toast.error('Source is required');
      return;
    }
    
    try {
      const lead = await apiPost(`/leads/convert/${selectedSubmission.id}`, {
        source_type: 'Website',  // Always Website for form submissions
        source: convertForm.source,
        designation: null,
        assigned_to_id: convertForm.assigned_to_id ? parseInt(convertForm.assigned_to_id) : null
      });
      toast.success(`Lead created #${lead.id}`);
      closeConvertModal();
      
      // Refresh submissions
      const data = await apiGet(`/form-submissions/${type}`).catch(()=>[]);
      setSubs(data);
    } catch (error) {
      toast.error('Failed to convert submission');
      console.error(error);
    }
  }

  function openDetailsModal(submission) {
    setSelectedSubmission(submission);
    setShowDetailsModal(true);
  }

  function closeDetailsModal() {
    setShowDetailsModal(false);
    setSelectedSubmission(null);
  }

  const typeLabel = type?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || type;

  return (
    <div className="page">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Submissions — {typeLabel}</h1>
        <p style={{ color: '#666', fontSize: '14px' }}>View and manage all form submissions</p>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '40px', width: '100%' }}
          />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <div className="spinner"></div>
          </div>
        ) : filteredSubs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <p>No submissions found</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Submitted At</th>
                  <th>Status</th>
                  <th style={{ width: '150px' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubs.map(s => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.email}</td>
                    <td>{s.company}</td>
                    <td>
                      {(s.submitted_at || s.submitted) ? (() => {
                        try {
                          const date = new Date(s.submitted_at || s.submitted);
                          if (isNaN(date.getTime())) return 'Invalid date';
                          return format(date, 'MMM dd, yyyy HH:mm');
                        } catch (e) {
                          return 'Invalid date';
                        }
                      })() : 'N/A'}
                    </td>
                    <td>
                      {s.status==='Converted' ? (
                        <span className="badge info">Converted to Lead</span>
                      ) : (
                        <span className="badge warning">New</span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn secondary" 
                        onClick={()=>openDetailsModal(s)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                      >
                        <Eye size={14} />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedSubmission && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDetailsModal}
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
                maxWidth: '700px',
                width: '90%',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Submission Details</h3>
                <button 
                  onClick={closeDetailsModal}
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

              {/* Basic Information */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#333' }}>Summary</h4>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '16px' 
                }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Name</label>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>{selectedSubmission.name}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Email</label>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>{selectedSubmission.email}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Company</label>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>{selectedSubmission.company || 'N/A'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Submitted At</label>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>
                      {(selectedSubmission.submitted_at || selectedSubmission.submitted) ? (() => {
                        try {
                          const date = new Date(selectedSubmission.submitted_at || selectedSubmission.submitted);
                          if (isNaN(date.getTime())) return 'Invalid date';
                          return format(date, 'MMM dd, yyyy HH:mm');
                        } catch (e) {
                          return 'Invalid date';
                        }
                      })() : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Status</label>
                    <div>
                      {selectedSubmission.status==='Converted' ? (
                        <span className="badge info">Converted to Lead</span>
                      ) : (
                        <span className="badge warning">New</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>Form Type</label>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#333', textTransform: 'capitalize' }}>
                      {typeLabel}
                    </div>
                  </div>
                </div>
                
                {/* Source Type and Source in one row */}
                <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Source Type</label>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#333', padding: '10px 14px', background: '#f0f4f8', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      Website
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Source</label>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#333', padding: '10px 14px', background: '#f0f4f8', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      {getSourceFromFormType(selectedSubmission?.form_type || type)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Data */}
              {selectedSubmission.data && Object.keys(selectedSubmission.data).length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#333' }}>Original Submitted Information</h4>
                  <div style={{ 
                    background: 'var(--gray-100)', 
                    borderRadius: '8px', 
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {Object.entries(selectedSubmission.data).map(([key, value]) => {
                      // Skip null, undefined, or empty values
                      if (value === null || value === undefined || value === '') return null;
                      
                      // Format key to readable label
                      const label = key
                        .replace(/_/g, ' ')
                        .replace(/([A-Z])/g, ' $1')
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ');
                      
                      // Format value for display
                      let displayValue;
                      if (typeof value === 'boolean') {
                        displayValue = value ? 'Yes' : 'No';
                      } else if (typeof value === 'object') {
                        displayValue = JSON.stringify(value, null, 2);
                      } else {
                        displayValue = String(value);
                      }
                      
                      return (
                        <div key={key} style={{ 
                          paddingBottom: '12px',
                          borderBottom: '1px solid var(--gray-200)'
                        }}>
                          <label style={{ 
                            fontSize: '12px', 
                            color: '#666', 
                            marginBottom: '6px', 
                            display: 'block',
                            fontWeight: 600
                          }}>
                            {label}
                          </label>
                          <div style={{ 
                            fontSize: '14px', 
                            color: '#333',
                            wordBreak: 'break-word'
                          }}>
                            {displayValue}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedSubmission.status !== 'Converted' && canConvertToLead && (
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  justifyContent: 'flex-end',
                  paddingTop: '20px',
                  borderTop: '1px solid var(--gray-200)'
                }}>
                  <button 
                    className="btn secondary" 
                    onClick={closeDetailsModal}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    Close
                  </button>
                  <button 
                    className="btn primary" 
                    onClick={() => {
                      closeDetailsModal();
                      openConvertModal(selectedSubmission);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1E73FF', color: '#fff' }}
                  >
                    <UserPlus size={16} />
                    Convert to Lead
                  </button>
                </div>
              )}

              {/* Close button when Convert to Lead is not available */}
              {(selectedSubmission.status === 'Converted' || !canConvertToLead) && (
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  justifyContent: 'flex-end',
                  paddingTop: '20px',
                  borderTop: '1px solid var(--gray-200)'
                }}>
                  <button 
                    className="btn secondary" 
                    onClick={closeDetailsModal}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    Close
                  </button>
                </div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Convert Modal */}
      <AnimatePresence>
        {showConvertModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeConvertModal}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Convert to Lead</h3>
                <button 
                  onClick={closeConvertModal}
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
              <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--gray-100)', borderRadius: '8px' }}>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>{selectedSubmission?.name}</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#666' }}>{selectedSubmission?.email}</p>
              </div>
              <div className="form-group">
                <label>Source Type</label>
                <input
                  type="text"
                  value="Website"
                  disabled
                  style={{
                    background: '#f5f5f5',
                    cursor: 'not-allowed',
                    opacity: 0.7,
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '8px',
                    boxSizing: 'border-box'
                  }}
                />
                <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                  Source type is always "Website" for form submissions
                </small>
              </div>
              <div className="form-group">
                <label>Source *</label>
                <input
                  type="text"
                  value={convertForm.source}
                  disabled
                  style={{
                    background: '#f5f5f5',
                    cursor: 'not-allowed',
                    opacity: 0.7,
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '8px',
                    boxSizing: 'border-box'
                  }}
                />
                <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                  Source is automatically set based on form type
                </small>
              </div>
              <div className="form-group">
                <label>Assign To Sales Executive</label>
                {assignableUsers.length === 0 ? (
                  <div style={{ padding: '12px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107', color: '#856404' }}>
                    No Sales Executives available for assignment
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                          <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#666' }}>Sales Executive</th>
                          <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#666' }}>Manager</th>
                          <th style={{ padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#666', width: '80px' }}>Select</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignableUsers.map(user => (
                          <tr 
                            key={user.id}
                            style={{ 
                              borderBottom: '1px solid var(--gray-200)',
                              cursor: 'pointer',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#F8F9FB'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                            onClick={() => setConvertForm({ ...convertForm, assigned_to_id: user.id.toString() })}
                          >
                            <td style={{ padding: '12px' }}>
                              <div style={{ fontWeight: 500, fontSize: '14px', color: '#333' }}>{user.name}</div>
                              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{user.email}</div>
                            </td>
                            <td style={{ padding: '12px' }}>
                              {user.manager_name ? (
                                <span style={{
                                  display: 'inline-block',
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  background: '#1E73FF15',
                                  color: '#1E73FF',
                                  border: '1px solid #1E73FF30'
                                }}>
                                  {user.manager_name}
                                </span>
                              ) : (
                                <span style={{ fontSize: '12px', color: '#999' }}>No manager</span>
                              )}
                            </td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>
                              <input
                                type="radio"
                                name="assign_to"
                                checked={convertForm.assigned_to_id === user.id.toString()}
                                onChange={() => setConvertForm({ ...convertForm, assigned_to_id: user.id.toString() })}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button className="btn secondary" onClick={closeConvertModal}>Cancel</button>
                <button className="btn primary" onClick={convert}>Convert</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
