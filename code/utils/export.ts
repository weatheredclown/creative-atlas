
import {
    Artifact,
    Project,
    ArtifactType,
    Scene,
    CharacterData,
    LocationData,
    ConlangLexeme,
    TaskData,
    TASK_STATE,
    WikiData,
    RepositoryData,
    IssueData,
    ReleaseData,
    ProductData,
    TimelineData,
    isNarrativeArtifactType,
    StaticSiteFile,
} from '../types';
import JSZip from 'jszip';
import { simpleMarkdownToHtml, escapeMarkdownCell } from './markdown';
import { emitToast } from '../contexts/ToastContext';
import { formatProductAvailability, sanitizeProductData } from './product';

interface ResolvedRelation {
    kind: string;
    targetId: string;
    targetTitle: string;
    targetType: ArtifactType;
}

interface ChapterSummary {
    id: string;
    title: string;
    summary: string;
    status: string;
    tags: string[];
    relations: ResolvedRelation[];
}

interface StorylineSummary {
    id: string;
    title: string;
    summary: string;
    status: string;
    type: ArtifactType;
    tags: string[];
    scenes: Scene[];
    relations: ResolvedRelation[];
}

interface CharacterSummary {
    id: string;
    title: string;
    summary: string;
    status: string;
    tags: string[];
    bio: string;
    traits: { id: string; key: string; value: string }[];
    relations: ResolvedRelation[];
}

interface LocationSummary {
    id: string;
    title: string;
    summary: string;
    status: string;
    tags: string[];
    description: string;
    features: { id: string; name: string; description: string }[];
    relations: ResolvedRelation[];
}

interface TimelineSummary {
    id: string;
    title: string;
    summary: string;
    events: { id: string; date: string; title: string; description: string }[];
}

interface WikiSummary {
    id: string;
    title: string;
    summary: string;
    content: string;
}

interface TerminologySummary {
    id: string;
    title: string;
    summary: string;
    tags: string[];
    relations: ResolvedRelation[];
}

interface GameModuleSummary {
    id: string;
    title: string;
    summary: string;
    status: string;
    tags: string[];
    relations: ResolvedRelation[];
}

interface LexemeSummary extends ConlangLexeme {
    language: string;
    artifactId: string;
}

interface ChapterBibleContent {
    project: {
        id: string;
        title: string;
        summary: string;
        tags: string[];
    };
    chapters: ChapterSummary[];
    storylines: StorylineSummary[];
    characters: CharacterSummary[];
    locations: LocationSummary[];
    timelineEntries: TimelineSummary[];
    terminology: TerminologySummary[];
    lexicon: LexemeSummary[];
    wikiPages: WikiSummary[];
    gameModules: GameModuleSummary[];
}

function escapeCsvCell(cell: unknown): string {
    const cellStr = String(cell ?? '');
    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n') || cellStr.includes('\t')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
}

const serializeArtifactData = (artifact: Artifact): string => {
    if (artifact.data === undefined || artifact.data === null) {
        return '';
    }

    try {
        return JSON.stringify(artifact.data);
    } catch (error) {
        console.warn(`Failed to serialize data for artifact ${artifact.id}`, error);
        return '';
    }
};

const sortByTitle = <T extends { title: string }>(items: T[]): T[] =>
    [...items].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

const resolveRelations = (
    artifact: Artifact,
    artifactMap: Map<string, Artifact>,
): ResolvedRelation[] =>
    artifact.relations
        .map((relation) => {
            const target = artifactMap.get(relation.toId);
            if (!target) {
                return null;
            }
            return {
                kind: relation.kind,
                targetId: relation.toId,
                targetTitle: target.title,
                targetType: target.type,
            } satisfies ResolvedRelation;
        })
        .filter((relation): relation is ResolvedRelation => relation !== null);

export const buildChapterBibleContent = (project: Project, artifacts: Artifact[]): ChapterBibleContent => {
    const projectArtifacts = artifacts.filter((artifact) => artifact.projectId === project.id);
    const artifactMap = new Map(projectArtifacts.map((artifact) => [artifact.id, artifact] as const));

    const chapters: ChapterSummary[] = sortByTitle(
        projectArtifacts
            .filter((artifact) => artifact.type === ArtifactType.Chapter)
            .map((artifact) => ({
                id: artifact.id,
                title: artifact.title,
                summary: artifact.summary,
                status: artifact.status,
                tags: [...artifact.tags],
                relations: resolveRelations(artifact, artifactMap),
            })),
    );

    const storylines: StorylineSummary[] = sortByTitle(
        projectArtifacts
            .filter((artifact) => isNarrativeArtifactType(artifact.type) && artifact.type !== ArtifactType.Chapter)
            .map((artifact) => {
                const scenes = Array.isArray(artifact.data)
                    ? (artifact.data as Scene[]).filter((scene): scene is Scene => Boolean(scene?.title))
                    : [];
                return {
                    id: artifact.id,
                    title: artifact.title,
                    summary: artifact.summary,
                    status: artifact.status,
                    type: artifact.type,
                    tags: [...artifact.tags],
                    scenes,
                    relations: resolveRelations(artifact, artifactMap),
                } satisfies StorylineSummary;
            }),
    );

    const characters: CharacterSummary[] = sortByTitle(
        projectArtifacts
            .filter((artifact) => artifact.type === ArtifactType.Character)
            .map((artifact) => {
                const data = artifact.data as CharacterData | undefined;
                return {
                    id: artifact.id,
                    title: artifact.title,
                    summary: artifact.summary,
                    status: artifact.status,
                    tags: [...artifact.tags],
                    bio: data?.bio ?? '',
                    traits: Array.isArray(data?.traits) ? data.traits : [],
                    relations: resolveRelations(artifact, artifactMap),
                } satisfies CharacterSummary;
            }),
    );

    const locations: LocationSummary[] = sortByTitle(
        projectArtifacts
            .filter((artifact) => artifact.type === ArtifactType.Location)
            .map((artifact) => {
                const data = artifact.data as LocationData | undefined;
                const features = Array.isArray(data?.features) ? data.features : [];
                return {
                    id: artifact.id,
                    title: artifact.title,
                    summary: artifact.summary,
                    status: artifact.status,
                    tags: [...artifact.tags],
                    description: data?.description ?? '',
                    features,
                    relations: resolveRelations(artifact, artifactMap),
                } satisfies LocationSummary;
            }),
    );

    const timelineEntries: TimelineSummary[] = sortByTitle(
        projectArtifacts
            .filter((artifact) => artifact.type === ArtifactType.Timeline)
            .map((artifact) => {
                const data = artifact.data as TimelineData | undefined;
                const events = Array.isArray(data?.events) ? data.events : [];
                return {
                    id: artifact.id,
                    title: artifact.title,
                    summary: artifact.summary,
                    events,
                } satisfies TimelineSummary;
            }),
    );

    const terminology: TerminologySummary[] = sortByTitle(
        projectArtifacts
            .filter((artifact) => artifact.type === ArtifactType.Terminology)
            .map((artifact) => ({
                id: artifact.id,
                title: artifact.title,
                summary: artifact.summary,
                tags: [...artifact.tags],
                relations: resolveRelations(artifact, artifactMap),
            })),
    );

    const wikiPages: WikiSummary[] = sortByTitle(
        projectArtifacts
            .filter((artifact) => artifact.type === ArtifactType.Wiki)
            .map((artifact) => {
                const data = artifact.data as WikiData | undefined;
                return {
                    id: artifact.id,
                    title: artifact.title,
                    summary: artifact.summary,
                    content: data?.content ?? '',
                } satisfies WikiSummary;
            }),
    );

    const gameModules: GameModuleSummary[] = sortByTitle(
        projectArtifacts
            .filter((artifact) => artifact.type === ArtifactType.GameModule)
            .map((artifact) => ({
                id: artifact.id,
                title: artifact.title,
                summary: artifact.summary,
                status: artifact.status,
                tags: [...artifact.tags],
                relations: resolveRelations(artifact, artifactMap),
            })),
    );

    const lexicon: LexemeSummary[] = projectArtifacts
        .filter((artifact) => artifact.type === ArtifactType.Conlang)
        .flatMap((artifact) => {
            const lexemes = Array.isArray(artifact.data) ? (artifact.data as ConlangLexeme[]) : [];
            return lexemes.map((lexeme) => ({
                ...lexeme,
                language: artifact.title,
                artifactId: artifact.id,
            } satisfies LexemeSummary));
        })
        .sort((a, b) => a.lemma.localeCompare(b.lemma, undefined, { sensitivity: 'base' }));

    return {
        project: {
            id: project.id,
            title: project.title,
            summary: project.summary,
            tags: [...project.tags],
        },
        chapters,
        storylines,
        characters,
        locations,
        timelineEntries,
        terminology,
        lexicon,
        wikiPages,
        gameModules,
    } satisfies ChapterBibleContent;
};

