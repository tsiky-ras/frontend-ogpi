import React, { useEffect, useState, useCallback } from 'react';
import {
  FaDatabase, FaSave, FaFileCsv, FaFileExcel, FaFileCode,
  FaPlay, FaCheckCircle, FaExclamationTriangle, FaClock,
} from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext.tsx';
import Header from '../../../components/header/Header.tsx';
import Sidebar from '../../../components/sidebar/Sidebar.tsx';
import Title from '../../../components/title/Title.tsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import './BackupConfig.css';

// ── Types ────────────────────────────────────────────────────────────────────

interface BackupConfig {
  id: number;
  frequence: 'JOUR' | 'SEMAINE' | 'MOIS';
  heureExecution: string;
  formatCsv: boolean;
  formatXlsx: boolean;
  formatJson: boolean;
  actif: boolean;
  lastRun: string | null;
  lastStatus: string | null;
  updatedBy: number | null;
  updatedAt: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

const BackupConfigPage: React.FC = () => {
  const { api } = useAuth();

  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/backup/config');
      setConfig(res.data);
    } catch {
      setError('Impossible de charger la configuration de backup.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.put('/backup/config', config);
      setSuccess('Configuration sauvegardée.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/backup/run');
      setSuccess('Export déclenché avec succès.');
      setTimeout(() => setSuccess(null), 4000);
      load(); // refresh last_run
    } catch {
      setError('Erreur lors du déclenchement.');
    } finally {
      setRunning(false);
    }
  };

