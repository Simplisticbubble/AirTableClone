import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const postRouter = createTRPCRouter({
  // Tab operations
  createTab: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tab.create({
        data: {
          name: input.name,
          createdBy: { connect: { id: ctx.session.user.id } },
        },
      });
    }),

  getTabs: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.tab.findMany({
      where: { createdById: ctx.session.user.id }, // Fixed where clause
      orderBy: { createdAt: "asc" },
    });
  }),

  // Column operations
  getColumnDefinitions: protectedProcedure
    .input(z.object({ tabId: z.number() }))
    .query(({ ctx, input }) => {
      return ctx.db.columnDefinition.findMany({
        where: {
          tabId: input.tabId,
          createdBy: { id: ctx.session.user.id },
        },
      });
    }),

  addColumn: protectedProcedure
    .input(
      z.object({
        tabId: z.number(),
        name: z.string().min(1).max(50),
        type: z.enum(["string", "number", "boolean", "date"]),
        isRequired: z.boolean().optional().default(false),
        defaultValue: z
          .union([z.string(), z.number(), z.boolean(), z.string().datetime()])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const defaultValueAsString =
        input.defaultValue !== undefined
          ? input.type === "date" && typeof input.defaultValue === "string"
            ? new Date(input.defaultValue).toISOString()
            : String(input.defaultValue)
          : undefined;

      const column = await ctx.db.columnDefinition.create({
        data: {
          name: input.name,
          type: input.type,
          isRequired: input.isRequired,
          defaultValue: defaultValueAsString,
          tab: { connect: { id: input.tabId } },
          createdBy: { connect: { id: ctx.session.user.id } },
        },
      });

      if (input.defaultValue !== undefined) {
        const posts = await ctx.db.post.findMany({
          where: { tabId: input.tabId },
        });

        await ctx.db.$transaction(
          posts.map((post) => {
            const currentFields = post.customFields ?? {};
            return ctx.db.post.update({
              where: { id: post.id },
              data: {
                customFields: {
                  ...currentFields,
                  [input.name]: input.defaultValue,
                },
              },
            });
          }),
        );
      }

      return column;
    }),

  // Post operations
  create: protectedProcedure
    .input(
      z.object({
        tabId: z.number(),
        name: z.string(),
        customFields: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.post.create({
        data: {
          name: input.name,
          tab: { connect: { id: input.tabId } },
          customFields: input.customFields ?? {},
          createdBy: { connect: { id: ctx.session.user.id } },
        },
      });
    }),

  getAll: protectedProcedure
    .input(z.object({ tabId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [posts, columns] = await Promise.all([
        ctx.db.post.findMany({
          where: {
            tabId: input.tabId,
            createdBy: { id: ctx.session.user.id },
          },
          orderBy: { createdAt: "asc" },
        }),
        ctx.db.columnDefinition.findMany({
          where: {
            tabId: input.tabId,
            createdBy: { id: ctx.session.user.id },
          },
        }),
      ]);

      return {
        posts: posts.map((post) => ({
          ...post,
          customFields: post.customFields ?? {},
        })),
        columns,
      };
    }),

  updateCell: protectedProcedure
    .input(
      z.object({
        tabId: z.number(),
        postId: z.number(),
        columnId: z.string(),
        value: z.union([z.string(), z.number(), z.boolean(), z.date()]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // First verify the post belongs to the user and tab
      const post = await ctx.db.post.findFirst({
        where: {
          id: input.postId,
          tabId: input.tabId,
          createdBy: { id: ctx.session.user.id },
        },
      });

      if (!post) {
        throw new Error("Post not found or unauthorized");
      }

      const isCustomField = !["id", "name", "createdAt"].includes(
        input.columnId,
      );

      if (isCustomField) {
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
        return ctx.db.post.update({
          where: { id: input.postId },
          data: {
            [input.columnId]: input.value,
          },
        });
      }
    }),

  removeColumn: protectedProcedure
    .input(
      z.object({
        tabId: z.number(),
        columnName: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // First verify the column belongs to the user and tab
      const column = await ctx.db.columnDefinition.findFirst({
        where: {
          name: input.columnName,
          tabId: input.tabId,
          createdBy: { id: ctx.session.user.id },
        },
      });

      if (!column) {
        throw new Error("Column not found or unauthorized");
      }

      // Delete the column definition
      await ctx.db.columnDefinition.delete({
        where: { id: column.id },
      });

      // Remove this column from all posts in the tab
      const posts = await ctx.db.post.findMany({
        where: { tabId: input.tabId },
      });

      await ctx.db.$transaction(
        posts.map((post) => {
          const currentFields =
            (post.customFields as Record<string, unknown>) ?? {};
          const { [input.columnName]: _, ...remainingFields } = currentFields;

          return ctx.db.post.update({
            where: { id: post.id },
            data: {
              customFields: remainingFields,
            },
          });
        }),
      );

      return {
        success: true,
        message: `Column '${input.columnName}' removed successfully`,
      };
    }),
  // In your postRouter
  createTabWithDefaultTable: protectedProcedure
    .input(
      z.object({
        tabName: z.string(),
        tableName: z.string().default("Default Table"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Create the tab
      const tab = await ctx.db.tab.create({
        data: {
          name: input.tabName,
          createdBy: { connect: { id: ctx.session.user.id } },
        },
      });

      // Create default columns
      const defaultColumns = [
        { name: "Name", type: "string", isRequired: false },
        { name: "Status", type: "string", defaultValue: "Active" },
        {
          name: "Created",
          type: "date",
          defaultValue: new Date().toISOString(),
        },
      ];

      await ctx.db.$transaction(
        defaultColumns.map((col) =>
          ctx.db.columnDefinition.create({
            data: {
              name: col.name,
              type: col.type,
              isRequired: col.isRequired ?? false,
              defaultValue: col.defaultValue?.toString(),
              tab: { connect: { id: tab.id } },
              createdBy: { connect: { id: ctx.session.user.id } },
            },
          }),
        ),
      );

      // Create the first table
      await ctx.db.post.create({
        data: {
          name: input.tableName,
          tab: { connect: { id: tab.id } },
          customFields: {
            Name: input.tableName,
            Status: "Active",
            Created: new Date().toISOString(),
          },
          createdBy: { connect: { id: ctx.session.user.id } },
        },
      });

      return tab;
    }),
  // In your postRouter
  updateTab: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.tab.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),
  deleteTab: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // First delete all related posts and columns
      await ctx.db.post.deleteMany({
        where: { tabId: input.id },
      });

      await ctx.db.columnDefinition.deleteMany({
        where: { tabId: input.id },
      });

      // Then delete the tab
      return ctx.db.tab.delete({
        where: { id: input.id },
      });
    }),
});
