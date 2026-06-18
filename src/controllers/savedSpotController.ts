import type { Request, Response } from "express";
import { prisma } from "../utils/prisma.js";
import { notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const listSavedSpots = async (req: Request, res: Response) => {
  const savedSpots = await prisma.savedSpot.findMany({
    where: { userId: req.user!.id },
    include: { spot: true },
    orderBy: { createdAt: "desc" }
  });

  return sendSuccess(res, savedSpots);
};

export const saveSpot = async (req: Request, res: Response) => {
  const spot = await prisma.spot.findUnique({ where: { id: req.body.spotId } });
  if (!spot) {
    throw notFound("スポットが見つかりません");
  }

  const savedSpot = await prisma.savedSpot.upsert({
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
    },
    include: { spot: true }
  });

  await prisma.feedback.create({
    data: {
      userId: req.user!.id,
      spotId: req.body.spotId,
      action: "save"
    }
  });

  return sendSuccess(res, savedSpot, 201);
};

export const deleteSavedSpot = async (req: Request, res: Response) => {
  await prisma.savedSpot.delete({
    where: {
      userId_spotId: {
        userId: req.user!.id,
        spotId: req.params.spotId
      }
    }
  });

  return sendSuccess(res, { deleted: true });
};
