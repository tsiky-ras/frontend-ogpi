import React, { useState, useEffect, useCallback } from "react";
import {
  FaPlus, FaTrash, FaEdit, FaSave, FaTimes, FaSpinner,
  FaCar, FaHotel, FaUtensils, FaFileInvoiceDollar, FaBoxOpen,
  FaChevronDown, FaChevronUp,
} from "react-icons/fa";
import "./ChargesAnnexesTab.css";
// ─── Types & Service importés depuis le fichier dédié ────────────────────────
import type { ChargeType, ChargeAnnexe, ChargeAnnexeCreateDTO } from "../../../../services/projet/backlog/ChargesAnnexesService.tsx";
import { ChargesAnnexesService } from "../../../../services/projet/backlog/ChargesAnnexesService.tsx";
// ─── Re-exports (compatibilité imports existants) ─────────────────────────────
export type { ChargeType, ChargeAnnexe, ChargeAnnexeCreateDTO } from "../../../../services/projet/backlog/ChargesAnnexesService.tsx";
export { ChargesAnnexesService } from "../../../../services/projet/backlog/ChargesAnnexesService.tsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CHARGE_META: Record<ChargeType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  TRANSPORT:    { label: "Transport",    icon: <FaCar size={12} />,               color: "#3b82f6", bg: "#eff6ff" },
  HEBERGEMENT:  { label: "Hébergement",  icon: <FaHotel size={12} />,             color: "#8b5cf6", bg: "#f5f3ff" },
  PER_DIEM:     { label: "Per diem",     icon: <FaUtensils size={12} />,          color: "#f59e0b", bg: "#fffbeb" },
  AUTRE:        { label: "Autre",        icon: <FaFileInvoiceDollar size={12} />, color: "#64748b", bg: "#f1f5f9" },
};

const fmt = (n: number, devise = "") =>
  `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${devise ? " " + devise : ""}`;

const EMPTY_FORM = { libelle: "", type: "TRANSPORT" as ChargeType, montant: 0, quantite: 1, description: "" };

// ─── TypeBadge ───────────────────────────────────────────────────────────────
const TypeBadge: React.FC<{ type: ChargeType }> = ({ type }) => {
  const m = CHARGE_META[type];
  return (
    <span className="ca-type-badge" style={{ color: m.color, background: m.bg, borderColor: m.color + "33" }}>
      {m.icon} {m.label}
    </span>
  );
};

// ─── RowForm ─────────────────────────────────────────────────────────────────
interface RowFormProps {
  initial?: Partial<typeof EMPTY_FORM>;
  onSave: (data: typeof EMPTY_FORM) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}
