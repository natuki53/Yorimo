import type { Request, Response } from "express";
import { prisma } from "../utils/prisma.js";
import { notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const createFeedback = async (req: Request, res: Response) => {
  const spot = await prisma.spot.findUnique({ where: { id: req.body.spotId } });
  if (!spot) {
    throw notFound("スポットが見つかりません");
  }

  if (req.body.postId) {
    const post = await prisma.post.findUnique({ where: { id: req.body.postId } });
    if (!post) {
      throw notFound("投稿が見つかりません");
    }
  }

  const feedback = await prisma.feedback.create({
    data: {
      userId: req.user!.id,
      spotId: req.body.spotId,
      postId: req.body.postId ?? null,
      action: req.body.action
    }
  });

  if (req.body.action === "save") {
    await prisma.savedSpot.upsert({
      where: {
        userId_spotId: {
          userId: req.user!.id,
          spotId: req.body.spotId
        }
      },
      update: {},
      create: {
        userId: req.user!.id,
        spotId: req.body.spotId
      }
    });
  }

  return sendSuccess(res, feedback, 201);
};
