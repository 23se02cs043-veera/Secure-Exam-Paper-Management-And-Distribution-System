import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { usersAPI } from '../../api/users';
import { toast } from 'react-toastify';
import { FaSearch, FaFilter, FaTrash } from 'react-icons/fa';

function AuditLogs() {
  const queryParams = new URLSearchParams(window.location.search);
  const initialAction = queryParams.get('action') || '';

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState(initialAction);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await usersAPI.auditLogs({
        page,
        action: actionFilter || undefined,
      });
      setLogs(res.data.logs);
      setTotalPages(res.data.pages);
    } catch {
      toast.error('Failed to retrieve security audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllLogs = async () => {
    if (!window.confirm('Are you sure you want to permanently clear all system audit logs?')) return;
    try {
      await usersAPI.clearAuditLogs();
      toast.success('All system audit logs cleared successfully! 🗑️');
      fetchLogs();
    } catch {
      toast.error('Failed to clear audit logs');
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  return (
    <DashboardLayout>
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1>Immutable System Audit Trail</h1>
          <p className="text-muted">Permanent history of all sensitive operations</p>
        </div>

        <button className="btn btn-ghost text-danger" title="Clear All Audit Logs" onClick={handleClearAllLogs} style={{ border: '1px solid var(--color-danger)' }}>
          <FaTrash style={{ marginRight: '6px' }} /> Clear All Audit Logs
        </button>
      </div>

        {/* Filter bar */}
        <div className="flex gap-3">
          <div className="search-bar">
            <FaSearch className="search-bar-icon" />
            <input
              type="text"
              className="form-control"
              placeholder="Search Action e.g., login, upload_paper..."
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

      {loading ? (
        <div className="text-center p-4">Loading audit registers...</div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Timestamp (UTC)</th>
                  <th>IP Address</th>
                  <th>Actor Profile</th>
                  <th>Action Triggered</th>
                  <th>Context Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="font-mono">{new Date(log.created_at).toISOString().replace('T', ' ').substring(0, 19)}</td>
                    <td className="font-mono">{log.ip_address || '127.0.0.1'}</td>
                    <td className="font-semibold text-primary">{log.user_email}</td>
                    <td>
                      <span className="badge badge-navy">{log.action}</span>
                    </td>
                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.details ? JSON.stringify(log.details) : 'None'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination mt-4">
              <button
                className="pagination-btn"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Prev
              </button>
              <span className="text-muted">Page {page} of {totalPages}</span>
              <button
                className="pagination-btn"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

export default AuditLogs;
