import React, { useMemo } from "react";
import ConfigEntityPage from "./ConfigEntityPage.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { CertificationService } from "../../../../services/profil/certifications/CertificationService.tsx";
import { Certification } from "../../../../types/profil/certification/Certification.tsx";

const CertificationPage: React.FC = () => {
  const { api } = useAuth();
  const certificationService = useMemo(() => new CertificationService(api), [api]);
  return (
    <ConfigEntityPage<Certification>
      title="Gestion des Certifications"
      entityLabel="label"
      entityName="Certification"
      service={certificationService}
    />
  );
};

export default CertificationPage;
