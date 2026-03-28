import React, { useCallback, useEffect, useState } from "react";
import { Modal, Nav, Tab } from "react-bootstrap";
import { FaSpinner } from "react-icons/fa";
import InfoGeneral from "./info-general/InfoGeneral.tsx";
import StructureTab from "../../tabs/StructureTab.tsx";
import EquipeTab from "../../tabs/EquipeTab.tsx";
import BudgetTab from "../../../gestion-lead/backlog/BudgetTab.tsx";
import ChargesAnnexesTab from "../../tabs/ChargesAnnexesTab.tsx";
import { ChargesAnnexesService } from "../../../../../services/projet/backlog/ChargesAnnexesService.tsx";
import PlanningTab from "../../../gestion-lead/backlog/PlanningTab.tsx";
import DetailsQualif from "../../../gestion-lead/details/qualif/DetailsQualif.tsx";
import DetailsOffreTech from "../../../gestion-lead/details/offre-tech/DetailsOffreTech.tsx";
import "./ProjetDetails.css";
import { Projet } from "../../../../../types/projet/Projet.tsx";
import { useAuth } from "../../../../../context/AuthContext.tsx";
import { BacklogProjetService } from "../../../../../services/projet/backlog/BacklogProjetService.tsx";
import { BacklogProjetProfilService } from "../../../../../services/projet/backlog/BacklogProjetProfilService.tsx";
import { BacklogProjetLineProfilService } from "../../../../../services/projet/backlog/BacklogProjetLineService.tsx";
import { BacklogPlanningService } from "../../../../../services/lead/backlog/BacklogPlanningService.tsx";
import { useLeadTechFinDetailsService } from "../../../../../services/lead/tech-fin/LeadTechFinDetailsService.tsx";
import { LeadService } from "../../../../../services/lead/LeadService.tsx";
import { useProjetTechFinDetailsService } from "../../../../../services/projet/tech-fin/ProjetTechFinDetailsService.tsx";
import { useProjetTechnoService } from "../../../../../services/projet/tech-fin/ProjetTechnoService.tsx";
import CalendrierPaiementTab from "../../tabs/CalendrierPaiementTab.tsx";
import { CalendrierPaiementService } from "../../../../../services/projet/paiement/CalendrierPaiementService.tsx";

// ── Composant de comparaison (rendu) ──────────────────────────────────────────
import ComparaisonOpportuniteProjet, {
  LotPlan,
  ProfilBudget,
  CalendrierItem,
} from "../../../ComparaisonOpportuniteProjet.tsx";

import { OngletMargeCommerciale } from "../../OngletMargeCommerciale.tsx";

// ── Service Comparaison (nouveau endpoint agrégé) ─────────────────────────────
import {
  useComparaisonService,
  ComparaisonProjetGlobal,
} from "../../../../../services/projet/comparaison/ComparaisonService.tsx";

// ─────────────────────────────────────────────────────────────────────────────

type ProjetDetailsProps = {
  show: boolean;
  onClose: () => void;
  projet?: Projet | null;
  onPaiementValide?: () => void;
};

