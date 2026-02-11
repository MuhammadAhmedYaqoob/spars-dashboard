'use client';
import { useEffect, useState } from 'react';
import React from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle, Plus, Filter, List, Grid, Bell, AlertCircle, PhoneCall, Trash2 } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/utils/api';
import { useAuth } from '@/app/components/AuthProvider';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, startOfDay, endOfDay, isSameWeek } from 'date-fns';

export default function CalendarPage() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [leads, setLeads] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterCompleted, setFilterCompleted] = useState(false);
  const [viewMode, setViewMode] = useState('month'); // 'day' | 'week' | 'month'
  const [showAllReminders, setShowAllReminders] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: '',
    due_date: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
    lead_id: null
  });

  useEffect(() => {
    loadCalendarData();
  }, [filterCompleted]);

  async function loadCalendarData() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCompleted) {
        params.append('completed', 'false');
      }
      
      // Load reminders, leads with follow-ups, and call logs
      const [remindersData, leadsData, callLogsData] = await Promise.all([
        apiGet(`/reminders?${params.toString()}`).catch(() => []),
        apiGet('/leads').catch(() => []),
        apiGet('/call-logs').catch(() => [])
      ]);
      
      setReminders(remindersData);
      setLeads(leadsData);
      setCallLogs(callLogsData);
    } catch (error) {
      toast.error('Failed to load calendar data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function createReminder() {
    if (!newReminder.title || !newReminder.due_date) {
      toast.error('Title and due date are required');
      return;
    }

    try {
      await apiPost('/reminders', {
        ...newReminder,
        user_id: user.id
      });
      toast.success('Reminder created');
      setShowCreateModal(false);
      setNewReminder({ title: '', due_date: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'), lead_id: null });
      loadCalendarData();
    } catch (error) {
      toast.error('Failed to create reminder');
      console.error(error);
    }
  }

  async function toggleComplete(reminder) {
    try {
      const newCompletedStatus = !reminder.completed;
      const newStatus = newCompletedStatus ? 'Completed' : 'Pending';
      
      await apiPatch(`/reminders/${reminder.id}`, {
        completed: newCompletedStatus,
        status: newStatus
      });
      toast.success(reminder.completed ? 'Reminder marked as incomplete' : 'Reminder completed');
      loadCalendarData();
    } catch (error) {
      toast.error('Failed to update reminder');
      console.error(error);
    }
  }

  async function deleteReminder(reminderId) {
    if (!confirm('Are you sure you want to delete this reminder?')) {
      return;
    }
    try {
      await apiDelete(`/reminders/${reminderId}`);
      toast.success('Reminder deleted');
      loadCalendarData();
    } catch (error) {
      toast.error('Failed to delete reminder');
      console.error(error);
    }
  }

  async function updateCallLogStatus(callLogId, status) {
    try {
      const updateData = {
        is_completed: status === 'Completed',
        is_cancelled: status === 'Cancelled'
      };
      // Ensure both are false when status is Pending
      if (status === 'Pending') {
        updateData.is_completed = false;
        updateData.is_cancelled = false;
      }
      await apiPatch(`/call-logs/${callLogId}`, updateData);
      toast.success('Call log status updated');
      loadCalendarData();
    } catch (error) {
      toast.error('Failed to update call log status');
      console.error(error);
    }
  }

  async function updateFollowUpStatus(leadId, status) {
    try {
      if (status === 'Clear') {
        await apiPatch(`/leads/${leadId}`, {
          follow_up_required: false,
          follow_up_date: null,
          follow_up_time: null,
          follow_up_status: null
        });
        toast.success('Follow-up cleared');
      } else {
        await apiPatch(`/leads/${leadId}`, {
          follow_up_status: status
        });
        toast.success('Follow-up status updated');
      }
      loadCalendarData();
    } catch (error) {
      toast.error('Failed to update follow-up');
      console.error(error);
    }
  }

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get reminders for a specific date (includes reminders, follow-ups, and call logs)
  const getRemindersForDate = (date) => {
    const items = [];
    
    // Add reminders
    reminders.forEach(r => {
      const reminderDate = new Date(r.due_date);
      if (isSameDay(reminderDate, date)) {
        items.push({ ...r, type: 'reminder' });
      }
    });
    
    // Add lead follow-ups
    leads.forEach(lead => {
      if (lead.follow_up_required && lead.follow_up_date) {
        const followUpDate = new Date(lead.follow_up_date);
        if (isSameDay(followUpDate, date)) {
          items.push({
            id: `lead-${lead.id}`,
            title: `Follow-up: ${lead.name}`,
            due_date: lead.follow_up_time 
              ? new Date(`${lead.follow_up_date}T${lead.follow_up_time}`).toISOString()
              : new Date(`${lead.follow_up_date}T09:00`).toISOString(),
            lead_id: lead.id,
            type: 'follow-up',
            follow_up_status: lead.follow_up_status || 'Pending'
          });
        }
      }
    });
    
    // Add call logs
    callLogs.forEach(log => {
      if (log.meeting_date) {
        const meetingDate = new Date(log.meeting_date);
        if (isSameDay(meetingDate, date)) {
          items.push({
            id: `call-${log.id}`,
            title: log.activity_type || `Call: ${log.objective || 'Meeting'}`,
            due_date: log.meeting_date,
            lead_id: log.lead_id,
            type: 'call-log',
            is_completed: log.is_completed,
            is_cancelled: log.is_cancelled
          });
        }
      }
    });
    
    return items;
  };

  const getRemindersForSelectedDate = () => {
    return getRemindersForDate(selectedDate);
  };

  // Get reminders for a week
  const getRemindersForWeek = (startDate) => {
    const weekStart = startOfWeek(startDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(startDate, { weekStartsOn: 0 });
    const items = [];
    
    reminders.forEach(r => {
      const reminderDate = new Date(r.due_date);
      if (reminderDate >= weekStart && reminderDate <= weekEnd) {
        items.push({ ...r, type: 'reminder' });
      }
    });
    
    leads.forEach(lead => {
      if (lead.follow_up_required && lead.follow_up_date) {
        const followUpDate = new Date(lead.follow_up_date);
        if (followUpDate >= weekStart && followUpDate <= weekEnd) {
          items.push({
            id: `lead-${lead.id}`,
            title: `Follow-up: ${lead.name}`,
            due_date: lead.follow_up_time 
              ? new Date(`${lead.follow_up_date}T${lead.follow_up_time}`).toISOString()
              : new Date(`${lead.follow_up_date}T09:00`).toISOString(),
            lead_id: lead.id,
            type: 'follow-up',
            follow_up_status: lead.follow_up_status || 'Pending'
          });
        }
      }
    });
    
    callLogs.forEach(log => {
      if (log.meeting_date) {
        const meetingDate = new Date(log.meeting_date);
        if (meetingDate >= weekStart && meetingDate <= weekEnd) {
          items.push({
            id: `call-${log.id}`,
            title: log.activity_type || `Call: ${log.objective || 'Meeting'}`,
            due_date: log.meeting_date,
            lead_id: log.lead_id,
            type: 'call-log',
            is_completed: log.is_completed,
            is_cancelled: log.is_cancelled
          });
        }
      }
    });
    
    return items;
  };

  // Get all reminders (for list view)
  const getAllReminders = () => {
    const items = [];
    
    // Add reminders
    reminders.forEach(r => {
      if (!filterCompleted || !r.completed) {
        items.push({ ...r, type: 'reminder' });
      }
    });
    
    // Add lead follow-ups
    leads.forEach(lead => {
      if (lead.follow_up_required && lead.follow_up_date) {
        items.push({
          id: `lead-${lead.id}`,
          title: `Follow-up: ${lead.name}`,
          due_date: lead.follow_up_time 
            ? new Date(`${lead.follow_up_date}T${lead.follow_up_time}`).toISOString()
            : new Date(`${lead.follow_up_date}T09:00`).toISOString(),
          lead_id: lead.id,
          type: 'follow-up',
          follow_up_status: lead.follow_up_status || 'Pending',
          completed: false
        });
      }
    });
    
    // Add call logs
    callLogs.forEach(log => {
      if (log.meeting_date) {
        items.push({
          id: `call-${log.id}`,
          title: log.activity_type || `Call: ${log.objective || 'Meeting'}`,
          due_date: log.meeting_date,
          lead_id: log.lead_id,
          type: 'call-log',
          completed: log.is_completed,
          is_completed: log.is_completed,
          is_cancelled: log.is_cancelled
        });
      }
    });
    
    return items.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  };

  // Get reminders for a day (for day view)
  const getRemindersForDayView = (date) => {
    return getRemindersForDate(date).sort((a, b) => {
      const timeA = new Date(a.due_date).getTime();
      const timeB = new Date(b.due_date).getTime();
      return timeA - timeB;
    });
  };

  // Generate hours for day view
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Generate week days
  const getWeekDays = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  };

  return (
    <div className="page">
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Calendar</h1>
          <p style={{ color: '#666', fontSize: '14px' }}>View and manage your reminders and follow-ups</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--gray-100)', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => setViewMode('day')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'day' ? '#1E73FF' : 'transparent',
                color: viewMode === 'day' ? '#fff' : '#666',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: viewMode === 'day' ? 600 : 400
              }}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'week' ? '#1E73FF' : 'transparent',
                color: viewMode === 'week' ? '#fff' : '#666',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: viewMode === 'week' ? 600 : 400
              }}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: viewMode === 'month' ? '#1E73FF' : 'transparent',
                color: viewMode === 'month' ? '#fff' : '#666',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: viewMode === 'month' ? 600 : 400
              }}
            >
              Month
            </button>
          </div>
          <button
            className="btn secondary"
            onClick={() => setShowAllReminders(!showAllReminders)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {showAllReminders ? <Grid size={16} /> : <List size={16} />}
            {showAllReminders ? 'Calendar View' : 'View All'}
          </button>
          <button
            className="btn secondary"
            onClick={() => setFilterCompleted(!filterCompleted)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Filter size={16} />
            {filterCompleted ? 'Show All' : 'Hide Completed'}
          </button>
          <button
            className="btn primary"
            onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            New Reminder
          </button>
        </div>
      </div>

      {/* View All Reminders List */}
      {showAllReminders ? (
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <List size={20} color="#1E73FF" />
            <h2 style={{ fontSize: '20px', fontWeight: 600 }}>All Reminders</h2>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : getAllReminders().length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <Clock size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p>No reminders found</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getAllReminders().map(reminder => {
                const dueDate = new Date(reminder.due_date);
                const isFollowUp = reminder.type === 'follow-up';
                const isCallLog = reminder.type === 'call-log';
                const getStatusColor = (status) => {
                  if (status === 'Completed') return '#28C76F';
                  if (status === 'Cancelled') return '#EA5455';
                  if (isCallLog) return '#7367F0';
                  return isFollowUp ? '#1E73FF' : '#FF9F43';
                };
                
                return (
                  <motion.div
                    key={reminder.id}
                    className="card-hover"
                    style={{
                      padding: '16px',
                      border: `1px solid ${isCallLog ? '#7367F0' : isFollowUp ? '#1E73FF' : 'var(--gray-200)'}`,
                      borderRadius: '8px',
                      background: reminder.status === 'Completed' ? '#F8F9FB' : (isCallLog ? '#F3F0FF' : isFollowUp ? '#E7F0FF' : '#fff'),
                      borderLeft: `4px solid ${isCallLog ? '#7367F0' : isFollowUp ? '#1E73FF' : '#FF9F43'}`
                    }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          {isCallLog ? (
                            <PhoneCall size={16} color="#7367F0" />
                          ) : isFollowUp ? (
                            <Bell size={16} color="#1E73FF" />
                          ) : (
                            <Clock size={16} color={getStatusColor(reminder.status || 'Pending')} />
                          )}
                          <span style={{ fontWeight: 600, fontSize: '16px', textDecoration: reminder.status === 'Completed' ? 'line-through' : 'none' }}>
                            {reminder.title}
                          </span>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            background: isCallLog ? '#7367F020' : isFollowUp ? '#1E73FF20' : '#FF9F4320',
                            color: isCallLog ? '#7367F0' : isFollowUp ? '#1E73FF' : '#FF9F43',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {isCallLog ? 'Call/Meeting' : isFollowUp ? 'Follow-up' : 'Reminder'}
                          </span>
                          {!isCallLog && !isFollowUp && (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: `${getStatusColor(reminder.status || 'Pending')}20`,
                              color: getStatusColor(reminder.status || 'Pending')
                            }}>
                              {reminder.status || 'Pending'}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666', marginLeft: '28px', marginBottom: '4px' }}>
                          {format(dueDate, 'MMM dd, yyyy')} at {format(dueDate, 'HH:mm')}
                        </div>
                        {reminder.description && (
                          <div style={{ fontSize: '14px', color: '#666', marginLeft: '28px', marginTop: '8px' }}>
                            {reminder.description}
                          </div>
                        )}
                        {reminder.lead_id && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: isCallLog ? '#7367F0' : '#1E73FF', 
                            marginLeft: '28px', 
                            marginTop: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            background: isCallLog ? '#7367F015' : '#1E73FF15',
                            borderRadius: '4px',
                            fontWeight: 500
                          }}>
                            <AlertCircle size={12} />
                            {isCallLog ? 'Call for' : 'Follow-up for'} Lead #{reminder.lead_id}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Status Dropdown for Call Logs */}
                        {isCallLog && (
                          <select
                            value={reminder.is_completed ? 'Completed' : (reminder.is_cancelled ? 'Cancelled' : 'Pending')}
                            onChange={(e) => {
                              const callLogId = parseInt(reminder.id.replace('call-', ''));
                              updateCallLogStatus(callLogId, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--gray-200)',
                              fontSize: '12px',
                              background: '#fff',
                              cursor: 'pointer',
                              fontWeight: 600,
                              color: reminder.is_completed ? '#28C76F' : 
                                     reminder.is_cancelled ? '#EA5455' : '#7367F0'
                            }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        )}
                        
                        {/* Status Dropdown for Follow-ups */}
                        {isFollowUp && (
                          <select
                            value={reminder.follow_up_status || 'Pending'}
                            onChange={(e) => {
                              e.stopPropagation();
                              const leadId = reminder.lead_id;
                              if (leadId) {
                                updateFollowUpStatus(leadId, e.target.value);
                              } else {
                                console.error('Invalid lead ID:', reminder.lead_id);
                                toast.error('Invalid lead ID');
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--gray-200)',
                              fontSize: '12px',
                              background: '#fff',
                              cursor: 'pointer',
                              fontWeight: 600,
                              color: reminder.follow_up_status === 'Completed' ? '#28C76F' : 
                                     reminder.follow_up_status === 'Cancelled' ? '#EA5455' : '#1E73FF'
                            }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        )}
                        
                        {/* Complete/Incomplete Toggle for Reminders */}
                        {!isCallLog && !isFollowUp && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleComplete(reminder);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            {reminder.completed ? (
                              <XCircle size={18} color="#999" />
                            ) : (
                              <CheckCircle size={18} color="#28C76F" />
                            )}
                          </button>
                        )}
                        
                        {/* Delete Button for Reminders Only */}
                        {!isCallLog && !isFollowUp && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteReminder(reminder.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              color: '#EA5455'
                            }}
                            title="Delete reminder"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'day' ? '1fr' : '2fr 1fr', gap: '24px' }}>
          {/* Calendar View */}
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <button
                className="btn secondary"
                onClick={() => {
                  if (viewMode === 'day') setCurrentDate(addDays(currentDate, -1));
                  else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
                  else setCurrentDate(subMonths(currentDate, 1));
                }}
              >
                ← Prev
              </button>
              <h2 style={{ fontSize: '20px', fontWeight: 600 }}>
                {viewMode === 'day' && format(currentDate, 'EEEE, MMMM dd, yyyy')}
                {viewMode === 'week' && `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'MMM dd')} - ${format(endOfWeek(currentDate, { weekStartsOn: 0 }), 'MMM dd, yyyy')}`}
                {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
              </h2>
              <button
                className="btn secondary"
                onClick={() => {
                  if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
                  else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
                  else setCurrentDate(addMonths(currentDate, 1));
                }}
              >
                Next →
              </button>
            </div>

          {/* Day View */}
          {viewMode === 'day' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
              {hours.map(hour => {
                const hourDate = new Date(currentDate);
                hourDate.setHours(hour, 0, 0, 0);
                const hourReminders = getRemindersForDayView(currentDate).filter(r => {
                  const reminderHour = new Date(r.due_date).getHours();
                  return reminderHour === hour;
                });
                
                return (
                  <div key={hour} style={{ display: 'flex', gap: '12px', minHeight: '60px' }}>
                    <div style={{ width: '60px', textAlign: 'right', paddingTop: '8px', fontSize: '12px', color: '#666' }}>
                      {String(hour).padStart(2, '0')}:00
                    </div>
                    <div style={{ flex: 1, borderTop: '1px solid var(--gray-200)', paddingTop: '8px' }}>
                      {hourReminders.map(reminder => {
                        const isFollowUp = reminder.type === 'follow-up' || (reminder.lead_id !== null && reminder.lead_id !== undefined);
                        const isCallLog = reminder.type === 'call-log';
                        const getStatusColor = (status) => {
                          if (status === 'Completed') return '#28C76F';
                          if (status === 'Cancelled') return '#EA5455';
                          if (isCallLog) return '#7367F0';
                          return isFollowUp ? '#1E73FF' : '#FF9F43';
                        };
                        return (
                          <div
                            key={reminder.id}
                            style={{
                              padding: '8px 12px',
                              background: isCallLog ? '#F3F0FF' : isFollowUp ? '#E7F0FF' : `${getStatusColor(reminder.status || 'Pending')}15`,
                              borderLeft: `3px solid ${isCallLog ? '#7367F0' : isFollowUp ? '#1E73FF' : getStatusColor(reminder.status || 'Pending')}`,
                              borderRadius: '4px',
                              marginBottom: '4px',
                              fontSize: '14px',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            {isCallLog ? <PhoneCall size={14} color="#7367F0" /> : isFollowUp ? <Bell size={14} color="#1E73FF" /> : <Clock size={14} color="#FF9F43" />}
                            <span>{format(new Date(reminder.due_date), 'HH:mm')} - {reminder.title}</span>
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              background: isCallLog ? '#7367F020' : isFollowUp ? '#1E73FF20' : '#FF9F4320',
                              color: isCallLog ? '#7367F0' : isFollowUp ? '#1E73FF' : '#FF9F43',
                              fontWeight: 600,
                              textTransform: 'uppercase'
                            }}>
                              {isCallLog ? 'Call/Meeting' : isFollowUp ? 'Follow-up' : 'Reminder'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Week View */}
          {viewMode === 'week' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', gap: '8px', marginBottom: '16px' }}>
                <div></div>
                {getWeekDays().map((day, idx) => (
                  <div key={idx} style={{ textAlign: 'center', fontWeight: 600, color: '#666', padding: '8px' }}>
                    <div style={{ fontSize: '12px' }}>{format(day, 'EEE')}</div>
                    <div style={{ fontSize: '16px', color: isSameDay(day, new Date()) ? '#1E73FF' : '#333' }}>
                      {format(day, 'd')}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', gap: '8px' }}>
                {hours.map(hour => (
                  <React.Fragment key={hour}>
                    <div style={{ textAlign: 'right', paddingTop: '8px', fontSize: '12px', color: '#666' }}>
                      {String(hour).padStart(2, '0')}:00
                    </div>
                    {getWeekDays().map((day, dayIdx) => {
                      const hourDate = new Date(day);
                      hourDate.setHours(hour, 0, 0, 0);
                      const hourReminders = getRemindersForDate(day).filter(r => {
                        const reminderHour = new Date(r.due_date).getHours();
                        return reminderHour === hour;
                      });
                      
                      return (
                        <div
                          key={dayIdx}
                          style={{
                            border: '1px solid var(--gray-200)',
                            borderRadius: '4px',
                            padding: '4px',
                            minHeight: '40px',
                            background: isSameDay(day, new Date()) ? '#F0F9FF' : '#fff'
                          }}
                        >
                          {hourReminders.map(reminder => {
                            const isFollowUp = reminder.type === 'follow-up' || (reminder.lead_id !== null && reminder.lead_id !== undefined);
                            const isCallLog = reminder.type === 'call-log';
                            const getStatusColor = (status) => {
                              if (status === 'Completed') return '#28C76F';
                              if (status === 'Cancelled') return '#EA5455';
                              if (isCallLog) return '#7367F0';
                              return isFollowUp ? '#1E73FF' : '#FF9F43';
                            };
                            return (
                              <div
                                key={reminder.id}
                                style={{
                                  padding: '4px 6px',
                                  background: isCallLog ? '#F3F0FF' : isFollowUp ? '#E7F0FF' : `${getStatusColor(reminder.status || 'Pending')}20`,
                                  borderLeft: `2px solid ${isCallLog ? '#7367F0' : isFollowUp ? '#1E73FF' : getStatusColor(reminder.status || 'Pending')}`,
                                  borderRadius: '3px',
                                  marginBottom: '2px',
                                  fontSize: '11px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                title={`${isCallLog ? 'Call/Meeting' : isFollowUp ? 'Follow-up' : 'Reminder'}: ${reminder.title}`}
                              >
                                {isCallLog ? <PhoneCall size={10} color="#7367F0" /> : isFollowUp ? <Bell size={10} color="#1E73FF" /> : <Clock size={10} color="#FF9F43" />}
                                <span>{format(new Date(reminder.due_date), 'HH:mm')} {reminder.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </>
          )}

          {/* Month View */}
          {viewMode === 'month' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '16px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} style={{ textAlign: 'center', fontWeight: 600, color: '#666', padding: '8px' }}>
                    {day}
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {daysInMonth.map((day, index) => {
                  const dayReminders = getRemindersForDate(day);
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(day)}
                      style={{
                        aspectRatio: '1',
                        border: isSelected ? '2px solid #1E73FF' : '1px solid var(--gray-200)',
                        borderRadius: '8px',
                        background: isSelected ? '#E7F0FF' : isToday ? '#F0F9FF' : '#fff',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = '#F8F9FB';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = isToday ? '#F0F9FF' : '#fff';
                      }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: isToday ? 700 : 500, color: isToday ? '#1E73FF' : '#333' }}>
                        {format(day, 'd')}
                      </span>
                      {dayReminders.length > 0 && (
                        <div style={{ marginTop: '4px', display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {dayReminders.slice(0, 3).map((r, idx) => {
                        const isFollowUp = r.type === 'follow-up' || (r.lead_id !== null && r.lead_id !== undefined);
                        const isCallLog = r.type === 'call-log';
                        return (
                          <div
                            key={idx}
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: r.completed ? '#28C76F' : (isCallLog ? '#7367F0' : isFollowUp ? '#1E73FF' : '#FF9F43'),
                              border: (isFollowUp || isCallLog) && !r.completed ? `1px solid ${isCallLog ? '#7367F0' : '#1E73FF'}` : 'none'
                            }}
                            title={isCallLog ? 'Call/Meeting' : isFollowUp ? 'Follow-up' : 'Reminder'}
                          />
                        );
                      })}
                      {dayReminders.length > 3 && (
                        <span style={{ fontSize: '10px', color: '#666' }}>+{dayReminders.length - 3}</span>
                      )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>

        {/* Selected Date Reminders - Only show for month view */}
        {viewMode === 'month' && (
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <CalendarIcon size={20} color="#1E73FF" />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                {format(selectedDate, 'MMMM dd, yyyy')}
              </h3>
            </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner"></div>
            </div>
          ) : getRemindersForSelectedDate().length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <Clock size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p>No reminders for this date</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {getRemindersForSelectedDate().map(reminder => {
                const isFollowUp = reminder.type === 'follow-up';
                const isCallLog = reminder.type === 'call-log';
                return (
                  <motion.div
                    key={reminder.id}
                    className="card-hover"
                    style={{
                      padding: '12px',
                      border: `1px solid ${isCallLog ? '#7367F0' : isFollowUp ? '#1E73FF' : 'var(--gray-200)'}`,
                      borderRadius: '8px',
                      background: reminder.completed ? '#F8F9FB' : (isCallLog ? '#F3F0FF' : isFollowUp ? '#E7F0FF' : '#fff'),
                      borderLeft: `4px solid ${isCallLog ? '#7367F0' : isFollowUp ? '#1E73FF' : '#FF9F43'}`
                    }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          {isCallLog ? (
                            <PhoneCall size={16} color="#7367F0" />
                          ) : isFollowUp ? (
                            <Bell size={16} color="#1E73FF" />
                          ) : reminder.completed ? (
                            <CheckCircle size={16} color="#28C76F" />
                          ) : (
                            <Clock size={16} color="#FF9F43" />
                          )}
                          <span style={{ fontWeight: 600, textDecoration: reminder.completed ? 'line-through' : 'none', color: reminder.completed ? '#999' : '#333' }}>
                            {reminder.title}
                          </span>
                          <span style={{
                            padding: '3px 6px',
                            borderRadius: '3px',
                            fontSize: '9px',
                            fontWeight: 600,
                            background: isCallLog ? '#7367F020' : isFollowUp ? '#1E73FF20' : '#FF9F4320',
                            color: isCallLog ? '#7367F0' : isFollowUp ? '#1E73FF' : '#FF9F43',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {isCallLog ? 'Call/Meeting' : isFollowUp ? 'Follow-up' : 'Reminder'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginLeft: '24px' }}>
                          {format(new Date(reminder.due_date), 'HH:mm')}
                        </div>
                        {reminder.lead_id && (
                          <div style={{ 
                            fontSize: '11px', 
                            color: '#1E73FF', 
                            marginLeft: '24px', 
                            marginTop: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 6px',
                            background: '#1E73FF15',
                            borderRadius: '3px',
                            fontWeight: 500
                          }}>
                            <AlertCircle size={10} />
                            Follow-up for Lead #{reminder.lead_id}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Status Dropdown for Call Logs */}
                        {isCallLog && (
                          <select
                            value={reminder.is_completed ? 'Completed' : (reminder.is_cancelled ? 'Cancelled' : 'Pending')}
                            onChange={(e) => {
                              e.stopPropagation();
                              const callLogId = parseInt(reminder.id.replace('call-', ''));
                              if (!isNaN(callLogId)) {
                                updateCallLogStatus(callLogId, e.target.value);
                              } else {
                                console.error('Invalid call log ID:', reminder.id);
                                toast.error('Invalid call log ID');
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--gray-200)',
                              fontSize: '12px',
                              background: '#fff',
                              cursor: 'pointer',
                              fontWeight: 600,
                              color: reminder.is_completed ? '#28C76F' : 
                                     reminder.is_cancelled ? '#EA5455' : '#7367F0'
                            }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        )}
                        
                        {/* Status Dropdown for Follow-ups */}
                        {isFollowUp && (
                          <select
                            value={reminder.follow_up_status || 'Pending'}
                            onChange={(e) => {
                              e.stopPropagation();
                              const leadId = reminder.lead_id;
                              if (leadId) {
                                updateFollowUpStatus(leadId, e.target.value);
                              } else {
                                console.error('Invalid lead ID:', reminder.lead_id);
                                toast.error('Invalid lead ID');
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid var(--gray-200)',
                              fontSize: '12px',
                              background: '#fff',
                              cursor: 'pointer',
                              fontWeight: 600,
                              color: reminder.follow_up_status === 'Completed' ? '#28C76F' : 
                                     reminder.follow_up_status === 'Cancelled' ? '#EA5455' : '#1E73FF'
                            }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        )}
                        
                        {/* Complete/Incomplete Toggle for Reminders */}
                        {!isCallLog && !isFollowUp && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleComplete(reminder);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            {reminder.completed ? (
                              <XCircle size={18} color="#999" />
                            ) : (
                              <CheckCircle size={18} color="#28C76F" />
                            )}
                          </button>
                        )}
                        
                        {/* Delete Button for Reminders Only */}
                        {!isCallLog && !isFollowUp && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteReminder(reminder.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              color: '#EA5455'
                            }}
                            title="Delete reminder"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
        )}
      </div>
      )}

      {/* Create Reminder Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Reminder</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={newReminder.title}
                onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                placeholder="Enter reminder title"
              />
            </div>
            <div className="form-group">
              <label>Due Date & Time</label>
              <input
                type="datetime-local"
                value={newReminder.due_date}
                onChange={(e) => setNewReminder({ ...newReminder, due_date: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="btn primary" onClick={createReminder}>
                Create Reminder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

