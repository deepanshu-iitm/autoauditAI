import type { PatternId } from "./types";

export type Pattern = {
  id: PatternId;
  name: string;
  definition: string;
  checked: boolean;
  notCheckedReason?: string;
};

export const PATTERNS: Pattern[] = [
  {
    id: "drip_pricing",
    name: "Drip pricing",
    definition: "Price elements not revealed upfront, or revealed only at checkout.",
    checked: true,
  },
  {
    id: "basket_sneaking",
    name: "Basket sneaking",
    definition: "Items, services, or donations added to the cart without the shopper's consent.",
    checked: true,
  },
  {
    id: "false_urgency",
    name: "False urgency",
    definition: "Falsely stating or implying scarcity or a deadline to rush a purchase.",
    checked: true,
  },
  {
    id: "confirm_shaming",
    name: "Confirm shaming",
    definition: "Using guilt, fear, or ridicule to push the shopper away from declining.",
    checked: true,
  },
  {
    id: "forced_action",
    name: "Forced action",
    definition: "Forcing the shopper to share details or sign up to continue.",
    checked: true,
  },
  {
    id: "interface_interference",
    name: "Interface interference",
    definition: "Design that hides or pre-selects choices against the shopper. Checked for pre-ticked consent only.",
    checked: true,
  },
  {
    id: "subscription_trap",
    name: "Subscription trap",
    definition: "Making a subscription hard to cancel or hiding the cancel option.",
    checked: false,
    notCheckedReason: "Needs an active subscription.",
  },
  {
    id: "bait_and_switch",
    name: "Bait and switch",
    definition: "Advertising one outcome and delivering another.",
    checked: false,
    notCheckedReason: "Needs an order to be placed.",
  },
  {
    id: "disguised_advertisement",
    name: "Disguised advertisement",
    definition: "Ads made to look like other content, such as reviews or news.",
    checked: false,
    notCheckedReason: "Outside the checkout journey.",
  },
  {
    id: "nagging",
    name: "Nagging",
    definition: "Repeated requests or interruptions that the shopper did not ask for.",
    checked: false,
    notCheckedReason: "Needs repeated visits over time.",
  },
  {
    id: "trick_question",
    name: "Trick question",
    definition: "Confusing wording that leads the shopper to the wrong choice.",
    checked: false,
    notCheckedReason: "Needs human reading of every form.",
  },
  {
    id: "saas_billing",
    name: "SaaS billing",
    definition: "Recurring charges collected silently in a subscription.",
    checked: false,
    notCheckedReason: "Needs an active subscription.",
  },
  {
    id: "rogue_malware",
    name: "Rogue malware",
    definition: "Scaring users into paying for fake security software.",
    checked: false,
    notCheckedReason: "Outside the checkout journey.",
  },
];

export const PATTERN_BY_ID = Object.fromEntries(PATTERNS.map((p) => [p.id, p])) as Record<PatternId, Pattern>;
