/**
 * Resource center content.
 *
 * This is a simple, typed content source designed to be swapped for a CMS
 * (Sanity, Contentful, a headless WordPress, or MDX files) later. To publish
 * a real article, add an entry with `status: "published"` and a `publishedAt`
 * date. Entries with `status: "draft-sample"` are clearly labeled on the site
 * as sample drafts and are excluded from search engine indexing.
 */

export type ArticleCategory =
  | "Healthcare Operations"
  | "DME"
  | "Medical Billing"
  | "Revenue Cycle"
  | "AI and Automation";

export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] };

export type Article = {
  slug: string;
  title: string;
  category: ArticleCategory;
  excerpt: string;
  readingMinutes: number;
  status: "published" | "draft-sample";
  publishedAt?: string; // ISO date, required when published
  author?: string; // OWNER ACTION: add a confirmed author name when publishing
  body: ArticleBlock[];
};

export const categories: ArticleCategory[] = [
  "Healthcare Operations",
  "DME",
  "Medical Billing",
  "Revenue Cycle",
  "AI and Automation",
];

export const articles: Article[] = [
  {
    slug: "dme-documentation-checklist",
    title: "What a Complete DME Order Usually Requires",
    category: "DME",
    excerpt:
      "A practical overview of the documentation that typically supports a durable medical equipment order, and why gaps cause delays.",
    readingMinutes: 6,
    status: "draft-sample",
    body: [
      { type: "p", text: "Durable medical equipment orders depend on documentation. Before an item can be supplied and billed, most payers expect a valid order from a qualified practitioner, records that support medical necessity, and proof that the item was delivered. Requirements vary by payer and by item, so a reliable internal checklist is one of the most useful tools a DME provider can have." },
      { type: "h2", text: "Common elements of a DME order" },
      { type: "ul", items: ["A written order containing the required elements, such as patient name, item description, order date, and practitioner signature", "Clinical documentation supporting the need for the item", "Face-to-face encounter documentation for items that require it", "Prior authorization, when the payer requires it", "Proof of delivery"] },
      { type: "h2", text: "Why gaps matter" },
      { type: "p", text: "Missing or incomplete documentation is a frequent reason DME claims are delayed or denied, and resolving it after the fact often means going back to a busy practitioner's office. Reviewing documentation at intake, before the order proceeds, is usually far more efficient than correcting it after a denial." },
      { type: "h2", text: "Building a repeatable review" },
      { type: "p", text: "Item-specific checklists, clear ownership for follow-up, and a simple way to track what is missing help keep orders moving. Always confirm current requirements with each payer, since policies change." },
    ],
  },
  {
    slug: "eligibility-verification-basics",
    title: "Eligibility Verification: The First Step to a Clean Claim",
    category: "Revenue Cycle",
    excerpt:
      "Why confirming coverage before the date of service prevents many of the most common claim problems.",
    readingMinutes: 5,
    status: "draft-sample",
    body: [
      { type: "p", text: "Eligibility verification confirms that a patient has active coverage for the services or items being provided, and clarifies what the patient may owe. It is one of the simplest steps in the revenue cycle, and one of the most important." },
      { type: "h2", text: "What to confirm" },
      { type: "ul", items: ["Coverage is active on the date of service", "The correct primary and secondary payers", "Deductible, copay, and coinsurance details", "Whether prior authorization or a referral is required", "Any plan-specific limits on the service or item"] },
      { type: "h2", text: "When to verify" },
      { type: "p", text: "Verification is most useful before the service is provided. For recurring services and supplies, coverage should be rechecked periodically, because plans and employment change." },
    ],
  },
  {
    slug: "understanding-claim-denials",
    title: "Understanding Claim Denials and How to Prevent Them",
    category: "Medical Billing",
    excerpt:
      "The most common causes of claim denials, and how organizations can address them at the source.",
    readingMinutes: 7,
    status: "draft-sample",
    body: [
      { type: "p", text: "A denied claim is more than a delayed payment. Each one takes time to investigate, correct, and resubmit, and some are never recovered. Most organizations find that a small number of causes account for a large share of their denials." },
      { type: "h2", text: "Frequent causes" },
      { type: "ul", items: ["Incorrect or incomplete patient or insurance information", "Missing or insufficient documentation", "Eligibility and coverage issues", "Missing or invalid prior authorization", "Coding errors and missing modifiers", "Late submission past the payer's filing limit"] },
      { type: "h2", text: "Working denials effectively" },
      { type: "p", text: "Categorize each denial by root cause, prioritize by value and deadline, and track results. Then share the patterns with the teams responsible for registration, documentation, and coding so the same issue is less likely to recur." },
    ],
  },
  {
    slug: "icd-cpt-hcpcs-explained",
    title: "ICD-10-CM, CPT, and HCPCS Level II, Explained",
    category: "Medical Billing",
    excerpt: "A plain-language guide to the three code sets used on most US healthcare claims.",
    readingMinutes: 5,
    status: "draft-sample",
    body: [
      { type: "p", text: "Medical codes translate clinical documentation into a standard format payers can process. Three code sets appear on most claims, and each answers a different question." },
      { type: "h2", text: "ICD-10-CM: why" },
      { type: "p", text: "ICD-10-CM codes describe diagnoses and conditions. They explain why a service or item was needed." },
      { type: "h2", text: "CPT: what was done" },
      { type: "p", text: "CPT codes describe procedures and services performed by physicians and other healthcare professionals." },
      { type: "h2", text: "HCPCS Level II: what was supplied" },
      { type: "p", text: "HCPCS Level II codes cover items and services not in CPT, including durable medical equipment, supplies, and certain drugs. DME providers work with these codes daily." },
    ],
  },
  {
    slug: "practical-ai-healthcare-admin",
    title: "Where AI Helps in Healthcare Administration, and Where It Should Not",
    category: "AI and Automation",
    excerpt:
      "A grounded look at the administrative tasks suited to automation, and why human review remains essential.",
    readingMinutes: 6,
    status: "draft-sample",
    body: [
      { type: "p", text: "AI has become a practical tool for some administrative tasks in healthcare. The most successful uses tend to be narrow, well-defined, and paired with human review." },
      { type: "h2", text: "Good candidates" },
      { type: "ul", items: ["Classifying and routing incoming documents", "Extracting information from forms and insurance cards", "Drafting routine correspondence for staff review", "Answering common, non-clinical questions", "Summarizing operational data"] },
      { type: "h2", text: "Clear boundaries" },
      { type: "p", text: "AI should not make clinical decisions or final determinations that affect patient care. Outputs should be reviewed by qualified people, and any solution that touches patient information requires careful privacy and security review before it is used." },
    ],
  },
  {
    slug: "measuring-operational-health",
    title: "Five Questions for Measuring Operational Health",
    category: "Healthcare Operations",
    excerpt: "Simple questions leaders can ask to understand where administrative work is getting stuck.",
    readingMinutes: 4,
    status: "draft-sample",
    body: [
      { type: "p", text: "Operational problems are easiest to fix when they are visible. These questions can help leaders identify where to look first." },
      { type: "ul", items: ["How long does it take for a new referral or order to be ready to proceed?", "What share of claims are rejected or denied on first submission?", "How much of our accounts receivable is older than 90 days?", "Which tasks does our team repeat most often by hand?", "Where do handoffs between teams most often break down?"] },
      { type: "p", text: "The answers rarely point to a single fix, but they usually reveal where a process review, additional support, or automation would make the greatest difference." },
    ],
  },
];

export function getArticle(slug: string) {
  return articles.find((a) => a.slug === slug);
}
