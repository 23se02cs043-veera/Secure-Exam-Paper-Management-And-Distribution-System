import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { usersAPI } from '../../api/users';
import { toast } from 'react-toastify';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { FaFileAlt, FaPrint, FaLock, FaCheckCircle, FaCalendarAlt, FaShieldAlt } from 'react-icons/fa';

function Reports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const res = await usersAPI.reportsOverview();
      setReportData(res.data);
    } catch {
      toast.error('Failed to load system reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center p-4">Compiling system overview report...</div>
      </DashboardLayout>
    );
  }

  // Formatting for charts
  const roleChartData = Object.entries(reportData?.users_by_role || {}).map(([role, count]) => ({
    name: role.replace('_', ' ').toUpperCase(),
    value: count,
  }));

  const trafficChartData = [
    { name: 'Document Views', count: reportData?.total_views || 0 },
    { name: 'Document Downloads', count: reportData?.total_downloads || 0 },
  ];

  const COLORS = ['#1a2F5A', '#4169E1', '#FFD700', '#10b981'];

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1>Analytical System Reports</h1>
        <p className="text-muted">Visual analytics representing active system traffic, registered members, and paper uploads</p>
      </div>

      <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div className="card-header text-center">
          <h3>Registered Members by Role</h3>
        </div>
        <div style={{ height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={roleChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {roleChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Reports;
