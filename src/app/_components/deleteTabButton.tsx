// components/DeleteTabButton.tsx
"use client";

import { api } from "~/trpc/react";

export function DeleteTabButton({
  tabId,
  onDelete,
}: {
  tabId: number;
  onDelete?: () => void;
}) {
  const utils = api.useUtils();

  const deleteTab = api.post.deleteTab.useMutation({
    onMutate: async (deletedTab) => {
      // Cancel outgoing refetches
      await utils.post.getTabs.cancel();

      // Snapshot previous value
      const previousTabs = utils.post.getTabs.getData();

      // Optimistically update the UI
      utils.post.getTabs.setData(
        undefined,
        (old) => old?.filter((tab) => tab.id !== deletedTab.id) ?? [],
      );

      return { previousTabs };
    },
    onError: (err, deletedTab, context) => {
      // Rollback on error
      utils.post.getTabs.setData(undefined, context?.previousTabs);
    },
    onSettled: () => {
      // Always refetch after error or success
      utils.post.getTabs.invalidate();
      onDelete?.();
    },
  });

  return (
    <button
      onClick={() => deleteTab.mutate({ id: tabId })}
      disabled={deleteTab.isPending}
      className="ml-2 text-red-500 hover:text-red-700"
      title="Delete tab"
    >
      {deleteTab.isPending ? "Deleting..." : "×"}
    </button>
  );
}
