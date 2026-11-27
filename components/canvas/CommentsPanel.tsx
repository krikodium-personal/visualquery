"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { MoreVertical, X } from "lucide-react";
import { toast } from "sonner";
import { addComment, deleteComment, editComment, setCommentResolved } from "@/actions/comments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CommentItem } from "@/lib/comments";
import { cn } from "@/lib/utils";

export type CommentTarget = { id: string; code: string; title: string };

const GENERAL = "__general__";
const ALL = "__all__";

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "ahora";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export function CommentsPanel({
  surveyId,
  comments,
  onCommentsChange,
  targets,
  defaultQuestionId,
  currentUserId,
  onClose,
}: {
  surveyId: string;
  comments: CommentItem[];
  onCommentsChange: (next: CommentItem[]) => void;
  targets: CommentTarget[];
  defaultQuestionId: string | null;
  currentUserId: string;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<string>(defaultQuestionId ?? ALL);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const targetOf = (id: string | null) => (id ? targets.find((t) => t.id === id) : undefined);
  // New comments go to the filtered question, or to the survey when viewing everything.
  const composeQuestionId = filter === ALL || filter === GENERAL ? null : filter;

  const threads = useMemo(() => {
    const roots = comments.filter((c) => !c.parentId);
    const visible = roots.filter((c) =>
      filter === ALL ? true : filter === GENERAL ? c.questionId === null : c.questionId === filter,
    );
    return visible.map((root) => ({ root, replies: comments.filter((c) => c.parentId === root.id) }));
  }, [comments, filter]);

  function run<T extends { error?: string }>(action: () => Promise<T>, onOk: (result: T) => void) {
    start(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else onOk(result);
    });
  }

  function submitNew() {
    run(() => addComment(surveyId, { questionId: composeQuestionId, body: draft }), (r) => {
      if (r.comment) onCommentsChange([...comments, r.comment]);
      setDraft("");
    });
  }

  function submitReply(parentId: string) {
    run(() => addComment(surveyId, { questionId: null, body: replyDraft, parentId }), (r) => {
      if (r.comment) onCommentsChange([...comments, r.comment]);
      setReplyDraft("");
      setReplyTo(null);
    });
  }

  function submitEdit(id: string) {
    run(() => editComment(surveyId, id, editDraft), (r) => {
      if (r.comment) onCommentsChange(comments.map((c) => (c.id === id ? r.comment! : c)));
      setEditing(null);
    });
  }

  function remove(id: string) {
    run(() => deleteComment(surveyId, id), () =>
      onCommentsChange(comments.filter((c) => c.id !== id && c.parentId !== id)),
    );
  }

  function resolve(c: CommentItem) {
    run(() => setCommentResolved(surveyId, c.id, !c.resolved), (r) => {
      if (r.comment) onCommentsChange(comments.map((x) => (x.id === c.id ? r.comment! : x)));
    });
  }

  function onKey(event: React.KeyboardEvent<HTMLTextAreaElement>, submit: () => void, text: string) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (text.trim() && !pending) submit();
    }
  }

  function renderComment(c: CommentItem, isRoot: boolean) {
    const mine = c.authorId === currentUserId;
    return (
      <div className={cn("flex flex-col gap-1", c.resolved && isRoot && "opacity-60")}>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold">{c.authorName}</span>
          <span className="text-muted-foreground">{timeAgo(c.createdAt)}</span>
          {c.updatedAt !== c.createdAt && c.updatedAt.slice(0, 19) !== c.createdAt.slice(0, 19) ? (
            <span className="text-muted-foreground">(editado)</span>
          ) : null}
          {c.resolved && isRoot ? <Badge variant="secondary">Resuelto</Badge> : null}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-xs" className="ml-auto" aria-label="Opciones del comentario" />}
            >
              <MoreVertical className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {mine ? (
                <DropdownMenuItem onClick={() => { setEditing(c.id); setEditDraft(c.body); }}>Editar</DropdownMenuItem>
              ) : null}
              <DropdownMenuItem variant="destructive" onClick={() => remove(c.id)}>Eliminar</DropdownMenuItem>
              {isRoot ? (
                <DropdownMenuItem onClick={() => resolve(c)}>{c.resolved ? "Reabrir" : "Resolver"}</DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {editing === c.id ? (
          <div className="flex flex-col gap-1">
            <textarea
              autoFocus
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              onKeyDown={(e) => onKey(e, () => submitEdit(c.id), editDraft)}
              rows={2}
              className="w-full rounded-lg border border-input bg-transparent px-2 py-1 text-sm"
              aria-label="Editar comentario"
            />
            <div className="flex gap-2">
              <Button size="xs" onClick={() => submitEdit(c.id)} disabled={pending || !editDraft.trim()}>Guardar</Button>
              <Button size="xs" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm break-words whitespace-pre-wrap">{c.body}</p>
        )}
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "flex min-h-0 shrink-0 flex-col border-l bg-background",
        "w-full max-w-sm md:w-[320px]",
        "max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-30 max-md:shadow-xl",
      )}
      aria-label="Comentarios"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <p className="shrink-0 text-sm font-semibold">Comentarios en</p>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filtrar comentarios"
            className="h-7 min-w-0 rounded-lg border border-input bg-transparent px-1.5 text-xs"
          >
            <option value={ALL}>Todos</option>
            <option value={GENERAL}>Encuesta</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                P{t.code}
              </option>
            ))}
          </select>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Cerrar comentarios">
          <X className="size-4" />
        </Button>
      </header>

      <div className="flex flex-col gap-1 border-b p-3">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => onKey(e, submitNew, draft)}
          rows={2}
          placeholder={composeQuestionId ? "Agregar un comentario a esta pregunta" : "Agregar un comentario a la encuesta"}
          aria-label="Agregar un comentario"
          className="w-full rounded-lg border border-input bg-transparent px-2 py-1.5 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          <strong>Enter</strong> agrega el comentario · <strong>Shift+Enter</strong> salta de línea.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {threads.length === 0 ? (
          <div className="mt-10 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Todavía no hay comentarios</p>
            <p className="mt-1">Usá los comentarios para dejar notas o preguntas sobre la encuesta y sus preguntas.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-5">
            {threads.map(({ root, replies }) => {
              const target = targetOf(root.questionId);
              return (
                <li key={root.id} className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {root.questionId === null ? "Encuesta" : target ? `P${target.code} · ${target.title || "Sin título"}` : "Pregunta eliminada"}
                  </p>
                  {renderComment(root, true)}
                  {replies.map((reply) => (
                    <div key={reply.id} className="ml-4 border-l pl-3">
                      {renderComment(reply, false)}
                    </div>
                  ))}
                  {replyTo === root.id ? (
                    <div className="ml-4 flex flex-col gap-1">
                      <textarea
                        autoFocus
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        onKeyDown={(e) => onKey(e, () => submitReply(root.id), replyDraft)}
                        rows={2}
                        placeholder="Responder"
                        aria-label="Responder"
                        className="w-full rounded-lg border border-input bg-transparent px-2 py-1 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button size="xs" onClick={() => submitReply(root.id)} disabled={pending || !replyDraft.trim()}>Responder</Button>
                        <Button size="xs" variant="ghost" onClick={() => setReplyTo(null)}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setReplyTo(root.id); setReplyDraft(""); }} className="ml-4 self-start text-xs text-primary hover:underline">
                      Responder
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
