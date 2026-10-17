import { PATTERNS } from "./patterns";
import {
  STAGE_LABEL,
  STAGES,
  type Audit,
  type Coverage,
  type Finding,
  type Observation,
  type PatternId,
  type SavedRun,
  type Stage,
} from "./types";

const stageIndex = (stage: Stage) => STAGES.indexOf(stage);

export const inr = (amount: number) =>
  `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const FEE_FAMILIES: [RegExp, RegExp, string][] = [
  [/ship|deliver|fixed rate|courier/i, /ship|deliver|courier/i, "delivery charge"],
  [/cod|cash/i, /cod\b|cash on delivery/i, "cash on delivery charge"],
  [/handling/i, /handling/i, "handling charge"],
  [/platform/i, /platform/i, "platform fee"],
  [/convenience/i, /convenience/i, "convenience fee"],
  [/pack/i, /pack/i, "packaging charge"],
  [/gift/i, /gift/i, "gift wrap charge"],
  [/tax|gst/i, /tax|gst/i, "tax"],
];

const feeName = (label: string) => FEE_FAMILIES.find(([pattern]) => pattern.test(label))?.[2] ?? label.toLowerCase();

function mentionsAmount(mentions: string[], amount: number) {
  const pattern = new RegExp(`(?<![\\d.,])${Math.round(amount)}(?:\\.0{1,2})?(?![\\d,])`);
  return mentions.find((mention) => pattern.test(mention.replace(/,/g, "")));
}

function relatedMention(mentions: string[], label: string) {
  const family = FEE_FAMILIES.find(([labelPattern]) => labelPattern.test(label));
  return family ? mentions.find((mention) => family[1].test(mention)) : undefined;
}

const CONSENT = /consent|whatsapp|sms|marketing|newsletter|offers|promotion|updates|share my/i;
const SHAMING = /risk|i don'?t want|no,? i|i'?ll pay|i prefer (paying|not)|miss out|don'?t care|unprotected|lose (out|my)/i;
const URGENCY = /hurry|selling fast|ends|last chance|only \d+|left|limited|grab|gone|sale is live|almost/i;
const NOT_URGENCY = /free shipping|free delivery|away from/i;
const NOT_A_FEE = /mrp|discount|sub ?total|^total|savings|coupon|item/i;

export function normalize(result: unknown): Observation | null {
  if (!result || typeof result !== "object") return null;
  const raw = result as Partial<Observation>;
  if (!raw.store_name) return null;
  return {
    store_name: raw.store_name,
    product_name: raw.product_name ?? null,
    product_url: raw.product_url ?? "",
    listed_price_inr: raw.listed_price_inr ?? null,
    struck_price_inr: raw.struck_price_inr ?? null,
    charges_mentioned_on_product_page: raw.charges_mentioned_on_product_page ?? [],
    urgency_claims: raw.urgency_claims ?? [],
    cart_items: raw.cart_items ?? [],
    preselected_options: raw.preselected_options ?? [],
    decline_wording: raw.decline_wording ?? [],
    fee_lines: (raw.fee_lines ?? []).filter((fee) => fee.amount_inr > 0 && !NOT_A_FEE.test(fee.label)),
    final_payable_inr: raw.final_payable_inr ?? null,
    furthest_stage:
      raw.blocked_by && raw.blocked_by !== "none" && raw.furthest_stage === "payment"
        ? "checkout"
        : raw.furthest_stage ?? "product",
    blocked_by: raw.blocked_by ?? "none",
    notes: raw.notes ?? null,
  };
}

function dripPricing(o: Observation): Finding[] {
  const listed = o.listed_price_inr;
  return o.fee_lines
    .filter((fee) => fee.first_seen_stage !== "product")
    .filter((fee) => !mentionsAmount(o.charges_mentioned_on_product_page, fee.amount_inr))
    .map((fee, index) => {
      const related = relatedMention(o.charges_mentioned_on_product_page, fee.label);
      const where = STAGE_LABEL[fee.first_seen_stage].toLowerCase();
      const shown = listed != null ? ` The product page showed ${inr(listed)} and did not state this amount.` : "";
      return {
        id: `drip-${index}`,
        pattern: "drip_pricing" as const,
        severity: "high" as const,
        title: `${inr(fee.amount_inr)} ${feeName(fee.label)} first appeared in the ${where}`,
        summary: `"${fee.label}" was added after the product was chosen.${shown}${
          related ? " The product page only said the line quoted below." : ""
        }`,
        amount_inr: fee.amount_inr,
        quote: related,
        stage: fee.first_seen_stage,
      };
    });
}

function basketSneaking(o: Observation): Finding[] {
  const items: Finding[] = o.cart_items
    .filter((item) => !item.added_by_shopper && (item.price_inr ?? 0) > 0)
    .map((item, index) => ({
      id: `sneak-item-${index}`,
      pattern: "basket_sneaking",
      severity: "high",
      title: `${inr(item.price_inr as number)} item added to the cart without asking`,
      summary: `"${item.name}" was in the cart, but the shopper only added the product.`,
      amount_inr: item.price_inr as number,
      quote: item.name,
      stage: "cart",
      hint: "cart|bag",
    }));
  const options: Finding[] = o.preselected_options
    .filter((option) => (option.price_inr ?? 0) > 0)
    .map((option, index) => ({
      id: `sneak-option-${index}`,
      pattern: "basket_sneaking",
      severity: "high",
      title: `${inr(option.price_inr as number)} option was already selected`,
      summary: `"${option.label}" was pre-selected in the ${STAGE_LABEL[option.stage].toLowerCase()} and adds to the price.`,
      amount_inr: option.price_inr as number,
      quote: option.label,
      stage: option.stage,
    }));
  return [...items, ...options];
}

function preTickedConsent(o: Observation): Finding[] {
  return o.preselected_options
    .filter((option) => !(option.price_inr ?? 0) && CONSENT.test(option.label))
    .map((option, index) => ({
      id: `consent-${index}`,
      pattern: "interface_interference",
      severity: "review",
      title: "Consent box was already ticked",
      summary: `A consent option was ticked before the shopper chose it, in the ${STAGE_LABEL[option.stage].toLowerCase()}.`,
      quote: option.label,
      stage: option.stage,
    }));
}

function confirmShaming(o: Observation): Finding[] {
  return o.decline_wording
    .filter((wording) => SHAMING.test(wording.text))
    .map((wording, index) => ({
      id: `shame-${index}`,
      pattern: "confirm_shaming",
      severity: "review",
      title: "Opt-out wording may guilt the shopper",
      summary: `The button or link to decline uses wording that a reviewer should check.`,
      quote: wording.text,
      stage: wording.stage,
    }));
}

export type CountdownCheck = {
  text: string;
  stage: Stage;
  first: number;
  second: number | null;
  expected: number;
  restarted: boolean;
};

export function compareCountdowns(run: SavedRun, o: Observation): CountdownCheck[] {
  if (!run.recheck) return [];
  const elapsed = (Date.parse(run.recheck.started_at) - Date.parse(run.started_at)) / 1000;
  return o.urgency_claims
    .filter((claim) => claim.kind === "countdown" && claim.seconds_remaining != null)
    .map((claim) => {
      const stage = claim.stage ?? "product";
      const first = claim.seconds_remaining as number;
      const match =
        run.recheck!.countdowns.find((c) => c.stage === stage && c.seconds_remaining != null) ??
        run.recheck!.countdowns.find((c) => c.seconds_remaining != null);
      const second = match?.seconds_remaining ?? null;
      const expected = Math.round(first - elapsed);
      const restarted = second != null && second > Math.max(expected, 0) + Math.max(120, first * 0.1);
      return { text: claim.text, stage, first, second, expected, restarted };
    });
}

function falseUrgency(run: SavedRun, o: Observation): Finding[] {
  const checks = compareCountdowns(run, o);
  const findings: Finding[] = checks
    .filter((check) => check.restarted)
    .map((check, index) => ({
      id: `urgency-restart-${index}`,
      pattern: "false_urgency",
      severity: "medium",
      title: "Countdown restarted for a new visitor",
      summary: `First visit: ${formatSeconds(check.first)} left. A fresh session later showed ${formatSeconds(
        check.second as number,
      )} left, when it should have shown ${check.expected > 0 ? formatSeconds(check.expected) : "the offer as ended"}.`,
      quote: check.text,
      stage: check.stage,
      hint: "timer|countdown",
    }));

  const rechecked = new Set(checks.map((check) => check.text));
  o.urgency_claims
    .filter((claim) => !rechecked.has(claim.text))
    .filter((claim) => claim.kind !== "other" || (URGENCY.test(claim.text) && !NOT_URGENCY.test(claim.text)))
    .forEach((claim, index) =>
      findings.push({
        id: `urgency-${index}`,
        pattern: "false_urgency",
        severity: "review",
        title: claim.kind === "countdown" ? "Countdown timer on the page" : "Scarcity or deadline claim",
        summary:
          claim.kind === "countdown"
            ? "A single visit cannot show whether this timer is real. Recheck it in a fresh session."
            : "The claim cannot be verified from one visit. A reviewer should check it.",
        quote: claim.text,
        stage: claim.stage ?? "product",
        hint: "timer|countdown|urgency",
      }),
    );
  return findings;
}

function forcedAction(o: Observation): Finding[] {
  if (o.blocked_by !== "otp" && o.blocked_by !== "login") return [];
  const wall = o.blocked_by === "otp" ? "a phone number and OTP" : "a login";
  return [
    {
      id: "forced-0",
      pattern: "forced_action",
      severity: "review",
      title: `Full order summary needs ${wall}`,
      summary: `Checkout asked for ${wall} before the address step. Delivery or COD charges added after that point could not be seen by a guest.`,
      stage: "checkout",
      hint: "otp|phone|login|checkout",
    },
  ];
}

export function formatSeconds(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${rest}s`;
  return `${rest}s`;
}

