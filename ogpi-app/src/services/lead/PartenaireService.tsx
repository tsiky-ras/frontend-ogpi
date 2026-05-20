import { AxiosInstance } from "axios";
import { Partenaire } from "../../types/lead/Partenaire.tsx";
import { AbstractCrudService } from "../../services/profil/poste/util/AbstractCrudService.tsx";

export class PartenaireService extends AbstractCrudService<Partenaire> {
  constructor(api: AxiosInstance) {
    super(api, "/partenaires");
  }
}
