"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { moveDealStageAction } from "@/server/actions/records";
import { inputCls } from "./ui";
import { useToast } from "./client";
import { cx } from "@/components/ui/primitives";

export function DealStageSelect({ id, stageId, stages }: { id: string; stageId: number; stages: { value: string; label: string }[] }) {
  const [value, setValue] = useState(String(stageId));
  const toast = useToast();
  const router = useRouter();
  return (
    <>
      <label htmlFor="deal-stage" className="sr-only">
        Pipeline stage
      </label>
      <select
        id="deal-stage"
        value={value}
        onChange={async (e) => {
          const prev = value;
          setValue(e.target.value);
          const r = await moveDealStageAction(id, Number(e.target.value));
          if (!r.ok) setValue(prev);
          toast(r.ok ? "success" : "error", r.ok ? r.message || "Stage updated." : r.error || "Could not update the stage.");
          router.refresh();
        }}
        className={cx(inputCls, "h-8 w-auto pr-8 text-[0.82rem] font-semibold")}
      >
        {stages.map((s) => (
          <option key={s.value} value={s.value}>
            Stage: {s.label}
          </option>
        ))}
      </select>
    </>
  );
}
