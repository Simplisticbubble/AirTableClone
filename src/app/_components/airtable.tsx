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
import EditableCell from "./editableCall";

export function AirTable() {
  const columns = useMemo<ColumnDef<Post>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: (info) =>
          info.getValue()
            ? new String(info.getValue() as string).toLocaleString()
            : null,

        enableResizing: true,
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: (info) =>
          EditableCell(
            info.getValue()
              ? new String(info.getValue() as string).toLocaleString()
              : null,
          ),
        enableResizing: true,
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: (info) =>
          EditableCell(
            info.getValue()
              ? new Date(info.getValue() as string).toLocaleString()
              : null,
          ),
        enableResizing: true,
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: (info) =>
          info.getValue()
            ? new Date(info.getValue() as string).toLocaleString()
            : null,
        enableResizing: true,
      },
      {
        accessorKey: "createdById",
        header: "By",
        cell: (info) =>
          EditableCell(
            info.getValue()
              ? new String(info.getValue() as string).toLocaleString()
              : null,
          ),
        enableResizing: true,
      },
    ],
    [],
  );

  // Proper data fetching via TRPC - need to actually call the hook
  const { data } = api.post.getAll.useQuery();

  // Memoized columns for better performance
  const table = useReactTable({
    data: data ?? [], // Fallback to empty array if data is undefined
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
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-6 py-4 whitespace-nowrap text-black"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
