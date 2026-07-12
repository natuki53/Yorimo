import type { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { notFound } from "../utils/errors.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { distanceKm } from "../utils/geo.js";
import { syncNearbyPlaces } from "../services/googlePlacesService.js";
import { normalizeTags, syncSpotTags } from "../services/tagService.js";

export const listSpots = async (req: Request, res: Response) => {
  const query = req.query as Record<string, unknown>;
  const lat = query.lat as number | undefined;
  const lng = query.lng as number | undefined;
  const radiusKm = query.radiusKm as number | undefined;
  const offset = query.offset as number;
  const limit = query.limit as number;
  const where: Prisma.SpotWhereInput = {};
  const and: Prisma.SpotWhereInput[] = [];

  if (lat != null && lng != null) {
    await syncNearbyPlaces({ lat, lng, radiusKm, limit: Math.min(limit, 20) });
  }

  if (typeof query.category === "string") {
    where.category = { equals: query.category, mode: "insensitive" };
  }

  if (typeof query.tag === "string") {
    where.tags = { has: query.tag };
  }

  if (typeof query.minBudget === "number") {
    and.push({ OR: [{ priceMax: null }, { priceMax: { gte: query.minBudget } }] });
  }

  if (typeof query.maxBudget === "number") {
    and.push({ OR: [{ priceMin: null }, { priceMin: { lte: query.maxBudget } }] });
  }

  if (typeof query.keyword === "string") {
    and.push({
      OR: [
        { name: { contains: query.keyword, mode: "insensitive" } },
        { description: { contains: query.keyword, mode: "insensitive" } },
        { address: { contains: query.keyword, mode: "insensitive" } },
        { stationName: { contains: query.keyword, mode: "insensitive" } },
        { category: { contains: query.keyword, mode: "insensitive" } },
        { tags: { has: query.keyword } }
      ]
    });
  }

  if (and.length > 0) {
    where.AND = and;
  }

  const spots = await prisma.spot.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500
  });

  const filtered =
    lat != null && lng != null && radiusKm != null
      ? spots.filter((spot) => distanceKm({ lat, lng }, { lat: spot.lat, lng: spot.lng }) <= radiusKm)
      : spots;

  return sendSuccess(res, {
    items: filtered.slice(offset, offset + limit),
    total: filtered.length
  });
};

export const getSpot = async (req: Request, res: Response) => {
  const spot = await prisma.spot.findUnique({
    where: { id: req.params.id },
    include: {
      spotTags: {
        include: { tag: true }
      }
    }
  });

  if (!spot) {
    throw notFound("スポットが見つかりません");
  }

  return sendSuccess(res, spot);
};

export const createSpot = async (req: Request, res: Response) => {
  const tags = normalizeTags(req.body.tags);
  const spot = await prisma.spot.create({
    data: {
      name: req.body.name,
      description: req.body.description ?? null,
      category: req.body.category,
      lat: req.body.lat,
      lng: req.body.lng,
      address: req.body.address ?? null,
      stationName: req.body.stationName ?? null,
      priceMin: req.body.priceMin ?? null,
      priceMax: req.body.priceMax ?? null,
      openingHours: req.body.openingHours ?? null,
      tags,
      imageUrl: req.body.imageUrl ?? null,
      averageStayMinutes: req.body.averageStayMinutes ?? null
    }
  });

  await syncSpotTags(spot.id, tags, spot.category);

  return sendSuccess(res, spot, 201);
};

export const updateSpot = async (req: Request, res: Response) => {
  const existing = await prisma.spot.findUnique({
    where: { id: req.params.id }
  });

  if (!existing) {
    throw notFound("スポットが見つかりません");
  }

  const tags = req.body.tags === undefined ? undefined : normalizeTags(req.body.tags);
  const spot = await prisma.spot.update({
    where: { id: existing.id },
    data: {
      ...req.body,
      tags
    }
  });

  if (tags !== undefined) {
    await syncSpotTags(spot.id, tags, spot.category);
  }

  return sendSuccess(res, spot);
};

export const deleteSpot = async (req: Request, res: Response) => {
  const existing = await prisma.spot.findUnique({
    where: { id: req.params.id }
  });

  if (!existing) {
    throw notFound("スポットが見つかりません");
  }

  await prisma.spot.delete({ where: { id: existing.id } });
  return sendSuccess(res, { deleted: true });
};
