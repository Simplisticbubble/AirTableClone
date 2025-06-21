import { useEffect, useState } from "react";
import { api } from "~/trpc/react";

interface EditableCellProps {
  value: any;
  postId: number;
  columnId: string;
  columnType?: "string" | "number" | "boolean" | "date";
  onSuccess?: () => void;
}

const EditableCell = ({
  value: initialValue,
  postId,
  columnId,
  columnType = "string",
  onSuccess,
}: EditableCellProps) => {
  const [value, setValue] = useState(initialValue);
  const utils = api.useUtils();

  const updateCell = api.post.updateCell.useMutation({
    onMutate: async (newValue) => {
      // Cancel any outgoing refetches
      await utils.post.getAllWithColumns.cancel();

      // Snapshot the previous value
      const previousData = utils.post.getAllWithColumns.getData();

      // Optimistically update the cache
      utils.post.getAllWithColumns.setData(undefined, (old) => {
        if (!old) return old;

        return {
          ...old,
          posts: old.posts.map((post) => {
            if (post.id !== postId) return post;

            if (["id", "name", "createdAt"].includes(columnId)) {
              return { ...post, [columnId]: newValue.value };
            } else {
              return {
                ...post,
                customFields: {
                  ...(post.customFields ?? {}),
                  [columnId]: newValue.value,
                },
              };
            }
          }),
        };
      });

      return { previousData };
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (err, newValue, context) => {
      // Revert to the previous value on error
      if (context?.previousData) {
        void utils.post.getAllWithColumns.setData(
          undefined,
          context.previousData,
        );
      }
      setValue(initialValue);
      console.error("Update failed:", err);
    },
    onSettled: async () => {
      try {
        await utils.post.getAllWithColumns.invalidate();
      } catch (error) {
        console.error("Failed to invalidate queries:", error);
      }
    },
  });

  // Handle external changes to initialValue
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleUpdate = () => {
    if (value !== initialValue) {
      try {
        // Convert value based on column type
        let processedValue = value;

        if (columnType === "number") {
          processedValue = Number(value);
          if (isNaN(processedValue)) throw new Error("Invalid number");
        } else if (columnType === "boolean") {
          processedValue = Boolean(value);
        } else if (columnType === "date") {
          processedValue = new Date(value).toISOString();
        }

        void updateCell.mutateAsync({
          postId,
          columnId,
          value: processedValue,
        });
      } catch (error) {
        console.error("Validation error:", error);
        setValue(initialValue);
      }
    }
  };

  const renderInput = () => {
    switch (columnType) {
      case "number":
        return (
          <input
            type="number"
            value={value ?? ""}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleUpdate}
            onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
            className="w-full border-none bg-transparent text-black focus:outline-none"
          />
        );
      case "boolean":
        return (
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => {
              setValue(e.target.checked);
              handleUpdate();
            }}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        );
      case "date":
        return (
          <input
            title="cell"
            type="date"
            value={value ? new Date(value).toISOString().split("T")[0] : ""}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleUpdate}
            onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
            className="w-full border-none bg-transparent text-black focus:outline-none"
          />
        );
      default:
        return (
          <input
            type="text"
            title="cell"
            value={value ?? ""}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleUpdate}
            onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
            className="w-full border-none bg-transparent text-black focus:outline-none"
          />
        );
    }
  };

  return renderInput();
};

export default EditableCell;
