import { describe, expect, it } from "vitest";
import { isApiSuccess } from "../index";

describe("isApiSuccess", () => {
  it("returns true when payload.success is true", () => {
    expect(isApiSuccess({ success: true, message: "ok", data: { id: 1 } })).toBe(true);
  });

  it("returns false when payload.success is false", () => {
    expect(isApiSuccess({ success: false, message: "failed", data: null })).toBe(false);
  });
});
