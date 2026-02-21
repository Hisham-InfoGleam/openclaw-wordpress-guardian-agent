import { z } from "zod";

export const telegramCallbackSchema = z.object({
  callback_query: z.object({
    id: z.string().min(1),
    data: z.string().min(1),
    message: z.object({
      message_id: z.number().int(),
      chat: z.object({
        id: z.union([z.number().int(), z.string()])
      })
    })
  })
});

export type TelegramCallbackUpdate = z.infer<typeof telegramCallbackSchema>;
