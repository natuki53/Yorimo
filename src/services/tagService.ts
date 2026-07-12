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
    const tagIds: string[] = [];

    for (const name of normalizedTags) {
      const tag = await tx.tag.upsert({
        where: { name },
        update: category ? { category } : {},
        create: { name, category: category ?? null }
      });

      tagIds.push(tag.id);
    }

    if (tagIds.length > 0) {
      await tx.spotTag.createMany({
        data: tagIds.map((tagId) => ({ spotId, tagId })),
        skipDuplicates: true
      });
    }

    await tx.spotTag.deleteMany({
      where: {
        spotId,
        ...(tagIds.length > 0 ? { tagId: { notIn: tagIds } } : {})
      }
    });
  });
};
