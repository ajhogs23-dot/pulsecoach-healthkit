import { describe, expect, it } from "vitest";
import { foodAmountLabel, parseFoodServing, servingMultiplier } from "../lib/food-serving";

describe("food serving quantities", () => {
  it("scales gram-based nutrition", () => {
    const serving = parseFoodServing("100 g cooked");
    expect(serving.unit).toBe("g");
    expect(servingMultiplier(150, serving)).toBe(1.5);
  });

  it("scales millilitre and slice servings", () => {
    expect(parseFoodServing("250 ml").unit).toBe("mL");
    const bread = parseFoodServing("2 slices");
    expect(bread.unit).toBe("slice");
    expect(servingMultiplier(1, bread)).toBe(0.5);
  });

  it("keeps old food logs readable", () => {
    expect(foodAmountLabel(undefined, undefined, 1)).toBe("1 serving");
    expect(foodAmountLabel(2, "slice", 1)).toBe("2 slices");
  });
});
