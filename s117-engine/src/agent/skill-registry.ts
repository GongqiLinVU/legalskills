import { Skill } from "../models";

const skills: Map<string, Skill> = new Map();

export function registerSkill(skill: Skill): void {
  skills.set(skill.name, skill);
}

export function getSkill(name: string): Skill | undefined {
  return skills.get(name);
}

export function getAllSkills(): Skill[] {
  return Array.from(skills.values());
}

export function getSkillNames(): string[] {
  return Array.from(skills.keys());
}
