import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { usersAPI } from '../../api/users';
import { toast } from 'react-toastify';
import { FaShieldAlt, FaLock, FaUnlock, FaCheck, FaExclamationTriangle, FaTrash } from 'react-icons/fa';

function SecurityCenter() {
  const [securityData, setSecurityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [panicReason, setPanicReason] = useState('');
  const [panicType, setPanicType] = useState('all');

  const fetchSecurityOverview = async () => {
    try {
      const res = await usersAPI.securityOverview();
      setSecurityData(res.data);
    } catch {
      toast.error('Failed to load security status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityOverview();
  }, []);

  const handleResolveAlert = async (id) => {
    try {
      await usersAPI.resolveAlert(id);
      toast.success('Security alert marked as resolved');
      fetchSecurityOverview();
    } catch {
      toast.error('Failed to resolve alert');
    }
  };

  const handleClearAllAlerts = async () => {
    if (!window.confirm('Are you sure you want to clear all active security warnings and alerts?')) return;
    try {
      await usersAPI.clearSecurityAlerts();
      toast.success('All active security warnings cleared successfully! 🗑️');
      fetchSecurityOverview();
    } catch {
      toast.error('Failed to clear security alerts');
    }
  };

  const handleActivatePanic = async (e) => {
    e.preventDefault();
    if (!panicReason) {
      toast.error('A reason for lockdown must be documented.');
      return;
    }
    try {
      await usersAPI.activatePanicLock({
        lock_type: panicType,
        reason: panicReason,
      });
      toast.error('💥 CRITICAL lockdown command dispatched successfully!');
      setPanicReason('');
      fetchSecurityOverview();
    } catch {
      toast.error('Lockdown dispatch failed');
    }
  };

  const handleDeactivatePanic = async () => {
    try {
      await usersAPI.deactivatePanicLock();
      toast.success('System panic locks cleared. System normal.');
      fetchSecurityOverview();
    } catch {
      toast.error('Lock release failed');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center p-4">Loading security center...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1>Emergency Threat Operations Center</h1>
        <p className="text-muted">Initiate lockouts, resolve warnings, and monitor brute force threats</p>
      </div>

      <div className="grid grid-2">
        {/* Panic Lockdown Controller */}
        <div className="card" style={{ border: securityData?.panic_lock_active ? '2px solid var(--color-danger)' : '1px solid var(--color-border)' }}>
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FaExclamationTriangle className={securityData?.panic_lock_active ? 'text-danger pulse' : 'text-warning'} />
              System Panic Lockdown
            </h3>
            {securityData?.panic_lock_active && <span className="badge badge-danger">LOCKED DOWN</span>}
          </div>

          {securityData?.panic_lock_active ? (
            <div className="text-center p-4">
              <div className="alert alert-danger mb-4">
                <strong>Lockdown active since:</strong> {new Date(securityData.panic_lock?.created_at).toLocaleString()}
                <br />
                <strong>Reason:</strong> {securityData.panic_lock?.reason}
              </div>
              <button className="btn btn-success btn-lg" onClick={handleDeactivatePanic}>
                <FaUnlock /> Clear Lockdown & Resume Systems
              </button>
            </div>
          ) : (
            <form onSubmit={handleActivatePanic}>
              <p className="text-muted" style={{ fontSize: '13px' }}>
                Activating lockdown immediately blocks students and staff from accessing or downloading files.
              </p>
              <div className="form-group">
                <label className="form-label">Lockdown Scope</label>
                <select className="form-control" value={panicType} onChange={(e) => setPanicType(e.target.value)}>
                  <option value="all">Suspend All Core App APIs</option>
                  <option value="downloads">Suspend Only Paper Downloads</option>
                  <option value="papers">Lock Down Released Papers</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Lockdown Rationale</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Suspected credential leak in CSE department"
                  value={panicReason}
                  onChange={(e) => setPanicReason(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-danger btn-full">
                <FaLock /> Dispatch Lockdown Command
              </button>
            </form>
          )}
        </div>

        {/* Security Alerts Grid */}
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h3>Active Threats / Warnings</h3>
            {securityData?.recent_alerts?.length > 0 && (
              <button className="btn btn-ghost btn-sm text-danger" title="Clear All Warnings" onClick={handleClearAllAlerts}>
                <FaTrash style={{ marginRight: '4px' }} /> Clear Warnings
              </button>
            )}
          </div>
          {securityData?.recent_alerts?.length === 0 ? (
            <div className="text-center p-8 text-muted">No unresolved security threats. Safe.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {securityData?.recent_alerts?.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'var(--color-bg-secondary)',
                    borderLeft: `4px solid ${alert.severity === 'critical' ? 'var(--color-danger)' : 'var(--color-warning)'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div className="font-semibold text-primary">{alert.alert_type.toUpperCase()}</div>
                    <div style={{ fontSize: '12px', marginTop: '2px', color: 'var(--color-text-secondary)' }}>{alert.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-danger">{alert.severity}</span>
                    {!alert.resolved && (
                      <button className="btn btn-sm btn-ghost text-success" onClick={() => handleResolveAlert(alert.id)}>
                        <FaCheck /> Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default SecurityCenter;
