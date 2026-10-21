"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
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

function stepPath(surveyId: string, slug: (typeof STEPS)[number]["slug"]) {
  return `/surveys/${surveyId}/${slug}`;
}

function isStepActive(pathname: string, href: string) {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return normalized === href;
}

export function SurveySteps({ surveyId }: { surveyId: string }) {
  const pathname = usePathname();

  return (
    <Breadcrumb>
      <BreadcrumbList className="gap-1.5 sm:gap-1.5">
        {STEPS.map((step, index) => {
          const href = stepPath(surveyId, step.slug);
          const active = isStepActive(pathname, href);

          const badge = (
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] tabular-nums",
                active && "border-foreground bg-foreground text-background",
              )}
            >
              {index + 1}
            </span>
          );

          return (
            <Fragment key={step.slug}>
              {index > 0 && <BreadcrumbSeparator className="flex items-center" />}
              <BreadcrumbItem className="gap-1.5">
                {active ? (
                  <BreadcrumbPage className="inline-flex items-center gap-1.5 font-medium">
                    {badge}
                    {step.label}
                  </BreadcrumbPage>
                ) : (
                  <Link
                    href={href}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                  >
                    {badge}
                    {step.label}
                  </Link>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
