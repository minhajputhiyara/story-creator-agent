import Markdown from "react-markdown";

export function AnswerMarkdown({ markdown }: { markdown: string }) {
	if (!markdown) return null;
	
	return (
		<div className='markdown-wrapper prose max-w-none'>
			<Markdown>{markdown}</Markdown>
		</div>
	);
}