const RowForm: React.FC<RowFormProps> = ({ initial, onSave, onCancel, saving, error }) => {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="ca-row-form">
      {error && <div className="ca-row-form__error">{error}</div>}
      <div className="ca-row-form__grid">
        <div className="ca-field">
          <label className="ca-label">Libellé *</label>
          <input className="ca-input" placeholder="Ex: Billet avion Paris-Tana" value={form.libelle}
            onChange={e => set("libelle", e.target.value)} />
        </div>
        <div className="ca-field">
          <label className="ca-label">Type *</label>
          <select className="ca-input" value={form.type} onChange={e => set("type", e.target.value as ChargeType)}>
            {(Object.keys(CHARGE_META) as ChargeType[]).map(t => (
              <option key={t} value={t}>{CHARGE_META[t].label}</option>
            ))}
          </select>
        </div>
        <div className="ca-field ca-field--sm">
          <label className="ca-label">Montant unitaire *</label>
          <input className="ca-input" type="number" min="0" step="0.01" value={form.montant}
            onChange={e => set("montant", parseFloat(e.target.value) || 0)}
            onWheel={e => (e.target as HTMLInputElement).blur()} />
        </div>
        <div className="ca-field ca-field--sm">
          <label className="ca-label">Quantité *</label>
          <input className="ca-input" type="number" min="1" step="1" value={form.quantite}
            onChange={e => set("quantite", parseInt(e.target.value) || 1)}
            onWheel={e => (e.target as HTMLInputElement).blur()} />
        </div>
        <div className="ca-field ca-field--full">
          <label className="ca-label">Description (optionnel)</label>
          <input className="ca-input" placeholder="Détails additionnels" value={form.description ?? ""}
            onChange={e => set("description", e.target.value)} />
        </div>
      </div>
      <div className="ca-row-form__footer">
        <div className="ca-row-form__total">
          Sous-total : <strong>{fmt(form.montant * form.quantite)}</strong>
        </div>
        <div className="ca-row-form__actions">
          <button className="ca-btn ca-btn--ghost" onClick={onCancel} disabled={saving}>
            <FaTimes size={11} /> Annuler
          </button>
          <button className="ca-btn ca-btn--primary" disabled={saving || !form.libelle.trim()}
            onClick={() => onSave(form)}>
            {saving ? <FaSpinner className="ca-spin" /> : <FaSave size={11} />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── GroupSection ─────────────────────────────────────────────────────────────
const GroupSection: React.FC<{
  type: ChargeType; charges: ChargeAnnexe[]; deviseAbr: string;
  onEdit: (c: ChargeAnnexe) => void; onDelete: (id: number) => void; deleting: number | null;
}> = ({ type, charges, deviseAbr, onEdit, onDelete, deleting }) => {
  const [open, setOpen] = useState(true);
  const m = CHARGE_META[type];
  const total = charges.reduce((s, c) => s + c.montant * c.quantite, 0);

  return (
    <div className="ca-group">
      <div className="ca-group__header" onClick={() => setOpen(v => !v)}>
        <span className="ca-group__icon" style={{ color: m.color }}>{m.icon}</span>
        <span className="ca-group__title" style={{ color: m.color }}>{m.label}</span>
        <span className="ca-group__count">{charges.length} élément{charges.length !== 1 ? "s" : ""}</span>
        <span className="ca-group__total">{fmt(total, deviseAbr)}</span>
        <span className="ca-group__chevron">{open ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}</span>
      </div>
      {open && (
        <div className="ca-group__body">
          <table className="ca-table">
            <thead>
              <tr>
                <th>Libellé</th>
                <th className="ca-th-r">Montant unit.</th>
                <th className="ca-th-r">Qté</th>
                <th className="ca-th-r">Sous-total</th>
                <th>Description</th>
                <th className="ca-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {charges.map(c => (
                <tr key={c.id} className="ca-table__row">
                  <td className="ca-cell-label">{c.libelle}</td>
                  <td className="ca-cell-r">{fmt(c.montant, deviseAbr)}</td>
                  <td className="ca-cell-r">{c.quantite}</td>
                  <td className="ca-cell-r ca-cell-total">{fmt(c.montant * c.quantite, deviseAbr)}</td>
                  <td className="ca-cell-desc">{c.description || <span className="ca-muted">—</span>}</td>
                  <td className="ca-cell-actions">
                    <button className="ca-icon-btn ca-icon-btn--edit" title="Modifier" onClick={() => onEdit(c)}>
                      <FaEdit size={12} />
                    </button>
                    <button className="ca-icon-btn ca-icon-btn--del" title="Supprimer"
                      onClick={() => onDelete(c.id)} disabled={deleting === c.id}>
                      {deleting === c.id ? <FaSpinner size={11} className="ca-spin" /> : <FaTrash size={11} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="ca-table__subtotal">
                <td colSpan={3}>Sous-total {m.label}</td>
                <td className="ca-cell-r ca-cell-subtotal">{fmt(total, deviseAbr)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
interface ChargesAnnexesTabProps {
  backlogId: number | null;
  deviseAbr?: string | null;
  budgetRH?: number;
  onTotalChange?: (total: number) => void;
  service: ChargesAnnexesService;
}

const ChargesAnnexesTab: React.FC<ChargesAnnexesTabProps> = ({
  backlogId, deviseAbr = "€", budgetRH = 0, onTotalChange, service,
}) => {
  const devise = deviseAbr ?? "€";
  const [charges, setCharges]     = useState<ChargeAnnexe[]>([]);
  const [loading, setLoading]     = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!backlogId) return;
    setLoading(true);
    try { setCharges(await service.getByBacklogId(backlogId)); }
    catch { setCharges([]); }
    finally { setLoading(false); }
  }, [backlogId, service]);

  useEffect(() => { load(); }, [load]);

  const total = charges.reduce((s, c) => s + c.montant * c.quantite, 0);
  useEffect(() => { onTotalChange?.(total); }, [total, onTotalChange]);

  const handleAdd = async (form: typeof EMPTY_FORM) => {
    if (!backlogId) return;
    setSaving(true); setFormError(null);
    try {
      const created = await service.create({ ...form, backlogId });
      setCharges(prev => [...prev, created]);
      setShowForm(false);
    } catch { setFormError("Erreur lors de l'ajout. Veuillez réessayer."); }
    finally { setSaving(false); }
  };

  const handleEdit = async (form: typeof EMPTY_FORM) => {
    if (editingId === null) return;
    setSaving(true); setFormError(null);
    try {
      const updated = await service.update(editingId, form);
      setCharges(prev => prev.map(c => c.id === editingId ? updated : c));
      setEditingId(null);
    } catch { setFormError("Erreur lors de la mise à jour."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Supprimer cette charge annexe ?")) return;
    setDeleting(id);
    try {
      await service.delete(id);
      setCharges(prev => prev.filter(c => c.id !== id));
    } catch { alert("Erreur lors de la suppression."); }
    finally { setDeleting(null); }
  };

  const byType = (Object.keys(CHARGE_META) as ChargeType[]).reduce((acc, t) => {
    acc[t] = charges.filter(c => c.type === t);
    return acc;
  }, {} as Record<ChargeType, ChargeAnnexe[]>);

  const editingCharge = editingId !== null ? charges.find(c => c.id === editingId) : null;

  if (!backlogId) {
    return (
      <div className="ca-empty-state">
        <FaBoxOpen size={32} className="ca-empty-icon" />
        <p>Veuillez sélectionner un backlog pour gérer les charges annexes.</p>
      </div>
    );
  }

  return (
    <div className="ca-wrapper">
      <div className="ca-header">
        <div>
          <h5 className="ca-header__title">Charges Annexes</h5>
          <p className="ca-header__sub">Transport, hébergement, per diem et autres frais — inclus dans le budget total</p>
        </div>
        <button className="ca-btn ca-btn--primary" onClick={() => { setShowForm(true); setEditingId(null); }}>
          <FaPlus size={11} /> Ajouter une charge
        </button>
      </div>

      <div className="ca-budget-banner">
        <div className="ca-budget-item">
          <span className="ca-budget-val">{fmt(budgetRH, devise)}</span>
          <span className="ca-budget-lbl">Budget RH (profils)</span>
        </div>
        <div className="ca-budget-sep">+</div>
        <div className="ca-budget-item">
          <span className="ca-budget-val ca-budget-val--annexe">{fmt(total, devise)}</span>
          <span className="ca-budget-lbl">Charges annexes</span>
        </div>
        <div className="ca-budget-sep">=</div>
        <div className="ca-budget-item ca-budget-item--total">
          <span className="ca-budget-val ca-budget-val--total">{fmt(budgetRH + total, devise)}</span>
          <span className="ca-budget-lbl">Budget total projet</span>
        </div>
      </div>

      {showForm && (
        <div className="ca-form-section">
          <div className="ca-form-section__title"><FaPlus size={11} /> Nouvelle charge annexe</div>
          <RowForm onSave={handleAdd} onCancel={() => { setShowForm(false); setFormError(null); }}
            saving={saving} error={formError} />
        </div>
      )}

      {editingId !== null && editingCharge && (
        <div className="ca-form-section ca-form-section--edit">
          <div className="ca-form-section__title"><FaEdit size={11} /> Modifier : {editingCharge.libelle}</div>
          <RowForm
            initial={{ libelle: editingCharge.libelle, type: editingCharge.type,
              montant: editingCharge.montant, quantite: editingCharge.quantite,
              description: editingCharge.description ?? "" }}
            onSave={handleEdit}
            onCancel={() => { setEditingId(null); setFormError(null); }}
            saving={saving} error={formError} />
        </div>
      )}

      {loading && (
        <div className="ca-loading"><FaSpinner className="ca-spin" size={20} /> Chargement…</div>
      )}

      {!loading && charges.length === 0 && (
        <div className="ca-empty-state">
          <FaFileInvoiceDollar size={32} className="ca-empty-icon" />
          <p>Aucune charge annexe saisie pour ce backlog.</p>
          <p className="ca-empty-sub">Ajoutez des frais de transport, hébergement, per diem ou autres pour qu'ils soient pris en compte dans le budget total.</p>
        </div>
      )}

      {!loading && charges.length > 0 && (
        <div className="ca-groups">
          {(Object.keys(CHARGE_META) as ChargeType[]).map(type => {
            const list = byType[type];
            if (!list.length) return null;
            return (
              <GroupSection key={type} type={type} charges={list} deviseAbr={devise}
                onEdit={c => { setEditingId(c.id); setShowForm(false); setFormError(null); }}
                onDelete={handleDelete} deleting={deleting} />
            );
          })}

          <div className="ca-recap">
            <div className="ca-recap__title">Récapitulatif charges annexes</div>
            <table className="ca-table ca-table--recap">
              <tbody>
                {(Object.keys(CHARGE_META) as ChargeType[]).map(type => {
                  const list = byType[type];
                  if (!list.length) return null;
                  const t = list.reduce((s, c) => s + c.montant * c.quantite, 0);
                  return (
                    <tr key={type} className="ca-table__row">
                      <td><TypeBadge type={type} /></td>
                      <td className="ca-cell-r">{fmt(t, devise)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="ca-table__grand">
                  <td>TOTAL CHARGES ANNEXES</td>
                  <td className="ca-cell-r ca-cell-grand">{fmt(total, devise)}</td>
                </tr>
                <tr className="ca-table__super-grand">
                  <td>BUDGET TOTAL (RH + Annexes)</td>
                  <td className="ca-cell-r ca-cell-super-grand">{fmt(budgetRH + total, devise)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChargesAnnexesTab;
