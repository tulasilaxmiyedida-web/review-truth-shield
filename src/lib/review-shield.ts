export type ReviewCategory = "Genuine" | "Suspicious" | "Fake";

export type ReviewRow = {
  id: string;
  text: string;
  source: Record<string, string>;
  category?: ReviewCategory;
  risk?: number;
  reason?: string;
  analyzedAt?: string;
};

export type AnalysisSession = {
  id: string;
  name: string;
  createdAt: string;
  total: number;
  genuine: number;
  suspicious: number;
  fake: number;
  reviews: ReviewRow[];
};

export type ParsedCsv = {
  headers: string[];
  rows: Record<string, string>[];
};

export const SAMPLE_REVIEWS = [
  { review: "The blender is sturdy and easy to clean. I use it for smoothies most mornings.", rating: "5", date: "2026-11-14", product: "Kitchen blender" },
  { review: "Battery lasted through my whole commute and the sound is clear. Comfortable fit too.", rating: "4", date: "2026-11-13", product: "Wireless earbuds" },
  { review: "Works as expected. Setup took about five minutes and the instructions were clear.", rating: "4", date: "2026-11-12", product: "Desk lamp" },
  { review: "Absolutely amazing!!! BUY NOW!!! Best product ever!!! 100% guaranteed!!!", rating: "5", date: "2026-11-11", product: "Wireless earbuds" },
  { review: "Great product, great product, great product. Amazing deal. Buy now today!", rating: "5", date: "2026-11-10", product: "Kitchen blender" },
  { review: "Excellent", rating: "5", date: "2026-11-09", product: "Desk lamp" },
  { review: "The replacement arrived quickly, but the first unit stopped charging after a week.", rating: "2", date: "2026-11-08", product: "Wireless earbuds" },
  { review: "I like the warm light, though the touch control can be a little sensitive at night.", rating: "4", date: "2026-11-07", product: "Desk lamp" },
  { review: "Best quality ever! Amazing product! Buy now! Best quality ever!", rating: "5", date: "2026-11-06", product: "Kitchen blender" },
  { review: "Solid value for the price. The charging case is compact and easy to carry.", rating: "4", date: "2026-11-05", product: "Wireless earbuds" },
  { review: "Arrived with a cracked lid, customer service sent a replacement in two days.", rating: "2", date: "2026-11-04", product: "Kitchen blender" },
  { review: "Perfect perfect perfect!!! Amazing!!!", rating: "5", date: "2026-11-03", product: "Desk lamp" },
].map((source, index) => ({ id: `sample-${index + 1}`, text: source.review, source }));

function parseLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += char;
    }
  }
  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  values.push(value.trim());
  return values;
}

export function parseCsv(csv: string): ParsedCsv {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("Add a header row and at least one review row.");
  const headers = parseLine(lines[0] ?? "");
  if (!headers.length || headers.some((header) => !header)) throw new Error("Every column needs a name.");
  if (new Set(headers.map((header) => header.toLowerCase())).size !== headers.length) {
    throw new Error("Column names must be unique.");
  }
  const rows = lines.slice(1).map((line, index) => {
    const values = parseLine(line);
    if (values.length !== headers.length) {
      throw new Error(`Row ${index + 2} has ${values.length} values; expected ${headers.length}.`);
    }
    return Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""]));
  });
  return { headers, rows };
}

const promoTerms = ["buy now", "limited time", "guaranteed", "best ever", "must-have", "click here", "100%"];
const genericTerms = new Set(["excellent", "great", "good", "perfect", "amazing", "love it", "works great"]);

export function classifyReviews(rows: ReviewRow[]): ReviewRow[] {
  const normalizedCounts = new Map<string, number>();
  for (const row of rows) {
    const normalized = row.text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    normalizedCounts.set(normalized, (normalizedCounts.get(normalized) ?? 0) + 1);
  }

  return rows.map((row) => {
    const normalized = row.text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
    const words = normalized.split(" ").filter(Boolean);
    const repeatedWords = words.some((word, index) => word.length > 3 && words.indexOf(word) !== index);
    const duplicate = normalizedCounts.get(normalized) !== undefined && (normalizedCounts.get(normalized) ?? 0) > 1;
    const promoCount = promoTerms.filter((term) => normalized.includes(term)).length;
    const punctuation = (row.text.match(/[!?]/g) ?? []).length;
    const rating = Number(row.source.rating ?? row.source.stars ?? "");
    const reasons: string[] = [];
    let risk = 5;

    if (duplicate) { risk += 65; reasons.push("Exact duplicate text found in this dataset"); }
    if (promoCount > 0) { risk += 22 + (promoCount - 1) * 8; reasons.push("Promotional language detected"); }
    if (words.length <= 3 || genericTerms.has(normalized)) { risk += 22; reasons.push("Very short or generic wording"); }
    if (repeatedWords) { risk += 18; reasons.push("Repeated words detected"); }
    if (punctuation >= 5) { risk += 16; reasons.push("Excessive exclamation or question marks"); }
    if (Number.isFinite(rating) && rating > 0 && rating <= 2 && /perfect|amazing|best ever|excellent/i.test(row.text)) {
      risk += 15; reasons.push("Low rating conflicts with strongly positive wording");
    }
    risk = Math.min(99, risk);
    const category: ReviewCategory = risk >= 70 ? "Fake" : risk >= 35 ? "Suspicious" : "Genuine";
    return {
      ...row,
      risk,
      category,
      reason: reasons.length ? reasons.join("; ") : "No strong suspicious patterns found",
      analyzedAt: new Date().toISOString(),
    };
  });
}

export function similarity(left: string, right: string) {
  const tokenize = (text: string) => new Set(text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const a = tokenize(left);
  const b = tokenize(right);
  const commonWords = [...a].filter((word) => b.has(word)).sort();
  const union = new Set([...a, ...b]).size;
  return { percent: union ? Math.round((commonWords.length / union) * 100) : 0, commonWords };
}