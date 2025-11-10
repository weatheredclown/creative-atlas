const DEFAULT_RUNTIME_ENUMS = ['ArtifactType', 'ProjectStatus'];

const resolveRuntimeEnums = (options) => {
  if (!options || typeof options !== 'object') {
    return DEFAULT_RUNTIME_ENUMS;
  }

  const { runtimeEnums } = options;

  if (Array.isArray(runtimeEnums) && runtimeEnums.length > 0) {
    return runtimeEnums;
  }

  return DEFAULT_RUNTIME_ENUMS;
};

const getImportedName = (specifier) => {
  if (specifier.type === 'ImportSpecifier') {
    if (specifier.imported.type === 'Identifier') {
      return specifier.imported.name;
    }

    return specifier.imported.value;
  }

  return specifier.local?.name ?? null;
};

const reportIfRuntimeEnum = (context, runtimeEnums, node, name) => {
  if (name && runtimeEnums.has(name)) {
    context.report({
      node,
      messageId: 'typeImport',
      data: { name },
    });
  }
};

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow type-only imports for runtime enums that must exist at runtime.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          runtimeEnums: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      typeImport: 'Do not use a type-only import for runtime enum "{{name}}". Import it as a value instead.',
    },
  },
  create(context) {
    const runtimeEnums = new Set(resolveRuntimeEnums(context.options[0]));

    return {
      ImportDeclaration(node) {
        if (node.importKind === 'type') {
          for (const specifier of node.specifiers) {
            const name = getImportedName(specifier);
            reportIfRuntimeEnum(context, runtimeEnums, specifier, name);
          }
          return;
        }

        for (const specifier of node.specifiers) {
          if (specifier.importKind === 'type') {
            const name = getImportedName(specifier);
            reportIfRuntimeEnum(context, runtimeEnums, specifier, name);
          }
        }
      },
      TSImportEqualsDeclaration(node) {
        if (node.isTypeOnly && node.id) {
          reportIfRuntimeEnum(context, runtimeEnums, node.id, node.id.name);
        }
      },
    };
  },
};

export default {
  rules: {
    'no-type-import-runtime-enum': rule,
  },
};
