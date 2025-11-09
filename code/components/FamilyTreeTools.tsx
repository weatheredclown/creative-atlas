import React, { useMemo } from 'react';
import { Artifact, ArtifactType, CharacterData } from '../types';
import { UserCircleIcon, LinkIcon, PlusIcon } from './Icons';

type FamilyTreeToolsProps = {
  artifacts: Artifact[];
  onSelectCharacter?: (id: string) => void;
  onCreateCharacter?: () => void;
};

type FamilyTreeNode = {
  character: Artifact;
  children: FamilyTreeNode[];
  partners: Artifact[];
  siblings: Artifact[];
};

type RelationshipSummary = {
  character: Artifact;
  parents: number;
  children: number;
  partners: number;
  siblings: number;
};

type RelationshipMaps = {
  parentMap: Map<string, Set<string>>;
  childMap: Map<string, Set<string>>;
  partnerMap: Map<string, Set<string>>;
  siblingMap: Map<string, Set<string>>;
};

const PARTNER_RELATION_KINDS = new Set(['PARTNER_OF', 'MARRIED_TO', 'SPOUSE_OF']);

const ensureSet = (map: Map<string, Set<string>>, key: string): Set<string> => {
  if (!map.has(key)) {
    map.set(key, new Set());
  }

  return map.get(key)!;
};

const sanitizeRelationKind = (kind: string): string => kind.trim().toUpperCase();

const createFamilyTreeNode = (
  id: string,
  maps: RelationshipMaps,
  characterMap: Map<string, Artifact>,
  visited: Set<string>,
): FamilyTreeNode => {
  const character = characterMap.get(id);
  if (!character) {
    throw new Error(`Family tree tried to reference unknown character: ${id}`);
  }

  const nextVisited = new Set(visited);
  nextVisited.add(id);

  const partnerIds = Array.from(maps.partnerMap.get(id) ?? []);
  const siblingIds = Array.from(maps.siblingMap.get(id) ?? []);
  const childIds = Array.from(maps.childMap.get(id) ?? []);

  const sortByTitle = (a: string, b: string) => {
    const aTitle = characterMap.get(a)?.title ?? '';
    const bTitle = characterMap.get(b)?.title ?? '';
    return aTitle.localeCompare(bTitle);
  };

  const partners = partnerIds
    .filter((partnerId) => characterMap.has(partnerId))
    .sort(sortByTitle)
    .map((partnerId) => characterMap.get(partnerId)!)
    .filter(Boolean);

  const siblings = siblingIds
    .filter((siblingId) => siblingId !== id && characterMap.has(siblingId))
    .sort(sortByTitle)
    .map((siblingId) => characterMap.get(siblingId)!)
    .filter(Boolean);

  const isCanonicalParentForChild = (childId: string) => {
    const parentIds = Array.from(maps.parentMap.get(childId) ?? []);
    if (parentIds.length <= 1) {
      return true;
    }

    const orderedParents = parentIds
      .filter((parentId) => characterMap.has(parentId))
      .sort(sortByTitle);

    if (orderedParents.length === 0) {
      return true;
    }

    return orderedParents[0] === id;
  };

  const children = childIds
    .filter((childId) => !visited.has(childId) && characterMap.has(childId))
    .filter(isCanonicalParentForChild)
    .sort(sortByTitle)
    .map((childId) => createFamilyTreeNode(childId, maps, characterMap, nextVisited));

  return {
    character,
    partners,
    siblings,
    children,
  };
};

const extractCharacterDescriptor = (artifact: Artifact): string | undefined => {
  const data = artifact.data as CharacterData | undefined;
  if (!data) {
    return undefined;
  }

  const ageTrait = data.traits?.find((trait) => trait.key.toLowerCase() === 'age');
  if (ageTrait) {
    return `${ageTrait.key}: ${ageTrait.value}`;
  }

  if (data.traits && data.traits.length > 0) {
    const [firstTrait] = data.traits;
    return `${firstTrait.key}: ${firstTrait.value}`;
  }

  return undefined;
};

