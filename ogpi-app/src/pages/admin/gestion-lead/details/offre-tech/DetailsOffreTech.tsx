import React from "react";
import { Row, Col } from "react-bootstrap";

type DetailsOffreTechProps = {
  lead?: any | null;
};

const DetailsOffreTech: React.FC<DetailsOffreTechProps> = ({ lead }) => {
  if (!lead?.techFinDetails) {
    return <p className="text-muted">Aucune offre technique & financière</p>;
  }

  const techFin = lead.techFinDetails;

  return (
    <div className="details-lead-body">
      {/* ================= Offre Technique ================= */}
      <section className="details-section">
        <h5>Offre technique</h5>
        <Row className="g-3">
          <Col md={12}>
            <div className="detail-item">
              <label>Technologies</label>
              <p>
                {techFin.technos?.length > 0
                  ? techFin.technos
                      .map(
                        (t: any) =>
                          t.nomTechno || t.techno?.nomTechno
                      )
                      .join(", ")
                  : "-"}
              </p>
            </div>
          </Col>

          <Col md={6}>
            <div className="detail-item">
              <label>Volume JH vendus</label>
              <p>{techFin.volumeJHVendu ?? "-"}</p>
            </div>
          </Col>
        </Row>
      </section>

      {/* ================= Offre Financière ================= */}
      <section className="details-section">
        <h5>Offre financière</h5>
        <Row className="g-3">
          <Col md={4}>
            <div className="detail-item">
              <label>Devise</label>
              <p>{techFin.devise?.abrDevise || "-"}</p>
            </div>
          </Col>

          <Col md={4}>
            <div className="detail-item">
              <label>Montant de l’offre</label>
              <p>
                {techFin.montantOffre != null
                  ? techFin.montantOffre.toLocaleString()
                  : "-"}{" "}
                {techFin.devise?.abrDevise || ""}
              </p>
            </div>
          </Col>

          <Col md={4}>
            <div className="detail-item">
              <label>Budget nécessaire</label>
              <p>
                {techFin.budget != null
                  ? techFin.budget.toLocaleString()
                  : "-"}
              </p>
            </div>
          </Col>
        </Row>
      </section>

      {/* ================= Conversions & Taxes ================= */}
      <section className="details-section">
        <h5>Conversions & taxes</h5>
        <Row className="g-3">
          <Col md={6}>
            <div className="detail-item">
              <label>Taux de change</label>
              <p>{techFin.tauxDeChange ?? "-"}</p>
            </div>
          </Col>

          <Col md={6}>
            <div className="detail-item">
              <label>Impôts (%)</label>
              <p>{techFin.impots ?? "-"}</p>
            </div>
          </Col>
        </Row>
      </section>

      {/* ================= Facturation ================= */}
      <section className="details-section">
        <h5>Facturation & attribution</h5>
        <Row className="g-3">
          <Col md={6}>
            <div className="detail-item">
              <label>Type de facturation</label>
              <p>
                {techFin.typeFacturation?.nomTypeFacturation || "-"}
              </p>
            </div>
          </Col>

          <Col md={6}>
            <div className="detail-item">
              <label>Date d’attribution</label>
              <p>
                {techFin.dateAttribution
                  ? new Date(
                      techFin.dateAttribution
                    ).toLocaleDateString("fr-FR")
                  : "-"}
              </p>
            </div>
          </Col>
        </Row>
      </section>
    </div>
  );
};

export default DetailsOffreTech;
