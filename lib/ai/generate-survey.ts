import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { SURVEY_SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompts";
import { aiSurveySchema, validateAiSurvey, type AiSurvey } from "@/lib/ai/survey-schema";

/** Default model; override with AI_SURVEY_MODEL (for example to a cheaper one). */
export const DEFAULT_AI_MODEL = "claude-opus-5-5";

export class AiNotConfiguredError extends Error {}
export class AiRefusedError extends Error {}
export class AiInvalidError extends Error {
  constructor(public problems: string[]) {
    super("The generated survey is not consistent");
  }
}

export type GenerateInput = { description: string; language: "auto" | "es" | "en"; questionCount: number };
export type GenerateResult = { survey: AiSurvey; model: string; inputTokens: number; outputTokens: number };

/**
 * Asks the model for a survey in the structured shape of `aiSurveySchema`, checks the flow (references,
 * reachability, loops) and, if something is off, sends the problems back once so the model can fix them.
 */
export async function generateAiSurvey(input: GenerateInput): Promise<GenerateResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiNotConfiguredError("ANTHROPIC_API_KEY is not set");

  const client = new Anthropic({ apiKey });
  const model = process.env.AI_SURVEY_MODEL || DEFAULT_AI_MODEL;
  let inputTokens = 0;
  let outputTokens = 0;

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: buildUserPrompt(input) }];

  async function ask(): Promise<AiSurvey> {
    const response = await client.messages.parse({
      model,
      max_tokens: 16000,
      // The instructions never change between requests, so they are cached after the first one.
      system: [{ type: "text", text: SURVEY_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages,
      output_config: { format: zodOutputFormat(aiSurveySchema), effort: "medium" },
    });
    inputTokens += response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0) + (response.usage.cache_creation_input_tokens ?? 0);
    outputTokens += response.usage.output_tokens;

    if (response.stop_reason === "refusal") throw new AiRefusedError("The model declined the request");
    if (response.stop_reason === "max_tokens") throw new AiInvalidError(["The survey was too long to generate."]);
    if (!response.parsed_output) throw new AiInvalidError(["The model returned no survey."]);
    messages.push({ role: "assistant", content: JSON.stringify(response.parsed_output) });
    return response.parsed_output;
  }

  let survey = await ask();
  let problems = validateAiSurvey(survey);
  if (problems.length > 0) {
    messages.push({
      role: "user",
      content: `The survey has these problems:\n- ${problems.join("\n- ")}\n\nReturn the complete corrected survey.`,
    });
    survey = await ask();
    problems = validateAiSurvey(survey);
    if (problems.length > 0) throw new AiInvalidError(problems);
  }

  return { survey, model, inputTokens, outputTokens };
}
