"""
This is the main entry point for the AI.
It defines the workflow graph and the entry point for the agent.
"""
# pylint: disable=line-too-long, unused-import

from typing import cast, TypedDict, Any, Dict, List, Callable, Literal
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, ToolMessage, AIMessage, HumanMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import MessagesState
from langgraph.types import interrupt
from copilotkit.langgraph import copilotkit_customize_config
import difflib
import re

class StoryContent(TypedDict):
    """Contains the story content and metadata."""
    title: str
    story: str
    genre: str
    summary: str

class AgentState(MessagesState):
    """Contains the state of the agent."""
    story_content: StoryContent  # Current version of the story
    previous_story_content: StoryContent  # Previous version of the story
    input: str
    pending_confirmation: bool
    is_edit: bool  # Flag to indicate if this is an edit to an existing story
    diff_markup: str  # HTML markup with diff highlighting

def generate_diff_markup(old_text: str, new_text: str) -> str:
    """
    Generate HTML markup with additions and deletions highlighted.
    
    Args:
        old_text: The previous version of the text
        new_text: The new version of the text
        
    Returns:
        HTML markup with added words in green and deleted words in red
    """
    # For debugging
    print(f"Generating diff between:\nOLD: {old_text[:100]}...\nNEW: {new_text[:100]}...")
    
    # Split text into words while preserving whitespace and punctuation
    def tokenize(text):
        # This pattern captures words, punctuation, and whitespace as separate tokens
        return re.findall(r'\S+|\s+', text)
    
    old_tokens = tokenize(old_text)
    new_tokens = tokenize(new_text)
    
    # Use difflib to find differences
    diff = difflib.SequenceMatcher(None, old_tokens, new_tokens)
    
    # Generate markup
    markup = []
    for tag, i1, i2, j1, j2 in diff.get_opcodes():
        if tag == 'equal':
            # Unchanged text
            markup.extend(old_tokens[i1:i2])
        elif tag == 'delete':
            # Deleted text (red)
            markup.extend([f'<span class="deleted">{token}</span>' for token in old_tokens[i1:i2]])
        elif tag == 'insert':
            # Added text (green)
            markup.extend([f'<span class="added">{token}</span>' for token in new_tokens[j1:j2]])
        elif tag == 'replace':
            # Replaced text (both red and green)
            markup.extend([f'<span class="deleted">{token}</span>' for token in old_tokens[i1:i2]])
            markup.extend([f'<span class="added">{token}</span>' for token in new_tokens[j1:j2]])
    
    result = ''.join(markup)
    print(f"Generated diff markup (first 200 chars): {result[:200]}...")
    return result

def should_continue(state: AgentState) -> Literal["continue", "end"]:
    """Determine if we should continue or end the workflow."""
    if state.get("pending_confirmation", False):
        return "continue"
    return "end"

