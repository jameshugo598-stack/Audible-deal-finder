import React, { useState } from 'react';
import { FolderGit2, FileJson, FileCode2, FileText, Download, Copy, Check, Info } from 'lucide-react';

const files = [
  {
    name: 'README.md',
    icon: <FileText size={18} className="text-blue-400" />,
    description: 'Instructions, Ko-fi donation link, and Chrome Web Store details.',
  },
  {
    name: 'manifest.json',
    icon: <FileJson size={18} className="text-yellow-400" />,
    description: 'Manifest V3 configuration for the browser extension.',
  },
  {
    name: 'content.js',
    icon: <FileCode2 size={18} className="text-green-400" />,
    description: 'The core extension script without Tampermonkey headers.',
  },
  {
    name: 'userscript.user.js',
    icon: <FileCode2 size={18} className="text-purple-400" />,
    description: 'The original script format for Tampermonkey users.',
  },
];

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b border-neutral-800 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-neutral-800 rounded-lg border border-neutral-700">
              <FolderGit2 className="text-blue-400" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Audible PowerHub Repository</h1>
              <p className="text-neutral-400">Your extension codebase has been successfully generated.</p>
            </div>
          </div>
        </header>

        {/* Instructions */}
        <section className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6">
          <div className="flex gap-3">
            <Info className="text-blue-400 shrink-0" size={24} />
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-blue-100">How to export this repository</h2>
              <p className="text-blue-200/80 leading-relaxed text-sm">
                The files for your browser extension and userscript have been generated in the root of this workspace. 
                To download them to your computer, use the AI Studio export feature:
              </p>
              <ul className="list-disc pl-5 text-sm text-blue-200/80 space-y-1">
                <li>Click the <strong>Settings</strong> menu in the AI Studio editor header.</li>
                <li>Select <strong>"Export as ZIP"</strong> to download the files locally.</li>
                <li>Or select <strong>"Export to GitHub"</strong> to push this directly to a new repository.</li>
              </ul>
              <p className="text-sm text-blue-200/80 mt-2">
                Once downloaded, you can load the folder directly into Chrome via <code>chrome://extensions</code> using Developer Mode.
              </p>
            </div>
          </div>
        </section>

        {/* File List */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-neutral-200">Generated Files</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {files.map((file) => (
              <div 
                key={file.name}
                className="bg-neutral-800/50 border border-neutral-700/50 p-4 rounded-xl flex items-start gap-4 hover:border-neutral-600 transition-colors"
              >
                <div className="mt-1 bg-neutral-800 p-2 rounded-lg border border-neutral-700">
                  {file.icon}
                </div>
                <div>
                  <h3 className="font-medium text-neutral-200">{file.name}</h3>
                  <p className="text-sm text-neutral-400 mt-1">{file.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
