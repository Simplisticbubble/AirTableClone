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
    onSuccess: async (newTab) => {
      try {
        // Invalidate and refetch tabs
        await utils.post.getTabs.invalidate();

        // Update the UI immediately with optimistic update
        utils.post.getTabs.setData(undefined, (old) => {
          return old ? [...old, newTab] : [newTab];
        });

        // Call the callback with the new tab ID
        if (onTabCreated) {
          onTabCreated(newTab.id);
        }

        // Optionally refresh the page to ensure full sync
        router.refresh();
      } catch (error) {
        console.error("Failed to update UI:", error);
      } finally {
        setIsCreating(false);
      }
    },
    onError: (error) => {
      console.error("Failed to create tab:", error);
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
      className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
    >
      {createTab.isPending ? "Creating..." : "Create New Tab"}
    </button>
  );
}
