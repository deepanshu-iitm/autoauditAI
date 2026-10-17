export const AUDIT_PINCODE = "560037";

const STAGES = ["product", "cart", "checkout", "payment"];

export function checkoutGoal(pincode: string = AUDIT_PINCODE) {
  return [
    "You are a shopper in Bangalore recording exactly what this store shows a customer. Report facts only, never opinions.",
    "Never pay, never enter card or UPI details, never create an account, and never submit a phone number or email to a screen that sends an OTP or a login code.",
    "",
    "1. On this product page, before adding anything to the cart, record the product name, the price shown, any struck-through price, and any urgency text such as a countdown timer with its remaining time, 'only N left', or 'N people viewing'. In charges_mentioned_on_product_page, copy only the fee, charge, or delivery-condition text that is visible on the product page itself (delivery, shipping, handling, COD, platform, convenience, free-delivery thresholds). Never copy text from the cart, a cart drawer, or checkout into this field.",
    `2. If the page asks for a pincode or delivery location, enter ${pincode}. If a size or variant must be chosen, pick the first one in stock. Add exactly one unit to the cart.`,
    "3. Open the cart. List every line item and whether the shopper added it. List every option that is already selected or ticked without the shopper choosing it and that adds a product, a charge, or a consent: insurance, a donation, a membership, a tip, gift wrap, a protection plan, or marketing, SMS, or WhatsApp consent. Do not list badges, labels, or payment-method icons. Copy the exact wording of any button or link used to decline an add-on or offer.",
    `4. Continue to checkout as a guest. If an ordinary address form appears, fill it with name "Audit Shopper", email "audit.shopper@example.com", phone "9000000000", address "OJone, Marathahalli, Bengaluru", pincode ${pincode}, and continue. If checkout instead opens a phone, OTP, or login step, do not submit anything: record the order summary visible on that screen and stop. Also stop at the first screen that asks for payment, or at a captcha.`,
    "5. List every charge added on top of the product price in the order summary (delivery, shipping, handling, COD, platform, convenience, packaging, gift wrap, tax added separately) with its amount in rupees and the first step where it appeared. Do not list MRP, discounts, the subtotal, or charges shown as free or ₹0. Record the final payable amount.",
    "",
    "Record urgency text from every step, with the step where you saw it. If something is not on the page, leave it empty or null. Do not guess or calculate amounts that are not shown.",
  ].join("\n");
}

const stageEnum = { type: "string", enum: STAGES };

export function recheckGoal() {
  return [
    "You are a first-time visitor. Report facts only. Never check out, never pay, never enter any personal details.",
    "1. On this product page, record every countdown timer with its exact text and its remaining time converted to seconds.",
    "2. Add exactly one unit to the cart and open the cart or cart drawer. Record every countdown timer there in the same way.",
    "Stop after reading the cart. If there is no countdown, return an empty list.",
  ].join("\n");
}

export const recheckSchema = {
  type: "object",
  properties: {
    countdowns: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          seconds_remaining: { type: "integer", nullable: true },
          stage: { type: "string", enum: ["product", "cart"] },
        },
        required: ["text", "stage"],
      },
    },
  },
  required: ["countdowns"],
};

export const observationSchema = {
  type: "object",
  properties: {
    store_name: { type: "string" },
    product_name: { type: "string", nullable: true },
    product_url: { type: "string" },
    listed_price_inr: { type: "number", nullable: true },
    struck_price_inr: { type: "number", nullable: true },
    charges_mentioned_on_product_page: { type: "array", items: { type: "string" } },
    urgency_claims: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          kind: { type: "string", enum: ["countdown", "low_stock", "viewers", "other"] },
          seconds_remaining: { type: "integer", nullable: true },
          stage: stageEnum,
        },
        required: ["text", "kind", "stage"],
      },
    },
    cart_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          price_inr: { type: "number", nullable: true },
          added_by_shopper: { type: "boolean" },
        },
        required: ["name", "added_by_shopper"],
      },
    },
    preselected_options: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          price_inr: { type: "number", nullable: true },
          stage: stageEnum,
        },
        required: ["label", "stage"],
      },
    },
    decline_wording: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          stage: stageEnum,
        },
        required: ["text", "stage"],
      },
    },
    fee_lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          amount_inr: { type: "number" },
          first_seen_stage: stageEnum,
        },
        required: ["label", "amount_inr", "first_seen_stage"],
      },
    },
    final_payable_inr: { type: "number", nullable: true },
    furthest_stage: stageEnum,
    blocked_by: {
      type: "string",
      enum: ["none", "login", "otp", "captcha", "out_of_stock", "site_error", "other"],
    },
    notes: { type: "string", nullable: true },
  },
  required: [
    "store_name",
    "product_url",
    "charges_mentioned_on_product_page",
    "urgency_claims",
    "cart_items",
    "preselected_options",
    "decline_wording",
    "fee_lines",
    "furthest_stage",
    "blocked_by",
  ],
};