const ProjetDetails: React.FC<ProjetDetailsProps> = ({
  show,
  onClose,
  projet,
  onPaiementValide,
}) => {
  const { api } = useAuth();
  const leadTechFinService    = useLeadTechFinDetailsService();
  const projetTechFinService  = useProjetTechFinDetailsService();
  const projetTechnoService   = useProjetTechnoService();
  const comparaisonService    = useComparaisonService();           // ← NOUVEAU

  const [svc] = useState(() => ({
    backlog:        new BacklogProjetService(api),
    profil:         new BacklogProjetProfilService(api),
    lineProfil:     new BacklogProjetLineProfilService(api),
    planning:       new BacklogPlanningService(api),
    lead:           new LeadService(api),
    chargesAnnexes: new ChargesAnnexesService(api),
    calendrier:     new CalendrierPaiementService(api),
  }));

  // ── États communs (backlog, équipe, planning…) ───────────────────────────
  const [loadingData,     setLoadingData]     = useState(false);
  const [budgetRH,        setBudgetRH]        = useState<number>(0);
  const [backlogId,       setBacklogId]       = useState<number | null>(null);
  const [lots,            setLots]            = useState<any[]>([]);
  const [lines,           setLines]           = useState<any[]>([]);
  const [lineProfils,     setLineProfils]     = useState<any[]>([]);
  const [deliverables,    setDeliverables]    = useState<Map<number, any[]>>(new Map());
  const [profils,         setProfils]         = useState<any[]>([]);
  const [deviseAbr,       setDeviseAbr]       = useState<string>("€");
  const [leadData,        setLeadData]        = useState<any | null>(null);
  const [projetTechnos,   setProjetTechnos]   = useState<any[]>([]);
  const [calendrierItems, setCalendrierItems] = useState<CalendrierItem[]>([]);
  const [caEncaisse,      setCaEncaisse]      = useState<number>(0);
  const [chargesTotal,    setChargesTotal]    = useState<number>(0);

  // ── État comparaison (nouveau endpoint agrégé) ───────────────────────────
  const [comparaison,        setComparaison]        = useState<ComparaisonProjetGlobal | null>(null);
  const [loadingComparaison, setLoadingComparaison] = useState(false);
  const [errorComparaison,   setErrorComparaison]   = useState<string | null>(null);

  // ════════════════════════════════════════════════════════════════════════
  // Chargement des données de comparaison
  // Un seul appel GET /api/comparaison/projet/{projetId}
  // remplace toute la logique buildProfils + appels multiples
  // ════════════════════════════════════════════════════════════════════════

  const loadComparaison = useCallback(async () => {
    if (!projet?.idProjet || !projet.lead?.leadId) {
      setComparaison(null);
      return;
    }
    setLoadingComparaison(true);
    setErrorComparaison(null);
    try {
      const data = await comparaisonService.getByProjetId(projet.idProjet);
      setComparaison(data);
    } catch (err: any) {
      setErrorComparaison(
        err?.response?.status === 404
          ? "Ce projet n'a pas de lead associé ou aucun backlog lead n'a été trouvé."
          : err?.message ?? "Erreur lors du chargement de la comparaison."
      );
      setComparaison(null);
    } finally {
      setLoadingComparaison(false);
    }
  }, [projet?.idProjet, projet?.lead?.leadId]);

  // ════════════════════════════════════════════════════════════════════════
  // Conversion du DTO ComparaisonProjetGlobal → props ComparaisonOpportuniteProjet
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Transforme les planningLots du DTO backend en LotPlan[] attendu par le composant.
   * Les lots lead et projet sont issus du même DTO : on distingue par les champs
   * leadLot* et projetLot*.
   */
  function buildLeadLots(data: ComparaisonProjetGlobal): LotPlan[] {
    return (data.planningLots ?? []).map((lot) => ({
      id:        lot.leadLotId ?? lot.lotOrder,
      name:      lot.lotName,
      order:     lot.lotOrder,
      dateDebut: lot.leadLotDateDebut ?? null,
      dateFin:   lot.leadLotDateFin   ?? null,
      phases: (lot.phases ?? []).map((ph) => ({
        id:        ph.leadPhaseId ?? ph.phaseOrder,
        name:      ph.phaseName,
        order:     ph.phaseOrder,
        dateDebut: ph.leadPhaseDateDebut ?? null,
        dateFin:   ph.leadPhaseDateFin   ?? null,
        heures:    null,
      })),
    }));
  }

  function buildProjetLots(data: ComparaisonProjetGlobal): LotPlan[] {
    return (data.planningLots ?? []).map((lot) => ({
      id:        lot.projetLotId ?? lot.lotOrder,
      name:      lot.lotName,
      order:     lot.lotOrder,
      dateDebut: lot.projetLotDateDebut ?? null,
      dateFin:   lot.projetLotDateFin   ?? null,
      phases: (lot.phases ?? []).map((ph) => ({
        id:        ph.projetPhaseId ?? ph.phaseOrder,
        name:      ph.phaseName,
        order:     ph.phaseOrder,
        dateDebut: ph.projetPhaseDateDebut ?? null,
        dateFin:   ph.projetPhaseDateFin   ?? null,
        heures:    null,
      })),
    }));
  }

  /**
   * Transforme detailProfils → ProfilBudget[] (4 niveaux JH).
   *
   * MAPPING PRÉCIS des 4 sources :
   *
   *  volumeOffreCommerciale = jhOffreVendu    → offre tech/fin (JH vendus prorata par profil)
   *                                             Source : lead_tech_fin_details.jh_vendu
   *                                             distribué au prorata du backlog lead par profil
   *
   *  volumeLead             = jhBacklogLead   → backlog lead (proposition équipe tech)
   *                                             Source : Σ backlog_line_profil.volume (backlog lead)
   *
   *  volumeBacklogProjet    = jhBacklogProjet → backlog projet (planification en cours)
   *                                             Source : Σ backlog_line_profil.volume (backlog projet)
   *
   *  volumeProjet           = jhRealise       → réalisé (time_spent, indicatif uniquement)
   *                                             Source : Σ backlog_line_profil.time_spent
   *
   *  budgetBacklogLead      = budget lead     → JH lead × TJM = base facturation CA
   *
   * ONGLET COMPARAISON (ComparaisonOpportuniteProjet) :
   *   - "JH offre"   affiché = volumeOffreCommerciale (offre tech/fin prorata)
   *   - "JH lead"    affiché = volumeLead             (backlog lead)
   *   - "JH planifié"        = volumeBacklogProjet    (backlog projet)
   *   - "JH réalisé"         = volumeProjet           (time_spent)
   *
   * ONGLET MARGE COMMERCIALE (OngletMargeCommerciale) :
   *   - Compare jhOffreVendu (offre tech) vs jhBacklogLead (prop. tech)
   *   → depuis comparaison.detailProfils directement (pas de conversion nécessaire)
   */
  function buildProfils(data: ComparaisonProjetGlobal): ProfilBudget[] {
    return (data.detailProfils ?? []).map((p) => ({
      id:                    p.backlogProfilId,
      name:                  p.profilName,
      tjm:                   p.tjm,
      // Niveau 1 : offre tech/fin prorata → "JH offre" dans le composant
      volumeOffreCommerciale: p.jhOffreVendu,
      // Niveau 2 : backlog lead (proposition équipe tech) → "JH backlog lead"
      volumeLead:             p.jhBacklogLead,
      // Niveau 3 : backlog projet (planifié en exécution) → "JH planifié"
      volumeBacklogProjet:    p.jhBacklogProjet,
      // Niveau 4 : réalisé (time_spent, indicatif) → "JH réalisé"
      volumeProjet:           p.jhRealise,
      // Budget backlog lead = base facturation CA (JH lead × TJM)
      budgetBacklogLead:      p.budgetBacklogLead,
    }));
  }

  // ════════════════════════════════════════════════════════════════════════
  // Chargement technos (indépendant du backlog, seulement pour projets sans lead)
  // ════════════════════════════════════════════════════════════════════════

  const loadTechnos = useCallback(async () => {
    if (!projet?.idProjet || projet.lead?.leadId) {
      setProjetTechnos([]);
      return;
    }
    try {
      const details = await projetTechFinService.getByProjetId(projet.idProjet);
      if (details?.idProjetTechFinDetails) {
        const technos = await projetTechnoService.getByDetailsId(details.idProjetTechFinDetails);
        setProjetTechnos(technos ?? []);
      } else {
        setProjetTechnos([]);
      }
    } catch {
      setProjetTechnos([]);
    }
  }, [projet?.idProjet, projet?.lead?.leadId]);

  // ════════════════════════════════════════════════════════════════════════
  // Chargement du backlog + lead (pour les onglets Structure, Équipe, Budget…)
  // INCHANGÉ : ces onglets continuent à utiliser leurs propres états
  // ════════════════════════════════════════════════════════════════════════

  const loadBacklogData = useCallback(async () => {
    if (!projet?.idProjet) return;
    setLoadingData(true);
    try {
      // ── Lead / devise ──
      if (projet.lead?.leadId) {
        try {
          const [techFin, fullLead] = await Promise.all([
            leadTechFinService.getByLeadId(projet.lead.leadId),
            svc.lead.getById(projet.lead.leadId),
          ]);
          setDeviseAbr(techFin?.devise?.abrDevise ?? techFin?.devise?.nomDevise ?? "€");
          setLeadData(fullLead ? { ...fullLead, techFinDetails: techFin ?? null } : null);
        } catch {
          setDeviseAbr("€");
          setLeadData(null);
        }
      } else {
        setDeviseAbr("€");
        setLeadData(null);
      }

      // ── Backlog PROJET ──
      const header = await svc.backlog.getHeaderByProjetId(projet.idProjet);
      if (!header?.id) return;
      setBacklogId(header.id);

      const full = await svc.backlog.getFullById(header.id);
      if (!full) return;

      const sortedLots = (full.lots ?? []).slice().sort((a: any, b: any) => a.order - b.order);
      setLots(sortedLots);
      setLines((full.lines ?? []).slice().sort((a: any, b: any) => a.order - b.order));

      const rawProfils: any[] = full.profilsProjet ?? full.profils ?? [];
      setProfils(
        rawProfils
          .slice()
          .sort((a: any, b: any) => a.order - b.order)
          .map((p: any) => ({ ...p, collaborateurs: p.collaborateurs ?? [] }))
      );

      // lineProfils projet : volume = JH planifié, timeSpent = JH réalisé
      try {
        const lps = await svc.lineProfil.getAllByBacklogId(header.id);
        setLineProfils(Array.isArray(lps) ? lps : []);
      } catch {
        setLineProfils([]);
      }

      // Livrables
      const dlvMap = new Map<number, any[]>();
      sortedLots.forEach((lot: any) => {
        (lot.phases ?? []).forEach((phase: any) => {
          const phaseDelivs: any[] = phase.deliverables ?? [];
          const sprintDelivs: any[] = (phase.sprints ?? []).flatMap((s: any) =>
            (s.deliverables ?? []).map((d: any) => ({ ...d, sprintId: d.sprintId ?? s.id }))
          );
          const all = [...phaseDelivs, ...sprintDelivs].filter(
            (d, i, arr) => arr.findIndex((x) => x.id === d.id) === i
          );
          dlvMap.set(phase.id, all.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)));
        });
      });
      setDeliverables(dlvMap);

      // ── Calendrier paiements + CA encaissé + charges annexes ──
      try {
        const [calRes, totauxRes, chRes] = await Promise.all([
          svc.calendrier.getByBacklogId(header.id).catch(() => []),
          svc.calendrier.getTotaux(header.id).catch(() => ({})),
          svc.chargesAnnexes.getTotalByBacklogId(header.id).catch(() => 0),
        ]);
        setCalendrierItems(
          (calRes as any[]).map((c: any) => ({
            id:            c.id,
            libelle:       c.libelle,
            montantAPayer: Number(c.montantAPayer ?? 0),
            statut:        c.statut,
            datePaiement:  c.datePaiement,
            typeReference: c.typeReference,
          }))
        );
        setCaEncaisse(Number((totauxRes as any).caProjet ?? 0));
        setChargesTotal(Number(chRes ?? 0));
      } catch {
        setCalendrierItems([]);
        setCaEncaisse(0);
        setChargesTotal(0);
      }
    } catch (err) {
      console.error("Erreur chargement backlog projet details:", err);
    } finally {
      setLoadingData(false);
    }
  }, [projet?.idProjet, projet?.lead?.leadId, api]);

  // ── Refresh calendrier après paiement validé ─────────────────────────────
  const refreshCalendrier = useCallback(async () => {
    if (!backlogId) return;
    try {
      const [calRes, totauxRes] = await Promise.all([
        svc.calendrier.getByBacklogId(backlogId).catch(() => []),
        svc.calendrier.getTotaux(backlogId).catch(() => ({})),
      ]);
      setCalendrierItems(
        (calRes as any[]).map((c: any) => ({
          id:            c.id,
          libelle:       c.libelle,
          montantAPayer: Number(c.montantAPayer ?? 0),
          statut:        c.statut,
          datePaiement:  c.datePaiement,
          typeReference: c.typeReference,
        }))
      );
      setCaEncaisse(Number((totauxRes as any).caProjet ?? 0));
      // Recharger aussi la comparaison (le CA encaissé a changé)
      loadComparaison();
    } catch {
      /* silencieux */
    }
    onPaiementValide?.();
  }, [backlogId, svc.calendrier, onPaiementValide, loadComparaison]);

  // ── Reset + déclenchement ────────────────────────────────────────────────
  useEffect(() => {
    if (!show || !projet) return;

    // Reset tous les états
    setBacklogId(null);
    setLots([]);
    setLines([]);
    setLineProfils([]);
    setDeliverables(new Map());
    setProfils([]);
    setLeadData(null);
    setProjetTechnos([]);
    setCalendrierItems([]);
    setCaEncaisse(0);
    setChargesTotal(0);
    setComparaison(null);
    setErrorComparaison(null);

    // Chargements parallèles et indépendants
    loadTechnos();
    loadBacklogData();
    loadComparaison();   // ← NOUVEAU : un seul appel pour tout l'onglet comparaison
  }, [show, projet?.idProjet]);

  if (!projet) return null;

  const leadId = projet.lead?.leadId ?? null;

  // ── Données construites depuis comparaison (pour le rendu) ───────────────
  const leadLots    = comparaison ? buildLeadLots(comparaison)  : [];
  const projetLots  = comparaison ? buildProjetLots(comparaison) : [];
  const profilsComp = comparaison ? buildProfils(comparaison)   : [];

  // ─────────────────────────────────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Modal show={show} onHide={onClose} fullscreen className="details-lead-modal">
      <Modal.Header closeButton>
        <div className="details-lead-header-content">
          <div>
            <Modal.Title style={{ color: "white" }}>
              {projet.nomProjet || "Projet sans nom"}
            </Modal.Title>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>
              {projet.refBC || "---"}
              {leadId && (
                <span
                  className="ms-3"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: "0.75rem",
                  }}
                >
                  Lead associé
                </span>
              )}
            </p>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="details-lead-body">
        <Tab.Container defaultActiveKey="infoGeneral">
          <Nav variant="pills" className="details-lead-tabs mb-4">
            <Nav.Item>
              <Nav.Link eventKey="infoGeneral">Informations générales</Nav.Link>
            </Nav.Item>
            {leadData && (
              <>
                <Nav.Item>
                  <Nav.Link eventKey="qualification">Qualification</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="offre">Offre technique &amp; financière</Nav.Link>
                </Nav.Item>
              </>
            )}
            <Nav.Item><Nav.Link eventKey="structure">Lots / Phases / Sprints</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="equipe">Équipe</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="planning">Planning</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="budget">Budget</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="charges_annexes">Charges Annexes</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="paiements">Paiements</Nav.Link></Nav.Item>
            {leadData && (
              <>
                {/* Onglet comparaison globale (planning + budget + CA) */}
                <Nav.Item>
                  <Nav.Link eventKey="comparaison">Comparaison</Nav.Link>
                </Nav.Item>
              </>
            )}
          </Nav>

          <Tab.Content>
            {/* ── Informations générales ── */}
            <Tab.Pane eventKey="infoGeneral">
              <div className="details-section">
                <InfoGeneral projet={projet} technos={!leadId ? projetTechnos : undefined} />
              </div>
            </Tab.Pane>

            {/* ── Lead : qualification + offre ── */}
            {leadData && (
              <>
                <Tab.Pane eventKey="qualification">
                  <DetailsQualif lead={leadData} />
                </Tab.Pane>
                <Tab.Pane eventKey="offre">
                  <DetailsOffreTech lead={leadData} />
                </Tab.Pane>
              </>
            )}

            {/* ── Structure ── */}
            <Tab.Pane eventKey="structure">
              <div className="details-section details-section--full">
                {loadingData
                  ? <SpinnerTab />
                  : <StructureTab lots={lots} />}
              </div>
            </Tab.Pane>

            {/* ── Équipe ── */}
            <Tab.Pane eventKey="equipe">
              <div className="details-section details-section--full">
                {loadingData
                  ? <SpinnerTab />
                  : <EquipeTab profils={profils} deviseAbr={deviseAbr} />}
              </div>
            </Tab.Pane>

            {/* ── Planning ── */}
            <Tab.Pane eventKey="planning">
              <div className="details-section details-section--full">
                {loadingData
                  ? <SpinnerTab />
                  : (
                    <PlanningTab
                      lots={lots}
                      lines={lines}
                      lineProfils={lineProfils}
                      deliverables={deliverables}
                      selectedBacklogId={backlogId}
                      planningService={svc.planning}
                      projectStartDate={projet.dateDebutPrevu ?? null}
                      api={api}
                    />
                  )}
              </div>
            </Tab.Pane>

            {/* ── Budget ── */}
            <Tab.Pane eventKey="budget">
              <div className="details-section details-section--full">
                {loadingData
                  ? <SpinnerTab />
                  : (
                    <BudgetTab
                      lots={lots}
                      profils={profils}
                      lines={lines}
                      lineProfils={lineProfils}
                      selectedBacklogId={backlogId}
                      leadId={leadId}
                      deviseAbr={deviseAbr}
                      onTotalChange={setBudgetRH}
                    />
                  )}
              </div>
            </Tab.Pane>

            {/* ── Charges annexes ── */}
            <Tab.Pane eventKey="charges_annexes">
              <div className="details-section details-section--full">
                {loadingData
                  ? <SpinnerTab />
                  : (
                    <ChargesAnnexesTab
                      backlogId={backlogId}
                      deviseAbr={deviseAbr}
                      budgetRH={budgetRH}
                      service={svc.chargesAnnexes}
                    />
                  )}
              </div>
            </Tab.Pane>

            {/* ── Paiements client ── */}
            <Tab.Pane eventKey="paiements">
              <div className="details-section details-section--full">
                <CalendrierPaiementTab
                  backlogId={backlogId}
                  lots={lots}
                  sprints={buildSprintsMap(lots)}
                  deliverables={deliverables}
                  deviseAbr={deviseAbr}
                  montantOffre={leadData?.techFinDetails?.montantOffre ?? 0}
                  service={svc.calendrier}
                  onPaiementValide={refreshCalendrier}
                />
              </div>
            </Tab.Pane>

            {/* ══════════════════════════════════════════════════════════════
                ONGLET MARGE COMMERCIALE
                Offre tech/fin (lead_tech_fin_details) vs backlog lead
                Alimenté par GET /api/comparaison/projet/{id}
            ══════════════════════════════════════════════════════════════ */}
            {leadData && (
              <Tab.Pane eventKey="marge_comm">
                <div className="details-section details-section--full">
                  {loadingComparaison ? (
                    <SpinnerTab label="Chargement de la marge commerciale…" />
                  ) : errorComparaison ? (
                    <ErrorTab message={errorComparaison} onRetry={loadComparaison} />
                  ) : comparaison ? (
                    <OngletMargeCommerciale
                      detailProfils={comparaison.detailProfils}
                      offreMontantTotal={comparaison.offreMontantTotal}
                      montantBacklogLead={comparaison.montantBacklogLead}
                      montantBacklogProjet={comparaison.montantBacklogProjet}
                      margeCommercialeMontant={comparaison.margeCommercialeMontant}
                      deviseAbr={comparaison.deviseAbr ?? deviseAbr}
                    />
                  ) : (
                    <EmptyTab message="Aucune donnée de comparaison disponible." />
                  )}
                </div>
              </Tab.Pane>
            )}

            {/* ══════════════════════════════════════════════════════════════
                ONGLET COMPARAISON GLOBALE
                Planning Gantt + Budget + CA & Marge
                Alimenté par GET /api/comparaison/projet/{id}
                (même appel que Marge Commerciale — données déjà chargées)
            ══════════════════════════════════════════════════════════════ */}
            {leadData && (
              <Tab.Pane eventKey="comparaison">
                <div className="details-section details-section--full">
                  {loadingComparaison ? (
                    <SpinnerTab label="Chargement de la comparaison…" />
                  ) : errorComparaison ? (
                    <ErrorTab message={errorComparaison} onRetry={loadComparaison} />
                  ) : comparaison ? (
                    <ComparaisonOpportuniteProjet
                      // ── Planning Gantt comparé ──────────────────────────────
                      // Construit depuis comparaison.planningLots (backend)
                      leadLots={leadLots}
                      leadDateDebut={comparaison.projetDateDebutPrevu ?? projet.dateDebutPrevu ?? null}
                      leadDateFin={
                        leadData?.leadRealDeadLine
                          ? String(leadData.leadRealDeadLine).split("T")[0]
                          : projet.dateFinPrevu ?? null
                      }
                      projetLots={projetLots}
                      projetDateDebut={comparaison.projetDateDebutPrevu ?? projet.dateDebutPrevu ?? null}
                      projetDateFin={comparaison.projetDateFinPrevu   ?? projet.dateFinPrevu   ?? null}

                      // ── Profils — 3 niveaux JH ──────────────────────────────
                      // volumeLead         = jhBacklogLead    (backlog lead = prop. tech)
                      // volumeBacklogProjet= jhBacklogProjet  (backlog projet = planifié)
                      // volumeProjet       = jhRealise        (time_spent, indicatif)
                      profils={profilsComp}

                      // ── Budget offre (montant signé) ─────────────────────────
                      // montantOffreLead = lead_tech_fin_details.montant (offre commerciale)
                      montantOffreLead={comparaison.offreMontantTotal}

                      // ── CA & paiements ──────────────────────────────────────
                      // caEncaisse    : depuis le DTO (projet_ca_encaisse)
                      // calendrier    : rechargé localement (gestion des paiements temps réel)
                      // chargesAnnexes: depuis le DTO agrégé
                      deviseAbr={comparaison.deviseAbr ?? deviseAbr}
                      calendrier={calendrierItems}
                      caEncaisse={comparaison.caEncaisse}
                      chargesAnnexes={comparaison.totalChargesAnnexes}

                      // ── Props Marge Commerciale (nouvel onglet interne) ──────
                      // Transmis au composant pour activer l'onglet "Marge Commerciale"
                      // si le composant implémente l'onglet en interne
                      detailProfils={comparaison.detailProfils}
                      montantBacklogLead={comparaison.montantBacklogLead}
                      montantBacklogProjet={comparaison.montantBacklogProjet}
                      margeCommercialeMontant={comparaison.margeCommercialeMontant}
                    />
                  ) : (
                    <EmptyTab message="Aucune donnée de comparaison disponible." />
                  )}
                </div>
              </Tab.Pane>
            )}
          </Tab.Content>
        </Tab.Container>
      </Modal.Body>
    </Modal>
  );
};

