import type { Request, Response } from "express";
import { prisma } from "../utils/prisma.js";
import { demoCapReached, demoDataLocked, notFound, prototypeRestriction } from "../utils/errors.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { DEMO_LIMITS, isDemoUser, isProtectedDemoRoute, toPublicRoute } from "../config/demo.js";

export const listRoutes = async (req: Request, res: Response) => {
  const routes = await prisma.route.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" }
  });

  const orderedRoutes = [...routes].sort((a, b) => {
    if (isProtectedDemoRoute(a.id)) return -1;
    if (isProtectedDemoRoute(b.id)) return 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return sendSuccess(res, orderedRoutes.map(toPublicRoute));
};

export const createRoute = async (req: Request, res: Response) => {
  if (isDemoUser(req.user?.id)) {
    const count = await prisma.route.count({ where: { userId: req.user!.id } });
    if (count >= DEMO_LIMITS.routes) {
      throw demoCapReached("共有デモではルートを19件まで追加できます");
    }
  }

  const route = await prisma.route.create({
    data: {
      userId: req.user!.id,
      name: req.body.name,
      startType: req.body.startType,
      startName: req.body.startName,
      startLat: req.body.startLat,
      startLng: req.body.startLng,
      endType: req.body.endType,
      endName: req.body.endName,
      endLat: req.body.endLat,
      endLng: req.body.endLng,
      travelMode: req.body.travelMode,
      viaStationNames: req.body.viaStationNames ?? [],
      usualDepartureTime: req.body.usualDepartureTime ?? null,
      usualArrivalTime: req.body.usualArrivalTime ?? null
    }
  });

  return sendSuccess(res, toPublicRoute(route), 201);
};

export const getRoute = async (req: Request, res: Response) => {
  const route = await prisma.route.findFirst({
    where: { id: req.params.id, userId: req.user!.id }
  });

  if (!route) {
    throw notFound("ルートが見つかりません");
  }

  return sendSuccess(res, toPublicRoute(route));
};

export const updateRoute = async (req: Request, res: Response) => {
  const route = await prisma.route.findFirst({
    where: { id: req.params.id, userId: req.user!.id }
  });

  if (!route) {
    throw notFound("ルートが見つかりません");
  }
  if (isProtectedDemoRoute(route.id)) {
    throw demoDataLocked("基準ルートは変更できません");
  }
  if (isDemoUser(req.user?.id)) {
    throw prototypeRestriction("公開デモでは追加ルートの編集はできません。作り直してください");
  }

  const updated = await prisma.route.update({
    where: { id: route.id },
    data: req.body
  });

  return sendSuccess(res, toPublicRoute(updated));
};

export const deleteRoute = async (req: Request, res: Response) => {
  const route = await prisma.route.findFirst({
    where: { id: req.params.id, userId: req.user!.id }
  });

  if (!route) {
    throw notFound("ルートが見つかりません");
  }
  if (isProtectedDemoRoute(route.id)) {
    throw demoDataLocked("基準ルートは削除できません");
  }

  await prisma.route.delete({ where: { id: route.id } });
  return sendSuccess(res, { deleted: true });
};
