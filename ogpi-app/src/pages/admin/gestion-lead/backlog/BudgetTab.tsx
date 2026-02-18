import React, { useMemo } from "react";
import {
  BacklogLot,
  BacklogProfil,
  BacklogLine,
  BacklogLineProfil,
} from "../../../../types/lead/Backlog/Backlog.tsx";

interface BudgetTabProps {
  lots: BacklogLot[];
  profils: BacklogProfil[];
  lines: BacklogLine[];
  lineProfils: BacklogLineProfil[];
  selectedBacklogId: number | null;
}

const LOT_COLOR = "#1a6b38";
const PHASE_COLOR = "#28a745";

const BudgetTab: React.FC<BudgetTabProps> = ({
  lots,
  profils,
  lines,
  lineProfils,
  selectedBacklogId,
}) => {
  // Profils actifs (ayant au moins un volume)
  const activeProfils = useMemo(() => {
    const activeIds = new Set(
      lineProfils.filter((lp) => lp.volume > 0).map((lp) => lp.profil.id)
    );
    return profils.filter((p) => activeIds.has(p.id));
  }, [profils, lineProfils]);

  // Données budgétaires structurées par lot → phase → profil
  const budgetData = useMemo(() => {
    return lots.map((lot) => {
      const phases = (lot.phases || []).sort((a, b) => a.order - b.order);

      const phaseData = phases.map((phase) => {
        const phaseLines = lines.filter((l) => l.phaseId === phase.id);
        const phaseLineIds = phaseLines.map((l) => l.id);

        const profilBreakdown = activeProfils.map((profil) => {
          const volume = lineProfils
            .filter((lp) => phaseLineIds.includes(lp.lineId) && lp.profil.id === profil.id)
            .reduce((sum, lp) => sum + lp.volume, 0);
          const amount = volume * profil.tjm;
          return { profil, volume, amount };
        });

        const totalVolume = profilBreakdown.reduce((s, p) => s + p.volume, 0);
        const totalAmount = profilBreakdown.reduce((s, p) => s + p.amount, 0);

        return { phase, profilBreakdown, totalVolume, totalAmount };
      });

      const lotTotalVolume = phaseData.reduce((s, p) => s + p.totalVolume, 0);
      const lotTotalAmount = phaseData.reduce((s, p) => s + p.totalAmount, 0);

      return { lot, phaseData, lotTotalVolume, lotTotalAmount };
    });
  }, [lots, lines, lineProfils, activeProfils]);

  // Totaux généraux par profil
  const globalProfilTotals = useMemo(() => {
    return activeProfils.map((profil) => {
      const volume = lineProfils
        .filter((lp) => lp.profil.id === profil.id)
        .reduce((s, lp) => s + lp.volume, 0);
      return { profil, volume, amount: volume * profil.tjm };
    });
  }, [activeProfils, lineProfils]);

  const grandTotalVolume = globalProfilTotals.reduce((s, p) => s + p.volume, 0);
  const grandTotalAmount = globalProfilTotals.reduce((s, p) => s + p.amount, 0);

  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (!selectedBacklogId) {
    return (
      <div className="text-center text-muted py-5">
        <p>Veuillez sélectionner un backlog pour voir le budget.</p>
      </div>
    );
  }

  if (activeProfils.length === 0 || grandTotalAmount === 0) {
    return (
      <div className="text-center text-muted py-5">
        <p>Aucun volume saisi dans le backlog.</p>
        <p className="small">Ajoutez des volumes par profil dans l'onglet Backlog pour calculer le budget.</p>
      </div>
    );
  }

  return (
    <div>
      {/* ===== SYNTHÈSE GLOBALE ===== */}
      <div className="card mb-4 shadow-sm">
        <div
          className="card-header d-flex align-items-center justify-content-between"
          style={{ backgroundColor: LOT_COLOR }}
        >
          <div>
            <h5 className="mb-0" style={{ color: "#fff" }}>
              Budget Global
            </h5>
            <small style={{ color: "rgba(255,255,255,0.85)" }}>
              Synthèse par profil — toutes phases confondues
            </small>
          </div>
          <span
            className="badge"
            style={{
              backgroundColor: "#fff",
              color: LOT_COLOR,
              fontSize: "0.88rem",
              padding: "7px 16px",
              fontWeight: 700,
            }}
          >
            {fmt(grandTotalAmount)} 
          </span>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-bordered mb-0">
              <thead style={{ backgroundColor: "#f4faf4" }}>
                <tr>
                  <th style={{ width: "200px" }}>Profil</th>
                  <th className="text-end" style={{ width: "120px" }}>TJM</th>
                  <th className="text-end" style={{ width: "120px" }}>Volume (JH)</th>
                  <th className="text-end" style={{ width: "150px" }}>Montant</th>
                  <th style={{ minWidth: "160px" }}>Répartition</th>
                </tr>
              </thead>
              <tbody>
                {globalProfilTotals.map(({ profil, volume, amount }) => {
                  const pct = grandTotalAmount > 0 ? (amount / grandTotalAmount) * 100 : 0;
                  return (
                    <tr key={profil.id}>
                      <td>
                        <span
                          className="badge me-2"
                          style={{ backgroundColor: LOT_COLOR, fontSize: "0.7rem" }}
                        >
                          {profil.name}
                        </span>
                      </td>
                      <td className="text-end">{fmt(profil.tjm)}</td>
                      <td className="text-end">{fmt(volume)}</td>
                      <td className="text-end fw-semibold">{fmt(amount)}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            style={{
                              flex: 1,
                              height: "10px",
                              backgroundColor: "#e9ecef",
                              borderRadius: "5px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                backgroundColor: LOT_COLOR,
                                borderRadius: "5px",
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                          <small className="text-muted" style={{ minWidth: "38px", textAlign: "right" }}>
                            {pct.toFixed(1)}%
                          </small>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: "#f0f7f0", fontWeight: 700 }}>
                  <td colSpan={2}>TOTAL GÉNÉRAL</td>
                  <td className="text-end">{fmt(grandTotalVolume)} JH</td>
                  <td className="text-end" style={{ color: LOT_COLOR }}>{fmt(grandTotalAmount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ===== DÉTAIL PAR LOT ET PHASE ===== */}
      {budgetData.map(({ lot, phaseData, lotTotalVolume, lotTotalAmount }) => (
        <div key={lot.id} className="card mb-4 shadow-sm">
          <div
            className="card-header d-flex align-items-center justify-content-between"
            style={{ backgroundColor: PHASE_COLOR }}
          >
            <div>
              <h6 className="mb-0" style={{ color: "#fff", fontWeight: 700 }}>
                {lot.name}
              </h6>
              {lot.desc && (
                <small style={{ color: "rgba(255,255,255,0.8)" }}>{lot.desc}</small>
              )}
            </div>
            <div className="d-flex gap-3 align-items-center">
              <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.82rem" }}>
                {fmt(lotTotalVolume)} JH
              </span>
              <span
                className="badge"
                style={{
                  backgroundColor: "#fff",
                  color: PHASE_COLOR,
                  fontSize: "0.85rem",
                  padding: "5px 12px",
                  fontWeight: 700,
                }}
              >
                {fmt(lotTotalAmount)}
              </span>
            </div>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-bordered mb-0" style={{ fontSize: "0.85rem" }}>
                <thead style={{ backgroundColor: "#f8fbf8" }}>
                  <tr>
                    <th style={{ width: "180px" }}>Phase</th>
                    {activeProfils.map((p) => (
                      <th key={p.id} className="text-end" colSpan={2} style={{ minWidth: "160px" }}>
                        {p.name}
                        <br />
                        <small className="text-muted fw-normal">({fmt(p.tjm)} /j)</small>
                      </th>
                    ))}
                    <th className="text-end" style={{ minWidth: "120px" }}>
                      Total JH
                    </th>
                    <th className="text-end" style={{ minWidth: "130px" }}>
                      Total 
                    </th>
                    <th style={{ minWidth: "130px" }}>Part lot</th>
                  </tr>
                  <tr style={{ backgroundColor: "#edf7ed", fontSize: "0.75rem" }}>
                    <th></th>
                    {activeProfils.map((p) => (
                      <React.Fragment key={p.id}>
                        <th className="text-end text-muted fw-normal">JH</th>
                      </React.Fragment>
                    ))}
                    <th></th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {phaseData.map(({ phase, profilBreakdown, totalVolume, totalAmount }) => {
                    const pctOfLot =
                      lotTotalAmount > 0 ? (totalAmount / lotTotalAmount) * 100 : 0;
                    return (
                      <tr key={phase.id}>
                        <td>
                          <strong>{phase.name}</strong>
                        </td>
                        {profilBreakdown.map(({ profil, volume, amount }) => (
                          <React.Fragment key={profil.id}>
                            <td className="text-end">
                              {volume > 0 ? (
                                <span className="fw-semibold">{fmt(volume)}</span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td className="text-end">
                              {amount > 0 ? (
                                <span style={{ color: "#555" }}>{fmt(amount)}</span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                          </React.Fragment>
                        ))}
                        <td className="text-end fw-semibold">{totalVolume > 0 ? fmt(totalVolume) : "—"}</td>
                        <td className="text-end fw-bold" style={{ color: LOT_COLOR }}>
                          {totalAmount > 0 ? fmt(totalAmount) : "—"}
                        </td>
                        <td>
                          {totalAmount > 0 ? (
                            <div className="d-flex align-items-center gap-1">
                              <div
                                style={{
                                  flex: 1,
                                  height: "8px",
                                  backgroundColor: "#e9ecef",
                                  borderRadius: "4px",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${pctOfLot}%`,
                                    height: "100%",
                                    backgroundColor: PHASE_COLOR,
                                    borderRadius: "4px",
                                  }}
                                />
                              </div>
                              <small className="text-muted" style={{ minWidth: "36px", textAlign: "right" }}>
                                {pctOfLot.toFixed(0)}%
                              </small>
                            </div>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: "#f0f7f0", fontWeight: 700 }}>
                    <td>TOTAL {lot.name}</td>
                    {activeProfils.map((profil) => {
                      const lotProfilVolume = phaseData.reduce((s, pd) => {
                        const pb = pd.profilBreakdown.find((b) => b.profil.id === profil.id);
                        return s + (pb?.volume || 0);
                      }, 0);
                      const lotProfilAmount = phaseData.reduce((s, pd) => {
                        const pb = pd.profilBreakdown.find((b) => b.profil.id === profil.id);
                        return s + (pb?.amount || 0);
                      }, 0);
                      return (
                        <React.Fragment key={profil.id}>
                          <td className="text-end">{lotProfilVolume > 0 ? fmt(lotProfilVolume) : "—"}</td>
                          <td className="text-end">{lotProfilAmount > 0 ? fmt(lotProfilAmount) : "—"}</td>
                        </React.Fragment>
                      );
                    })}
                    <td className="text-end">{fmt(lotTotalVolume)} JH</td>
                    <td className="text-end" style={{ color: LOT_COLOR }}>
                      {fmt(lotTotalAmount)} 
                    </td>
                    <td>
                      <small className="text-muted">
                        {grandTotalAmount > 0
                          ? `${((lotTotalAmount / grandTotalAmount) * 100).toFixed(1)}% du total`
                          : ""}
                      </small>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ))}

      {/* ===== RÉCAPITULATIF FINAL ===== */}
      <div className="card shadow-sm" style={{ border: `2px solid ${LOT_COLOR}` }}>
        <div className="card-header" style={{ backgroundColor: LOT_COLOR }}>
          <h6 className="mb-0" style={{ color: "#fff" }}>
            Récapitulatif — Budget par lot
          </h6>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-bordered mb-0">
              <thead style={{ backgroundColor: "#f4faf4" }}>
                <tr>
                  <th>Lot</th>
                  <th className="text-end">Volume (JH)</th>
                  <th className="text-end">Budget</th>
                  <th style={{ minWidth: "160px" }}>Part du total</th>
                </tr>
              </thead>
              <tbody>
                {budgetData.map(({ lot, lotTotalVolume, lotTotalAmount }) => {
                  const pct =
                    grandTotalAmount > 0 ? (lotTotalAmount / grandTotalAmount) * 100 : 0;
                  return (
                    <tr key={lot.id}>
                      <td>
                        <strong style={{ color: LOT_COLOR }}>{lot.name}</strong>
                        {lot.desc && (
                          <div className="text-muted small">{lot.desc}</div>
                        )}
                      </td>
                      <td className="text-end">{fmt(lotTotalVolume)}</td>
                      <td className="text-end fw-semibold">{fmt(lotTotalAmount)}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            style={{
                              flex: 1,
                              height: "12px",
                              backgroundColor: "#e9ecef",
                              borderRadius: "6px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                backgroundColor: LOT_COLOR,
                                borderRadius: "6px",
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                          <small className="fw-semibold" style={{ minWidth: "40px", color: LOT_COLOR }}>
                            {pct.toFixed(1)}%
                          </small>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: "#f0f7f0", fontWeight: 700, fontSize: "0.95rem" }}>
                  <td>TOTAL GÉNÉRAL</td>
                  <td className="text-end">{fmt(grandTotalVolume)} JH</td>
                  <td className="text-end" style={{ color: LOT_COLOR, fontSize: "1rem" }}>
                    {fmt(grandTotalAmount)} 
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetTab;