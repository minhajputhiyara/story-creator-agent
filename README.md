# Story Creator CoAgents Shared State Example

This example demonstrates how to share state between the agent and the UI for a story creator application that generates HTML and CSS code.

**These instructions assume you are in the `coagents-shared-state/` directory**

## Running the Agent

First, install the dependencies:

```sh
cd agent
poetry install
```

Then, create a `.env` file inside `./agent` with the following:

```
OPENAI_API_KEY=...
```

IMPORTANT:
Make sure the OpenAI API Key you provide, supports gpt-4o.

Then, run the demo:

```sh
poetry run demo
```

## Running the UI

First, install the dependencies:

```sh
cd ./ui
pnpm i
```

Then, create a `.env` file inside `./ui` with the following:

```
OPENAI_API_KEY=...
```

Then, run the Next.js project:

```sh
pnpm run dev
```

## Using the Story Creator

1. Enter a description of the story you want to create in the text area
2. Click "Generate Story" to have the AI create stories.
3. View the generated code story in the text area
4. You can modify your description and generate a new story as many times as you like
5. accept or reject the change .

The story creator uses GPT-4o to generate clean, responsive, and modern story code based on your text descriptions.

# LangGraph Studio

Run LangGraph studio, then load the `./agent` folder into it.

Make sure to create the `.env` mentioned above first!
