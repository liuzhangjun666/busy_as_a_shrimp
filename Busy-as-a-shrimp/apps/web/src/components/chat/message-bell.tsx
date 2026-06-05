"use client";

import { MessageSquare } from "lucide-react";
import { useMessageStore } from "../../stores/use-message-store";

export default function MessageBell() {
  const openDrawer = useMessageStore((state) => state.openDrawer);
  const globalUnread = useMessageStore((state) => state.globalUnread);

  return (
    <button
      onClick={openDrawer}
      className="relative mr-1 flex items-center justify-center rounded-full bg-slate-50 p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
    >
      <MessageSquare className="w-5 h-5" />
      {globalUnread > 0 && (
        <span className="absolute -mr-1 -mt-1 right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-rose-500" />
      )}
    </button>
  );
}
