import React from "react";
import { Profil } from "../../../../types/profil/Profil.tsx";
import { Modal, Button } from "react-bootstrap";
import "./FicheProfil.css";

type FicheProfilProps = {
  profil: Profil | null;
  onClose: () => void;
};

const FicheProfil: React.FC<FicheProfilProps> = ({ profil, onClose }) => {
  if (!profil) return null;

  const getPosteActuel = () => profil.postes?.find((p: any) => !p.endDate) || null;
  const getYear = (dateStr?: string) => (dateStr ? new Date(dateStr).getFullYear() : "—");

  // Map properties from possible back-end shapes to the schema provided
  const profilType = (profil as any).profil_type ?? (profil as any).type_profil ?? null;
  const profilContrat = (profil as any).profil_contrat ?? (profil as any).type_contrat ?? (profil as any).typeContrat ?? null;
  const profilSexe = (profil as any).profil_sexe ?? (profil as any).sexe ?? null;
  const profilMatricule = (profil as any).profil_matricule ?? profil.matricule ?? "—";
  const profilAppelation = (profil as any).profil_appelation ?? (profil as any).appelation ?? (profil as any).appelationLabel ?? "—";
  const profilPoste = (profil as any).profil_poste ?? getPosteActuel()?.poste?.label ?? (profil as any).poste ?? "—";
  const profilEmailPro = (profil as any).profil_email_pro ?? (profil as any).email_pro ?? (profil as any).email ?? "—";
  const profilEmailPerso = (profil as any).profil_email_perso ?? (profil as any).email_perso ?? "—";
  const profilTelephone = (profil as any).profil_telephone ?? profil.telephone ?? profil.phone ?? "—";

  const dateEmbauche = (profil as any).profil_date_embauche ?? (profil as any).date_embauche ?? (profil as any).dateEmbauche ?? undefined;
  const dateIntegration = (profil as any).profil_date_integr ?? (profil as any).date_integration ?? undefined;
  const dateDebauche = (profil as any).profil_date_debauche ?? (profil as any).date_debauche ?? undefined;
  const dateNaissance = (profil as any).profil_date_naissance ?? (profil as any).date_naissance ?? (profil as any).dateNaissance ?? undefined;

  const expAvant = (profil as any).profil_exp_avant ?? profil.experience_avant ?? 0;
  const getSexLabel = (s?: number | null) => {
    if (s === 1) return "Masculin";
    if (s === 2) return "Féminin";
    return "—";
  };

    const getContractLabel = (c?: number) => {
    switch (c) {
      case 1:
        return "CDI";
      case 2:
        return "CDD";
      case 3:
        return "STAGE";
      default:
        return "—";
    }
  };
  return (
    <Modal show={!!profil} onHide={onClose} size="lg" centered className="fiche-profil-modal">
      <Modal.Header closeButton>
        <Modal.Title>Fiche de {profil.prenom} {profil.nom}</Modal.Title>
      </Modal.Header>

      <Modal.Body className="fiche-profil-body">
        {/* Sticker Type de collaborateur */}
        <div className="type-collab-badge-wrapper">
          <span className={`type-collab-badge ${profil.type_profil === 1 ? "interne" : "externe"}`}>
            {profil.type_profil === 1 ? "Collaborateur interne" : "Collaborateur externe"}
          </span>
        </div>

        {/* ===== Identité professionnelle ===== */}
        <section className="fiche-section">
          <h4>1. Identité professionnelle</h4>
          <div className="fiche-grid">
            <div>
              <strong>Matricule :</strong> {profilMatricule}
            </div>
            <div>
              <strong>Nom :</strong> {profil.nom ?? profil.nom}
            </div>
            <div>
              <strong>Prénom :</strong> {profil.prenom ?? profil.prenom}
            </div>
            <div>
              <strong>Date de naissance :</strong> {dateNaissance ? new Date(dateNaissance).toLocaleDateString() : '—'}
            </div>
            <div>
              <strong>Appellation :</strong> {profilAppelation}
            </div>
            <div>
              <strong>Sexe :</strong> {getSexLabel(profilSexe)}
            </div>
            <div>
              <strong>Poste actuel / Rôle :</strong> {profilPoste}
            </div>
            <div>
              <strong>BU d’appartenance :</strong> {getPosteActuel()?.bu?.name ?? "—"}
            </div>
            <div>
              <strong>Seniorité (années) :</strong> {expAvant}
            </div>
            <div>
              <strong>Email pro :</strong> {profilEmailPro}
            </div>
            <div>
              <strong>Email perso :</strong> {profilEmailPerso}
            </div>
            <div>
              <strong>Téléphone :</strong> {profilTelephone}
            </div>
          </div>
        </section>

        {/* ===== Contrat & Dates ===== */}
        <section className="fiche-section">
          <h4>2. Contrat & Dates</h4>
          <div className="fiche-grid">
            <div>
              <strong>Type de profil :</strong>{' '}
              {profil.type_profil === 1 ? "Collaborateur interne" : "Collaborateur externe"}
            </div>
            <div>
              <strong>Type de contrat :</strong> {getContractLabel(profil.type_contrat)}
            </div>
            <div>
              <strong>Date d'embauche :</strong> {dateEmbauche ? new Date(dateEmbauche).toLocaleDateString() : '—'}
            </div>
            <div>
              <strong>Date d'intégration :</strong> {dateIntegration ? new Date(dateIntegration).toLocaleDateString() : '—'}
            </div>
            <div>
              <strong>Date de fin / débauche :</strong> {dateDebauche ? new Date(dateDebauche).toLocaleDateString() : '—'}
            </div>
          </div>
        </section>

        {/* ===== Diplômes ===== */}
        <section className="fiche-section">
          <h4>2. Diplômes</h4>
          {profil.etudes.length === 0 && <p>Aucun diplôme renseigné</p>}
          {profil.etudes.map(e => (
            <div className="fiche-grid" key={e.profilEtudeId}>
              <div>
                <strong>Niveau d’étude :</strong> {e.diplome.label}
              </div>
              <div>
                <strong>Université / Établissement :</strong> {e.etablissement.label}
              </div>
              <div>
                <div>
                <strong>Année d’obtention :</strong> {getYear(e.obtention)}
                </div>
              </div>
              <div>
                <strong>Pièce jointe :</strong> 
                <a href="#" className="fiche-link"> Télécharger PDF</a>
              </div>
            </div>
          ))}
        </section>

        {/* ===== Certifications ===== */}
        <section className="fiche-section">
          <h4>3. Certifications</h4>
          {profil.certifications.length === 0 && <p>Aucune certification</p>}
          {profil.certifications.map(c => (
            <div className="fiche-grid" key={c.id}>
              <div>
                <strong>Nom :</strong> {c.label}
              </div>
              <div>
                <strong>Organisme :</strong> {c.organisme.label}
              </div>
              <div>
                <strong>Date d’obtention :</strong> {c.obtention}
              </div>
              <div>
                <strong>Niveau / Score :</strong> {c.score ?? "—"}
              </div>
              <div>
                <strong>Badge numérique :</strong>{' '}
                {c.badge ? (
                  <a href={c.badge} target="_blank" rel="noreferrer" className="fiche-badge-link">
                    <span>{c.label}</span>
                  </a>
                ) : (
                  "—"
                )}
              </div>
            </div>
          ))}
        </section>

        {/* ===== Hard Skills ===== */}
        <section className="fiche-section">
          <h4>4. Hard Skills</h4>
          {profil.hard_skills.length === 0 && <p>Aucune compétence technique</p>}
          {profil.hard_skills.map(h => (
            <div className="fiche-grid" key={h.id}>
              <div>
                <strong>Compétence :</strong> {h.domaine.label}
              </div>
              <div>
                <strong>Niveau :</strong> {h.niveau}
              </div>
            </div>
          ))}
        </section>

        {/* ===== Soft Skills ===== */}
        <section className="fiche-section">
          <h4>5. Soft Skills</h4>

          {profil.soft_skills && profil.soft_skills.length > 0 ? (
            <ul className="soft-skills-list">
              {profil.soft_skills.map(s => (
                <li key={s.id}>
                  {s.domaine.label}
                </li>
              ))}
            </ul>
          ) : (
            <p>Aucune soft skill</p>
          )}
        </section>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Fermer
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FicheProfil;
