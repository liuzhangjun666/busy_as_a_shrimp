"use client";

import { io } from "socket.io-client";
import { create } from "zustand";
import { loadClientEnv } from "../config/env";
import { useUserStore } from "./user-store";

export interface SocketLike {
  on(event: string, callback: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  disconnect(): void;
  connected?: boolean;
}

type Socket = SocketLike;

export interface MessageMeta {
  messageId: number;
  senderId: number;
  content: string;
  msgType: string;
  isRead: boolean;
  createdAt: string;
  isSelf: boolean;
}

export interface ConversationMeta {
  conversationId: number;
  type: "C2C" | "SYSTEM";
  targetUserId: number; // 对方的用户ID (0为系统)
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount?: number;
}

interface MessageStoreState {
  socket: Socket | null;
  conversations: ConversationMeta[];
  activeConversationId: number | null;
  messages: Record<number, MessageMeta[]>; // key: conversationId
  globalUnread: number;
  isDrawerOpen: boolean;
}

interface MessageStoreActions {
  connect: () => void;
  disconnect: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  setActiveConversation: (conversationId: number | null) => void;
  loadConversations: (conversations: ConversationMeta[]) => void;
  loadMessages: (conversationId: number, messages: MessageMeta[]) => void;
  sendMessage: (targetUserId: number, content: string, msgType?: string) => void;
  receiveMessage: (payload: MessageMeta & { conversationId: number }) => void;
}

export const useMessageStore = create<MessageStoreState & MessageStoreActions>((set, get) => ({
  socket: null,
  conversations: [],
  activeConversationId: null,
  messages: {},
  globalUnread: 0,
  isDrawerOpen: false,

  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  loadConversations: (conversations) => set({ conversations }),

  loadMessages: (conversationId, msgs) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: msgs }
    })),

  connect: () => {
    const { socket } = get();
    if (socket) return; // Already connected

    const token = useUserStore.getState().getValidToken();
    if (!token) return;

    // 连接到后端的 /chat 命名空间
    const serverUrl = new URL(loadClientEnv().apiBaseUrl).origin;

    if (typeof window === "undefined") {
      return;
    }

    const newSocket = io(`${serverUrl}/chat`, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5
    }) as unknown as SocketLike;

    newSocket.on("receiveMessage", (payload: unknown) => {
      get().receiveMessage(payload as MessageMeta & { conversationId: number });
    });

    set({ socket: newSocket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  sendMessage: (targetUserId, content, msgType = "text") => {
    const { socket } = get();
    if (socket && socket.connected) {
      socket.emit("sendMessage", { targetUserId, content, msgType });
    } else {
      console.warn("Socket is not connected. Cannot send message.");
    }
  },

  receiveMessage: (payload) => {
    const { conversationId, ...msgInfo } = payload;

    set((state) => {
      // 1. 追加消息记录
      const existingMsgs = state.messages[conversationId] || [];
      const isDuplicate = existingMsgs.some((m) => m.messageId === payload.messageId);
      const newMessagesMsgs = isDuplicate ? existingMsgs : [...existingMsgs, msgInfo];

      // 2. 更新或置顶会话列表
      let convList = [...state.conversations];
      const convIndex = convList.findIndex((c) => c.conversationId === conversationId);

      let globalUnreadDelta = 0;
      const isConvActive = state.activeConversationId === conversationId && state.isDrawerOpen;

      if (!isConvActive && !payload.isSelf) {
        globalUnreadDelta = 1;
      }

      if (convIndex >= 0) {
        // 更新现有会话
        const conv = convList[convIndex];
        convList.splice(convIndex, 1);
        convList.unshift({
          ...conv,
          lastMessage: payload.content,
          lastMessageAt: payload.createdAt,
          unreadCount: (conv.unreadCount || 0) + (!isConvActive && !payload.isSelf ? 1 : 0)
        });
      } else {
        // 如果是全新会话，创建一个临时占位符，需稍后从后端同步完整信息
        convList.unshift({
          conversationId,
          type: String(payload.senderId) === "0" ? "SYSTEM" : "C2C",
          targetUserId: payload.senderId,
          lastMessage: payload.content,
          lastMessageAt: payload.createdAt,
          unreadCount: 1
        });
      }

      return {
        messages: { ...state.messages, [conversationId]: newMessagesMsgs },
        conversations: convList,
        globalUnread: state.globalUnread + globalUnreadDelta
      };
    });
  }
}));
