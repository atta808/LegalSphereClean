import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: "sk-758caca222404081af81da2e1005bbef",
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
