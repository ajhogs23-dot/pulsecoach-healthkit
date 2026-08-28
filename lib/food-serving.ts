export type FoodServingUnit = "serving" | "g" | "mL" | "slice" | "item";

export type ParsedFoodServing = {
  baseQuantity: number;
  unit: FoodServingUnit;
  label: string;
};

const unitFromText = (value: string): FoodServingUnit => {
  const unit = value.toLowerCase();
  if (unit === "g" || unit.startsWith("gram")) return "g";
  if (unit === "ml" || unit.startsWith("millil")) return "mL";
  if (unit.startsWith("slice")) return "slice";
  if (["medium", "large", "small", "bar", "can", "tub", "scoop", "tablespoon", "sausage", "rasher"].some((item) => unit.startsWith(item))) return "item";
  return "serving";
};

export function parseFoodServing(detail: string): ParsedFoodServing {
  const match = detail.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/);
  if (!match) return { baseQuantity: 1, unit: "serving", label: detail || "1 serving" };
  const baseQuantity = Number(match[1]);
  return {
    baseQuantity: Number.isFinite(baseQuantity) && baseQuantity > 0 ? baseQuantity : 1,
    unit: unitFromText(match[2]),
    label: detail,
  };
}

export function servingMultiplier(amount: number, serving: ParsedFoodServing) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return amount / serving.baseQuantity;
}

export function foodAmountLabel(amount: number | undefined, unit: FoodServingUnit | undefined, servings: number) {
  if (amount !== undefined && unit) {
    const suffix = unit === "slice" && amount !== 1 ? "slices" : unit === "item" ? (amount === 1 ? "item" : "items") : unit;
    return `${amount} ${suffix}`;
  }
  return `${servings} ${servings === 1 ? "serving" : "servings"}`;
}
