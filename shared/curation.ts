import type { Project, Settings } from "./types.js";
export const selectedProjects = [
  "Mardara-Expense-Tracker",
  "SNIPER-SHADOW",
  "TARGET-RUSH",
  "Mardara_Travel_Agent",
  "Mardara-gym-",
  "Mardara_Speed",
  "KINETIQ-STUDIO",
  "AERION-DRIVE",
  "todo-app",
  "ROYALVOWS",
  "-Nexagen-Solution-website",
];
export const ownerContact: Settings = {
  github: "https://github.com/SarimSheikh1",
  email: "sarimhatif1@gmail.com",
  phone: "+92 322 866 8488",
};
export function curateProjects(projects: Project[]): Project[] {
  return selectedProjects.flatMap((name) => {
    const project = projects.find(
      (p) => p.name === name || p.repository?.endsWith("/" + name),
    );
    return project?.published && !project.excluded && project.verified
      ? [project]
      : [];
  });
}
