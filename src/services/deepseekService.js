import OpenAI from "openai";
import { AIConfig } from "../config/AIConfig";

// Create client dynamically to ensure env vars are evaluated at runtime if needed,
// but for standard top-level it should work as long as AIConfig.getDeepSeekKey() isn't called before process.env is populated.
// Expo statically injects EXPO_PUBLIC_* variables, so it's fine.
const client = new OpenAI({
  baseURL: "https://api.deepseek.com", // OpenAI SDK appends /v1/chat/completions automatically
  apiKey: AIConfig.getDeepSeekKey() || "", // Using AIConfig centralized getter
  dangerouslyAllowBrowser: true, // often needed in RN when using openAI sdk without a node env
});

export const askDeepSeek = async (prompt) => {
  try {
    const completion = await client.chat.completions.create({
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
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    if (__DEV__) {
      console.log("DeepSeek Error:", JSON.stringify(error, null, 2));
    }
    return JSON.stringify(error, null, 2);
  }
};
