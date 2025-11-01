
import {
    Artifact,
    Project,
    ArtifactType,
    Scene,
    CharacterData,
    LocationData,
    ConlangLexeme,
    TaskData,
    TaskState,
    WikiData,
    RepositoryData,
    IssueData,
    ReleaseData,
    isNarrativeArtifactType,
} from '../types';
import JSZip from 'jszip';
import { simpleMarkdownToHtml, escapeMarkdownCell } from './markdown';

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

const exportArtifactsToDelimitedFile = (artifacts: Artifact[], projectName: string, delimiter: string, extension: string) => {
    if (artifacts.length === 0) {
        alert('No artifacts to export.');
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
<body class='bg-slate-900 text-slate-300 font-sans antialiased'>
    <div class='container mx-auto p-8'>
        ${content}
    </div>
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
        content += `<p><span class='text-slate-400'>State:</span> ${task?.state ?? TaskState.Todo}</p>`;
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

export async function exportProjectAsStaticSite(project: Project, artifacts: Artifact[]) {
    const zip = new JSZip();
    const projectSlug = project.title.replace(/\s+/g, '_').toLowerCase();

    // Create main index.html
    let indexContent = `<h1 class='text-4xl font-bold text-white mb-2'>${project.title}</h1>`;
    indexContent += `<p class='text-lg text-slate-400 mb-8'>${project.summary}</p>`;
    indexContent += "<h2 class='text-2xl font-bold text-white mb-4'>Artifacts</h2><div class='grid grid-cols-1 md:grid-cols-3 gap-4'>";
    artifacts.forEach(artifact => {
        const filename = `artifacts/${artifact.type}_${artifact.title.replace(/\s+/g, '_').toLowerCase()}.html`;
        indexContent += `<a href='${filename}' class='block bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-cyan-500 transition'>
            <h3 class='font-bold text-slate-200'>${artifact.title}</h3>
            <p class='text-sm text-cyan-400'>${artifact.type}</p>
        </a>`;
    });
    indexContent += '</div>';
    zip.file('index.html', createHtmlShell(project.title, indexContent));

    // Create individual artifact pages
    const artifactsFolder = zip.folder('artifacts');
    if (artifactsFolder) {
        artifacts.forEach(artifact => {
            const filename = `${artifact.type}_${artifact.title.replace(/\s+/g, '_').toLowerCase()}.html`;
            const artifactHtml = generateArtifactContent(artifact, artifacts);
            artifactsFolder.file(filename, createHtmlShell(`${artifact.title} | ${project.title}`, artifactHtml));
        });
    }

    // Generate and download zip
    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${projectSlug}_static_site.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
