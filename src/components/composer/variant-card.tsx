"use client";

import { startTransition, useActionState, useState } from "react";
import type { Platform, PostStatus } from "@/generated/prisma/enums";
import { charCount, isOverLimit, PLATFORMS } from "@/lib/platforms";
import { updatePost } from "@/server/posts";

const STATUS_BADGE: Record<PostStatus, { label: string; className: string }> = {
  DRAFT: { label: "Brouillon", className: "badge-ghost" },
  SCHEDULED: { label: "Planifié", className: "badge-info" },
  PUBLISHING: { label: "Publication…", className: "badge-warning" },
  PUBLISHED: { label: "Publié", className: "badge-success" },
  FAILED: { label: "Échec", className: "badge-error" },
};

type Props = { post: { id: string; platform: Platform; status: PostStatus; content: string } };

export function VariantCard({ post }: Props) {
  const [content, setContent] = useState(post.content);
  const [state, action, pending] = useActionState(updatePost, {});
  const { label, maxLength } = PLATFORMS[post.platform];
  const status = STATUS_BADGE[post.status];
  const over = isOverLimit(post.platform, content);
  const locked = post.status === "PUBLISHING" || post.status === "PUBLISHED";
  const counterId = `counter-${post.id}`;

  return (
    <form
      className="card bg-base-100 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => action(formData));
      }}
    >
      <div className="card-body gap-3">
        <div className="flex items-center justify-between">
          <h3 className="card-title">{label}</h3>
          <span className={`badge badge-soft ${status.className}`}>{status.label}</span>
        </div>
        <input type="hidden" name="id" value={post.id} />
        <textarea
          name="content"
          aria-label={`Variante ${label}`}
          aria-describedby={counterId}
          aria-invalid={over}
          className={`textarea w-full ${over ? "textarea-error" : ""}`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={post.platform === "BLOG" ? 14 : 6}
          disabled={locked}
        />
        <div className="flex items-center justify-between">
          <span id={counterId} className={`text-sm ${over ? "text-error" : "text-base-content/60"}`}>
            {charCount(content)}
            {maxLength !== null && ` / ${maxLength}`}
          </span>
          <button
            type="submit"
            className="btn btn-outline btn-sm"
            disabled={pending || locked || over || content === post.content}
          >
            {pending && <span className="loading loading-spinner loading-xs" />}
            Enregistrer
          </button>
        </div>
        {state.error && (
          <div role="alert" className="alert alert-error alert-soft">
            <span>{state.error}</span>
          </div>
        )}
      </div>
    </form>
  );
}
