import React from "react";
import { Row, Col } from "react-bootstrap";
import "./DetailsQualif.css";

type DetailsQualifProps = {
  lead?: any | null;
};

const DetailsQualif: React.FC<DetailsQualifProps> = ({ lead }) => {
  if (!lead) return <p>Aucun lead sélectionné</p>;

  // Dates formatées
  const periodeDate = lead.leadPeriode ? new Date(lead.leadPeriode).toLocaleDateString('fr-FR') : '-';
  const internalDeadline = lead.leadInternalDeadLine ? new Date(lead.leadInternalDeadLine).toLocaleDateString('fr-FR') : '-';
  const realDeadline = lead.leadRealDeadLine ? new Date(lead.leadRealDeadLine).toLocaleDateString('fr-FR') : '-';
  const periodeLabel = lead.leadPeriode
  ? new Date(lead.leadPeriode).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    })
  : '-';

  return (
    <div className="details-qualif">
      <section>
        <h5>Informations Générales</h5>
        <Row>
          <Col md={6}>
          <label>Période</label>
          <p style={{ textTransform: 'capitalize' }}>{periodeLabel}</p>
          </Col>
          <Col md={6}>
            <label>Business Unit</label>
            <p>{lead.businessUnit?.name || '-'}</p>
          </Col>
          <Col md={12}>
            <label>Description</label>
            <p>{lead.leadDescription || '-'}</p>
          </Col>
        </Row>
      </section>

      <section>
        <h5>Détails de l'opportunité</h5>
        <Row>
          <Col md={6}>
            <label>Nom</label>
            <p>{lead.leadName || '-'}</p>
          </Col>
          <Col md={6}>
            <label>Référence</label>
            <p>{lead.leadRef || '-'}</p>
          </Col>
          <Col md={6}>
            <label>Type</label>
            <p>{lead.leadType?.label || '-'}</p>
          </Col>
          <Col md={6}>
            <label>Type de financement</label>
            <p>{lead.typeProjetFinancement?.label || '-'}</p>
          </Col>
          <Col md={6}>
            <label>Catégorie</label>
            <p>{lead.category?.label || '-'}</p>
          </Col>
        </Row>
      </section>

      <section>
        <h5>Classification</h5>
        <Row>
          <Col md={6}>
            <label>Zone</label>
            <p>{lead.leadZone === 0 ? 'Local' : 'OffShore'}</p>
          </Col>
          <Col md={6}>
            <label>Secteur</label>
            <p>{lead.leadSecteur?.label || '-'}</p>
          </Col>
        </Row>
      </section>

      <section>
        <h5>Dates et contact</h5>
        <Row>
          <Col md={6}>
            <label>Deadline interne</label>
            <p>{internalDeadline}</p>
          </Col>
          <Col md={6}>
            <label>Deadline réelle</label>
            <p>{realDeadline}</p>
          </Col>
          <Col md={6}>
            <label>Client</label>
            <p><strong>{lead.client?.name}</strong></p>
            <p className="contact-line">
              Email : <span>{lead.client?.email || '-'}</span>
            </p>
            <p className="contact-line">
              Téléphone : <span>{lead.client?.phone || '-'}</span>
            </p>
          </Col>

          <Col md={6}>
            <label>Partenaires</label>

            {lead.leadPartenaires?.length > 0 ? (
              lead.leadPartenaires.map((p: any, index: number) => (
                <div key={index} className="mb-2">
                    <strong>{p.partenaire.name}</strong>
                    <div className="contact-line">Email : <span>{p.partenaire.email || '-'}</span></div>
                    <div className="contact-line">Téléphone : <span>{p.partenaire.phone || '-'}</span></div>
                </div>
              ))
            ) : (
              <p>-</p>
            )}
          </Col>
        </Row>
      </section>

      <section>
        <h5>Ressources</h5>
        <Row>
          <Col md={6}>
            <label>Dossier Drive</label>
            <p>
              {lead.driveFolder?.link
                ? <a href={lead.driveFolder.link} target="_blank" rel="noopener noreferrer">
                    {lead.driveFolder.name || 'Voir dossier'}
                  </a>
                : '-'}
            </p>
          </Col>
          <Col md={6}>
            <label>Fichier principal / TDR</label>
            <p>
              {lead.mainDriveFile?.link
                ? <a href={lead.mainDriveFile.link} target="_blank" rel="noopener noreferrer">
                    {lead.mainDriveFile.name || 'Voir fichier'}
                  </a>
                : '-'}
            </p>
          </Col>
        </Row>
      </section>
    </div>
  );
};

export default DetailsQualif;
