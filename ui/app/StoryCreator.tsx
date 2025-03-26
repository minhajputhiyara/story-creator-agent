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

  const { messages, isLoading } = useCopilotChat();

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

  const renderContent = () => {
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
          <input
            type="text"
            value={storyCreatorAgentState.story_content.title}
            readOnly
            className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none mb-2"
            placeholder="Title"
          />
          <div className="text-sm text-gray-500">
            Genre: {storyCreatorAgentState.story_content.genre}
          </div>
          
          <div className="prose max-w-none">
            <div className="text-gray-700 mb-8">
              {storyCreatorAgentState.story_content.summary}
            </div>

            <div className="text-gray-700 leading-relaxed">
              {storyCreatorAgentState.story_content.story.split('\n\n').map((paragraph, index) => (
                <p key={index} className="mb-4">
                  {paragraph}
                </p>
              ))}
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
