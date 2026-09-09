import "server-only";
import { SquareClient, SquareEnvironment } from "square";

let cachedClient: SquareClient | undefined;

export function getSquareClient(): SquareClient {
  if (cachedClient) return cachedClient;

  const token = process.env.SQUARE_ACCESS_TOKEN;
  const environment = process.env.SQUARE_ENVIRONMENT;

  if (!token) {
    throw new Error("SQUARE_ACCESS_TOKEN is not set");
  }
  if (environment !== "production" && environment !== "sandbox") {
    throw new Error(
      `SQUARE_ENVIRONMENT must be "production" or "sandbox", got "${environment}"`
    );
  }

  cachedClient = new SquareClient({
    token,
    environment:
      environment === "production"
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
  });

  return cachedClient;
}

export function getSquareLocationId(): string {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) {
    throw new Error("SQUARE_LOCATION_ID is not set");
  }
  return locationId;
}
