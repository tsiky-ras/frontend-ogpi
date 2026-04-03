import React, { useEffect, useState, useRef } from "react";
import { Modal, Button, Nav, Tab } from "react-bootstrap";
import { useAuth } from "../../../../context/AuthContext.tsx";

import CollecteSuccessMessage from "../../../../components/message/CollecteSuccessMessage.tsx";
import CollecteErrorMessage from "../../../../components/message/CollecteErrorMessage.tsx";
import CollecteLoadingMessage from "../../../../components/message/CollecteLoadingMessage.tsx";

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

type FormLeadProps = {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  lead?: any | null;
  initialTab?: string;
};

const FormLead: React.FC<FormLeadProps> = ({ show, onClose, onSubmit, lead, initialTab }) => {
  const { api } = useAuth();
  const leadService = new LeadService(api);
  const userDisplayService = new UserDisplayService(api);
  const deviseService = useDeviseService();
  const technoService = useTechnoService();
  const typeFacturationService = useTypeFacturationService();
  const leadTechFinService = useLeadTechFinDetailsService();

  const [currentStep, setCurrentStep] = useState("qualification");

  /* ================= Qualification ================= */
  const [form, setForm] = useState<any>({
    periode: "",
    businessUnit: "",
    description: "",
    nom: "",
    reference: "",
    typeOpportunite: "",
    categorie: "",
    secteur: "",
    statut: "1",
    typeFinancement: "",
  });

  /* ================= Offre Tech & Fin ================= */
  const [formTechFin, setFormTechFin] = useState<any>({
    technos: [],
    volumeJHVendu: 0,
    deviseId: "",
    tauxDeChange: 1,
    typeFacturationId: "",
    impots: 0,
    dateAttribution: "",
    budget: 0,
  });

  const jiraDataRef = useRef<any>(null);

  /* ================= Listes ================= */
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

  /* ================= Messages ================= */
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showLoadingMessage, setShowLoadingMessage] = useState(false);

  /* ================= Mappers ================= */
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

  // Fallback uniquement si l'API TechFin ne répond pas
  const mapLeadToTechFinForm = (lead: any) => {
    let technosIds: number[] = [];
    if (Array.isArray(lead.technos)) {
      technosIds = lead.technos
        .map((item: any) => {
          if (item?.techno?.idTechno) return Number(item.techno.idTechno);
          if (typeof item === "object" && item !== null && item.idTechno) return Number(item.idTechno);
          if (typeof item === "object" && item !== null && item.id) return Number(item.id);
          if (typeof item === "number") return item;
          return null;
        })
        .filter((id: any) => id !== null && !isNaN(id));
    }
    return {
      technos: technosIds,
      volumeJHVendu: lead.volumeJHVendu || 0,
      deviseId: lead.devise?.idDevise || "",
      tauxDeChange: lead.tauxDeChange || 1,
      typeFacturationId: lead.typeFacturation?.idTypeFacturation || "",
      impots: lead.impots || 0,
      dateAttribution: lead.dateAttribution || "",
      budget: lead.montantOffre || lead.budget || 0,
    };
  };

  // Extrait les IDs technos depuis la réponse API TechFin
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

  /* ================= Chargement principal ================= */
  useEffect(() => {
    if (!show) return;

    const fetchAll = async () => {
      try {
        // 1. Toutes les listes en parallèle
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

          // 2. Init formulaires après chargement des listes
          if (lead) {
          const currentLeadId = lead?.leadId || lead?.id;
          setForm(mapLeadToForm(lead));

          // Si le lead a déjà ses données TechFin fusionnées (chargé via loadFullLeadDetails
          // dans ListeLead ou handleSelectLead dans FormProjet), on les utilise directement.
          // Sinon on les charge depuis l'API.
          const hasPreloadedTechFin =
            lead.technos !== undefined ||
            lead.devise !== undefined ||
            lead.typeFacturation !== undefined;

          let techFinData: any = null;

          if (hasPreloadedTechFin) {
            // Données déjà présentes sur le lead — même structure que la réponse API
            techFinData = {
              technos: lead.technos || [],
              volumeJHVendu: lead.volumeJHVendu || 0,
              devise: lead.devise || null,
              tauxDeChange: lead.tauxDeChange || 1,
              typeFacturation: lead.typeFacturation || null,
              impots: lead.impots || 0,
              dateAttribution: lead.dateAttribution || "",
              montantOffre: lead.montantOffre || lead.budget || 0,
              budget: lead.montantOffre || lead.budget || 0,
            };
          } else {
            // Fallback : charger depuis l'API
            try {
              techFinData = await leadTechFinService.getByLeadId(currentLeadId);
            } catch (err) {
              console.warn("TechFin non trouvé, fallback sur lead brut :", err);
            }
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
            });
          } else {
            setFormTechFin(mapLeadToTechFinForm(lead));
          }

          setCurrentStep(initialTab || "qualification");
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
          });
          setCurrentStep("qualification");
          jiraDataRef.current = null;
        }
      } catch (err) {
        console.error("Erreur chargement données FormLead :", err);
      }
    };

    fetchAll();
  }, [show, lead, initialTab]);

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

  /* ================= Save unifié ================= */
  const handleSave = async () => {
    if (currentStep === "projet") return;

    setShowLoadingMessage(true);

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

        setShowLoadingMessage(false);
        setSuccessMessage("Qualification sauvegardée avec succès !");
        setShowSuccessMessage(true);
        onSubmit(savedLead);

        setTimeout(() => {
          setShowSuccessMessage(false);
          setCurrentStep("offre");
        }, 1500);

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

        setShowLoadingMessage(false);
        setSuccessMessage("Offre technique & financière sauvegardée avec succès !");
        setShowSuccessMessage(true);

        setTimeout(() => {
          setShowSuccessMessage(false);
          onClose();
        }, 2000);

        return;
      }

      if (currentStep === "etapes") {
        if (!currentLeadId) throw new Error("ID du lead manquant.");

        const jiraData = jiraDataRef.current;
        if (!jiraData) throw new Error("Aucune donnée JIRA à sauvegarder.");

        await leadService.updateJira(currentLeadId, jiraData);

        setShowLoadingMessage(false);
        setSuccessMessage("JIRA mis à jour avec succès !");
        setShowSuccessMessage(true);

        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 2000);

        return;
      }
    } catch (err) {
      console.error("=== ERREUR handleSave ===", err);
      setShowLoadingMessage(false);
      setErrorMessage(err instanceof Error ? err.message : "Erreur inconnue");
      setShowErrorMessage(true);
    }
  };

  /* ================= Render ================= */
  return (
    <>
      <Modal show={show} onHide={onClose} fullscreen centered scrollable className="form-lead-modal">
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
            onSelect={(k) => {
              if (isNoGo && !initialTab && k !== "qualification") return;
              setCurrentStep(k || "qualification");
            }}
          >
            <Nav variant="pills" className="mb-4">
              <Nav.Item>
                <Nav.Link eventKey="qualification">Qualification</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="offre" disabled={!lead}>
                  Offre technique & financière
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="etapes" disabled={!lead}>
                  Étapes & validations
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="projet" disabled={!lead}>
                  Projet
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
                    onDataReady={(data) => {
                      jiraDataRef.current = data;
                    }}
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
                      setSuccessMessage(`Projet "${projet.nomProjet}" créé avec succès !`);
                      setShowSuccessMessage(true);
                      setTimeout(() => setShowSuccessMessage(false), 2000);
                    }}
                    onError={(msg) => {
                      setErrorMessage(msg);
                      setShowErrorMessage(true);
                    }}
                    onLoading={setShowLoadingMessage}
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
          {currentStep !== "projet" && (
            <Button variant="primary" onClick={handleSave}>
              {lead ? "Modifier" : "Créer"}
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {showLoadingMessage && <CollecteLoadingMessage />}
      {showSuccessMessage && <CollecteSuccessMessage message={successMessage} />}
      {showErrorMessage && <CollecteErrorMessage message={errorMessage} />}
    </>
  );
};

export default FormLead;