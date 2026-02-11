'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, FileText, TrendingUp, Target, AlertCircle, Calendar, CheckCircle, Clock,
  DollarSign, Activity, Zap, Award, BarChart3,
  Mail, Phone, MessageSquare, Eye, Building
} from 'lucide-react';
import { apiGet } from '@/utils/api';
import { useAuth } from '@/app/components/AuthProvider';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import ActivityFeed from '@/app/components/ActivityFeed';
import Link from 'next/link';
import { format } from 'date-fns';

const COLORS = ['#1E73FF', '#28C76F', '#FF9F43', '#EA5455', '#7367F0'];

// Normalize form-based sources to "Website"
const normalizeSource = (source) => {
  if (!source) return source || 'Unknown';
  
  // Normalize: trim whitespace and handle case-insensitive matching
  const normalized = String(source).trim();
  
  const formSources = [
    'Brochure Download',
    'brochure download',
    'BROCHURE DOWNLOAD',
    'Product Profile Download',
    'product profile download',
    'PRODUCT PROFILE DOWNLOAD',
    'Talk to Sales',
    'talk to sales',
    'TALK TO SALES',
    'General Inquiry',
    'general inquiry',
    'GENERAL INQUIRY',
    'Request a Demo',
    'request a demo',
    'REQUEST A DEMO'
  ];
  
  // Case-insensitive check
  const isFormSource = formSources.some(formSource => 
    formSource.toLowerCase() === normalized.toLowerCase()
  );
  
  return isFormSource ? 'Website' : normalized;
};

