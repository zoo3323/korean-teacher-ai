import Anthropic from "@anthropic-ai/sdk";

// Single shared Anthropic client instance.
// The SDK reads ANTHROPIC_API_KEY from the environment automatically.
export const anthropic = new Anthropic();
