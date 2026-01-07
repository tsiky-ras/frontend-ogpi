import React from "react";
import ConfigEntityPage from "./ConfigEntityPage.tsx";
import { SoftSkill } from "../../../../types/profil/skills/SoftSkill.tsx";

const SoftSkillPage: React.FC = () => {
  return (
    <ConfigEntityPage<SoftSkill>
      title="Gestion des Soft Skills"
      entityLabel="label"
      entityName="Soft Skill"
      initialData={[]}
    />
  );
};

export default SoftSkillPage;