  const handleDownload = async (format: 'csv' | 'xlsx' | 'json') => {
    setDownloading(format);
    try {
      const res = await api.get(`/backup/export?format=${format}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      const ext = format;
      a.download = `ogpi_export_${new Date().toISOString().slice(0,10)}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Erreur lors du téléchargement.');
    } finally {
      setDownloading(null);
    }
  };

  const set = (patch: Partial<BackupConfig>) =>
    setConfig(c => c ? { ...c, ...patch } : c);

  if (loading) {
    return (
      <div className="bc-layout">
        <Header />
        <div className="bc-wrapper">
          <aside className="bc-sidebar"><Sidebar /></aside>
          <main className="bc-main text-center py-5 text-muted">Chargement…</main>
        </div>
      </div>
    );
  }

  return (
    <div className="bc-layout">
      <Header />
      <div className="bc-wrapper">
        <aside className="bc-sidebar">
          <Sidebar />
        </aside>
        <main className="bc-main">
          <Title title="Exports & Sauvegardes" icon={<FaDatabase />} />

          {error   && <div className="alert alert-danger py-2 mb-3">{error}</div>}
          {success && <div className="alert alert-success py-2 mb-3">{success}</div>}

          {/* ── Configuration card ── */}
          {config && (
            <div className="bc-card">
              <h6><FaClock className="me-1 text-primary" /> Configuration des sauvegardes automatiques</h6>

              {/* Active toggle */}
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="bc-actif"
                  checked={config.actif}
                  onChange={e => set({ actif: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="bc-actif">
                  Sauvegardes automatiques activées
                </label>
              </div>

              <div className="row g-3">
                {/* Frequency */}
                <div className="col-12 col-md-6">
                  <div className="bc-label">Fréquence</div>
                  <div className="d-flex gap-2 flex-wrap">
                    {(['JOUR', 'SEMAINE', 'MOIS'] as const).map(f => (
                      <button
                        key={f}
                        className={`bc-freq-btn ${config.frequence === f ? 'active' : ''}`}
                        onClick={() => set({ frequence: f })}
                      >
                        {f === 'JOUR' ? 'Quotidien' : f === 'SEMAINE' ? 'Hebdomadaire' : 'Mensuel'}
                      </button>
                    ))}
                  </div>
                  <div className="text-muted mt-1" style={{ fontSize: '.75rem' }}>
                    {config.frequence === 'SEMAINE' && 'Chaque lundi'}
                    {config.frequence === 'MOIS' && 'Le 1er de chaque mois'}
                    {config.frequence === 'JOUR' && 'Tous les jours'}
                  </div>
                </div>

                {/* Hour */}
                <div className="col-6 col-md-3">
                  <div className="bc-label">Heure d'exécution</div>
                  <input
                    type="time"
                    className="form-control"
                    value={config.heureExecution}
                    onChange={e => set({ heureExecution: e.target.value })}
                  />
                </div>

                {/* Formats */}
                <div className="col-12 col-md-3">
                  <div className="bc-label">Formats générés</div>
                  <div className="d-flex flex-column gap-1">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="fcsv"
                        checked={config.formatCsv} onChange={e => set({ formatCsv: e.target.checked })} />
                      <label className="form-check-label" htmlFor="fcsv">CSV</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="fxlsx"
                        checked={config.formatXlsx} onChange={e => set({ formatXlsx: e.target.checked })} />
                      <label className="form-check-label" htmlFor="fxlsx">XLSX (Excel)</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox" id="fjson"
                        checked={config.formatJson} onChange={e => set({ formatJson: e.target.checked })} />
                      <label className="form-check-label" htmlFor="fjson">JSON</label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Last run info */}
              <div className="mt-3 pt-3 border-top d-flex flex-wrap align-items-center gap-3">
                <div style={{ fontSize: '.83rem' }}>
                  <span className="text-muted">Dernière exécution : </span>
                  {config.lastRun
                    ? <strong>{config.lastRun}</strong>
                    : <span className="bc-status-none">Jamais</span>}
                </div>
                <div style={{ fontSize: '.83rem' }}>
                  <span className="text-muted">Statut : </span>
                  {config.lastStatus === 'OK'   && <span className="bc-status-ok"><FaCheckCircle className="me-1" />OK</span>}
                  {config.lastStatus === 'ERREUR' && <span className="bc-status-error"><FaExclamationTriangle className="me-1" />Erreur</span>}
                  {!config.lastStatus && <span className="bc-status-none">—</span>}
                </div>
                {config.updatedAt && (
                  <div className="text-muted ms-auto" style={{ fontSize: '.75rem' }}>
                    Config modifiée le {config.updatedAt}
                  </div>
                )}
              </div>

              {/* Save + run buttons */}
              <div className="mt-3 d-flex gap-2 flex-wrap">
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  <FaSave className="me-1" />
                  {saving ? 'Sauvegarde…' : 'Sauvegarder la configuration'}
                </button>
                <button className="btn btn-outline-secondary" onClick={handleRunNow} disabled={running}>
                  <FaPlay className="me-1" />
                  {running ? 'En cours…' : 'Déclencher maintenant'}
                </button>
              </div>
            </div>
          )}

          {/* ── Manual export card ── */}
          <div className="bc-card">
            <h6><FaDatabase className="me-1 text-success" /> Export manuel</h6>
            <p className="text-muted mb-3" style={{ fontSize: '.85rem' }}>
              Téléchargez immédiatement un export de toutes les données (opportunités, projets, collaborateurs).
            </p>
            <div className="d-flex gap-2 flex-wrap">
              <button
                className="bc-export-btn bc-export-csv"
                onClick={() => handleDownload('csv')}
                disabled={!!downloading}
              >
                <FaFileCsv />
                {downloading === 'csv' ? 'Génération…' : 'Télécharger CSV'}
              </button>
              <button
                className="bc-export-btn bc-export-xlsx"
                onClick={() => handleDownload('xlsx')}
                disabled={!!downloading}
              >
                <FaFileExcel />
                {downloading === 'xlsx' ? 'Génération…' : 'Télécharger XLSX'}
              </button>
              <button
                className="bc-export-btn bc-export-json"
                onClick={() => handleDownload('json')}
                disabled={!!downloading}
              >
                <FaFileCode />
                {downloading === 'json' ? 'Génération…' : 'Télécharger JSON'}
              </button>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default BackupConfigPage;
