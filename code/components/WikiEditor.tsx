import React, { useState, useMemo } from 'react';
import { Artifact, WikiData } from '../types';
import { GlobeAltIcon } from './Icons';
import { simpleMarkdownToHtml } from '../utils/markdown';

interface WikiEditorProps {
  artifact: Artifact;
  onUpdateArtifactData: (artifactId: string, data: WikiData) => void;
}

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
          <p id="wiki-live-preview-label" className="block text-sm font-medium text-slate-300 mb-1">
            Live Preview
          </p>
          <div
            role="region"
            aria-labelledby="wiki-live-preview-label"
            className="w-full h-[500px] bg-slate-900/70 border border-slate-700 rounded-md p-3 text-slate-300 prose prose-sm prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </div>
  );
};

export default WikiEditor;
