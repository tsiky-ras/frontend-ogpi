import React, { useEffect, useState } from "react";
import { Modal, Button, Nav, Tab } from "react-bootstrap";
import { useAuth } from "../../../../context/AuthContext.tsx";
import CollecteSuccessMessage from "../../../../components/message/CollecteSuccessMessage.tsx";
import CollecteErrorMessage from "../../../../components/message/CollecteErrorMessage.tsx";
import CollecteLoadingMessage from "../../../../components/message/CollecteLoadingMessage.tsx";

import FormQualif from "./qualification/FormQualif.tsx";
import './FormLead.css';
import { BusinessUnitService } from "../../../../services/profil/poste/BusinessUnitService.tsx";
import { LeadTypeService } from "../../../../services/lead/LeadTypeService.tsx";
import { LeadCategoryService } from "../../../../services/lead/LeadCategoryService.tsx";
import { LeadSecteurService } from "../../../../services/lead/LeadSecteurService.tsx";
import { LeadStatusService } from "../../../../services/lead/LeadStatusService.tsx";
import { TypeProjetFinancementService } from "../../../../services/lead/TypeProjetFinancementService.tsx";
import { ClientService } from "../../../../services/lead/ClientService.tsx";
import { PartenaireService } from "../../../../services/lead/PartenaireService.tsx";
import { LeadService } from "../../../../services/lead/LeadService.tsx";

type FormLeadProps = {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  lead?: any | null;
};