const slugifyForFilename = (value: string): string =>
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || 'export';

const formatRelationForMarkdown = (relation: ResolvedRelation): string =>
    `${relation.kind.replace(/_/g, ' ')} → ${relation.targetTitle} (${relation.targetType})`;

const createChapterBibleMarkdown = (content: ChapterBibleContent): string => {
    const lines: string[] = [];
    const addBlankLine = () => {
        if (lines.length === 0 || lines[lines.length - 1] !== '') {
            lines.push('');
        }
    };

    lines.push(`# ${content.project.title} — Chapter Bible`);
    lines.push('');
    lines.push(`**Summary:** ${content.project.summary || 'No summary recorded.'}`);
    if (content.project.tags.length > 0) {
        lines.push(`**Project Tags:** ${content.project.tags.map((tag) => `\`${tag}\``).join(', ')}`);
    }
    lines.push('');
    lines.push(`_Generated on ${new Date().toISOString()}_`);
    lines.push('');
    lines.push('---');
    lines.push('');

    if (content.storylines.length > 0) {
        lines.push('## Storylines & Scenes');
        lines.push('');
        content.storylines.forEach((storyline) => {
            lines.push(`### ${storyline.title} (${storyline.type})`);
            if (storyline.summary) {
                lines.push('');
                lines.push(storyline.summary);
            }
            addBlankLine();
            const metadata: string[] = [`- **Status:** ${storyline.status}`];
            if (storyline.tags.length > 0) {
                metadata.push(`- **Tags:** ${storyline.tags.map((tag) => `\`${tag}\``).join(', ')}`);
            }
            metadata.forEach((item) => lines.push(item));
            addBlankLine();
            if (storyline.scenes.length > 0) {
                lines.push('#### Scenes');
                lines.push('');
                storyline.scenes.forEach((scene, index) => {
                    const summary = scene.summary ? ` — ${scene.summary}` : '';
                    lines.push(`${index + 1}. **${scene.title}**${summary}`);
                });
                addBlankLine();
            }
            if (storyline.relations.length > 0) {
                lines.push('#### Relations');
                lines.push('');
                storyline.relations.forEach((relation) => {
                    lines.push(`- ${formatRelationForMarkdown(relation)}`);
                });
                addBlankLine();
            }
        });
    }

    if (content.chapters.length > 0) {
        lines.push('## Chapters');
        lines.push('');
        content.chapters.forEach((chapter) => {
            lines.push(`### ${chapter.title}`);
            if (chapter.summary) {
                lines.push('');
                lines.push(chapter.summary);
            }
            addBlankLine();
            const metadata: string[] = [`- **Status:** ${chapter.status}`];
            if (chapter.tags.length > 0) {
                metadata.push(`- **Tags:** ${chapter.tags.map((tag) => `\`${tag}\``).join(', ')}`);
            }
            metadata.forEach((item) => lines.push(item));
            addBlankLine();
            if (chapter.relations.length > 0) {
                lines.push('#### Relations');
                lines.push('');
                chapter.relations.forEach((relation) => {
                    lines.push(`- ${formatRelationForMarkdown(relation)}`);
                });
                addBlankLine();
            }
        });
    }

    if (content.characters.length > 0) {
        lines.push('## Characters');
        lines.push('');
        content.characters.forEach((character) => {
            lines.push(`### ${character.title}`);
            if (character.summary) {
                lines.push('');
                lines.push(character.summary);
            }
            addBlankLine();
            const metadata: string[] = [`- **Status:** ${character.status}`];
            if (character.tags.length > 0) {
                metadata.push(`- **Tags:** ${character.tags.map((tag) => `\`${tag}\``).join(', ')}`);
            }
            metadata.forEach((item) => lines.push(item));
            addBlankLine();
            if (character.bio) {
                lines.push('**Biography**');
                lines.push('');
                lines.push(character.bio);
                addBlankLine();
            }
            if (character.traits.length > 0) {
                lines.push('#### Traits');
                lines.push('');
                character.traits.forEach((trait) => {
                    lines.push(`- **${trait.key}:** ${trait.value}`);
                });
                addBlankLine();
            }
            if (character.relations.length > 0) {
                lines.push('#### Relations');
                lines.push('');
                character.relations.forEach((relation) => {
                    lines.push(`- ${formatRelationForMarkdown(relation)}`);
                });
                addBlankLine();
            }
        });
    }

    if (content.locations.length > 0) {
        lines.push('## Locations');
        lines.push('');
        content.locations.forEach((location) => {
            lines.push(`### ${location.title}`);
            if (location.summary) {
                lines.push('');
                lines.push(location.summary);
            }
            addBlankLine();
            const metadata: string[] = [`- **Status:** ${location.status}`];
            if (location.tags.length > 0) {
                metadata.push(`- **Tags:** ${location.tags.map((tag) => `\`${tag}\``).join(', ')}`);
            }
            metadata.forEach((item) => lines.push(item));
            addBlankLine();
            if (location.description) {
                lines.push('**Description**');
                lines.push('');
                lines.push(location.description);
                addBlankLine();
            }
            if (location.features.length > 0) {
                lines.push('#### Notable Features');
                lines.push('');
                location.features.forEach((feature) => {
                    lines.push(`- **${feature.name}:** ${feature.description}`);
                });
                addBlankLine();
            }
            if (location.relations.length > 0) {
                lines.push('#### Relations');
                lines.push('');
                location.relations.forEach((relation) => {
                    lines.push(`- ${formatRelationForMarkdown(relation)}`);
                });
                addBlankLine();
            }
        });
    }

    if (content.timelineEntries.length > 0) {
        lines.push('## Timelines');
        lines.push('');
        content.timelineEntries.forEach((timeline) => {
            lines.push(`### ${timeline.title}`);
            if (timeline.summary) {
                lines.push('');
                lines.push(timeline.summary);
            }
            addBlankLine();
            if (timeline.events.length > 0) {
                timeline.events.forEach((event) => {
                    const detail = event.description ? ` — ${event.description}` : '';
                    lines.push(`- ${event.date}: **${event.title}**${detail}`);
                });
                addBlankLine();
            }
        });
    }

    if (content.terminology.length > 0) {
        lines.push('## Terminology & Glossary');
        lines.push('');
        content.terminology.forEach((entry) => {
            lines.push(`- **${entry.title}:** ${entry.summary || 'No definition captured yet.'}`);
            if (entry.tags.length > 0) {
                lines.push(`  - Tags: ${entry.tags.map((tag) => `\`${tag}\``).join(', ')}`);
            }
            if (entry.relations.length > 0) {
                entry.relations.forEach((relation) => {
                    lines.push(`  - ${formatRelationForMarkdown(relation)}`);
                });
            }
        });
        addBlankLine();
    }

    if (content.lexicon.length > 0) {
        lines.push('## Lexicon');
        lines.push('');
        lines.push('| Language | Lemma | Part of Speech | Gloss | Etymology |');
        lines.push('| --- | --- | --- | --- | --- |');
        content.lexicon.forEach((lexeme) => {
            lines.push(
                `| ${escapeMarkdownCell(lexeme.language)} | ${escapeMarkdownCell(lexeme.lemma)} | ${escapeMarkdownCell(
                    lexeme.pos,
                )} | ${escapeMarkdownCell(lexeme.gloss)} | ${escapeMarkdownCell(lexeme.etymology ?? '')} |`,
            );
        });
        addBlankLine();
    }

    if (content.wikiPages.length > 0) {
        lines.push('## Wiki Pages');
        lines.push('');
        content.wikiPages.forEach((wiki) => {
            lines.push(`### ${wiki.title}`);
            if (wiki.summary) {
                lines.push('');
                lines.push(wiki.summary);
            }
            if (wiki.content) {
                lines.push('');
                lines.push(wiki.content);
            }
            addBlankLine();
        });
    }

    if (content.gameModules.length > 0) {
        lines.push('## Game Modules');
        lines.push('');
        content.gameModules.forEach((module) => {
            lines.push(`### ${module.title}`);
            if (module.summary) {
                lines.push('');
                lines.push(module.summary);
            }
            addBlankLine();
            const metadata: string[] = [`- **Status:** ${module.status}`];
            if (module.tags.length > 0) {
                metadata.push(`- **Tags:** ${module.tags.map((tag) => `\`${tag}\``).join(', ')}`);
            }
            metadata.forEach((item) => lines.push(item));
            addBlankLine();
            if (module.relations.length > 0) {
                lines.push('#### Relations');
                lines.push('');
                module.relations.forEach((relation) => {
                    lines.push(`- ${formatRelationForMarkdown(relation)}`);
                });
                addBlankLine();
            }
        });
    }

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd().concat('\n');
};

const triggerBlobDownload = (blob: Blob, filename: string) => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const exportChapterBibleMarkdown = (project: Project, artifacts: Artifact[]) => {
    const content = buildChapterBibleContent(project, artifacts);
    const markdown = createChapterBibleMarkdown(content);
    const filename = `${slugifyForFilename(project.title)}_chapter_bible.md`;
    triggerBlobDownload(new Blob([markdown], { type: 'text/markdown;charset=utf-8;' }), filename);
};

export const exportChapterBiblePdf = async (project: Project, artifacts: Artifact[]) => {
    const content = buildChapterBibleContent(project, artifacts);
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let cursorY = margin;

    const ensureSpace = (height: number) => {
        if (cursorY + height > pageHeight - margin) {
            doc.addPage();
            cursorY = margin;
        }
    };

    const writeHeading = (text: string) => {
        ensureSpace(28);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(text, margin, cursorY);
        cursorY += 28;
    };

    const writeSectionHeading = (text: string) => {
        ensureSpace(24);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(text, margin, cursorY);
        cursorY += 24;
    };

    const writeSubsectionHeading = (text: string) => {
        ensureSpace(20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(text, margin, cursorY);
        cursorY += 20;
    };

    const writeMinorHeading = (text: string) => {
        ensureSpace(18);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(text, margin, cursorY);
        cursorY += 18;
    };

    const writeParagraph = (
        text: string,
        options: { fontSize?: number; fontStyle?: 'normal' | 'bold' | 'italic'; spacingAfter?: number } = {},
    ) => {
        if (!text) {
            return;
        }
        const { fontSize = 11, fontStyle = 'normal', spacingAfter = 12 } = options;
        const maxWidth = pageWidth - margin * 2;
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.setFont('helvetica', fontStyle);
        doc.setFontSize(fontSize);
        lines.forEach((line) => {
            ensureSpace(14);
            doc.text(line, margin, cursorY);
            cursorY += 14;
        });
        cursorY += spacingAfter;
    };

    const writeList = (items: string[]) => {
        if (items.length === 0) {
            return;
        }
        const maxWidth = pageWidth - margin * 2 - 16;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        items.forEach((item) => {
            const lines = doc.splitTextToSize(item, maxWidth);
            const blockHeight = lines.length * 14 + 6;
            ensureSpace(blockHeight);
            doc.text('•', margin, cursorY);
            lines.forEach((line, index) => {
                doc.text(line, margin + 12, cursorY);
                if (index < lines.length - 1) {
                    cursorY += 14;
                }
            });
            cursorY += 18;
        });
    };

    const formatRelations = (relations: ResolvedRelation[]) => relations.map(formatRelationForMarkdown);

    writeHeading(`${content.project.title} — Chapter Bible`);
    writeParagraph(`Summary: ${content.project.summary || 'No summary recorded.'}`);
    if (content.project.tags.length > 0) {
        writeParagraph(`Tags: ${content.project.tags.join(', ')}`);
    }
    writeParagraph(`Generated on ${new Date().toLocaleString()}`, { fontSize: 10, fontStyle: 'italic', spacingAfter: 16 });

    if (content.storylines.length > 0) {
        writeSectionHeading('Storylines & Scenes');
        content.storylines.forEach((storyline) => {
            writeSubsectionHeading(`${storyline.title} (${storyline.type})`);
            writeParagraph(storyline.summary ?? '');
            const details = [`Status: ${storyline.status}`];
            if (storyline.tags.length > 0) {
                details.push(`Tags: ${storyline.tags.join(', ')}`);
            }
            writeParagraph(details.join(' • '));
            if (storyline.scenes.length > 0) {
                writeMinorHeading('Scenes');
                writeList(
                    storyline.scenes.map((scene, index) => {
                        const suffix = scene.summary ? ` — ${scene.summary}` : '';
                        return `${index + 1}. ${scene.title}${suffix}`;
                    }),
                );
            }
            if (storyline.relations.length > 0) {
                writeMinorHeading('Relations');
                writeList(formatRelations(storyline.relations));
            }
            cursorY += 6;
        });
    }

    if (content.chapters.length > 0) {
        writeSectionHeading('Chapters');
        content.chapters.forEach((chapter) => {
            writeSubsectionHeading(chapter.title);
            writeParagraph(chapter.summary ?? '');
            const details = [`Status: ${chapter.status}`];
            if (chapter.tags.length > 0) {
                details.push(`Tags: ${chapter.tags.join(', ')}`);
            }
            writeParagraph(details.join(' • '));
            if (chapter.relations.length > 0) {
                writeMinorHeading('Relations');
                writeList(formatRelations(chapter.relations));
            }
            cursorY += 6;
        });
    }

    if (content.characters.length > 0) {
        writeSectionHeading('Characters');
        content.characters.forEach((character) => {
            writeSubsectionHeading(character.title);
            writeParagraph(character.summary ?? '');
            const details = [`Status: ${character.status}`];
            if (character.tags.length > 0) {
                details.push(`Tags: ${character.tags.join(', ')}`);
            }
            writeParagraph(details.join(' • '));
            if (character.bio) {
                writeMinorHeading('Biography');
                writeParagraph(character.bio);
            }
            if (character.traits.length > 0) {
                writeMinorHeading('Traits');
                writeList(character.traits.map((trait) => `${trait.key}: ${trait.value}`));
            }
            if (character.relations.length > 0) {
                writeMinorHeading('Relations');
                writeList(formatRelations(character.relations));
            }
            cursorY += 6;
        });
    }

    if (content.locations.length > 0) {
        writeSectionHeading('Locations');
        content.locations.forEach((location) => {
            writeSubsectionHeading(location.title);
            writeParagraph(location.summary ?? '');
            const details = [`Status: ${location.status}`];
            if (location.tags.length > 0) {
                details.push(`Tags: ${location.tags.join(', ')}`);
            }
            writeParagraph(details.join(' • '));
            if (location.description) {
                writeMinorHeading('Description');
                writeParagraph(location.description);
            }
            if (location.features.length > 0) {
                writeMinorHeading('Notable Features');
                writeList(location.features.map((feature) => `${feature.name}: ${feature.description}`));
            }
            if (location.relations.length > 0) {
                writeMinorHeading('Relations');
                writeList(formatRelations(location.relations));
            }
            cursorY += 6;
        });
    }

    if (content.timelineEntries.length > 0) {
        writeSectionHeading('Timelines');
        content.timelineEntries.forEach((timeline) => {
            writeSubsectionHeading(timeline.title);
            writeParagraph(timeline.summary ?? '');
            if (timeline.events.length > 0) {
                writeList(
                    timeline.events.map((event) => {
                        const detail = event.description ? ` — ${event.description}` : '';
                        return `${event.date}: ${event.title}${detail}`;
                    }),
                );
            }
            cursorY += 6;
        });
    }

    if (content.terminology.length > 0) {
        writeSectionHeading('Terminology & Glossary');
        writeList(
            content.terminology.map((entry) => {
                const relationSummary = entry.relations.map(formatRelationForMarkdown).join(' • ');
                const tagSummary = entry.tags.length > 0 ? ` [${entry.tags.join(', ')}]` : '';
                return `${entry.title}${tagSummary}: ${entry.summary || 'No definition captured yet.'}${
                    relationSummary ? ` — ${relationSummary}` : ''
                }`;
            }),
        );
    }

    if (content.lexicon.length > 0) {
        writeSectionHeading('Lexicon');
        writeList(
            content.lexicon.map((lexeme) => {
                const etymology = lexeme.etymology ? ` · ${lexeme.etymology}` : '';
                return `${lexeme.language}: ${lexeme.lemma} (${lexeme.pos}) — ${lexeme.gloss}${etymology}`;
            }),
        );
    }

    if (content.wikiPages.length > 0) {
        writeSectionHeading('Wiki Pages');
        content.wikiPages.forEach((wiki) => {
            writeSubsectionHeading(wiki.title);
            writeParagraph(wiki.summary ?? '');
            writeParagraph(wiki.content ?? '', { spacingAfter: 16 });
        });
    }

    if (content.gameModules.length > 0) {
        writeSectionHeading('Game Modules');
        content.gameModules.forEach((module) => {
            writeSubsectionHeading(module.title);
            writeParagraph(module.summary ?? '');
            const details = [`Status: ${module.status}`];
            if (module.tags.length > 0) {
                details.push(`Tags: ${module.tags.join(', ')}`);
            }
            writeParagraph(details.join(' • '));
            if (module.relations.length > 0) {
                writeMinorHeading('Relations');
                writeList(formatRelations(module.relations));
            }
            cursorY += 6;
        });
    }

    doc.save(`${slugifyForFilename(project.title)}_chapter_bible.pdf`);
};

export const createLoreJsonPayload = (content: ChapterBibleContent) => {
    const mapRelations = (relations: ResolvedRelation[]) =>
        relations.map((relation) => ({
            kind: relation.kind,
            targetId: relation.targetId,
            targetTitle: relation.targetTitle,
            targetType: relation.targetType,
        }));

    return {
        metadata: {
            projectId: content.project.id,
            projectTitle: content.project.title,
            summary: content.project.summary,
            tags: content.project.tags,
            exportedAt: new Date().toISOString(),
        },
        narrative: {
            storylines: content.storylines.map((storyline) => ({
                id: storyline.id,
                title: storyline.title,
                type: storyline.type,
                status: storyline.status,
                summary: storyline.summary,
                tags: storyline.tags,
                scenes: storyline.scenes.map((scene, index) => ({
                    id: scene.id,
                    title: scene.title,
                    summary: scene.summary,
                    order: index + 1,
                })),
                relations: mapRelations(storyline.relations),
            })),
            chapters: content.chapters.map((chapter) => ({
                id: chapter.id,
                title: chapter.title,
                status: chapter.status,
                summary: chapter.summary,
                tags: chapter.tags,
                relations: mapRelations(chapter.relations),
            })),
            timeline: content.timelineEntries.map((timeline) => ({
                id: timeline.id,
                title: timeline.title,
                summary: timeline.summary,
                events: timeline.events.map((event) => ({
                    id: event.id,
                    date: event.date,
                    title: event.title,
                    description: event.description,
                })),
            })),
        },
        lore: {
            characters: content.characters.map((character) => ({
                id: character.id,
                name: character.title,
                status: character.status,
                summary: character.summary,
                tags: character.tags,
                bio: character.bio,
                traits: character.traits.map((trait) => ({ key: trait.key, value: trait.value })),
                relations: mapRelations(character.relations),
            })),
            locations: content.locations.map((location) => ({
                id: location.id,
                title: location.title,
                status: location.status,
                summary: location.summary,
                tags: location.tags,
                description: location.description,
                features: location.features.map((feature) => ({
                    id: feature.id,
                    name: feature.name,
                    description: feature.description,
                })),
                relations: mapRelations(location.relations),
            })),
            terminology: content.terminology.map((entry) => ({
                id: entry.id,
                title: entry.title,
                summary: entry.summary,
                tags: entry.tags,
                relations: mapRelations(entry.relations),
            })),
            wikiPages: content.wikiPages.map((wiki) => ({
                id: wiki.id,
                title: wiki.title,
                summary: wiki.summary,
                content: wiki.content,
            })),
            lexicon: content.lexicon.map((lexeme) => ({
                id: lexeme.id,
                language: lexeme.language,
                lemma: lexeme.lemma,
                partOfSpeech: lexeme.pos,
                gloss: lexeme.gloss,
                etymology: lexeme.etymology ?? null,
                tags: lexeme.tags ?? [],
                sourceArtifactId: lexeme.artifactId,
            })),
        },
        ackModule: {
            modules: content.gameModules.map((module) => ({
                id: module.id,
                title: module.title,
                status: module.status,
                summary: module.summary,
                tags: module.tags,
                relations: mapRelations(module.relations),
            })),
        },
    };
};

export const exportLoreJson = (project: Project, artifacts: Artifact[]) => {
    const content = buildChapterBibleContent(project, artifacts);
    const payload = createLoreJsonPayload(content);
    const filename = `${slugifyForFilename(project.title)}_lore.json`;
    triggerBlobDownload(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8;' }), filename);
};

const exportArtifactsToDelimitedFile = (artifacts: Artifact[], projectName: string, delimiter: string, extension: string) => {
    if (artifacts.length === 0) {
        emitToast('No artifacts to export.', { variant: 'info' });
        return;
    }

    const headers = ['id', 'type', 'projectId', 'title', 'summary', 'status', 'tags', 'relations', 'data'];
    const joiner = delimiter === '\t' ? '\t' : ',';
    const rows = [headers.join(joiner)];

    for (const artifact of artifacts) {
        const relationsStr = artifact.relations.map(r => `${r.kind}:${r.toId}`).join(';');
        const row = [
            escapeCsvCell(artifact.id),
            escapeCsvCell(artifact.type),
            escapeCsvCell(artifact.projectId),
            escapeCsvCell(artifact.title),
            escapeCsvCell(artifact.summary),
            escapeCsvCell(artifact.status),
            escapeCsvCell(artifact.tags.join(';')),
            escapeCsvCell(relationsStr),
            escapeCsvCell(serializeArtifactData(artifact)),
        ];
        rows.push(row.join(joiner));
    }

    const fileString = rows.join('\n');
    const mimeType = delimiter === '\t' ? 'text/tab-separated-values' : 'text/csv';
    const blob = new Blob([fileString], { type: `${mimeType};charset=utf-8;` });

    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const filename = `${projectName.replace(/\s+/g, '_').toLowerCase()}_artifacts.${extension}`;
        link.setAttribute('download', filename);
        link.href = url;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

export function exportArtifactsToCSV(artifacts: Artifact[], projectName: string) {
    exportArtifactsToDelimitedFile(artifacts, projectName, ',', 'csv');
}

export function exportArtifactsToTSV(artifacts: Artifact[], projectName: string) {
    exportArtifactsToDelimitedFile(artifacts, projectName, '\t', 'tsv');
}

const generateArtifactMarkdownBody = (artifact: Artifact): string => {
    let body = `# ${artifact.title}\n\n${artifact.summary || ''}\n\n`;

    if (isNarrativeArtifactType(artifact.type)) {
        const scenes = artifact.data as Scene[];
        if (Array.isArray(scenes) && scenes.length > 0) {
            body += '## Scenes\n\n';
            scenes.forEach((scene, index) => {
                body += `### ${index + 1}. ${scene.title}\n${scene.summary || ''}\n\n`;
            });
        }
        return body;
    }

    switch (artifact.type) {
        case ArtifactType.Character: {
            const charData = artifact.data as CharacterData;
            if (charData?.bio) {
                body += `## Biography\n\n${charData.bio}\n\n`;
            }
            if (Array.isArray(charData?.traits) && charData.traits.length > 0) {
                body += '## Traits\n';
                charData.traits.forEach(trait => {
                    body += `- **${trait.key}:** ${trait.value}\n`;
                });
                body += '\n';
            }
            break;
        }
        case ArtifactType.Conlang: {
            const lexemes = artifact.data as ConlangLexeme[];
            if (Array.isArray(lexemes) && lexemes.length > 0) {
                body += '## Lexicon\n\n| Lemma | Part of Speech | Gloss | Etymology |\n| --- | --- | --- | --- |\n';
                lexemes.forEach(lexeme => {
                    body += `| ${escapeMarkdownCell(lexeme.lemma)} | ${escapeMarkdownCell(lexeme.pos)} | ${escapeMarkdownCell(lexeme.gloss)} | ${escapeMarkdownCell(lexeme.etymology ?? '')} |\n`;
                });
                body += '\n';
            }
            break;
        }
        case ArtifactType.Wiki: {
            const wiki = artifact.data as WikiData;
            if (wiki?.content) {
                body += `${wiki.content}\n\n`;
            }
            break;
        }
        case ArtifactType.Location: {
            const location = artifact.data as LocationData;
            if (location?.description) {
                body += `## Description\n\n${location.description}\n\n`;
            }
            if (Array.isArray(location?.features) && location.features.length > 0) {
                body += '## Notable Features\n';
                location.features.forEach(feature => {
                    body += `- **${feature.name}:** ${feature.description}\n`;
                });
                body += '\n';
            }
            break;
        }
        case ArtifactType.Task: {
            const task = artifact.data as TaskData;
            body += '## Task Details\n';
            body += `- Status: ${task?.state ?? 'Unspecified'}\n`;
            if (task?.assignee) body += `- Assignee: ${task.assignee}\n`;
            if (task?.due) body += `- Due: ${task.due}\n`;
            body += '\n';
            break;
        }
        case ArtifactType.Repository: {
            const repo = artifact.data as RepositoryData;
            body += '## Repository\n';
            body += `- URL: ${repo?.url ?? ''}\n`;
            body += `- Default Branch: ${repo?.defaultBranch ?? ''}\n`;
            body += `- Language: ${repo?.language ?? 'Unknown'}\n`;
            body += `- Stars: ${repo?.stars ?? 0}\n`;
            body += `- Forks: ${repo?.forks ?? 0}\n`;
            body += `- Watchers: ${repo?.watchers ?? 0}\n`;
            body += `- Open Issues: ${repo?.openIssues ?? 0}\n\n`;
            break;
        }
        case ArtifactType.Issue: {
            const issue = artifact.data as IssueData;
            body += '## Issue Details\n';
            body += `- Number: #${issue?.number ?? 0}\n`;
            body += `- URL: ${issue?.url ?? ''}\n`;
            body += `- State: ${issue?.state ?? 'open'}\n`;
            body += `- Author: ${issue?.author ?? 'Unknown'}\n`;
            body += `- Labels: ${(issue?.labels ?? []).join(', ') || 'None'}\n`;
            body += `- Comments: ${issue?.comments ?? 0}\n\n`;
            break;
        }
        case ArtifactType.Release: {
            const release = artifact.data as ReleaseData;
            body += '## Release Details\n';
            body += `- Tag: ${release?.tagName ?? ''}\n`;
            body += `- URL: ${release?.url ?? ''}\n`;
            body += `- Author: ${release?.author ?? 'Unknown'}\n`;
            body += `- Published: ${release?.publishedAt ?? 'Unpublished'}\n`;
            body += `- Draft: ${release?.draft ? 'Yes' : 'No'}\n`;
            body += `- Pre-release: ${release?.prerelease ? 'Yes' : 'No'}\n\n`;
            break;
        }
        case ArtifactType.Product: {
            const product = sanitizeProductData(artifact.data as ProductData, artifact.title);
            body += '## Merchandise Overview\n';
            body += `${product.description}\n\n`;
            body += `- Vendor: ${product.vendor && product.vendor.length > 0 ? product.vendor : 'Unspecified'}\n`;
            body += `- Fulfillment: ${product.fulfillmentNotes && product.fulfillmentNotes.length > 0 ? product.fulfillmentNotes : 'Unspecified'}\n\n`;

            if (product.variants.length > 0) {
                body += '## Items\n\n| Name | Price | SKU | Availability | Link | Notes |\n| --- | --- | --- | --- | --- | --- |\n';
                product.variants.forEach((variant) => {
                    body += `| ${escapeMarkdownCell(variant.name)} | ${escapeMarkdownCell(variant.price ?? '')} | ${escapeMarkdownCell(variant.sku ?? '')} | ${escapeMarkdownCell(formatProductAvailability(variant.availability))} | ${escapeMarkdownCell(variant.url ?? '')} | ${escapeMarkdownCell(variant.notes ?? '')} |\n`;
                });
                body += '\n';
            }
            break;
        }
        default: {
            if (artifact.data && typeof artifact.data === 'object' && Object.keys(artifact.data).length > 0) {
                body += '```json\n';
                body += `${JSON.stringify(artifact.data, null, 2)}\n`;
                body += '```\n\n';
            }
        }
    }

    if (artifact.tags.length > 0) {
        body += '## Tags\n';
        artifact.tags.forEach(tag => {
            body += `- ${tag}\n`;
        });
        body += '\n';
    }

    if (artifact.relations.length > 0) {
        body += '## Relations\n';
        artifact.relations.forEach(rel => {
            body += `- ${rel.kind}: ${rel.toId}\n`;
        });
        body += '\n';
    }

    return body.trimEnd();
};

export function exportArtifactToMarkdown(artifact: Artifact) {
    let frontmatter = '---';
    frontmatter += `\nid: ${artifact.id}`;
    frontmatter += `\ntitle: ${artifact.title}`;
    frontmatter += `\ntype: ${artifact.type}`;
    frontmatter += `\nprojectId: ${artifact.projectId}`;
    frontmatter += `\nstatus: ${artifact.status}`;
    frontmatter += `\ntags: [${artifact.tags.join(', ')}]`;
    frontmatter += `\nrelations:`;
    artifact.relations.forEach(rel => {
        frontmatter += `\n  - toId: ${rel.toId}`;
        frontmatter += `\n    kind: ${rel.kind}`;
    });
    frontmatter += '\n---\n\n';

    const markdownString = frontmatter + generateArtifactMarkdownBody(artifact);
    const blob = new Blob([markdownString], { type: 'text/markdown;charset=utf-8;' });
    
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const filename = `${artifact.type}_${artifact.title.replace(/\s+/g, '_').toLowerCase()}.md`;
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

const createHtmlShell = (title: string, content: string) => `
<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>${title}</title>
    <script src='https://cdn.tailwindcss.com'></script>
</head>
<body class='bg-slate-900 text-slate-300 font-sans antialiased min-h-screen flex flex-col'>
    <div class='container mx-auto p-8 flex-1 w-full'>
        ${content}
    </div>
    <footer class='bg-slate-950 border-t border-slate-800 py-6 mt-12'>
        <div class='container mx-auto px-8 text-center text-sm text-slate-500'>
            This page was pushed from <a href='https://creative-atlas.web.app' class='text-cyan-400 hover:text-cyan-300'>creative-atlas.web.app</a>
        </div>
    </footer>
</body>
</html>
`;

const generateArtifactContent = (artifact: Artifact, allArtifacts: Artifact[]): string => {
    let content = `<h1 class='text-4xl font-bold text-white mb-2'>${artifact.title}</h1>`;
    content += `<p class='text-lg text-cyan-400 mb-4'>${artifact.type}</p>`;
    content += `<p class='text-slate-400 mb-6'>${artifact.summary}</p>`;

    // Render specific data
    if (isNarrativeArtifactType(artifact.type)) {
        const scenes = artifact.data as Scene[];
        content += "<h2 class='text-2xl font-bold text-white mt-8 mb-4'>Scenes</h2><div class='grid grid-cols-1 md:grid-cols-2 gap-4'>";
        scenes.forEach(scene => {
            content += `<div class='bg-slate-800 p-4 rounded-lg border border-slate-700'>
                <h3 class='font-bold text-slate-200'>${scene.title}</h3>
                <p class='text-sm text-slate-400'>${scene.summary}</p>
            </div>`;
        });
        content += '</div>';
    } else if (artifact.type === ArtifactType.Character) {
        const charData = artifact.data as CharacterData;
        content += "<h2 class='text-2xl font-bold text-white mt-8 mb-4'>Details</h2><div class='bg-slate-800 p-4 rounded-lg border border-slate-700'>";
        content += `<h3 class='font-bold text-slate-200 mb-2'>Biography</h3><p class='text-slate-400 mb-4'>${charData.bio.replace(/\n/g, '<br>')}</p>`;
        content += `<h3 class='font-bold text-slate-200 mb-2'>Traits</h3><ul class='list-disc list-inside'>`;
        charData.traits.forEach(trait => {
            content += `<li class='text-slate-400'><strong class='text-slate-300'>${trait.key}:</strong> ${trait.value}</li>`;
        });
        content += '</ul></div>';
    } else if (artifact.type === ArtifactType.Conlang) {
        const lexemes = artifact.data as ConlangLexeme[];
        if (Array.isArray(lexemes) && lexemes.length > 0) {
            content += "<h2 class='text-2xl font-bold text-white mt-8 mb-4'>Lexicon</h2>";
            content += "<div class='overflow-x-auto'><table class='min-w-full text-left border-collapse'>";
            content += "<thead class='bg-slate-800/80'><tr><th class='px-4 py-2 text-sm text-slate-300'>Lemma</th><th class='px-4 py-2 text-sm text-slate-300'>Part of Speech</th><th class='px-4 py-2 text-sm text-slate-300'>Gloss</th><th class='px-4 py-2 text-sm text-slate-300'>Etymology</th></tr></thead><tbody>";
            lexemes.forEach(lexeme => {
                content += `<tr class='border-b border-slate-700'><td class='px-4 py-2 font-mono text-cyan-300'>${lexeme.lemma}</td><td class='px-4 py-2 text-slate-400 italic'>${lexeme.pos}</td><td class='px-4 py-2 text-slate-300'>${lexeme.gloss}</td><td class='px-4 py-2 text-slate-500'>${lexeme.etymology ?? ''}</td></tr>`;
            });
            content += '</tbody></table></div>';
        }
    } else if (artifact.type === ArtifactType.Wiki) {
        const wiki = artifact.data as WikiData;
        const wikiHtml = simpleMarkdownToHtml(wiki?.content ?? '');
        content += "<h2 class='text-2xl font-bold text-white mt-8 mb-4'>Wiki</h2>";
        content += `<div class='prose prose-invert max-w-none bg-slate-800/60 border border-slate-700 rounded-lg p-6'>${wikiHtml}</div>`;
    } else if (artifact.type === ArtifactType.Location) {
        const location = artifact.data as LocationData;
        content += "<div class='grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8'>";
        content += `<div class='lg:col-span-2 bg-slate-800 p-5 rounded-lg border border-slate-700'><h2 class='text-xl font-bold text-white mb-3'>Description</h2><p class='text-slate-300 leading-relaxed'>${(location?.description || '').replace(/\n/g, '<br>')}</p></div>`;
        content += "<div class='bg-slate-800 p-5 rounded-lg border border-slate-700'><h2 class='text-xl font-bold text-white mb-3'>Notable Features</h2>";
        if (Array.isArray(location?.features) && location.features.length > 0) {
            content += "<ul class='space-y-2'>";
            location.features.forEach(feature => {
                content += `<li class='bg-slate-900/60 border border-slate-700 rounded-md p-3'><strong class='text-slate-200'>${feature.name}</strong><p class='text-slate-400 text-sm mt-1'>${feature.description}</p></li>`;
            });
            content += '</ul>';
        } else {
            content += "<p class='text-slate-500 text-sm'>No features documented yet.</p>";
        }
        content += '</div></div>';
    } else if (artifact.type === ArtifactType.Task) {
        const task = artifact.data as TaskData;
        content += "<h2 class='text-2xl font-bold text-white mt-8 mb-4'>Task Details</h2>";
        content += "<div class='bg-slate-800 p-5 rounded-lg border border-slate-700 space-y-2 text-slate-300'>";
        content += `<p><span class='text-slate-400'>State:</span> ${task?.state ?? TASK_STATE.Todo}</p>`;
        if (task?.assignee) {
            content += `<p><span class='text-slate-400'>Assignee:</span> ${task.assignee}</p>`;
        }
        if (task?.due) {
            content += `<p><span class='text-slate-400'>Due:</span> ${task.due}</p>`;
        }
        content += '</div>';
    } else if (artifact.type === ArtifactType.Repository) {
        const repo = artifact.data as RepositoryData;
        content += "<h2 class='text-2xl font-bold text-white mt-8 mb-4'>Repository Stats</h2>";
        content += "<div class='bg-slate-800 p-5 rounded-lg border border-slate-700 space-y-2 text-slate-300'>";
        content += `<p><span class='text-slate-400'>URL:</span> <a href='${repo.url}' class='text-cyan-400 hover:underline'>${repo.url}</a></p>`;
        content += `<p><span class='text-slate-400'>Default Branch:</span> ${repo.defaultBranch}</p>`;
        content += `<p><span class='text-slate-400'>Language:</span> ${repo.language ?? 'Unknown'}</p>`;
        content += `<p><span class='text-slate-400'>Stars:</span> ${repo.stars}</p>`;
        content += `<p><span class='text-slate-400'>Forks:</span> ${repo.forks}</p>`;
        content += `<p><span class='text-slate-400'>Watchers:</span> ${repo.watchers}</p>`;
        content += `<p><span class='text-slate-400'>Open Issues:</span> ${repo.openIssues}</p>`;
        content += '</div>';
    } else if (artifact.type === ArtifactType.Issue) {
        const issue = artifact.data as IssueData;
        content += "<h2 class='text-2xl font-bold text-white mt-8 mb-4'>Issue Details</h2>";
        content += "<div class='bg-slate-800 p-5 rounded-lg border border-slate-700 space-y-2 text-slate-300'>";
        content += `<p><span class='text-slate-400'>Number:</span> #${issue.number}</p>`;
        content += `<p><span class='text-slate-400'>State:</span> ${issue.state}</p>`;
        content += `<p><span class='text-slate-400'>Author:</span> ${issue.author}</p>`;
        if (issue.labels.length > 0) {
            content += `<p><span class='text-slate-400'>Labels:</span> ${issue.labels.join(', ')}</p>`;
        }
        content += `<p><span class='text-slate-400'>Comments:</span> ${issue.comments}</p>`;
        content += `<a href='${issue.url}' class='text-cyan-400 hover:underline'>View on GitHub</a>`;
        content += '</div>';
    } else if (artifact.type === ArtifactType.Release) {
        const release = artifact.data as ReleaseData;
        content += "<h2 class='text-2xl font-bold text-white mt-8 mb-4'>Release Details</h2>";
        content += "<div class='bg-slate-800 p-5 rounded-lg border border-slate-700 space-y-2 text-slate-300'>";
        content += `<p><span class='text-slate-400'>Tag:</span> ${release.tagName}</p>`;
        content += `<p><span class='text-slate-400'>Author:</span> ${release.author}</p>`;
        content += `<p><span class='text-slate-400'>Published:</span> ${release.publishedAt ?? 'Unpublished'}</p>`;
        content += `<p><span class='text-slate-400'>Draft:</span> ${release.draft ? 'Yes' : 'No'}</p>`;
        content += `<p><span class='text-slate-400'>Pre-release:</span> ${release.prerelease ? 'Yes' : 'No'}</p>`;
        content += `<a href='${release.url}' class='text-cyan-400 hover:underline'>View on GitHub</a>`;
        content += '</div>';
    } else if (artifact.type === ArtifactType.Product) {
        const product = sanitizeProductData(artifact.data as ProductData, artifact.title);
        content += "<h2 class='text-2xl font-bold text-white mt-8 mb-4'>Merchandise overview</h2>";
        content += `<div class='bg-slate-800 p-5 rounded-lg border border-slate-700 text-slate-200 leading-relaxed'>${product.description.replace(/\n/g, '<br>')}</div>`;

        content += "<div class='grid grid-cols-1 md:grid-cols-2 gap-4 mt-6'>";
        content += `<div class='bg-slate-900/60 border border-slate-700 rounded-lg p-4 text-sm text-slate-200'><div class='text-xs uppercase tracking-wide text-slate-400 mb-1'>Vendor</div>${product.vendor && product.vendor.length > 0 ? product.vendor : 'Unspecified'}</div>`;
        content += `<div class='bg-slate-900/60 border border-slate-700 rounded-lg p-4 text-sm text-slate-200'><div class='text-xs uppercase tracking-wide text-slate-400 mb-1'>Fulfillment</div>${product.fulfillmentNotes && product.fulfillmentNotes.length > 0 ? product.fulfillmentNotes : 'Unspecified'}</div>`;
        content += '</div>';

        if (product.variants.length > 0) {
            content += "<h3 class='text-xl font-bold text-white mt-8 mb-3'>Items</h3>";
            content += "<div class='overflow-x-auto'><table class='min-w-full text-left border-collapse'>";
            content += "<thead class='bg-slate-800/80'><tr><th class='px-4 py-2 text-sm text-slate-300'>Name</th><th class='px-4 py-2 text-sm text-slate-300'>Price</th><th class='px-4 py-2 text-sm text-slate-300'>SKU</th><th class='px-4 py-2 text-sm text-slate-300'>Availability</th><th class='px-4 py-2 text-sm text-slate-300'>Link</th><th class='px-4 py-2 text-sm text-slate-300'>Notes</th></tr></thead><tbody>";
            product.variants.forEach(variant => {
                content += "<tr class='border-b border-slate-700'>";
                content += `<td class='px-4 py-2 text-slate-200 font-semibold'>${variant.name}</td>`;
                content += `<td class='px-4 py-2 text-slate-300'>${variant.price ?? ''}</td>`;
                content += `<td class='px-4 py-2 text-slate-300'>${variant.sku ?? ''}</td>`;
                content += `<td class='px-4 py-2 text-slate-300'>${formatProductAvailability(variant.availability)}</td>`;
                content += `<td class='px-4 py-2 text-slate-300'>${variant.url ? `<a href='${variant.url}' class='text-cyan-400 hover:underline'>${variant.url}</a>` : ''}</td>`;
                content += `<td class='px-4 py-2 text-slate-300'>${variant.notes ?? ''}</td>`;
                content += '</tr>';
            });
            content += '</tbody></table></div>';
        }
    }
    // Add more specific renderers here for other types...

    if (artifact.tags.length > 0) {
        content += "<h2 class='text-2xl font-bold text-white mt-8 mb-4'>Tags</h2>";
        content += "<div class='flex flex-wrap gap-2'>";
        artifact.tags.forEach(tag => {
            content += `<span class='px-3 py-1 text-xs font-semibold uppercase tracking-wide bg-slate-800 border border-slate-700 rounded-full text-slate-200'>${tag}</span>`;
        });
        content += '</div>';
    }

    // Render relations
    if (artifact.relations.length > 0) {
        content += "<h2 class='text-2xl font-bold text-white mt-8 mb-4'>Relations</h2><ul class='list-disc list-inside'>";
        artifact.relations.forEach(rel => {
            const target = allArtifacts.find(a => a.id === rel.toId);
            if (target) {
                const targetFilename = `${target.type}_${target.title.replace(/\s+/g, '_').toLowerCase()}.html`;
                content += `<li class='text-slate-400'>${rel.kind.replace(/_/g, ' ')} <a href='${targetFilename}' class='text-cyan-400 hover:underline'>${target.title}</a></li>`;
            }
        });
        content += '</ul>';
    }
    
    content += `<br/><a href='../index.html' class='mt-8 inline-block text-cyan-400 hover:text-cyan-300'>&larr; Back to Project Overview</a>`;
    return content;
};

export const createProjectStaticSiteFiles = (
    project: Project,
    artifacts: Artifact[],
): StaticSiteFile[] => {
    const files: StaticSiteFile[] = [];

    let indexContent = `<h1 class='text-4xl font-bold text-white mb-2'>${project.title}</h1>`;
    indexContent += `<p class='text-lg text-slate-400 mb-8'>${project.summary}</p>`;
    indexContent += "<h2 class='text-2xl font-bold text-white mb-4'>Artifacts</h2><div class='grid grid-cols-1 md:grid-cols-3 gap-4'>";

    artifacts.forEach(artifact => {
        const normalizedTitle = artifact.title.replace(/\s+/g, '_').toLowerCase();
        const filename = `${artifact.type}_${normalizedTitle}.html`;
        const artifactPath = `artifacts/${filename}`;
        indexContent += `<a href='${artifactPath}' class='block bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-cyan-500 transition'>
            <h3 class='font-bold text-slate-200'>${artifact.title}</h3>
            <p class='text-sm text-cyan-400'>${artifact.type}</p>
        </a>`;

        const artifactHtml = generateArtifactContent(artifact, artifacts);
        files.push({
            path: `artifacts/${filename}`,
            contents: createHtmlShell(`${artifact.title} | ${project.title}`, artifactHtml),
        });
    });

    indexContent += '</div>';

    files.unshift({
        path: 'index.html',
        contents: createHtmlShell(project.title, indexContent),
    });

    return files;
};

export async function exportProjectAsStaticSite(project: Project, artifacts: Artifact[]) {
    const zip = new JSZip();
    const projectSlug = project.title.replace(/\s+/g, '_').toLowerCase();
    const siteFiles = createProjectStaticSiteFiles(project, artifacts);

    siteFiles.forEach(file => {
        zip.file(file.path, file.contents);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${projectSlug}_static_site.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
