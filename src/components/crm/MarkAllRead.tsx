"use client";

import { useRouter } from "next/navigation";
import { markReadAction } from "@/server/actions/notifications";
import { btn } from "./ui";
import { useToast } from "./client";

export function MarkAllRead() {
  const router = useRouter();
  const toast = useToast();
  return (
    <button
      type="button"
      className={btn("secondary")}
      onClick={async () => {
        const r = await markReadAction();
        toast(r.ok ? "success" : "error", r.ok ? "All notifications marked as read." : r.error || "Could not update.");
        router.refresh();
      }}
    >
      Mark all as read
    </button>
  );
}
