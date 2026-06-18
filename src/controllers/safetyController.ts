import type { Request, Response } from "express";
import { prisma } from "../utils/prisma.js";
import { badRequest, notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/apiResponse.js";

const assertTargetExists = async (targetType: "post" | "user" | "spot", targetId: string) => {
  if (targetType === "post") {
    const post = await prisma.post.findUnique({ where: { id: targetId } });
    if (!post) throw notFound("通報対象の投稿が見つかりません");
    return;
  }

  if (targetType === "user") {
    const user = await prisma.user.findUnique({ where: { id: targetId } });
    if (!user) throw notFound("通報対象のユーザーが見つかりません");
    return;
  }

  const spot = await prisma.spot.findUnique({ where: { id: targetId } });
  if (!spot) throw notFound("通報対象のスポットが見つかりません");
};

export const createReport = async (req: Request, res: Response) => {
  await assertTargetExists(req.body.targetType, req.body.targetId);

  const report = await prisma.report.create({
    data: {
      reporterId: req.user!.id,
      targetType: req.body.targetType,
      targetId: req.body.targetId,
      reason: req.body.reason,
      detail: req.body.detail ?? null
    }
  });

  return sendSuccess(res, report, 201);
};

export const blockUser = async (req: Request, res: Response) => {
  if (req.body.blockedUserId === req.user!.id) {
    throw badRequest("自分自身はブロックできません");
  }

  const targetUser = await prisma.user.findUnique({ where: { id: req.body.blockedUserId } });
  if (!targetUser) {
    throw notFound("ブロック対象のユーザーが見つかりません");
  }

  const block = await prisma.block.upsert({
    where: {
      blockerId_blockedUserId: {
        blockerId: req.user!.id,
        blockedUserId: req.body.blockedUserId
      }
    },
    update: {},
    create: {
      blockerId: req.user!.id,
      blockedUserId: req.body.blockedUserId
    }
  });

  return sendSuccess(res, block, 201);
};

export const unblockUser = async (req: Request, res: Response) => {
  await prisma.block.delete({
    where: {
      blockerId_blockedUserId: {
        blockerId: req.user!.id,
        blockedUserId: req.params.blockedUserId
      }
    }
  });

  return sendSuccess(res, { deleted: true });
};
