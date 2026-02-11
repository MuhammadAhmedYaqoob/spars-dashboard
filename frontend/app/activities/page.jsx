'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Filter, RefreshCw, Clock, UserPlus, Tag, MessageSquare, User, LogIn } from 'lucide-react';
import { apiGet } from '@/utils/api';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

export default function ActivitiesPage() {
  const [filter, setFilter] = useState({ entity_type: null, action_type: null });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 50;

  useEffect(() => {
    loadActivities();
  }, [filter, page]);

  async function loadActivities() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('skip', (page * limit).toString());
      params.append('limit', limit.toString());
      
      if (filter.entity_type) params.append('entity_type', filter.entity_type);
      if (filter.action_type) params.append('action_type', filter.action_type);
      
      const data = await apiGet(`/activities?${params.toString()}`);
      setActivities(data);
    } catch (error) {
      toast.error('Failed to load activities');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const actionTypes = [
    { value: null, label: 'All Actions' },
    { value: 'lead_converted', label: 'Lead Conversions' },
    { value: 'status_changed', label: 'Status Changes' },
    { value: 'comment_added', label: 'Comments' },
    { value: 'user_created', label: 'User Created' },
    { value: 'user_updated', label: 'User Updated' },
    { value: 'user_deleted', label: 'User Deleted' },
    { value: 'login', label: 'Logins' }
  ];

  const entityTypes = [
    { value: null, label: 'All Entities' },
    { value: 'lead', label: 'Leads' },
    { value: 'user', label: 'Users' },
    { value: 'comment', label: 'Comments' },
    { value: 'submission', label: 'Submissions' }
  ];

  return (
    <div className="page">
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Activity Log</h1>
          <p style={{ color: '#666', fontSize: '14px' }}>Track all system activities and changes</p>
        </div>
        <button
          onClick={loadActivities}
          className="btn secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Filter size={18} color="#666" />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Filters</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Action Type</label>
            <select
              value={filter.action_type || ''}
              onChange={(e) => setFilter({ ...filter, action_type: e.target.value || null })}
            >
              {actionTypes.map(opt => (
                <option key={opt.value || 'all'} value={opt.value || ''}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Entity Type</label>
            <select
              value={filter.entity_type || ''}
              onChange={(e) => setFilter({ ...filter, entity_type: e.target.value || null })}
            >
              {entityTypes.map(opt => (
                <option key={opt.value || 'all'} value={opt.value || ''}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <div className="spinner"></div>
          </div>
        ) : activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <p>No activities found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activities.map((activity, index) => {
              const getActivityIcon = (actionType) => {
                switch (actionType) {
                  case 'lead_converted':
                    return <UserPlus size={16} color="#1E73FF" />;
                  case 'status_changed':
                    return <Tag size={16} color="#FF9F43" />;
                  case 'comment_added':
                    return <MessageSquare size={16} color="#28C76F" />;
                  case 'user_created':
                  case 'user_updated':
                  case 'user_deleted':
                    return <User size={16} color="#7367F0" />;
                  case 'login':
                    return <LogIn size={16} color="#EA5455" />;
                  default:
                    return <Clock size={16} color="#666" />;
                }
              };
              
              const getActivityColor = (actionType) => {
                switch (actionType) {
                  case 'lead_converted': return '#1E73FF';
                  case 'status_changed': return '#FF9F43';
                  case 'comment_added': return '#28C76F';
                  case 'user_created':
                  case 'user_updated':
                  case 'user_deleted': return '#7367F0';
                  case 'login': return '#EA5455';
                  default: return '#666';
                }
              };
              
              const color = getActivityColor(activity.action_type);
              
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  style={{
                    padding: '12px 16px',
                    background: '#fff',
                    borderRadius: '8px',
                    border: '1px solid var(--gray-200)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: `${color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {getActivityIcon(activity.action_type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', lineHeight: '1.5', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: '#333' }}>{activity.description}</span>
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#666',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <Clock size={12} />
                      {activity.created_at && (() => {
                        try {
                          const date = new Date(activity.created_at);
                          if (isNaN(date.getTime())) {
                            return <span>Invalid date</span>;
                          }
                          return (
                            <>
                              <span>{formatDistanceToNow(date, { addSuffix: true })}</span>
                              <span style={{ color: '#999' }}>•</span>
                              <span>{format(date, 'MMM dd, yyyy hh:mm a')}</span>
                            </>
                          );
                        } catch (error) {
                          return <span>Date error</span>;
                        }
                      })()}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {activities.length >= limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
          <button
            className="btn secondary"
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
          >
            Previous
          </button>
          <button
            className="btn secondary"
            onClick={() => setPage(page + 1)}
            disabled={activities.length < limit}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

