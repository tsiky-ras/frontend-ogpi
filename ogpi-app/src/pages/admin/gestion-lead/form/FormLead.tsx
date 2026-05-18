import React, { useEffect, useState, useRef } from "react";
import { Modal, Button, Nav, Tab } from "react-bootstrap";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { useSearchParams, useNavigate } from "react-router-dom"; // Ajouter useNavigate

import FormQualif from "./qualification/FormQualif.tsx";
import FormTechFin from "./technique-financiere/FormTechFin.tsx";
import "./FormLead.css";
import FormJira from "./Jira/FormJira.tsx";
import FormProjetInline from "../../gestion-projet/form/FormProjetInline.tsx";

import { BusinessUnitService } from "../../../../services/profil/poste/BusinessUnitService.tsx";
import { LeadTypeService } from "../../../../services/lead/LeadTypeService.tsx";
import { LeadCategoryService } from "../../../../services/lead/LeadCategoryService.tsx";
import { LeadSecteurService } from "../../../../services/lead/LeadSecteurService.tsx";
import { LeadStatusService } from "../../../../services/lead/LeadStatusService.tsx";
import { TypeProjetFinancementService } from "../../../../services/lead/TypeProjetFinancementService.tsx";
import { ClientService } from "../../../../services/lead/ClientService.tsx";
import { PartenaireService } from "../../../../services/lead/PartenaireService.tsx";
import { LeadService } from "../../../../services/lead/LeadService.tsx";
import { useDeviseService } from "../../../../services/lead/tech-fin/DeviseService.tsx";
import { useTechnoService } from "../../../../services/lead/tech-fin/TechnoService.tsx";
import { useTypeFacturationService } from "../../../../services/lead/tech-fin/TypeFacturationService.tsx";
import { useLeadTechFinDetailsService } from "../../../../services/lead/tech-fin/LeadTechFinDetailsService.tsx";
import { UserDisplayService } from "../../../../services/user/UserDisplayService.tsx";
import FormProcessHistory from "./process/FormProcessHistory.tsx";
import { LeadProcessHistoryService } from "../../../../services/lead/LeadProcessHistoryService.tsx";

type FeedbackPopupProps = {
  type: "success" | "error" | "loading";
  message: string;
  onClose?: () => void;
};

const FeedbackPopup: React.FC<FeedbackPopupProps> = ({ type, message, onClose }) => {
  const colors = {
    success: { bg: "#d4edda", border: "#28a745", text: "#155724", icon: "✓" },
    error: { bg: "#f8d7da", border: "#dc3545", text: "#721c24", icon: "✕" },
    loading: { bg: "#d1ecf1", border: "#17a2b8", text: "#0c5460", icon: "⟳" },
  };
  const c = colors[type];

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: c.bg,
          border: `2px solid ${c.border}`,
          borderRadius: 14,
          padding: "32px 40px",
          minWidth: 320,
          maxWidth: 480,
          position: "relative",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          textAlign: "center",
        }}
      >
        {type !== "loading" && onClose && (
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 10,
              right: 14,
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: c.text,
              lineHeight: 1,
              padding: 0,
            }}
            aria-label="Fermer"
          >
            ✕
          </button>
        )}
        <div
          style={{
            fontSize: 36,
            color: c.border,
            marginBottom: 12,
            animation: type === "loading" ? "spin 1s linear infinite" : "none",
            display: "inline-block",
          }}
        >
          {c.icon}
        </div>
        <p style={{ color: c.text, fontSize: 16, fontWeight: 600, margin: 0 }}>
          {message}
        </p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

type FormLeadProps = {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  lead?: any | null;
  initialTab?: string;
};

