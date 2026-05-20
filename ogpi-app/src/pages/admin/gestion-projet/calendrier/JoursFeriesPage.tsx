// src/pages/admin/gestion-projet/calendrier/JoursFeriesPage.tsx

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  FaCalendarTimes, FaPlus, FaEdit, FaTrash,
  FaToggleOn, FaToggleOff, FaTimes, FaMagic, FaExclamationTriangle,
  FaCalendarCheck, FaCalendarAlt, FaCheckCircle,
} from 'react-icons/fa';
import { JoursFeriesService } from '../../../../services/projet/calendrier/JoursFeriesService.tsx';
import {
  JourFerie, JourFerieForm, JourFerieType,
  MOIS_LABELS, formatDateFixe,
} from '../../../../types/projet/calendrier/JourFerie.tsx';
import { useAuth } from '../../../../context/AuthContext.tsx';
import Header from '../../../../components/header/Header.tsx';
import Sidebar from '../../../../components/sidebar/Sidebar.tsx';
import Title from '../../../../components/title/Title.tsx';
import StatCard from '../../../../components/stat/StatCard.tsx';
import Button from '../../../../components/button/Button.tsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import './JoursFeriesPage.css';

// ────────────────────────────────────────────────────────────────────────────
// Composant principal
// ────────────────────────────────────────────────────────────────────────────
const JoursFeriesPage: React.FC = () => {
  const { api } = useAuth();
  const svc = useMemo(() => new JoursFeriesService(api), [api]);

  const [jours, setJours]           = useState<JourFerie[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);

  // Filtres
  const [filtreType, setFiltreType] = useState<'' | JourFerieType>('');
  const [filtreActif, setFiltreActif] = useState<'' | 'true' | 'false'>('');

  // Modal création / édition
  const [modalOpen, setModalOpen]     = useState(false);
  const [editing, setEditing]         = useState<JourFerie | null>(null);
  const [form, setForm]               = useState<JourFerieForm>(defaultForm());
  const [saving, setSaving]           = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);

  // Génération Pâques
  const [anneePaques, setAnneePaques] = useState<number>(new Date().getFullYear());
  const [generant, setGenerant]       = useState(false);

  // ── Chargement ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await svc.getAll();
      setJours(data);
    } catch {
      setError('Impossible de charger les jours fériés.');
    } finally {
      setLoading(false);
    }
  }, [svc]);

  useEffect(() => { load(); }, [load]);

  // ── Filtrage local ────────────────────────────────────────────────────────
  const joursFiltered = jours.filter(jf => {
    if (filtreType  && jf.type        !== filtreType)          return false;
    if (filtreActif && String(jf.actif) !== filtreActif)       return false;
    return true;
  });

  // ── Ouvrir modal ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm());
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (jf: JourFerie) => {
    setEditing(jf);
    setForm({
      libelle:     jf.libelle,
      type:        jf.type,
      mois:        jf.mois,
      jour:        jf.jour,
      dateExacte:  jf.dateExacte,
      actif:       jf.actif,
      description: jf.description,
    });
    setFormError(null);
    setModalOpen(true);
  };

  // ── Sauvegarde ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.libelle.trim()) { setFormError('Le libellé est obligatoire.'); return; }
    if (form.type === 'FIXE' && (!form.mois || !form.jour)) {
      setFormError('Mois et jour sont obligatoires pour un férié FIXE.');
      return;
    }
    if (form.type === 'VARIABLE' && !form.dateExacte) {
      setFormError('La date exacte est obligatoire pour un férié VARIABLE.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await svc.update(editing.id, form);
        flash('Jour férié modifié.');
      } else {
        await svc.create(form);
        flash('Jour férié créé.');
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      setFormError(e?.response?.data?.message ?? 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle actif ─────────────────────────────────────────────────────────
  const handleToggle = async (jf: JourFerie) => {
    try {
      await svc.setActif(jf.id, !jf.actif);
      setJours(prev => prev.map(j => j.id === jf.id ? { ...j, actif: !j.actif } : j));
    } catch {
      setError('Impossible de modifier le statut.');
    }
  };

  // ── Suppression ───────────────────────────────────────────────────────────
  const handleDelete = async (jf: JourFerie) => {
    if (!window.confirm(`Supprimer « ${jf.libelle} » ?`)) return;
    try {
      await svc.delete(jf.id);
      setJours(prev => prev.filter(j => j.id !== jf.id));
      flash('🗑 Jour férié supprimé.');
    } catch {
      setError('Impossible de supprimer ce jour férié.');
    }
  };

  // ── Génération Pâques ─────────────────────────────────────────────────────
  const handleGenererPaques = async () => {
    setGenerant(true);
    try {
      await svc.genererPaques(anneePaques);
      flash(`Fériés Pâques ${anneePaques} générés.`);
      await load();
    } catch {
      setError('Impossible de générer les fériés Pâques.');
    } finally {
      setGenerant(false);
    }
  };

  // ── Flash message ─────────────────────────────────────────────────────────
  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3500);
  };

  // ── Format date affichage ─────────────────────────────────────────────────
  const formatDate = (jf: JourFerie): string => {
    if (jf.type === 'FIXE') return formatDateFixe(jf) + ' (chaque année)';
    if (jf.dateExacte) {
      const d = new Date(jf.dateExacte + 'T00:00:00');
      return d.toLocaleDateString('fr-MG', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    return '—';
  };

  // ════════════════════════════════════════════════════════════════════════
  // Rendu
  // ════════════════════════════════════════════════════════════════════════
  const totalActifs   = jours.filter(j => j.actif).length;
  const totalInactifs = jours.filter(j => !j.actif).length;
  const totalVariables = jours.filter(j => j.type === 'VARIABLE').length;

  return (
    <div className="jf-layout">
      <Header />

      <div className="jf-wrapper">
        <aside className="jf-sidebar">
          <Sidebar />
        </aside>

        <main className="jf-main">
          <div className="container-fluid">

            {/* ── Titre + bouton ─────────────────────────────────────────── */}
            <div className="row align-items-center mb-4">
              <div className="col-md-8">
                <Title
                  title="Jours fériés"
                  subtitle="Gestion des jours non ouvrables pris en compte dans les plannings"
                />
              </div>
              <div className="col-md-4 text-end">
                <Button
                  label="Ajouter un jour férié"
                  icon={<FaPlus />}
                  onClick={openCreate}
                />
              </div>
            </div>

            {/* ── Alertes globales ───────────────────────────────────────── */}
            {success && (
              <div className="alert alert-success d-flex align-items-center gap-2 mb-3 py-2" role="alert">
                <FaCheckCircle /> {success}
              </div>
            )}
            {error && (
              <div className="alert alert-danger d-flex align-items-center gap-2 mb-3 py-2" role="alert">
                <FaExclamationTriangle /> {error}
                <button type="button" className="btn-close ms-auto" aria-label="Fermer" onClick={() => setError(null)} />
              </div>
            )}

            {/* ── Barre d'outils ─────────────────────────────────────────── */}
            <div className="jf-toolbar">
              <div className="jf-toolbar-left">
                <select
                  className="form-select form-select-sm jf-filter-select"
                  value={filtreType}
                  onChange={e => setFiltreType(e.target.value as any)}
                >
                  <option value="">Tous les types</option>
                  <option value="FIXE">Fixes</option>
                  <option value="VARIABLE">Variables (Pâques…)</option>
                </select>
                <select
                  className="form-select form-select-sm jf-filter-select"
                  value={filtreActif}
                  onChange={e => setFiltreActif(e.target.value as any)}
                >
                  <option value="">Tous statuts</option>
                  <option value="true">Actifs</option>
                  <option value="false">Inactifs</option>
                </select>
              </div>

              <div className="jf-toolbar-right">
                <span className="text-muted" style={{ fontSize: '0.82rem' }}>Générer Pâques :</span>
                <input
                  type="number"
                  className="form-control form-control-sm jf-year-input"
                  value={anneePaques}
                  min={2024}
                  max={2100}
                  onChange={e => setAnneePaques(Number(e.target.value))}
                />
                <button
                  className="btn btn-sm jf-btn-generate"
                  onClick={handleGenererPaques}
                  disabled={generant}
                >
                  {generant ? 'Génération…' : 'Générer'}
                </button>
              </div>
            </div>

            {/* ── Tableau ────────────────────────────────────────────────── */}
            <div className="table-responsive jf-table-wrapper">
              {loading ? (
                <div className="jf-empty">
                  <div className="spinner-border text-secondary spinner-border-sm mb-2" role="status" />
                  <p>Chargement…</p>
                </div>
              ) : joursFiltered.length === 0 ? (
                <div className="jf-empty">
                  <FaCalendarTimes />
                  <p>Aucun jour férié trouvé.</p>
                </div>
              ) : (
                <table className="table jf-table">
                  <thead>
                    <tr>
                      <th>Libellé</th>
                      <th>Type</th>
                      <th>Date / Récurrence</th>
                      <th>Statut</th>
                      <th>Description</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {joursFiltered.map(jf => (
                      <tr key={jf.id}>
                        <td className="fw-600">{jf.libelle}</td>
                        <td>
                          <span className={`badge-type ${jf.type === 'FIXE' ? 'fixe' : 'variable'}`}>
                            {jf.type === 'FIXE' ? 'Fixe' : 'Variable'}
                          </span>
                        </td>
                        <td className="text-secondary" style={{ fontSize: '0.85rem' }}>
                          {formatDate(jf)}
                        </td>
                        <td>
                          <span className={`badge-actif ${jf.actif ? 'on' : 'off'}`}>
                            {jf.actif ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="text-muted" style={{ fontSize: '0.82rem', maxWidth: 240 }}>
                          {jf.description || '—'}
                        </td>
                        <td>
                          <div className="jf-actions justify-content-end">
                            <button className="btn-icon edit" title="Modifier" onClick={() => openEdit(jf)}>
                              <FaEdit />
                            </button>
                            <button
                              className={`btn-icon ${jf.actif ? 'toggle-off' : 'toggle-on'}`}
                              title={jf.actif ? 'Désactiver' : 'Activer'}
                              onClick={() => handleToggle(jf)}
                            >
                              {jf.actif ? <FaToggleOff /> : <FaToggleOn />}
                            </button>
                            <button className="btn-icon delete" title="Supprimer" onClick={() => handleDelete(jf)}>
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* ── Légende ────────────────────────────────────────────────── */}
            <p className="text-muted mt-3" style={{ fontSize: '0.78rem' }}>
              <strong>Fixe</strong> — même jour chaque année (ex : 26 juin).&ensp;
              <strong>Variable</strong> — date mobile calculée (ex : Lundi de Pâques).
              Utiliser le bouton <em>Générer</em> pour pré-charger les fériés Pâques d'une année.
            </p>

          </div>
        </main>
      </div>

      {/* ══ MODAL création / édition ═════════════════════════════════════ */}
      {modalOpen && (
        <div className="jf-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="jf-modal" onClick={e => e.stopPropagation()}>

            <div className="jf-modal-header">
              <h2>{editing ? 'Modifier le jour férié' : 'Nouveau jour férié'}</h2>
              <button className="btn-icon" onClick={() => setModalOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="jf-modal-body">

              {formError && (
                <div className="alert alert-danger d-flex align-items-center gap-2 py-2" role="alert">
                  <FaExclamationTriangle /> {formError}
                </div>
              )}

              <div className="jf-field">
                <label>Libellé *</label>
                <input
                  type="text"
                  value={form.libelle}
                  onChange={e => setForm(f => ({ ...f, libelle: e.target.value }))}
                  placeholder="Ex : Fête de l'Indépendance"
                />
              </div>

              <div className="jf-field">
                <label>Type *</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({
                    ...f,
                    type: e.target.value as JourFerieType,
                    mois: undefined, jour: undefined, dateExacte: undefined,
                  }))}
                >
                  <option value="FIXE">Fixe — même jour chaque année</option>
                  <option value="VARIABLE">Variable — date précise (Pâques…)</option>
                </select>
              </div>

              {form.type === 'FIXE' ? (
                <div className="jf-field-row">
                  <div className="jf-field">
                    <label>Mois *</label>
                    <select
                      value={form.mois ?? ''}
                      onChange={e => setForm(f => ({ ...f, mois: Number(e.target.value) || undefined }))}
                    >
                      <option value="">— Sélectionner —</option>
                      {Object.entries(MOIS_LABELS).map(([num, nom]) => (
                        <option key={num} value={num}>{nom}</option>
                      ))}
                    </select>
                  </div>
                  <div className="jf-field">
                    <label>Jour *</label>
                    <input
                      type="number" min={1} max={31}
                      value={form.jour ?? ''}
                      onChange={e => setForm(f => ({ ...f, jour: Number(e.target.value) || undefined }))}
                      placeholder="ex: 26"
                    />
                  </div>
                </div>
              ) : (
                <div className="jf-field">
                  <label>Date exacte *</label>
                  <input
                    type="date"
                    value={form.dateExacte ?? ''}
                    onChange={e => setForm(f => ({ ...f, dateExacte: e.target.value || undefined }))}
                  />
                </div>
              )}

              <div className="jf-field">
                <label>Description</label>
                <textarea
                  rows={2}
                  value={form.description ?? ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Explication optionnelle…"
                />
              </div>

              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="chk-actif"
                  checked={form.actif}
                  onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))}
                />
                <label className="form-check-label" htmlFor="chk-actif" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                  Actif (pris en compte pour l'ajustement des dates)
                </label>
              </div>
            </div>

            <div className="jf-modal-footer">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setModalOpen(false)}>
                Annuler
              </button>
              <button className="btn jf-btn-save btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <><span className="spinner-border spinner-border-sm me-1" />Enregistrement…</>
                ) : (
                  editing ? 'Enregistrer' : 'Créer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Valeur par défaut du formulaire ─────────────────────────────────────────
function defaultForm(): JourFerieForm {
  return { libelle: '', type: 'FIXE', actif: true };
}

export default JoursFeriesPage;