export type InvoiceStatus = "needs_review" | "approved";
export type InvoiceSource = "groq" | "rules" | "manual" | "sample";

export type Invoice = {
  id: string;
  user_id?: string;
  file_name: string;
  file_path?: string | null;
  vendor: string;
  invoice_number: string;
  invoice_date: string;
  amount: number;
  currency: string;
  type: string;
  department: string;
  entity: string;
  category: string;
  status: InvoiceStatus;
  confidence: number;
  source: InvoiceSource;
  notes: string;
  created_at: string;
};

export type Taxonomy = {
  types: string[];
  departments: string[];
  entities: string[];
  categories: string[];
};

export type Classification = Pick<Invoice, "vendor" | "invoice_number" | "invoice_date" | "amount" | "currency" | "type" | "department" | "entity" | "category" | "confidence" | "source" | "notes">;

export const defaultTaxonomy: Taxonomy = {
  types: ["Supplier invoice", "Service invoice", "Credit note", "Receipt", "Other"],
  departments: ["Operations", "Marketing", "Engineering", "Sales", "Finance", "People", "Unassigned"],
  entities: ["Main company", "Unassigned"],
  categories: ["Software & subscriptions", "Office supplies", "Travel & transport", "Professional services", "Marketing & ads", "Utilities", "Meals & entertainment", "Other"],
};

export const sampleInvoices: Invoice[] = [
  { id: "sample-1", file_name: "figma_october.pdf", vendor: "Figma Inc.", invoice_number: "FG-2026-1042", invoice_date: "2026-11-08", amount: 84, currency: "USD", type: "Service invoice", department: "Engineering", entity: "Main company", category: "Software & subscriptions", status: "needs_review", confidence: 0.92, source: "sample", notes: "Monthly design software subscription", created_at: "2026-11-12T10:30:00Z" },
  { id: "sample-2", file_name: "office_depot_4821.pdf", vendor: "Office Depot", invoice_number: "OD-4821", invoice_date: "2026-11-06", amount: 246.5, currency: "USD", type: "Supplier invoice", department: "Operations", entity: "Main company", category: "Office supplies", status: "needs_review", confidence: 0.78, source: "sample", notes: "Desk and stationery order", created_at: "2026-11-11T14:20:00Z" },
  { id: "sample-3", file_name: "notion_november.pdf", vendor: "Notion Labs", invoice_number: "NT-1106", invoice_date: "2026-11-05", amount: 120, currency: "USD", type: "Service invoice", department: "Operations", entity: "Main company", category: "Software & subscriptions", status: "approved", confidence: 0.96, source: "sample", notes: "Team workspace plan", created_at: "2026-11-10T09:15:00Z" },
  { id: "sample-4", file_name: "delta_air_2217.pdf", vendor: "Delta Air Lines", invoice_number: "DL-2217", invoice_date: "2026-11-02", amount: 589.2, currency: "USD", type: "Receipt", department: "Sales", entity: "Main company", category: "Travel & transport", status: "approved", confidence: 0.88, source: "sample", notes: "Client visit flight", created_at: "2026-11-08T11:45:00Z" },
  { id: "sample-5", file_name: "stripe_fees_oct.pdf", vendor: "Stripe", invoice_number: "ST-9811", invoice_date: "2026-10-31", amount: 173.8, currency: "USD", type: "Service invoice", department: "Finance", entity: "Main company", category: "Professional services", status: "approved", confidence: 0.9, source: "sample", notes: "Payment processing fees", created_at: "2026-11-07T16:05:00Z" },
];
