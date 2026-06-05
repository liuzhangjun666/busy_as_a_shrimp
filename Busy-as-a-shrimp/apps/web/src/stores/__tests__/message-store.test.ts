import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { socketMock, ioMock } = vi.hoisted(() => {
  const socketMock = {
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: true
  };

  const ioMock = vi.fn(() => socketMock);
  return { socketMock, ioMock };
});

vi.mock("socket.io-client", () => ({
  io: ioMock
}));

import { useMessageStore } from "../use-message-store";
import { useUserStore } from "../user-store";

describe("useMessageStore", () => {
  beforeEach(() => {
    (globalThis as { window?: unknown }).window = {};

    ioMock.mockClear();
    socketMock.on.mockClear();
    socketMock.emit.mockClear();
    socketMock.disconnect.mockClear();

    useMessageStore.setState({
      socket: null,
      conversations: [],
      activeConversationId: null,
      messages: {},
      globalUnread: 0,
      isDrawerOpen: false
    });

    useUserStore.setState({
      token: "",
      phone: "",
      role: "both",
      memberLevel: "FREE",
      isRealNameVerified: false,
      tokenExpiresAt: 0
    });
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("connects to chat namespace when token exists", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:8081/api/v1";
    useUserStore.setState({
      token: "mock-token",
      phone: "13800000000",
      role: "both",
      memberLevel: "FREE",
      isRealNameVerified: false,
      tokenExpiresAt: Date.now() + 60_000
    });

    useMessageStore.getState().connect();

    expect(ioMock).toHaveBeenCalledWith(
      "http://localhost:8081/chat",
      expect.objectContaining({
        transports: ["websocket"],
        reconnectionAttempts: 5
      })
    );
    expect(useMessageStore.getState().socket).toBe(socketMock);
  });
});
