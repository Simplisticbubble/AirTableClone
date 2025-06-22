// components/CreateTabButton.tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export function CreateTabButton({
  onTabCreated,
}: {
  onTabCreated?: (tabId: number) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const utils = api.useUtils();
  const router = useRouter();

  const createTab = api.post.createTabWithDefaultTable.useMutation({
    onMutate: async (newTabData) => {
      // Cancel outgoing queries
      await utils.post.getTabs.cancel();

      // Create optimistic tab
      const optimisticTab = {
        id: Math.random(), // Temporary ID
        name: newTabData.tabName,
        createdById: "", // Will be replaced
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Update cache optimistically
      utils.post.getTabs.setData(undefined, (old) => {
        return old ? [...old, optimisticTab] : [optimisticTab];
      });

      return { optimisticTab };
    },
    onSuccess: (actualTab, variables, context) => {
      // Replace optimistic tab with actual data
      utils.post.getTabs.setData(undefined, (old) => {
        return (
          old?.map((tab) =>
            tab.id === context?.optimisticTab.id ? actualTab : tab,
          ) ?? [actualTab]
        );
      });

      // Call callback if provided
      onTabCreated?.(actualTab.id);

      // Refresh the router to ensure updates
      router.refresh();
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      utils.post.getTabs.setData(undefined, (old) => {
        return old?.filter((tab) => tab.id !== context?.optimisticTab.id) ?? [];
      });
    },
    onSettled: () => {
      // Always invalidate to ensure sync
      void utils.post.getTabs.invalidate();
      setIsCreating(false);
    },
  });

  const handleCreate = () => {
    setIsCreating(true);
    createTab.mutate({
      tabName: `New Tab ${new Date().toLocaleTimeString()}`,
    });
  };

  return (
    <button
      onClick={handleCreate}
      disabled={isCreating || createTab.isPending}
      className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
    >
      {createTab.isPending ? "..." : "+"}
    </button>
  );
}