async def story_creator_node(state: AgentState, config: RunnableConfig):
    """Chatbot that creates engaging stories"""

    config = copilotkit_customize_config(
        config,
        emit_intermediate_state=[
            {
                "state_key": "story_content",
                "tool": "StoryContent"
            },
            {
                "state_key": "diff_markup",
                "tool": "string"
            }
        ]
    )

    # Check if we're waiting for confirmation
    if state.get("pending_confirmation", False):
        # We already have the story content in the state, now ask for confirmation
        story_content = state.get("story_content")
        previous_story_content = state.get("previous_story_content")
        is_edit = state.get("is_edit", False)
        
        confirmation_message = ""
        if is_edit:
            confirmation_message = f"I've updated the story '{story_content['title']}' with your requested changes. Would you like to keep these changes?"
        else:
            confirmation_message = f"Would you like to proceed with this story?"
        
        answer = interrupt(confirmation_message)
        
        # If user cancels, revert to the previous version if this is an edit
        if answer == "Cancel":
            if is_edit and previous_story_content:
                return {
                    "messages": [
                        *state["messages"],
                        AIMessage(content="I've reverted back to the previous version of the story.")
                    ],
                    "story_content": previous_story_content,  # Revert to previous version
                    "previous_story_content": previous_story_content,  # Keep track of the previous version
                    "pending_confirmation": False,  # Reset the confirmation flag
                    "is_edit": False,  # No longer in edit mode
                    "diff_markup": ""  # Clear the diff markup
                }
            else:
                # If this is the first story, just keep it in preview mode
                return {
                    "messages": [
                        *state["messages"],
                        AIMessage(content="I'll keep the story in preview mode. Let me know if you'd like to make any changes.")
                    ],
                    "story_content": story_content,
                    "previous_story_content": story_content,  # Keep track of the current version
                    "pending_confirmation": False,  # Reset the confirmation flag
                    "is_edit": False,  # No longer in edit mode
                    "diff_markup": ""  # Clear the diff markup
                }
        
        # User confirmed, keep the new version
        return {
            "messages": [
                *state["messages"],
                AIMessage(content=f"Great! I've finalized your story '{story_content['title']}'. You can view it in the main panel.")
            ],
            "story_content": story_content,
            "previous_story_content": story_content,  # Update the previous version to the current one
            "pending_confirmation": False,  # Reset the confirmation flag
            "is_edit": True,  # No longer in edit mode
            "diff_markup": ""  # Clear the diff markup
        }

    # Check if we already have a story and this is an edit request
    existing_story = state.get("story_content")
    if existing_story and not state.get("pending_confirmation", False):
        # Extract edit request from the last message
        edit_request = ""
        if state["messages"]:
            last_message = state["messages"][-1]
            if isinstance(last_message, HumanMessage):
                edit_request = last_message.content
        
        # If we already have a story and received a new message, treat it as an edit request
        if edit_request:
            # This is an edit request, generate a new version of the story
            model = ChatOpenAI(model="gpt-4o").bind_tools(
                [StoryContent],
                parallel_tool_calls=False,
                tool_choice="StoryContent"  # Always generate story content
            )
            
            response = await model.ainvoke([
                SystemMessage(
                    content=f"""
                    You are a creative storyteller that edits stories based on user requests.
                    You will be given an existing story and an edit request.
                    Make the requested changes while maintaining the overall narrative structure and quality.
                    
                    Existing story:
                    Title: {existing_story['title']}
                    Genre: {existing_story['genre']}
                    Summary: {existing_story['summary']}
                    Story: {existing_story['story']}
                    
                    Edit request: "{edit_request}"
                    
                    Generate the updated story with the requested changes.
                    """
                ),
            ], config)
            
            if hasattr(response, "tool_calls") and len(getattr(response, "tool_calls")) > 0:
                ai_message = cast(AIMessage, response)
                updated_story = cast(AIMessage, response).tool_calls[0]["args"]
                
                # Generate diff markup for the story content
                diff_markup = generate_diff_markup(existing_story['story'], updated_story['story'])
                
                # First, update the UI with the updated story content
                return {
                    "messages": [
                        *state["messages"],
                        response,  # Include the AI message with tool calls
                        ToolMessage(  # Add the tool message to respond to the tool call
                            content="Story updated successfully",
                            tool_call_id=ai_message.tool_calls[0]["id"]
                        ),
                        AIMessage(content=f"I've updated the story with your requested changes. Please confirm if you'd like to keep these changes.")
                    ],
                    "story_content": updated_story,  # Set the updated story as the current version
                    "previous_story_content": existing_story,  # Save the previous version
                    "pending_confirmation": True,  # Set flag to indicate we're waiting for confirmation
                    "is_edit": True,  # Flag this as an edit operation
                    "diff_markup": diff_markup  # Include the diff markup
                }

    # If we don't have a story yet or it's not an edit request, generate a new story
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
        story_content = cast(AIMessage, response).tool_calls[0]["args"]
        
        # First, update the UI with the story content and include the tool message response
        # to satisfy OpenAI's requirement that tool calls must be followed by tool messages
        return {
            "messages": [
                *state["messages"],
                response,  # Include the AI message with tool calls
                ToolMessage(  # Add the tool message to respond to the tool call
                    content="Story generated successfully",
                    tool_call_id=ai_message.tool_calls[0]["id"]
                ),
                AIMessage(content=f"Please confirm if you'd like to keep it.")
            ],
            "story_content": story_content,
            "previous_story_content": story_content,  # Initialize the previous version to be the same as the current
            "pending_confirmation": True,  # Set flag to indicate we're waiting for confirmation
            "is_edit": False,  # This is not an edit operation
            "diff_markup": ""  # No diff markup for new stories
        }

    return {
        "messages": [           
            response,
        ],
    }

# Define the workflow
workflow = StateGraph(AgentState)
workflow.add_node("story_creator_node", cast(Any, story_creator_node))
workflow.set_entry_point("story_creator_node")

# Define the conditional edges
workflow.add_conditional_edges(
    "story_creator_node",
    should_continue,
    {
        "continue": "story_creator_node",
        "end": END
    }
)

memory = MemorySaver()
graph = workflow.compile(checkpointer=memory)
