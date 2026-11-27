"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LANG_COOKIE, type Lang } from "@/lib/i18n";

/** Remembers the visitor's language for the public site (a year). */
export async function setLanguage(lang: Lang) {
  if (lang !== "es" && lang !== "en") return;
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