const FamilyTreeTools: React.FC<FamilyTreeToolsProps> = ({ artifacts, onSelectCharacter, onCreateCharacter }) => {
  const { characters, treeNodes, relationSummaries, stats } = useMemo(() => {
    const characters = artifacts
      .filter((artifact) => artifact.type === ArtifactType.Character)
      .sort((a, b) => a.title.localeCompare(b.title));

    const characterMap = new Map<string, Artifact>(characters.map((character) => [character.id, character]));

    const parentMap: RelationshipMaps['parentMap'] = new Map();
    const childMap: RelationshipMaps['childMap'] = new Map();
    const partnerMap: RelationshipMaps['partnerMap'] = new Map();
    const siblingMap: RelationshipMaps['siblingMap'] = new Map();

    const parentEdges = new Set<string>();
    const partnerEdges = new Set<string>();
    const siblingEdges = new Set<string>();

    characters.forEach((character) => {
      ensureSet(parentMap, character.id);
      ensureSet(childMap, character.id);
      ensureSet(partnerMap, character.id);
      ensureSet(siblingMap, character.id);

      character.relations.forEach((relation) => {
        const normalizedKind = sanitizeRelationKind(relation.kind);
        const targetId = relation.toId;
        if (!characterMap.has(targetId)) {
          return;
        }

        switch (normalizedKind) {
          case 'PARENT_OF': {
            ensureSet(childMap, character.id).add(targetId);
            ensureSet(parentMap, targetId).add(character.id);
            parentEdges.add(`parent:${character.id}->${targetId}`);
            break;
          }
          case 'CHILD_OF': {
            ensureSet(parentMap, character.id).add(targetId);
            ensureSet(childMap, targetId).add(character.id);
            parentEdges.add(`parent:${targetId}->${character.id}`);
            break;
          }
          case 'SIBLING_OF': {
            ensureSet(siblingMap, character.id).add(targetId);
            ensureSet(siblingMap, targetId).add(character.id);
            siblingEdges.add(`sibling:${[character.id, targetId].sort().join('|')}`);
            break;
          }
          default: {
            if (PARTNER_RELATION_KINDS.has(normalizedKind)) {
              ensureSet(partnerMap, character.id).add(targetId);
              ensureSet(partnerMap, targetId).add(character.id);
              partnerEdges.add(`partner:${[character.id, targetId].sort().join('|')}`);
            }
            break;
          }
        }
      });
    });

    const maps: RelationshipMaps = { parentMap, childMap, partnerMap, siblingMap };

    const rootIds = characters
      .filter((character) => (parentMap.get(character.id)?.size ?? 0) === 0)
      .map((character) => character.id);

    const orderedRootIds = (rootIds.length > 0 ? rootIds : characters.map((character) => character.id)).sort((a, b) => {
      const aTitle = characterMap.get(a)?.title ?? '';
      const bTitle = characterMap.get(b)?.title ?? '';
      return aTitle.localeCompare(bTitle);
    });

    const treeNodes = orderedRootIds.map((id) => createFamilyTreeNode(id, maps, characterMap, new Set()));

    const relationSummaries: RelationshipSummary[] = characters.map((character) => ({
      character,
      parents: parentMap.get(character.id)?.size ?? 0,
      children: childMap.get(character.id)?.size ?? 0,
      partners: partnerMap.get(character.id)?.size ?? 0,
      siblings: siblingMap.get(character.id)?.size ?? 0,
    }));

    const stats = {
      familyCount: treeNodes.length,
      relationshipCount: parentEdges.size + partnerEdges.size + siblingEdges.size,
    };

    return { characters, treeNodes, relationSummaries, stats };
  }, [artifacts]);

  if (characters.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-slate-800/80 p-2 text-slate-300">
              <UserCircleIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Family tree tools</h3>
              <p className="text-sm text-slate-400">Add characters to start diagramming family structures.</p>
            </div>
          </div>
          {onCreateCharacter && (
            <button
              type="button"
              onClick={onCreateCharacter}
              className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white shadow transition-colors hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              <PlusIcon className="h-4 w-4" />
              New Character
            </button>
          )}
        </header>
        <p className="mt-4 text-sm text-slate-400">
          Once you create character artifacts, Creative Atlas will map their parents, partners, and siblings here.
        </p>
        {onCreateCharacter && (
          <div className="mt-6">
            <button
              type="button"
              onClick={onCreateCharacter}
              className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-100 transition-colors hover:bg-cyan-500/20 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              <PlusIcon className="h-4 w-4" />
              Create a character seed
            </button>
          </div>
        )}
      </section>
    );
  }

  const handleSelect = (id: string) => {
    if (onSelectCharacter) {
      onSelectCharacter(id);
    }
  };

  const renderNode = (node: FamilyTreeNode, depth: number): React.ReactNode => {
    const descriptor = extractCharacterDescriptor(node.character);

    return (
      <div key={node.character.id} style={{ marginLeft: depth * 24 }} className="space-y-2">
        <div className="rounded-xl border border-slate-700/70 bg-slate-800/60 p-4 shadow-sm shadow-slate-950/20">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleSelect(node.character.id)}
                className="text-left text-base font-semibold text-slate-100 transition-colors hover:text-cyan-300"
              >
                {node.character.title}
              </button>
              {descriptor && <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{descriptor}</p>}
              <p className="text-xs text-slate-400 line-clamp-2">{node.character.summary}</p>
            </div>
            <div className="rounded-full bg-cyan-500/10 p-2 text-cyan-300">
              <LinkIcon className="h-4 w-4" />
            </div>
          </div>
          {node.partners.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Partners</p>
              <div className="flex flex-wrap items-center gap-2">
                {node.partners.map((partner) => (
                  <button
                    key={partner.id}
                    type="button"
                    onClick={() => handleSelect(partner.id)}
                    className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-200 transition-colors hover:border-cyan-400 hover:text-cyan-100"
                  >
                    {partner.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          {node.siblings.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Siblings</p>
              <div className="flex flex-wrap items-center gap-2">
                {node.siblings.map((sibling) => (
                  <button
                    key={sibling.id}
                    type="button"
                    onClick={() => handleSelect(sibling.id)}
                    className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-200 transition-colors hover:border-purple-400 hover:text-purple-100"
                  >
                    {sibling.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {node.children.length > 0 && (
          <div className="space-y-3">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/10 space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-slate-800/80 p-2 text-slate-300">
            <UserCircleIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Family tree tools</h3>
            <p className="text-sm text-slate-400">
              Visualise how your characters connect across generations, households, and sibling bonds.
            </p>
          </div>
        </div>
        {onCreateCharacter && (
          <button
            type="button"
            onClick={onCreateCharacter}
            className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white shadow transition-colors hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            <PlusIcon className="h-4 w-4" />
            New Character
          </button>
        )}
      </header>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-700/70 bg-slate-800/50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Families traced</dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-100">{stats.familyCount}</dd>
        </div>
        <div className="rounded-xl border border-slate-700/70 bg-slate-800/50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Characters tracked</dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-100">{characters.length}</dd>
        </div>
        <div className="rounded-xl border border-slate-700/70 bg-slate-800/50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Mapped relationships</dt>
          <dd className="mt-2 text-2xl font-semibold text-slate-100">{stats.relationshipCount}</dd>
        </div>
      </dl>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Lineage map</h4>
          <p className="text-xs text-slate-400">
            Navigate the tree to jump directly into each character&apos;s dossier and refine their connections.
          </p>
        </div>
        <div className="space-y-4">
          {treeNodes.map((node) => renderNode(node, 0))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Relationship breakdown</h4>
          <p className="text-xs text-slate-400">
            Spot characters missing familial anchors or overstuffed webs to balance your cast.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/40">
          <div className="grid grid-cols-5 items-center gap-2 border-b border-slate-700/70 bg-slate-900/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <span>Character</span>
            <span>Parents</span>
            <span>Children</span>
            <span>Partners</span>
            <span>Siblings</span>
          </div>
          {relationSummaries.map((summary) => (
            <div
              key={summary.character.id}
              className="grid grid-cols-5 items-center gap-2 border-b border-slate-800/50 px-3 py-2 text-sm text-slate-200 last:border-b-0"
            >
              <button
                type="button"
                onClick={() => handleSelect(summary.character.id)}
                className="text-left font-semibold text-slate-100 transition-colors hover:text-cyan-300"
              >
                {summary.character.title}
              </button>
              <span>{summary.parents}</span>
              <span>{summary.children}</span>
              <span>{summary.partners}</span>
              <span>{summary.siblings}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FamilyTreeTools;
