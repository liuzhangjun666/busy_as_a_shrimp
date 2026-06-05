import type { HttpClientLike } from "./http";
import type { ConversationMeta, MessageMeta } from "../stores/use-message-store";

export function createMessageApi(client: Pick<HttpClientLike, "get" | "post">) {
  return {
    getConversations(): Promise<ConversationMeta[]> {
      return client.get<ConversationMeta[]>("/message/conversations");
    },
    getHistory(
      conversationId: number,
      take: number = 50,
      skip: number = 0
    ): Promise<MessageMeta[]> {
      return client.get<MessageMeta[]>(
        `/message/history?conversationId=${conversationId}&take=${take}&skip=${skip}`
      );
    }
  };
}
