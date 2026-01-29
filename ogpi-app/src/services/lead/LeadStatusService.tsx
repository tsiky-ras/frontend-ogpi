import { AxiosInstance } from "axios";
import { LeadStatus } from "../../types/lead/LeadStatus.tsx";
import { AbstractCrudService } from "../../services/profil/poste/util/AbstractCrudService.tsx";

export class LeadStatusService extends AbstractCrudService<LeadStatus> {
  constructor(api: AxiosInstance) {
    super(api, "/lead-status");
  }
}
