"use client";

import { useCoAgent, useCopilotChat } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { MessageRole, TextMessage } from "@copilotkit/runtime-client-gql";
import { useState, useEffect } from "react";

interface StoryCreatorAgentState {
  input: string;
  story_content?: {
    title: string;
    story: string;
    genre: string;
    summary: string;
  };
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

  const { messages, isLoading, submitMessage } = useCopilotChat();
  const [previewMode, setPreviewMode] = useState(false);

  // Listen to chat messages and update the story
  useEffect(() => {
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "user") {
        setStoryCreatorAgentState({
          ...storyCreatorAgentState,
          input: lastMessage.content
        });
        runStoryCreatorAgent(() => new TextMessage({ 
          role: MessageRole.User, 
          content: lastMessage.content 
        }));
      }
    }
  }, [messages]);

  const renderPreview = () => {
    if (!storyCreatorAgentState.story_content) return null;
    
    return (
      <div className="preview-container bg-amber-50 p-8 rounded-lg shadow-lg w-full max-w-5xl mx-auto my-8 font-serif">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">{storyCreatorAgentState.story_content.title}</h1>
          <p className="text-gray-600 italic">Genre: {storyCreatorAgentState.story_content.genre}</p>
        </div>
        
        <div className="mb-8 bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Summary</h2>
          <p className="text-gray-700 leading-relaxed">{storyCreatorAgentState.story_content.summary}</p>
        </div>

        <div className="story-content bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Story</h2>
          <div className="prose max-w-none">
            {storyCreatorAgentState.story_content.story.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-gray-700 leading-relaxed mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderEditor = () => {
    if (!storyCreatorAgentState.story_content) return null;

    return (
      <div className="mt-8 w-full max-w-5xl bg-white p-6 rounded-lg shadow-md">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{storyCreatorAgentState.story_content.title}</h2>
            <p className="text-sm text-gray-600">Genre: {storyCreatorAgentState.story_content.genre}</p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Summary</h3>
            <p className="text-gray-700">{storyCreatorAgentState.story_content.summary}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Story</h3>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{storyCreatorAgentState.story_content.story}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Story Creator</h1>

      {storyCreatorAgentState.story_content && (
        <div className="w-full">
          <div className="flex justify-center mb-4">
            {/* <button
              onClick={() => setPreviewMode(!previewMode)}
              className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
            >
              {previewMode ? "View Editor" : "Preview Story"}
            </button> */}
          </div>
          
          {previewMode ? renderPreview() : renderEditor()}
        </div>
      )}

      <CopilotSidebar defaultOpen={true}/>
    </div>
  );
}
