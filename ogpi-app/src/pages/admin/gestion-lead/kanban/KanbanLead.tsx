import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { LeadService } from "../../../../services/lead/LeadService.tsx";
import { Lead } from "../../../../types/lead/Lead.tsx";
import FormLead from "../form/FormLead.tsx";
import DetailsLead from "../details/DetailsLead.tsx";
import MenuListeLead from "../menu/MenuListeLead.tsx";
import BacklogModal from "../backlog/BacklogModal.tsx";
import { useLeadTechFinDetailsService } from "../../../../services/lead/tech-fin/LeadTechFinDetailsService.tsx";
import { BacklogService } from "../../../../services/lead/backlog/BacklogService.tsx";

// ─── React Icons ─────────────────────────────────────────────────────────────
import {
  FaSearch,
  FaBuilding,
  FaFolder,
  FaCalendarAlt,
  FaGlobe,
  FaTag,
  FaUser,
  FaCheck,
  FaTimes,
  FaChevronRight,
  FaStar,
  FaLayerGroup,
  FaClipboardList,
  FaPencilAlt,
  FaFileAlt,
  FaCheckDouble,
  FaFileSignature,
  FaMagic,
  FaRocket,
  FaTrophy,
  FaBan,
} from "react-icons/fa";
import { FiFilter } from "react-icons/fi";
import { MdOutlinePendingActions } from "react-icons/md";

import "./KanbanLead.css";

// ─── Kanban columns (étapes leadStep.id) ─────────────────────────────────────

interface KanbanColumn {
  key: string;
  label: string;
  color: string;
  Icon: React.ElementType;
  stepIds: number[];
  statusIds?: number[];
}

const COLUMNS: KanbanColumn[] = [
  { key: "ouvert",               label: "Ouvert",                color: "#6366f1", Icon: FaLayerGroup,      stepIds: [1],  statusIds: [1] },
  { key: "nogo",                 label: "No Go",                 color: "#e84c3d", Icon: FaBan,             stepIds: [2],  statusIds: [2] },
  { key: "analyse_technique",    label: "Analyse technique",     color: "#3b82f6", Icon: FaClipboardList,   stepIds: [3],  statusIds: [] },
  { key: "validation_technique", label: "Validation technique",  color: "#8b5cf6", Icon: FaCheckDouble,     stepIds: [4],  statusIds: [] },
  { key: "analyse_financiere",   label: "Analyse financière",    color: "#f59e0b", Icon: FaFileAlt,         stepIds: [5],  statusIds: [] },
  { key: "validation_financiere",label: "Validation financière", color: "#ec4899", Icon: FaFileSignature,   stepIds: [6],  statusIds: [] },
  { key: "redaction",            label: "Rédaction",             color: "#f97316", Icon: FaPencilAlt,       stepIds: [7],  statusIds: [3] },
  { key: "revue_qualite",        label: "Revue qualité",         color: "#14b8a6", Icon: FaMagic,           stepIds: [8],  statusIds: [4] },
  { key: "soumission",           label: "Soumission offre",      color: "#0ea5e9", Icon: FaRocket,          stepIds: [9],  statusIds: [] },
  { key: "en_cours_evaluation",  label: "En cours d'evaluation", color: "#0ea5e9", Icon: FaRocket,          stepIds: [10],  statusIds: [] },
  { key: "gagnee",               label: "Gagnée",                color: "#10b981", Icon: FaTrophy,          stepIds: [11], statusIds: [5] },
  { key: "perdue",               label: "Perdue",                color: "#64748b", Icon: FaTimes,           stepIds: [12], statusIds: [6] },
];

const STATUS_MAP: Record<number, { cls: string; label: string }> = {
  1: { cls: "badge-info",      label: "Ouvert" },
  2: { cls: "badge-danger",    label: "No Go" },
  3: { cls: "badge-warning",   label: "En rédaction" },
  4: { cls: "badge-primary",   label: "En évaluation" },
  5: { cls: "badge-success",   label: "Gagnée" },
  6: { cls: "badge-secondary", label: "Perdue" },
};

