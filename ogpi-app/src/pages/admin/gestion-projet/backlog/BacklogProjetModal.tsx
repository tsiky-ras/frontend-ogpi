  import React, { useCallback, useEffect, useRef, useState } from "react";
  import Sortable from "sortablejs";

  import Button from "../../../../components/button/Button.tsx";
  import {
    FaPlus, FaSpinner, FaEdit, FaTrash, FaCalendar,
    FaChevronDown, FaChevronRight, FaUsers, FaEye, FaEyeSlash, FaCheckCircle,
  } from "react-icons/fa";
  import { Modal, Form, Alert, Tabs, Tab } from "react-bootstrap";

  import { BacklogProjetService }       from "../../../../services/projet/backlog/BacklogProjetService.tsx";
  import { BacklogProjetLotService }    from "../../../../services/projet/backlog/BacklogProjetLotService.tsx";
  import { BacklogProjetPhaseService }  from "../../../../services/projet/backlog/BacklogProjetPhaseService.tsx";
  import { BacklogProjetProfilService } from "../../../../services/projet/backlog/BacklogProjetProfilService.tsx";
  import {
    BacklogProjetLineService,
    BacklogProjetLineProfilService,
  } from "../../../../services/projet/backlog/BacklogProjetLineService.tsx";
  import { BacklogProjetColumnService } from "../../../../services/projet/backlog/BacklogProjetColumnService.tsx";
  import { BacklogPlanningService }     from "../../../../services/lead/backlog/BacklogPlanningService.tsx";
  import { useProfilService }           from "../../../../services/profil/ProfilService.tsx";
  import { useLeadTechFinDetailsService } from "../../../../services/lead/tech-fin/LeadTechFinDetailsService.tsx";

  import {
    Backlog,
    BacklogLot,
    BacklogPhase,
    BacklogLine,
  } from "../../../../types/lead/Backlog/Backlog.tsx";
  import {
    BacklogProjetProfil,
    BacklogProjetLineProfil,
    BacklogSprint,
    BacklogDelivrableProjet,
    BacklogColumn,
    BacklogLineColumnValue,
    BacklogColumnType,
    CreateBacklogForProjetRequest,
  } from "../../../../types/projet/backlog/BacklogProjet.tsx";

  import { useAuth }  from "../../../../context/AuthContext.tsx";
  import BacklogFormProjet from "./BacklogFormProjet.tsx";
  import PlanningTab  from "../../gestion-lead/backlog/PlanningTab.tsx";
  import BudgetTab    from "../../gestion-lead/backlog/BudgetTab.tsx";
  import { ProjetService } from "../../../../services/projet/ProjetService.tsx";

  interface BacklogProjetModalProps {
    show:             boolean;
    onClose:          () => void;
    projetId:         number;
    projetNom?:       string;
    leadId:           number | null;
    projectStartDate?: string | null;
    projectEndDate?:   string | null;
  }

  interface ProfilFull extends BacklogProjetProfil {
    collaborateurs: any[];
  }

  // ── Helper : formate une date ISO en "jj mmm aaaa" ──────────────────────────
  const fmtDate = (iso: string | null | undefined): string => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return iso; }
  };

  // ── Badge dates inline ───────────────────────────────────────────────────────
  const DateBadge: React.FC<{ debut?: string | null; fin?: string | null; style?: React.CSSProperties }> = ({ debut, fin, style }) => {
    if (!debut && !fin) return null;
    return (
      <span
        style={{
          fontSize: "0.7rem", color: "#555", background: "#e8f4fd",
          border: "1px solid #b8d9f0", borderRadius: 4, padding: "1px 6px",
          whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 3,
          ...style,
        }}
      >
        {fmtDate(debut)}{fin && fin !== debut ? ` → ${fmtDate(fin)}` : ""}
      </span>
    );
  };

  // ── Couleur barre de progression ─────────────────────────────────────────────
  const progressColor = (pct: number): string => {
    if (pct > 100) return "#dc3545";
    if (pct >= 80)  return "#ffc107";
    return "#198754";
  };

  const BacklogProjetModal: React.FC<BacklogProjetModalProps> = ({
    show, onClose, projetId, projetNom, leadId, projectStartDate, projectEndDate,
  }) => {
    const { api } = useAuth();
    const collaborateurService = useProfilService();
    const projetService = new ProjetService(api);
    const svc = useRef({
      backlog    : new BacklogProjetService(api),
      lot        : new BacklogProjetLotService(api),
      phase      : new BacklogProjetPhaseService(api),
      profil     : new BacklogProjetProfilService(api),
      line       : new BacklogProjetLineService(api),
      lineProfil : new BacklogProjetLineProfilService(api),
      column     : new BacklogProjetColumnService(api),
      planning   : new BacklogPlanningService(api),
    }).current;

    // ── État principal ─────────────────────────────────────────────────────────
    const [backlog,     setBacklog]     = useState<Backlog | null>(null);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState<string | null>(null);
    const [saving,      setSaving]      = useState(false);

    const [loadingBacklogs,   setLoadingBacklogs]   = useState(false);
    const [selectedBacklogId, setSelectedBacklogId] = useState<number | null>(null);
    const [showBacklogForm,   setShowBacklogForm]   = useState(false);
    const [backlogHeader,     setBacklogHeader]     = useState<Backlog | null>(null);

    const [lots,        setLots]        = useState<BacklogLot[]>([]);
    const [profils,     setProfils]     = useState<ProfilFull[]>([]);
    const [lines,       setLines]       = useState<BacklogLine[]>([]);
    const [lineProfils, setLineProfils] = useState<BacklogProjetLineProfil[]>([]);

    const [sprints,      setSprints]      = useState<Map<number, BacklogSprint[]>>(new Map());
    const [deliverables, setDeliverables] = useState<Map<number, BacklogDelivrableProjet[]>>(new Map());
    const [columns,      setColumns]      = useState<Map<number, BacklogColumn[]>>(new Map());
    const [colValues,    setColValues]    = useState<Map<number, BacklogLineColumnValue[]>>(new Map());
    const [allCollabs,   setAllCollabs]   = useState<any[]>([]);
    const [fCollabId,    setFCollabId]    = useState<number | null>(null);

    const [activeTab,       setActiveTab]       = useState("backlog");
    const [expandedPhases,  setExpandedPhases]  = useState<Set<number>>(new Set());
    const [expandedSprints, setExpandedSprints] = useState<Map<number, Set<number>>>(new Map());
    const [expandedLines,   setExpandedLines]   = useState<Set<number>>(new Set());
    const leadTechFinService = useLeadTechFinDetailsService();
    const [deviseAbr, setDeviseAbr] = useState<string>("€");
    const [showProfilCols, setShowProfilCols] = useState(true);

    const [expandedRecapLots,   setExpandedRecapLots]   = useState<Set<number>>(new Set());
    const [expandedRecapPhases, setExpandedRecapPhases] = useState<Set<number>>(new Set());
    const [expandedProfilRecap, setExpandedProfilRecap] = useState<Set<number>>(new Set());
    const [expandedProfilLots,  setExpandedProfilLots]  = useState<Map<number, Set<number>>>(new Map());

    const [showLotModal,    setShowLotModal]    = useState(false);
    const [showPhaseModal,  setShowPhaseModal]  = useState(false);
    const [showSprintModal, setShowSprintModal] = useState(false);
    const [showDelivModal,  setShowDelivModal]  = useState(false);
    const [showProfilModal, setShowProfilModal] = useState(false);
    const [showCollabModal, setShowCollabModal] = useState(false);
    const [showLineModal,   setShowLineModal]   = useState(false);
    const [showVolModal,    setShowVolModal]    = useState(false);
    const [showColModal,    setShowColModal]    = useState(false);
    const [showCellModal,   setShowCellModal]   = useState(false);
    const [collabSearch,    setCollabSearch]    = useState("");

    const [editLot,        setEditLot]        = useState<BacklogLot | null>(null);
    const [editPhase,      setEditPhase]      = useState<BacklogPhase | null>(null);
    const [editSprint,     setEditSprint]     = useState<BacklogSprint | null>(null);
    const [editDeliv,      setEditDeliv]      = useState<BacklogDelivrableProjet | null>(null);
    const [editProfil,     setEditProfil]     = useState<ProfilFull | null>(null);
    const [collabProfil,   setCollabProfil]   = useState<ProfilFull | null>(null);
    const [editLine,       setEditLine]       = useState<BacklogLine | null>(null);
    const [editLineProfil, setEditLineProfil] = useState<BacklogProjetLineProfil | null>(null);
    const [editCol,        setEditCol]        = useState<BacklogColumn | null>(null);
    const [editCell,       setEditCell]       = useState<{ lineId: number; columnId: number } | null>(null);

    const [ctxLotId,    setCtxLotId]    = useState<number | null>(null);
    const [ctxPhaseId,  setCtxPhaseId]  = useState<number | null>(null);
    const [ctxSprintId, setCtxSprintId] = useState<number | null>(null);
    const [ctxLineId,   setCtxLineId]   = useState<number | null>(null);
    const [ctxProfilId, setCtxProfilId] = useState<number | null>(null);
    const currentProfil = profils.find(p => p.id === ctxProfilId) ?? null;

    const [fLot,       setFLot]       = useState({ name: "", desc: "" });
    const [fPhase,     setFPhase]     = useState({ name: "" });
    const [fSprint,    setFSprint]    = useState({ name: "", startDate: "", endDate: "" });
    const [fDeliv,     setFDeliv]     = useState({ name: "", description: "", deliveryDate: "", sprintId: null as number | null });
    const [fProfil,    setFProfil]    = useState({ name: "", desc: "", tjm: 0, order: 0 });
    const [fCollabIds, setFCollabIds] = useState<number[]>([]);
    const [fLine,      setFLine]      = useState({
      epic: "", userStory: "", description: "", resultat: "",
      lotId: null as number | null, phaseId: null as number | null, sprintId: null as number | null,
    });
    const [fVolume,    setFVolume]    = useState(0);
    const [fDeadline,  setFDeadline]  = useState<string>("");
    const [fTimeSpent, setFTimeSpent] = useState<number | null>(null);
    const [fCol,       setFCol]       = useState({ name: "", type: "TEXT" as BacklogColumnType });
    const [fCellVal,   setFCellVal]   = useState("");

    const lineBodyRef    = useRef<HTMLTableSectionElement | null>(null);
    const lotsRef        = useRef<HTMLDivElement | null>(null);
    const profilsRef     = useRef<HTMLDivElement | null>(null);
    const lineSortable   = useRef<Sortable | null>(null);
    const lotSortable    = useRef<Sortable | null>(null);
    const profilSortable = useRef<Sortable | null>(null);
    const phaseSortableRefs  = useRef<Map<number, Sortable>>(new Map());
    const sprintSortableRefs = useRef<Map<number, Sortable>>(new Map());

    // ══════════════════════════════════════════════════════════════════════
    // CHARGEMENT
    // ══════════════════════════════════════════════════════════════════════

    const hydrateFromFull = useCallback((full: any) => {
      setBacklog(full);
      const sortedLots: BacklogLot[] = (full.lots ?? []).sort((a: any, b: any) => a.order - b.order);
      setLots(sortedLots);

      const spMap  = new Map<number, BacklogSprint[]>();
      const dlvMap = new Map<number, BacklogDelivrableProjet[]>();
      for (const lot of sortedLots) {
        for (const phase of (lot.phases ?? []) as any[]) {
          const phaseSprints = (phase.sprints ?? []).sort((a: any, b: any) => a.order - b.order);
          spMap.set(phase.id, phaseSprints);
          const phaseDelivs: any[] = phase.deliverables ?? [];
          const sprintDelivs: any[] = phaseSprints.flatMap((s: any) =>
            (s.deliverables ?? []).map((d: any) => ({ ...d, sprintId: d.sprintId ?? s.id }))
          );
          const allDelivs = [...phaseDelivs, ...sprintDelivs].filter(
            (d, i, arr) => arr.findIndex(x => x.id === d.id) === i
          );
          dlvMap.set(phase.id, allDelivs.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)));
        }
      }
      setSprints(spMap);
      setDeliverables(dlvMap);

      const rawProfils: any[] = full.profilsProjet ?? full.profils ?? [];
      setProfils(
        rawProfils
          .sort((a: any, b: any) => a.order - b.order)
          .map((p: any) => ({ ...p, collaborateurs: p.collaborateurs ?? [] }))
      );
      setLines((full.lines ?? []).sort((a: any, b: any) => a.order - b.order));
    }, []);

    const loadColumnsAndValues = useCallback(async (full: any) => {
      const allSprints: any[] = (full.lots ?? []).flatMap((l: any) => l.phases ?? []).flatMap((p: any) => p.sprints ?? []);
      const allLines: any[] = full.lines ?? [];
      const colMap = new Map<number, BacklogColumn[]>();
      const valMap = new Map<number, BacklogLineColumnValue[]>();
      await Promise.all([
        ...allSprints.map(async (s: any) => {
          if (s.columns && Array.isArray(s.columns)) { colMap.set(s.id, s.columns); }
          else { try { colMap.set(s.id, await svc.column.getColumnsBySprintId(s.id)); } catch { colMap.set(s.id, []); } }
        }),
        ...allLines.map(async (l: any) => {
          try { valMap.set(l.id, await svc.column.getValuesByLineId(l.id)); } catch { valMap.set(l.id, []); }
        }),
      ]);
      setColumns(colMap);
      setColValues(valMap);
    }, []);

    const loadLineProfils = useCallback(async (backlogId: number) => {
      try { setLineProfils(await svc.lineProfil.getAllByBacklogId(backlogId)); }
      catch { setLineProfils([]); }
    }, []);

    const loadAllCollabs = useCallback(async () => {
      try { const data = await collaborateurService.getAll(); setAllCollabs(Array.isArray(data) ? data : []); }
      catch { setAllCollabs([]); }
    }, [collaborateurService]);

    const fetchBacklogHeader = useCallback(async () => {
      setLoadingBacklogs(true);
      setError(null);
      try {
        const existingHeader = await svc.backlog.getHeaderByProjetId(projetId);
        if (existingHeader?.id) {
          setBacklogHeader(existingHeader);
          setSelectedBacklogId(existingHeader.id);
          return;
        }
        setBacklogHeader(null);
      } catch {
        setError("Impossible de charger le backlog.");
      } finally {
        setLoadingBacklogs(false);
      }
    }, [projetId]);

    const loadFull = useCallback(async () => {
      if (!selectedBacklogId) return;
      setLoading(true); setError(null);
      try {
        const full = await svc.backlog.getFullById(selectedBacklogId);
        if (!full) return;
        hydrateFromFull(full);
        await Promise.all([
          loadLineProfils(full.id),
          loadColumnsAndValues(full),
          loadAllCollabs(),
        ]);
      } catch {
        setError("Impossible de charger le backlog.");
      } finally {
        setLoading(false);
      }
    }, [selectedBacklogId]);

    const reload = useCallback(async () => {
      if (!selectedBacklogId) return;
      setLoading(true);
      try {
        const full = await svc.backlog.getFullById(selectedBacklogId);
        if (full) {
          hydrateFromFull(full);
          await Promise.all([loadLineProfils(full.id), loadColumnsAndValues(full)]);
        }
      } catch {
        setError("Impossible de recharger les données.");
      } finally {
        setLoading(false);
      }
    }, [selectedBacklogId]);

    useEffect(() => {
      if (!leadId) { setDeviseAbr("€"); return; }
      (async () => {
        try {
          const techFin = await leadTechFinService.getByLeadId(leadId);
          setDeviseAbr((techFin && techFin.devise?.abrDevise) || "€");
        } catch { setDeviseAbr("€"); }
      })();
    }, [leadId]);

    useEffect(() => {
      if (!show || !projetId) return;
      setBacklog(null); setBacklogHeader(null); setLots([]); setProfils([]); setLines([]);
      setLineProfils([]); setSprints(new Map()); setDeliverables(new Map());
      setColumns(new Map()); setColValues(new Map()); setAllCollabs([]);
      setError(null); setShowBacklogForm(false); setActiveTab("backlog");
      setSelectedBacklogId(null);
      setExpandedPhases(new Set()); setExpandedSprints(new Map()); setExpandedLines(new Set());
      fetchBacklogHeader();
    }, [show, projetId]);

    useEffect(() => {
      if (selectedBacklogId) loadFull();
    }, [selectedBacklogId]);

    const handleBackToList = () => {
      setSelectedBacklogId(null);
      setBacklog(null); setLots([]); setProfils([]); setLines([]);
      setLineProfils([]); setSprints(new Map()); setDeliverables(new Map());
      setColumns(new Map()); setColValues(new Map());
      setExpandedPhases(new Set()); setExpandedSprints(new Map()); setExpandedLines(new Set());
    };

    // ══════════════════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════════════════

    const getAllPhases = (): BacklogPhase[] => lots.flatMap(l => (l.phases ?? []) as BacklogPhase[]);
    const getLotByPhaseId = (phaseId: number | null): BacklogLot | undefined =>
      lots.find(l => (l.phases ?? []).some((p: any) => p.id === phaseId));
    const getPhaseNameById = (id: number | null): string =>
      id ? getAllPhases().find(p => p.id === id)?.name ?? "—" : "—";
    const getLineProfil = (lineId: number, profilId: number) =>
      lineProfils.find(lp => lp.lineId === lineId && (lp.profil as any)?.id === profilId) ?? null;
    const getLineJH = (lineId: number) =>
      lineProfils.filter(lp => lp.lineId === lineId).reduce((s, lp) => s + lp.volume, 0);

    const getLotDates = (lot: BacklogLot): { debut: string | null; fin: string | null } => {
      const phases = (lot.phases ?? []) as any[];
      return phases.reduce<{ debut: string | null; fin: string | null }>(
        (acc, p) => ({
          debut: !acc.debut ? (p.dateDebut ?? null)
            : !p.dateDebut ? acc.debut
            : p.dateDebut < acc.debut ? p.dateDebut : acc.debut,
          fin: !acc.fin ? (p.dateFin ?? null)
            : !p.dateFin ? acc.fin
            : p.dateFin > acc.fin ? p.dateFin : acc.fin,
        }),
        { debut: null, fin: null }
      );
    };

    const fmtJH = (v: number) => v.toFixed(v % 1 === 0 ? 0 : 1);

    const toggleLine   = (id: number) => setExpandedLines(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    const togglePhase  = (id: number) => setExpandedPhases(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    const toggleSprint = (phaseId: number, sprintId: number) =>
      setExpandedSprints(prev => {
        const m = new Map(prev); const s = new Set(m.get(phaseId) ?? []);
        s.has(sprintId) ? s.delete(sprintId) : s.add(sprintId);
        s.size ? m.set(phaseId, s) : m.delete(phaseId); return m;
      });

    const toggleRecapLot    = (id: number) => setExpandedRecapLots(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    const toggleRecapPhase  = (id: number) => setExpandedRecapPhases(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    const toggleProfilRecap = (pid: number) => setExpandedProfilRecap(prev => { const s = new Set(prev); s.has(pid) ? s.delete(pid) : s.add(pid); return s; });
    const toggleProfilLot   = (profilId: number, lotId: number) =>
      setExpandedProfilLots(prev => {
        const m = new Map(prev); const s = new Set(m.get(profilId) ?? []);
        s.has(lotId) ? s.delete(lotId) : s.add(lotId);
        s.size ? m.set(profilId, s) : m.delete(profilId); return m;
      });

    // ══════════════════════════════════════════════════════════════════════
    // CALCULS RÉCAPITULATIFS
    // ══════════════════════════════════════════════════════════════════════

    const getJhForIds = (lineIds: Set<number>, profilId?: number) =>
      lineProfils
        .filter(lp => lineIds.has(lp.lineId) && (profilId == null || (lp.profil as any)?.id === profilId))
        .reduce((s, lp) => s + lp.volume, 0);

    const lotRecap = lots.map(lot => {
      const phaseIds = new Set((lot.phases ?? []).map((p: any) => p.id));
      const lotLineIds = new Set(lines.filter(l => phaseIds.has((l as any).phaseId)).map(l => l.id));
      const lotVol = getJhForIds(lotLineIds);
      const byProfil = profils.map(p => ({ profil: p, vol: getJhForIds(lotLineIds, p.id) }));
      const phasesData = ((lot.phases ?? []) as BacklogPhase[]).sort((a, b) => a.order - b.order).map(phase => {
        const phLineIds = new Set(lines.filter(l => (l as any).phaseId === phase.id).map(l => l.id));
        const phVol = getJhForIds(phLineIds);
        const phByProfil = profils.map(p => ({ profil: p, vol: getJhForIds(phLineIds, p.id) }));
        const phaseSpr = sprints.get(phase.id) ?? [];
        const sprintsData = phaseSpr.map(sp => {
          const spLineIds = new Set(lines.filter(l => (l as any).sprintId === sp.id).map(l => l.id));
          const spVol = getJhForIds(spLineIds);
          const spByProfil = profils.map(p => ({ profil: p, vol: getJhForIds(spLineIds, p.id) }));
          return { sprint: sp, vol: spVol, byProfil: spByProfil };
        });
        return { phase, vol: phVol, byProfil: phByProfil, sprints: sprintsData };
      });
      return { lot, vol: lotVol, byProfil, phases: phasesData };
    });

    const tableGrandJH = lineProfils.reduce((s, lp) => s + lp.volume, 0);

    const leadIdRef = useRef(leadId);
    useEffect(() => { leadIdRef.current = leadId; }, [leadId]);

    // ══════════════════════════════════════════════════════════════════════
    // CRÉATION BACKLOG
    // ══════════════════════════════════════════════════════════════════════

    const handleCreateBacklog = async (item: CreateBacklogForProjetRequest) => {
      setSaving(true);
      try {
        const created = await svc.backlog.createForProjet({
          name: item.name, desc: item.desc, projetId,
          leadId: leadIdRef.current, type: item.type,
        });
        setBacklogHeader(created);
        setSelectedBacklogId(created.id);
        setShowBacklogForm(false);
      } catch {
        setError("Impossible de créer le backlog.");
      } finally {
        setSaving(false);
      }
    };

    // ══════════════════════════════════════════════════════════════════════
    // LOTS
    // ══════════════════════════════════════════════════════════════════════

    const openAddLot  = () => { setEditLot(null); setFLot({ name: "", desc: "" }); setShowLotModal(true); };
    const openEditLot = (lot: BacklogLot) => { setEditLot(lot); setFLot({ name: lot.name, desc: lot.desc ?? "" }); setShowLotModal(true); };

    const saveLot = async () => {
      if (!fLot.name.trim() || !backlog?.id) return;
      setSaving(true);
      try {
        if (editLot) {
          const updated = await svc.lot.update(editLot.id, fLot);
          setLots(prev => prev.map(l => l.id === editLot.id ? { ...l, ...updated } : l));
        } else {
          const order = Math.max(0, ...lots.map(l => l.order)) + 1;
          const created = await svc.lot.create({ ...fLot, order, backlogId: backlog.id });
          setLots(prev => [...prev, { ...created, phases: [] }]);
        }
        setShowLotModal(false);
      } catch { alert("Erreur lors de la sauvegarde du lot."); }
      finally { setSaving(false); }
    };

    const deleteLot = async (id: number) => {
      if (!window.confirm("Supprimer ce lot et tout son contenu ?")) return;
      try {
        await svc.lot.delete(id);
        const updated = lots.filter(l => l.id !== id).map((l, i) => ({ ...l, order: i + 1 }));
        setLots(updated);
        if (updated.length) await svc.lot.updateOrder(updated.map(l => ({ id: l.id, order: l.order })));
      } catch { alert("Impossible de supprimer le lot."); }
    };

    // ══════════════════════════════════════════════════════════════════════
    // PHASES
    // ══════════════════════════════════════════════════════════════════════

    const openAddPhase  = (lotId: number) => { setCtxLotId(lotId); setEditPhase(null); setFPhase({ name: "" }); setShowPhaseModal(true); };
    const openEditPhase = (p: BacklogPhase, lotId: number) => { setCtxLotId(lotId); setEditPhase(p); setFPhase({ name: p.name }); setShowPhaseModal(true); };

    const savePhase = async () => {
      if (!fPhase.name.trim() || ctxLotId === null) return;
      setSaving(true);
      try {
        if (editPhase) {
          const updated = await svc.phase.update(editPhase.id, { name: fPhase.name });
          setLots(prev => prev.map(l => l.id !== ctxLotId ? l : {
            ...l, phases: (l.phases ?? []).map((p: any) => p.id === editPhase.id ? { ...p, ...updated } : p),
          }));
        } else {
          const lot = lots.find(l => l.id === ctxLotId);
          const order = Math.max(0, ...((lot?.phases ?? []) as any[]).map(p => p.order)) + 1;
          const created = await svc.phase.create({ name: fPhase.name, order, lotId: ctxLotId });
          setLots(prev => prev.map(l => l.id !== ctxLotId ? l : {
            ...l, phases: [...(l.phases ?? []), { ...created, sprints: [], deliverables: [] }],
          }));
          setSprints(prev => new Map(prev).set(created.id, []));
          setDeliverables(prev => new Map(prev).set(created.id, []));
        }
        setShowPhaseModal(false);
      } catch { alert("Erreur lors de la sauvegarde de la phase."); }
      finally { setSaving(false); setCtxLotId(null); }
    };

    const deletePhase = async (phaseId: number, lotId: number) => {
      if (!window.confirm("Supprimer cette phase et tout son contenu ?")) return;
      try {
        await svc.phase.delete(phaseId);
        setLots(prev => prev.map(l => l.id !== lotId ? l : {
          ...l, phases: (l.phases ?? []).filter((p: any) => p.id !== phaseId)
                                        .map((p: any, i: number) => ({ ...p, order: i + 1 })),
        }));
        setSprints(prev => { const m = new Map(prev); m.delete(phaseId); return m; });
        setDeliverables(prev => { const m = new Map(prev); m.delete(phaseId); return m; });
        try { await propagateDatesFromLot(lotId); } catch(e) { console.warn(e); }
      } catch { alert("Impossible de supprimer la phase."); }
    };

    // ══════════════════════════════════════════════════════════════════════
    // PROPAGATION DATES
    // ══════════════════════════════════════════════════════════════════════

    const propagateDatesFromPhase = async (phaseId: number, phaseSprints: BacklogSprint[]) => {
      const dates = phaseSprints
        .filter(s => s.dateDebut || s.dateFin)
        .reduce<{ debut: string | null; fin: string | null }>(
          (acc, s) => ({
            debut: !acc.debut ? (s.dateDebut ?? null)
              : !s.dateDebut ? acc.debut
              : s.dateDebut < acc.debut ? s.dateDebut : acc.debut,
            fin: !acc.fin ? (s.dateFin ?? null)
              : !s.dateFin ? acc.fin
              : s.dateFin > acc.fin ? s.dateFin : acc.fin,
          }),
          { debut: null, fin: null }
        );

      await svc.phase.update(phaseId, {
        dateDebut: dates.debut ?? undefined,
        dateFin:   dates.fin   ?? undefined,
      });

      setLots(prev => prev.map(lot => ({
        ...lot,
        phases: (lot.phases ?? []).map((p: any) =>
          p.id === phaseId ? { ...p, dateDebut: dates.debut, dateFin: dates.fin } : p
        ),
      })));

      const parentLot = lots.find(l => (l.phases ?? []).some((p: any) => p.id === phaseId));
      if (parentLot) {
        await propagateDatesFromLot(parentLot.id, phaseId, dates);
      }
    };

    const propagateDatesFromLot = async (
      lotId: number,
      updatedPhaseId?: number,
      updatedPhaseDates?: { debut: string | null; fin: string | null }
    ) => {
      const lot = lots.find(l => l.id === lotId);
      if (!lot) return;

      const phases = (lot.phases ?? []) as any[];
      const lotDates = phases.reduce<{ debut: string | null; fin: string | null }>(
        (acc, p) => {
          const pd = p.id === updatedPhaseId && updatedPhaseDates ? updatedPhaseDates.debut : (p.dateDebut ?? null);
          const pf = p.id === updatedPhaseId && updatedPhaseDates ? updatedPhaseDates.fin   : (p.dateFin   ?? null);
          return {
            debut: !acc.debut ? pd : !pd ? acc.debut : pd < acc.debut ? pd : acc.debut,
            fin:   !acc.fin   ? pf : !pf ? acc.fin   : pf > acc.fin   ? pf : acc.fin,
          };
        },
        { debut: null, fin: null }
      );

      await svc.lot.update(lotId, {
        dateDebut: lotDates.debut ?? undefined,
        dateFin:   lotDates.fin   ?? undefined,
      });

      setLots(prev => prev.map(l =>
        l.id === lotId ? { ...l, dateDebut: lotDates.debut, dateFin: lotDates.fin } : l
      ));
    };

    // ══════════════════════════════════════════════════════════════════════
    // SPRINTS
    // ══════════════════════════════════════════════════════════════════════

    const openAddSprint  = (phaseId: number) => {
      setCtxPhaseId(phaseId); setEditSprint(null);
      setFSprint({ name: "", startDate: "", endDate: "" }); setShowSprintModal(true);
    };
    const openEditSprint = (s: BacklogSprint, phaseId: number) => {
      setCtxPhaseId(phaseId); setEditSprint(s);
      setFSprint({ name: s.name, startDate: s.dateDebut ?? "", endDate: s.dateFin ?? "" }); setShowSprintModal(true);
    };

    const saveSprint = async () => {
      if (!fSprint.name.trim() || ctxPhaseId === null) return;
      setSaving(true);
      let updatedSprints: BacklogSprint[] = [];
      try {
        const existing = sprints.get(ctxPhaseId) ?? [];
        if (editSprint) {
          const updated = await svc.phase.updateSprint(editSprint.id, {
            name: fSprint.name, startDate: fSprint.startDate, endDate: fSprint.endDate,
          });
          updatedSprints = existing.map(s => s.id === editSprint.id
            ? { ...s, ...updated, dateDebut: fSprint.startDate || updated.dateDebut || null, dateFin: fSprint.endDate || updated.dateFin || null }
            : s
          );
          setSprints(prev => new Map(prev).set(ctxPhaseId, updatedSprints));
        } else {
          const order = Math.max(0, ...existing.map(s => s.order)) + 1;
          const created = await svc.phase.createSprint({
            name: fSprint.name, order, phaseId: ctxPhaseId,
            dateDebut: fSprint.startDate, dateFin: fSprint.endDate,
          });
          const createdWithDates: BacklogSprint = {
            ...created,
            dateDebut: created.dateDebut ?? (fSprint.startDate || null),
            dateFin:   created.dateFin   ?? (fSprint.endDate   || null),
          };
          updatedSprints = [...existing, createdWithDates];
          setSprints(prev => new Map(prev).set(ctxPhaseId, updatedSprints));
          setColumns(prev => new Map(prev).set(createdWithDates.id, []));
        }
        setShowSprintModal(false);
      } catch (err) {
        console.error("Erreur sauvegarde sprint:", err);
        alert("Erreur lors de la sauvegarde du sprint.");
        setSaving(false); setCtxPhaseId(null);
        return;
      }
      if (fSprint.startDate || fSprint.endDate) {
        try { await propagateDatesFromPhase(ctxPhaseId, updatedSprints); }
        catch (err) { console.warn("Propagation dates échouée (sprint sauvegardé):", err); }
      }
      setSaving(false); setCtxPhaseId(null);
    };

    const deleteSprint = async (sprintId: number, phaseId: number) => {
      if (!window.confirm("Supprimer ce sprint ?")) return;
      try {
        await svc.phase.deleteSprint(sprintId);
        const updated = (sprints.get(phaseId) ?? [])
          .filter(s => s.id !== sprintId)
          .map((s, i) => ({ ...s, order: i + 1 }));
        setSprints(prev => new Map(prev).set(phaseId, updated));
        setDeliverables(prev => {
          const m = new Map(prev);
          m.set(phaseId, (m.get(phaseId) ?? []).map(d =>
            (d as any).sprintId === sprintId ? { ...d, sprintId: null } : d
          ));
          return m;
        });
        try { await propagateDatesFromPhase(phaseId, updated); } catch(e) { console.warn(e); }
      } catch { alert("Impossible de supprimer le sprint."); }
    };

    // ══════════════════════════════════════════════════════════════════════
    // LIVRABLES
    // ══════════════════════════════════════════════════════════════════════

    const openAddDeliv  = (phaseId: number) => { setCtxPhaseId(phaseId); setEditDeliv(null); setFDeliv({ name: "", description: "", deliveryDate: "", sprintId: null }); setShowDelivModal(true); };
    const openEditDeliv = (d: BacklogDelivrableProjet, phaseId: number) => {
      setCtxPhaseId(phaseId); setEditDeliv(d);
      setFDeliv({ name: d.name, description: (d as any).description ?? "", deliveryDate: (d as any).deliveryDate ?? "", sprintId: (d as any).sprintId ?? null });
      setShowDelivModal(true);
    };

    const saveDeliv = async () => {
      if (!fDeliv.name.trim() || ctxPhaseId === null) return;
      setSaving(true);
      try {
        const existing = deliverables.get(ctxPhaseId) ?? [];
        if (editDeliv) {
          const updated = await svc.phase.updateDeliverable(editDeliv.id!, { ...fDeliv, phaseId: ctxPhaseId });
          setDeliverables(prev => new Map(prev).set(ctxPhaseId, existing.map(d => d.id === editDeliv.id ? { ...d, ...updated } : d)));
        } else {
          const order = Math.max(0, ...existing.map((d: any) => d.order ?? 0)) + 1;
          const created = await svc.phase.createDeliverable({ ...fDeliv, phaseId: ctxPhaseId, order });
          setDeliverables(prev => new Map(prev).set(ctxPhaseId, [...existing, created]));
        }
        setShowDelivModal(false);
      } catch { alert("Erreur lors de la sauvegarde du livrable."); }
      finally { setSaving(false); setCtxPhaseId(null); }
    };

    const deleteDeliv = async (delivId: number, phaseId: number) => {
      if (!window.confirm("Supprimer ce livrable ?")) return;
      try {
        await svc.phase.deleteDeliverable(delivId);
        setDeliverables(prev => new Map(prev).set(phaseId, (deliverables.get(phaseId) ?? []).filter(d => d.id !== delivId)));
      } catch { alert("Impossible de supprimer le livrable."); }
    };

    const deliverLivrable = async (delivId: number, phaseId: number) => {
      try {
        await svc.phase.deliverDeliverable(delivId);
        setDeliverables(prev => new Map(prev).set(
          phaseId,
          (prev.get(phaseId) ?? []).map(d => d.id === delivId ? { ...d, isDelivered: true } : d)
        ));
      } catch { alert({delivId}+"Impossible de marquer le livrable comme livré."); }
    };

    // ══════════════════════════════════════════════════════════════════════
    // PROFILS
    // ══════════════════════════════════════════════════════════════════════

    const openAddProfil  = () => { setEditProfil(null); setFProfil({ name: "", desc: "", tjm: 0, order: 0 }); setFCollabIds([]); setShowProfilModal(true); };
    const openEditProfil = (p: ProfilFull) => {
      setEditProfil(p);
      setFProfil({ name: p.name, desc: p.desc ?? "", tjm: p.tjm, order: p.order });
      setFCollabIds(p.collaborateurs.map((c: any) => c.id));
      setShowProfilModal(true);
    };

    const openCollabModal = (p: ProfilFull) => {
      setCollabProfil(p); setFCollabIds(p.collaborateurs.map((c: any) => c.id));
      setCollabSearch(""); setShowCollabModal(true);
    };

    const saveProfil = async () => {
      if (!fProfil.name.trim() || !backlog?.id) return;
      setSaving(true);
      try {
        if (editProfil) {
          await svc.profil.update(editProfil.id, { name: fProfil.name, desc: fProfil.desc, tjm: fProfil.tjm, order: editProfil.order });
          setProfils(prev => prev.map(p => p.id !== editProfil.id ? p : { ...p, name: fProfil.name, desc: fProfil.desc, tjm: fProfil.tjm }));
        } else {
          const order = Math.max(0, ...profils.map(p => p.order)) + 1;
          const created = await svc.profil.create({ ...fProfil, order, backlogId: backlog.id });
          if (fCollabIds.length) await svc.profil.replaceCollaborateurs(created.id, fCollabIds);
          await reload();
        }
        setShowProfilModal(false);
      } catch { alert("Erreur lors de la sauvegarde du profil."); }
      finally { setSaving(false); }
    };

    const saveCollabs = async () => {
      if (!collabProfil) return;
      setSaving(true);
      try {
        await svc.profil.replaceCollaborateurs(collabProfil.id, fCollabIds);
        setProfils(prev => prev.map(p => p.id !== collabProfil.id ? p : {
          ...p, collaborateurs: allCollabs.filter(c => fCollabIds.includes(c.id)),
        }));
        setShowCollabModal(false);
      } catch { alert("Erreur lors de la mise à jour des collaborateurs."); }
      finally { setSaving(false); setCollabProfil(null); }
    };

    const deleteProfil = async (id: number) => {
      if (!window.confirm("Supprimer ce profil ?")) return;
      try {
        await svc.profil.delete(id);
        const updated = profils.filter(p => p.id !== id).map((p, i) => ({ ...p, order: i + 1 }));
        setProfils(updated);
        if (updated.length) await svc.profil.updateOrder(updated.map(p => ({ id: p.id, order: p.order })));
      } catch { alert("Impossible de supprimer le profil."); }
    };

    // ══════════════════════════════════════════════════════════════════════
    // LIGNES
    // ══════════════════════════════════════════════════════════════════════

    const openAddLine = () => {
      setEditLine(null);
      setFLine({ epic: "", userStory: "", description: "", resultat: "", lotId: null, phaseId: null, sprintId: null });
      setShowLineModal(true);
    };

    const openEditLine = (l: BacklogLine) => {
      setEditLine(l);
      const phaseId = (l as any).phaseId ?? null;
      const lot = getLotByPhaseId(phaseId);
      setFLine({
        epic: l.epic ?? "", userStory: l.userStory ?? "",
        description: l.description ?? "", resultat: l.resultat ?? "",
        lotId: lot?.id ?? null, phaseId, sprintId: (l as any).sprintId ?? null,
      });
      setShowLineModal(true);
    };

    const saveLine = async () => {
      if (!fLine.phaseId) { alert("Veuillez sélectionner une phase."); return; }
      setSaving(true);
      try {
        const payload = { epic: fLine.epic, userStory: fLine.userStory, description: fLine.description, resultat: fLine.resultat, phaseId: fLine.phaseId, sprintId: fLine.sprintId };
        if (editLine) {
          const updated = await svc.line.update(editLine.id, { ...payload, order: editLine.order });
          setLines(prev => prev.map(l => l.id === editLine.id ? { ...l, ...updated } : l));
        } else {
          const order = Math.max(0, ...lines.map(l => l.order)) + 1;
          const created = await svc.line.create({ ...payload, order });
          setLines(prev => [...prev, created]);
          setColValues(prev => new Map(prev).set(created.id, []));
        }
        setShowLineModal(false);
      } catch { alert("Erreur lors de la sauvegarde de la ligne."); }
      finally { setSaving(false); }
    };

    const deleteLine = async (id: number) => {
      if (!window.confirm("Supprimer cette ligne ?")) return;
      try {
        await svc.line.delete(id);
        const updated = lines.filter(l => l.id !== id).map((l, i) => ({ ...l, order: i + 1 }));
        setLines(updated);
        setLineProfils(prev => prev.filter(lp => lp.lineId !== id));
        setColValues(prev => { const m = new Map(prev); m.delete(id); return m; });
        if (updated.length) await svc.line.updateOrder(updated.map(l => ({ id: l.id, order: l.order })));
      } catch { alert("Impossible de supprimer la ligne."); }
    };

    // ══════════════════════════════════════════════════════════════════════
    // VOLUMES — avec deadline et timeSpent
    // ══════════════════════════════════════════════════════════════════════

    const openVolModal = (lineId: number, profilId: number) => {
      setCtxLineId(lineId); setCtxProfilId(profilId);
      const existing = lineProfils.find(lp => lp.lineId === lineId && (lp.profil as any)?.id === profilId);
      setEditLineProfil(existing ?? null);
      setFVolume(existing?.volume ?? 0);
      setFCollabId(existing?.collaborateur?.id ?? null);
      setFDeadline(
        existing?.deadLine
          ? (existing.deadLine.endsWith("Z") ? existing.deadLine.slice(0, -1) : existing.deadLine).substring(0, 16)
          : ""
      );  
      setFTimeSpent(existing?.timeSpent ?? null);
      setShowVolModal(true);
    };

    const saveVolume = async () => {
      if (ctxLineId === null || ctxProfilId === null) return;
      setSaving(true);
      try {
        const payload = {
          volume:          fVolume,
          lineId:          ctxLineId,
          profilId:        ctxProfilId,
          collaborateurId: fCollabId,
          deadLine: fDeadline ? `${fDeadline}:00` : null,   
          timeSpent:       fTimeSpent,    
        };
        if (editLineProfil) {
          const updated = await svc.lineProfil.update(editLineProfil.id, payload);
          setLineProfils(prev => prev.map(lp => lp.id === editLineProfil.id ? updated : lp));
        } else {
          const created = await svc.lineProfil.create(payload);
          setLineProfils(prev => [...prev, created]);
        }
        setShowVolModal(false);
      } catch { alert("Erreur lors de la sauvegarde du volume."); }
      finally { setSaving(false); setCtxLineId(null); setCtxProfilId(null); }
    };

    const deleteVolume = async () => {
      if (!editLineProfil || !window.confirm("Supprimer ce volume ?")) return;
      try {
        await svc.lineProfil.delete(editLineProfil.id);
        setLineProfils(prev => prev.filter(lp => lp.id !== editLineProfil.id));
        setShowVolModal(false);
      } catch { alert("Impossible de supprimer le volume."); }
      finally { setCtxLineId(null); setCtxProfilId(null); }
    };

      const fmtDateTime = (iso: string | null | undefined): string => {
      if (!iso) return "";
      try {
        // Supprime le Z pour éviter la conversion UTC→local (+3h à Madagascar)
        const normalized = iso.endsWith("Z") ? iso.slice(0, -1) : iso;
        return new Date(normalized).toLocaleString("fr-FR", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        });
      } catch { return iso; }
    };

    // ══════════════════════════════════════════════════════════════════════
    // COLONNES
    // ══════════════════════════════════════════════════════════════════════

    const openAddCol  = (sprintId: number) => { setCtxSprintId(sprintId); setEditCol(null); setFCol({ name: "", type: "TEXT" }); setShowColModal(true); };
    const openEditCol = (col: BacklogColumn) => { setCtxSprintId(col.sprintId); setEditCol(col); setFCol({ name: col.name, type: col.type }); setShowColModal(true); };

    const deleteColumn = async (col: BacklogColumn) => {
      if (!window.confirm("Supprimer cette colonne ?")) return;
      try {
        await svc.column.deleteColumn(col.id);
        setColumns(prev => new Map(prev).set(col.sprintId, (prev.get(col.sprintId) ?? []).filter(c => c.id !== col.id)));
      } catch { alert("Impossible de supprimer la colonne."); }
    };

    const openCellEdit = (lineId: number, col: BacklogColumn) => {
      setEditCell({ lineId, columnId: col.id });
      setFCellVal(colValues.get(lineId)?.find(v => (v.column as any)?.id === col.id)?.value ?? "");
      setShowCellModal(true);
    };

    const saveCellValue = async () => {
      if (!editCell) return;
      setSaving(true);
      try {
        const saved = await svc.column.upsertValue({ value: fCellVal, lineId: editCell.lineId, columnId: editCell.columnId });
        setColValues(prev => {
          const m = new Map(prev);
          const vals = (m.get(editCell.lineId) ?? []).filter(v => (v.column as any)?.id !== editCell.columnId);
          m.set(editCell.lineId, [...vals, saved]); return m;
        });
        setShowCellModal(false);
      } catch { alert("Erreur lors de la sauvegarde de la valeur."); }
      finally { setSaving(false); }
    };

    // ── SortableJS ────────────────────────────────────────────────────────
    const safeDestroy = (s: Sortable | null) => { if (!s) return; try { s.destroy(); } catch {} };

    useEffect(() => {
      if (!show || !lines.length || !lineBodyRef.current) return;
      lineSortable.current = Sortable.create(lineBodyRef.current, {
        animation: 150, handle: ".drag-line", ghostClass: "sortable-ghost", filter: ".empty-row",
        onEnd: async ({ oldIndex, newIndex }) => {
          if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
          const next = [...lines]; const [m] = next.splice(oldIndex, 1); next.splice(newIndex, 0, m);
          const reordered = next.map((l, i) => ({ ...l, order: i + 1 }));
          setLines(reordered);
          try { await svc.line.updateOrder(reordered.map(l => ({ id: l.id, order: l.order }))); } catch {}
        },
      });
      return () => { safeDestroy(lineSortable.current); lineSortable.current = null; };
    }, [lines, show]);

    useEffect(() => {
      if (!show || !lots.length || !lotsRef.current) return;
      lotSortable.current = Sortable.create(lotsRef.current, {
        animation: 150, handle: ".drag-lot", ghostClass: "sortable-ghost",
        onEnd: async ({ oldIndex, newIndex }) => {
          if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
          const next = [...lots]; const [m] = next.splice(oldIndex, 1); next.splice(newIndex, 0, m);
          const reordered = next.map((l, i) => ({ ...l, order: i + 1 }));
          setLots(reordered);
          try { await svc.lot.updateOrder(reordered.map(l => ({ id: l.id, order: l.order }))); } catch {}
        },
      });
      return () => { safeDestroy(lotSortable.current); lotSortable.current = null; };
    }, [lots, show, activeTab]);

    useEffect(() => {
      if (!show) return;
      phaseSortableRefs.current.forEach(s => safeDestroy(s));
      phaseSortableRefs.current.clear();
      lots.forEach(lot => {
        if (!lot.phases?.length) return;
        const el = document.querySelector(`[data-phases-lot-id="${lot.id}"]`) as HTMLElement | null;
        if (!el) return;
        const sortable = Sortable.create(el, {
          animation: 150, handle: ".drag-phase", ghostClass: "sortable-ghost",
          onEnd: async ({ oldIndex, newIndex }) => {
            if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
            setLots(prevLots => {
              const lotData = prevLots.find(l => l.id === lot.id);
              if (!lotData?.phases) return prevLots;
              const sorted = [...lotData.phases].sort((a: any, b: any) => a.order - b.order);
              const [moved] = sorted.splice(oldIndex, 1); sorted.splice(newIndex, 0, moved);
              const reordered = sorted.map((p: any, i: number) => ({ ...p, order: i + 1 }));
              Promise.all(reordered.map((p: any) => svc.phase.updatePhaseOrder(p.id, p.order).catch(() => {})));
              return prevLots.map(l => l.id !== lot.id ? l : { ...l, phases: reordered });
            });
          },
        });
        phaseSortableRefs.current.set(lot.id, sortable);
      });
      return () => { phaseSortableRefs.current.forEach(safeDestroy); phaseSortableRefs.current.clear(); };
    }, [lots, show, activeTab]);

    useEffect(() => {
      if (!show) return;
      sprintSortableRefs.current.forEach((s, phaseId) => {
        if (!expandedPhases.has(phaseId)) { safeDestroy(s); sprintSortableRefs.current.delete(phaseId); }
      });
      expandedPhases.forEach(phaseId => {
        if (sprintSortableRefs.current.has(phaseId)) return;
        const phaseSprints = sprints.get(phaseId);
        if (!phaseSprints?.length) return;
        const el = document.querySelector(`[data-sprints-phase-id="${phaseId}"]`) as HTMLElement | null;
        if (!el) return;
        const sortable = Sortable.create(el, {
          animation: 150, handle: ".drag-sprint", ghostClass: "sortable-ghost",
          onEnd: async ({ oldIndex, newIndex }) => {
            if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
            setSprints(prevSprints => {
              const current = [...(prevSprints.get(phaseId) ?? [])].sort((a, b) => a.order - b.order);
              const [moved] = current.splice(oldIndex, 1); current.splice(newIndex, 0, moved);
              const reordered = current.map((s, i) => ({ ...s, order: i + 1 }));
              Promise.all(reordered.map(s => svc.phase.updateSprintOrder(s.id, s.order).catch(() => {})));
              const newMap = new Map(prevSprints); newMap.set(phaseId, reordered); return newMap;
            });
          },
        });
        sprintSortableRefs.current.set(phaseId, sortable);
      });
      return () => { sprintSortableRefs.current.forEach(safeDestroy); sprintSortableRefs.current.clear(); };
    }, [sprints, expandedPhases, show]);

    useEffect(() => {
      if (!show || !profils.length || !profilsRef.current) return;
      profilSortable.current = Sortable.create(profilsRef.current, {
        animation: 150, handle: ".drag-profil", ghostClass: "sortable-ghost",
        onEnd: async ({ oldIndex, newIndex }) => {
          if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return;
          const next = [...profils]; const [m] = next.splice(oldIndex, 1); next.splice(newIndex, 0, m);
          const reordered = next.map((p, i) => ({ ...p, order: i + 1 }));
          setProfils(reordered);
          try { await svc.profil.updateOrder(reordered.map(p => ({ id: p.id, order: p.order }))); } catch {}
        },
      });
      return () => { safeDestroy(profilSortable.current); profilSortable.current = null; };
    }, [profils, show]);

    // ══════════════════════════════════════════════════════════════════════
    // TOTAUX PAR PROFIL
    // ══════════════════════════════════════════════════════════════════════

    const profilTotals = profils.map(p => {
      const vol = lineProfils.filter(lp => (lp.profil as any)?.id === p.id).reduce((s, lp) => s + lp.volume, 0);
      return { profil: p, vol, amount: vol * p.tjm };
    });
    const grandTotalVol = profilTotals.reduce((s, t) => s + t.vol, 0);
    const grandTotalAmt = profilTotals.reduce((s, t) => s + t.amount, 0);

    // ══════════════════════════════════════════════════════════════════════
    // RENDU
    // ══════════════════════════════════════════════════════════════════════

    if (loadingBacklogs) {
      return (
        <Modal show={show} onHide={onClose} size="xl" fullscreen>
          <Modal.Header closeButton>
            <Modal.Title>Backlog — {projetNom ?? `Projet #${projetId}`}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
              <FaSpinner className="fa-spin me-2" size={24} /><span>Chargement…</span>
            </div>
          </Modal.Body>
        </Modal>
      );
    }

    return (
      <>
        <Modal show={show} onHide={onClose} size="xl" fullscreen>
          <Modal.Header closeButton>
            <Modal.Title>Backlog — {projetNom ?? `Projet #${projetId}`}</Modal.Title>
          </Modal.Header>

          <Modal.Body style={{ backgroundColor: "#f8f9fa" }}>
            <div className="container-fluid">
              {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

              {!selectedBacklogId && (
                <div className="py-4">
                  {backlogHeader ? (
                    <div className="row justify-content-center">
                      <div className="col-md-6 col-lg-4">
                        <div className="card shadow-sm h-100" style={{ cursor: "pointer" }} onClick={() => setSelectedBacklogId(backlogHeader.id)}>
                          <div className="card-body">
                            <h5 className="card-title">{backlogHeader.name}</h5>
                            {(backlogHeader as any).desc && <p className="card-text text-muted small">{(backlogHeader as any).desc}</p>}
                            <div className="mt-2">
                              {leadId ? <span className="badge bg-info text-dark">Issu du lead</span> : <span className="badge bg-secondary">Projet indépendant</span>}
                            </div>
                            <div className="d-flex justify-content-end mt-3">
                              <small className="text-primary">Cliquez pour ouvrir →</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <BacklogFormProjet show={showBacklogForm} onClose={() => setShowBacklogForm(false)} onSubmit={handleCreateBacklog} projetId={projetId} leadId={leadId} />
                      <Button label="Créer un backlog" icon={<FaPlus />} onClick={() => setShowBacklogForm(true)} className="mb-3" />
                      <div className="text-center text-muted py-5">
                        <p>Aucun backlog pour ce projet.</p>
                        <p className="small">Cliquez sur "Créer un backlog" pour commencer.</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {selectedBacklogId && (
                <>
                  {loading && (
                    <div className="text-center py-5">
                      <FaSpinner className="fa-spin me-2" size={24} /><span>Chargement…</span>
                    </div>
                  )}

                  {!loading && (
                    <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k ?? "backlog")} className="mb-4">

                      {/* ══════════ TAB BACKLOG ══════════════════════════ */}
                      <Tab eventKey="backlog" title="Backlog">
                        {/* Récap profil */}
                        <div className="card shadow-sm mb-3">
                          <div className="card-header fw-bold">Récapitulatif par profil</div>
                          <div className="card-body p-0">
                            <table className="table table-sm table-bordered mb-0">
                              <thead className="table-light">
                                <tr><th>Profil</th><th className="text-end">Volume JH</th><th className="text-end">TJM</th><th className="text-end">Montant</th></tr>
                              </thead>
                              <tbody>
                                {profilTotals.map(({ profil, vol, amount }) => (
                                  <tr key={profil.id}>
                                    <td><strong>{profil.name}</strong>{profil.desc && <small className="text-muted ms-2">{profil.desc}</small>}</td>
                                    <td className="text-end">{vol.toFixed(2)}</td>
                                    <td className="text-end">{profil.tjm.toFixed(2)} {deviseAbr}</td>
                                    <td className="text-end fw-bold">{amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} {deviseAbr}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="table-active">
                                <tr>
                                  <td><strong>TOTAL</strong></td>
                                  <td className="text-end fw-bold">{grandTotalVol.toFixed(2)}</td>
                                  <td />
                                  <td className="text-end fw-bold text-primary">{grandTotalAmt.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} {deviseAbr}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        {/* Récap JH */}
                        <div className="card shadow-sm mb-3">
                          <div className="card-header fw-bold d-flex justify-content-between align-items-center">
                            <span>Récapitulatif JH par Lot / Phase / Sprint</span>
                            <span className="badge bg-dark">{fmtJH(tableGrandJH)} JH total</span>
                          </div>
                          <div className="card-body p-0">
                            <table className="table table-sm table-bordered mb-0">
                              <thead className="table-light">
                                <tr><th>Niveau</th><th className="text-end" style={{ width: 90 }}>JH</th></tr>
                              </thead>
                              <tbody>
                                {lotRecap.map(({ lot, vol: lotVol, phases }) => (
                                  <React.Fragment key={lot.id}>
                                    <tr style={{ cursor: "pointer", backgroundColor: "#e8eaf6" }} onClick={() => toggleRecapLot(lot.id)}>
                                      <td>
                                        <span className="me-2 text-muted" style={{ fontSize: "0.75rem" }}>{expandedRecapLots.has(lot.id) ? <FaChevronDown /> : <FaChevronRight />}</span>
                                        <strong>{lot.name}</strong>
                                        {(() => { const d = getLotDates(lot); return (d.debut || d.fin) ? <DateBadge debut={d.debut} fin={d.fin} style={{ marginLeft: 6 }} /> : null; })()}
                                      </td>
                                      <td className="text-end fw-bold">{fmtJH(lotVol)}</td>
                                    </tr>
                                    {expandedRecapLots.has(lot.id) && phases.map(({ phase, vol: phVol, sprints: spData }) => (
                                      <React.Fragment key={phase.id}>
                                        <tr style={{ cursor: "pointer", backgroundColor: "#f3f4fb" }} onClick={() => toggleRecapPhase(phase.id)}>
                                          <td className="ps-4">
                                            <span className="me-2 text-muted" style={{ fontSize: "0.75rem" }}>{expandedRecapPhases.has(phase.id) ? <FaChevronDown /> : <FaChevronRight />}</span>
                                            {phase.name}
                                            {((phase as any).dateDebut || (phase as any).dateFin) && (
                                              <DateBadge debut={(phase as any).dateDebut} fin={(phase as any).dateFin} style={{ marginLeft: 6 }} />
                                            )}
                                          </td>
                                          <td className="text-end">{fmtJH(phVol)}</td>
                                        </tr>
                                        {expandedRecapPhases.has(phase.id) && spData.map(({ sprint, vol: spVol }) => spVol > 0 && (
                                          <tr key={sprint.id} style={{ backgroundColor: "#fafbff" }}>
                                            <td className="ps-5 text-muted small">Sprint {sprint.order} : {sprint.name}</td>
                                            <td className="text-end small">{fmtJH(spVol)}</td>
                                          </tr>
                                        ))}
                                      </React.Fragment>
                                    ))}
                                  </React.Fragment>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Récap par profil → Lot / Phase */}
                        {profils.length > 0 && (
                          <div className="card shadow-sm mb-4">
                            <div className="card-header fw-bold">Récapitulatif JH par profil — détail Lot / Phase / Sprint</div>
                            <div className="card-body p-0">
                              {profils.map(profil => {
                                const profilTot = profilTotals.find(t => t.profil.id === profil.id);
                                const profilVol = profilTot?.vol ?? 0;
                                const profilAmt = profilTot?.amount ?? 0;
                                const isOpen = expandedProfilRecap.has(profil.id);
                                return (
                                  <div key={profil.id} className="border-bottom">
                                    <div className="d-flex align-items-center justify-content-between px-3 py-2" style={{ cursor: "pointer", backgroundColor: isOpen ? "#fff8e1" : "white" }} onClick={() => toggleProfilRecap(profil.id)}>
                                      <div className="d-flex align-items-center gap-2">
                                        <span className="text-muted" style={{ fontSize: "0.75rem" }}>{isOpen ? <FaChevronDown /> : <FaChevronRight />}</span>
                                        <strong>{profil.name}</strong>
                                        {profil.desc && <small className="text-muted">— {profil.desc}</small>}
                                      </div>
                                      <div className="d-flex align-items-center gap-2">
                                        <span className="badge bg-warning text-dark">{profil.tjm.toFixed(0)} {deviseAbr}/j</span>
                                        <span className="badge bg-primary">{fmtJH(profilVol)} JH</span>
                                        <span className="badge bg-success">{profilAmt.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} {deviseAbr}</span>
                                      </div>
                                    </div>
                                    {isOpen && (
                                      <div className="px-3 pb-2 pt-1" style={{ backgroundColor: "#fffde7" }}>
                                        <table className="table table-sm table-bordered mb-0 bg-white">
                                          <thead className="table-light"><tr><th>Niveau</th><th className="text-end" style={{ width: 75 }}>JH</th><th className="text-end" style={{ width: 110 }}>Montant</th></tr></thead>
                                          <tbody>
                                            {lotRecap.map(({ lot, phases, byProfil: lotByProfil }) => {
                                              const lVol = lotByProfil.find(bp => bp.profil.id === profil.id)?.vol ?? 0;
                                              if (lVol === 0 && !expandedProfilLots.get(profil.id)?.has(lot.id)) return null;
                                              const isLotOpen = expandedProfilLots.get(profil.id)?.has(lot.id) ?? false;
                                              return (
                                                <React.Fragment key={lot.id}>
                                                  <tr style={{ cursor: "pointer", backgroundColor: "#f0f2ff" }} onClick={() => toggleProfilLot(profil.id, lot.id)}>
                                                    <td><span className="me-2 text-muted" style={{ fontSize: "0.75rem" }}>{isLotOpen ? <FaChevronDown /> : <FaChevronRight />}</span><strong>{lot.name}</strong></td>
                                                    <td className="text-end fw-bold">{fmtJH(lVol)}</td>
                                                    <td className="text-end">{(lVol * profil.tjm).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} {deviseAbr}</td>
                                                  </tr>
                                                  {isLotOpen && phases.map(({ phase, byProfil: phByProfil, sprints: phSprints }) => {
                                                    const phVol = phByProfil.find(bp => bp.profil.id === profil.id)?.vol ?? 0;
                                                    return (
                                                      <React.Fragment key={phase.id}>
                                                        <tr style={{ backgroundColor: "#f8f9ff" }}>
                                                          <td className="ps-4 text-muted">{phase.name}</td>
                                                          <td className="text-end small">{fmtJH(phVol)}</td>
                                                          <td className="text-end small">{(phVol * profil.tjm).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} {deviseAbr}</td>
                                                        </tr>
                                                        {phSprints.map(({ sprint, byProfil: spByProfil }) => {
                                                          const spVol = spByProfil.find(bp => bp.profil.id === profil.id)?.vol ?? 0;
                                                          if (spVol === 0) return null;
                                                          return (
                                                            <tr key={sprint.id} style={{ backgroundColor: "#fcfcff" }}>
                                                              <td className="ps-5 text-muted small">Sprint {sprint.order} : {sprint.name}</td>
                                                              <td className="text-end small text-muted">{fmtJH(spVol)}</td>
                                                              <td className="text-end small text-muted">{(spVol * profil.tjm).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} {deviseAbr}</td>
                                                            </tr>
                                                          );
                                                        })}
                                                      </React.Fragment>
                                                    );
                                                  })}
                                                </React.Fragment>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Tableau lignes */}
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <button className={`btn btn-sm d-flex align-items-center gap-2 ${showProfilCols ? "btn-outline-secondary" : "btn-warning"}`} onClick={() => setShowProfilCols(v => !v)}>
                            {showProfilCols ? <FaEyeSlash /> : <FaEye />}
                            {showProfilCols ? "Masquer" : "Afficher"} colonnes profils
                            <span className="badge bg-secondary">{profils.length}</span>
                          </button>
                          <Button label="Ajouter une ligne" icon={<FaPlus />} onClick={openAddLine} />
                        </div>
                        <div className="table-responsive shadow-sm rounded">
                          <table className="table table-bordered table-hover align-middle mb-0">
                            <thead className="table-dark">
                              <tr>
                                <th style={{ width: 32 }} /><th style={{ width: 40 }}>#</th>
                                <th style={{ minWidth: 180 }}>Lot / Phase / Sprint</th>
                                <th>Epic</th><th>User Story</th><th>Description</th><th>Détails</th>
                                {showProfilCols && profils.map(p => (
                                  <th key={p.id} className="text-center" style={{ minWidth: 140 }}>
                                    <div className="fw-bold">{p.name}</div>
                                    {p.collaborateurs.length > 0 && (
                                      <div className="d-flex flex-column gap-1 mt-1">
                                        {p.collaborateurs.map((c: any) => (
                                          <span key={c.id} className="badge bg-info text-dark fw-normal" style={{ fontSize: "0.65rem", whiteSpace: "nowrap" }}>
                                            {c.prenom} {c.nom}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    {/* Sous-labels colonnes */}
                                    <div className="d-flex justify-content-center gap-2 mt-1" style={{ fontSize: "0.58rem", color: "#adb5bd", fontWeight: "normal" }}>
                                      <span>JH</span><span>·</span><span>Passé</span><span>·</span><span>Deadline</span>
                                    </div>
                                  </th>
                                ))}
                                <th className="text-center" style={{ minWidth: 75, backgroundColor: "#495057" }}>
                                  <div className="fw-bold text-warning">Total JH</div>
                                </th>
                                <th style={{ width: 90 }} />
                              </tr>
                            </thead>
                            <tbody ref={lineBodyRef}>
                              {lines.length === 0 ? (
                                <tr className="empty-row">
                                  <td colSpan={8 + (showProfilCols ? profils.length : 0) + 1} className="text-center text-muted fst-italic py-4">
                                    Aucune ligne — cliquez sur « Ajouter une ligne »
                                  </td>
                                </tr>
                              ) : lines.map(line => {
                                const lot = getLotByPhaseId((line as any).phaseId);
                                const phaseName = getPhaseNameById((line as any).phaseId);
                                const sprintId = (line as any).sprintId;
                                const sprintName = sprintId ? (sprints.get((line as any).phaseId) ?? []).find(s => s.id === sprintId)?.name ?? null : null;
                                const lineJH = getLineJH(line.id);
                                return (
                                  <tr key={line.id}>
                                    <td className="drag-line text-center text-muted" style={{ cursor: "grab", userSelect: "none" }}>⋮⋮</td>
                                    <td className="text-center text-muted">{line.order}</td>
                                    <td className="text-nowrap">
                                      <div className="d-flex align-items-center gap-1" style={{ cursor: "pointer" }} onClick={() => toggleLine(line.id)}>
                                        <span className="text-muted" style={{ fontSize: "0.7rem" }}>{expandedLines.has(line.id) ? <FaChevronDown /> : <FaChevronRight />}</span>
                                        <span className="fw-semibold small text-truncate" style={{ maxWidth: 160 }}>{lot?.name ?? "—"}</span>
                                      </div>
                                      {expandedLines.has(line.id) && (
                                        <div className="ms-3 mt-1" style={{ fontSize: "0.8rem", lineHeight: 1.6 }}>
                                          <div><span className="text-muted">Phase :</span> <span className="fw-semibold">{phaseName}</span></div>
                                          {sprintName && <div><span className="text-muted">Sprint :</span> <span className="fw-semibold">{sprintName}</span></div>}
                                        </div>
                                      )}
                                    </td>
                                    <td>{line.epic ?? "—"}</td>
                                    <td>{line.userStory ?? "—"}</td>
                                    <td>{line.description ?? "—"}</td>
                                    <td>{line.resultat ?? "—"}</td>

                                    {/* ── Colonnes profil avec statut d'avancement ── */}
                                    {showProfilCols && profils.map(p => {
                                      const lp        = getLineProfil(line.id, p.id);
                                      const vol       = lp?.volume ?? 0;
                                      const collab    = lp?.collaborateur;
                                      const deadline  = lp?.deadLine ?? null;
                                      const timeSpent = lp?.timeSpent ?? null;
                                      const pct       = vol > 0 && timeSpent != null ? Math.round((timeSpent / vol) * 100) : null;
                                      const isOverdue = deadline && new Date(deadline) < new Date() && pct !== 100;

                                      return (
                                        <td
                                          key={p.id}
                                          className="text-center"
                                          style={{ cursor: "pointer", verticalAlign: "middle", padding: "4px 6px" }}
                                          onClick={() => openVolModal(line.id, p.id)}
                                        >
                                          {vol > 0 ? (
                                            <div className="d-flex flex-column align-items-center gap-1">
                                              {/* Volume + temps passé */}
                                              <div className="d-flex align-items-center gap-1 flex-wrap justify-content-center">
                                                <span className="badge bg-primary" style={{ fontSize: "0.7rem" }}>{vol} JH</span>
                                                {timeSpent != null && (
                                                  <span
                                                    className={`badge ${pct! > 100 ? "bg-danger" : pct! >= 80 ? "bg-warning text-dark" : "bg-success"}`}
                                                    style={{ fontSize: "0.65rem" }}
                                                    title={`${timeSpent} JH passés sur ${vol} JH`}
                                                  >
                                                    {timeSpent}h
                                                  </span>
                                                )}
                                              </div>

                                              {/* Barre de progression */}
                                              {pct != null && (
                                                <div style={{ width: "100%", maxWidth: 80, height: 4, backgroundColor: "#e9ecef", borderRadius: 2, overflow: "hidden" }}>
                                                  <div
                                                    style={{
                                                      width:           `${Math.min(pct, 100)}%`,
                                                      height:          "100%",
                                                      backgroundColor: progressColor(pct),
                                                      borderRadius:    2,
                                                      transition:      "width 0.3s",
                                                    }}
                                                  />
                                                </div>
                                              )}

                                              {/* Deadline */}
                                              {deadline && (
                                                <span
                                                  style={{
                                                    fontSize:   "0.6rem",
                                                    color:      isOverdue ? "#dc3545" : "#6c757d",
                                                    fontWeight: isOverdue ? "bold" : "normal",
                                                    whiteSpace: "nowrap",
                                                  }}
                                                  title={isOverdue ? "Deadline dépassée !" : `Deadline : ${fmtDateTime(deadline)}`}
                                                  >
                                                  {isOverdue ? "⚠ " : ""}{fmtDateTime(deadline)}                                                
                                                </span>
                                              )}

                                              {/* Collaborateur */}
                                              {collab && (
                                                <small className="text-muted" style={{ fontSize: "0.6rem", lineHeight: 1.1 }}>
                                                  {collab.nom} {collab.prenom}
                                                </small>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-muted small">—</span>
                                          )}
                                        </td>
                                      );
                                    })}

                                    <td className="text-center" style={{ backgroundColor: "#fffbea" }}>
                                      {lineJH > 0 ? <span className="badge bg-warning text-dark fw-bold">{fmtJH(lineJH)}</span> : <span className="text-muted small">—</span>}
                                    </td>
                                    <td>
                                      <div className="d-flex gap-1 justify-content-center">
                                        <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditLine(line)}><FaEdit /></button>
                                        <button className="btn btn-sm btn-outline-danger" onClick={() => deleteLine(line.id)}><FaTrash /></button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            {lines.length > 0 && (
                              <tfoot>
                                <tr className="table-warning fw-bold">
                                  <td colSpan={7} className="text-end pe-3 text-muted" style={{ fontSize: "0.85rem" }}>TOTAL ↓</td>
                                  {showProfilCols && profils.map(p => {
                                    const pVol = profilTotals.find(t => t.profil.id === p.id)?.vol ?? 0;
                                    return <td key={p.id} className="text-center">{pVol > 0 ? fmtJH(pVol) : "—"}</td>;
                                  })}
                                  <td className="text-center"><span className="badge bg-dark">{fmtJH(tableGrandJH)} JH</span></td>
                                  <td />
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </Tab>

                      {/* ══════════ TAB LOTS & PHASES ════════════════════ */}
                      <Tab eventKey="lots" title="Lots & Phases">
                        <div className="d-flex justify-content-end mb-3">
                          <Button label="Ajouter un lot" icon={<FaPlus />} onClick={openAddLot} />
                        </div>

                        <div ref={lotsRef}>
                          {lots.length === 0
                            ? <div className="text-center text-muted py-4 fst-italic">Aucun lot. Cliquez sur « Ajouter un lot ».</div>
                            : lots.map(lot => (
                              <div key={lot.id} className="card mb-3 shadow-sm">
                                <div className="card-header d-flex align-items-center gap-2 flex-wrap">
                                  <span className="drag-lot text-muted" style={{ cursor: "grab", userSelect: "none", fontSize: "1.1rem" }}>⋮⋮</span>
                                  <strong className="flex-grow-1">{lot.order}. {lot.name}</strong>
                                  {lot.desc && <small className="text-muted me-1">{lot.desc}</small>}
                                  {(() => { const d = getLotDates(lot); return <DateBadge debut={d.debut} fin={d.fin} />; })()}
                                  <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditLot(lot)}><FaEdit /></button>
                                  <button className="btn btn-sm btn-outline-danger ms-1" onClick={() => deleteLot(lot.id)}><FaTrash /></button>
                                </div>
                                <div className="card-body pt-2 pb-3">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-muted small fw-semibold">Phases</span>
                                    <Button label="+ Phase" variant="secondary" onClick={() => openAddPhase(lot.id)} />
                                  </div>
                                  <div data-phases-lot-id={lot.id}>
                                    {((lot.phases ?? []) as BacklogPhase[]).sort((a, b) => a.order - b.order).map(phase => {
                                      const phaseSprints = sprints.get(phase.id) ?? [];
                                      const phaseDeliv   = deliverables.get(phase.id) ?? [];
                                      const expanded     = expandedPhases.has(phase.id);
                                      return (
                                        <div key={phase.id} className="border rounded mb-2 p-0" style={{ backgroundColor: "#f5f7fa" }}>
                                          <div className="d-flex align-items-center gap-2 p-2 flex-wrap">
                                            <span className="drag-phase text-muted" style={{ cursor: "grab", userSelect: "none", fontSize: "1rem" }}>⋮⋮</span>
                                            <span style={{ cursor: "pointer" }} onClick={() => togglePhase(phase.id)}>{expanded ? <FaChevronDown /> : <FaChevronRight />}</span>
                                            <span className="fw-semibold flex-grow-1" style={{ cursor: "pointer" }} onClick={() => togglePhase(phase.id)}>
                                              {phase.order}. {phase.name}
                                            </span>
                                            <DateBadge debut={(phase as any).dateDebut} fin={(phase as any).dateFin} />
                                            <span className="badge bg-primary">{phaseSprints.length} sprint{phaseSprints.length !== 1 ? "s" : ""}</span>
                                            <span className="badge bg-success">{phaseDeliv.length} livrable{phaseDeliv.length !== 1 ? "s" : ""}</span>
                                            <button className="btn btn-sm btn-warning"                onClick={() => openAddSprint(phase.id)}><FaCalendar className="me-1" />Sprint</button>
                                            <button className="btn btn-sm btn-success ms-1"           onClick={() => openAddDeliv(phase.id)}><FaCalendar className="me-1" />Livrable</button>
                                            <button className="btn btn-sm btn-outline-secondary ms-1" onClick={() => openEditPhase(phase, lot.id)}><FaEdit /></button>
                                            <button className="btn btn-sm btn-outline-danger ms-1"    onClick={() => deletePhase(phase.id, lot.id)}><FaTrash /></button>
                                          </div>

                                          {expanded && (
                                            <div className="px-3 pb-2">
                                              <div data-sprints-phase-id={phase.id}>
                                                {phaseSprints.map(sprint => {
                                                  const sprintCols  = columns.get(sprint.id) ?? [];
                                                  const sprintDeliv = phaseDeliv.filter(d => (d as any).sprintId === sprint.id);
                                                  const spExpanded  = expandedSprints.get(phase.id)?.has(sprint.id) ?? false;
                                                  return (
                                                    <div key={sprint.id} className="border rounded p-2 mb-2" style={{ backgroundColor: "#fffbea" }}>
                                                      <div className="d-flex align-items-center gap-2 flex-wrap">
                                                        <span className="drag-sprint text-muted" style={{ cursor: "grab", userSelect: "none" }}>⋮⋮</span>
                                                        <strong className="flex-grow-1">Sprint {sprint.order} : {sprint.name}</strong>
                                                        {(sprint.dateDebut || sprint.dateFin) && (
                                                          <DateBadge debut={sprint.dateDebut} fin={sprint.dateFin} style={{ background: "#fff3cd", borderColor: "#ffc107" }} />
                                                        )}
                                                        <button className="btn btn-sm btn-outline-secondary ms-1" onClick={() => toggleSprint(phase.id, sprint.id)}>
                                                          {spExpanded ? <FaChevronDown /> : <FaChevronRight />}
                                                        </button>
                                                        <button className="btn btn-sm btn-outline-primary ms-1" onClick={() => openEditSprint(sprint, phase.id)}><FaEdit /></button>
                                                        <button className="btn btn-sm btn-outline-danger ms-1"  onClick={() => deleteSprint(sprint.id, phase.id)}><FaTrash /></button>
                                                      </div>
                                                      {spExpanded && (
                                                        <div className="mt-2 ms-3">
                                                          {sprintCols.length > 0 && (
                                                            <div className="mb-2">
                                                              <strong className="small text-secondary">Colonnes :</strong>
                                                              <div className="d-flex flex-wrap gap-1 mt-1">
                                                                {sprintCols.map(col => (
                                                                  <span key={col.id} className="badge bg-secondary d-inline-flex align-items-center gap-1">
                                                                    {col.name} <em className="text-light opacity-75 small">({col.type})</em>
                                                                    <button className="btn btn-link btn-sm p-0 text-white" onClick={() => openEditCol(col)}><FaEdit size={9} /></button>
                                                                    <button className="btn btn-link btn-sm p-0 text-white" onClick={() => deleteColumn(col)}><FaTrash size={9} /></button>
                                                                  </span>
                                                                ))}
                                                              </div>
                                                            </div>
                                                          )}
                                                          {sprintDeliv.length > 0
                                                            ? sprintDeliv.map(d => (
                                                              <div key={d.id} className={`d-flex justify-content-between align-items-center border-bottom py-1 small${(d as any).isDelivered ? " opacity-75" : ""}`}
                                                                style={(d as any).isDelivered ? { background: "#f0fff4" } : {}}>
                                                                <span className="d-flex align-items-center gap-2">
                                                                  {(d as any).isDelivered && <FaCheckCircle className="text-success" style={{ flexShrink: 0 }} />}
                                                                  <span>
                                                                    <strong style={(d as any).isDelivered ? { textDecoration: "line-through", color: "#6c757d" } : {}}>{d.name}</strong>
                                                                    {(d as any).deliveryDate && <span className="text-muted ms-1">{` — ${new Date((d as any).deliveryDate).toLocaleDateString("fr-FR")}`}</span>}
                                                                    {(d as any).isDelivered && <span className="badge bg-success ms-2" style={{ fontSize: "0.6rem" }}>Livré</span>}
                                                                  </span>
                                                                </span>
                                                                <div className="d-flex gap-1 align-items-center">
                                                                  {!(d as any).isDelivered && (
                                                                    <button className="btn btn-sm btn-success py-0 px-1 d-flex align-items-center gap-1"
                                                                      style={{ fontSize: "0.7rem" }} title="Marquer comme livré"
                                                                      onClick={() => deliverLivrable(d.id!, phase.id)}>
                                                                      <FaCheckCircle size={10} /> Livrer
                                                                    </button>
                                                                  )}
                                                                  <button className="btn btn-link btn-sm p-0" onClick={() => openEditDeliv(d, phase.id)}><FaEdit /></button>
                                                                  <button className="btn btn-link btn-sm p-0 text-danger" onClick={() => deleteDeliv(d.id!, phase.id)}><FaTrash /></button>
                                                                </div>
                                                              </div>
                                                            ))
                                                            : <div className="text-muted small fst-italic">Aucun livrable dans ce sprint.</div>}
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>

                                              {phaseDeliv.filter(d => !(d as any).sprintId).map(d => (
                                                <div key={d.id}
                                                  className={`d-flex justify-content-between align-items-center border-bottom py-1 small ps-1${(d as any).isDelivered ? " opacity-75" : ""}`}
                                                  style={(d as any).isDelivered ? { background: "#f0fff4" } : {}}>
                                                  <span className="d-flex align-items-center gap-2">
                                                    {(d as any).isDelivered && <FaCheckCircle className="text-success" style={{ flexShrink: 0 }} />}
                                                    <span>
                                                      <strong style={(d as any).isDelivered ? { textDecoration: "line-through", color: "#6c757d" } : {}}>{d.name}</strong>
                                                      {(d as any).deliveryDate && <span className="text-muted ms-1">{` — ${new Date((d as any).deliveryDate).toLocaleDateString("fr-FR")}`}</span>}
                                                      {(d as any).isDelivered && <span className="badge bg-success ms-2" style={{ fontSize: "0.6rem" }}>Livré</span>}
                                                    </span>
                                                  </span>
                                                  <div className="d-flex gap-1 align-items-center">
                                                    {!(d as any).isDelivered && (
                                                      <button className="btn btn-sm btn-success py-0 px-1 d-flex align-items-center gap-1"
                                                        style={{ fontSize: "0.7rem" }} title="Marquer comme livré"
                                                        onClick={() => deliverLivrable(d.id!, phase.id)}>
                                                        <FaCheckCircle size={10} /> Livrer
                                                      </button>
                                                    )}
                                                    <button className="btn btn-link btn-sm p-0" onClick={() => openEditDeliv(d, phase.id)}><FaEdit /></button>
                                                    <button className="btn btn-link btn-sm p-0 text-danger" onClick={() => deleteDeliv(d.id!, phase.id)}><FaTrash /></button>
                                                  </div>
                                                </div>
                                              ))}
                                              {phaseSprints.length === 0 && phaseDeliv.length === 0 && (
                                                <div className="text-muted small fst-italic py-1">Aucun sprint ni livrable.</div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </Tab>

                      {/* ══════════ TAB PROFILS ══════════════════════════ */}
                      <Tab eventKey="profils" title="Profils">
                        <div className="d-flex justify-content-end mb-3">
                          <Button label="Ajouter un profil" icon={<FaPlus />} onClick={openAddProfil} />
                        </div>
                        <div ref={profilsRef}>
                          {profils.length === 0
                            ? <div className="text-center text-muted py-4 fst-italic">Aucun profil.</div>
                            : profils.map(profil => (
                              <div key={profil.id} className="card mb-2 shadow-sm">
                                <div className="card-body d-flex align-items-start gap-3 py-2">
                                  <span className="drag-profil text-muted mt-1" style={{ cursor: "grab", userSelect: "none" }}>⋮⋮</span>
                                  <div className="flex-grow-1">
                                    <div className="fw-bold">{profil.order}. {profil.name}</div>
                                    {profil.desc && <small className="text-muted">{profil.desc}</small>}
                                    <div className="mt-1"><span className="badge bg-warning text-dark">TJM : {profil.tjm.toFixed(0)} {deviseAbr}/j</span></div>
                                    {profil.collaborateurs.length > 0 && (
                                      <div className="mt-2 d-flex flex-wrap gap-1">
                                        {profil.collaborateurs.map((c: any) => (
                                          <span key={c.id} className="badge bg-info text-dark">{c.nom} {c.prenom}{c.appellation && <em className="ms-1 opacity-75">({c.appellation})</em>}</span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="d-flex gap-2 align-items-center">
                                    <button className="btn btn-sm btn-outline-info d-flex align-items-center gap-1" onClick={() => openCollabModal(profil)}><FaUsers /><span className="d-none d-md-inline">Collaborateurs</span></button>
                                    <button className="btn btn-sm btn-outline-secondary" onClick={() => openEditProfil(profil)}><FaEdit /></button>
                                    <button className="btn btn-sm btn-outline-danger"    onClick={() => deleteProfil(profil.id)}><FaTrash /></button>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </Tab>

                      <Tab eventKey="planning" title="Planning">
                        <PlanningTab
                          lots={lots} lines={lines} lineProfils={lineProfils}
                          deliverables={deliverables} selectedBacklogId={selectedBacklogId}
                          planningService={svc.planning}
                          projectStartDate={projectStartDate} projectEndDate={projectEndDate}
                          onUpdateProjectDates={async (newStart, newEnd) => {
                            await projetService.updateDates(projetId, newStart, newEnd);
                          }}
                        />
                      </Tab>

                      <Tab eventKey="budget" title="Budget">
                        <BudgetTab
                          lots={lots} profils={profils as any} lines={lines}
                          lineProfils={lineProfils as any} selectedBacklogId={backlog?.id ?? null}
                          leadId={leadId ?? null} deviseAbr={deviseAbr}
                        />
                      </Tab>
                    </Tabs>
                  )}
                </>
              )}
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button label="Fermer" variant="outline" onClick={onClose} />
          </Modal.Footer>
        </Modal>

        {/* ══════════════════════════ MODAUX MÉTIER ═══════════════════════ */}

        <Modal show={showLotModal} onHide={() => !saving && setShowLotModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>{editLot ? "Modifier le lot" : "Nouveau lot"}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3"><Form.Label>Nom *</Form.Label><Form.Control value={fLot.name} onChange={e => setFLot(f => ({ ...f, name: e.target.value }))} disabled={saving} autoFocus /></Form.Group>
              <Form.Group><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={2} value={fLot.desc} onChange={e => setFLot(f => ({ ...f, desc: e.target.value }))} disabled={saving} /></Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button label="Annuler" variant="outline" onClick={() => setShowLotModal(false)} />
            <Button label={saving ? "…" : editLot ? "Enregistrer" : "Créer"} onClick={saveLot} />
          </Modal.Footer>
        </Modal>

        <Modal show={showPhaseModal} onHide={() => !saving && setShowPhaseModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>{editPhase ? "Modifier la phase" : "Nouvelle phase"}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group><Form.Label>Nom *</Form.Label><Form.Control value={fPhase.name} onChange={e => setFPhase({ name: e.target.value })} disabled={saving} autoFocus /></Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button label="Annuler" variant="outline" onClick={() => setShowPhaseModal(false)} />
            <Button label={saving ? "…" : editPhase ? "Enregistrer" : "Créer"} onClick={savePhase} />
          </Modal.Footer>
        </Modal>

        <Modal show={showSprintModal} onHide={() => !saving && setShowSprintModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>{editSprint ? "Modifier le sprint" : "Nouveau sprint"}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Nom *</Form.Label>
                <Form.Control value={fSprint.name} onChange={e => setFSprint(f => ({ ...f, name: e.target.value }))} disabled={saving} autoFocus />
              </Form.Group>
              <div className="row g-2">
                <div className="col">
                  <Form.Group>
                    <Form.Label>Date début <small className="text-muted ms-1">(propagée vers la phase)</small></Form.Label>
                    <Form.Control type="date" value={fSprint.startDate} onChange={e => setFSprint(f => ({ ...f, startDate: e.target.value }))} disabled={saving} />
                  </Form.Group>
                </div>
                <div className="col">
                  <Form.Group>
                    <Form.Label>Date fin <small className="text-muted ms-1">(propagée vers la phase)</small></Form.Label>
                    <Form.Control type="date" value={fSprint.endDate} onChange={e => setFSprint(f => ({ ...f, endDate: e.target.value }))} disabled={saving} />
                  </Form.Group>
                </div>
              </div>
              {(fSprint.startDate || fSprint.endDate) && (
                <div className="mt-2 p-2 rounded" style={{ background: "#e8f4fd", fontSize: "0.78rem", color: "#555" }}>
                  Les dates de la <strong>phase</strong> et du <strong>lot</strong> seront automatiquement recalculées après enregistrement.
                </div>
              )}
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button label="Annuler" variant="outline" onClick={() => setShowSprintModal(false)} />
            <Button label={saving ? "…" : editSprint ? "Enregistrer" : "Créer"} onClick={saveSprint} />
          </Modal.Footer>
        </Modal>

        <Modal show={showDelivModal} onHide={() => !saving && setShowDelivModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>{editDeliv ? "Modifier le livrable" : "Nouveau livrable"}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3"><Form.Label>Nom *</Form.Label><Form.Control value={fDeliv.name} onChange={e => setFDeliv(f => ({ ...f, name: e.target.value }))} disabled={saving} autoFocus /></Form.Group>
              {ctxPhaseId !== null && (
                <Form.Group className="mb-3">
                  <Form.Label>Sprint associé</Form.Label>
                  <Form.Select value={fDeliv.sprintId ?? ""} onChange={e => setFDeliv(f => ({ ...f, sprintId: e.target.value ? +e.target.value : null }))} disabled={saving}>
                    <option value="">Sans sprint</option>
                    {(sprints.get(ctxPhaseId) ?? []).map(s => <option key={s.id} value={s.id}>Sprint {s.order} — {s.name}</option>)}
                  </Form.Select>
                </Form.Group>
              )}
              <Form.Group className="mb-3"><Form.Label>Date de livraison</Form.Label><Form.Control type="date" value={fDeliv.deliveryDate} onChange={e => setFDeliv(f => ({ ...f, deliveryDate: e.target.value }))} disabled={saving} /></Form.Group>
              <Form.Group><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={2} value={fDeliv.description} onChange={e => setFDeliv(f => ({ ...f, description: e.target.value }))} disabled={saving} /></Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button label="Annuler" variant="outline" onClick={() => setShowDelivModal(false)} />
            <Button label={saving ? "…" : editDeliv ? "Enregistrer" : "Créer"} onClick={saveDeliv} />
          </Modal.Footer>
        </Modal>

        <Modal show={showProfilModal} onHide={() => !saving && setShowProfilModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>{editProfil ? "Modifier le profil" : "Nouveau profil"}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3"><Form.Label>Nom *</Form.Label><Form.Control value={fProfil.name} onChange={e => setFProfil(f => ({ ...f, name: e.target.value }))} disabled={saving} autoFocus /></Form.Group>
              <Form.Group className="mb-3"><Form.Label>Description</Form.Label><Form.Control value={fProfil.desc} onChange={e => setFProfil(f => ({ ...f, desc: e.target.value }))} disabled={saving} /></Form.Group>
              <Form.Group><Form.Label>TJM ({deviseAbr}/jour) *</Form.Label><Form.Control type="number" min="0" step="50" value={fProfil.tjm} onChange={e => setFProfil(f => ({ ...f, tjm: +e.target.value || 0 }))} disabled={saving} /></Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button label="Annuler" variant="outline" onClick={() => setShowProfilModal(false)} />
            <Button label={saving ? "…" : editProfil ? "Enregistrer" : "Créer"} onClick={saveProfil} />
          </Modal.Footer>
        </Modal>

        <Modal show={showCollabModal} onHide={() => !saving && setShowCollabModal(false)} centered size="md">
          <Modal.Header closeButton><Modal.Title><FaUsers className="me-2" />Collaborateurs — {collabProfil?.name}</Modal.Title></Modal.Header>
          <Modal.Body>
            <div className="position-relative mb-3">
              <Form.Control placeholder="Rechercher un collaborateur…" value={collabSearch} onChange={e => setCollabSearch(e.target.value)} disabled={saving} autoFocus />
              {collabSearch.trim() && (
                <div className="border rounded bg-white shadow-sm position-absolute w-100" style={{ zIndex: 1000, maxHeight: 220, overflowY: "auto" }}>
                  {allCollabs.filter(c => !fCollabIds.includes(c.id) && `${c.nom} ${c.prenom} ${c.appellation ?? ""}`.toLowerCase().includes(collabSearch.toLowerCase())).map((c: any) => (
                    <div key={c.id} className="px-3 py-2 d-flex align-items-center gap-2" style={{ cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#f0f4ff")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "")}
                      onClick={() => { setFCollabIds(prev => [...prev, c.id]); setCollabSearch(""); }}>
                      <span className="fw-semibold">{c.nom} {c.prenom}</span>
                      {c.appellation && <small className="text-muted">({c.appellation})</small>}
                      {c.emailPro && <small className="text-muted ms-auto">{c.emailPro}</small>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {fCollabIds.length > 0 ? (
              <div className="d-flex flex-wrap gap-2">
                {fCollabIds.map(id => {
                  const c = allCollabs.find((x: any) => x.id === id);
                  if (!c) return null;
                  return (
                    <span key={id} className="badge bg-info text-dark d-flex align-items-center gap-1 px-2 py-1" style={{ fontSize: "0.85rem" }}>
                      {c.nom} {c.prenom}
                      {c.appellation && <em className="opacity-75 small">({c.appellation})</em>}
                      <button type="button" className="btn btn-link p-0 ms-1 text-dark" style={{ fontSize: "0.75rem", lineHeight: 1 }} onClick={() => setFCollabIds(prev => prev.filter(x => x !== id))} disabled={saving}>✕</button>
                    </span>
                  );
                })}
              </div>
            ) : <div className="text-muted fst-italic small">Aucun collaborateur sélectionné.</div>}
          </Modal.Body>
          <Modal.Footer>
            <Button label="Annuler" variant="outline" onClick={() => { setShowCollabModal(false); setCollabSearch(""); }} />
            <Button label={saving ? "…" : "Enregistrer"} onClick={saveCollabs} />
          </Modal.Footer>
        </Modal>

        <Modal show={showLineModal} onHide={() => !saving && setShowLineModal(false)} centered size="lg">
          <Modal.Header closeButton><Modal.Title>{editLine ? "Modifier la ligne" : "Nouvelle ligne"}</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Lot *</Form.Label>
                <Form.Select value={fLine.lotId ?? ""} onChange={e => setFLine(f => ({ ...f, lotId: e.target.value ? +e.target.value : null, phaseId: null, sprintId: null }))} disabled={saving}>
                  <option value="">— Sélectionner un lot —</option>
                  {lots.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </Form.Select>
              </Form.Group>
              {fLine.lotId && (
                <Form.Group className="mb-3">
                  <Form.Label>Phase *</Form.Label>
                  <Form.Select value={fLine.phaseId ?? ""} onChange={e => setFLine(f => ({ ...f, phaseId: e.target.value ? +e.target.value : null, sprintId: null }))} disabled={saving}>
                    <option value="">— Sélectionner une phase —</option>
                    {((lots.find(l => l.id === fLine.lotId)?.phases ?? []) as BacklogPhase[]).sort((a, b) => a.order - b.order).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Form.Select>
                </Form.Group>
              )}
              {fLine.phaseId && (sprints.get(fLine.phaseId) ?? []).length > 0 && (
                <Form.Group className="mb-3">
                  <Form.Label>Sprint <small className="text-muted">(optionnel)</small></Form.Label>
                  <Form.Select value={fLine.sprintId ?? ""} onChange={e => setFLine(f => ({ ...f, sprintId: e.target.value ? +e.target.value : null }))} disabled={saving}>
                    <option value="">— Sans sprint —</option>
                    {(sprints.get(fLine.phaseId) ?? []).map(s => <option key={s.id} value={s.id}>Sprint {s.order} — {s.name}</option>)}
                  </Form.Select>
                </Form.Group>
              )}
              <div className="row g-2">
                <div className="col-md-6"><Form.Group><Form.Label>Epic</Form.Label><Form.Control value={fLine.epic} onChange={e => setFLine(f => ({ ...f, epic: e.target.value }))} disabled={saving} /></Form.Group></div>
                <div className="col-md-6"><Form.Group><Form.Label>User Story</Form.Label><Form.Control value={fLine.userStory} onChange={e => setFLine(f => ({ ...f, userStory: e.target.value }))} disabled={saving} /></Form.Group></div>
              </div>
              <Form.Group className="mb-3 mt-2"><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={2} value={fLine.description} onChange={e => setFLine(f => ({ ...f, description: e.target.value }))} disabled={saving} /></Form.Group>
              <Form.Group><Form.Label>Détails / Résultat attendu</Form.Label><Form.Control as="textarea" rows={2} value={fLine.resultat} onChange={e => setFLine(f => ({ ...f, resultat: e.target.value }))} disabled={saving} /></Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button label="Annuler" variant="outline" onClick={() => setShowLineModal(false)} />
            <Button label={saving ? "…" : editLine ? "Enregistrer" : "Créer"} onClick={saveLine} />
          </Modal.Footer>
        </Modal>

        {/* ══ Modal Volume JH — avec deadline et temps passé ══════════════ */}
        <Modal show={showVolModal} onHide={() => !saving && setShowVolModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Volume JH — {currentProfil?.name ?? "Profil"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {/* Jours-Homme */}
            <Form.Control
              type="number" step="0.5" min="0"
              value={fVolume}
              onChange={e => setFVolume(+e.target.value || 0)}
              onWheel={e => (e.target as HTMLInputElement).blur()}   
              disabled={saving} autoFocus
            />

            {/* Deadline */}
            <Form.Group className="mb-3">
              <Form.Label>Deadline</Form.Label>
              <Form.Control
                type="datetime-local"
                value={fDeadline}
                onChange={e => setFDeadline(e.target.value)}
                disabled={saving}
              />
            </Form.Group>

            {/* Temps passé */}
            <Form.Group className="mb-3">
              <Form.Label className="d-flex align-items-center gap-2">
                Temps passé (JH)
                {fVolume > 0 && fTimeSpent != null && (
                  (() => {
                    const pct = Math.round((fTimeSpent / fVolume) * 100);
                    return (
                      <span
                        className={`badge ${pct > 100 ? "bg-danger" : pct >= 80 ? "bg-warning text-dark" : "bg-success"}`}
                        style={{ fontSize: "0.7rem" }}
                      >
                        {pct}%
                      </span>
                    );
                  })()
                )}
              </Form.Label>
                <Form.Control
                  type="number" step="0.5" min="0"
                  placeholder="0"
                  value={fTimeSpent ?? ""}
                  onChange={e => setFTimeSpent(e.target.value ? +e.target.value : null)}
                  onWheel={e => (e.target as HTMLInputElement).blur()}   // ← ajout
                  disabled={saving}
                />            
              {/* Barre de progression en temps réel dans le modal */}
              {fVolume > 0 && fTimeSpent != null && (
                <div className="mt-2">
                  <div style={{ height: 6, backgroundColor: "#e9ecef", borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        width:           `${Math.min(Math.round((fTimeSpent / fVolume) * 100), 100)}%`,
                        height:          "100%",
                        backgroundColor: progressColor(Math.round((fTimeSpent / fVolume) * 100)),
                        borderRadius:    3,
                        transition:      "width 0.2s",
                      }}
                    />
                  </div>
                  <div className="text-muted small mt-1">
                    {fTimeSpent} JH passés sur {fVolume} JH planifiés
                    {fTimeSpent > fVolume && <span className="text-danger fw-bold ms-2">⚠ Dépassement</span>}
                  </div>
                </div>
              )}
            </Form.Group>

            {/* Collaborateur assigné */}
            {currentProfil && (currentProfil.collaborateurs?.length ?? 0) > 0 && (
              <Form.Group className="mb-3">
                <Form.Label>Collaborateur assigné</Form.Label>
                {(() => {
                  const assigned = currentProfil.collaborateurs!.find((c: any) => c.id === fCollabId);
                  return assigned ? (
                    <div className="d-flex align-items-center justify-content-between border rounded px-3 py-2" style={{ backgroundColor: "#f0f9ff", borderColor: "#90cdf4" }}>
                      <div>
                        <span className="fw-semibold">{assigned.prenom} {assigned.nom}</span>
                        {assigned.appellation && <small className="text-muted ms-2">({assigned.appellation})</small>}
                      </div>
                      <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => setFCollabId(null)} disabled={saving}>✕</button>
                    </div>
                  ) : (
                    <div className="d-flex flex-wrap gap-2 border rounded p-2" style={{ backgroundColor: "#fafafa" }}>
                      {currentProfil.collaborateurs!.map((c: any) => (
                        <button key={c.id} type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setFCollabId(c.id)} disabled={saving}>
                          {c.prenom} {c.nom}{c.appellation && <small className="text-muted ms-1">({c.appellation})</small>}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </Form.Group>
            )}

            {/* Estimation financière */}
            {currentProfil && (
              <div className="text-muted small p-2 rounded" style={{ backgroundColor: "#f8f9fa" }}>
                TJM : {currentProfil.tjm?.toLocaleString("fr-FR")} {deviseAbr}<br />
                Montant estimé : <strong>{(fVolume * (currentProfil.tjm ?? 0)).toLocaleString("fr-FR", { maximumFractionDigits: 0 })} {deviseAbr}</strong>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            {editLineProfil && <Button label="Supprimer" variant="outline" onClick={deleteVolume} />}
            <Button label="Annuler" variant="outline" onClick={() => setShowVolModal(false)} />
            <Button label={saving ? "…" : editLineProfil ? "Mettre à jour" : "Ajouter"} onClick={saveVolume} />
          </Modal.Footer>
        </Modal>

        <Modal show={showCellModal} onHide={() => !saving && setShowCellModal(false)} centered>
          <Modal.Header closeButton><Modal.Title>Valeur de cellule</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form><Form.Group><Form.Label>Valeur</Form.Label><Form.Control value={fCellVal} onChange={e => setFCellVal(e.target.value)} disabled={saving} autoFocus /></Form.Group></Form>
          </Modal.Body>
          <Modal.Footer>
            <Button label="Annuler" variant="outline" onClick={() => setShowCellModal(false)} />
            <Button label={saving ? "…" : "Enregistrer"} onClick={saveCellValue} />
          </Modal.Footer>
        </Modal>
      </>
    );
  };

  export default BacklogProjetModal;