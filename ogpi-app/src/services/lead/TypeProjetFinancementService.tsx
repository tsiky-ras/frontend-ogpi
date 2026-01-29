import { AxiosInstance } from "axios";
import { TypeProjetFinancement } from "../../types/lead/TypeProjetFinancement.tsx";
import { AbstractCrudService } from "../../services/profil/poste/util/AbstractCrudService.tsx";

export class TypeProjetFinancementService extends AbstractCrudService<TypeProjetFinancement> {
  constructor(api: AxiosInstance) {
    super(api, "/type-projet-financements");
  }
}
