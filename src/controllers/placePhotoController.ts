import type { Request, Response } from "express";
import { getPlacePhotoUri } from "../services/googlePlacesService.js";
import { notFound } from "../utils/errors.js";

export const getPlacePhoto = async (req: Request, res: Response) => {
  const photoName = Buffer.from(req.params.photoName, "base64url").toString("utf8");
  const photoUri = await getPlacePhotoUri(photoName);

  if (!photoUri) {
    throw notFound("写真が見つかりません");
  }

  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.redirect(302, photoUri);
};
