import Link from "next/link";
import { AirTable } from "./_components/airtable";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";
import { api } from "~/trpc/server";
import { db } from "~/server/db";
import { TabSelector } from "./_components/tab-selector";
import { CreateTabButton } from "./_components/CreateTableButton";

export default async function Home() {
  const session = await auth();
  const tabs = session ? await api.post.getTabs() : [];

  return (
    <HydrateClient>
      <div className="min-h-screen bg-gray-100">
        {/* Navigation Bar */}
        <nav className="flex w-full items-center justify-between bg-purple-900 p-4 text-xl font-semibold text-white">
          <div>AirTable Clone</div>
          <div>
            <Link
              href={session ? "/api/auth/signout" : "/api/auth/signin"}
              className="rounded-full bg-white px-6 py-2 font-semibold text-purple-900 no-underline transition hover:bg-white/90"
            >
              {session ? "Sign out" : "Sign in"}
            </Link>
          </div>
        </nav>

        {/* Secondary Navigation */}
        <div className="flex w-full items-center justify-between bg-purple-950 p-3 text-white">
          <div className="text-lg font-medium">
            {session?.user?.name
              ? `Welcome, ${session.user.name}`
              : "My Workspace"}
          </div>
          {session && (
            <div className="flex items-center space-x-4">
              <Link href="/settings" className="text-sm hover:underline">
                Settings
              </Link>
            </div>
          )}
        </div>

        {/* Main Content */}
        <main className="container mx-auto min-h-[calc(100vh-120px)] px-4 py-6">
          {session?.user ? (
            <div className="rounded-lg bg-white p-6 shadow-md">
              {/* Tab Navigation */}
              {tabs.length > 0 && (
                <div className="mb-6 border-b border-gray-200">
                  <TabSelector tabs={tabs} />
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-white p-8 text-center shadow-md">
              <h2 className="mb-4 text-2xl font-bold text-gray-800">
                Welcome to AirTable Clone
              </h2>
              <p className="mb-6 text-gray-600">
                Sign in to create and manage your custom tables
              </p>
              <Link
                href="/api/auth/signin"
                className="inline-flex items-center rounded-full bg-purple-900 px-6 py-3 font-medium text-white hover:bg-purple-800"
              >
                Sign In
              </Link>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-purple-950 p-4 text-center text-white">
          <div className="container mx-auto">
            <p className="text-sm">
              © {new Date().getFullYear()} AirTable Clone. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </HydrateClient>
  );
}
