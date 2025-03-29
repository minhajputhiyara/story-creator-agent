"use client";

import {
  useCoAgent,
  useCopilotChat,
  useLangGraphInterrupt,
} from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { MessageRole, TextMessage } from "@copilotkit/runtime-client-gql";
import { useState, useEffect, useMemo } from "react";
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

type WordStatus = "normal" | "animating" | "mismatched";

interface WordState {
  oldWord: string;
  newWord: string;
  status: WordStatus;
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

  const [displayedWords, setDisplayedWords] = useState<WordState[]>([]);

  useEffect(() => {
    const oldStory = storyCreatorAgentState.previous_story_content?.story || "";
    const newStory = storyCreatorAgentState.story_content?.story || "";
  
    const oldWords = oldStory.split(" ");
    const newWords = newStory.split(" ");
  
    const isFirstTime = oldWords.length === 0;
  
    const maxSteps = Math.max(oldWords.length, newWords.length);
  
    if (isFirstTime) {
      // First-time streaming (no highlights needed)
      let currentIndex = 0;
      const interval = window.setInterval(() => {
        setDisplayedWords((prev) => [
          ...prev,
          {
            oldWord: "",
            newWord: newWords[currentIndex],
            status: "normal",
          },
        ]);
  
        currentIndex++;
        if (currentIndex >= newWords.length) clearInterval(interval);
      }, 35);
  
      return () => clearInterval(interval);
    }
  
    // Normal comparison animation
    const initialWordStates: WordState[] = Array.from(
      { length: maxSteps },
      (_, i) => ({
        oldWord: oldWords[i] || "",
        newWord: newWords[i] || "",
        status: "normal",
      })
    );
  
    setDisplayedWords(initialWordStates);
  
    let currentIndex = 0;
    const interval = window.setInterval(() => {
      setDisplayedWords((prev) =>
        prev.map((word, i) => {
          if (i === currentIndex) {
            return {
              ...word,
              status:
                word.oldWord === word.newWord ? "animating" : "mismatched",
            };
          } else if (i === currentIndex - 1) {
            if (prev[i].status === "animating") {
              return { ...word, status: "normal" };
            }
          }
          return word;
        })
      );
  
      currentIndex++;
      if (currentIndex >= maxSteps) clearInterval(interval);
    }, 35);
  
    return () => clearInterval(interval);
  }, [storyCreatorAgentState.story_content?.story]);
  

  const renderContent = () => {
    const {
      story_content,
      is_edit,
      pending_confirmation,
    } = storyCreatorAgentState;

    if (!story_content) {
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
              value={story_content.title || ""}
              readOnly
              className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none mb-2"
              placeholder="Title"
            />
            {pending_confirmation ? (
              is_edit ? (
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
            Genre: {story_content.genre || ""}
          </div>

          <div className="prose max-w-none">
            <div className="flex flex-wrap gap-1 text-gray-700 leading-relaxed">
            {displayedWords.map((word, i) => {
  const showHighlight = storyCreatorAgentState.pending_confirmation;

  if (showHighlight && word.status === "mismatched") {
    return (
      <span key={i} className="flex items-center gap-1">
        <span className="line-through bg-red-200 px-1 rounded">
          {word.oldWord}
        </span>
        <span className="bg-green-200 px-1 rounded">{word.newWord}</span>
      </span>
    );
  } else if (showHighlight && word.status === "animating") {
    return (
      <span key={i} className="line-through bg-red-200 px-1 rounded">
        {word.oldWord}
      </span>
    );
  } else {
    // Show only the final confirmed words (newWords)
    return (
      <span key={i} className="px-1">
        {word.newWord}
      </span>
    );
  }
})}
</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-white">
      <main className="flex-1 overflow-auto">{renderContent()}</main>
      <CopilotSidebar defaultOpen={true} />
    </div>
  );
}
