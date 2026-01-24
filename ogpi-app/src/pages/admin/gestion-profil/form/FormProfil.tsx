import React, { useEffect, useState } from "react";
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { Profil } from "../../../../types/profil/Profil.tsx";
import { ProfilHardSkill } from "../../../../types/profil/ProfilHardSkill.tsx";
import { ProfilSoftSkill } from "../../../../types/profil/ProfilSoftSkill.tsx";
import { useProfilService } from "../../../../services/profil/ProfilService.tsx";
import CollecteSuccessMessage from "../../../../components/message/CollecteSuccessMessage.tsx";
import CollecteErrorMessage from "../../../../components/message/CollecteErrorMessage.tsx";
import CollecteLoadingMessage from "../../../../components/message/CollecteLoadingMessage.tsx";
import "./FormProfil.css";
import "../../../../components/message/CollecteMessages.css";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { DiplomeService } from "../../../../services/profil/etude/DiplomeService.tsx";
import { EtablissementService } from "../../../../services/profil/etude/EtablissementService.tsx";
import { FiliereService } from "../../../../services/profil/etude/FiliereService.tsx";
import { OrganismeService } from "../../../../services/profil/certifications/OrganismeService.tsx";
import { BusinessUnitService } from "../../../../services/profil/poste/BusinessUnitService.tsx";
import { CertificationService } from "../../../../services/profil/certifications/CertificationService.tsx";
import { HardSkillsService } from "../../../../services/profil/hardskills/HardSkillsService.tsx";
import { SoftSkillsService } from "../../../../services/profil/softskills/SoftSkillsService.tsx";
import { PosteService } from "../../../../services/profil/poste/PosteService.tsx";

type FormProfilProps = {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  profil?: Profil | null;
};

