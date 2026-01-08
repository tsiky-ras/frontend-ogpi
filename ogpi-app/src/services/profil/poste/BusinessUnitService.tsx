import { AbstractCrudService } from "../poste/util/AbstractCrudService.tsx";
import { BusinessUnit } from "../../types/profil/poste/BusinessUnit";
import { AxiosInstance } from "axios";

export class BusinessUnitService extends AbstractCrudService<BusinessUnit> {
  constructor(api: AxiosInstance) {
    super(api, "/business-units");
  }
}