function coverage(run: SavedRun, o: Observation, findings: Finding[]): Coverage[] {
  const reachedSummary = o.blocked_by === "none" && stageIndex(o.furthest_stage) >= stageIndex("checkout");
  const reachedCart = stageIndex(o.furthest_stage) >= stageIndex("cart");
  const hasCountdown = o.urgency_claims.some((claim) => claim.kind === "countdown");

  const prerequisite: Partial<Record<PatternId, [boolean, string]>> = {
    drip_pricing: [reachedSummary, "Checkout stopped before the full order summary."],
    basket_sneaking: [reachedCart, "The agent did not reach the cart."],
    confirm_shaming: [reachedCart, "The agent did not reach the cart."],
    interface_interference: [reachedCart, "The agent did not reach the cart."],
  };

  return PATTERNS.map((pattern) => {
    const own = findings.filter((finding) => finding.pattern === pattern.id);
    if (own.some((finding) => finding.severity !== "review")) {
      return { pattern: pattern.id, status: "found", note: `${own.length} observed` };
    }
    if (own.length) return { pattern: pattern.id, status: "review", note: `${own.length} for review` };
    if (!pattern.checked) {
      return { pattern: pattern.id, status: "not_checked", note: pattern.notCheckedReason ?? "" };
    }
    const [ok, reason] = prerequisite[pattern.id] ?? [true, ""];
    if (!ok) return { pattern: pattern.id, status: "not_checked", note: reason };
    if (pattern.id === "false_urgency" && hasCountdown && run.recheck) {
      return { pattern: pattern.id, status: "clear", note: "Countdown was consistent in a fresh session." };
    }
    return { pattern: pattern.id, status: "clear", note: "Not observed on this journey." };
  });
}

export function buildAudit(run: SavedRun): Audit | null {
  const o = normalize(run.result);
  if (!o) return null;

  const findings = [
    ...dripPricing(o),
    ...basketSneaking(o),
    ...falseUrgency(run, o),
    ...forcedAction(o),
    ...confirmShaming(o),
    ...preTickedConsent(o),
  ];
  const order = { high: 0, medium: 1, review: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  const listed = o.listed_price_inr ?? null;
  const final = o.final_payable_inr ?? null;
  const undisclosed = findings
    .filter((finding) => finding.severity === "high")
    .reduce((sum, finding) => sum + (finding.amount_inr ?? 0), 0);

  return {
    run,
    observation: o,
    findings,
    coverage: coverage(run, o, findings),
    gap: {
      listed,
      final,
      added: listed != null && final != null ? Math.round((final - listed) * 100) / 100 : null,
      undisclosed,
      finalIsPartial: o.blocked_by !== "none",
    },
    stagesReached: stageIndex(o.furthest_stage) + 1,
  };
}
