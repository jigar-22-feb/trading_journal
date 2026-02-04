import { api } from "./client";

export type Tag = {
  _id: string;
  tag_name: string;
  trade_ids: string[];
};

export function getTags(): Promise<Tag[]> {
  return api<Tag[]>("/tags");
}

export function createTag(tag_name: string): Promise<Tag> {
  return api<Tag>("/tags", {
    method: "POST",
    body: JSON.stringify({ tag_name: tag_name.trim() }),
  });
}

export function deleteTag(id: string): Promise<void> {
  return api<void>(`/tags/${id}`, { method: "DELETE" });
}
