import type { Request, Response } from "express";
import { searchStations } from "../services/googlePlacesService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const listStations = async (req: Request, res: Response) => {
  const query = req.query as unknown as {
    keyword: string;
    lat?: number;
    lng?: number;
    limit: number;
  };

  const items = await searchStations(query);

  return sendSuccess(res, {
    items,
    total: items.length
  });
};
