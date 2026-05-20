import React, { useMemo } from "react";
import ConfigEntityPage from "./ConfigEntityPage.tsx";
import { HardSkill } from "../../../../types/profil/skills/HardSkill.tsx";
import { useAuth } from "../../../../context/AuthContext.tsx";
import { HardSkillsService } from "../../../../services/profil/hardskills/HardSkillsService.tsx";

const HardSkillPage: React.FC = () => {
  const { api } = useAuth();
  const hardSkillService = useMemo(() => new HardSkillsService(api), [api]);
  
  return (
    <ConfigEntityPage<HardSkill>
      title="Gestion des Hard Skills"
      entityLabel="name"
      entityName="Hard Skill"
      service={hardSkillService}
    />
  );
};

export default HardSkillPage;
