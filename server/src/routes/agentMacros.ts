export type AgentMacroAction = 'click' | 'type' | 'scroll';

export interface AgentMacroStep {
  action: AgentMacroAction;
  description: string;
}

export interface AgentMacroDefinition {
  id: string;
  label: string;
  whenToUse: string;
  steps: AgentMacroStep[];
}

export const agentMacros: AgentMacroDefinition[] = [
  {
    id: 'open_artifact_editor',
    label: 'Open artifact editor',
    whenToUse:
      'You need to inspect or edit an artifact from the workspace list view or the relationship graph.',
    steps: [
      { action: 'click', description: 'Select the artifact in the grid or graph to focus it.' },
      { action: 'scroll', description: 'Ensure the right-hand detail panel is visible.' },
      { action: 'click', description: 'Activate the "Open editor" control in the detail panel header.' },
    ],
  },
  {
    id: 'create_relation',
    label: 'Create relation between artifacts',
    whenToUse:
      'You have two artifacts in view and need to link them via the relation composer modal.',
    steps: [
      { action: 'click', description: 'Select the source artifact and open the relation menu.' },
      { action: 'click', description: 'Choose "Add relation" to launch the composer modal.' },
      { action: 'type', description: 'Fill in the relation title and optional context fields.' },
      { action: 'click', description: 'Confirm the relation to persist the connection.' },
    ],
  },
  {
    id: 'summon_agent',
    label: 'Summon Atlas Intelligence agent',
    whenToUse:
      'You need generative assistance (summaries, ideas, or edits) within the workspace.',
    steps: [
      { action: 'click', description: 'Open the Atlas Intelligence command shelf in the workspace header.' },
      { action: 'type', description: 'Describe the assistance the creator requested.' },
      { action: 'click', description: 'Submit the request and review the agent response.' },
    ],
  },
];

export const renderAgentMacrosForPrompt = (): string => {
  if (agentMacros.length === 0) {
    return '';
  }

  const lines: string[] = ['Available high-level macros (compose them into tool calls when helpful):'];

  agentMacros.forEach((macro, index) => {
    lines.push(`${index + 1}. ${macro.label} — ${macro.whenToUse}`);
    macro.steps.forEach((step, stepIndex) => {
      lines.push(`   ${stepIndex + 1}. [${step.action}] ${step.description}`);
    });
  });

  return lines.join('\n');
};
