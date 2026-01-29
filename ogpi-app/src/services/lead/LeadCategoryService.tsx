import { AxiosInstance } from "axios";
import { LeadCategory } from "../../types/lead/LeadCategory.tsx";
import { AbstractCrudService } from "../../services/profil/poste/util/AbstractCrudService.tsx";

export class LeadCategoryService extends AbstractCrudService<LeadCategory> {
  constructor(api: AxiosInstance) {
    super(api, "/lead-categories");
  }
}
