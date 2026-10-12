/**
 * Seed content for the "shovon" site.
 *
 * `seed-content.json` is a verbatim snapshot of the data arrays that used to be hardcoded in
 * ../portfolio/src/components (Projects, Experience, Education, Research, Skills, About), taken
 * just before the site switched to this API. This file maps it onto the API's shapes:
 * - `var(--color-accent-*)` accents → hex (blue #3b82f6, purple #8b5cf6, cyan #06b6d4)
 * - projects `live`/`github` → `liveUrl`/`githubUrl`; education `university` → `institution`
 * - papers `duration` → `date`, `keywords` → `tags`, `paper` → `paperUrl`
 * Text that lived in JSX (Hero, About, Contact, Footer, PageLoader, layout metadata) is below.
 */
import { readFileSync } from "node:fs";
import { env } from "@/config/env";

interface Snapshot {
  projects: { title: string; type: string; duration: string; image: string; summary: string; description: string; tech: string[]; accent: string; live: string; github: string }[];
  experiences: { role: string; company: string; duration: string; type: string; accent: string; responsibilities: string[]; tech: string[] }[];
  education: { degree: string; university: string; duration?: string; status?: string; grade: string; gradeLabel: string; description: string; accent: string }[];
  papers: { title: string; duration: string; image: string; description: string; publisher: string; publisherFull: string; keywords: string[]; accent: string; paper: string }[];
  skillCategories: { title: string; icon: string; color: string; skills: { name: string; level: number }[] }[];
  techBadges: string[];
  stats: { value: string; label: string; icon: string }[];
  researchGateProfile: string;
}

const snapshot: Snapshot = JSON.parse(readFileSync(new URL("./seed-content.json", import.meta.url), "utf8"));

const CSS_VAR_HEX: Record<string, string> = {
  "var(--color-accent-blue)": "#3b82f6",
  "var(--color-accent-purple)": "#8b5cf6",
  "var(--color-accent-cyan)": "#06b6d4",
};
const hex = (color: string) => CSS_VAR_HEX[color] ?? color;

/** SEED_SITE_URL decides where the website lives (http://localhost:3000 locally, the Vercel URL in production). */
const siteOrigin = new URL(env.SEED_SITE_URL).origin;

export const seedSite = {
  name: "Shovon Portfolio",
  slug: "shovon",
  siteUrl: siteOrigin,
  allowedOrigins: [siteOrigin],
  revalidateUrl: `${siteOrigin}/api/revalidate`,
};

export const seedProfile = {
  fullName: "Md Shovon Biswas",
  shortName: "Shovon",
  greeting: "Hi, I'm Shovon",
  headline: "Frontend Developer",
  subHeadline: "Research Enthusiast",
  heroDescription:
    "Building premium digital experiences with a focus on seamless interactions, elegant UI, and robust technology. Passionate about crafting interfaces that inspire.",
  photo: "/image/shovon.jpeg",
  resumeUrl: "/resume.pdf",
  aboutParagraphs: [
    "I'm Md Shovon Biswas, a passionate Frontend Developer based in Bangladesh with a deep love for building premium digital experiences. My journey started with a curiosity for how things work on the web, and has evolved into a professional career crafting high-quality applications.",
    "Beyond developing beautiful interfaces, I actively engage in academic research, exploring the intersection of technology and data science. I believe that strong engineering and thoughtful UX design are inseparable.",
    "My goal is to contribute to projects that make a real difference — whether through elegant user interfaces, robust web applications, or meaningful research contributions.",
  ],
  traits: ["Detail-Oriented", "Creative", "Research-Driven", "Team Player"],
  stats: snapshot.stats,
  techBadges: snapshot.techBadges,
  loaderTagline: "Frontend Developer",
  footerTagline: "Frontend Developer & Research Enthusiast. Building premium digital experiences with passion and precision.",
  availability: "Available for freelance & full-time",
  contact: {
    email: "shovonbiswas.cse@gmail.com",
    phone: "+880 1776752696",
    location: "Dhaka, Bangladesh",
    heading: "Have a project in mind?",
    blurb:
      "I'm always open to discussing new opportunities, interesting projects, or research collaborations. Let's build something amazing together.",
  },
  socials: [
    { platform: "github" as const, label: "GitHub", url: "https://github.com/Imran-Shovon" },
    { platform: "linkedin" as const, label: "LinkedIn", url: "https://www.linkedin.com/in/shovon-biswas/" },
    { platform: "email" as const, label: "Email", url: "mailto:shovonbiswas.cse@gmail.com" },
    { platform: "researchgate" as const, label: "ResearchGate", url: snapshot.researchGateProfile },
  ],
  seo: {
    title: "Shovon | Premium Portfolio",
    description: "Personal premium portfolio of Md Shovon Biswas - Frontend Developer & Research Enthusiast.",
  },
};

export const seedSkillCategories = snapshot.skillCategories.map(c => ({ ...c, color: hex(c.color) }));

export const seedExperiences = snapshot.experiences.map(e => ({ ...e, accent: hex(e.accent) }));

export const seedProjects = snapshot.projects.map(({ live, github, ...p }) => ({
  ...p,
  accent: hex(p.accent),
  liveUrl: live,
  githubUrl: github,
}));

export const seedEducation = snapshot.education.map(({ university, ...e }) => ({
  ...e,
  institution: university,
  accent: hex(e.accent),
}));

export const seedPublications = snapshot.papers.map(p => ({
  title: p.title,
  date: p.duration,
  image: p.image,
  description: p.description,
  publisher: p.publisher,
  publisherFull: p.publisherFull,
  tags: p.keywords,
  accent: hex(p.accent),
  paperUrl: p.paper,
}));
