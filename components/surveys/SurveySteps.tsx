"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

const STEPS = [
  { slug: "questions", label: "Preguntas" },
  { slug: "design", label: "Diseño" },
  { slug: "publish", label: "Publicación" },
  { slug: "results", label: "Análisis" },
] as const;

export function SurveySteps({ surveyId }: { surveyId: string }) {
  const pathname = usePathname();

  return (
    <Breadcrumb>
      <BreadcrumbList className="gap-1.5 sm:gap-1.5">
        {STEPS.map((step, index) => {
          const href = `/surveys/${surveyId}/${step.slug}`;
          const active = pathname === href;

          return (
            <Fragment key={step.slug}>
              {index > 0 && <BreadcrumbSeparator className="flex items-center" />}
              <BreadcrumbItem className="gap-1.5">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border text-[10px] tabular-nums",
                    active && "border-foreground bg-foreground text-background",
                  )}
                >
                  {index + 1}
                </span>
                {active ? (
                  <BreadcrumbPage className="font-medium">{step.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={href} />}>{step.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
