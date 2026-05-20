import React from "react";
import ConfigEntityPage from "../../gestion-profil/referentiel/ConfigEntityPage.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { LeadSecteur } from "../../../../types/lead/LeadSecteur.tsx";
import { LeadSecteurService } from "../../../../services/lead/LeadSecteurService.tsx";

const LeadSecteurPage: React.FC = () => {
  const { api } = useAuth();
  const leadSecteurService = new LeadSecteurService(api);

  return (
    <ConfigEntityPage<LeadSecteur>
      title="Gestion des secteurs d'opportunités"
      entityLabel="label"     
      entityName="Secteur"
      service={leadSecteurService}
    />
  );
};

export default LeadSecteurPage;
