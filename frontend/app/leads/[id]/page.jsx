'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Mail, Building, Phone, Tag, Calendar, MessageSquare, Send, Edit2, Save, Clock, Bell, Trash2, X, PhoneCall, DollarSign, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/utils/api';
import { useAuth } from '@/app/components/AuthProvider';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const statusOptions = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'In Discussion', 'Closed Won', 'Closed Lost'];

function ViewButton({ log, onView }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onView(log);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered ? '#1E73FF' : '#E7F0FF',
        border: '1px solid #1E73FF',
        borderRadius: '6px',
        padding: '6px 10px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.2s ease'
      }}
    >
      <Eye size={14} color={isHovered ? '#fff' : '#1E73FF'} style={{ transition: 'color 0.2s ease' }} />
      <span style={{ fontSize: '12px', fontWeight: 600, color: isHovered ? '#fff' : '#1E73FF', transition: 'color 0.2s ease' }}>View</span>
    </button>
  );
}

export default function LeadDetails(){
  const { id } = useParams();
  const { user, canEditResource } = useAuth();
  const [lead, setLead] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [leadStatus, setLeadStatus] = useState('');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [callLogs, setCallLogs] = useState([]);
  const [showCallLogModal, setShowCallLogModal] = useState(false);
  const [editingCallLog, setEditingCallLog] = useState(null);
  const [viewingCallLog, setViewingCallLog] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [callLogForm, setCallLogForm] = useState({
    stage: '',
    activity_type: '',
    objective: '',
    planning_notes: '',
    post_meeting_notes: '',
    follow_up_notes: '',
    challenges: '',
    secured_order: false,
    dollar_value: '',
    meeting_date: '',
    meeting_time: '',
    is_completed: false,
    is_cancelled: false,
    follow_up_required: false,
    follow_up_date: '',
    follow_up_time: '',
    follow_up_status: 'Pending'
  });

  // Check permissions - users with "view" only permission cannot edit
  const canEditStatus = canEditResource('leads');
  const canAddComments = canEditResource('leads');

  useEffect(()=>{
    loadData();
  },[id]);

  async function loadData(){
    try {
      setLoading(true);
      const foundLead = await apiGet(`/leads/${id}`).catch(() => null);
      if (!foundLead) {
        // Fallback to list endpoint
        const all = await apiGet('/leads');
        const found = all.find(x=> String(x.id)===String(id))||null;
        setLead(found);
        if (found) setLeadStatus(found.status);
      } else {
        setLead(foundLead);
        setLeadStatus(foundLead.status);
      }
      const cs = await apiGet(`/comments/${id}`).catch(()=>[]);
      setComments(cs);
      await loadCallLogs();
    } catch (error) {
      toast.error('Failed to load lead details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function updateLeadStatus(){
    if (!leadStatus) {
      toast.error('Please select a status');
      return;
    }
    
    try {
      const updated = await apiPatch(`/leads/${id}`, { status: leadStatus });
      setLead(updated);
      setIsEditingStatus(false);
      toast.success('Lead status updated successfully');
      loadData();
    } catch (error) {
      toast.error('Failed to update lead status');
      console.error(error);
    }
  }

  async function addComment(){
    if (!text.trim()) {
      toast.error('Comment text is required');
      return;
    }
    
    try {
      await apiPost('/comments', { 
        lead_id: Number(id), 
        text
      });
      setText('');
      toast.success('Comment added');
      const cs = await apiGet(`/comments/${id}`);
      setComments(cs);
      loadData(); // Reload to refresh activity timeline
    } catch (error) {
      toast.error('Failed to add comment');
      console.error(error);
    }
  }


  async function loadCallLogs() {
    try {
      const data = await apiGet(`/call-logs?lead_id=${id}`).catch(() => []);
      setCallLogs(data);
    } catch (error) {
      console.error('Failed to load call logs:', error);
    }
  }

  async function saveCallLog() {
    if (!callLogForm.meeting_date) {
      toast.error('Meeting date is required');
      return;
    }

    try {
      const meetingDateTime = callLogForm.meeting_time 
        ? new Date(`${callLogForm.meeting_date}T${callLogForm.meeting_time}`)
        : new Date(`${callLogForm.meeting_date}T00:00`);

      const callLogData = {
        lead_id: Number(id),
        user_id: user.id,
        stage: callLogForm.stage || null,
        activity_type: callLogForm.activity_type || null,
        objective: callLogForm.objective || null,
        planning_notes: callLogForm.planning_notes || null,
        post_meeting_notes: callLogForm.post_meeting_notes || null,
        follow_up_notes: callLogForm.follow_up_notes || null,
        challenges: callLogForm.challenges || null,
        secured_order: callLogForm.secured_order,
        dollar_value: callLogForm.dollar_value ? parseFloat(callLogForm.dollar_value) : null,
        meeting_date: meetingDateTime.toISOString(),
        is_completed: callLogForm.is_completed,
        is_cancelled: callLogForm.is_cancelled
      };

      if (editingCallLog) {
        await apiPatch(`/call-logs/${editingCallLog.id}`, callLogData);
        toast.success('Call log updated');
      } else {
        await apiPost('/call-logs', callLogData);
        toast.success('Call log created');
      }

      // Update lead's follow-up required status if set
      if (callLogForm.follow_up_required) {
        const followUpData = {
          follow_up_required: true,
          follow_up_date: callLogForm.follow_up_date || null,
          follow_up_time: callLogForm.follow_up_time || null,
          follow_up_status: callLogForm.follow_up_status || 'Pending'
        };
        await apiPatch(`/leads/${id}`, followUpData);
      } else if (callLogForm.follow_up_required === false && lead?.follow_up_required) {
        // Only clear if explicitly unchecked
        await apiPatch(`/leads/${id}`, { follow_up_required: false, follow_up_status: null });
      }

      setShowCallLogModal(false);
      setEditingCallLog(null);
      setCallLogForm({
        stage: '',
        activity_type: '',
        objective: '',
        planning_notes: '',
        post_meeting_notes: '',
        follow_up_notes: '',
        challenges: '',
        secured_order: false,
        dollar_value: '',
        meeting_date: '',
        meeting_time: '',
        is_completed: false,
        is_cancelled: false,
        follow_up_required: false,
        follow_up_date: '',
        follow_up_time: '',
        follow_up_status: 'Pending'
      });
      await loadCallLogs();
      loadData(); // Reload lead to update stage and follow-up status
    } catch (error) {
      toast.error('Failed to save call log');
      console.error(error);
    }
  }

  function openEditCallLog(callLog) {
    const meetingDate = new Date(callLog.meeting_date);
    setEditingCallLog(callLog);
    setCallLogForm({
      stage: callLog.stage || '',
      activity_type: callLog.activity_type || '',
      objective: callLog.objective || '',
      planning_notes: callLog.planning_notes || '',
      post_meeting_notes: callLog.post_meeting_notes || '',
      follow_up_notes: callLog.follow_up_notes || '',
      challenges: callLog.challenges || '',
      secured_order: callLog.secured_order || false,
      dollar_value: callLog.dollar_value || '',
      meeting_date: meetingDate.toISOString().split('T')[0],
      meeting_time: meetingDate.toTimeString().slice(0, 5),
      is_completed: callLog.is_completed || false,
      is_cancelled: callLog.is_cancelled || false,
      follow_up_required: lead?.follow_up_required || false,
      follow_up_date: lead?.follow_up_date ? new Date(lead.follow_up_date).toISOString().split('T')[0] : '',
      follow_up_time: lead?.follow_up_time || '',
      follow_up_status: lead?.follow_up_status || 'Pending'
    });
    setShowCallLogModal(true);
  }

  function openViewCallLog(callLog) {
    setViewingCallLog(callLog);
    setShowViewModal(true);
  }

  function openNewCallLog() {
    setEditingCallLog(null);
    setCallLogForm({
      stage: lead?.stage || '',
      activity_type: '',
      objective: '',
      planning_notes: '',
      post_meeting_notes: '',
      follow_up_notes: '',
      challenges: '',
      secured_order: false,
      dollar_value: '',
      meeting_date: new Date().toISOString().split('T')[0],
      meeting_time: '',
      is_completed: false,
      is_cancelled: false,
      follow_up_required: lead?.follow_up_required || false,
      follow_up_date: lead?.follow_up_date ? new Date(lead.follow_up_date).toISOString().split('T')[0] : '',
      follow_up_time: lead?.follow_up_time || '',
      follow_up_status: lead?.follow_up_status || 'Pending'
    });
    setShowCallLogModal(true);
  }

  async function updateFollowUpStatus(newStatus) {
    try {
      await apiPatch(`/leads/${id}`, {
        follow_up_status: newStatus
      });
      toast.success('Follow-up status updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update follow-up status');
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

  if(!lead) return (
    <div className="page">
      <div className="card">
        <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>Lead not found</p>
      </div>
    </div>
  );

  const getStatusBadgeClass = (status) => {
    const statusLower = status?.toLowerCase().replace(/\s+/g, '-') || '';
    // Map statuses to badge classes per spec
    if (statusLower === 'new') return 'badge status-new';
    if (statusLower === 'contacted') return 'badge status-contacted';
    if (statusLower === 'qualified') return 'badge status-qualified';
    if (statusLower === 'proposal-sent') return 'badge status-proposal-sent';
    if (statusLower === 'in-discussion') return 'badge status-in-discussion';
    if (statusLower === 'closed-won') return 'badge status-closed-won';
    if (statusLower === 'closed-lost') return 'badge status-closed-lost';
    return 'badge status-new'; // Default to New
  };

  return (
    <div className="page">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Lead Details</h1>
        <p style={{ color: '#666', fontSize: '14px' }}>View and manage lead information</p>
      </div>

      <motion.div 
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: '20px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0' }}>{lead.name}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666' }}>
                <Mail size={16} />
                <span>{lead.email}</span>
              </div>
              {lead.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666' }}>
                  <Phone size={16} />
                  <span>{lead.phone}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666' }}>
                <Building size={16} />
                <span>{lead.company}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isEditingStatus ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={leadStatus}
                  onChange={(e) => setLeadStatus(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--gray-200)' }}
                >
                  {statusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <button 
                  className="btn primary" 
                  onClick={updateLeadStatus}
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Save size={14} />
                  Save
                </button>
                <button 
                  className="btn secondary" 
                  onClick={() => {
                    setIsEditingStatus(false);
                    setLeadStatus(lead.status);
                  }}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <span className={getStatusBadgeClass(lead.status)}>{lead.status}</span>
                {canEditStatus && (
                  <button 
                    className="btn secondary" 
                    onClick={() => {
                      setIsEditingStatus(true);
                      setLeadStatus(lead.status);
                    }}
                    style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Edit2 size={14} />
                    Change Status
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          padding: '16px',
          background: 'var(--gray-100)',
          borderRadius: '8px'
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={14} />
              Source Type
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>{lead.source_type || '-'}</div>
          </div>
          {lead.source && (
            <div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag size={14} />
                Source
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{lead.source}</div>
            </div>
          )}
          {lead.stage && (
            <div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag size={14} />
                Stage
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{lead.stage}</div>
            </div>
          )}
          {lead.designation && (
            <div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} />
                Designation
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{lead.designation}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} />
              Assigned
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>{lead.assigned}</div>
          </div>
        </div>
      </motion.div>


      <motion.div 
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ marginBottom: '20px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <MessageSquare size={20} color="#1E73FF" />
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Comments</h3>
        </div>

        {canAddComments && (
          <div style={{ 
            padding: '20px', 
            background: 'var(--gray-100)', 
            borderRadius: '12px',
            marginBottom: '24px'
          }}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Add Comment</label>
              <textarea
                placeholder="Add a comment to track interactions with this lead..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn primary" 
                onClick={addComment}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Send size={16} />
                Add Comment
              </button>
            </div>
          </div>
        )}

        {comments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>No comments yet</p>
          </div>
        ) : (
          <div className="timeline">
            {comments.slice().reverse().map((c, index) => (
              <motion.div
                key={c.id}
                className="timeline-item"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="timeline-content">
                  <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <Calendar size={12} />
                    {format(new Date(c.timestamp), 'MMM dd, yyyy HH:mm')}
                  </div>
                  <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>{c.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>


      {/* Call History Section */}
      <motion.div 
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        style={{ marginBottom: '20px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PhoneCall size={20} color="#1E73FF" />
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Call History</h3>
          </div>
          {canAddComments && (
            <button 
              className="btn primary" 
              onClick={openNewCallLog}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <PhoneCall size={16} />
              Log a Call
            </button>
          )}
        </div>

        {callLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <PhoneCall size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>No call logs yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {callLogs.map((log) => (
              <motion.div
                key={log.id}
                style={{
                  padding: '16px',
                  border: '1px solid var(--gray-200)',
                  borderRadius: '8px',
                  background: log.is_completed ? '#F8F9FB' : log.is_cancelled ? '#FFF5F5' : '#fff'
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '16px' }}>
                        {log.activity_type || 'Call/Meeting'}
                      </span>
                      {log.stage && (
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#1E73FF20',
                          color: '#1E73FF'
                        }}>
                          Stage: {log.stage}
                        </span>
                      )}
                      {log.is_completed && (
                        <CheckCircle2 size={16} color="#28C76F" />
                      )}
                      {log.is_cancelled && (
                        <XCircle size={16} color="#EA5455" />
                      )}
                    </div>
                    {log.meeting_date && (
                      <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>
                        {format(new Date(log.meeting_date), 'MMM dd, yyyy HH:mm')}
                      </div>
                    )}
                    {log.objective && (
                      <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                        <strong>Objective:</strong> {log.objective}
                      </div>
                    )}
                    {log.post_meeting_notes && (
                      <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
                        <strong>Post Meeting Notes:</strong> {log.post_meeting_notes}
                      </div>
                    )}
                    {log.dollar_value && (
                      <div style={{ fontSize: '14px', color: '#666', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <DollarSign size={14} />
                        <strong>Value:</strong> ${log.dollar_value.toLocaleString()}
                      </div>
                    )}
                    {log.secured_order && (
                      <div style={{ fontSize: '14px', color: '#28C76F', marginTop: '8px', fontWeight: 600 }}>
                        ✓ Secured Order
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ViewButton log={log} onView={openViewCallLog} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditCallLog(log);
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid var(--gray-200)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#1E73FF';
                        e.currentTarget.style.background = '#F8F9FB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--gray-200)';
                        e.currentTarget.style.background = 'none';
                      }}
                    >
                      <Edit2 size={14} color="#666" />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#666' }}>Edit</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Follow-ups History Section */}
      <motion.div 
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <Bell size={20} color="#1E73FF" />
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Follow-ups History</h3>
        </div>

        {(() => {
          // Get follow-ups from call logs where follow-up was required
          // Since follow-ups are stored on the lead, we'll show the lead's follow-up info
          // along with the associated call log that created it
          const followUpsFromCallLogs = callLogs
            .filter(log => {
              // Check if this call log's date matches when follow-up was set
              // We'll show follow-ups for leads that have follow_up_required=true
              return lead?.follow_up_required && lead?.follow_up_date;
            })
            .map(log => {
              const logDate = new Date(log.meeting_date);
              return {
                ...log,
                follow_up_date: lead.follow_up_date,
                follow_up_time: lead.follow_up_time || '09:00',
                is_follow_up: true
              };
            });

          // If lead has follow-up required, show it
          const hasFollowUp = lead?.follow_up_required && lead?.follow_up_date;
          
          if (!hasFollowUp && followUpsFromCallLogs.length === 0) {
            return (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <Bell size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>No follow-ups scheduled</p>
                <p style={{ fontSize: '12px', marginTop: '8px', color: '#999' }}>
                  Set follow-ups when logging a call
                </p>
              </div>
            );
          }

          // Find the most recent call log that might have set this follow-up
          const mostRecentCallLog = callLogs.length > 0 ? callLogs[callLogs.length - 1] : null;
          
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {hasFollowUp && (
                <motion.div
                  key="current-follow-up"
                  style={{
                    padding: '16px',
                    border: '1px solid #1E73FF',
                    borderRadius: '8px',
                    background: '#E7F0FF'
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Bell size={18} color="#1E73FF" />
                      <span style={{ fontWeight: 600, fontSize: '16px', color: '#1E73FF' }}>
                        Follow-up Required
                      </span>
                    </div>
                    {/* Follow-up Status - Read-only display (can only be changed from Calendar) */}
                    <span style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      background: lead?.follow_up_status === 'Completed' ? '#28C76F20' : 
                                 lead?.follow_up_status === 'Cancelled' ? '#EA545520' : '#1E73FF20',
                      color: lead?.follow_up_status === 'Completed' ? '#28C76F' : 
                             lead?.follow_up_status === 'Cancelled' ? '#EA5455' : '#1E73FF',
                      fontWeight: 600
                    }}>
                      {lead?.follow_up_status || 'Pending'}
                    </span>
                    {/* Status can only be changed from Calendar page */}
                    {/* <select
                      value={lead?.follow_up_status || 'Pending'}
                      onChange={(e) => updateFollowUpStatus(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        border: '1px solid var(--gray-200)',
                        borderRadius: '6px',
                        background: '#fff',
                        cursor: 'pointer',
                        fontWeight: 600,
                        color: lead?.follow_up_status === 'Completed' ? '#28C76F' : 
                               lead?.follow_up_status === 'Cancelled' ? '#EA5455' : '#1E73FF'
                      }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select> */}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', marginLeft: '30px', marginBottom: '8px' }}>
                    <strong>Scheduled for:</strong> {format(new Date(lead.follow_up_date), 'MMM dd, yyyy')}
                    {lead.follow_up_time && (
                      <span> at {lead.follow_up_time}</span>
                    )}
                  </div>
                  {mostRecentCallLog && (
                    <div style={{ fontSize: '12px', color: '#666', marginLeft: '30px', marginTop: '8px', fontStyle: 'italic' }}>
                      Set from: <strong>{mostRecentCallLog.activity_type || 'Call/Meeting'}</strong> on {format(new Date(mostRecentCallLog.meeting_date), 'MMM dd, yyyy')}
                      {mostRecentCallLog.objective && (
                        <span> - {mostRecentCallLog.objective}</span>
                      )}
                    </div>
                  )}
                  <div style={{ marginTop: '12px', marginLeft: '30px' }}>
                    <button
                      onClick={async () => {
                        if (confirm('Clear this follow-up?')) {
                          const updated = await apiPatch(`/leads/${id}`, { 
                            follow_up_required: false,
                            follow_up_date: null,
                            follow_up_time: null,
                            follow_up_status: null
                          });
                          setLead(updated);
                          toast.success('Follow-up cleared');
                        }
                      }}
                      className="btn secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      Clear Follow-up
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          );
        })()}
      </motion.div>


      {/* Call Log Modal */}
      {showCallLogModal && (
        <div 
          className="modal-overlay" 
          onClick={() => {
            setShowCallLogModal(false);
            setEditingCallLog(null);
          }}
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
              maxWidth: '800px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                {editingCallLog ? 'Edit Call Log' : 'Log a Call/Meeting'}
              </h3>
              <button
                onClick={() => {
                  setShowCallLogModal(false);
                  setEditingCallLog(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  color: '#666',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label>Activity Type</label>
                <select
                  value={callLogForm.activity_type}
                  onChange={(e) => setCallLogForm({ ...callLogForm, activity_type: e.target.value })}
                >
                  <option value="">Select activity type</option>
                  <option value="Face to Face (In Person)">Face to Face (In Person)</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="Video Call">Video Call</option>
                  <option value="Email">Email</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Stage</label>
                <select
                  value={callLogForm.stage}
                  onChange={(e) => setCallLogForm({ ...callLogForm, stage: e.target.value })}
                >
                  <option value="">Select a Stage</option>
                  <option value="A">A - Exploring</option>
                  <option value="B">B - Interested</option>
                  <option value="C">C - Developing Solutions</option>
                  <option value="D">D - Evaluating</option>
                  <option value="E">E - Resolving Issues</option>
                  <option value="F">F - Finalizing</option>
                  <option value="G">G - WON</option>
                  <option value="H">H - Lost/Cancelled/On Hold</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label>Meeting Date *</label>
                <input
                  type="date"
                  value={callLogForm.meeting_date}
                  onChange={(e) => setCallLogForm({ ...callLogForm, meeting_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Meeting Time
                  <Clock size={14} color="#666" style={{ opacity: 0.7 }} />
                </label>
                <input
                  type="time"
                  value={callLogForm.meeting_time}
                  onChange={(e) => setCallLogForm({ ...callLogForm, meeting_time: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid var(--gray-200)',
                    borderRadius: '8px',
                    background: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
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
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Objective</label>
              <input
                type="text"
                value={callLogForm.objective}
                onChange={(e) => setCallLogForm({ ...callLogForm, objective: e.target.value })}
                placeholder="Meeting objective"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Planning Notes</label>
              <textarea
                value={callLogForm.planning_notes}
                onChange={(e) => setCallLogForm({ ...callLogForm, planning_notes: e.target.value })}
                placeholder="Notes before the meeting"
                rows={3}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label>Secured Order?</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={callLogForm.secured_order}
                    onChange={(e) => setCallLogForm({ ...callLogForm, secured_order: e.target.checked })}
                  />
                  <span>Yes</span>
                </label>
              </div>
              <div className="form-group">
                <label>Project Value ($)</label>
                <input
                  type="number"
                  value={callLogForm.dollar_value}
                  onChange={(e) => setCallLogForm({ ...callLogForm, dollar_value: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  style={{ textAlign: 'right' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Challenges</label>
              <textarea
                value={callLogForm.challenges}
                onChange={(e) => setCallLogForm({ ...callLogForm, challenges: e.target.value })}
                placeholder="Any challenges encountered"
                rows={3}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Post Meeting Notes</label>
              <textarea
                value={callLogForm.post_meeting_notes}
                onChange={(e) => setCallLogForm({ ...callLogForm, post_meeting_notes: e.target.value })}
                placeholder="Notes after the meeting"
                rows={4}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Follow-Up Notes</label>
              <textarea
                value={callLogForm.follow_up_notes}
                onChange={(e) => setCallLogForm({ ...callLogForm, follow_up_notes: e.target.value })}
                placeholder="Follow-up action items"
                rows={3}
              />
            </div>

            {/* Follow-Up Required Card */}
            <div style={{ 
              padding: '20px', 
              background: 'var(--gray-100)', 
              borderRadius: '12px',
              border: '1px solid var(--gray-200)',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Bell size={18} color="#1E73FF" />
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Follow-Up Required?</h4>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={callLogForm.follow_up_required}
                    onChange={(e) => setCallLogForm({ ...callLogForm, follow_up_required: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>Mark this lead as requiring follow-up</span>
                </label>

                {callLogForm.follow_up_required && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Follow-up Date</label>
                        <input
                          type="date"
                          value={callLogForm.follow_up_date}
                          onChange={(e) => setCallLogForm({ ...callLogForm, follow_up_date: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            fontSize: '14px',
                            border: '1px solid var(--gray-200)',
                            borderRadius: '8px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Follow-up Time</label>
                        <input
                          type="time"
                          value={callLogForm.follow_up_time}
                          onChange={(e) => setCallLogForm({ ...callLogForm, follow_up_time: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            fontSize: '14px',
                            border: '1px solid var(--gray-200)',
                            borderRadius: '8px'
                          }}
                        />
                      </div>
                    </div>
                    {/* Follow-up Status - Read-only display (can only be changed from Calendar) */}
                    {/* <div>
                      <label style={{ fontSize: '12px', color: '#666', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Follow-up Status</label>
                      <select
                        value={callLogForm.follow_up_status || 'Pending'}
                        onChange={(e) => setCallLogForm({ ...callLogForm, follow_up_status: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          border: '1px solid var(--gray-200)',
                          borderRadius: '8px',
                          background: '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div> */}
                    {lead?.follow_up_status && (
                      <div>
                        <label style={{ fontSize: '12px', color: '#666', marginBottom: '6px', display: 'block', fontWeight: 600 }}>Follow-up Status</label>
                        <div style={{
                          width: '100%',
                          padding: '10px 12px',
                          fontSize: '14px',
                          border: '1px solid var(--gray-200)',
                          borderRadius: '8px',
                          background: '#f8f9fb',
                          color: lead.follow_up_status === 'Completed' ? '#28C76F' : 
                                 lead.follow_up_status === 'Cancelled' ? '#EA5455' : '#1E73FF',
                          fontWeight: 600
                        }}>
                          {lead.follow_up_status}
                        </div>
                        <p style={{ fontSize: '11px', color: '#999', marginTop: '4px', fontStyle: 'italic' }}>
                          Status can be changed from Calendar page
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                cursor: callLogForm.is_cancelled ? 'not-allowed' : 'pointer',
                opacity: callLogForm.is_cancelled ? 0.5 : 1,
                transition: 'opacity 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  checked={callLogForm.is_completed}
                  disabled={callLogForm.is_cancelled}
                  onChange={(e) => {
                    if (!callLogForm.is_cancelled) {
                      setCallLogForm({ 
                        ...callLogForm, 
                        is_completed: e.target.checked,
                        is_cancelled: false
                      });
                    }
                  }}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: callLogForm.is_cancelled ? 'not-allowed' : 'pointer',
                    opacity: callLogForm.is_cancelled ? 0.5 : 1
                  }}
                />
                <span style={{ 
                  color: callLogForm.is_completed ? '#28C76F' : '#333',
                  fontWeight: callLogForm.is_completed ? 600 : 400
                }}>
                  Mark meeting as complete
                </span>
              </label>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                cursor: callLogForm.is_completed ? 'not-allowed' : 'pointer',
                opacity: callLogForm.is_completed ? 0.5 : 1,
                transition: 'opacity 0.2s ease'
              }}>
                <input
                  type="checkbox"
                  checked={callLogForm.is_cancelled}
                  disabled={callLogForm.is_completed}
                  onChange={(e) => {
                    if (!callLogForm.is_completed) {
                      setCallLogForm({ 
                        ...callLogForm, 
                        is_cancelled: e.target.checked,
                        is_completed: false
                      });
                    }
                  }}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: callLogForm.is_completed ? 'not-allowed' : 'pointer',
                    opacity: callLogForm.is_completed ? 0.5 : 1
                  }}
                />
                <span style={{ 
                  color: callLogForm.is_cancelled ? '#EA5455' : '#333',
                  fontWeight: callLogForm.is_cancelled ? 600 : 400
                }}>
                  Cancel Meeting
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="btn secondary" 
                onClick={() => {
                  setShowCallLogModal(false);
                  setEditingCallLog(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="btn primary" 
                onClick={saveCallLog}
              >
                {editingCallLog ? 'Update' : 'Save'} Call Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Call Log Modal */}
      {showViewModal && viewingCallLog && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowViewModal(false)}
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
              maxWidth: '800px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Call Log Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  color: '#666',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Basic Information */}
              <div style={{ 
                padding: '16px', 
                background: 'var(--gray-100)', 
                borderRadius: '8px',
                border: '1px solid var(--gray-200)'
              }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#333' }}>Basic Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block', fontWeight: 600 }}>Activity Type</label>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>
                      {viewingCallLog.activity_type || '-'}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block', fontWeight: 600 }}>Stage</label>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>
                      {viewingCallLog.stage ? `${viewingCallLog.stage} - ${getStageLabel(viewingCallLog.stage)}` : '-'}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block', fontWeight: 600 }}>Meeting Date</label>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>
                      {viewingCallLog.meeting_date ? format(new Date(viewingCallLog.meeting_date), 'MMM dd, yyyy') : '-'}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block', fontWeight: 600 }}>Meeting Time</label>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>
                      {viewingCallLog.meeting_date ? format(new Date(viewingCallLog.meeting_date), 'HH:mm') : '-'}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block', fontWeight: 600 }}>Status</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {viewingCallLog.is_completed ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#28C76F', fontWeight: 600 }}>
                          <CheckCircle2 size={14} /> Completed
                        </span>
                      ) : viewingCallLog.is_cancelled ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#EA5455', fontWeight: 600 }}>
                          <XCircle size={14} /> Cancelled
                        </span>
                      ) : (
                        <span style={{ color: '#FF9F43', fontWeight: 600 }}>Pending</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Objective */}
              {viewingCallLog.objective && (
                <div>
                  <label style={{ fontSize: '12px', color: '#666', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Objective</label>
                  <div style={{ 
                    padding: '12px', 
                    background: '#fff', 
                    borderRadius: '8px',
                    border: '1px solid var(--gray-200)',
                    fontSize: '14px',
                    color: '#333'
                  }}>
                    {viewingCallLog.objective}
                  </div>
                </div>
              )}

              {/* Planning Notes */}
              {viewingCallLog.planning_notes && (
                <div>
                  <label style={{ fontSize: '12px', color: '#666', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Planning Notes</label>
                  <div style={{ 
                    padding: '12px', 
                    background: '#fff', 
                    borderRadius: '8px',
                    border: '1px solid var(--gray-200)',
                    fontSize: '14px',
                    color: '#333',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {viewingCallLog.planning_notes}
                  </div>
                </div>
              )}

              {/* Post Meeting Notes */}
              {viewingCallLog.post_meeting_notes && (
                <div>
                  <label style={{ fontSize: '12px', color: '#666', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Post Meeting Notes</label>
                  <div style={{ 
                    padding: '12px', 
                    background: '#fff', 
                    borderRadius: '8px',
                    border: '1px solid var(--gray-200)',
                    fontSize: '14px',
                    color: '#333',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {viewingCallLog.post_meeting_notes}
                  </div>
                </div>
              )}

              {/* Follow-Up Notes */}
              {viewingCallLog.follow_up_notes && (
                <div>
                  <label style={{ fontSize: '12px', color: '#666', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Follow-Up Notes</label>
                  <div style={{ 
                    padding: '12px', 
                    background: '#fff', 
                    borderRadius: '8px',
                    border: '1px solid var(--gray-200)',
                    fontSize: '14px',
                    color: '#333',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {viewingCallLog.follow_up_notes}
                  </div>
                </div>
              )}

              {/* Challenges */}
              {viewingCallLog.challenges && (
                <div>
                  <label style={{ fontSize: '12px', color: '#666', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Challenges</label>
                  <div style={{ 
                    padding: '12px', 
                    background: '#fff', 
                    borderRadius: '8px',
                    border: '1px solid var(--gray-200)',
                    fontSize: '14px',
                    color: '#333',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {viewingCallLog.challenges}
                  </div>
                </div>
              )}

              {/* Financial Information */}
              {(viewingCallLog.dollar_value || viewingCallLog.secured_order) && (
                <div style={{ 
                  padding: '16px', 
                  background: '#E8FBEF', 
                  borderRadius: '8px',
                  border: '1px solid #28C76F'
                }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#333' }}>Financial Information</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {viewingCallLog.dollar_value && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DollarSign size={16} color="#28C76F" />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>
                          Dollar Value: <span style={{ color: '#28C76F' }}>${viewingCallLog.dollar_value.toLocaleString()}</span>
                        </span>
                      </div>
                    )}
                    {viewingCallLog.secured_order && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={16} color="#28C76F" />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#28C76F' }}>
                          Secured Order
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Scheduled Follow-Up */}
              {lead?.follow_up_required && lead?.follow_up_date && (
                <div style={{ 
                  padding: '16px', 
                  background: '#E7F0FF', 
                  borderRadius: '8px',
                  border: '1px solid #1E73FF'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Bell size={18} color="#1E73FF" />
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1E73FF' }}>Scheduled Follow-Up</h4>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={16} color="#1E73FF" />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>
                        Date: <span style={{ color: '#1E73FF' }}>{format(new Date(lead.follow_up_date), 'MMM dd, yyyy')}</span>
                      </span>
                    </div>
                    {lead.follow_up_time && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={16} color="#1E73FF" />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>
                          Time: <span style={{ color: '#1E73FF' }}>{lead.follow_up_time}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--gray-200)' }}>
              <button 
                className="btn secondary" 
                onClick={() => setShowViewModal(false)}
              >
                Close
              </button>
              <button 
                className="btn primary" 
                onClick={() => {
                  setShowViewModal(false);
                  openEditCallLog(viewingCallLog);
                }}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getStageLabel(stage) {
  const stageLabels = {
    'A': 'Exploring',
    'B': 'Interested',
    'C': 'Developing Solutions',
    'D': 'Evaluating',
    'E': 'Resolving Issues',
    'F': 'Finalizing',
    'G': 'WON',
    'H': 'Lost/Cancelled/On Hold'
  };
  return stageLabels[stage] || stage;
}
