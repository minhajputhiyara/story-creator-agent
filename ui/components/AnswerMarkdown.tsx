'use client';

import Markdown from "react-markdown";
import { DiffViewer } from "./DiffViewer";

interface AnswerMarkdownProps {
	markdown: string;
	diffMarkup?: string;
	isEdit?: boolean;
	pendingConfirmation?: boolean;
}

export function AnswerMarkdown({ 
	markdown, 
	diffMarkup, 
	isEdit, 
	pendingConfirmation 
}: AnswerMarkdownProps) {
	if (!markdown) return null;
	
	// Show diff markup when in edit mode and awaiting confirmation
	if (isEdit && pendingConfirmation && diffMarkup) {
		return (
			<div className='markdown-wrapper prose max-w-none'>
				<DiffViewer diffMarkup={diffMarkup} />
			</div>
		);
	}
	
	// Otherwise show regular markdown
	return (
		<div className='markdown-wrapper prose max-w-none'>
			<Markdown>{markdown}</Markdown>
		</div>
	);
}
