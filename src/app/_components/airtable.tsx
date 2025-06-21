"use client";

import { useState, useMemo } from "react";
import { api } from "~/trpc/react";
import { type Post } from "@prisma/client";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { AddColumnButton } from "./addColumnButton";
import EditableCell from "./editableCall";

export function AirTable() {
  // const { data } = api.post.getAll.useQuery();
  const { data, isLoading } = api.post.getAllWithColumns.useQuery();
  const posts = data?.posts ?? [];
  const columnDefs = data?.columns ?? [];
  // Generate columns with proper typing
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();
      setName("");
    },
  });
  const removeColumn = api.post.removeColumn.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();
    },
  });
  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: (info: { getValue: () => unknown }) =>
          info.getValue()?.toString() ?? "",
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: (info: { getValue: () => unknown; row: { original: any } }) => (
          <EditableCell
            value={info.getValue()}
            postId={info.row.original.id}
            columnId="name"
            columnType="string"
          />
        ),
      },
      ...columnDefs.map((colDef) => ({
        accessorKey: `customFields.${colDef.name}`,
        header: () => (
          <div className="flex items-center gap-2">
            <span>{colDef.name}</span>
            <button
              onClick={() => removeColumn.mutate({ columnName: colDef.name })}
              className="text-xs text-red-500 hover:text-red-700"
              title="Remove column"
            >
              ×
            </button>
          </div>
        ),
        cell: (info: { getValue: () => unknown; row: { original: any } }) => {
          const value = info.getValue();
          const postId = info.row.original.id;

          // Render EditableCell for editable fields
          return (
            <EditableCell
              value={value}
              postId={postId}
              columnId={colDef.name}
              columnType={colDef.type}
            />
          );
        },
        meta: {
          type: colDef.type,
          isRequired: colDef.isRequired,
        },
      })),
    ],
    [columnDefs],
  );

  // Memoized columns for better performance
  const table = useReactTable({
    data: posts ?? [], // Fallback to empty array if data is undefined
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode: "onChange", // or 'onEnd'
    meta: {},
  });
  return (
    <div className="mx-auto w-full p-4">
      <table className="min-w-full table-fixed divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  colSpan={header.colSpan}
                  className="relative px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                  style={{ width: header.getSize() }} // ← Crucial for resizing
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}

                  {/* Resize handle */}
                  <div
                    onMouseDown={header.getResizeHandler()} // ← Must use react-table's handler
                    onTouchStart={header.getResizeHandler()}
                    className={`absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none bg-blue-500 opacity-0 select-none hover:opacity-100 ${header.column.getIsResizing() ? "bg-blue-700 !opacity-100" : ""} `}
                  />
                </th>
              ))}
              <th className="relative text-left text-xs font-medium tracking-wider text-gray-600 uppercase">
                <AddColumnButton />
              </th>
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="border-2 border-gray-200 px-6 py-4 whitespace-nowrap text-black hover:border-blue-600"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td>
              <button
                type="submit"
                className="cursor-pointer border-2 border-gray-200 bg-white/10 px-10 py-3 font-semibold text-black transition hover:bg-gray-400"
                disabled={createPost.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  createPost.mutate({ name });
                }}
              >
                {createPost.isPending ? "..." : "+"}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
