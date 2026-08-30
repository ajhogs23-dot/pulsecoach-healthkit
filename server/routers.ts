import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { resolveProduct } from "./catalog";
import { invokeLLM } from "./_core/llm";

const coachSystemPrompt = `You are VELTURA, a warm and practical wellness coach. Give concise, actionable general wellness guidance about food, exercise, movement, hydration, recovery, and habits. Never diagnose, prescribe, promise results, or give unsafe medical advice. Do not encourage extreme calorie restriction, eating-disorder behaviors, dangerous exercise, or training through pain. Ask a brief clarifying question when allergies, injuries, pregnancy, medication, or a medical condition could change the answer. Use the user's goals, preferences, equipment, time, and available health context, but never invent missing measurements or health data. Offer substitutions and explain the reasoning in plain language.`;

function responseText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => typeof part === "object" && part && "text" in part ? String(part.text) : "").join("");
  return "I’m sorry, I couldn’t form a response just now. Try asking again.";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie("session", { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  catalog: router({
    lookup: protectedProcedure.input(z.object({ barcode: z.string().trim().min(4).max(64).optional(), query: z.string().trim().max(160).optional() })).query(({ input }) => resolveProduct(input)),
  }),
  profile: router({
    get: protectedProcedure.query(({ ctx }) => db.getProfile(ctx.user.id)),
    save: protectedProcedure.input(z.object({ username: z.string().trim().min(3).max(40), avatarUrl: z.string().url().max(500).optional(), unitSystem: z.enum(["metric", "imperial"]).default("metric"), timezone: z.string().max(64).default("Australia/Sydney") })).mutation(({ ctx, input }) => db.upsertProfile(ctx.user.id, input)),
  }),
  goals: router({
    save: protectedProcedure.input(z.object({ currentWeight: z.string().max(32).optional(), goalWeight: z.string().max(32).optional(), pace: z.enum(["cautious", "steady", "slower"]).optional(), primaryGoal: z.string().max(120).optional() })).mutation(({ ctx, input }) => db.upsertGoal(ctx.user.id, input)),
  }),
  feedback: router({
    create: protectedProcedure.input(z.object({ category: z.enum(["feature", "issue", "change"]), message: z.string().trim().min(1).max(4000), contactAllowed: z.boolean().default(false) })).mutation(({ ctx, input }) => db.createFeedback(ctx.user.id, input)),
  }),
  admin: router({
    overview: adminProcedure.query(() => db.getAdminOverview()),
  }),
  coach: router({
    ask: publicProcedure.input(z.object({
      message: z.string().trim().min(1).max(1200),
      goal: z.string().max(120).optional(),
      preferences: z.string().max(600).optional(),
      equipment: z.string().max(200).optional(),
      healthContext: z.string().max(800).optional(),
    })).mutation(async ({ input }) => {
      const context = [
        input.goal ? `Goal: ${input.goal}` : "",
        input.preferences ? `Preferences or limitations: ${input.preferences}` : "",
        input.equipment ? `Equipment: ${input.equipment}` : "",
        input.healthContext ? `Available health context: ${input.healthContext}` : "",
      ].filter(Boolean).join("\n");
      const response = await invokeLLM({
        model: "gpt-5-mini",
        reasoning: { effort: "low" },
        maxTokens: 450,
        messages: [
          { role: "system", content: coachSystemPrompt },
          { role: "user", content: `${context ? `${context}\n\n` : ""}User request: ${input.message}` },
        ],
      });
      return { text: responseText(response.choices?.[0]?.message?.content) };
    }),
  }),
});

export type AppRouter = typeof appRouter;
