'use client';

import React from 'react';

interface DiffViewerProps {
  diffMarkup: string;
}

export function DiffViewer({ diffMarkup }: DiffViewerProps) {
  return (
    <div className="diff-viewer">
      <div 
        dangerouslySetInnerHTML={{ __html: diffMarkup }} 
        className="diff-content"
      />
    </div>
  );
}
