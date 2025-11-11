import { TutorialLanguage } from '../types';

export interface OnboardingBannerCopy {
  headline: string;
  subheading: string;
  description: string;
  learnMoreLabel: string;
  learnMoreHref: string;
  dismissLabel: string;
}

export interface DocumentationHubCopy {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  restartTutorialLabel: string;
}

export interface SupportFaqEntry {
  id: string;
  question: string;
  answer: string;
}

export interface SupportTooltips {
  createProject: string;
  loadMoreProjects: string;
  newArtifact: string;
  captureFact: string;
  publishProject: string;
}

export interface SupportContent {
  onboardingBanner: OnboardingBannerCopy;
  documentationHub: DocumentationHubCopy;
  faqSectionTitle: string;
  faqs: SupportFaqEntry[];
  tooltips: SupportTooltips;
}

const supportContentByLanguage: Record<TutorialLanguage, SupportContent> = {
  en: {
    onboardingBanner: {
      headline: 'New to Creative Atlas?',
      subheading: 'Start with the guided walkthrough or explore help docs at your own pace.',
      description:
        'The workspace sidebar highlights daily quests, achievements, and publishing milestones. Hover over key actions to learn how they reinforce your world-building flow.',
      learnMoreLabel: 'Open help center',
      learnMoreHref: 'https://creative-atlas.web.app/docs/getting-started',
      dismissLabel: 'Dismiss',
    },
    documentationHub: {
      title: 'Support & tutorials',
      description:
        'Need a refresher on graph linking, publishing, or AI co-writing? Browse the curated guides for quick answers and best practices.',
      ctaLabel: 'View documentation',
      ctaHref: 'https://creative-atlas.web.app/docs',
      restartTutorialLabel: 'Replay interactive tutorial',
    },
    faqSectionTitle: 'Frequently asked questions',
    faqs: [
      {
        id: 'graph-basics',
        question: 'How do relations influence the world graph?',
        answer:
          'Relations weave artifacts together. Link characters to locations or timelines to surface context cues in the graph and unlock milestone progress.',
      },
      {
        id: 'publishing',
        question: 'What happens when I publish my atlas?',
        answer:
          'Publishing bundles your project into a static site. Invite collaborators by sharing the generated URL or deploying to GitHub Pages from the Publish modal.',
      },
      {
        id: 'quick-facts',
        question: 'Why capture quick facts?',
        answer:
          'Quick facts store bite-sized lore sparks. They appear in hero highlights and seed prompts for Atlas Intelligence so your AI drafts stay grounded.',
      },
    ],
    tooltips: {
      createProject: 'Kick off a fresh world. Projects collect artifacts, quests, and publishing settings.',
      loadMoreProjects: 'Load older worlds and archived sandboxes into the sidebar.',
      newArtifact: 'Add lore entries, characters, or mechanics to grow this world.',
      captureFact: 'Save a rapid-fire detail without leaving your current editor.',
      publishProject: 'Export your atlas as a shareable site or GitHub Pages branch.',
    },
  },
  es: {
    onboardingBanner: {
      headline: '¿Nuevo en Creative Atlas?',
      subheading: 'Comienza con el recorrido guiado o explora la ayuda a tu propio ritmo.',
      description:
        'La barra lateral destaca las misiones diarias, logros e hitos de publicación. Pasa el cursor sobre las acciones clave para aprender cómo impulsan tu flujo creativo.',
      learnMoreLabel: 'Abrir centro de ayuda',
      learnMoreHref: 'https://creative-atlas.web.app/es/docs/primeros-pasos',
      dismissLabel: 'Cerrar',
    },
    documentationHub: {
      title: 'Soporte y tutoriales',
      description:
        '¿Necesitas un repaso sobre enlaces del grafo, publicación o coescritura con IA? Revisa las guías seleccionadas para obtener respuestas rápidas y buenas prácticas.',
      ctaLabel: 'Ver documentación',
      ctaHref: 'https://creative-atlas.web.app/es/docs',
      restartTutorialLabel: 'Reproducir tutorial interactivo',
    },
    faqSectionTitle: 'Preguntas frecuentes',
    faqs: [
      {
        id: 'graph-basics',
        question: '¿Cómo influyen las relaciones en el grafo del mundo?',
        answer:
          'Las relaciones entretejen artefactos. Enlaza personajes con ubicaciones o líneas temporales para mostrar pistas contextuales en el grafo y avanzar en los hitos.',
      },
      {
        id: 'publishing',
        question: '¿Qué ocurre cuando publico mi atlas?',
        answer:
          'La publicación empaqueta tu proyecto en un sitio estático. Invita a colaboradores compartiendo la URL generada o publica en GitHub Pages desde el modal de Publicar.',
      },
      {
        id: 'quick-facts',
        question: '¿Por qué capturar datos rápidos?',
        answer:
          'Los datos rápidos guardan chispas de lore. Aparecen en los destacados principales y alimentan las solicitudes de Atlas Intelligence para mantener los borradores con contexto.',
      },
    ],
    tooltips: {
      createProject: 'Inicia un mundo nuevo. Los proyectos reúnen artefactos, misiones y ajustes de publicación.',
      loadMoreProjects: 'Carga mundos anteriores y arenas archivadas en la barra lateral.',
      newArtifact: 'Agrega entradas de lore, personajes o mecánicas para hacer crecer este mundo.',
      captureFact: 'Guarda un detalle al instante sin salir del editor actual.',
      publishProject: 'Exporta tu atlas como un sitio compartible o una rama de GitHub Pages.',
    },
  },
};

export const getSupportContent = (language: TutorialLanguage): SupportContent =>
  supportContentByLanguage[language] ?? supportContentByLanguage.en;

