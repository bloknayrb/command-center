"use client";

import { Panel, Group, Separator } from "react-resizable-panels";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useLayoutStore } from "@/stores/layoutStore";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const chatOpen = useLayoutStore((s) => s.chatOpen);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main + Chat Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <Group orientation="horizontal" className="flex-1">
          {/* Main content */}
          <Panel defaultSize={chatOpen ? 65 : 100} minSize={30}>
            <main className="@container h-full overflow-y-auto bg-white p-6">
              {children}
            </main>
          </Panel>

          {/* Chat panel (resizable) */}
          {chatOpen && (
            <>
              <Separator className="w-1 cursor-col-resize bg-gray-200 transition-colors hover:bg-blue-400" />
              <Panel defaultSize={35} minSize={20}>
                <ChatPanel />
              </Panel>
            </>
          )}
        </Group>
      </div>
    </div>
  );
}
