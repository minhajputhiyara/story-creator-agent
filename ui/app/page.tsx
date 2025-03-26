"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { StoryCreator } from "./StoryCreator";
import "@copilotkit/react-ui/styles.css";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-between">
      <CopilotKit runtimeUrl="/api/copilotkit" agent="story_creator_agent">
        <StoryCreator />
      </CopilotKit>
    </main>
  );
}
