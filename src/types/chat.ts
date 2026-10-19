import { Message } from '../generated/prisma/client';

export type ChatEvent =
  | { event: 'token'; data: { text: string } }
  | { event: 'done'; data: { userMessage: Message; assistantMessage: Message } }
  | { event: 'done'; data: { message: Message } };
