import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(0) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.post.create({
        data: {
          name: input.name,
          createdBy: { connect: { id: ctx.session.user.id } },
        },
      });
    }),

  getLatest: protectedProcedure.query(async ({ ctx }) => {
    const post = await ctx.db.post.findFirst({
      orderBy: { createdAt: "desc" },
      where: { createdBy: { id: ctx.session.user.id } },
    });

    return post ?? null;
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const post = await ctx.db.post.findMany({
      orderBy: { createdAt: "asc" },
      where: { createdBy: { id: ctx.session.user.id } },
    });

    return post ?? null;
  }),
  //update cell
  // updateCell: protectedProcedure
  //   .input(
  //     z.object({
  //       id: z.number(),
  //       // Standard fields
  //       name: z.string().min(1).optional(),
  //       // Dynamic JSON fields (validate as record of string keys with any values)
  //       customFields: z.record(z.any()).optional(),
  //     }),
  //   )
  //   .mutation(async ({ ctx, input }) => {
  //     const { id, ...updateData } = input;

  //     return ctx.db.post.update({
  //       where: { id },
  //       data: {
  //         // Update standard fields if provided
  //         ...(updateData.name && { name: updateData.name }),
  //         // Merge existing customFields with new ones (if provided)
  //         ...(updateData.customFields && {
  //           customFields: {
  //             // Keep existing custom fields and merge with new ones
  //             ...ctx.db.post
  //               .findUnique({ where: { id } })
  //               .select({ customFields: true })?.customFields,
  //             ...updateData.customFields,
  //           },
  //         }),
  //       },
  //     });
  //   }),
  updateCell: protectedProcedure
    .input(
      z.object({
        postId: z.number(),
        columnId: z.string(), // Can be either a regular field or custom field name
        value: z.union([z.string(), z.number(), z.boolean(), z.date()]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // First check if the column is a built-in field or custom field
      const isCustomField = !["id", "name", "createdAt"].includes(
        input.columnId,
      );

      if (isCustomField) {
        // Update custom field
        const post = await ctx.db.post.findUnique({
          where: { id: input.postId },
        });

        if (!post) {
          throw new Error("Post not found");
        }

        return ctx.db.post.update({
          where: { id: input.postId },
          data: {
            customFields: {
              ...(post.customFields ?? {}),
              [input.columnId]: input.value,
            },
          },
        });
      } else {
        // Update regular field
        return ctx.db.post.update({
          where: { id: input.postId },
          data: {
            [input.columnId]: input.value,
          },
        });
      }
    }),

  addColumn: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        type: z.enum(["string", "number", "boolean", "date"]),
        isRequired: z.boolean().optional().default(false),
        defaultValue: z
          .union([z.string(), z.number(), z.boolean(), z.string().datetime()])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Convert defaultValue to string if it exists
      const defaultValueAsString =
        input.defaultValue !== undefined
          ? input.type === "date" && typeof input.defaultValue === "string"
            ? new Date(input.defaultValue).toISOString()
            : String(input.defaultValue)
          : undefined;

      // Create the column definition
      const column = await ctx.db.columnDefinition.create({
        data: {
          name: input.name,
          type: input.type,
          isRequired: input.isRequired,
          defaultValue: defaultValueAsString,
        },
      });

      // If defaultValue is provided, update all posts
      if (input.defaultValue !== undefined) {
        const posts = await ctx.db.post.findMany();

        await ctx.db.$transaction(
          posts.map((post) => {
            const currentFields = post.customFields ?? {};
            return ctx.db.post.update({
              where: { id: post.id },
              data: {
                customFields: {
                  ...currentFields,
                  // Store the original value (not stringified) in customFields
                  [input.name]: input.defaultValue,
                },
              },
            });
          }),
        );
      }

      return column;
    }),
  getAllWithColumns: protectedProcedure.query(async ({ ctx }) => {
    const [posts, columns] = await Promise.all([
      ctx.db.post.findMany({
        orderBy: { createdAt: "asc" },
        where: { createdBy: { id: ctx.session.user.id } },
      }),
      ctx.db.columnDefinition.findMany(),
    ]);

    return {
      posts: posts.map((post) => ({
        ...post,
        customFields: post.customFields ?? {},
      })),
      columns,
    };
  }),
  getColumnDefinitions: protectedProcedure.query(({ ctx }) => {
    return ctx.db.columnDefinition.findMany();
  }),
  removeColumn: protectedProcedure
    .input(
      z.object({
        columnName: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // First delete the column definition
      await ctx.db.columnDefinition.delete({
        where: { name: input.columnName },
      });

      // Then remove this column from all posts' customFields
      const posts = await ctx.db.post.findMany();

      await ctx.db.$transaction(
        posts.map((post) => {
          // Type-safe handling of customFields
          const currentFields =
            (post.customFields as Record<string, unknown>) ?? {};
          const { [input.columnName]: _, ...remainingFields } = currentFields;

          return ctx.db.post.update({
            where: { id: post.id },
            data: {
              customFields: remainingFields as Prisma.JsonObject,
            },
          });
        }),
      );

      return {
        success: true,
        message: `Column '${input.columnName}' removed successfully`,
      };
    }),
});
