import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma.js";

export const normalizeTags = (tags?: string[]) => {
  return Array.from(
    new Set(
      (tags ?? [])
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
};

export const syncSpotTags = async (spotId: string, tags: string[], category?: string | null) => {
  const normalizedTags = normalizeTags(tags);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.spotTag.deleteMany({ where: { spotId } });

    for (const name of normalizedTags) {
      const tag = await tx.tag.upsert({
        where: { name },
        update: category ? { category } : {},
        create: { name, category: category ?? null }
      });

      await tx.spotTag.create({
        data: {
          spotId,
          tagId: tag.id
        }
      });
    }
  });
};
