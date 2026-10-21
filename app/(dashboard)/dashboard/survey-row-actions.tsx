"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SurveyRowActions({
  status,
  slug,
}: {
  status: string;
  slug: string;
}) {
  if (status !== "published") return null;

  const copyLink = () => {
    const url = `${window.location.origin}/s/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  return (
    <div className="flex gap-2 text-sm">
      <Button size="sm" variant="ghost" onClick={copyLink}>
        Copiar link
      </Button>
    </div>
  );
}
