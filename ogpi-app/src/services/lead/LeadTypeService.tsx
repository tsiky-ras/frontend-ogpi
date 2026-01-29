import { AxiosInstance } from "axios";
import { LeadType } from "../../types/lead/LeadType.tsx";
import { AbstractCrudService } from "../../services/profil/poste/util/AbstractCrudService.tsx";

export class LeadTypeService extends AbstractCrudService<LeadType> {
  constructor(api: AxiosInstance) {
    super(api, "/lead-types");
  }
}
