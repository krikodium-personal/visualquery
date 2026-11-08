"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SurveyStatusPill } from "@/components/surveys/SurveyStatusPill";
import { SurveySteps } from "@/components/surveys/SurveySteps";
import { DeleteSurveyButton } from "@/components/surveys/DeleteSurveyButton";

export function SurveyEditorChrome({
  surveyId,
  title,
  status,
  children,
}: {
  surveyId: string;
  title: string;
  status: "draft" | "published" | "closed";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPreview = pathname.replace(/\/$/, "").endsWith("/preview");

  if (isPreview) {
    return <div className="flex h-full min-h-0 flex-col">{children}</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            size="icon-sm"
            variant="ghost"
            nativeButton={false}
            render={<Link href="/dashboard" />}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
          <SurveyStatusPill surveyId={surveyId} status={status} />
          <DeleteSurveyButton surveyId={surveyId} surveyTitle={title} />
        </div>
        <div className="pl-11">
          <SurveySteps surveyId={surveyId} />
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
