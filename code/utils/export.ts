
import { Artifact, Project, ArtifactType, Scene, CharacterData, LocationData, ConlangLexeme } from '../types';
import JSZip from 'jszip';

function escapeCsvCell(cell: any): string {
    const cellStr = String(cell ?? '');
    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
    }
    return cellStr;
}

export function exportArtifactsToCSV(artifacts: Artifact[], projectName: string) {
    if (artifacts.length === 0) {
        alert('No artifacts to export.');
        return;
    }

    const headers = ['id', 'type', 'projectId', 'title', 'summary', 'status', 'tags', 'relations'];
    const csvRows = [headers.join(',')];

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
        ];
        csvRows.push(row.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        const filename = `${projectName.replace(/\s+/g, '_').toLowerCase()}_artifacts.csv`;
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

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

    const body = `# ${artifact.title}\n\n${artifact.summary}`;

    const markdownString = frontmatter + body;
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
    if (artifact.type === ArtifactType.Story) {
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
    }
    // Add more specific renderers here for other types...

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
