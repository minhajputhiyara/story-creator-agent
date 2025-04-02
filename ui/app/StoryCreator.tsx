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
    const newStory = storyCreatorAgentState.story_content?.story || "";
    if (!newStory) return;
  
    if (!storyCreatorAgentState.is_edit) {
      // New story: normal streaming without diff animation.
      const newWords = newStory.split(" ");
      setDisplayedWords([]);
      let currentIndex = 0;
      const normalInterval = window.setInterval(() => {
        setDisplayedWords((prev) => [
          ...prev,
          {
            oldWord: "",
            newWord: newWords[currentIndex],
            status: "normal",
          },
        ]);
        currentIndex++;
        if (currentIndex >= newWords.length) clearInterval(normalInterval);
      }, 35);
      return () => clearInterval(normalInterval);
    } else {
      // Edited story: initialize the displayed words immediately and then run the diff animation.
      const oldStory = storyCreatorAgentState.previous_story_content?.story || "";
      const oldWords = oldStory.split(" ");
      const newWords = newStory.split(" ");
      const maxSteps = Math.max(oldWords.length, newWords.length);
  
      // Set the initial state immediately based on old and new words.
      const initialWordStates: WordState[] = Array.from({ length: maxSteps }, (_, i) => ({
        oldWord: oldWords[i] || "",
        newWord: newWords[i] || "",
        status: "normal",
      }));
      setDisplayedWords(initialWordStates);
  
      // Start the diff animation directly.
      let animationIndex = 0;
      const diffInterval = window.setInterval(() => {
        setDisplayedWords((prev) =>
          prev.map((word, i) => {
            if (i === animationIndex) {
              return {
                ...word,
                status: word.oldWord === word.newWord ? "animating" : "mismatched",
              };
            } else if (i === animationIndex - 1 && prev[i].status === "animating") {
              return { ...word, status: "normal" };
            }
            return word;
          })
        );
        animationIndex++;
        if (animationIndex >= maxSteps) clearInterval(diffInterval);
      }, 35);
      return () => clearInterval(diffInterval);
    }
  }, [
    storyCreatorAgentState.story_content?.story,
    storyCreatorAgentState.is_edit,
  ]);
  

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
          </div>

          <div className="text-sm text-gray-500">
            Genre: {story_content.genre || ""}
          </div>

          <div className="prose max-w-none">
  {pending_confirmation && is_edit ? (
    // 🔁 Animation view for edits
    <div className="flex flex-wrap gap-1 text-gray-700 leading-relaxed">
      {displayedWords.map((word, i) => {
        if (word.status === "mismatched") {
          return (
            <span key={i} className="flex items-center gap-1">
              <span className="line-through bg-red-200 px-1 rounded">
                {word.oldWord}
              </span>
              <span className="bg-green-200 px-1 rounded">{word.newWord}</span>
            </span>
          );
        } else if (word.status === "animating") {
          return (
            <span key={i} className="line-through bg-red-200 px-1 rounded">
              {word.oldWord}
            </span>
          );
        } else {
          return <span key={i}>{word.newWord} </span>;
        }
      })}
    </div>
  ) : pending_confirmation && !is_edit ? (
    <div className="text-gray-700 leading-relaxed">
      {displayedWords.map((word, i) => (
        <span key={i}>{word.newWord} </span>
      ))}
    </div>
  ) : (
    <div className="text-gray-700 leading-relaxed">
      {storyCreatorAgentState?.previous_story_content?.story}
    </div>
  )}
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