const FormLead: React.FC<FormLeadProps> = ({ show, onClose, onSubmit, lead, initialTab }) => {
  const { api } = useAuth();
  const navigate = useNavigate(); // Ajout pour la navigation
  const [searchParams, setSearchParams] = useSearchParams(); // Remplacer par setSearchParams
  
  const leadService = new LeadService(api);
  const userDisplayService = new UserDisplayService(api);
  const deviseService = useDeviseService();
  const technoService = useTechnoService();
  const typeFacturationService = useTypeFacturationService();
  const leadTechFinService = useLeadTechFinDetailsService();
  const processHistoryService = new LeadProcessHistoryService(api);
  
  // Récupérer le step depuis l'URL ou utiliser initialTab ou qualification par défaut
  const [currentStep, setCurrentStep] = useState<string>(
    searchParams.get("step") || initialTab || "qualification"
  );
  
  const [form, setForm] = useState<any>({
    periode: "", businessUnit: "", description: "", nom: "",
    reference: "", typeOpportunite: "", categorie: "", secteur: "",
    statut: "1", typeFinancement: "",
  });

  const [formTechFin, setFormTechFin] = useState<any>({
    technos: [], volumeJHVendu: 0, deviseId: "", tauxDeChange: 1,
    typeFacturationId: "", impots: 0, dateAttribution: "", budget: 0,
    montantOffre: 0, montantChargeAnnexe: 0, montantAvecChargeAnnexe: 0,
  });

  const jiraDataRef = useRef<any>(null);

  const [businessUnits, setBusinessUnits] = useState<any[]>([]);
  const [typeOpportunites, setTypeOpportunites] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [secteurs, setSecteurs] = useState<any[]>([]);
  const [statuts, setStatuts] = useState<any[]>([]);
  const [typeFinancements, setTypeFinancements] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [partenaires, setPartenaires] = useState<any[]>([]);
  const [devises, setDevises] = useState<any[]>([]);
  const [typeFacturations, setTypeFacturations] = useState<any[]>([]);
  const [technos, setTechnos] = useState<any[]>([]);

  const [popup, setPopup] = useState<{ type: "success" | "error" | "loading"; message: string } | null>(null);

  const closePopup = () => setPopup(null);

  // Fonction pour changer d'onglet et mettre à jour l'URL
  const handleTabChange = (tabKey: string | null) => {
    if (!tabKey) return;
    
    // Vérifier si l'onglet est accessible
    if (isNoGo && !initialTab && tabKey !== "qualification") return;
    
    setCurrentStep(tabKey);
    
    // Mettre à jour l'URL avec le nouveau step
    const newParams = new URLSearchParams(searchParams);
    newParams.set("step", tabKey);
    setSearchParams(newParams, { replace: true });
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const mapLeadToForm = (lead: any) => {
    const partenairesArray = lead.leadPartenaires?.map((lp: any) => lp.partenaire) || [];
    return {
      periode: lead.leadPeriode?.substring(0, 7) || "",
      nom: lead.leadName || "",
      reference: lead.leadRef || "",
      description: lead.leadDescription || "",
      commentaire: lead.leadCommentaire || "",
      zone: lead.leadZone ?? "",
      businessUnit: lead.businessUnit?.id || "",
      typeOpportunite: lead.leadType?.id || "",
      categorie: lead.category?.id || "",
      secteur: lead.leadSecteur?.id || "",
      statut: lead.currentLeadStatus?.leadStatus?.id || "1",
      client: lead.client || null,
      partenaires: partenairesArray,
      typeFinancement: lead.typeProjetFinancement || null,
      realDeadline: lead.leadRealDeadLine ? lead.leadRealDeadLine.substring(0, 16) : "",
      internalDeadline: lead.leadInternalDeadLine ? lead.leadInternalDeadLine.substring(0, 16) : "",
      driveFolderName: lead.driveFolder?.name || "",
      driveFolderLink: lead.driveFolder?.link || "",
      mainDriveFileName: lead.mainDriveFile?.name || "",
      mainDriveFileLink: lead.mainDriveFile?.link || "",
      mainDriveFileDescription: lead.mainDriveFile?.description || "",
    };
  };

  const extractTechnosIds = (techFinData: any): number[] => {
    if (!Array.isArray(techFinData.technos)) return [];
    return techFinData.technos
      .map((item: any) => {
        if (item?.techno?.idTechno) return Number(item.techno.idTechno);
        if (item?.idTechno) return Number(item.idTechno);
        if (item?.id) return Number(item.id);
        if (typeof item === "number") return item;
        return null;
      })
      .filter((id: any) => id !== null && !isNaN(id));
  };

  useEffect(() => {
    if (!show) return;

    const fetchAll = async () => {
      try {
        const [
          bu, types, cats, sects, stats, typeFin, clts, parts,
          devs, factTypes, techList,
        ] = await Promise.all([
          new BusinessUnitService(api).getAll(),
          new LeadTypeService(api).getAll(),
          new LeadCategoryService(api).getAll(),
          new LeadSecteurService(api).getAll(),
          new LeadStatusService(api).getAll(),
          new TypeProjetFinancementService(api).getAll(),
          new ClientService(api).getAll(),
          new PartenaireService(api).getAll(),
          deviseService.getAll(),
          typeFacturationService.getAll(),
          technoService.getAll(),
        ]);

        setBusinessUnits(bu);
        setTypeOpportunites(types);
        setCategories(cats);
        setSecteurs(sects);
        setStatuts(stats);
        setTypeFinancements(typeFin);
        setClients(clts);
        setPartenaires(parts);
        setDevises(devs);
        setTypeFacturations(factTypes);
        setTechnos(techList);

        if (lead) {
          const currentLeadId = lead?.leadId || lead?.id;
          setForm(mapLeadToForm(lead));

          let techFinData: any = null;

          try {
            techFinData = await leadTechFinService.getByLeadId(currentLeadId);
          } catch (err) {
            console.warn("TechFin non trouvé, fallback sur lead brut :", err);
          }

          if (techFinData) {
            setFormTechFin({
              technos: extractTechnosIds(techFinData),
              volumeJHVendu: techFinData.volumeJHVendu || 0,
              deviseId: techFinData.devise?.idDevise || "",
              tauxDeChange: techFinData.tauxDeChange || 1,
              typeFacturationId: techFinData.typeFacturation?.idTypeFacturation || "",
              impots: techFinData.impots || 0,
              dateAttribution: techFinData.dateAttribution
                ? techFinData.dateAttribution.substring(0, 10)
                : "",
              budget: techFinData.montantOffre || techFinData.budget || 0,
              montantOffre: techFinData.montantOffre || techFinData.budget || 0,
              montantChargeAnnexe: techFinData.montantChargeAnnexe || 0,
              montantAvecChargeAnnexe: techFinData.montantAvecChargeAnnexe || 0,
            });
          }

          // Récupérer le step depuis l'URL ou initialTab
          const urlStep = searchParams.get("step");
          const targetStep = urlStep || initialTab || "qualification";
          setCurrentStep(targetStep);
        } else {
          setForm({
            periode: "", businessUnit: "", description: "", nom: "",
            reference: "", typeOpportunite: "", categorie: "", secteur: "",
            statut: "1", typeFinancement: "", realDeadline: "",
            internalDeadline: "", commentaire: "", zone: "", client: null,
            partenaires: [], driveFolderName: "", driveFolderLink: "",
            mainDriveFileName: "", mainDriveFileLink: "", mainDriveFileDescription: "",
          });
          setFormTechFin({
            technos: [], volumeJHVendu: 0, deviseId: "", tauxDeChange: 1,
            typeFacturationId: "", impots: 0, dateAttribution: "", budget: 0,
            montantOffre: 0, montantChargeAnnexe: 0, montantAvecChargeAnnexe: 0,
          });
          
          // Réinitialiser le step à qualification pour un nouveau lead
          const urlStep = searchParams.get("step");
          setCurrentStep(urlStep === "offre" || urlStep === "etapes" || urlStep === "historique" 
            ? "qualification" 
            : urlStep || "qualification");
          jiraDataRef.current = null;
        }
      } catch (err) {
        console.error("Erreur chargement données FormLead :", err);
      }
    };

    fetchAll();
  }, [show, lead, initialTab, searchParams]);

  const isNoGo = lead?.currentLeadStatus?.leadStatus?.id < 3;

  const formatLeadPayload = (form: any) => {
    const nowIso = new Date().toISOString();
    const periodeDate = form.periode ? `${form.periode}-01` : null;
    const leadPartenairesFormatted = (form.partenaires || []).map((p: any) => ({
      partenaire: { id: p.id },
    }));
    return {
      leadPeriode: periodeDate,
      leadDescription: form.description,
      leadName: form.nom,
      leadRef: form.reference,
      leadRealDeadLine: form.realDeadline || null,
      leadInternalDeadLine: form.internalDeadline || null,
      leadCommentaire: form.commentaire || "",
      leadZone: form.zone !== undefined ? Number(form.zone) : null,
      client: form.client ? { id: form.client.id } : null,
      category: form.categorie ? { id: form.categorie } : null,
      leadType: form.typeOpportunite ? { id: form.typeOpportunite } : null,
      leadSecteur: form.secteur ? { id: form.secteur } : null,
      businessUnit: form.businessUnit ? { id: form.businessUnit } : null,
      leadPartenaires: leadPartenairesFormatted,
      leadStatusHistories: [
        { dateUpdated: nowIso, leadStatus: form.statut ? { id: form.statut } : { id: 1 } },
      ],
      typeProjetFinancement: form.typeFinancement ? { id: form.typeFinancement.id } : null,
      driveFolder: form.driveFolderName
        ? { name: form.driveFolderName, link: form.driveFolderLink || "" }
        : null,
      mainDriveFile: form.mainDriveFileName
        ? {
            name: form.mainDriveFileName,
            link: form.mainDriveFileLink || "",
            description: form.mainDriveFileDescription || "",
          }
        : null,
    };
  };

  const handleSave = async () => {
    if (currentStep === "projet") return;

    setPopup({ type: "loading", message: "Sauvegarde en cours..." });

    try {
      const currentLeadId = lead?.leadId || lead?.id;

      if (currentStep === "qualification") {
        const qualifData = formatLeadPayload(form);
        let savedLead: any;

        if (lead && currentLeadId) {
          savedLead = await leadService.updateQualif(currentLeadId, qualifData);
        } else {
          savedLead = await leadService.createQualif(qualifData);
        }

        onSubmit(savedLead);
        setPopup({ type: "success", message: "Qualification sauvegardée avec succès !" });
        
        // Après sauvegarde, rediriger vers l'onglet offre si demandé
        const nextStep = searchParams.get("nextStep");
        if (nextStep === "offre" && savedLead) {
          setTimeout(() => {
            handleTabChange("offre");
          }, 1500);
        }
        return;
      }

      if (currentStep === "offre") {
        if (!currentLeadId) throw new Error("Veuillez d'abord sauvegarder la qualification.");
        if (!formTechFin.deviseId || !formTechFin.typeFacturationId)
          throw new Error("Veuillez compléter la devise et le type de facturation.");

        const existingTechFin = await leadTechFinService.getByLeadId(currentLeadId);
        const techFinId = existingTechFin?.idLeadTechFinDetails;
        const technosFormatted = (formTechFin.technos || []).map((technoId: number) => ({
          techno: { idTechno: technoId },
        }));

        const techFinPayload = {
          idLeadTechFinDetails: techFinId,
          idLead: currentLeadId,
          budget: formTechFin.budget || 0,
          volumeJHVendu: formTechFin.volumeJHVendu || 0,
          tauxDeChange: formTechFin.tauxDeChange || 1,
          impots: formTechFin.impots || 0,
          dateAttribution: formTechFin.dateAttribution || null,
          montantOffre: formTechFin.budget || 0,
          technos: technosFormatted,
          lead: { leadId: currentLeadId },
          devise: { idDevise: Number(formTechFin.deviseId) },
          typeFacturation: { idTypeFacturation: Number(formTechFin.typeFacturationId) },
        };

        await leadTechFinService.update(techFinPayload);
        setPopup({ type: "success", message: "Offre technique & financière sauvegardée avec succès !" });
        return;
      }

      if (currentStep === "etapes") {
        if (!currentLeadId) throw new Error("ID du lead manquant.");

        const jiraData = jiraDataRef.current;
        if (!jiraData) throw new Error("Aucune donnée à sauvegarder.");

        await leadService.updateJira(currentLeadId, jiraData);
        setPopup({ type: "success", message: "Étapes & validations mis à jour avec succès !" });
        return;
      }
    } catch (err) {
      console.error("=== ERREUR handleSave ===", err);
      setPopup({
        type: "error",
        message: err instanceof Error ? err.message : "Erreur inconnue lors de la sauvegarde.",
      });
    }
  };

  // Mapping des clés d'onglet vers les libellés
  const tabLabels: Record<string, string> = {
    qualification: "Qualification",
    offre: "Offre technique & financière",
    etapes: "Étapes & validations",
    historique: "Historique de traitement"
  };

  return (
    <>
      <Modal show={show} onHide={onClose} fullscreen centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            {lead
              ? `Modification : ${lead.leadName} - ${lead.leadRef}`
              : "Créer une nouvelle opportunité"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Tab.Container
            activeKey={currentStep}
            onSelect={handleTabChange}
          >
            <Nav variant="pills" className="mb-4 form-lead-tabs">
              <Nav.Item>
                <Nav.Link eventKey="qualification">
                  {tabLabels.qualification}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="offre" disabled={!lead}>
                  {tabLabels.offre}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="etapes" disabled={!lead}>
                  {tabLabels.etapes}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="historique" disabled={!lead}>
                  {tabLabels.historique}
                </Nav.Link>
              </Nav.Item>
            </Nav>

            <Tab.Content>
              <Tab.Pane eventKey="qualification">
                <FormQualif
                  form={form}
                  setForm={setForm}
                  handleChange={handleChange}
                  businessUnits={businessUnits}
                  typeOpportunites={typeOpportunites}
                  categories={categories}
                  secteurs={secteurs}
                  statuts={statuts}
                  typeFinancements={typeFinancements}
                  clients={clients}
                  clientService={new ClientService(api)}
                  partenaires={partenaires}
                  partenaireService={new PartenaireService(api)}
                />
              </Tab.Pane>

              <Tab.Pane eventKey="offre">
                {!lead ? (
                  <p className="text-warning">
                    Vous devez d'abord créer la qualification avant de remplir l'offre technique & financière.
                  </p>
                ) : isNoGo && !initialTab ? (
                  <p className="text-danger">
                    Impossible de modifier cet onglet pour un lead No Go.
                  </p>
                ) : (
                  <FormTechFin
                    form={formTechFin}
                    setForm={setFormTechFin}
                    devises={devises}
                    typeFacturations={typeFacturations}
                    technos={technos}
                    technoService={technoService}
                    deviseService={deviseService}
                    typeFacturationService={typeFacturationService}
                  />
                )}
              </Tab.Pane>

              <Tab.Pane eventKey="etapes">
                {!lead ? (
                  <p className="text-warning">Sauvegardez d'abord le lead.</p>
                ) : isNoGo && !initialTab ? (
                  <p className="text-danger">Impossible pour un lead No Go.</p>
                ) : (
                  <FormJira
                    lead={lead}
                    leadService={leadService}
                    userService={userDisplayService}
                    onDataReady={(data) => { jiraDataRef.current = data; }}
                  />
                )}
              </Tab.Pane>

              <Tab.Pane eventKey="projet">
                {!lead ? (
                  <p className="text-warning">Sauvegardez d'abord le lead pour créer un projet.</p>
                ) : isNoGo ? (
                  <p className="text-danger">Impossible de créer un projet pour un lead No Go.</p>
                ) : (
                  <FormProjetInline
                    lead={lead}
                    onSuccess={(projet) => {
                      setPopup({ type: "success", message: `Projet "${projet.nomProjet}" créé avec succès !` });
                    }}
                    onError={(msg) => {
                      setPopup({ type: "error", message: msg });
                    }}
                    onLoading={(loading) => {
                      if (loading) setPopup({ type: "loading", message: "Création en cours..." });
                    }}
                  />
                )}
              </Tab.Pane>

              <Tab.Pane eventKey="historique">
                {!lead ? (
                  <p className="text-warning">Sauvegardez d'abord le lead.</p>
                ) : (
                  <FormProcessHistory
                    lead={lead}
                    processHistoryService={processHistoryService}
                  />
                )}
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          {currentStep !== "projet" && currentStep !== "historique" && (
            <Button variant="primary" onClick={handleSave}>
              {lead ? "Modifier" : "Créer"}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {popup && (
        <FeedbackPopup
          type={popup.type}
          message={popup.message}
          onClose={popup.type !== "loading" ? closePopup : undefined}
        />
      )}
    </>
  );
};

export default FormLead;