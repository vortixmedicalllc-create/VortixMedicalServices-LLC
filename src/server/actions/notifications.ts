"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActionUser } from "../auth";
import { markNotificationsRead } from "../notifications";

export async function markReadAction(ids?: string[]) {
  const user = await requireActionUser();
  const parsed = z.array(z.string().uuid()).max(200).optional().safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  await markNotificationsRead(user.id, parsed.data);
  revalidatePath("/crm", "layout");
  return { ok: true };
}
