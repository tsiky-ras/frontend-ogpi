import { AxiosInstance } from "axios";
import { AbstractCrudService } from "../../profil/poste/util/AbstractCrudService.tsx";
import { HardSkill } from "../../../types/profil/skills/HardSkill.tsx";

export class HardSkillsService extends AbstractCrudService<HardSkill> {
  constructor(api: AxiosInstance) {
    super(api, "/hard-skills");
  }
}
