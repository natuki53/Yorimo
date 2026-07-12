import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { demoCapReached, forbidden, notFound, prototypeRestriction } from "../utils/errors.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { resolveMediaUrl } from "../services/mediaService.js";
import { DEMO_LIMITS, isDemoUser } from "../config/demo.js";

const activePostFilter = (): Prisma.PostWhereInput => ({
  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
});

const readablePostFilter = (userId: string): Prisma.PostWhereInput => ({
  AND: [
    activePostFilter(),
    {
      OR: [{ visibility: "public" }, { userId }]
    }
  ]
});

export const listPosts = async (req: Request, res: Response) => {
  const query = req.query as Record<string, unknown>;
  const where: Prisma.PostWhereInput = {
    AND: [readablePostFilter(req.user!.id)]
  };

  if (typeof query.spotId === "string") {
    where.spotId = query.spotId;
  }
  if (typeof query.userId === "string") {
    where.userId = query.userId;
  }
  if (typeof query.type === "string") {
    where.type = query.type as Prisma.EnumPostTypeFilter["equals"];
  }

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        spot: true
      },
      orderBy: { createdAt: "desc" },
      take: query.limit as number,
      skip: query.offset as number
    }),
    prisma.post.count({ where })
  ]);

  return sendSuccess(res, { items, total });
};

export const createPost = async (req: Request, res: Response) => {
  if (isDemoUser(req.user?.id)) {
    const caption = typeof req.body.caption === "string" ? req.body.caption.trim() : "";
    const validDemoReview =
      req.body.type === "review" &&
      !req.body.mediaUrl &&
      req.body.visibility === "public" &&
      caption.length >= 1 &&
      caption.length <= 300 &&
      (req.body.moodTags?.length ?? 0) <= 5;

    if (!validDemoReview) {
      throw prototypeRestriction("公開デモでは300文字以内の公開口コミのみ投稿できます");
    }

    const count = await prisma.post.count({ where: { userId: req.user!.id, type: "review" } });
    if (count >= DEMO_LIMITS.reviews) {
      throw demoCapReached("共有デモの口コミ上限に達しました");
    }
  }

  const spot = await prisma.spot.findUnique({ where: { id: req.body.spotId } });
  if (!spot) {
    throw notFound("スポットが見つかりません");
  }

  const mediaUrl = await resolveMediaUrl({ mediaUrl: req.body.mediaUrl });
  const expiresAt =
    req.body.type === "story" && req.body.expiresAt == null
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : req.body.expiresAt ?? null;

  const post = await prisma.post.create({
    data: {
      userId: req.user!.id,
      spotId: req.body.spotId,
      type: req.body.type,
      mediaUrl,
      caption: req.body.caption ?? null,
      rating: req.body.rating ?? null,
      moodTags: req.body.moodTags ?? [],
      crowdLevel: req.body.crowdLevel ?? null,
      stayMinutes: req.body.stayMinutes ?? null,
      budgetUsed: req.body.budgetUsed ?? null,
      visibility: req.body.visibility ?? "public",
      expiresAt
    },
    include: {
      user: { select: { id: true, name: true } },
      spot: true
    }
  });

  return sendSuccess(res, post, 201);
};

export const getPost = async (req: Request, res: Response) => {
  const post = await prisma.post.findFirst({
    where: {
      id: req.params.id,
      AND: [readablePostFilter(req.user!.id)]
    },
    include: {
      user: { select: { id: true, name: true } },
      spot: true
    }
  });

  if (!post) {
    throw notFound("投稿が見つかりません");
  }

  return sendSuccess(res, post);
};

export const updatePost = async (req: Request, res: Response) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });

  if (!post) {
    throw notFound("投稿が見つかりません");
  }
  if (post.userId !== req.user!.id) {
    throw forbidden("自分の投稿のみ編集できます");
  }

  const mediaUrl = req.body.mediaUrl === undefined ? undefined : await resolveMediaUrl({ mediaUrl: req.body.mediaUrl });
  const updated = await prisma.post.update({
    where: { id: post.id },
    data: {
      ...req.body,
      mediaUrl
    },
    include: {
      user: { select: { id: true, name: true } },
      spot: true
    }
  });

  return sendSuccess(res, updated);
};

export const deletePost = async (req: Request, res: Response) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });

  if (!post) {
    throw notFound("投稿が見つかりません");
  }
  if (post.userId !== req.user!.id) {
    throw forbidden("自分の投稿のみ削除できます");
  }

  await prisma.post.delete({ where: { id: post.id } });
  return sendSuccess(res, { deleted: true });
};

export const listSpotPosts = async (req: Request, res: Response) => {
  const posts = await prisma.post.findMany({
    where: {
      spotId: req.params.id,
      visibility: "public",
      AND: [activePostFilter()]
    },
    include: {
      user: { select: { id: true, name: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return sendSuccess(res, posts);
};

export const getFeed = async (req: Request, res: Response) => {
  const blocks = await prisma.block.findMany({
    where: {
      OR: [{ blockerId: req.user!.id }, { blockedUserId: req.user!.id }]
    }
  });
  const excludedUserIds = blocks.map((block) =>
    block.blockerId === req.user!.id ? block.blockedUserId : block.blockerId
  );

  const posts = await prisma.post.findMany({
    where: {
      visibility: "public",
      userId: { notIn: excludedUserIds },
      AND: [activePostFilter()]
    },
    include: {
      user: { select: { id: true, name: true } },
      spot: true
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return sendSuccess(res, posts);
};
