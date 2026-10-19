## 1. AI Integration

All AI calls go through `LlmService`, the only consumer-facing wrapper around Gemini. It exposes `generate()` and `stream()` using provider-neutral `LlmTurn[]`. Configuration uses environment variables, with missing keys failing at startup.

Switching providers requires replacing the service, mapping roles, translating errors and updating configuration. Since there is no provider interface yet, `ChatService` and `LlmModule` would also need changes. Provider failures become 502 errors, while empty or blocked responses become 422 errors. Incomplete responses are never saved.

## 2. Streaming

The backend streams Gemini tokens through `ChatService` and `ChatController` using SSE. The frontend parses events with a `fetch` reader, updates Zustand state and renders partial Markdown with Streamdown. `MessageScroller` follows the latest output.

I chose SSE because responses are one-way, while `fetch` supports POST bodies and cookie authentication. Messages are saved in one transaction only after completion. Stopping or disconnecting aborts generation and discards partial output, avoiding orphaned messages. Nginx must disable proxy buffering for streaming.

## 3. Conversation Context

Each request loads the owned project and passes its title and description into `buildSystemPrompt()` as Gemini's system instruction. This keeps project context separate from conversation history.

`loadHistory()` sends only the latest 40 chat messages by default, excluding summaries. User messages are limited to 4,000 characters. The count-based limit is simple but does not guarantee a token budget, so long conversations may exceed the model's context limits.

## 4. State Management

TanStack Query stores saved messages, enabling caching, prefetching and invalidation. Zustand stores temporary streaming state, including partial text, status, errors and the abort controller.

When generation completes, the saved messages enter the query cache and the temporary state is cleared. This separates persistent server data from rapidly changing, unsaved responses and limits token-by-token re-renders to the active message bubble.

## 5. What I Would Improve

With two more days, I would introduce an injectable `LlmProvider` interface and replace the fixed history limit with a token budget.

These improvements would make provider switching easier and control context size more reliably. I prioritised completing the required authentication, streaming, persistence, Docker setup and chat UI.
