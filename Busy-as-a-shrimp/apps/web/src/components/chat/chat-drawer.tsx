"use client";

import React, { useEffect, useState, useRef } from "react";
import { MessageSquare, X, Send, User, Bot, AlertCircle } from "lucide-react";
import { useMessageStore } from "../../stores/use-message-store";
import { useAuthStatus } from "../../stores/use-auth-status";
import { getMessageApi } from "../../api";

export default function ChatDrawer() {
  const { hydrated, isLoggedIn } = useAuthStatus();

  const {
    isDrawerOpen,
    closeDrawer,
    connect,
    disconnect,
    conversations,
    loadConversations,
    activeConversationId,
    setActiveConversation,
    messages,
    loadMessages,
    sendMessage
  } = useMessageStore();

  const [inputVal, setInputVal] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // 初始化连接与获取会话列表
  useEffect(() => {
    if (hydrated && isLoggedIn) {
      connect();
      getMessageApi()
        .getConversations()
        .then((data) => {
          loadConversations(data);
        })
        .catch((err) => console.error("Load conversations failed", err));
    } else {
      disconnect();
    }
  }, [hydrated, isLoggedIn]);

  // 当选择会话时，加载消息历史
  useEffect(() => {
    if (activeConversationId) {
      // 从后端读取历史
      getMessageApi()
        .getHistory(activeConversationId, 50, 0)
        .then((msgs) => {
          loadMessages(activeConversationId, msgs);
        })
        .catch((err) => console.error("Load messages failed", err));
    }
  }, [activeConversationId]);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeConversationId]);

  if (!hydrated || !isLoggedIn) return null;

  const handleSend = () => {
    if (!inputVal.trim() || !activeConversationId) return;
    const activeConv = conversations.find((c) => c.conversationId === activeConversationId);
    if (!activeConv) return;

    sendMessage(activeConv.targetUserId, inputVal.trim(), "text");
    setInputVal("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeMsgList = activeConversationId ? messages[activeConversationId] || [] : [];

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={closeDrawer}
      />

      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[500px] md:w-[600px] bg-zinc-950 border-l border-white/10 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-out ${isDrawerOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-900/50">
          <div className="flex items-center gap-2 text-zinc-100 font-semibold">
            <MessageSquare className="w-5 h-5 text-cyan-500" />
            消息中心
          </div>
          <button onClick={closeDrawer} className="p-1 rounded hover:bg-white/10 text-zinc-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左侧会话列表 */}
          <div className="w-1/3 border-r border-white/5 overflow-y-auto bg-zinc-950/30">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">暂无会话</div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.conversationId}
                  onClick={() => setActiveConversation(conv.conversationId)}
                  className={`p-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${activeConversationId === conv.conversationId ? "bg-cyan-500/10 border-l-2 border-l-cyan-500" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-zinc-200">
                      {conv.type === "SYSTEM" ? "系统通知" : `用户 ${conv.targetUserId}`}
                    </span>
                    {(conv.unreadCount ?? 0) > 0 &&
                      activeConversationId !== conv.conversationId && (
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                      )}
                  </div>
                  <div className="text-xs text-zinc-500 truncate">
                    {conv.lastMessage || "尚未有消息"}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 右侧聊天窗口 */}
          <div className="w-2/3 flex flex-col bg-[#080808]">
            {!activeConversationId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 space-y-4">
                <MessageSquare className="w-12 h-12 opacity-20" />
                <p className="text-sm">选中左侧会话进行查看</p>
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                  {activeMsgList.length === 0 ? (
                    <div className="text-center text-xs text-zinc-500 mt-10">这是对话的开始</div>
                  ) : (
                    activeMsgList.map((msg) => (
                      <div
                        key={msg.messageId}
                        className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {msg.isSelf ? null : (
                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center border border-white/5 shrink-0">
                              {msg.senderId === 0 ? (
                                <Bot className="w-3 h-3 text-cyan-400" />
                              ) : (
                                <User className="w-3 h-3 text-zinc-400" />
                              )}
                            </div>
                          )}
                          <span className="text-[10px] text-zinc-500">
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <div
                          className={`max-w-[85%] px-3 py-2 rounded-xl text-sm break-words ${
                            msg.isSelf
                              ? "bg-cyan-600 text-white rounded-tr-sm"
                              : "bg-zinc-800 text-zinc-200 rounded-tl-sm border border-white/5"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 bg-zinc-900 border-t border-white/5">
                  <div className="flex items-end gap-2 bg-zinc-950 border border-white/10 rounded-lg p-1 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/50 transition-all">
                    <textarea
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="输入消息，回车发送..."
                      className="flex-1 max-h-32 min-h-[40px] bg-transparent resize-none outline-none text-sm text-zinc-200 p-2"
                      rows={1}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!inputVal.trim()}
                      className="p-2.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 disabled:bg-zinc-800 transition-colors mb-0.5 mr-0.5"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-1 text-[10px] text-zinc-500 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    请注意保护个人隐私，谨防诈骗。
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
