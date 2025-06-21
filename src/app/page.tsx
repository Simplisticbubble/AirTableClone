import Link from "next/link";

import { LatestPost } from "~/app/_components/post";
import { AirTable } from "./_components/airtable";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";
import { db } from "~/server/db";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });
  const session = await auth();
  const posts = await db.post.findMany();
  console.log(posts);
  if (session?.user) {
    void api.post.getLatest.prefetch();
  }

  return (
    <HydrateClient>
      <nav className="text flex w-full items-center justify-between bg-purple-900 p-4 text-xl font-semibold">
        <div>Gallery</div>
        <div>
          <Link
            href={session ? "/api/auth/signout" : "/api/auth/signin"}
            className="rounded-2xl bg-white px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
          >
            {session ? "Sign out" : "Sign in"}
          </Link>
        </div>
      </nav>
      <div className="text flex w-full items-center justify-between bg-purple-950 p-2 text-xl font-semibold">
        text
      </div>
      <main className="flex min-h-screen flex-col items-center justify-start bg-gray-300 text-white">
        <div className="text flex w-full items-center justify-between bg-gray-100 p-2 text-xl font-semibold"></div>
        <div className="text flex w-full items-center justify-between bg-white font-semibold">
          <div className="flex w-full flex-col items-center justify-center">
            {/* {session?.user && <LatestPost />} */}
            {session?.user && <AirTable />}
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
