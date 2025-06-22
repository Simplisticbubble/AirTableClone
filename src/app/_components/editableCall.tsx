"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "~/trpc/react";

interface EditableCellProps {
  value: any;
  postId: number;
  tabId: number;
  columnId: string;
  columnType?: "string" | "number" | "boolean" | "date";
  isRequired?: boolean;
}

const EditableCell = ({
  value: initialValue,
  postId,
  tabId,
  columnId,
  columnType = "string",
  isRequired = false,
}: EditableCellProps) => {
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  const updateCell = api.post.updateCell.useMutation({
    onMutate: async (newValue) => {
      await utils.post.getAll.cancel({ tabId });
      const previousData = utils.post.getAll.getData({ tabId });

      utils.post.getAll.setData({ tabId }, (old) => {
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
    onError: (err, newValue, context) => {
      if (context?.previousData) {
        utils.post.getAll.setData({ tabId }, context.previousData);
      }
      setError(err.message);
    },
    onSettled: () => {
      utils.post.getAll.invalidate({ tabId });
    },
  });

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleUpdate = () => {
    if (value === initialValue) {
      setIsEditing(false);
      return;
    }

    if (isRequired && !value) {
      setError("This field is required");
      inputRef.current?.focus();
      return;
    }

    try {
      let processedValue = value;
      switch (columnType) {
        case "number":
          processedValue = Number(value);
          if (isNaN(processedValue)) throw new Error("Invalid number");
          break;
        case "boolean":
          processedValue = Boolean(value);
          break;
        case "date":
          processedValue = new Date(value).toISOString();
          if (isNaN(new Date(value).getTime())) throw new Error("Invalid date");
          break;
        default:
          processedValue = String(value);
      }

      updateCell.mutate({
        tabId,
        postId,
        columnId,
        value: processedValue,
      });
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid value");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleUpdate();
    } else if (e.key === "Escape") {
      setValue(initialValue);
      setIsEditing(false);
      setError(null);
    }
  };

  const renderInput = () => {
    switch (columnType) {
      case "number":
        return (
          <input
            ref={inputRef}
            type="number"
            value={value ?? ""}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleUpdate}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsEditing(true)}
            className={`w-full border-none bg-transparent text-black focus:outline-none ${
              error ? "border-red-500" : ""
            }`}
          />
        );
      case "boolean":
        return (
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => {
              setValue(e.target.checked);
              handleUpdate(); // Save immediately for checkboxes
            }}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        );
      case "date":
        return (
          <input
            ref={inputRef}
            type="date"
            value={value ? new Date(value).toISOString().split("T")[0] : ""}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleUpdate}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsEditing(true)}
            className={`w-full border-none bg-transparent text-black focus:outline-none ${
              error ? "border-red-500" : ""
            }`}
          />
        );
      default:
        return (
          <input
            ref={inputRef}
            type="text"
            value={value ?? ""}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleUpdate}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsEditing(true)}
            className={`w-full border-none bg-transparent text-black focus:outline-none ${
              error ? "border-red-500" : ""
            }`}
          />
        );
    }
  };

  return (
    <div className="relative">
      {renderInput()}
      {error && (
        <div className="absolute top-full left-0 mt-1 text-xs text-red-500">
          {error}
        </div>
      )}
    </div>
  );
};

export default EditableCell;