const STEP_MAP: Record<number, { cls: string; label: string }> = {
  1:  { cls: "badge-secondary", label: "Ouvert" },
  2:  { cls: "badge-danger",    label: "No Go" },
  3:  { cls: "badge-info",      label: "Analyse technique" },
  4:  { cls: "badge-primary",   label: "Validation technique" },
  5:  { cls: "badge-info",      label: "Analyse financière" },
  6:  { cls: "badge-primary",   label: "Validation financière" },
  7:  { cls: "badge-warning",   label: "Rédaction" },
  8:  { cls: "badge-warning",   label: "Revue qualité" },
  9:  { cls: "badge-success",   label: "Soumission offre" },
  10:  { cls: "badge-warning",   label: "En cours d'evaluation" },
  11: { cls: "badge-success",   label: "Gagnée" },
  12: { cls: "badge-secondary", label: "Perdue" },
};

// ─── Utils ────────────────────────────────────────────────────────────────────

function getColumnKey(lead: Lead): string {
  const stepId = lead.currentLeadStep?.leadStep?.id;
  if (stepId) {
    const col = COLUMNS.find((c) => c.stepIds.includes(stepId));
    if (col) return col.key;
  }
  const statusId = lead.status?.id;
  if (statusId) {
    const col = COLUMNS.find((c) => c.statusIds?.includes(statusId));
    if (col) return col.key;
  }
  return "ouvert";
}

function getInitials(lead: Lead): string {
  const parts = (lead.name || "").trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (lead.name?.[0] || "?").toUpperCase();
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  lead: Lead;
  colColor: string;
  canDrag: boolean;
  onDragStart: (e: React.DragEvent, lead: Lead) => void;
  onDetails: () => void;
  onEdit: () => void;
  onBacklog: () => void;
}

const KanbanCard: React.FC<CardProps> = ({
  lead, colColor, canDrag, onDragStart, onDetails, onEdit, onBacklog,
}) => {
  const stepId = lead.currentLeadStep?.leadStep?.id;
  const statusId = lead.status?.id;
  const stepInfo = stepId ? STEP_MAP[stepId] : null;
  const statusInfo = statusId ? STATUS_MAP[statusId] : null;

  return (
    <div
      className="kb-card"
      style={{ "--col-color": colColor, cursor: canDrag ? 'grab' : 'default' } as React.CSSProperties}
      draggable={canDrag}
      onDragStart={canDrag ? (e) => onDragStart(e, lead) : undefined}
    >
      {/* Header */}
      <div className="kb-card-header">
        <div
          className="kb-avatar"
          style={{ background: `linear-gradient(135deg, ${colColor}cc, ${colColor}55)` }}
        >
          {getInitials(lead)}
        </div>
        <div className="kb-card-info">
          <span className="kb-card-name">{lead.name || "Sans nom"}</span>
          {lead.reference && <span className="kb-card-ref">{lead.reference}</span>}
        </div>
        <div
          className="kb-card-menu"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <MenuListeLead
            onDetails={onDetails}
            onEdit={onEdit}
            onViewBacklog={onBacklog}
          />
        </div>
      </div>

      {/* Body */}
      <div className="kb-card-body">
        {lead.client?.name && (
          <div className="kb-card-row">
            <FaBuilding className="kb-icon" />
            <span className="kb-card-text">{lead.client.name}</span>
          </div>
        )}
        {lead.businessUnit?.name && (
          <div className="kb-card-row">
            <FaFolder className="kb-icon" />
            <span className="kb-card-text">{lead.businessUnit.name}</span>
          </div>
        )}
        {lead.realDeadline && (
          <div className="kb-card-row">
            <FaCalendarAlt className="kb-icon kb-icon--deadline" />
            <span className="kb-card-text kb-deadline">{formatDate(lead.realDeadline)}</span>
          </div>
        )}
        {lead.zone !== undefined && (
          <div className="kb-card-row">
            <FaGlobe className="kb-icon" />
            <span className="kb-card-text">{lead.zone === 0 ? "Local" : "OffShore"}</span>
          </div>
        )}
        {lead.type?.label && (
          <div className="kb-card-row">
            <FaTag className="kb-icon" />
            <span className="kb-card-text">{lead.type.label}</span>
          </div>
        )}
        {lead.createdByUser?.username && (
          <div className="kb-card-row">
            <FaUser className="kb-icon" />
            <span className="kb-card-text">{lead.createdByUser.username}</span>
          </div>
        )}
      </div>

      {/* Footer badges */}
      <div className="kb-card-footer">
        {statusInfo && (
          <span className={`kb-badge ${statusInfo.cls}`}>{statusInfo.label}</span>
        )}
        {stepInfo && (
          <span className={`kb-badge ${stepInfo.cls}`}>{stepInfo.label}</span>
        )}
      </div>
    </div>
  );
};

