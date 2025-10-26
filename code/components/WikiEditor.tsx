
import React, { useState, useMemo } from 'react';
import { Artifact, WikiData } from '../types';
import { GlobeAltIcon } from './Icons';

interface WikiEditorProps {
  artifact: Artifact;
  onUpdateArtifactData: (artifactId: string, data: WikiData) => void;
}

// A very simple markdown to HTML converter for preview purposes
const simpleMarkdownToHtml = (text: string) => {
  let html = text
    .replace(/^### (.*$)/gim, "<h3 class='text-lg font-bold mt-4 mb-2'>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2 class='text-xl font-bold mt-5 mb-2 border-b border-slate-700 pb-1'>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1 class='text-2xl font-bold mt-6 mb-3 border-b-2 border-slate-600 pb-2'>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, "<code class='bg-slate-700 text-pink-400 rounded px-1 py-0.5 text-sm'>$1</code>")
    .replace(/^\* (.*$)/gim, "<li class='ml-4 list-disc'>$1</li>")
    .replace(/\n/g, '<br />');
  return html;
};

const WikiEditor: React.FC<WikiEditorProps> = ({ artifact, onUpdateArtifactData }) => {
  const data = (artifact.data as WikiData) || { content: `# ${artifact.title}\n\nStart writing your wiki page here.` };
  const [content, setContent] = useState(data.content);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onUpdateArtifactData(artifact.id, { content: e.target.value });
  };

  const previewHtml = useMemo(() => simpleMarkdownToHtml(content), [content]);

  return (
    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
      <h3 className="text-xl font-bold text-indigo-400 mb-4 flex items-center gap-2">
        <GlobeAltIcon className="w-6 h-6" />
        Wiki Editor: {artifact.title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="wiki-content" className="block text-sm font-medium text-slate-300 mb-1">
            Markdown Content
          </label>
          <textarea
            id="wiki-content"
            value={content}
            onChange={handleContentChange}
            className="w-full h-[500px] bg-slate-900/70 border border-slate-700 rounded-md p-3 text-slate-200 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            placeholder="Write your content using Markdown..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Live Preview
          </label>
          <div
            className="w-full h-[500px] bg-slate-900/70 border border-slate-700 rounded-md p-3 text-slate-300 prose prose-sm prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </div>
  );
};

export default WikiEditor;
