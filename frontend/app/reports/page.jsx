'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, DollarSign, Target, Award } from 'lucide-react';
import { apiGet } from '@/utils/api';
import { useAuth } from '@/app/components/AuthProvider';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';

const COLORS = ['#1E73FF', '#28C76F', '#FF9F43', '#EA5455', '#7367F0', '#00D9FF', '#FF6B9D'];

export default function Reports() {
  const { user } = useAuth();
  const [teamData, setTeamData] = useState([]);
  const [orgData, setOrgData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedManagerId, setSelectedManagerId] = useState(null);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState(null);
  const [managers, setManagers] = useState([]);
  const [executives, setExecutives] = useState([]);

  const userRole = user?.role_name || '';
  const isSalesManager = userRole === 'Sales Manager';
  const isAdmin = userRole === 'Admin';

  useEffect(() => {
    loadReports();
    if (isAdmin) {
      loadManagers();
    } else if (isSalesManager) {
      loadExecutives();
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin && selectedManagerId !== null) {
      loadReports();
    }
  }, [selectedManagerId]);

  useEffect(() => {
    if (isSalesManager && selectedExecutiveId !== null) {
      // Chart will update automatically via filtering
    }
  }, [selectedExecutiveId]);

  async function loadManagers() {
    try {
      const data = await apiGet('/users?role=Sales Manager').catch(() => []);
      setManagers(data);
    } catch (error) {
      console.error('Failed to load managers:', error);
    }
  }

  async function loadExecutives() {
    try {
      const data = await apiGet(`/users?manager_id=${user.id}`).catch((err) => {
        console.error('Failed to load executives:', err);
        return [];
      });
      console.log('Loaded executives:', data); // Debug log
      setExecutives(data || []);
    } catch (error) {
      console.error('Failed to load executives:', error);
      setExecutives([]);
    }
  }

  async function loadReports() {
    try {
      setLoading(true);
      if (isSalesManager) {
        const data = await apiGet('/reports/team-performance').catch(() => []);
        setTeamData(data);
      } else if (isAdmin) {
        const data = await apiGet('/reports/org-performance').catch(() => []);
        setOrgData(data);
      }
    } catch (error) {
      toast.error('Failed to load reports');
      console.error(error);
    } finally {
      setLoading(false);
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

  if (!isSalesManager && !isAdmin) {
    return (
      <div className="page">
        <div className="card">
          <h2>Reports</h2>
          <p>You don't have permission to view reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
          {isSalesManager ? 'Team Performance' : 'Organization Performance'}
        </h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          {isSalesManager 
            ? 'View performance metrics for your sales team' 
            : 'View performance metrics for all sales managers and their teams'}
        </p>
      </div>

      {isSalesManager && (
        <>
          {/* Team Performance Charts */}
          {teamData.length === 0 ? (
            <div className="card">
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <Users size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>No team data available</p>
              </div>
            </div>
          ) : (
            <>
              {/* Conversion Rates and Project Value - Top Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '24px' }}>
                {/* Conversion Rate Chart */}
                <motion.div
                  className="card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                    <TrendingUp size={20} color="#28C76F" />
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Conversion Rates</h3>
                  </div>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={teamData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
                        <XAxis 
                          dataKey="user_name" 
                          tick={{ fontSize: 12, fill: '#666' }}
                          axisLine={{ stroke: '#E9ECEF' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#666' }}
                          axisLine={{ stroke: '#E9ECEF' }}
                          label={{ value: 'Conversion Rate (%)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '8px', 
                            border: '1px solid #E9ECEF',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                          formatter={(value) => `${value}%`}
                        />
                        <Bar dataKey="conversion_rate" fill="#28C76F" name="Conversion Rate (%)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Project Value Chart */}
                <motion.div
                  className="card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                    <DollarSign size={20} color="#FF9F43" />
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Project Value</h3>
                  </div>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={teamData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
                        <XAxis 
                          dataKey="user_name" 
                          tick={{ fontSize: 12, fill: '#666' }}
                          axisLine={{ stroke: '#E9ECEF' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#666' }}
                          axisLine={{ stroke: '#E9ECEF' }}
                          label={{ value: 'Project Value ($)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '8px', 
                            border: '1px solid #E9ECEF',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                          formatter={(value) => `$${value.toLocaleString()}`}
                        />
                        <Bar dataKey="total_dollar_value" fill="#FF9F43" name="Total Project Value" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>

              {/* Team Member Selection Dropdown */}
              <motion.div
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{ marginBottom: '24px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>Select Team Member:</label>
                  <select
                    value={selectedExecutiveId || ''}
                    onChange={(e) => setSelectedExecutiveId(e.target.value ? Number(e.target.value) : null)}
                    style={{
                      flex: 1,
                      maxWidth: '300px',
                      padding: '10px 16px',
                      fontSize: '14px',
                      border: '1px solid var(--gray-200)',
                      borderRadius: '8px',
                      background: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select a Team Member</option>
                    {executives.length > 0 ? (
                      executives.map(exec => (
                        <option key={exec.id} value={exec.id}>{exec.name}</option>
                      ))
                    ) : (
                      <option value="" disabled>No team members available</option>
                    )}
                  </select>
                </div>
              </motion.div>

              {/* Leads by Team Member Chart - Only shown when a team member is selected */}
              {selectedExecutiveId && (
                <motion.div
                  className="card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  style={{ marginBottom: '24px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                    <BarChart3 size={20} color="#1E73FF" />
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                      Leads by Team Member - {executives.find(e => e.id === selectedExecutiveId)?.name || 'Selected Member'}
                    </h3>
                  </div>
                  <div style={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                      <BarChart data={teamData.filter(t => t.user_id === selectedExecutiveId)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
                        <XAxis 
                          dataKey="user_name" 
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
                        <Legend />
                        <Bar dataKey="total_leads" fill="#1E73FF" name="Total Leads" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="closed_won" fill="#28C76F" name="Closed Won" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )}

              {/* Team Summary Table */}
              <motion.div
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                  <Users size={20} color="#1E73FF" />
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Team Summary</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ margin: 0, width: '100%', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '15%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={{ padding: '12px 16px', textAlign: 'left' }}>Team Member</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Leads</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Calls</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Closed Won</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Conversion Rate</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Project Value</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center' }}>Secured Orders</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamData.map((member, index) => (
                        <tr key={member.user_id}>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>{member.user_name}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>{member.total_leads}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>{member.total_calls}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>{member.closed_won}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>{member.conversion_rate}%</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>${member.total_dollar_value.toLocaleString()}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>{member.secured_orders}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </>
          )}
        </>
      )}

      {isAdmin && (
        <>
          {/* Organization Performance Charts */}
          {orgData.length === 0 ? (
            <div className="card">
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <Users size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>No organization data available</p>
              </div>
            </div>
          ) : (
            <>
              {/* Conversion Rate and Project Value by Manager - Side by Side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                {/* Conversion Rate by Manager */}
                <motion.div
                  className="card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                    <TrendingUp size={20} color="#28C76F" />
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Conversion Rates by Manager</h3>
                  </div>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={orgData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
                        <XAxis 
                          dataKey="manager_name" 
                          tick={{ fontSize: 12, fill: '#666' }}
                          axisLine={{ stroke: '#E9ECEF' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#666' }}
                          axisLine={{ stroke: '#E9ECEF' }}
                          label={{ value: 'Conversion Rate (%)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '8px', 
                            border: '1px solid #E9ECEF',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                          formatter={(value) => `${value}%`}
                        />
                        <Bar dataKey="conversion_rate" fill="#28C76F" name="Conversion Rate (%)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* Project Value by Manager */}
                <motion.div
                  className="card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                    <DollarSign size={20} color="#FF9F43" />
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Project Value by Manager</h3>
                  </div>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <BarChart data={orgData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
                        <XAxis 
                          dataKey="manager_name" 
                          tick={{ fontSize: 12, fill: '#666' }}
                          axisLine={{ stroke: '#E9ECEF' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#666' }}
                          axisLine={{ stroke: '#E9ECEF' }}
                          label={{ value: 'Project Value ($)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '8px', 
                            border: '1px solid #E9ECEF',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                          formatter={(value) => `$${value.toLocaleString()}`}
                        />
                        <Bar dataKey="total_dollar_value" fill="#FF9F43" name="Total Project Value" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>

              {/* Manager Selection Dropdown */}
              <motion.div
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{ marginBottom: '24px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>Select Sales Manager:</label>
                  <select
                    value={selectedManagerId || ''}
                    onChange={(e) => setSelectedManagerId(e.target.value ? Number(e.target.value) : null)}
                    style={{
                      flex: 1,
                      maxWidth: '300px',
                      padding: '10px 16px',
                      fontSize: '14px',
                      border: '1px solid var(--gray-200)',
                      borderRadius: '8px',
                      background: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">All Managers</option>
                    {managers.map(manager => (
                      <option key={manager.id} value={manager.id}>{manager.name}</option>
                    ))}
                  </select>
                </div>
              </motion.div>

              {/* Manager Performance Overview - Filtered by selection */}
              <motion.div
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                style={{ marginBottom: '24px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                  <BarChart3 size={20} color="#1E73FF" />
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
                    {selectedManagerId ? `${managers.find(m => m.id === selectedManagerId)?.name || 'Selected Manager'}'s Performance Overview` : 'Manager Performance Overview'}
                  </h3>
                </div>
                
                {/* Summary Metrics */}
                {selectedManagerId && (() => {
                  const selectedManagerData = orgData.find(m => m.manager_id === selectedManagerId);
                  if (!selectedManagerData) return null;
                  return (
                    <div style={{ 
                      padding: '16px', 
                      background: 'var(--gray-100)', 
                      borderRadius: '8px',
                      marginBottom: '20px'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Leads</div>
                          <div style={{ fontSize: '24px', fontWeight: 700, color: '#1E73FF' }}>{selectedManagerData.total_leads || 0}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Closed Won</div>
                          <div style={{ fontSize: '24px', fontWeight: 700, color: '#28C76F' }}>{selectedManagerData.closed_won || 0}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Conversion Rate</div>
                          <div style={{ fontSize: '24px', fontWeight: 700, color: '#28C76F' }}>{selectedManagerData.conversion_rate || 0}%</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Project Value</div>
                          <div style={{ fontSize: '24px', fontWeight: 700, color: '#FF9F43' }}>${(selectedManagerData.total_dollar_value || 0).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                <div style={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <BarChart data={selectedManagerId ? orgData.filter(m => m.manager_id === selectedManagerId) : orgData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E9ECEF" />
                      <XAxis 
                        dataKey="manager_name" 
                        tick={{ fontSize: 12, fill: '#666' }}
                        axisLine={{ stroke: '#E9ECEF' }}
                      />
                      {/* Left Y-axis for counts (Total Leads, Closed Won) */}
                      <YAxis 
                        yAxisId="left"
                        tick={{ fontSize: 12, fill: '#666' }}
                        axisLine={{ stroke: '#E9ECEF' }}
                        label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                      />
                      {/* Right Y-axis for dollar values (Project Value) */}
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 12, fill: '#666' }}
                        axisLine={{ stroke: '#E9ECEF' }}
                        label={{ value: 'Dollar Value ($)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: '1px solid #E9ECEF',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value, name) => {
                          if (name === 'Project Value') {
                            return `$${value.toLocaleString()}`;
                          }
                          return value;
                        }}
                      />
                      <Legend />
                      {/* Count bars on left Y-axis */}
                      <Bar yAxisId="left" dataKey="total_leads" fill="#1E73FF" name="Total Leads" radius={[8, 8, 0, 0]} />
                      <Bar yAxisId="left" dataKey="closed_won" fill="#28C76F" name="Closed Won" radius={[8, 8, 0, 0]} />
                      {/* Dollar value bar on right Y-axis */}
                      <Bar yAxisId="right" dataKey="total_dollar_value" fill="#FF9F43" name="Project Value" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Manager Details with Team Breakdown */}
              {orgData.map((manager, index) => (
                <motion.div
                  key={manager.manager_id}
                  className="card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  style={{ marginBottom: '24px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                    <Award size={20} color="#7367F0" />
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{manager.manager_name}'s Team</h3>
                  </div>

                  <div style={{ 
                    padding: '16px', 
                    background: 'var(--gray-100)', 
                    borderRadius: '8px',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Leads</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#1E73FF' }}>{manager.total_leads}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Conversion Rate</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#28C76F' }}>{manager.conversion_rate}%</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Secured Orders</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, color: '#EA5455' }}>{manager.secured_orders}</div>
                      </div>
                    </div>
                  </div>

                  {manager.team && manager.team.length > 0 && (
                    <>
                      <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Team Members</h4>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ margin: 0, width: '100%', tableLayout: 'fixed' }}>
                          <colgroup>
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '14%' }} />
                            <col style={{ width: '15%' }} />
                            <col style={{ width: '15%' }} />
                          </colgroup>
                          <thead>
                            <tr>
                              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Team Member</th>
                              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Leads</th>
                              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Calls</th>
                              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Closed Won</th>
                              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Conversion Rate</th>
                              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Project Value</th>
                              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Secured Orders</th>
                            </tr>
                          </thead>
                          <tbody>
                            {manager.team.map((member) => (
                              <tr key={member.user_id}>
                                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{member.user_name}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>{member.total_leads}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>{member.total_calls}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>{member.closed_won}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>{member.conversion_rate}%</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>${member.total_dollar_value.toLocaleString()}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>{member.secured_orders}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
