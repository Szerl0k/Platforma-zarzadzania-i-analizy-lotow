import { Request, Response, NextFunction, Send } from "express";
import NodeCache from "node-cache";

// Keep data in memory for 15 seconds
const areaCache = new NodeCache({ stdTTL: 15, checkperiod: 20 });

export function cacheMapArea(req: Request, res: Response, next: NextFunction) {
  const { lamin, lamax, lomin, lomax } = req.query;

  if (!lamin || !lamax || !lomin || !lomax) return next();

  const cacheKey = `bbox_${Number(lamin).toFixed(2)}_${Number(lamax).toFixed(2)}_${Number(lomin).toFixed(2)}_${Number(lomax).toFixed(2)}`;

  const cachedData = areaCache.get(cacheKey);

  if (cachedData) {
    res.json(cachedData);
    return;
  }

  // Overwrite res.json method to capture and save reqest in cache
  const originalJson = res.json.bind(res);

  res.json = (body: Parameters<Send>[0]) => {
    if (res.statusCode === 200) {
      areaCache.set(cacheKey, body);
    }
    return originalJson(body);
  };
  next();
}
