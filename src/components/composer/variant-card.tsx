"use client";

import { startTransition, useActionState, useState } from "react";
import type { Platform, PostStatus } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { charCount, isOverLimit, PLATFORMS } from "@/lib/platforms";
import { updatePost } from "@/server/posts";

type Props = { post: { id: string; platform: Platform; status: PostStatus; content: string } };

export function VariantCard({ post }: Props) {
  const [content, setContent] = useState(post.content);
  const [state, action, pending] = useActionState(updatePost, {});
  const { label, maxLength } = PLATFORMS[post.platform];
  const over = isOverLimit(post.platform, content);
  const locked = post.status === "PUBLISHING" || post.status === "PUBLISHED";
  const counterId = `counter-${post.id}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {label}
          <span className="text-xs font-normal text-muted-foreground">{post.status}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(() => action(formData));
          }}
        >
          <input type="hidden" name="id" value={post.id} />
          <Textarea
            name="content"
            aria-label={`Variante ${label}`}
            aria-describedby={counterId}
            aria-invalid={over}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={post.platform === "BLOG" ? 14 : 6}
            disabled={locked}
          />
          <div className="flex items-center justify-between">
            <span id={counterId} className={over ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
              {charCount(content)}
              {maxLength !== null && ` / ${maxLength}`}
            </span>
            <Button type="submit" size="sm" variant="outline" disabled={pending || locked || over || content === post.content}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
