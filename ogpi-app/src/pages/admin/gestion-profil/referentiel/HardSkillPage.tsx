import React from "react";
import ConfigEntityPage from "./ConfigEntityPage.tsx";
import { HardSkill } from "../../../../types/profil/skills/HardSkill.tsx";

const HardSkillPage: React.FC = () => {
  return (
    <ConfigEntityPage<HardSkill>
      title="Gestion des Hard Skills"
      entityLabel="name"
      entityName="Hard Skill"
      initialData={[]}
    />
  );
};

export default HardSkillPage;
