import React, { useMemo } from "react";
import ConfigEntityPage from "./ConfigEntityPage.tsx";
import { SoftSkill } from "../../../../types/profil/skills/SoftSkill.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { SoftSkillsService } from "../../../../services/profil/softskills/SoftSkillsService.tsx";
const SoftSkillPage: React.FC = () => {
  const { api } = useAuth();
  const softSkillsService = useMemo(() => new SoftSkillsService(api), [api]);
  return (
    <ConfigEntityPage<SoftSkill>
      title="Gestion des Soft Skills"
      entityLabel="label"
      entityName="Soft Skill"
      service={softSkillsService}
    />
  );
};

export default SoftSkillPage;
