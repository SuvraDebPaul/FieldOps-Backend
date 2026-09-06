/**
 * Narrow a raw `req.query` down to the keys a module understands, so nothing
 * unexpected reaches the service layer.
 */
export const pick = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Partial<T> => {
  const result: Partial<T> = {};

  for (const key of keys) {
    const value = obj?.[key];

    if (value !== undefined && value !== null && value !== "") {
      result[key] = value;
    }
  }

  return result;
};