const FormProfil: React.FC<FormProfilProps> = ({ show, onClose, onSubmit, profil }) => {
  const { create, update } = useProfilService(); 
  const api = useAuth().api;
  const [form, setForm] = useState<any>({
    type_profil: 1,
    type_contrat: 1,
    matricule: "",
    nom: "",
    prenom: "",
    appelation: "",
    sexe: "",
    date_naissance: "",
    email_pro: "",
    email_perso: "",
    telephone: "",
    experience_avant: "",
     postes: [] as ProfilPoste[], 
    bu: "",
    date_embauche: "",
    date_integration: "",
    date_debauche: "",
    etudes: [],
    certifications: [],
    hard_skills: [] as ProfilHardSkill[],
    soft_skills: [] as ProfilSoftSkill[],
    user: null,
  });

  const [diplomes, setDiplomes] = useState<{ id: number; label: string }[]>([]);
  const [etablissements, setEtablissements] = useState<{ id: number; label: string }[]>([]);
  const [filieres, setFilieres] = useState<{ id: number; label: string }[]>([]);
  const [organismes, setOrganismes] = useState<{ id: number; label: string }[]>([]);
  const [certificationsList, setCertificationsList] = useState<{ id: number; label: string }[]>([]);
  const [BU, setBU] = useState<{ id: number; name: string }[]>([]);
  const [hardSkillsList, setHardSkillsList] = useState<{ id: number; name: string }[]>([]);
  const [softSkillsList, setSoftSkillsList] = useState<{ id: number; label: string }[]>([]);
  const [postesList, setPostesList] = useState<{ id: number; label: string }[]>([]);

  // ===== Message modals state =====
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showLoadingMessage, setShowLoadingMessage] = useState(false);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const diplomeService = new DiplomeService(api);
        const etablissementService = new EtablissementService(api);
        const filiereService = new FiliereService(api);
        const organismeService = new OrganismeService(api);
        const buService = new BusinessUnitService(api);
        const certificationService = new CertificationService(api);
        const hardSkillService = new HardSkillsService(api);
        const softSkillService = new SoftSkillsService(api);
        const posteService = new PosteService(api);

        const [
          diplomeData,
          etablissementData,
          filiereData,
          organismeData,
          buData,
          certificationData,
          hardSkillData,
          softSkillData,
          postesData,
        ] = await Promise.all([
          diplomeService.getAll(),
          etablissementService.getAll(),
          filiereService.getAll(),
          organismeService.getAll(),
          buService.getAll(),
          certificationService.getAll(),
          hardSkillService.getAll(),
          softSkillService.getAll(),
          posteService.getAll(),
        ]);

        setDiplomes(diplomeData.map(d => ({ id: d.id || 0, label: d.label })));
        setEtablissements(etablissementData.map(e => ({ id: e.id || 0, label: e.label })));
        setFilieres(filiereData.map(f => ({ id: f.id || 0, label: f.label })));
        setOrganismes(organismeData.map(o => ({ id: o.id || 0, label: o.label })));
        setBU(buData.map(b => ({ id: b.id || 0, name: b.name })));
        setCertificationsList(certificationData.map(c => ({ id: c.id || 0, label: c.label })));
        setHardSkillsList(hardSkillData.map(hs => ({ id: hs.id || 0, name: hs.name || "" })));
        setSoftSkillsList(softSkillData.map(ss => ({ id: ss.id || 0, label: ss.label })));
        setPostesList(postesData.map(p => ({ id: p.id || 0, label: p.label })));
      } catch (err) {
        console.error("Erreur chargement listes", err);
      }
    };

    fetchData();
  }, [api]);


  /* ===== MODE ÉDITION ===== */
  useEffect(() => {
    if (!profil) return;

    // ✅ DÉFINITION DU POSTE ACTUEL
    const posteActuel = profil.profilPostes?.find(
      p => p.endDate === null || p.endDate === undefined
    );

    setForm(prev => ({
      ...prev,
      ...profil,

      // ===== Identité =====
      appelation: profil.appellation || "",
      email_pro: profil.emailPro || "",
      email_perso: profil.emailPerso || "",
      date_naissance: profil.dateNaissance || "",

      // ===== Dates =====
      date_embauche: profil.dateEmbauche || "",
      date_integration: profil.dateIntegr || "",

      // ===== Poste actuel =====
      postes: posteActuel
        ? [{
            profilPosteId: posteActuel.id,
            poste: {
              posteId: posteActuel.poste?.id || 0,   
              label: posteActuel.poste?.label || "",
            },
            bu: {
              buId: posteActuel.businessUnit?.id || 0,
              name: posteActuel.businessUnit?.name || "",
            },
            startDate: posteActuel.startDate || "",
            endDate: posteActuel.endDate || null,
          }]
        : [],

      // ===== Diplômes =====
      etudes: profil.etudes?.map(e => ({
        diplome: e.diplome ? { id: e.diplome.id, label: e.diplome.label } : null,
        etablissement: e.etablissement ? { id: e.etablissement.id, label: e.etablissement.label } : null,
        filiere: e.filiere ? { id: e.filiere.id, label: e.filiere.label } : null,
        obtention: e.obtention || "",
        link: e.link || "",
        file: null,
      })) || [],

      // ===== Certifications =====
      certifications: profil.profilCertifications?.map(c => ({
        certification: c.certification
          ? { id: c.certification.id, label: c.certification.label }
          : null,
        organisme: c.organisme
          ? { id: c.organisme.id, label: c.organisme.label }
          : null,
        obtention: c.obtention || "",
        badge: c.badge || "",
        score: c.score || 0,
        validUntil: c.validUntil || "",
      })) || [],

      // ===== Hard skills =====
      hard_skills: profil.hardSkillsNotes?.map(hs => ({
        id: hs.id || 0,
        niveau: hs.note || 0,
        domaine: hs.hardSkills
          ? { id: hs.hardSkills.id, label: hs.hardSkills.name }
          : { id: 0, label: "" },
      })) || [],

      // ===== Soft skills =====
      soft_skills: profil.profilSoftSkills?.map(ss => ({
        id: ss.id || 0,
        domaine: ss.softSkills
          ? { id: ss.softSkills.id, label: ss.softSkills.label }
          : { id: 0, label: "" },
      })) || [],
    }));

    console.log("Profil chargé :", profil);
  }, [profil]);

  const handleChange = (e: React.ChangeEvent<any>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  /* ===== Fonctions pour diplômes, certifications, hard et soft skills ===== */
  const addDiplome = () => setForm({ ...form, etudes: [...form.etudes, { diplome: null, etablissement: null, filiere: null, obtention: "", file: null }] });
  const updateDiplome = (i: number, key: string, value: any) => { 
    const updated = [...form.etudes]; 
    updated[i][key] = value; 
    setForm({ ...form, etudes: updated }); 
  };
  const removeDiplome = (i: number) => setForm({ ...form, etudes: form.etudes.filter((_: any, index: number) => index !== i) });

  const addCertification = () =>
    setForm({
      ...form,
      certifications: [
        ...form.certifications,
        {
          certification: null,
          organisme: null,
          obtention: "",
          score: 0,
          badge: "",
          validUntil: "",
        },
      ],
    });
  const updateCertification = (i: number, key: string, value: any) => {
    const updated = [...form.certifications];
    if (key === "organisme") updated[i].organisme = value;
    else updated[i][key] = value;
    setForm({ ...form, certifications: updated });
  };
  const removeCertification = (i: number) => setForm({ ...form, certifications: form.certifications.filter((_: any, index: number) => index !== i) });

  const addHardSkill = () => setForm({ ...form, hard_skills: [...form.hard_skills, { id: 0, niveau: "", domaine: { id: 0, label: "" } }] });
  const updateHardSkill = (i: number, key: string, value: any) => {
    const updated = [...form.hard_skills];
    if (key === "domaine") updated[i].domaine = { ...updated[i].domaine, ...value };
    else updated[i][key] = value;
    setForm({ ...form, hard_skills: updated });
  };

  const removeHardSkill = (i: number) => setForm({ ...form, hard_skills: form.hard_skills.filter((_: any, index: number) => index !== i) });

  const addSoftSkill = () => setForm({ ...form, soft_skills: [...form.soft_skills, { id: 0, domaine: { id: 0, label: "" } }] });
  const updateSoftSkill = (i: number, key: string, value: any) => {
    const updated = [...form.soft_skills];
    if (key === "domaine") updated[i].domaine = { ...updated[i].domaine, ...value };
    setForm({ ...form, soft_skills: updated });
  };
  const removeSoftSkill = (i: number) => setForm({ ...form, soft_skills: form.soft_skills.filter((_: any, index: number) => index !== i) });

  /* ===== Formatage pour le backend ===== */
  const formatFormForBackend = (form: any, existingProfilId?: number) => ({
    id: existingProfilId,
    type: Number(form.type_profil) || 1,
    contrat: Number(form.type_contrat) || 1,
    matricule: form.matricule || "",
    nom: form.nom || "",
    prenom: form.prenom || "",
    appellation: form.appelation || "",
    sexe: Number(form.sexe) || 1,
    emailPro: form.email_pro || "",       
    emailPerso: form.email_perso || "",
    telephone: form.telephone || "",
    experienceAvant: Number(form.experience_avant) || 0,
    dateNaissance: form.date_naissance || undefined,
    dateEmbauche: form.date_embauche || undefined,
    dateIntegr: form.date_integration || undefined,
    dateDebauche: form.date_debauche || null,
    profilPostes: form.postes?.length
      ? form.postes.map((p: any) => ({
          id: p.profilPosteId || null,
          poste: { id: p.poste?.posteId || 0 },
          businessUnit: { id: p.bu?.buId || 0 },
          startDate: p.startDate || "",
          endDate: p.endDate || null,
        }))
      : [],
    etudes: form.etudes?.length
      ? form.etudes.map((e: any) => ({
          diplome: { id: e.diplome?.id || 0 },
          etablissement: { id: e.etablissement?.id || 0 },
          filiere: { id: e.filiere?.id || 0 },
          link: e.file?.name || e.link || null, 
          obtention: e.obtention || "",
        }))
      : [],
    profilCertifications: form.certifications?.map((c: any) => ({
      certification: { id: c.certification?.id || 0 },
      organisme: { id: c.organisme?.id || 0 },
      obtention: c.obtention || "",   
      badge: c.badge || null,
      validUntil: c.validUntil || null,
      score: Number(c.score) || 0,
    })) || [],
    hardSkillsNotes: form.hard_skills?.length
      ? form.hard_skills.map((hs: any) => ({
          id: hs.id || null, 
          note: Number(hs.niveau) || 0,
          hardSkills: { id: hs.domaine?.id || 0 },
        }))
      : [],
    profilSoftSkills: form.soft_skills?.length
      ? form.soft_skills.map((ss: any) => ({
          id: ss.id || null,
          softSkills: { id: ss.domaine?.id || 0 },
        }))
      : [],
    user: form.user || null,
  });


  /* ===== Soumission du formulaire ===== */
  const handleSubmit = async () => {
    try {
      setShowLoadingMessage(true);
      const payload = formatFormForBackend(form, profil?.id);
      console.log("Payload à envoyer :", payload);
      if (profil && profil.id) {
        await update(payload);
        setShowLoadingMessage(false);
        setSuccessMessage("Profil mis à jour avec succès!");
      } else {
        await create(payload);
        setShowLoadingMessage(false);
        setSuccessMessage("Profil créé avec succès!");
      }
      setShowSuccessMessage(true);
      
      // Fermer le modal après 2 secondes et réinitialiser
      setTimeout(() => {
        onSubmit(payload);
        setShowSuccessMessage(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setShowLoadingMessage(false);
      const errorMsg = err.response?.data?.message || "Erreur lors de la sauvegarde du profil";
      setErrorMessage(errorMsg);
      setShowErrorMessage(true);
      console.error("Erreur création ou mise à jour du profil", err.response?.data || err);
    }
  };

  return (
    <>
      <Modal show={show} onHide={onClose} fullscreen centered scrollable className="fiche-profil-modal">
      <Modal.Header closeButton>
        <Modal.Title>{profil ? `Modifier : ${profil.prenom} ${profil.nom}` : "Ajouter collaborateur"}</Modal.Title>
      </Modal.Header>

      <Modal.Body className="fiche-profil-body">
        {/* ===== Identité ===== */}
        <section className="fiche-section">
          <h4>1. Identité professionnelle</h4>
          <Row className="g-3">
            <Col md={4}><Form.Label>Matricule <span className="required-asterisk">*</span></Form.Label><Form.Control name="matricule" value={form.matricule} onChange={handleChange} /></Col>
            <Col md={4}><Form.Label>Nom <span className="required-asterisk">*</span></Form.Label><Form.Control name="nom" value={form.nom} onChange={handleChange} /></Col>
            <Col md={4}><Form.Label>Prénom <span className="required-asterisk">*</span></Form.Label><Form.Control name="prenom" value={form.prenom} onChange={handleChange} /></Col>
            <Col md={4}><Form.Label>Appellation <span className="required-asterisk">*</span></Form.Label><Form.Control name="appelation" value={form.appelation} onChange={handleChange} /></Col>
            <Col md={4}>
              <Form.Label>Genre <span className="required-asterisk">*</span></Form.Label>
              <Form.Select name="sexe" value={form.sexe} onChange={handleChange}>
                <option value="1">Masculin</option>
                <option value="2">Féminin</option>
              </Form.Select>
            </Col>
            <Col md={4}><Form.Label>Date de naissance <span className="required-asterisk">*</span></Form.Label><Form.Control type="date" name="date_naissance" value={form.date_naissance} onChange={handleChange} /></Col>
            <Col md={4}><Form.Label>Email professionnel <span className="required-asterisk">*</span></Form.Label><Form.Control type="email" name="email_pro" value={form.email_pro} onChange={handleChange} /></Col>
            <Col md={4}><Form.Label>Email personnel <span className="required-asterisk">*</span></Form.Label><Form.Control type="email" name="email_perso" value={form.email_perso} onChange={handleChange} /></Col>
            <Col md={4}><Form.Label>Téléphone <span className="required-asterisk">*</span></Form.Label><Form.Control type="tel" name="telephone" value={form.telephone} onChange={handleChange} /></Col>
          </Row>
        </section>

        {/* ===== Organisation ===== */}
        <section className="fiche-section">
          <h4>2. Organisation</h4>
          <Row className="g-3">
            <Col md={4}>
              <Form.Label>Type de collaborateur <span className="required-asterisk">*</span></Form.Label>
              <Form.Select name="type_profil" value={form.type_profil} onChange={handleChange}>
                <option value={1}>Collaborateur interne</option>
                <option value={2}>Collaborateur externe</option>
              </Form.Select>
            </Col>
            {/* ===== Poste actuel ===== */}
              <Col md={3}>
                <Form.Label>Poste actuel <span className="required-asterisk">*</span></Form.Label>
                <Form.Select
                  value={form.postes[0]?.poste?.posteId || ""}
                  onChange={e => {
                    const selectedPoste = postesList.find(p => p.id === Number(e.target.value)) || { id: 0, label: "" };
                    const currentBU = form.postes[0]?.bu || { buId: 0, name: "" };
                    setForm({
                      ...form,
                      postes: [{
                        poste: { posteId: selectedPoste.id, label: selectedPoste.label },
                        bu: currentBU,
                        startDate: form.postes[0]?.startDate || "",
                        endDate: form.postes[0]?.endDate || null,
                        profilPosteId: form.postes[0]?.profilPosteId || 0,
                      }]
                    });
                  }}
                >
                  <option value="">Sélectionner un poste</option>
                  {postesList.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </Form.Select>
              </Col>

              {/* ===== Business Unit ===== */}
              <Col md={3}>
                <Form.Label>Business Unit <span className="required-asterisk">*</span></Form.Label>
                <Form.Select
                  value={form.postes[0]?.bu?.buId || ""}
                  onChange={e => {
                    const selectedBU = BU.find(b => b.id === Number(e.target.value)) || { id: 0, name: "" };
                    const currentPoste = form.postes[0]?.poste || { posteId: 0, label: "" };
                    setForm({
                      ...form,
                      postes: [{
                        poste: currentPoste,
                        bu: { buId: selectedBU.id, name: selectedBU.name },
                        startDate: form.postes[0]?.startDate || "",
                        endDate: form.postes[0]?.endDate || null,
                        profilPosteId: form.postes[0]?.profilPosteId || 0,
                      }]
                    });
                  }}
                >
                  <option value="">Sélectionner une BU</option>
                  {BU.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Form.Select>
              </Col>

              {/* ===== Date de début ===== */}
              <Col md={3}>
                <Form.Label>Date de début <span className="required-asterisk">*</span></Form.Label>
                <Form.Control
                  type="date"
                  value={form.postes[0]?.startDate || ""}
                  onChange={e => {
                    const currentPoste = form.postes[0]?.poste || { posteId: 0, label: "" };
                    const currentBU = form.postes[0]?.bu || { buId: 0, name: "" };
                    setForm({
                      ...form,
                      postes: [{
                        ...form.postes[0],
                        poste: currentPoste,
                        bu: currentBU,
                        startDate: e.target.value,
                      }]
                    });
                  }}
                />
              </Col>

              {/* ===== Date de fin ===== */}
              <Col md={3}>
                <Form.Label>Date de fin</Form.Label>
                <Form.Control
                  type="date"
                  value={form.postes[0]?.endDate || ""}
                  onChange={e => {
                    const currentPoste = form.postes[0]?.poste || { posteId: 0, label: "" };
                    const currentBU = form.postes[0]?.bu || { buId: 0, name: "" };
                    setForm({
                      ...form,
                      postes: [{
                        ...form.postes[0],
                        poste: currentPoste,
                        bu: currentBU,
                        endDate: e.target.value,
                      }]
                    });
                  }}
                />
              </Col>
          </Row>
        </section>

        {/* ===== Contrat & Dates ===== */}
        <section className="fiche-section">
          <h4>3. Contrat & Dates</h4>
          <Row className="g-3">
            <Col md={4}>
              <Form.Label>Type de contrat <span className="required-asterisk">*</span></Form.Label>
              <Form.Select name="type_contrat" value={form.type_contrat} onChange={handleChange}>
                <option value={1}>CDI</option>
                <option value={2}>CDD</option>
                <option value={3}>Stage</option>
              </Form.Select>
            </Col>
            <Col md={4}><Form.Label>Date embauche <span className="required-asterisk">*</span></Form.Label><Form.Control type="date" name="date_embauche" value={form.date_embauche} onChange={handleChange} /></Col>
            <Col md={4}><Form.Label>Date intégration <span className="required-asterisk">*</span></Form.Label><Form.Control type="date" name="date_integration" value={form.date_integration} onChange={handleChange} /></Col>
            <Col md={4}><Form.Label>Date de départ</Form.Label><Form.Control type="date" name="date_debauche" value={form.date_debauche} onChange={handleChange} /></Col>
          </Row>
        </section>

        {/* ===== Diplômes avec select dynamique et upload PDF ===== */}
        <section className="fiche-section">
          <h4>4. Diplômes</h4>
          {form.etudes.map((d: any, i: number) => (
            <Row className="g-3 mb-2 align-items-end" key={i}>
              <Col md={3}>
                <Form.Label>Diplôme</Form.Label>
                <Form.Select
                  value={d.diplome?.id || ""}
                  onChange={e => {
                    const selected = diplomes.find(dip => dip.id === Number(e.target.value));
                    updateDiplome(i, "diplome", selected || null);
                  }}
                >
                  <option value="">Sélectionner un diplôme</option>
                  {diplomes.map(dip => <option key={dip.id} value={dip.id}>{dip.label}</option>)}
                </Form.Select>
              </Col>

              <Col md={3}>
                <Form.Label>Établissement</Form.Label>
                <Form.Select
                  value={d.etablissement?.id || ""}
                  onChange={e => {
                    const selected = etablissements.find(etab => etab.id === Number(e.target.value));
                    updateDiplome(i, "etablissement", selected || null);
                  }}
                >
                  <option value="">Sélectionner un établissement</option>
                  {etablissements.map(etab => <option key={etab.id} value={etab.id}>{etab.label}</option>)}
                </Form.Select>
              </Col>

              <Col md={3}>
                <Form.Label>Filière</Form.Label>
                <Form.Select
                  value={d.filiere?.id || ""}
                  onChange={e => {
                    const selected = filieres.find(f => f.id === Number(e.target.value));
                    updateDiplome(i, "filiere", selected || null);
                  }}
                >
                  <option value="">Sélectionner une filière</option>
                  {filieres.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </Form.Select>
              </Col>

              <Col md={2}>
                <Form.Label>Obtention</Form.Label>
                <Form.Control
                  type="date"
                  value={d.obtention || ""}
                  onChange={e => updateDiplome(i, "obtention", e.target.value)}
                />
              </Col>

              <Col md={4}>
                <Form.Label>PDF du diplôme</Form.Label>
                <Form.Control
                  type="file"
                  accept="application/pdf"
                  onChange={e => {
                    const file = e.target.files?.[0] || null;
                    updateDiplome(i, "file", file);   // stocke le fichier
                  }}
                />
                {d.file && <small className="text-muted">{d.file.name}</small>}
              </Col>

              <Col md={1}>
                <Button variant="outline-danger" onClick={() => removeDiplome(i)}>-</Button>
              </Col>
            </Row>
          ))}

          <Button type="button" size="sm" variant="outline-primary" onClick={addDiplome}>
            + Ajouter un diplôme
          </Button>
        </section>
        
          {/* ===== Certifications avec select dynamique ===== */}
          <section className="fiche-section">
            <h4>5. Certifications</h4>
            {form.certifications.map((c: any, i: number) => (
              <Row className="g-3 mb-2 align-items-end" key={i}>
                <Col md={4}>
                  <Form.Label>Certification</Form.Label>
                  <Form.Select
                    value={c.certification?.id || ""}
                    onChange={e => {
                      const selected = certificationsList.find(cert => cert.id === Number(e.target.value));
                      updateCertification(i, "certification", selected || null);
                    }}
                  >
                    <option value="">Sélectionner une certification</option>
                    {certificationsList.map(cert => (
                      <option key={cert.id} value={cert.id}>{cert.label}</option>
                    ))}
                  </Form.Select>
                </Col>

                <Col md={4}>
                  <Form.Label>Organisme</Form.Label>
                  <Form.Select
                    value={c.organisme?.id || ""}
                    onChange={e => {
                      const selected = organismes.find(o => o.id === Number(e.target.value));
                      updateCertification(i, "organisme", selected || null);
                    }}
                  >
                    <option value="">Sélectionner un organisme</option>
                    {organismes.map(o => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </Form.Select>
                </Col>

              <Col md={4}>
                <Form.Label>Badge</Form.Label>
                <Form.Control
                  type="text"
                  value={c.badge || ""}
                  onChange={e => updateCertification(i, "badge", e.target.value)}
                  placeholder="URL du badge"
                />
              </Col>

              <Col md={2}>
                <Form.Label>Obtention</Form.Label>
                <Form.Control
                  type="date"
                  value={c.obtention || ""}
                  onChange={e => updateCertification(i, "obtention", e.target.value)}
                />
              </Col>

                <Col md={1}>
                  <Form.Label>Score</Form.Label>
                  <Form.Control
                    type="number"
                    value={c.score || 0}
                    onChange={e => updateCertification(i, "score", e.target.value)}
                  />
                </Col>

                <Col md={1}>
                  <Button variant="outline-danger" onClick={() => removeCertification(i)}>
                    -
                  </Button>
                </Col>
              </Row>
            ))}

            <Button size="sm" variant="outline-primary" onClick={addCertification}>
              + Ajouter une certification
            </Button>
        </section>
        {/* ===== Hard Skills ===== */}
        <section className="fiche-section">
          <h4>6. Hard Skills</h4>
            {form.hard_skills.map((hs: ProfilHardSkill, i: number) => (
              <Row className="g-3 mb-2 align-items-end" key={i}>
                <Col md={6}>
                  <Form.Label>Domaine</Form.Label>
                  <Form.Select
                    value={hs.domaine?.id || ""}
                    onChange={e => {
                      const selected = hardSkillsList.find(h => h.id === Number(e.target.value));
                      updateHardSkill(i, "domaine", selected || { id: 0, label: "" });
                    }}
                  >
                    <option value="">Sélectionner un domaine</option>
                    {hardSkillsList.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Label>Niveau /20</Form.Label>
                  <Form.Control value={hs.niveau || ""} onChange={e => updateHardSkill(i, "niveau", e.target.value)} />
                </Col>
                <Col md={2}>
                  <Button variant="outline-danger" onClick={() => removeHardSkill(i)}>-</Button>
                </Col>
              </Row>
            ))}
          <Button type="button" size="sm" variant="outline-primary" onClick={addHardSkill}>+ Ajouter un hard skill</Button>
        </section>

        {/* ===== Soft Skills ===== */}
        <section className="fiche-section">
          <h4>7. Soft Skills</h4>
            {form.soft_skills.map((ss: ProfilSoftSkill, i: number) => (
              <Row className="g-3 mb-2 align-items-end" key={i}>
                <Col md={8}>
                  <Form.Label>Domaine</Form.Label>
                  <Form.Select
                    value={ss.domaine?.id || ""}
                    onChange={e => {
                      const selected = softSkillsList.find(s => s.id === Number(e.target.value));
                      updateSoftSkill(i, "domaine", selected || { id: 0, label: "" });
                    }}
                  >
                    <option value="">Sélectionner un domaine</option>
                    {softSkillsList.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Button variant="outline-danger" onClick={() => removeSoftSkill(i)}>-</Button>
                </Col>
              </Row>
            ))}
          <Button type="button" size="sm" variant="outline-primary" onClick={addSoftSkill}>+ Ajouter un soft skill</Button>
        </section>

      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button variant="primary" onClick={handleSubmit}>{profil ? "Mettre à jour" : "Créer"}</Button>
      </Modal.Footer>
      </Modal>

      {/* Message modals - Outside Modal */}
      <CollecteLoadingMessage visible={showLoadingMessage} message="Traitement en cours..." />
      <CollecteSuccessMessage
        visible={showSuccessMessage}
        message={successMessage}
        onClose={() => setShowSuccessMessage(false)}
      />
      <CollecteErrorMessage
        visible={showErrorMessage}
        message={errorMessage}
        onClose={() => setShowErrorMessage(false)}
      />
    </>
  );
};

export default FormProfil;
