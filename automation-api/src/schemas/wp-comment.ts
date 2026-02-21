import { z } from "zod";

export const wpCommentWebhookSchema = z.object({
  event: z.literal("wp.comment.created"),
  eventId: z.string().min(1),
  site: z.string().min(1),
  comment: z.object({
    id: z.number().int().positive(),
    postId: z.number().int().positive().optional(),
    authorName: z.string().min(1).optional(),
    authorUrl: z.string().nullable().optional(),
    content: z.string().min(1),
    createdAt: z.string().min(1)
  })
});

export type WpCommentWebhook = z.infer<typeof wpCommentWebhookSchema>;
