"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

type ColumnType = "string" | "number" | "boolean" | "date";

export function AddColumnButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<ColumnType>("string");
  const [defaultValue, setDefaultValue] = useState("");

  const utils = api.useUtils();
  const addColumn = api.post.addColumn.useMutation({
    onSuccess: async () => {
      try {
        await Promise.all([
          utils.post.invalidate(),
          utils.post.getColumnDefinitions.invalidate(),
        ]);
      } catch (error) {
        console.error("Error invalidating queries:", error);
      }
      setIsOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Failed to add column:", error);
      // You might want to add user-facing error notification here
    },
  });

  const resetForm = () => {
    setName("");
    setType("string");
    setDefaultValue("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let processedValue: string | number | boolean | Date = defaultValue;

    try {
      switch (type) {
        case "number":
          processedValue = Number(defaultValue);
          if (isNaN(processedValue)) throw new Error("Invalid number");
          break;
        case "boolean":
          processedValue = defaultValue.toLowerCase() === "true";
          break;
        case "date":
          processedValue = new Date(defaultValue);
          if (isNaN(processedValue.getTime())) throw new Error("Invalid date");
          processedValue = processedValue.toISOString();
          break;
        default:
          processedValue = defaultValue;
      }

      await addColumn.mutateAsync({
        name,
        type,
        defaultValue: processedValue,
      });
    } catch (error) {
      console.error("Error adding column:", error);
      // Consider adding toast notifications here
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (
      value === "string" ||
      value === "number" ||
      value === "boolean" ||
      value === "date"
    ) {
      setType(value);
    } else {
      console.warn(`Invalid type selected: ${value}`);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        disabled={addColumn.isPending} // Changed from isLoading to isPending for newer versions
      >
        Add Column
      </button>

      {isOpen && (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black text-black">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Add New Column</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Column Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  pattern="^[a-zA-Z_][a-zA-Z0-9_]*$"
                  title="Must start with a letter or underscore and contain only alphanumeric characters"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="type"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Data Type
                </label>
                <select
                  id="type"
                  value={type}
                  onChange={handleTypeChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="string">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">True/False</option>
                  <option value="date">Date</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="defaultValue"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Default Value
                </label>
                {type === "date" ? (
                  <input
                    id="defaultValue"
                    type="date"
                    value={defaultValue}
                    onChange={(e) => setDefaultValue(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                ) : type === "boolean" ? (
                  <select
                    id="defaultValue"
                    value={defaultValue}
                    onChange={(e) => setDefaultValue(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- Select --</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                ) : (
                  <input
                    id="defaultValue"
                    type={type === "number" ? "number" : "text"}
                    value={defaultValue}
                    onChange={(e) => setDefaultValue(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addColumn.isPending}
                  className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {addColumn.isPending ? "Adding..." : "Add Column"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
