# Website Builder CoAgents Shared State Example

This example demonstrates how to share state between the agent and the UI for a website builder application that generates HTML and CSS code.

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

## Using the Website Builder

1. Enter a description of the website you want to create in the text area
2. Click "Generate Website" to have the AI create HTML and CSS code based on your description
3. View the generated code in the HTML and CSS panels
4. Click "Preview Website" to see a live preview of your generated website
5. You can modify your description and generate a new website as many times as you like

The website builder uses GPT-4o to generate clean, responsive, and modern website code based on your text descriptions.

# LangGraph Studio

Run LangGraph studio, then load the `./agent` folder into it.

Make sure to create the `.env` mentioned above first!

# Troubleshooting

A few things to try if you are running into trouble:

1. Make sure there is no other local application server running on the 8000 port.
2. Under `/agent/translate_agent/demo.py`, change `0.0.0.0` to `127.0.0.1` or to `localhost`
