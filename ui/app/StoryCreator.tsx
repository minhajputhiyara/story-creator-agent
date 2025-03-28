"use client";

import { useCoAgent, useCopilotChat, useLangGraphInterrupt } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { MessageRole, TextMessage } from "@copilotkit/runtime-client-gql";
import { useState, useEffect } from "react";
import { AnswerMarkdown } from "../components/AnswerMarkdown";

interface StoryCreatorAgentState {
  input: string;
  story_content?: {
    title: string;
    story: string;
    genre: string;
    summary: string;
  } | null;
  previous_story_content?: {
    title: string;
    story: string;
    genre: string;
    summary: string;
  } | null;
  pending_confirmation?: boolean;
  is_edit?: boolean;
  diff_markup?: string;
}

export function StoryCreator() {
  const {
    state: storyCreatorAgentState,
    setState: setStoryCreatorAgentState,
    run: runStoryCreatorAgent,
  } = useCoAgent<StoryCreatorAgentState>({
    name: "story_creator_agent",
    initialState: { input: "" },
  });

  // Add the LangGraph interrupt handler with styled buttons
  useLangGraphInterrupt({
    render: ({ event, resolve }) => (
      <div className="flex flex-col p-4 mb-4 bg-gray-100 rounded-lg border border-gray-300">
        <p className="mb-4">{event.value}</p>
        <div className="flex space-x-4">
          <button
            onClick={() => resolve("Confirm")}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Confirm
          </button>
          <button
            onClick={() => resolve("Cancel")}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    ),
  });

  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
const [animationIndex, setAnimationIndex] = useState(0);

useEffect(() => {
  const oldStory = storyCreatorAgentState.previous_story_content?.story || "";
  const newStory = storyCreatorAgentState.story_content?.story || "";

  const oldWords = oldStory.split(" ");
  const newWords = newStory.split(" ");

  let i = 0;
  const maxSteps = Math.max(oldWords.length, newWords.length);

  const interval = setInterval(() => {
    const nextWords = [
      ...newWords.slice(0, i + 1),
      ...oldWords.slice(i + 1), // Optional: tail from old for transition effect
    ].slice(0, maxSteps); // Clamp length

    setDisplayedWords(nextWords);
    setAnimationIndex(i);

    i++;

    if (i >= maxSteps) clearInterval(interval);
  }, 80); // Tune speed here

  return () => clearInterval(interval);
}, [storyCreatorAgentState.story_content?.story]);



  const renderContent = () => {
    // Check if story_content is null or undefined
    if (!storyCreatorAgentState.story_content) {
      return (
        <div className="h-screen flex items-center justify-center text-gray-400 text-lg font-light">
          Your content will appear here...
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={storyCreatorAgentState?.story_content?.title || ""}
              readOnly
              className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none mb-2"
              placeholder="Title"
            />
            {storyCreatorAgentState.pending_confirmation ? (
              storyCreatorAgentState.is_edit ? (
                <div className="text-sm text-purple-600 font-medium px-3 py-1 bg-purple-100 rounded-full">
                  Awaiting edit confirmation
                </div>
              ) : (
                <div className="text-sm text-amber-600 font-medium px-3 py-1 bg-amber-100 rounded-full">
                  Awaiting confirmation
                </div>
              )
            ) : (
              <div className="text-sm text-blue-600 font-medium px-3 py-1 bg-blue-100 rounded-full">
                Final version
              </div>
            )}
          </div>
          <div className="text-sm text-gray-500">
            Genre: {storyCreatorAgentState?.story_content?.genre || ""}
          </div>
          
          <div className="prose max-w-none">
            {/* <div className="text-gray-700 mb-8">
              {storyCreatorAgentState.story_content.summary}
            </div> */}

            <div className="text-gray-700 leading-relaxed">
            <div className="flex flex-wrap gap-1 text-gray-700 leading-relaxed">
            {displayedWords.map((word, i) => (
              <span key={i} className="transition-opacity duration-150">
                {word}
              </span>
            ))}
            </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-white">
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>
      <CopilotSidebar defaultOpen={true} />
    </div>
  );
}
