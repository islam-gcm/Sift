import { defaultTaxonomy, type Classification, type Taxonomy } from "./types";

function choose(text: string, choices: string[], fallback: string) {
  return choices.find((choice) => text.includes(choice.toLowerCase())) || fallback;
}

export function classifyWithRules(text: string, taxonomy: Taxonomy = defaultTaxonomy): Classification {
  const normalized = text.toLowerCase();
  const categoryRules: Array<[RegExp, string, string]> = [
    [/figma|notion|adobe|slack|github|microsoft|google workspace|subscription|software|saas/, "Software & subscriptions", "Engineering"],
    [/flight|airline|hotel|uber|taxi|train|travel/, "Travel & transport", "Sales"],
    [/office|stationery|paper|desk|printer/, "Office supplies", "Operations"],
    [/marketing|facebook|meta ads|google ads|campaign|advertising/, "Marketing & ads", "Marketing"],
    [/consult|legal|accounting|stripe|professional/, "Professional services", "Finance"],
    [/electric|water|internet|utility|utilities/, "Utilities", "Operations"],
    [/restaurant|catering|meal|lunch|dinner/, "Meals & entertainment", "Sales"],
  ];
  const match = categoryRules.find(([pattern]) => pattern.test(normalized));
  const category = match && taxonomy.categories.includes(match[1]) ? match[1] : taxonomy.categories.at(-1) || "Other";
  const department = match && taxonomy.departments.includes(match[2]) ? match[2] : taxonomy.departments.at(-1) || "Unassigned";
  const type = /credit note|refund/.test(normalized) ? "Credit note" : /receipt/.test(normalized) ? "Receipt" : /subscription|service|consult|software/.test(normalized) ? "Service invoice" : "Supplier invoice";
  const money = text.match(/(?:total|amount due|balance due)\s*[:\-]?\s*(?:USD|EUR|GBP|NGN|[$€£₦])?\s*([\d,]+\.\d{2})/i);
  const number = text.match(/(?:invoice\s*(?:no\.?|number|#)|inv\s*#)\s*[:\-]?\s*([A-Z0-9-]+)/i);
  const date = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 2)?.trim() || "Unknown vendor";
  return {
    vendor: firstLine.slice(0, 80),
    invoice_number: number?.[1] || "",
    invoice_date: date?.[1] || "",
    amount: money ? Number(money[1].replaceAll(",", "")) : 0,
    currency: /EUR|€/.test(text) ? "EUR" : /GBP|£/.test(text) ? "GBP" : /NGN|₦/.test(text) ? "NGN" : "USD",
    type: choose(type.toLowerCase(), taxonomy.types, taxonomy.types[0] || "Other"),
    department,
    entity: taxonomy.entities[0] || "Unassigned",
    category,
    confidence: match ? 0.55 : 0.25,
    source: "rules",
    notes: "Suggested using simple keyword rules. Please check every field.",
  };
}
