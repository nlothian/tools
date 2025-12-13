# Conversation Rounds Implementation

## Overview
This implementation adds a conversation rounds feature to the LLM Comparator tool, allowing users to build multi-turn conversations before sending them to the selected APIs.

## Features Implemented

### 1. UI Components
- **"+" Add Round Button**: Located between "System Prompt" and "User Input" sections
- **Conversation Round Cards**: Each round has:
  - Role selector (User/Assistant)
  - Message textarea
  - Delete button
- **Responsive Design**: Uses the same styling as the rest of the application

### 2. Functionality
- **Add Rounds**: Users can add unlimited conversation rounds
- **Role Selection**: Each round can be marked as "User" or "Assistant"
- **Message Editing**: Full textarea support for each message
- **Delete Rounds**: Remove individual rounds with the delete button
- **Real-time Saving**: Changes are saved to localStorage as users type

### 3. Local Storage Integration
- **Storage Key**: `saved_conversation_rounds`
- **Data Format**: JSON array of objects with `role` and `message` properties
- **Auto-save**: Saves on role change, message input, and round deletion
- **Auto-load**: Loads saved rounds when page loads

### 4. API Integration
All API calls now include conversation rounds in the message history:
- **OpenAI**: Messages array includes system prompt + conversation rounds + final user input
- **Anthropic**: Messages array includes conversation rounds + final user input (system prompt separate)
- **Gemini**: Conversation text includes system prompt + formatted conversation rounds + final user input
- **OpenRouter**: Messages array includes system prompt + conversation rounds + final user input

## Technical Implementation

### HTML Structure
```html
<div class="input-section">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <label>Conversation Rounds:</label>
        <button id="addConversationRound">+ Add Round</button>
    </div>
    <div id="conversationRoundsContainer"></div>
</div>
```

### CSS Styles
- `.conversation-round`: Container for each round
- `.conversation-round-header`: Header with role selector and delete button
- `.conversation-round-select`: Styled dropdown for role selection
- `.delete-round-button`: Styled delete button
- `.conversation-round-textarea`: Styled textarea for message content

### JavaScript Functions

#### `createConversationRoundElement(roundId, role, message)`
Creates a DOM element for a conversation round with the given ID, role, and message.

#### `addConversationRound(role = 'user', message = '', saveToStorage = true)`
Adds a new conversation round to the container and sets up event listeners.

#### `saveConversationRounds()`
Saves all current conversation rounds to localStorage.

#### Event Listeners
- Add Round button: Calls `addConversationRound()`
- Role selectors: Trigger `saveConversationRounds()` on change
- Message textareas: Trigger `saveConversationRounds()` on input
- Delete buttons: Remove round and trigger `saveConversationRounds()`

### API Call Updates
All API functions now build the complete message history:
1. Start with system prompt (if provided)
2. Add all conversation rounds in order
3. Add final user input

## Usage Example

1. User adds system prompt: "You are a helpful assistant"
2. User adds conversation rounds:
   - User: "Hello, how are you?"
   - Assistant: "I'm doing well, thank you!"
   - User: "What can you tell me about AI?"
3. User adds final input: "Please explain in simple terms"
4. When sent to APIs, the complete conversation history is included

## Browser Compatibility
- Uses standard DOM APIs (createElement, querySelector, etc.)
- Uses localStorage for persistence
- Compatible with all modern browsers

## Testing
Test files provided:
- `test_conversation_rounds.html`: Basic UI functionality test
- `test_local_storage.html`: Local storage functionality test

## Future Enhancements
- Drag-and-drop reordering of conversation rounds
- Import/export conversation history
- Conversation templates/presets
- Visual conversation flow diagram