// ─── Column ───────────────────────────────────────────────────────────────────

interface ColumnProps {
  col: KanbanColumn;
  leads: Lead[];
  canDrag: boolean;
  onDragStart: (e: React.DragEvent, lead: Lead) => void;
  onDrop: (e: React.DragEvent, colKey: string) => void;
  onDetails: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onBacklog: (lead: Lead) => void;
}

const KanbanColumn: React.FC<ColumnProps> = ({
  col, leads, canDrag, onDragStart, onDrop, onDetails, onEdit, onBacklog,
}) => {
  const [over, setOver] = useState(false);

  return (
    <div
      className={`kb-column ${over ? "kb-column--over" : ""}`}
      style={{ "--col-color": col.color } as React.CSSProperties}
      onDragOver={canDrag ? (e) => { e.preventDefault(); setOver(true); } : undefined}
      onDragLeave={canDrag ? () => setOver(false) : undefined}
      onDrop={canDrag ? (e) => { setOver(false); onDrop(e, col.key); } : undefined}
    >
      <div className="kb-column-header">
        <col.Icon className="kb-column-icon" />
        <span className="kb-column-label">{col.label}</span>
        <span className="kb-column-count">{leads.length}</span>
      </div>

      <div className="kb-column-body">
        {leads.length === 0 && (
          <div className="kb-empty">
            {/* <FaChevronRight className="kb-empty-icon" /> */}
            Aucun Lead pour cette Etape
          </div>
        )}
        {leads.map((lead) => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            colColor={col.color}
            canDrag={canDrag}
            onDragStart={onDragStart}
            onDetails={() => onDetails(lead)}
            onEdit={() => onEdit(lead)}
            onBacklog={() => onBacklog(lead)}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Main KanbanLead ──────────────────────────────────────────────────────────

const KanbanLead: React.FC = () => {
  const { api, hasPerm } = useAuth();
  const canDrag = hasPerm('KANBAN_LEAD_DRAG');
  const leadService = new LeadService(api);
  const leadTechFinService = useLeadTechFinDetailsService();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterBU, setFilterBU] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Modals
  const [showFormLead, setShowFormLead] = useState(false);
  const [showDetailLead, setShowDetailLead] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showBacklogModal, setShowBacklogModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedLeadName, setSelectedLeadName] = useState<string>("");

  const dragging = useRef<Lead | null>(null);

  // ── Chargement leads (même mapping que ListeLead) ─────────────────────────
  const loadLeads = async () => {
    try {
      const data = await leadService.getAll();
      const leadsData: Lead[] = data.map((lead: any) => ({
        id: lead.leadId,
        name: lead.leadName,
        reference: lead.leadRef || "",
        businessUnit: lead.businessUnit,
        typeFinancement: lead.typeProjetFinancement,
        description: lead.leadDescription || "",
        periode: lead.leadPeriode,
        internalDeadline: lead.leadInternalDeadLine || "",
        realDeadline: lead.leadRealDeadLine || "",
        projetFinancement: lead.projetDeFinancement || "",
        commentaire: lead.leadCommentaire || "",
        zone: lead.leadZone === 0 ? 0 : 1,
        jiraProject: lead.leadGoProjetJira || "",
        jiraTicket: lead.leadGoTicketJira || "",
        driveFolder: lead.driveFolder || undefined,
        driveFile: lead.mainDriveFile || undefined,
        client: lead.client,
        type: lead.leadType,
        category: lead.category,
        secteur: lead.leadSecteur,
        status: lead.currentLeadStatus?.leadStatus || { id: 0, label: "En attente", order: 0 },
        currentLeadStatus: lead.currentLeadStatus,
        currentLeadStep: lead.currentLeadStep,
        createdByUser: lead.createdByUser || undefined,
        partenaires: [],
      }));
      setLeads(leadsData);
    } catch (e) {
      setError("Impossible de charger les leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLeads(); }, []);

  // ── Chargement détails complets (identique ListeLead) ────────────────────
  const loadFullLeadDetails = async (leadId: number) => {
    const fullLead = await leadService.getById(leadId);
    const techFinDetails = await leadTechFinService.getByLeadId(leadId);
    return {
      ...fullLead,
      id: fullLead.leadId || fullLead.id,
      leadId: fullLead.leadId || fullLead.id,
      name: fullLead.leadName || fullLead.name,
      client: fullLead.client
        ? { id: fullLead.client.id, name: fullLead.client.name, email: fullLead.client.email, phone: fullLead.client.phone }
        : null,
      createdByUser: fullLead.createdByUser || null,
      partenaires: fullLead.leadPartenaires?.map((lp: any) => lp.partenaire) || [],
      leadPartenaires: fullLead.leadPartenaires || [],
      leadStatusHistories: fullLead.leadStatusHistories || [],
      leadStepHistories: fullLead.leadStepHistories || [],
      techFinDetails: {
        idLeadTechFinDetails: techFinDetails?.idLeadTechFinDetails || null,
        technos: techFinDetails?.technos || [],
        devise: techFinDetails?.devise || null,
        typeFacturation: techFinDetails?.typeFacturation || null,
        volumeJHVendu: techFinDetails?.volumeJHVendu ?? 0,
        tauxDeChange: techFinDetails?.tauxDeChange ?? 1,
        impots: techFinDetails?.impots ?? 0,
        montantOffre: techFinDetails?.montantOffre ?? 0,
        budget: techFinDetails?.montantOffre ?? 0,
        dateAttribution: techFinDetails?.dateAttribution || null,
        volumeJHVenduEtMontant: techFinDetails?.volumeJHVenduEtMontant || [],
      },
      technos: techFinDetails?.technos || [],
      volumeJHVendu: techFinDetails?.volumeJHVendu || 0,
      devise: techFinDetails?.devise || null,
      tauxDeChange: techFinDetails?.tauxDeChange || 1,
      typeFacturation: techFinDetails?.typeFacturation || null,
      impots: techFinDetails?.impots || 0,
      dateAttribution: techFinDetails?.dateAttribution || "",
      montantOffre: techFinDetails?.montantOffre || 0,
      budget: techFinDetails?.montantOffre || 0,
    };
  };

  // ── Handlers modaux ───────────────────────────────────────────────────────
  const handleDetails = async (lead: Lead) => {
    if (!lead.id) return;
    try {
      const full = await loadFullLeadDetails(lead.id);
      setSelectedLead(full);
      setShowDetailLead(true);
    } catch (e) { console.error("Erreur chargement détails", e); }
  };

  const handleEdit = async (lead: Lead) => {
    if (!lead.id) return;
    try {
      const full = await loadFullLeadDetails(lead.id);
      setSelectedLead(full);
      setShowFormLead(true);
    } catch (e) { console.error("Erreur chargement édition", e); }
  };

  const handleBacklog = (lead: Lead) => {
    if (!lead.id) return;
    setSelectedLeadId(lead.id);
    setSelectedLeadName(lead.name);
    setShowBacklogModal(true);
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const handleDragStart = (_e: React.DragEvent, lead: Lead) => {
    dragging.current = lead;
  };

  const handleDrop = (_e: React.DragEvent, colKey: string) => {
    const lead = dragging.current;
    if (!lead) return;
    dragging.current = null;
    const col = COLUMNS.find((c) => c.key === colKey);
    if (!col) return;

    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== lead.id) return l;
        const newStepId = col.stepIds[0];
        return {
          ...l,
          currentLeadStep: newStepId
            ? { ...l.currentLeadStep, leadStep: { id: newStepId, label: col.label } }
            : l.currentLeadStep,
        };
      })
    );
    // TODO: appeler leadService.updateStep(lead.id, col.stepIds[0]) quand l'endpoint est disponible
  };

  // ── Filtres & groupement ──────────────────────────────────────────────────
  const businessUnits = Array.from(
    new Set(leads.map((l) => l.businessUnit?.name).filter(Boolean))
  ) as string[];

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      l.name?.toLowerCase().includes(q) ||
      l.reference?.toLowerCase().includes(q) ||
      l.client?.name?.toLowerCase().includes(q) ||
      l.createdByUser?.username?.toLowerCase().includes(q);
    const matchBU = !filterBU || l.businessUnit?.name === filterBU;
    const matchStatus = !filterStatus || String(l.status?.id) === filterStatus;
    return matchSearch && matchBU && matchStatus;
  });

  const grouped = COLUMNS.reduce<Record<string, Lead[]>>((acc, col) => {
    acc[col.key] = filtered.filter((l) => getColumnKey(l) === col.key);
    return acc;
  }, {});

  const totalLeads = filtered.length;
  const wonLeads = grouped["gagnee"]?.length || 0;
  const convRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="kb-loading">
        <div className="kb-spinner" />
        <span>Chargement du kanban…</span>
      </div>
    );
  }

  if (error) return <div className="kb-error"><FaTimes style={{ marginRight: 6 }} />{error}</div>;

  return (
    <>
      <div className="kb-root">
        {/* ── Toolbar ────────────────────────────────────────────────────── */}
        <div className="kb-toolbar">
          <div className="kb-toolbar-left">
            <div className="kb-search-wrap">
              <FaSearch className="kb-search-icon" />
              <input
                className="kb-search"
                type="text"
                placeholder="Rechercher lead, client, réf, créateur…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="kb-select-wrap">
              <FiFilter className="kb-select-icon" />
              <select
                className="kb-select"
                value={filterBU}
                onChange={(e) => setFilterBU(e.target.value)}
              >
                <option value="">Toutes les BU</option>
                {businessUnits.map((bu) => (
                  <option key={bu} value={bu}>{bu}</option>
                ))}
              </select>
            </div>

            <div className="kb-select-wrap">
              <MdOutlinePendingActions className="kb-select-icon" />
              <select
                className="kb-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Tous les statuts</option>
                {Object.entries(STATUS_MAP).map(([id, { label }]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="kb-toolbar-right">
            <div className="kb-kpi">
              <FaLayerGroup className="kb-kpi-icon" />
              <span className="kb-kpi-value">{totalLeads}</span>
              <span className="kb-kpi-label">Leads</span>
            </div>
            <div className="kb-kpi kb-kpi--won">
              <FaTrophy className="kb-kpi-icon" />
              <span className="kb-kpi-value">{wonLeads}</span>
              <span className="kb-kpi-label">Gagnés</span>
            </div>
            <div className="kb-kpi">
              <FaStar className="kb-kpi-icon" />
              <span className="kb-kpi-value">{convRate}%</span>
              <span className="kb-kpi-label">Conversion</span>
            </div>
          </div>
        </div>

        {/* ── Legend ─────────────────────────────────────────────────────── */}
        <div className="kb-legend">
          {COLUMNS.map((col) => (
            <span
              key={col.key}
              className="kb-legend-item"
              style={{ "--col-color": col.color } as React.CSSProperties}
            >
              <col.Icon className="kb-legend-icon" />
              <span className="kb-legend-label">{col.label}</span>
              <span className="kb-legend-count">{grouped[col.key]?.length || 0}</span>
            </span>
          ))}
        </div>

        {/* ── Board ──────────────────────────────────────────────────────── */}
        <div className="kb-board">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              col={col}
              leads={grouped[col.key] || []}
              canDrag={canDrag}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onDetails={handleDetails}
              onEdit={handleEdit}
              onBacklog={handleBacklog}
            />
          ))}
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      <FormLead
        show={showFormLead}
        onClose={() => { setShowFormLead(false); setSelectedLead(null); }}
        lead={selectedLead}
        onSubmit={async () => {
          await loadLeads();
          setShowFormLead(false);
          setSelectedLead(null);
        }}
      />

      <DetailsLead
        show={showDetailLead}
        onClose={() => { setShowDetailLead(false); setSelectedLead(null); }}
        lead={selectedLead}
      />

      {selectedLeadId && (
        <BacklogModal
          show={showBacklogModal}
          onClose={() => {
            setShowBacklogModal(false);
            setSelectedLeadId(null);
            setSelectedLeadName("");
          }}
          leadId={selectedLeadId}
          leadName={selectedLeadName}
        />
      )}
    </>
  );
};

export default KanbanLead;