import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { classifyWithRules } from "@/lib/classification";
import { defaultTaxonomy, type Taxonomy } from "@/lib/types";

export const runtime = "nodejs";

const allowedTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const maxBytes = 10 * 1024 * 1024;
const model = "qwen/qwen3.8-27b";
const schema = z.object({
  vendor: z.string().default(""),
  invoice_number: z.string().default(""),
  invoice_date: z.string().default(""),
  amount: z.coerce.number().nonnegative().default(0),
  currency: z.string().default("USD"),
  type: z.string().default(""),
  department: z.string().default(""),
  entity: z.string().default(""),
  category: z.string().default(""),
  confidence: z.coerce.number().min(0).max(1).default(0.5),
  notes: z.string().default(""),
});

function safeChoice(value: string, choices: string[], fallback: string) {
  return choices.find((choice) => choice.toLowerCase() === value.toLowerCase()) || fallback;
}

async function extractPdfText(bytes: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs")).href;
  const task = pdfjs.getDocument({ data: bytes, useSystemFonts: true, disableFontFace: true });
  const pdf = await task.promise;
  const pages: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 5); pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => "str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : "").join(""));
    }
  } finally {
    await task.destroy();
  }
  return pages.join("\n").slice(0, 14000);
}

async function authorized(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return true;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const supabase = createClient(url, key);
  const { data, error } = await supabase.auth.getUser(token);
  return !error && Boolean(data.user);
}

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size > maxBytes || file.size === 0) {
    return NextResponse.json({ error: "Choose a PDF, PNG, JPG or WebP file under 10 MB." }, { status: 400 });
  }

  let taxonomy: Taxonomy = defaultTaxonomy;
  try {
    const value = JSON.parse(String(form?.get("taxonomy") || "{}"));
    if (["types", "departments", "entities", "categories"].every((key) => Array.isArray(value[key]) && value[key].every((item: unknown) => typeof item === "string"))) {
      taxonomy = value;
    }
  } catch { /* Default list is safe. */ }

  let bytes: Uint8Array;
  let text = "";
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
    if (file.type === "application/pdf") text = await extractPdfText(bytes);
  } catch (error) {
    console.error("Could not read invoice file", error);
    return NextResponse.json({ error: "This file could not be read. Try another export or an image." }, { status: 422 });
  }

  // A public deployment needs sign-in before it can spend a private Groq key.
  const key = process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SUPABASE_URL
    ? undefined
    : process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json({ classification: classifyWithRules(`${text}\n${file.name}`, taxonomy), notice: process.env.GROQ_API_KEY ? "Connect Supabase sign-in to enable AI on a public deployment." : "Using basic rules. Add a Groq key for AI suggestions." });
  }
  if (file.type === "application/pdf" && !text.trim()) {
    return NextResponse.json({ classification: classifyWithRules(file.name, taxonomy), notice: "This scanned PDF has no selectable text. Upload a photo or image for AI reading." });
  }

  const prompt = `Read this invoice and return one JSON object with vendor, invoice_number, invoice_date (YYYY-MM-DD or empty), amount (number only), currency (ISO code), type, department, entity, category, confidence (0 to 1), notes (one concise sentence). Choose classification values ONLY from these lists: types=${JSON.stringify(taxonomy.types)}, departments=${JSON.stringify(taxonomy.departments)}, entities=${JSON.stringify(taxonomy.entities)}, categories=${JSON.stringify(taxonomy.categories)}. If a fact is missing, use an empty string or 0. Do not invent invoice numbers, dates or amounts. Confidence should reflect uncertainty. Invoice filename: ${file.name}.`;
  const content = file.type === "application/pdf"
    ? [{ type: "text", text: `${prompt}\n\nInvoice text:\n${text}` }]
    : [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}` } }];

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "user", content }], response_format: { type: "json_object" }, temperature: 0, max_completion_tokens: 1000 }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      const detail = response.status === 429 ? "Groq's free rate limit was reached. Try again shortly." : "AI classification is unavailable right now.";
      return NextResponse.json({ classification: classifyWithRules(`${text}\n${file.name}`, taxonomy), notice: `${detail} Basic rules were used instead.` });
    }
    const result = await response.json();
    const parsed = schema.parse(JSON.parse(result.choices?.[0]?.message?.content || "{}"));
    return NextResponse.json({ classification: {
      ...parsed,
      type: safeChoice(parsed.type, taxonomy.types, taxonomy.types[0] || "Other"),
      department: safeChoice(parsed.department, taxonomy.departments, "Unassigned"),
      entity: safeChoice(parsed.entity, taxonomy.entities, "Unassigned"),
      category: safeChoice(parsed.category, taxonomy.categories, "Other"),
      source: "groq",
    } });
  } catch {
    return NextResponse.json({ classification: classifyWithRules(`${text}\n${file.name}`, taxonomy), notice: "AI could not read this file. Basic rules were used instead." });
  }
}
