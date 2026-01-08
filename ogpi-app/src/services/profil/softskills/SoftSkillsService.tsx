import { SoftSkill} from "../../../types/profil/skills/SoftSkill";
import { AbstractCrudService } from "../../profil/poste/util/AbstractCrudService.tsx";
import { AxiosInstance } from "axios";

export class SoftSkillsService extends AbstractCrudService<SoftSkill> {
  constructor(api: AxiosInstance) {
    super(api, "/soft-skills");
  }
}
