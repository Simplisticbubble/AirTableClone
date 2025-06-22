// components/tab-selector.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { type Tab } from "@prisma/client";
import { CreateTabButton } from "./CreateTableButton";
import { AirTable } from "./airtable";
import { api } from "~/trpc/react";
import { DeleteTabButton } from "./deleteTabButton";

export function TabSelector({ tabs: initialTabs }: { tabs: Tab[] }) {
  // Use the query to get real-time data
  const { data: tabsData } = api.post.getTabs.useQuery(undefined, {
    initialData: initialTabs,
  });

  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [editingTabId, setEditingTabId] = useState<number | null>(null);
  const [tabName, setTabName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  // Sync current tab index when tabs change
  useEffect(() => {
    if (tabsData && tabsData.length > 0) {
      // Try to maintain the same tab if it still exists
      const currentTabId = tabsData[currentTabIndex]?.id;
      const newIndex = tabsData.findIndex((tab) => tab.id === currentTabId);
      setCurrentTabIndex(newIndex >= 0 ? newIndex : 0);
    }
  }, [tabsData]);

  const handleNewTabCreated = (newTabId: number) => {
    if (!tabsData) return;

    const newIndex = tabsData.findIndex((tab) => tab.id === newTabId);
    setCurrentTabIndex(newIndex >= 0 ? newIndex : tabsData.length - 1);
  };

  const deleteTab = api.post.deleteTab.useMutation({
    onMutate: async (deletedTab) => {
      await utils.post.getTabs.cancel();

      // Optimistically update the UI
      utils.post.getTabs.setData(undefined, (old) =>
        old?.filter((tab) => tab.id !== deletedTab.id),
      );

      // Adjust current tab index
      setCurrentTabIndex((prev) => {
        const newIndex = Math.min(prev, (tabsData?.length ?? 0) - 2);
        return newIndex >= 0 ? newIndex : 0;
      });

      return { previousTabs: tabsData };
    },
    onError: (err, deletedTab, context) => {
      utils.post.getTabs.setData(undefined, context?.previousTabs);
    },
    onSettled: () => {
      utils.post.getTabs.invalidate().catch(console.error);
    },
  });

  const handleDeleteTab = (tabId: number) => {
    if (confirm("Delete this tab and all its contents?")) {
      deleteTab.mutate({ id: tabId });
    }
  };

  const updateTabName = api.post.updateTab.useMutation({
    onMutate: async (updatedTab) => {
      await utils.post.getTabs.cancel();

      // Optimistically update the UI
      utils.post.getTabs.setData(undefined, (old) =>
        old?.map((tab) =>
          tab.id === updatedTab.id ? { ...tab, name: updatedTab.name } : tab,
        ),
      );

      return { previousTabs: tabsData };
    },
    onSuccess: () => {
      setEditingTabId(null);
    },
    onError: (err, updatedTab, context) => {
      utils.post.getTabs.setData(undefined, context?.previousTabs);
    },
    onSettled: () => {
      utils.post.getTabs.invalidate().catch(console.error);
    },
  });

  const handleTabNameEdit = (tab: Tab) => {
    setEditingTabId(tab.id);
    setTabName(tab.name);
  };

  const handleTabNameUpdate = (tabId: number) => {
    if (
      tabName.trim() &&
      tabName !== tabsData?.find((t) => t.id === tabId)?.name
    ) {
      updateTabName.mutate({ id: tabId, name: tabName.trim() });
    } else {
      setEditingTabId(null);
    }
  };

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-wrap items-center gap-1">
        {tabsData?.map((tab, index) => (
          <div key={tab.id} className="relative">
            {editingTabId === tab.id ? (
              <input
                ref={inputRef}
                type="text"
                value={tabName}
                onChange={(e) => setTabName(e.target.value)}
                onBlur={() => handleTabNameUpdate(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTabNameUpdate(tab.id);
                  if (e.key === "Escape") setEditingTabId(null);
                }}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm focus:ring-1 focus:ring-purple-500 focus:outline-none"
              />
            ) : (
              <div
                className={`border-2 border-gray-300 hover:bg-gray-100 ${
                  index === currentTabIndex
                    ? "bg-purple-100 text-gray-400"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <button
                  onClick={() => setCurrentTabIndex(index)}
                  onDoubleClick={() => handleTabNameEdit(tab)}
                  className="rounded-md px-4 py-2 text-sm font-medium"
                >
                  {tab.name}
                </button>
                <button
                  onClick={() => handleDeleteTab(tab.id)}
                  className="ml-1 cursor-pointer p-1 text-gray-500 group-hover:opacity-100 hover:text-gray-700"
                  title="Delete tab"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        ))}
        <CreateTabButton onTabCreated={handleNewTabCreated} />
      </div>

      {/* Main Table Content */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {tabsData && tabsData.length > 0 ? (
          <AirTable tabId={tabsData[currentTabIndex]?.id ?? 0} />
        ) : (
          <div className="p-8 text-center">
            <h3 className="mb-2 text-lg font-medium">No tables found</h3>
            <p className="mb-4 text-gray-600">
              Create your first table to get started
            </p>
            <CreateTabButton />
          </div>
        )}
      </div>
    </div>
  );
}
