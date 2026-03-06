import React from "react";
import { Row, Col } from "react-bootstrap";

type DetailsOffreTechProps = {
  lead?: any | null;
};

const DetailsOffreTech: React.FC<DetailsOffreTechProps> = ({ lead }) => {
  if (!lead?.techFinDetails) {
    return (
      <div className="details-lead-body">
        <p className="text-muted">Aucune offre technique & financière disponible</p>
      </div>
    );
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
                      .map((t: any) => {
                        // Gérer différentes structures possibles
                        if (t.techno?.nomTechno) return t.techno.nomTechno;
                        if (t.nomTechno) return t.nomTechno;
                        return null;
                      })
                      .filter((name: any) => name !== null)
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
              <p>{techFin.devise?.abrDevise || techFin.devise?.nomDevise || "-"}</p>
            </div>
          </Col>

          <Col md={4}>
            <div className="detail-item">
              <label>Montant de l'offre</label>
              <p>
                {techFin.montantOffre != null && techFin.montantOffre !== 0
                  ? `${techFin.montantOffre.toLocaleString()} ${techFin.devise?.abrDevise || ""}`
                  : "-"}
              </p>
            </div>
          </Col>

          <Col md={4}>
            <div className="detail-item">
              <label>Budget nécessaire</label>
              <p>
                {techFin.budget != null && techFin.budget !== 0
                  ? `${techFin.budget.toLocaleString()} ${techFin.devise?.abrDevise || ""}`
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
              <label>Date d'attribution</label>
              <p>
                {techFin.dateAttribution
                  ? new Date(techFin.dateAttribution).toLocaleDateString("fr-FR")
                  : "-"}
              </p>
            </div>
          </Col>
        </Row>
      </section>

      {/* ================= Backlog Summary (volumeJHVenduEtMontant) ================= */}
      {techFin.volumeJHVenduEtMontant && techFin.volumeJHVenduEtMontant.length > 0 && (
        <section className="details-section">
          <h5>Résumé Backlog</h5>
          {techFin.volumeJHVenduEtMontant.map((backlog: any, idx: number) => (
            <div key={idx} className="mb-3">
              <h6>{backlog.nomBacklog}</h6>
              <Row className="g-2">
                <Col md={6}>
                  <div className="detail-item">
                    <label>Total Volume JH</label>
                    <p><strong>{backlog.totalVolumeJHBacklog?.toFixed(2) || 0}</strong></p>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="detail-item">
                    <label>Total Montant</label>
                    <p>
                      <strong>
                        {backlog.totalMontantBacklog?.toLocaleString() || 0} {techFin.devise?.abrDevise || ""}
                      </strong>
                    </p>
                  </div>
                </Col>
              </Row>

              {/* Lots */}
              {backlog.lots && backlog.lots.length > 0 && (
                <div className="mt-2 ps-3">
                  {backlog.lots.map((lot: any, lotIdx: number) => (
                    <div key={lotIdx} className="mb-2">
                      <small className="text-muted">
                        <strong>{lot.nomLot}</strong> - 
                        Volume: {lot.totalVolumeJHLot?.toFixed(2) || 0} JH | 
                        Montant: {lot.totalMontantLot?.toLocaleString() || 0} {techFin.devise?.abrDevise || ""}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
};

export default DetailsOffreTech;