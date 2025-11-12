import { TutorialLanguage, TutorialLanguageOption, TutorialStep } from '../types';

interface TutorialStepCopy {
  title: string;
  explanation: string;
  action: string;
}

interface TutorialStepDefinition
  extends Omit<TutorialStep, 'title' | 'explanation' | 'action'> {
  copy: Record<TutorialLanguage, TutorialStepCopy>;
}

export const DEFAULT_TUTORIAL_LANGUAGE: TutorialLanguage = 'en';

export const tutorialLanguageOptions: TutorialLanguageOption[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

const tutorialStepDefinitions: TutorialStepDefinition[] = [
  {
    target: '#create-new-project-button',
    showNextButton: true,
    copy: {
      en: {
        title: 'Welcome to Creative Atlas!',
        explanation:
          'This guided tour will help you spin up your first world, link its lore, and publish it for collaborators.',
        action: 'Open the create project menu',
      },
      es: {
        title: '¡Bienvenido a Creative Atlas!',
        explanation:
          'Este recorrido guiado te ayudará a iniciar tu primer mundo, enlazar su lore y publicarlo para tus colaboradores.',
        action: 'Abre el menú para crear un proyecto',
      },
    },
  },
  {
    target: '#create-project-form',
    advanceEvent: 'submit',
    prefill: {
      '#project-title': 'Aethelgard',
      '#project-summary':
        'Aethelgard is a realm where fading magic collides with clockwork ingenuity. Use this tutorial project as your sandbox.',
    },
    copy: {
      en: {
        title: 'Name your world',
        explanation:
          'Give your world a title and summary. We prefilled the Aethelgard example so you can review the fields before submitting.',
        action: 'Review and create the project',
      },
      es: {
        title: 'Nombra tu mundo',
        explanation:
          'Asigna un título y un resumen a tu mundo. Prellenamos el ejemplo de Aethelgard para que puedas revisar los campos antes de enviarlo.',
        action: 'Revisa y crea el proyecto',
      },
    },
  },
  {
    target: '#project-hero-panel',
    showNextButton: true,
    copy: {
      en: {
        title: 'Tour the world hub',
        explanation:
          'The hero panel summarizes tags, XP, and quick stats. Use these badges to understand the health of your world at a glance.',
        action: 'Explore the hero stats below',
      },
      es: {
        title: 'Recorre el centro de tu mundo',
        explanation:
          'El panel principal resume etiquetas, XP y estadísticas rápidas. Usa estas insignias para entender la salud de tu mundo de un vistazo.',
        action: 'Explora las estadísticas principales',
      },
    },
  },
  {
    target: '#add-new-artifact-button',
    copy: {
      en: {
        title: 'Create your first artifact',
        explanation:
          'Artifacts store the stories, locations, mechanics, and relationships that define your world. Start by adding a wiki artifact.',
        action: 'Open the new artifact modal',
      },
      es: {
        title: 'Crea tu primer artefacto',
        explanation:
          'Los artefactos guardan las historias, ubicaciones, mecánicas y relaciones que definen tu mundo. Comienza agregando un artefacto wiki.',
        action: 'Abre el modal de nuevo artefacto',
      },
    },
  },
  {
    target: '#create-artifact-form',
    advanceEvent: 'submit',
    prefill: {
      '#artifact-title': 'Aethelgard Wiki',
      '#artifact-summary':
        'Collect major factions, legendary locations, and timelines that chart the realm’s shift from arcane power to clockwork.',
      '#artifact-type': 'Wiki',
    },
    copy: {
      en: {
        title: 'Draft the wiki entry',
        explanation:
          'Every artifact can include summaries, tags, and structured data. Create the starter wiki entry to hold Aethelgard’s lore.',
        action: 'Create the wiki artifact',
      },
      es: {
        title: 'Redacta la entrada de la wiki',
        explanation:
          'Cada artefacto puede incluir resúmenes, etiquetas y datos estructurados. Crea la entrada inicial de la wiki para contener el lore de Aethelgard.',
        action: 'Crea el artefacto wiki',
      },
    },
  },
  {
    target: '#artifact-relations-panel',
    showNextButton: true,
    copy: {
      en: {
        title: 'Link your lore',
        explanation:
          'Relations connect artifacts so timelines, characters, and mechanics reinforce one another. Use Add Relation to weave links.',
        action: 'Open the relation tools and connect an artifact',
      },
      es: {
        title: 'Enlaza tu lore',
        explanation:
          'Las relaciones conectan artefactos para que líneas temporales, personajes y mecánicas se refuercen entre sí. Usa Agregar relación para tejer vínculos.',
        action: 'Abre las herramientas de relaciones y conecta un artefacto',
      },
    },
  },
  {
    target: '#milestone-tracker',
    showNextButton: true,
    copy: {
      en: {
        title: 'Track momentum with milestones',
        explanation:
          'The milestone tracker measures readiness using objectives like graph coverage, exports, and publishing. Watch completion rise as you work.',
        action: 'Review the milestone tracker',
      },
      es: {
        title: 'Sigue el progreso con hitos',
        explanation:
          'El rastreador de hitos mide la preparación usando objetivos como cobertura del grafo, exportaciones y publicaciones. Observa cómo aumenta el progreso mientras trabajas.',
        action: 'Revisa el rastreador de hitos',
      },
    },
  },
  {
    target: '#publish-world-button',
    showNextButton: true,
    copy: {
      en: {
        title: 'Publish your atlas',
        explanation:
          'When you are ready to share progress, publish the atlas for collaborators or connect GitHub to deploy a static site.',
        action: 'Trigger a publish when you are ready',
      },
      es: {
        title: 'Publica tu atlas',
        explanation:
          'Cuando estés listo para compartir tu progreso, publica el atlas para colaboradores o conecta GitHub para desplegar un sitio estático.',
        action: 'Inicia una publicación cuando estés listo',
      },
    },
  },
  {
    target: '#project-insights-panel',
    showNextButton: true,
    copy: {
      en: {
        title: 'Study your analytics',
        explanation:
          'Insights highlight linked artifact coverage, quest completion, and lexicon depth so you can see where to focus next.',
        action: 'Scan the analytics cards',
      },
      es: {
        title: 'Analiza tus métricas',
        explanation:
          'Los insights resaltan la cobertura de artefactos enlazados, el progreso de misiones y la profundidad del léxico para que identifiques dónde concentrarte.',
        action: 'Revisa las tarjetas de analíticas',
      },
    },
  },
  {
    target: '#project-hero-panel',
    showNextButton: true,
    copy: {
      en: {
        title: 'Congratulations! You built your first world.',
        explanation:
          'Keep adding lore, linking artifacts, and publishing updates. Restart this tutorial anytime from the header if you need a refresher.',
        action: 'Finish',
      },
      es: {
        title: '¡Felicidades! Construiste tu primer mundo.',
        explanation:
          'Sigue agregando lore, enlazando artefactos y publicando actualizaciones. Reinicia este tutorial desde el encabezado cuando necesites un repaso.',
        action: 'Finalizar',
      },
    },
  },
];

export const getTutorialSteps = (language: TutorialLanguage = DEFAULT_TUTORIAL_LANGUAGE): TutorialStep[] =>
  tutorialStepDefinitions.map((definition) => {
    const localizedCopy = definition.copy[language] ?? definition.copy[DEFAULT_TUTORIAL_LANGUAGE];

    return {
      ...definition,
      title: localizedCopy.title,
      explanation: localizedCopy.explanation,
      action: localizedCopy.action,
    };
  });

export const tutorialSteps: TutorialStep[] = getTutorialSteps();
