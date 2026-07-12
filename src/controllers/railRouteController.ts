import type { Request, Response } from "express";
import { getRailRoutePath } from "../services/railRouteService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const getRailRoute = async (req: Request, res: Response) => {
  const query = req.query as unknown as {
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
  };

  const points = await getRailRoutePath(query);

  return sendSuccess(res, {
    points,
    source: points.length >= 2 ? "osm" : "none",
    total: points.length
  });
};
