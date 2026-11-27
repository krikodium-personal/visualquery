import { prisma } from "@/lib/prisma";
import { DATA_IMAGE_PATTERN } from "@/lib/share-options";

/**
 * Serves the survey's link-preview image. Uploaded images are stored as data URLs, which
 * social networks can't read as og:image, so they're decoded and served from here.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collector = await prisma.collector.findUnique({
    where: { slug },
    select: { survey: { select: { status: true, shareImageUrl: true } } },
  });
  const image = collector?.survey.status === "draft" ? null : collector?.survey.shareImageUrl;
  if (!image) return new Response("Not found", { status: 404 });

  if (/^https?:\/\//.test(image)) return Response.redirect(image, 302);

  if (!DATA_IMAGE_PATTERN.test(image)) return new Response("Not found", { status: 404 });
  const [header, base64] = image.split(",", 2);
  const contentType = header.slice("data:".length, header.indexOf(";"));
  const bytes = Uint8Array.from(atob(base64.replace(/\s/g, "")), (char) => char.charCodeAt(0));
  return new Response(bytes, {
    headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=300" },
  });
}
