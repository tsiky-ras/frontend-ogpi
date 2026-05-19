import React, { useEffect, useState, useCallback } from 'react';
import { FaShieldAlt, FaHistory, FaSync } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext.tsx';
import Header from '../../../components/header/Header.tsx';
import Sidebar from '../../../components/sidebar/Sidebar.tsx';
import Title from '../../../components/title/Title.tsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import './GestionDroits.css';

// ── Types ────────────────────────────────────────────────────────────────────

interface Perm {
  permId: number;
  permCode: string;
  permLabel: string;
}

interface PermsGroup {
  category: string;
  perms: Perm[];
}

interface Role {
  roleId: number;
  roleLabel: string;
}

interface AuditEntry {
  roleLabel: string;
  permCode: string;
  permLabel: string;
  action: string;
  changedByUsername: string;
  changedAt: string;
}

interface PermMatrix {
  roles: Role[];
  permsGroups: PermsGroup[];
  rolePermIds: Record<number, number[]>;
  recentAudit: AuditEntry[];
}

// ── Component ─────────────────────────────────────────────────────────────────

const GestionDroitsPage: React.FC = () => {
  const { api, user } = useAuth();
  const isAdmin = (user?.role?.roleId === 1 || user?.role?.roleId === 2);

  const [matrix, setMatrix]       = useState<PermMatrix | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [toggling, setToggling]   = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [grantMap, setGrantMap]   = useState<Record<number, Set<number>>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/perms/matrix');
      const data: PermMatrix = res.data;
      setMatrix(data);
      const map: Record<number, Set<number>> = {};
      for (const [rid, ids] of Object.entries(data.rolePermIds)) {
        map[Number(rid)] = new Set(ids as number[]);
      }
      setGrantMap(map);
    } catch {
      setError('Impossible de charger la matrice des droits.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = useCallback(async (roleId: number, permId: number) => {
    const key = `${roleId}-${permId}`;
    if (toggling) return;
    setToggling(key);
    try {
      await api.post(`/perms/roles/${roleId}/toggle`, { permsId: permId });
      setGrantMap(prev => {
        const next = { ...prev };
        const set = new Set(next[roleId] ?? []);
        if (set.has(permId)) set.delete(permId); else set.add(permId);
        next[roleId] = set;
        return next;
      });
      if (showAudit) {
        const res = await api.get('/perms/matrix');
        setMatrix(m => m ? { ...m, recentAudit: res.data.recentAudit } : m);
      }
    } catch {
      setError('Erreur lors de la modification du droit.');
    } finally {
      setToggling(null);
    }
  }, [api, toggling, showAudit]);

  const roles  = matrix?.roles ?? [];
  const groups = matrix?.permsGroups ?? [];
  const audit  = matrix?.recentAudit ?? [];

  return (
    <div className="gd-layout">
      <Header />
      <div className="gd-wrapper">
        <aside className="gd-sidebar">
          <Sidebar />
        </aside>
        <main className="gd-main">
          <Title title="Gestion des droits" subtitle="Matrice des accès par rôle" icon={<FaShieldAlt />} />

          {/* Toolbar */}
          <div className="gd-toolbar">
            <span className="text-muted" style={{ fontSize: '.85rem' }}>
              Matrice des accès par rôle — cochez / décochez pour modifier
            </span>
            <button className="btn btn-sm btn-outline-secondary ms-auto" onClick={load}>
              <FaSync className="me-1" /> Actualiser
            </button>
            <button
              className={`btn btn-sm ${showAudit ? 'btn-info' : 'btn-outline-info'}`}
              onClick={() => setShowAudit(v => !v)}
            >
              <FaHistory className="me-1" /> Historique
            </button>
          </div>

          {error && <div className="alert alert-danger py-2">{error}</div>}

          {loading ? (
            <div className="text-center py-5 text-muted">Chargement…</div>
          ) : (
            <div className="gd-table-wrap">
              <table className="gd-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 220, textAlign: 'left' }}>Permission</th>
                    {roles.map(r => (
                      <th key={r.roleId}>{r.roleLabel}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map(group => (
                    <React.Fragment key={group.category}>
                      <tr className="gd-cat-row">
                        <th colSpan={roles.length + 1}>{group.category.toUpperCase()}</th>
                      </tr>
                      {group.perms.map(perm => (
                        <tr key={perm.permId}>
                          <td className="gd-perm-label">
                            {perm.permLabel}
                            <span className="gd-perm-code">{perm.permCode}</span>
                          </td>
                          {roles.map(role => {
                            const granted = grantMap[role.roleId]?.has(perm.permId) ?? false;
                            const key = `${role.roleId}-${perm.permId}`;
                            return (
                              <td key={role.roleId} className="gd-check-cell">
                                <input
                                  type="checkbox"
                                  className="gd-check"
                                  checked={granted}
                                  disabled={!isAdmin || toggling === key}
                                  onChange={() => handleToggle(role.roleId, perm.permId)}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Audit log */}
          {showAudit && (
            <div className="gd-audit">
              <h6><FaHistory className="me-2" />Historique des modifications (50 dernières)</h6>
              {audit.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '.85rem' }}>
                  Aucune modification enregistrée.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="gd-audit-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Rôle</th>
                        <th>Permission</th>
                        <th>Action</th>
                        <th>Par</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.map((a, i) => (
                        <tr key={i}>
                          <td>{a.changedAt}</td>
                          <td>{a.roleLabel}</td>
                          <td>
                            {a.permLabel}
                            <span style={{ fontSize: '.7rem', color: '#94a3b8', marginLeft: '.35rem' }}>
                              {a.permCode}
                            </span>
                          </td>
                          <td>
                            <span className={a.action === 'GRANT' ? 'gd-badge-grant' : 'gd-badge-revoke'}>
                              {a.action === 'GRANT' ? '+ Accordé' : '− Révoqué'}
                            </span>
                          </td>
                          <td>{a.changedByUsername}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default GestionDroitsPage;
