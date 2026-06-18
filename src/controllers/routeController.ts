import type { Request, Response } from "express";
import { prisma } from "../utils/prisma.js";
import { notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const listRoutes = async (req: Request, res: Response) => {
  const routes = await prisma.route.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" }
  });

  return sendSuccess(res, routes);
};

export const createRoute = async (req: Request, res: Response) => {
  const route = await prisma.route.create({
    data: {
      userId: req.user!.id,
      name: req.body.name,
      startName: req.body.startName,
      startLat: req.body.startLat,
      startLng: req.body.startLng,
      endName: req.body.endName,
      endLat: req.body.endLat,
      endLng: req.body.endLng,
      viaStationNames: req.body.viaStationNames ?? [],
      usualDepartureTime: req.body.usualDepartureTime ?? null,
      usualArrivalTime: req.body.usualArrivalTime ?? null
    }
  });

  return sendSuccess(res, route, 201);
};

export const getRoute = async (req: Request, res: Response) => {
  const route = await prisma.route.findFirst({
    where: { id: req.params.id, userId: req.user!.id }
  });

  if (!route) {
    throw notFound("ルートが見つかりません");
  }

  return sendSuccess(res, route);
};

export const updateRoute = async (req: Request, res: Response) => {
  const route = await prisma.route.findFirst({
    where: { id: req.params.id, userId: req.user!.id }
  });

  if (!route) {
    throw notFound("ルートが見つかりません");
  }

  const updated = await prisma.route.update({
    where: { id: route.id },
    data: req.body
  });

  return sendSuccess(res, updated);
};

export const deleteRoute = async (req: Request, res: Response) => {
  const route = await prisma.route.findFirst({
    where: { id: req.params.id, userId: req.user!.id }
  });

  if (!route) {
    throw notFound("ルートが見つかりません");
  }

  await prisma.route.delete({ where: { id: route.id } });
  return sendSuccess(res, { deleted: true });
};
