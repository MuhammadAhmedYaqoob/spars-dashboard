'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, User, ArrowRight, MessageSquare, UserPlus, Tag, LogIn } from 'lucide-react';
import { apiGet } from '@/utils/api';
import { format, formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

export default function ActivityFeed({ limit = 10, showHeader = true, entityType = null, entityId = null, activities: propActivities = null, loading: propLoading = null }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const isControlled = propActivities !== null;

  useEffect(() => {
    if (!isControlled) {
      loadActivities();
    }
  }, [limit, entityType, entityId, isControlled]);

  useEffect(() => {
    if (isControlled && propActivities) {
      setActivities(propActivities);
    }
  }, [propActivities, isControlled]);

  async function loadActivities() {
    try {
      setLoading(true);
      let url = '/activities/recent';
      const params = new URLSearchParams();
      
      if (limit) params.append('limit', limit.toString());
      if (entityType) params.append('entity_type', entityType);
      if (entityId) {
        if (entityType === 'lead') {
          url = `/activities/lead/${entityId}`;
        } else if (entityType === 'user') {
          url = `/activities/user/${entityId}`;
        }
      }
      
      if (params.toString() && !entityId) {
        url += '?' + params.toString();
      }
      
      const data = await apiGet(url);
      setActivities(data);
    } catch (error) {
      console.error('Failed to load activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }

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
      case 'lead_converted':
        return '#1E73FF';
      case 'status_changed':
        return '#FF9F43';
      case 'comment_added':
        return '#28C76F';
      case 'user_created':
      case 'user_updated':
      case 'user_deleted':
        return '#7367F0';
      case 'login':
        return '#EA5455';
      default:
        return '#666';
    }
  };

  const handleActivityClick = (activity) => {
    if (activity.entity_type === 'lead' && activity.entity_id) {
      router.push(`/leads/${activity.entity_id}`);
    } else if (activity.entity_type === 'user' && activity.entity_id) {
      router.push(`/users`);
    }
  };

  const isLoading = isControlled ? (propLoading !== null ? propLoading : false) : loading;
  const displayActivities = isControlled ? (propActivities || []) : activities;

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div className="spinner" style={{ margin: '0 auto' }}></div>
      </div>
    );
  }

  if (displayActivities.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
        <Clock size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
        <p>No activities found</p>
      </div>
    );
  }

  return (
    <div>
      {showHeader && (
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Recent Activities</h3>
          {!entityId && (
            <button
              onClick={() => router.push('/activities')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              View All
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {displayActivities.map((activity, index) => {
          const color = getActivityColor(activity.action_type);
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleActivityClick(activity)}
              style={{
                padding: '12px 16px',
                background: '#fff',
                borderRadius: '8px',
                border: '1px solid var(--gray-200)',
                cursor: activity.entity_id ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
              onMouseEnter={(e) => {
                if (activity.entity_id) {
                  e.currentTarget.style.borderColor = color;
                  e.currentTarget.style.boxShadow = `0 2px 8px ${color}20`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--gray-200)';
                e.currentTarget.style.boxShadow = 'none';
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
    </div>
  );
}

