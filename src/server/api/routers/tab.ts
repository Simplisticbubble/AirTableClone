// src/server/api/routers/tab.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const tabRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.tab.findMany({
      where: { createdById: ctx.session.user.id },
      orderBy: { order: "asc" },
      include: { tables: true },
    });
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tab.create({
        data: {
          name: input.name,
          createdById: ctx.session.user.id,
          order: await ctx.db.tab.count({
            where: { createdById: ctx.session.user.id },
          }),
        },
      });
    }),
});
