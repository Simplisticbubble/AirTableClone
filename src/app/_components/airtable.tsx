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

export function AirTable({ tabId }: { tabId: number }) {
  const { data, isLoading } = api.post.getAll.useQuery({ tabId });
  const { data: columnData } = api.post.getColumnDefinitions.useQuery({
    tabId,
  });

  const posts = data?.posts ?? [];
  const columnDefs = columnData ?? [];

  const utils = api.useUtils();
  const [name, setName] = useState("");

  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      await utils.post.getAll.invalidate({ tabId });
      setName("");
    },
  });

  const removeColumn = api.post.removeColumn.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.post.getAll.invalidate({ tabId }),
        utils.post.getColumnDefinitions.invalidate({ tabId }),
      ]);
    },
  });

  const columns = useMemo<
    ColumnDef<Post & { customFields: Record<string, unknown> }>[]
  >(
    () => [
      // {
      //   accessorKey: "name",
      //   header: "Name",
      //   size: 200,
      //   cell: (info) => (
      //     <EditableCell
      //       value={info.getValue()}
      //       postId={info.row.original.id}
      //       tabId={tabId}
      //       columnId="name"
      //       columnType="string"
      //     />
      //   ),
      // },
      ...columnDefs.map((colDef) => ({
        accessorKey: `customFields.${colDef.name}`,
        header: () => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{colDef.name}</span>
            {/* <span className="text-xs text-gray-500">({colDef.type})</span> */}
            {colDef.isRequired && (
              <span className="text-xs text-red-500">*</span>
            )}
            <button
              onClick={() =>
                removeColumn.mutate({
                  tabId,
                  columnName: colDef.name,
                })
              }
              className="ml-auto text-xs text-gray-500 hover:text-gray-700"
              title="Remove column"
            >
              ×
            </button>
          </div>
        ),
        size: 180,
        cell: (info) => {
          const value = info.getValue();
          const postId = info.row.original.id;

          return (
            <EditableCell
              value={value}
              postId={postId}
              tabId={tabId}
              columnId={colDef.name}
              columnType={colDef.type}
              isRequired={colDef.isRequired}
            />
          );
        },
        meta: {
          type: colDef.type,
          isRequired: colDef.isRequired,
        },
      })),
    ],
    [columnDefs, tabId],
  );

  const table = useReactTable({
    data: posts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnResizing: true,
    columnResizeMode: "onChange",
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-lg font-medium text-gray-500">
          Loading table data...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold"></h2>
        {/* <div className="flex gap-2">
          <AddColumnButton tabId={tabId} />
        </div> */}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    className="relative px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-700 uppercase"
                    style={{ width: header.getSize() }}
                  >
                    <div className="flex items-center">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </div>
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className={`absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none bg-blue-500 opacity-0 hover:opacity-100 ${
                        header.column.getIsResizing() ? "!opacity-100" : ""
                      }`}
                    />
                  </th>
                ))}
                <th className="relative text-left text-xs font-medium tracking-wider text-gray-700 uppercase">
                  <AddColumnButton tabId={tabId} />
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
                    className="px-6 py-4 text-sm whitespace-nowrap text-gray-900"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {posts.length === 0 && (
          <div className="flex h-32 items-center justify-center bg-white">
            <div className="text-gray-500">No data available</div>
          </div>
        )}
      </div>

      <div className="mt-0 flex items-center gap-2">
        <button
          onClick={() => {
            createPost.mutate({
              tabId,
              name: "",
              customFields: columnDefs.reduce(
                (acc, col) => {
                  if (col.defaultValue) {
                    let value: any = col.defaultValue;
                    if (col.type === "number") value = Number(value);
                    if (col.type === "boolean") value = value === "true";
                    if (col.type === "date")
                      value = new Date(value).toISOString();
                    acc[col.name] = value;
                  }
                  return acc;
                },
                {} as Record<string, unknown>,
              ),
            });
          }}
          disabled={createPost.isPending}
          className="bg-gray-300 px-8 py-2 text-sm text-black hover:bg-gray-500 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {createPost.isPending ? "Adding..." : "+"}
        </button>
      </div>
    </div>
  );
}
