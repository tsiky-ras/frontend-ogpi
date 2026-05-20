import { AxiosInstance } from "axios";
import { LeadSecteur } from "../../types/lead/LeadSecteur.tsx";
import { AbstractCrudService } from "../../services/profil/poste/util/AbstractCrudService.tsx";

export class LeadSecteurService extends AbstractCrudService<LeadSecteur> {
  constructor(api: AxiosInstance) {
    super(api, "/lead-secteurs");
  }
}
