import { productIdSchema } from "./schemas";

export function isProductId(value: unknown): value is string {
  return productIdSchema.safeParse(value).success;
}
