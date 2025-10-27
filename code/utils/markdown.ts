export const simpleMarkdownToHtml = (text: string): string => {
  let html = text;
  html = html.replace(/^### (.*$)/gim, "<h3 class='text-lg font-bold mt-4 mb-2'>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2 class='text-xl font-bold mt-5 mb-2 border-b border-slate-700 pb-1'>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1 class='text-2xl font-bold mt-6 mb-3 border-b-2 border-slate-600 pb-2'>$1</h1>");
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, "<code class='bg-slate-700 text-pink-400 rounded px-1 py-0.5 text-sm'>$1</code>");
  html = html.replace(/^\* (.*$)/gim, "<li class='ml-4 list-disc'>$1</li>");
  html = html.replace(/\n/g, '<br />');
  return html;
};

export const escapeMarkdownCell = (value: string): string => {
  if (!value) return '';
  return value.replace(/\|/g, '\\|');
};
