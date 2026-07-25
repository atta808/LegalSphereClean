import OpenAI from "openai";
import { AIConfig } from "../config/AIConfig";

// Create client dynamically to ensure env vars are evaluated at runtime if needed
const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: AIConfig.getDeepSeekKey() || "",
  dangerouslyAllowBrowser: true, // needed in RN when using openAI sdk without a node env
});

export const askDeepSeek = async (prompt, options = {}) => {
  try {
    // Default options
    const {
      enableReasoning = true,      // Enable thinking mode by default
      reasoningEffort = "high",    // "low", "medium", "high", or "max"
      maxTokens = 8000,
      temperature = 1.0,           // Note: Ignored when thinking is enabled
    } = options;

    // Base request parameters
    const requestParams = {
      model: "deepseek-v4-flash",
      messages: [
        {
          role: "system",
          content: `
You are LegalSphere AI.

You are a trusted companion to lawyers.

Your purpose is to save time, reduce pressure,
improve organization, and assist legal practice.

You are respectful, professional, calm,
and occasionally light-hearted.

You help, organize, summarize, research,
and explain.

You never act like a judge, boss,
or commander.

The lawyer is always the final decision maker.

When uncertain:
Help.
Help.
Help.

You may occasionally use light humor,
but remain professional 95% of the time.

You shall never mock the lawyer.

You shall never call the lawyer a clerk.

You shall remember that lawyers are human beings
with families, responsibilities, and pressures.

Your goal is to be the most helpful legal companion possible.

You may explain legal, medical, engineering,
financial, technical, and other professional concepts
in plain language to assist lawyers in understanding
case-related issues.

Always be concise, practical, and supportive.
`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: false,
      max_tokens: maxTokens,
    };

    // Add reasoning parameters if enabled
    if (enableReasoning) {
      // Note: When thinking is enabled, temperature, top_p, 
      // presence_penalty, and frequency_penalty are IGNORED
      requestParams.extra_body = {
        thinking: {
          type: "enabled",
        },
        reasoning_effort: reasoningEffort,
      };
    } else {
      // Disable reasoning for faster responses
      requestParams.extra_body = {
        thinking: {
          type: "disabled",
        },
      };
      // Only set temperature when reasoning is disabled
      requestParams.temperature = temperature;
    }

    const completion = await client.chat.completions.create(requestParams);

    // Extract both reasoning and content
    const message = completion.choices[0]?.message;
    const result = {
      content: message?.content || "",
      reasoning: message?.reasoning_content || null, // Available when thinking is enabled
      fullResponse: completion,
    };

    return result;
  } catch (error) {
    if (__DEV__) {
      console.log("DeepSeek Error:", JSON.stringify(error, null, 2));
    }
    return {
      content: "",
      reasoning: null,
      error: JSON.stringify(error, null, 2),
    };
  }
};

// Helper function to get just the content (for backward compatibility)
export const askDeepSeekSimple = async (prompt) => {
  const result = await askDeepSeek(prompt);
  return result.content;
};

// Helper for getting content with reasoning separately
export const askDeepSeekWithReasoning = async (prompt, showReasoning = true) => {
  const result = await askDeepSeek(prompt, { 
    enableReasoning: true,
    reasoningEffort: "high" 
  });
  
  if (showReasoning && result.reasoning) {
    return {
      reasoning: result.reasoning,
      answer: result.content,
    };
  }
  
  return result.content;
};