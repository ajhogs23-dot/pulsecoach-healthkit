import { z } from "zod";
import { activityPostSchema, friendCodeSchema } from "../shared/activity-sharing";
import { activityCircle } from "./activity-circle";
import { guardAccountMutation } from "./account-deactivation";
import { protectedProcedure, router } from "./_core/trpc";
const id = z.number().int().positive();
export const activityCircleRouter = router({
  circle: protectedProcedure.query(({ ctx }) => guardAccountMutation(ctx.user.id, ctx.user.accountGeneration ?? "", () => activityCircle.circle(ctx.user.id))),
  request: protectedProcedure.input(z.object({ code: friendCodeSchema }).strict()).mutation(({ ctx, input }) => activityCircle.request(ctx.user.id, input.code)),
  respond: protectedProcedure.input(z.object({ friendId: id, accept: z.boolean() }).strict()).mutation(({ ctx, input }) => activityCircle.respond(ctx.user.id, input.friendId, input.accept)),
  removeFriend: protectedProcedure.input(z.object({ friendId: id }).strict()).mutation(({ ctx, input }) => activityCircle.removeFriend(ctx.user.id, input.friendId)),
  publish: protectedProcedure.input(activityPostSchema).mutation(({ ctx, input }) => activityCircle.publish(ctx.user.id, input)),
  feed: protectedProcedure.input(z.object({ beforeId: id.optional() }).strict()).query(({ ctx, input }) => activityCircle.feed(ctx.user.id, input.beforeId)),
  unpublish: protectedProcedure.input(z.object({ id }).strict()).mutation(({ ctx, input }) => activityCircle.unpublish(ctx.user.id, input.id)),
  cheer: protectedProcedure.input(z.object({ id, enabled: z.boolean() }).strict()).mutation(({ ctx, input }) => activityCircle.cheer(ctx.user.id, input.id, input.enabled)),
});
