export type MediaInput = {
  mediaUrl?: string | null;
};

export const resolveMediaUrl = async ({ mediaUrl }: MediaInput) => {
  return mediaUrl ?? null;
};
