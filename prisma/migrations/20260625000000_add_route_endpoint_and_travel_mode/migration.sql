-- CreateEnum
CREATE TYPE "RouteEndpointType" AS ENUM ('station', 'pin');

-- CreateEnum
CREATE TYPE "RouteTravelMode" AS ENUM ('transit', 'driving', 'walking', 'bicycling');

-- AlterTable
ALTER TABLE "Route"
ADD COLUMN "startType" "RouteEndpointType" NOT NULL DEFAULT 'station',
ADD COLUMN "endType" "RouteEndpointType" NOT NULL DEFAULT 'station',
ADD COLUMN "travelMode" "RouteTravelMode" NOT NULL DEFAULT 'transit';
