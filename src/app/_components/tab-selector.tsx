// components/tab-selector.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Tab } from "@prisma/client";
import { CreateTabButton } from "./CreateTableButton";
import { AirTable } from "./airtable";
import { useState } from "react";

export function TabSelector({ tabs }: { tabs: Tab[] }) {
  const [curTab, setCurTab] = useState(0);
  const handleTabClick = (index: number) => {
    setCurTab(index);
  };
  const handleNewTabCreated = () => {
    // Find the index of the new tab

    setCurTab(tabs.length);
  };
  return (
    <div className="flex flex-col">
      <div>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(index)}
            className={`px-4 py-2 text-sm font-medium ${
              index === curTab
                ? "border-b-2 border-purple-900 text-purple-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.name}
          </button>
        ))}
        <CreateTabButton onTabCreated={handleNewTabCreated} />
      </div>
      {/* Main Table Content */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {tabs.length > 0 ? (
          <AirTable tabId={+tabs[curTab]?.id} />
        ) : (
          <div className="p-8 text-center">
            <h3 className="mb-2 text-lg font-medium">No tables found</h3>
            <p className="text-gray-600">
              Create your first table to get started
            </p>
            <CreateTabButton />
          </div>
        )}
      </div>
    </div>
  );
}
