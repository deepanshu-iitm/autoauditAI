export type Stage = "product" | "cart" | "checkout" | "payment";

export const STAGES: Stage[] = ["product", "cart", "checkout", "payment"];

export const STAGE_LABEL: Record<Stage, string> = {
  product: "Product page",
  cart: "Cart",
  checkout: "Checkout",
  payment: "Payment",
};

export type BlockedBy = "none" | "login" | "otp" | "captcha" | "out_of_stock" | "site_error" | "other";

export type Observation = {
  store_name: string;
  product_name?: string | null;
  product_url: string;
  listed_price_inr?: number | null;
  struck_price_inr?: number | null;
  charges_mentioned_on_product_page: string[];
  urgency_claims: {
    text: string;
    kind: "countdown" | "low_stock" | "viewers" | "other";
    seconds_remaining?: number | null;
    stage?: Stage;
  }[];
  cart_items: { name: string; price_inr?: number | null; added_by_shopper: boolean }[];
  preselected_options: { label: string; price_inr?: number | null; stage: Stage }[];
  decline_wording: { text: string; stage: Stage }[];
  fee_lines: { label: string; amount_inr: number; first_seen_stage: Stage }[];
  final_payable_inr?: number | null;
  furthest_stage: Stage;
  blocked_by: BlockedBy;
  notes?: string | null;
};

export type RunStep = { id: string; action: string; timestamp: string };

export type Countdown = { text: string; seconds_remaining?: number | null; stage: Stage };

export type Recheck = {
  run_id: string;
  started_at: string;
  finished_at: string;
  status: string;
  countdowns: Countdown[];
  error: unknown;
};

export type SavedRun = {
  run_id: string;
  kind: "checkout" | "custom";
  url: string;
  goal: string;
  started_at: string;
  finished_at: string;
  elapsed_seconds: number;
  status: string;
  streaming_url: string | null;
  progress: string[];
  result: unknown;
  error: unknown;
  num_of_steps?: number | null;
  steps?: RunStep[];
  recheck?: Recheck;
};

export type PatternId =
  | "false_urgency"
  | "basket_sneaking"
  | "confirm_shaming"
  | "forced_action"
  | "subscription_trap"
  | "interface_interference"
  | "bait_and_switch"
  | "drip_pricing"
  | "disguised_advertisement"
  | "nagging"
  | "trick_question"
  | "saas_billing"
  | "rogue_malware";

export type Severity = "high" | "medium" | "review";

export type Finding = {
  id: string;
  pattern: PatternId;
  severity: Severity;
  title: string;
  summary: string;
  amount_inr?: number;
  quote?: string;
  stage: Stage;
  hint?: string;
};

export type CoverageStatus = "found" | "review" | "clear" | "not_checked";

export type Coverage = { pattern: PatternId; status: CoverageStatus; note: string };

export type Gap = {
  listed: number | null;
  final: number | null;
  added: number | null;
  undisclosed: number;
  finalIsPartial: boolean;
};

export type Audit = {
  run: SavedRun;
  observation: Observation;
  findings: Finding[];
  coverage: Coverage[];
  gap: Gap;
  stagesReached: number;
};
