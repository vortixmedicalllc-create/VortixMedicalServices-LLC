import { NextResponse, type NextRequest } from "next/server";
import { AuthError, requireActionUser } from "@/server/auth";
import { getTaskForUser } from "@/server/queries/records";
import { appUrl } from "@/server/email";

/**
 * Downloads a task as an .ics calendar event (works with Google Calendar, Outlook,
 * and Apple Calendar). Only the task's assignee, creator, or users who can see all
 * records may download it. The event holds the task title and a CRM link only.
 */
export const dynamic = "force-dynamic";

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** Lines longer than 75 octets must be folded (RFC 5545). */
const fold = (line: string) => line.match(/.{1,73}/g)!.join("\r\n ");

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireActionUser();
    const { id } = await params;
    const task = await getTaskForUser(user, id);
    if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
    if (!task.dueAt) return NextResponse.json({ error: "This task has no due date." }, { status: 400 });

    const start = task.dueAt;
    const end = new Date(start.getTime() + 30 * 60_000);
    const link = appUrl("/crm/tasks?view=open");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Vortix Medical Services//CRM//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:task-${task.id}@vortix-crm`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsText(task.title)}`,
      `DESCRIPTION:${icsText(`Vortix CRM task. Open the CRM for details: ${link}`)}`,
      `URL:${link}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT15M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsText(task.title)}`,
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].map(fold);

    return new Response(lines.join("\r\n") + "\r\n", {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="vortix-task-${task.id.slice(0, 8)}.ics"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 });
    console.error("[calendar] failed:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Could not create the calendar file." }, { status: 500 });
  }
}
