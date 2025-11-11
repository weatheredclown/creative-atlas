export interface PromptStructure {
  name: string;
  args: string[];
}

export const parsePromptStructure = (input: string): PromptStructure | null => {
  const match = input.match(/^([a-z0-9_]+)\s*\((.*)\)\s*$/i);
  if (!match) {
    return null;
  }

  const [, name, argsPart] = match;
  const rawArgs = argsPart.split(',').map((argument) => argument.trim());
  const args = rawArgs.length === 1 && rawArgs[0] === '' ? [] : rawArgs;

  return { name, args };
};