export default function Dashboard(){
  const { user, canAccessResource } = useAuth();
  const [pipeline, setPipeline] = useState([]);
  const [sources, setSources] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [stats, setStats] = useState({ totalLeads: 0, totalSubmissions: 0, conversionRate: 0, newLeads: 0 });
  const [myLeads, setMyLeads] = useState([]);
  const [myReminders, setMyReminders] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [topSources, setTopSources] = useState([]);
  const [conversionTrend, setConversionTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  // Marketing-specific state
  const [newsletterSubscribers, setNewsletterSubscribers] = useState([]);
  const [submissionsByType, setSubmissionsByType] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  
  const userRole = user?.role_name || '';
  const isSalesExecutive = userRole === 'Sales Executive';
  const isMarketing = userRole === 'Marketing';
  const isAdmin = userRole === 'Admin';
  const isSalesManager = userRole === 'Sales Manager';
  const isReadOnly = user?.permissions?.view === true && !user?.permissions?.all;
  const hasLeadsPermission = canAccessResource('leads');

  // Debug logging
  useEffect(() => {
    console.log('Dashboard Debug:', {
      userRole,
      isSalesExecutive,
      isMarketing,
      hasLeadsPermission,
      user: user ? { id: user.id, name: user.name, role_name: user.role_name } : null
    });
  }, [userRole, isSalesExecutive, isMarketing, hasLeadsPermission, user]);

  useEffect(()=>{
    let mounted = true;
    (async()=>{
      try {
        setLoading(true);
        const promises = [];
        
        // Only load leads if user has permission
        if (hasLeadsPermission) {
          promises.push(apiGet('/leads'));
        } else {
          // Marketing users: skip leads, but still need empty array for calculations
          promises.push(Promise.resolve([]));
        }
        
        // Load submissions only if user has permission
        if (!isSalesExecutive) {
          promises.push(
            apiGet('/form-submissions/contact').catch(() => []),  // General Inquiry
            apiGet('/form-submissions/demo').catch(() => []),  // Request a Demo
            apiGet('/form-submissions/talk_to_sales').catch(() => []),  // Talk to Sales
            apiGet('/form-submissions/brochure').catch(() => []),  // Brochure Download
            apiGet('/form-submissions/product_profile').catch(() => []),  // Product Profile Download
            apiGet('/form-submissions/newsletter').catch(() => [])  // Newsletter
          );
        }
        
        // Load reminders for Sales Executive and Read-Only users
        if (isSalesExecutive || isReadOnly) {
          promises.push(apiGet('/reminders/my/upcoming').catch(() => []));
        }
        
        const results = await Promise.allSettled(promises);
        const leads = results[0].status === 'fulfilled' ? results[0].value : [];
        
        if (!mounted) return;

        // Filter leads for Sales Executive and Read-Only users (only assigned to them)
        let filteredLeads = leads;
        if (isSalesExecutive || isReadOnly) {
          filteredLeads = leads.filter(l => l.assigned_to === user?.id || l.assigned === user?.name);
          setMyLeads(filteredLeads);
        } else if (isMarketing) {
          // Marketing users don't have leads permission, set empty array
          filteredLeads = [];
        }

        const statusCount = {};
        for(const l of filteredLeads){ statusCount[l.status] = (statusCount[l.status]||0)+1; }
        setPipeline(Object.entries(statusCount).map(([status, count])=>({ status, count })));

        const sourceCount = {};
        for(const l of filteredLeads){ 
          // Group by source_type (category): Website, Referral, Partner, etc.
          // For form-based leads: source_type='Website', source='Brochure Download' etc.
          // For other leads: source_type='Referral', source='John Doe' etc.
          let normalizedSource = 'Unknown';
          if (l.source_type) {
            normalizedSource = l.source_type;
          } else if (l.source) {
            // Fallback: use source if source_type is not available
            normalizedSource = l.source;
          }
          sourceCount[normalizedSource] = (sourceCount[normalizedSource]||0)+1; 
        }
        const sourcesData = Object.entries(sourceCount).map(([name, value])=>({ name, value }));
        setSources(sourcesData);
        
        // Get top 5 sources
        setTopSources(sourcesData.sort((a, b) => b.value - a.value).slice(0, 5));
        
        // Get recent leads (last 5)
        const sortedLeads = [...filteredLeads].sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
          const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
          return dateB - dateA;
        });
        setRecentLeads(sortedLeads.slice(0, 5));

        if (!isSalesExecutive) {
          const subsContact = results[1]?.status === 'fulfilled' ? results[1].value : [];
          const subsDemo = results[2]?.status === 'fulfilled' ? results[2].value : [];
          const subsTalk = results[3]?.status === 'fulfilled' ? results[3].value : [];
          const subsBrochure = results[4]?.status === 'fulfilled' ? results[4].value : [];
          const subsProfile = results[5]?.status === 'fulfilled' ? results[5].value : [];
          const subsNewsletter = results[6]?.status === 'fulfilled' ? results[6].value : [];
          
          // Combine all submissions (excluding newsletter for conversion calculations)
          const subAll = [...subsContact, ...subsDemo, ...subsTalk, ...subsBrochure, ...subsProfile];
          const allSubsWithNewsletter = [...subAll, ...subsNewsletter];
          
          // Marketing-specific calculations
          if (isMarketing) {
            // Set newsletter subscribers
            setNewsletterSubscribers(subsNewsletter);
            
            // Map form_type to display names
            const formTypeDisplayMap = {
              'contact': 'General Inquiry',
              'general': 'General Inquiry',
              'demo': 'Request a Demo',
              'talk': 'Talk to Sales',
              'talk_to_sales': 'Talk to Sales',
              'brochure': 'Brochure Download',
              'product-profile': 'Product Profile Download',
              'product_profile': 'Product Profile Download',
              'newsletter': 'Newsletter',
              'unknown': 'Unknown'
            };
            
            // Group submissions by form type with proper display names
            const typeCount = {};
            subAll.forEach(s => {
              const formType = s.form_type || 'unknown';
              // Normalize form_type (handle variations like product-profile vs product_profile)
              const normalizedType = formType.toLowerCase().replace(/-/g, '_');
              // Get display name from map, or fallback to formatted form_type
              const displayName = formTypeDisplayMap[normalizedType] || formTypeDisplayMap[formType] || 
                formType.charAt(0).toUpperCase() + formType.slice(1).replace(/_/g, ' ');
              
              // Group by display name to avoid duplicates (e.g., product-profile and product_profile)
              typeCount[displayName] = (typeCount[displayName] || 0) + 1;
            });
            
            // Convert to array format for chart/widget display
            setSubmissionsByType(Object.entries(typeCount).map(([formType, count]) => ({
              formType,
              count
            })).sort((a, b) => b.count - a.count)); // Sort by count descending
            
            // Get recent submissions (last 5)
            const sortedSubs = [...subAll].sort((a, b) => {
              const dateA = a.submitted_at || a.submitted ? new Date(a.submitted_at || a.submitted) : new Date(0);
              const dateB = b.submitted_at || b.submitted ? new Date(b.submitted_at || b.submitted) : new Date(0);
              return dateB - dateA;
            });
            setRecentSubmissions(sortedSubs.slice(0, 5));
          }
          
          // Check which submissions have been converted to leads by matching email (only if user has leads permission)
          const leadEmails = hasLeadsPermission ? new Set(filteredLeads.map(l => l.email?.toLowerCase()).filter(Boolean)) : new Set();
          const convertedSubs = hasLeadsPermission ? subAll.filter(s => {
            const email = s.email?.toLowerCase();
            return email && leadEmails.has(email);
          }) : [];
          
          const byDay = {};
          allSubsWithNewsletter.forEach(s=>{ 
            try {
              const date = s.submitted_at || s.submitted;
              if (date) {
                const d = new Date(date).toISOString().slice(0,10); 
                byDay[d] = (byDay[d] || 0) + 1; 
              }
            } catch(e) {
              console.warn('Invalid date:', s.submitted_at || s.submitted);
            }
          });
          setTimeline(Object.entries(byDay).sort().map(([date, value])=>({ date, value })));

          const totalSubmissions = subAll.length; // Exclude newsletter from total
          // Marketing can't calculate conversion rate without leads access
          const conversionRate = isMarketing ? 0 : (totalSubmissions > 0 ? ((convertedSubs.length / totalSubmissions) * 100).toFixed(1) : 0);
          
          // Calculate conversion trend (last 7 days) - only if user has leads permission
          if (hasLeadsPermission && !isMarketing) {
            const trendData = [];
            for (let i = 6; i >= 0; i--) {
              const date = new Date();
              date.setDate(date.getDate() - i);
              const dateStr = date.toISOString().slice(0, 10);
              const daySubs = subAll.filter(s => {
                try {
                  const subDate = s.submitted_at || s.submitted;
                  return subDate && new Date(subDate).toISOString().slice(0, 10) === dateStr;
                } catch { return false; }
              });
              const dayConverted = daySubs.filter(s => {
                const email = s.email?.toLowerCase();
                return email && leadEmails.has(email);
              }).length;
              trendData.push({
                date: format(date, 'MMM dd'),
                converted: dayConverted,
                total: daySubs.length,
                rate: daySubs.length > 0 ? ((dayConverted / daySubs.length) * 100).toFixed(1) : 0
              });
            }
            setConversionTrend(trendData);
          } else {
            setConversionTrend([]);
          }
          
          setStats({ 
            totalLeads: filteredLeads.length, 
            totalSubmissions, 
            conversionRate: isMarketing ? 0 : parseFloat(conversionRate), 
            newLeads: filteredLeads.filter(l => l.status === 'New').length 
          });
        } else {
          // Sales Executive stats
          const reminders = results[1]?.status === 'fulfilled' ? results[1].value : [];
          setMyReminders(reminders);
          setMyTasks(reminders.filter(r => !r.completed));
          
          setStats({ 
            totalLeads: filteredLeads.length, 
            totalSubmissions: 0, 
            conversionRate: 0, 
            newLeads: filteredLeads.filter(l => l.status === 'New').length 
          });
        }
      } catch (error) {
        console.error('Dashboard error:', error);
        toast.error('Failed to load dashboard data: ' + (error.message || 'Unknown error'));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  },[user, isSalesExecutive, isMarketing, hasLeadsPermission]);

  // Calculate additional metrics
  const qualifiedLeads = pipeline.find(p => p.status === 'Qualified')?.count || 0;
  const contactedLeads = pipeline.find(p => p.status === 'Contacted')?.count || 0;
  const closedWon = pipeline.find(p => p.status === 'Closed Won' || p.status === 'Won')?.count || 0;
  const previousPeriodLeads = Math.floor(stats.totalLeads * 0.85); // Simulated previous period
  const leadsGrowth = stats.totalLeads > 0 ? (((stats.totalLeads - previousPeriodLeads) / previousPeriodLeads) * 100).toFixed(1) : '0';

  // Role-specific stat cards with enhanced data
  const getStatCards = () => {
    if (isSalesExecutive || isReadOnly) {
      return [
        { 
          label: 'My Leads', 
          value: stats.totalLeads, 
          icon: Users, 
          color: '#1E73FF',
          change: '+12%',
          changeType: 'positive',
          subtitle: `${qualifiedLeads} qualified`
        },
        { 
          label: 'My Tasks', 
          value: myTasks.length, 
          icon: CheckCircle, 
          color: '#28C76F',
          change: null,
          subtitle: `${myReminders.filter(r => !r.completed).length} pending`
        },
        { 
          label: 'My Follow-ups', 
          value: myReminders.length, 
          icon: Calendar, 
          color: '#FF9F43',
          change: null,
          subtitle: 'This week'
        },
        { 
          label: 'New Leads', 
          value: stats.newLeads, 
          icon: Target, 
          color: '#EA5455',
          change: null,
          subtitle: 'Requires attention'
        },
      ];
    } else if (isMarketing) {
      // Calculate new submissions this week
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const newThisWeek = recentSubmissions.filter(s => {
        const subDate = s.submitted_at || s.submitted;
        return subDate && new Date(subDate) >= weekAgo;
      }).length;
      
      return [
        { 
          label: 'Total Submissions', 
          value: stats.totalSubmissions, 
          icon: FileText, 
          color: '#1E73FF',
          change: '+8%',
          changeType: 'positive',
          subtitle: 'This month'
        },
        { 
          label: 'Newsletter Subscribers', 
          value: newsletterSubscribers.length, 
          icon: Users, 
          color: '#28C76F',
          change: '+15%',
          changeType: 'positive',
          subtitle: 'Active subscribers'
        },
        { 
          label: 'New This Week', 
          value: newThisWeek, 
          icon: TrendingUp, 
          color: '#FF9F43',
          change: null,
          subtitle: 'Recent submissions'
        },
        { 
          label: 'Form Types', 
          value: submissionsByType.length, 
          icon: Target, 
          color: '#EA5455',
          change: null,
          subtitle: 'Active forms'
        },
      ];
    } else {
      return [
        { 
          label: 'Total Leads', 
          value: stats.totalLeads, 
          icon: Users, 
          color: '#1E73FF',
          change: `+${leadsGrowth}%`,
          changeType: 'positive',
          subtitle: `${qualifiedLeads} qualified`
        },
        { 
          label: 'Total Submissions', 
          value: stats.totalSubmissions, 
          icon: FileText, 
          color: '#28C76F',
          change: '+18%',
          changeType: 'positive',
          subtitle: 'This month'
        },
        { 
          label: 'Conversion Rate', 
          value: `${stats.conversionRate}%`, 
          icon: TrendingUp, 
          color: '#FF9F43',
          change: stats.conversionRate > 20 ? '+3.2%' : '-1.5%',
          changeType: stats.conversionRate > 20 ? 'positive' : 'negative',
          subtitle: 'Overall performance'
        },
        { 
          label: 'New Leads', 
          value: stats.newLeads, 
          icon: Target, 
          color: '#EA5455',
          change: null,
          subtitle: 'Requires follow-up'
        },
      ];
    }
  };

  const statCards = getStatCards();

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  const getDashboardTitle = () => {
    if (isSalesExecutive || isReadOnly) return 'My Dashboard';
    if (isMarketing) return 'Marketing Dashboard';
    if (isSalesManager) return 'Sales Manager Dashboard';
    if (isAdmin) return 'Admin Dashboard';
    return 'Dashboard';
  };

  const getDashboardSubtitle = () => {
    if (isSalesExecutive || isReadOnly) return 'Your leads, tasks, and follow-ups';
    if (isMarketing) return 'Marketing insights and submissions';
    if (isSalesManager) return 'Manage your team and track performance';
    if (isAdmin) return 'Complete overview of leads, submissions, and team performance';
    return 'Overview of your leads and submissions';
  };

  return (
    <div className="page" style={{ background: '#F8F9FB', minHeight: '100vh', padding: '24px' }}>
      {/* Simple Header Section */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: 700, 
              margin: '0 0 8px 0',
              color: '#0A2342',
              letterSpacing: '-0.5px'
            }}>
              {getDashboardTitle()}
            </h1>
            <p style={{ 
              color: '#666', 
              fontSize: '15px',
              margin: 0
            }}>
              {getDashboardSubtitle()}
            </p>
          </div>
          {/* Debug Role Badge */}
          <div style={{
            padding: '8px 16px',
            background: isMarketing ? '#FF9F43' : isSalesExecutive ? '#1E73FF' : '#28C76F',
            color: '#fff',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600
          }}>
            Role: {userRole || 'Unknown'}
          </div>
        </div>
      </div>

      {/* Sales Executive / Read-Only: My Follow-ups Widget */}
      {(isSalesExecutive || isReadOnly) && myReminders.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ 
            marginBottom: '32px',
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #E9ECEF'
          }}
        >
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid #E9ECEF'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #FF9F4315 0%, #FF9F4308 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #FF9F4320'
              }}>
                <Calendar size={20} color="#FF9F43" />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0A2342' }}>My Follow-ups</h3>
            </div>
            <Link 
              href="/calendar" 
              style={{ 
                fontSize: '14px', 
                color: '#1E73FF', 
                textDecoration: 'none',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              View All →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {myReminders.slice(0, 5).map(reminder => (
              <div 
                key={reminder.id} 
                style={{ 
                  padding: '16px', 
                  background: '#F8F9FB', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  border: '1px solid #E9ECEF',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.borderColor = '#1E73FF40';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(30, 115, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#F8F9FB';
                  e.currentTarget.style.borderColor = '#E9ECEF';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: '6px', color: '#0A2342', fontSize: '14px' }}>
                    {reminder.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} />
                    {new Date(reminder.due_date).toLocaleDateString()} {new Date(reminder.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {reminder.lead_id && (
                  <Link 
                    href={`/leads/${reminder.lead_id}`} 
                    className="btn secondary" 
                    style={{ 
                      padding: '8px 16px', 
                      fontSize: '13px',
                      fontWeight: 500,
                      borderRadius: '8px'
                    }}
                  >
                    View Lead
                  </Link>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Charts Section (hidden for Sales Executive and Read-Only) */}
      {!isSalesExecutive && !isReadOnly && (
        <div className="grid3" style={{ gap: '20px', marginBottom: '32px' }}>
          {/* Leads Pipeline - Hidden for Marketing */}
          {!isMarketing && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                border: '1px solid #E9ECEF'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #E9ECEF'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #1E73FF15 0%, #1E73FF08 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #1E73FF20'
                }}>
                  <Target size={18} color="#1E73FF" />
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0A2342' }}>Leads Pipeline</h3>
              </div>
              <div style={{width:'100%', height:280}}>
                {pipeline.length > 0 ? (
                  <ResponsiveContainer>
                    <BarChart data={pipeline}>
                      <XAxis 
                        dataKey="status" 
                        tick={{ fontSize: 12, fill: '#666' }}
                        axisLine={{ stroke: '#E9ECEF' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#666' }}
                        axisLine={{ stroke: '#E9ECEF' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: '1px solid #E9ECEF',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Bar dataKey="count" fill="#1E73FF" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
                    <div style={{ textAlign: 'center' }}>
                      <AlertCircle size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                      <p style={{ margin: 0, fontSize: '14px' }}>No data available</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          
          {/* Submissions by Form Type - For Marketing */}
          {isMarketing ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                border: '1px solid #E9ECEF'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #E9ECEF'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #1E73FF15 0%, #1E73FF08 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #1E73FF20'
                }}>
                  <FileText size={18} color="#1E73FF" />
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0A2342' }}>Submissions by Form Type</h3>
              </div>
              <div style={{width:'100%', height:280}}>
                {submissionsByType.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie 
                        data={submissionsByType} 
                        dataKey="count" 
                        nameKey="formType" 
                        outerRadius={85} 
                        label={{ fontSize: 12, fill: '#333' }}
                      >
                        {submissionsByType.map((entry, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: '1px solid #E9ECEF',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
                    <div style={{ textAlign: 'center' }}>
                      <AlertCircle size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                      <p style={{ margin: 0, fontSize: '14px' }}>No data available</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* Leads by Source - For non-Marketing users */
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                border: '1px solid #E9ECEF'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #E9ECEF'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #28C76F15 0%, #28C76F08 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #28C76F20'
                }}>
                  <Users size={18} color="#28C76F" />
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0A2342' }}>Leads by Source</h3>
              </div>
              <div style={{width:'100%', height:280}}>
                {sources.length > 0 ? (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie 
                        data={sources} 
                        dataKey="value" 
                        nameKey="name" 
                        outerRadius={85} 
                        label={{ fontSize: 12, fill: '#333' }}
                      >
                        {sources.map((entry, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: '1px solid #E9ECEF',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
                    <div style={{ textAlign: 'center' }}>
                      <AlertCircle size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                      <p style={{ margin: 0, fontSize: '14px' }}>No data available</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          
          {/* Submissions Timeline - Show for all non-Sales Executive users including Marketing */}
          <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                border: '1px solid #E9ECEF'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                marginBottom: '20px',
                paddingBottom: '16px',
                borderBottom: '1px solid #E9ECEF'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #FF9F4315 0%, #FF9F4308 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #FF9F4320'
                }}>
                  <TrendingUp size={18} color="#FF9F43" />
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0A2342' }}>Submissions Timeline</h3>
              </div>
            <div style={{width:'100%', height:280}}>
              {conversionTrend.length > 0 ? (
                <ResponsiveContainer>
                  <AreaChart data={conversionTrend}>
                    <defs>
                      <linearGradient id="colorConversion" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#28C76F" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#28C76F" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: '#666' }}
                      axisLine={{ stroke: '#E9ECEF' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#666' }}
                      axisLine={{ stroke: '#E9ECEF' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '8px', 
                        border: '1px solid #E9ECEF',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="converted" 
                      stroke="#28C76F" 
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorConversion)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : timeline.length > 0 ? (
                <ResponsiveContainer>
                  <LineChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: '#666' }}
                      axisLine={{ stroke: '#E9ECEF' }}
                      tickFormatter={(value) => {
                        try {
                          const date = new Date(value);
                          return format(date, 'MMM dd');
                        } catch {
                          return value;
                        }
                      }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#666' }}
                      axisLine={{ stroke: '#E9ECEF' }}
                      label={{ value: 'Submissions', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '8px', 
                        border: '1px solid #E9ECEF',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      labelFormatter={(value) => {
                        try {
                          const date = new Date(value);
                          return format(date, 'MMM dd, yyyy');
                        } catch {
                          return value;
                        }
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#FF9F43" 
                      strokeWidth={3} 
                      dot={{ fill: '#FF9F43', r: 5, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 7 }}
                      name="Submissions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
                  <div style={{ textAlign: 'center' }}>
                    <AlertCircle size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
                    <p style={{ margin: 0, fontSize: '14px' }}>No data available</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Bottom Section: Recent Leads/Submissions & Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
        {/* Recent Leads Widget - Hidden for Marketing */}
        {!isSalesExecutive && !isReadOnly && !isMarketing && recentLeads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid #E9ECEF'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid #E9ECEF'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #1E73FF15 0%, #1E73FF08 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #1E73FF20'
                }}>
                  <Users size={18} color="#1E73FF" />
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0A2342' }}>Recent Leads</h3>
              </div>
              <Link href="/leads" style={{ fontSize: '14px', color: '#1E73FF', textDecoration: 'none', fontWeight: 500 }}>
                View All →
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentLeads.map((lead, index) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  style={{
                    padding: '14px',
                    background: '#F8F9FB',
                    borderRadius: '12px',
                    border: '1px solid #E9ECEF',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    display: 'block'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.borderColor = '#1E73FF40';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(30, 115, 255, 0.1)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#F8F9FB';
                    e.currentTarget.style.borderColor = '#E9ECEF';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#0A2342', fontSize: '14px', marginBottom: '4px' }}>
                        {lead.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building size={12} />
                        {lead.company}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: lead.status === 'New' ? '#E7F0FF' : lead.status === 'Qualified' ? '#E8FBEF' : '#F0F0F0',
                      color: lead.status === 'New' ? '#1E73FF' : lead.status === 'Qualified' ? '#28C76F' : '#666'
                    }}>
                      {lead.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#999' }}>
                    {lead.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={12} />
                        {lead.email}
                      </div>
                    )}
                    {lead.source && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Target size={12} />
                        {lead.source}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Submissions Widget - For Marketing */}
        {isMarketing && recentSubmissions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid #E9ECEF'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid #E9ECEF'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #1E73FF15 0%, #1E73FF08 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #1E73FF20'
                }}>
                  <FileText size={18} color="#1E73FF" />
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0A2342' }}>Recent Submissions</h3>
              </div>
              <Link href="/submissions" style={{ fontSize: '14px', color: '#1E73FF', textDecoration: 'none', fontWeight: 500 }}>
                View All →
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentSubmissions.map((submission, index) => (
                <Link
                  key={submission.id || index}
                  href={`/submissions/${submission.form_type || 'contact'}`}
                  style={{
                    padding: '14px',
                    background: '#F8F9FB',
                    borderRadius: '12px',
                    border: '1px solid #E9ECEF',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    display: 'block'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.borderColor = '#1E73FF40';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(30, 115, 255, 0.1)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#F8F9FB';
                    e.currentTarget.style.borderColor = '#E9ECEF';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#0A2342', fontSize: '14px', marginBottom: '4px' }}>
                        {submission.name || submission.email}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building size={12} />
                        {submission.company || 'N/A'}
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: '#E7F0FF',
                      color: '#1E73FF'
                    }}>
                      {submission.form_type ? submission.form_type.charAt(0).toUpperCase() + submission.form_type.slice(1).replace('_', ' ') : 'Submission'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#999' }}>
                    {submission.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={12} />
                        {submission.email}
                      </div>
                    )}
                    {(submission.submitted_at || submission.submitted) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {new Date(submission.submitted_at || submission.submitted).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Submissions by Type Widget - For Marketing */}
        {isMarketing && submissionsByType.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid #E9ECEF'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid #E9ECEF'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #7367F015 0%, #7367F008 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #7367F020'
              }}>
                <BarChart3 size={18} color="#7367F0" />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0A2342' }}>Submissions by Type</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {submissionsByType.map((type, index) => {
                const percentage = stats.totalSubmissions > 0 ? (type.count / stats.totalSubmissions) * 100 : 0;
                return (
                  <div key={type.formType} style={{ padding: '12px', background: '#F8F9FB', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: COLORS[index % COLORS.length]
                        }} />
                        <span style={{ fontWeight: 600, color: '#0A2342', fontSize: '14px' }}>{type.formType}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: '#0A2342', fontSize: '16px' }}>{type.count}</span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: '#E9ECEF',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${COLORS[index % COLORS.length]} 0%, ${COLORS[index % COLORS.length]}dd 100%)`,
                        borderRadius: '3px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Top Sources Widget - Hidden for Marketing */}
        {!isSalesExecutive && !isReadOnly && !isMarketing && topSources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid #E9ECEF'
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid #E9ECEF'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #7367F015 0%, #7367F008 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #7367F020'
              }}>
                <BarChart3 size={18} color="#7367F0" />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0A2342' }}>Top Lead Sources</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topSources.map((source, index) => {
                const percentage = (source.value / stats.totalLeads) * 100;
                return (
                  <div key={source.name} style={{ padding: '12px', background: '#F8F9FB', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: COLORS[index % COLORS.length]
                        }} />
                        <span style={{ fontWeight: 600, color: '#0A2342', fontSize: '14px' }}>{source.name}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: '#0A2342', fontSize: '16px' }}>{source.value}</span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: '#E9ECEF',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${COLORS[index % COLORS.length]} 0%, ${COLORS[index % COLORS.length]}dd 100%)`,
                        borderRadius: '3px',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Activity Feed Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        style={{ 
          background: '#fff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: '1px solid #E9ECEF'
        }}
      >
        <ActivityFeed limit={10} showHeader={true} />
      </motion.div>
    </div>
  );
}