export default ProjetDetails;

// ─────────────────────────────────────────────────────────────────────────────
// Petits composants utilitaires
// ─────────────────────────────────────────────────────────────────────────────

const SpinnerTab: React.FC<{ label?: string }> = ({
  label = "Chargement...",
}) => (
  <div className="details-tab-loading">
    <FaSpinner className="fa-spin me-2" /> {label}
  </div>
);

const ErrorTab: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div
    className="alert alert-danger py-3 px-4"
    style={{ fontSize: 13, margin: "16px 0" }}
  >
    <strong>Erreur :</strong> {message}
    {onRetry && (
      <button
        className="btn btn-sm btn-outline-danger ms-3"
        onClick={onRetry}
      >
        Réessayer
      </button>
    )}
  </div>
);

const EmptyTab: React.FC<{ message: string }> = ({ message }) => (
  <div
    style={{
      textAlign: "center",
      padding: "60px 0",
      color: "#5F6F6E",
      fontSize: 13,
      fontStyle: "italic",
    }}
  >
    {message}
  </div>
);

/** Construit la Map sprints par phaseId pour CalendrierPaiementTab */
function buildSprintsMap(lots: any[]): Map<number, any[]> {
  const m = new Map<number, any[]>();
  lots.forEach((l: any) =>
    (l.phases ?? []).forEach((p: any) =>
      (p.sprints ?? []).forEach((s: any) => {
        if (!m.has(p.id)) m.set(p.id, []);
        m.get(p.id)!.push(s);
      })
    )
  );
  return m;
}