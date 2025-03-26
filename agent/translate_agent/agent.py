"""
This is the main entry point for the AI.
It defines the workflow graph and the entry point for the agent.
"""
# pylint: disable=line-too-long, unused-import

from typing import cast, TypedDict, Any
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, ToolMessage, AIMessage, HumanMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import MessagesState
from copilotkit.langgraph import copilotkit_customize_config

class StoryContent(TypedDict):
    """Contains the story content and metadata."""
    title: str
    story: str
    genre: str
    summary: str

class AgentState(MessagesState):
    """Contains the state of the agent."""
    story_content: StoryContent
    input: str

async def story_creator_node(state: AgentState, config: RunnableConfig):
    """Chatbot that creates engaging stories"""

    config = copilotkit_customize_config(
        config,
        emit_intermediate_state=[
            {
                "state_key": "story_content",
                "tool": "story_creator"
            }
        ]
    )

    model = ChatOpenAI(model="gpt-4o").bind_tools(
        [StoryContent],
        parallel_tool_calls=False,
        tool_choice="StoryContent"  # Always generate story content
    )

    # Extract story prompt from the input or last message
    story_prompt = state.get("input", "")
    if not story_prompt and state["messages"]:
        last_message = state["messages"][-1]
        if isinstance(last_message, HumanMessage):
            story_prompt = last_message.content

    response = await model.ainvoke([
        SystemMessage(
            content=f"""
            You are a creative storyteller that creates engaging and imaginative stories based on user prompts or descriptions.
            Generate stories with clear narrative structure, engaging characters, and vivid descriptions.
            Always generate a complete story with a title, genre, summary, and the full story text.
            Use the provided prompt to create an engaging story: "{story_prompt}"
            """
        ),
        *state["messages"],
    ], config)

    if hasattr(response, "tool_calls") and len(getattr(response, "tool_calls")) > 0:
        ai_message = cast(AIMessage, response)
        return {
            "messages": [
                response,
                ToolMessage(
                    content="Story created!",
                    tool_call_id=ai_message.tool_calls[0]["id"]
                )
            ],
            "story_content": cast(AIMessage, response).tool_calls[0]["args"],
        }

    return {
        "messages": [           
            response,
        ],
    }

workflow = StateGraph(AgentState)
workflow.add_node("story_creator_node", cast(Any, story_creator_node))
workflow.set_entry_point("story_creator_node")
workflow.add_edge("story_creator_node", END)
memory = MemorySaver()
graph = workflow.compile(checkpointer=memory)