const FormLead: React.FC<FormLeadProps> = ({ show, onClose, onSubmit, lead }) => {
  const { api } = useAuth();
  const leadService = new LeadService(api);

  const [currentStep, setCurrentStep] = useState("qualification");
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

  const [businessUnits, setBusinessUnits] = useState<any[]>([]);
  const [typeOpportunites, setTypeOpportunites] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [secteurs, setSecteurs] = useState<any[]>([]);
  const [statuts, setStatuts] = useState<any[]>([]);
  const [typeFinancements, setTypeFinancements] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [partenaires, setPartenaires] = useState<any[]>([]);

  // Messages
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showLoadingMessage, setShowLoadingMessage] = useState(false);

  const formatLeadPayload = (form: any) => {
    const nowIso = new Date().toISOString();
    const periodeDate = form.periode ? `${form.periode}-01` : null;

    return {
      leadPeriode: periodeDate,
      leadDescription: form.description,
      leadName: form.nom,
      leadRef: form.reference,
      leadRealDeadLine: form.realDeadline || null,
      leadCommentaire: form.commentaire || "",
      leadZone: form.zone !== undefined ? Number(form.zone) : null,
      client: form.client ? { id: form.client.id } : null,
      category: form.categorie ? { id: form.categorie } : null,
      leadType: form.typeOpportunite ? { id: form.typeOpportunite } : null,
      leadSecteur: form.secteur ? { id: form.secteur } : null,
      businessUnit: form.businessUnit ? { id: form.businessUnit } : null,
      leadPartenaires: form.leadPartenaire
        ? [{ partenaire: { id: form.leadPartenaire.id } }]
        : [],
      leadStatusHistories: [
        { dateUpdated: nowIso, leadStatus: form.statut ? { id: form.statut } : { id: 1 } }
      ],
      typeProjetFinancement: form.typeFinancement ? { id: form.typeFinancement.id } : null,
      driveFolder: form.driveFolderName
        ? { name: form.driveFolderName, link: form.driveFolderLink || "" }
        : null,
      mainDriveFile: form.mainDriveFileName
        ? { name: form.mainDriveFileName, link: form.mainDriveFileLink || "", description: form.mainDriveFileDescription || "" }
        : null
    };
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  const mapLeadToForm = (lead: any) => ({
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
    leadPartenaire: lead.leadPartenaires?.length ? lead.leadPartenaires[0].partenaire : null,
    typeFinancement: lead.typeProjetFinancement || null,
    realDeadline: lead.leadRealDeadLine ? lead.leadRealDeadLine.substring(0, 16) : "",
    driveFolderName: lead.driveFolder?.name || "",
    driveFolderLink: lead.driveFolder?.link || "",
    mainDriveFileName: lead.mainDriveFile?.name || "",
    mainDriveFileLink: lead.mainDriveFile?.link || "",
    mainDriveFileDescription: lead.mainDriveFile?.description || "",
  });

  // Reset form ou map lead à l'ouverture
  useEffect(() => {
    if (!show) return;

    if (lead) {
      setForm(mapLeadToForm(lead));
      if (lead.currentLeadStatus?.leadStatus?.label === "No Go") {
        setCurrentStep("qualification");
      }
    } else {
      // Nouveau lead → reset form
      setForm({
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
        client: null,
        leadPartenaire: null,
        realDeadline: "",
        driveFolderName: "",
        driveFolderLink: "",
        mainDriveFileName: "",
        mainDriveFileLink: "",
        mainDriveFileDescription: "",
        commentaire: "",
        zone: "",
      });
      setCurrentStep("qualification");
    }
  }, [lead, show]);

  // Fetch dropdowns
  useEffect(() => {
    if (!show) return;
    const fetchData = async () => {
      try {
        const [
          buData, typeData, catData, secteurData, statutData,
          typeFinData, clientData, partenaireData
        ] = await Promise.all([
          new BusinessUnitService(api).getAll(),
          new LeadTypeService(api).getAll(),
          new LeadCategoryService(api).getAll(),
          new LeadSecteurService(api).getAll(),
          new LeadStatusService(api).getAll(),
          new TypeProjetFinancementService(api).getAll(),
          new ClientService(api).getAll(),
          new PartenaireService(api).getAll(),
        ]);
        setBusinessUnits(buData);
        setTypeOpportunites(typeData);
        setCategories(catData);
        setSecteurs(secteurData);
        setStatuts(statutData);
        setTypeFinancements(typeFinData);
        setClients(clientData);
        setPartenaires(partenaireData);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [show, api]);

  const handleSubmit = async () => {
    setShowLoadingMessage(true);
    try {
      if (!form.nom || !form.reference || !form.typeOpportunite || !form.categorie || !form.secteur || !form.businessUnit || !form.statut) {
        setErrorMessage("Veuillez remplir tous les champs obligatoires");
        setShowErrorMessage(true);
        setShowLoadingMessage(false);
        return;
      }
      const payload = formatLeadPayload(form);
      const responseData = lead
        ? await leadService.updateQualif(lead.leadId, payload)
        : await leadService.createQualif(payload);

      setSuccessMessage(lead ? "Lead modifié !" : "Lead créé !");
      setShowSuccessMessage(true);
      setShowLoadingMessage(false);

      setTimeout(() => {
        setShowSuccessMessage(false);
        onSubmit(responseData);
        onClose();
      }, 1500);
    } catch (err: any) {
      setShowLoadingMessage(false);
      setErrorMessage(err.response?.data?.message || err.message || "Erreur lors de l'enregistrement");
      setShowErrorMessage(true);
      console.error(err);
    }
  };

  const isNoGo = lead?.currentLeadStatus?.leadStatus?.label === "No Go";

  return (
    <>
      <Modal show={show} onHide={onClose} fullscreen centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            {lead ? `Modification : ${lead.leadName} - ${lead.leadRef}` : "Créer un nouveau lead"}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Tab.Container
            activeKey={currentStep}
            onSelect={(k) => {
              if (isNoGo && k !== "qualification") return;
              setCurrentStep(k || "qualification");
            }}
          >
            <Nav variant="pills" className="mb-4">
              <Nav.Item><Nav.Link eventKey="qualification">Qualification</Nav.Link></Nav.Item>
              <Nav.Item><Nav.Link eventKey="offre" disabled={isNoGo}>Offre technique & Financière</Nav.Link></Nav.Item>
              <Nav.Item><Nav.Link eventKey="etapes" disabled={isNoGo}>Étapes & Validations</Nav.Link></Nav.Item>
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
                {isNoGo && <p className="text-danger">Impossible de modifier cet onglet pour un lead No Go.</p>}
              </Tab.Pane>

              <Tab.Pane eventKey="etapes">
                {isNoGo && <p className="text-danger">Impossible de modifier cet onglet pour un lead No Go.</p>}
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button variant="primary" onClick={handleSubmit}>{lead ? "Modifier" : "Créer"}</Button>
        </Modal.Footer>
      </Modal>

      {showLoadingMessage && <CollecteLoadingMessage />}
      {showSuccessMessage && <CollecteSuccessMessage message={successMessage} />}
      {showErrorMessage && <CollecteErrorMessage message={errorMessage} />}
    </>
  );
};

export default FormLead;
