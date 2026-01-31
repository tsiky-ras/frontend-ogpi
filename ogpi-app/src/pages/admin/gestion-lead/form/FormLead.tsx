import React, { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
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

  const formatLeadPayload = (form: any) => {
    const nowIso = new Date().toISOString();

    // Transformer "YYYY-MM" en "YYYY-MM-01" pour java.sql.Date
    const periodeDate = form.periode ? `${form.periode}-01` : null;

    return {
      leadPeriode: periodeDate, // "2026-01-01"
      leadDescription: form.description,
      leadName: form.nom,
      leadRef: form.reference,
      leadRealDeadLine: form.realDeadline || null,
      projetDeFinancement: form.projetDeFinancement || "",
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
        {
          dateUpdated: nowIso,
          leadStatus: form.statut ? { id: form.statut } : { id: 1 }
        }
      ],
      driveFolder: form.driveFolderName
        ? {
            name: form.driveFolderName,
            link: form.driveFolderLink || ""
          }
        : null,
      mainDriveFile: form.mainDriveFileName
        ? {
            name: form.mainDriveFileName,
            link: form.mainDriveFileLink || "",
            description: form.mainDriveFileDescription || ""
          }
        : null
    };
  };

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
  const leadService = new LeadService(api);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({ ...prev, [name]: value }));
  };

  // Fetch dropdown data
  useEffect(() => {
    if (!show) return;

    const fetchData = async () => {
      try {
        const [
          buData,
          typeData,
          catData,
          secteurData,
          statutData,
          typeFinData,
          clientData,
          partenaireData,
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

    // Pré-remplir formulaire si lead existant
    useEffect(() => {
      if (lead) setForm({ ...form, ...lead });
    }, [lead]);

  const handleSubmit = async () => {
    setShowLoadingMessage(true);
    try {
      // Validation minimale
      if (!form.nom || !form.reference || !form.typeOpportunite || !form.categorie || !form.secteur || !form.businessUnit || !form.statut) {
        setErrorMessage("Veuillez remplir tous les champs obligatoires");
        setShowErrorMessage(true);
        setShowLoadingMessage(false);
        return;
      }

      // Préparer le payload
      const payload = formatLeadPayload(form);

      // Appel API via le service
      const responseData = await leadService.createQualif(payload);

      // Feedback utilisateur
      setSuccessMessage(lead ? "Lead modifié !" : "Lead créé !");
      setShowSuccessMessage(true);
      setShowLoadingMessage(false);

      setTimeout(() => {
        setShowSuccessMessage(false);
        onSubmit(responseData); // retourne l'objet créé
        onClose();
      }, 1500);

    } catch (err: any) {
      setShowLoadingMessage(false);
      setErrorMessage(err.response?.data?.message || err.message || "Erreur lors de l'enregistrement");
      setShowErrorMessage(true);
      console.error("Erreur création lead:", err);
    }
  };
    return (
    <>
      <Modal show={show} onHide={onClose} fullscreen centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>{lead ? `Modifier ${lead.nom}` : "Créer un nouveau lead"}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
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
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {lead ? "Modifier" : "Créer"}
          </Button>
        </Modal.Footer>
      </Modal>

      {showLoadingMessage && <CollecteLoadingMessage />}
      {showSuccessMessage && <CollecteSuccessMessage message={successMessage} />}
      {showErrorMessage && <CollecteErrorMessage message={errorMessage} />}
    </>
  );
};

export default FormLead;
