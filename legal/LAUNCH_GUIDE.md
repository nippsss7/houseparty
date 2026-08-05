# HouseParty — Legal & Liability Launch Guide

Last updated: August 5, 2026
Not tracked for GitHub Pages publishing (this repo only publishes `/docs`) — this is a private reference for the founder, not a public page.

**This is not legal advice.** It's a plain-English map of what needs doing and why, written so you can walk into a lawyer's office (or a fixed-fee legal service) already knowing what to ask for, instead of paying them to explain the basics. Treat every dollar figure as a rough planning estimate, not a quote.

Target markets at launch: **United States, Canada, India** (worldwide later).

---

## How to use this document

1. Read Part 1 once, so the vocabulary in the rest of the doc makes sense.
2. In Part 2, find **your own** country — the one where *you personally* live — and follow only that track. You form one home business entity where you live; you don't need to incorporate separately in every country your users are in.
3. Parts 3–6 apply regardless of which country you picked in Part 2, because your users will be in all three markets.
4. Part 7 is the tl;dr — a single prioritized checklist if you want to skip straight to "what do I actually do, in what order."

---

## Part 1 — The concepts, in plain English

**Business entity (LLC / Pvt Ltd / Corp).** Right now, HouseParty is legally *you* — there is no separation between your personal bank account and "the business." If someone sues over something that happened at an event, or if ID documents leak and someone sues over the breach, they're suing *you*, personally, and your personal savings/house/car are on the table. Forming a company creates a legal wall: the company gets sued, the company's assets are at risk, and — as long as you keep company money and personal money separate (see "piercing the corporate veil" in the glossary) — your personal assets are not. This is the single highest-leverage thing on this whole list.

**Liability, concretely, for this app.** Three flavors matter here:
- *Someone gets hurt at an event.* A guest gets injured at a house party they found through the app. Could they argue HouseParty is responsible for introducing them? Courts have generally been skeptical of this for pure "we introduced two adults" platforms, but it's an active and evolving area (see Part 5).
- *A data breach.* You store government ID photos in a private Supabase bucket. If that bucket were ever misconfigured or breached, ID photos are about the most damaging category of data to leak (identity theft risk), and several places have real financial penalties for mishandling it.
- *A bad actor uses the app to harm someone.* A host or guest with bad intentions uses the verification/booking flow to target someone. Your report/block system and ID verification measurably reduce this risk (and show you took it seriously), but can't eliminate it.

**Terms of Service vs. Privacy Policy — different jobs.** The Privacy Policy tells users what data you collect and why (a *transparency* document, and in most places, a legal requirement). The Terms of Service is a *contract* — it's where you put the assumption-of-risk language, the "we're a platform, not an event organizer" disclaimer, and limitation-of-liability clauses. Both already exist as drafts at `docs/index.html` and `docs/terms.html` — see Part 4 for their current status.

**Governing law / jurisdiction clause.** A line in your Terms of Service that says "if there's a legal dispute, it's handled under the laws of [X], in the courts of [Y]." Without it, a dispute could theoretically be fought in whatever country/state the *user* is in, which is expensive and unpredictable for you. This should name wherever you incorporate.

**Insurance, in categories.** "Business insurance" isn't one thing — see Part 3 for the three specific kinds that matter here.

---

## Part 2 — Form your business entity (do this first)

Do this **before** any real strangers (not test accounts, not friends helping you test) start using the app for real. It's the one piece of this whole document that's genuinely urgent and time-sensitive relative to your launch — everything else can be layered in over following weeks.

Skip to your own section below.

### Track A — If you live in the United States

**Entity type: LLC.** For a solo founder not currently raising venture money, a Limited Liability Company is the standard choice — simpler paperwork than a corporation, and the liability shield is what you actually need right now. (A C-Corp only matters if/when you raise institutional investment — that's a "later" problem, not a "now" one.)

**Which state?** File in the state you actually live in. You'll see advice online to incorporate in Delaware or Wyoming "for tax benefits" — for a bootstrapped solo app with no investors, this usually just adds cost (you'd pay to register in Delaware *and* "foreign-qualify" in your home state anyway, since that's where you're actually operating). Ignore that advice unless a lawyer tells you otherwise for your specific situation.

**Steps:**
1. **Pick a name** and check availability on your state's Secretary of State business-name-search website. It doesn't have to be "HouseParty LLC" — plenty of companies operate a product under a different name than the legal entity (see the trademark note in Part 5 before you commit to "HouseParty" long-term).
2. **File Articles of Organization** with your state's Secretary of State. Usually a short online form + filing fee ($50–$500 depending on state — California and Massachusetts are on the expensive end, most states are $50–$150).
3. **Get an EIN (Employer Identification Number)** from the IRS. This is free, takes about 15 minutes online (irs.gov, search "apply for an EIN"), and is effectively your company's Social Security Number — you'll need it for a bank account, taxes, and payment processors (Stripe, Apple, etc.) later.
4. **Write an Operating Agreement.** Even as a single-member LLC, have one — it's the document that spells out "this LLC is a separate thing from me," which matters if the liability shield is ever tested. Templates from a formation service are fine for a solo-member LLC; you don't need a lawyer to draft this specific document from scratch.
5. **Open a business bank account** using your EIN and Articles of Organization. Never pay yourself or business expenses out of your personal account from this point on — mixing funds is the #1 way solo founders accidentally destroy their own liability shield.
6. **Registered agent:** most states require one (a person/service with a physical address in-state who can receive legal documents on the company's behalf). Formation services (see below) usually include this for the first year.
7. **Ongoing:** most states require an annual report and/or franchise tax filing to keep the LLC active. Mark this on a calendar — letting it lapse quietly reopens your personal liability.

**Where to actually do this:** a formation service (Northwest Registered Agent, Firstbase, or similar) will do steps 1–2 and 6 for a flat fee (typically $100–$300 plus state filing fees) and is the easiest path for a solo founder. You do step 3 (EIN) yourself directly with the IRS — it's free and you don't need to pay anyone for it.

**Rough total cost:** $150–$800 to form, then $50–$300/year in state renewal fees, varies significantly by state.

---

### Track B — If you live in Canada

**Entity type: Corporation** (Canada doesn't really use the "LLC" concept the way the US does — the equivalent liability-shielded solo entity is a standard corporation). "Business Corporation" federally, or your province's equivalent.

**Federal vs. provincial?** Federal incorporation (via Corporations Canada) lets you operate under the same name in every province and is a reasonable default for an app with no fixed physical location. Provincial incorporation (e.g., Ontario's OBCA, BC's BCA) is usually cheaper and simpler if you're confident you'll only ever operate out of one province. For a solo app founder, federal is the safer, more future-proof default.

**Steps:**
1. **Name search (NUANS report).** A NUANS report checks your proposed name against existing Canadian business names/trademarks. Required for a named corporation (you can also incorporate as a numbered company, e.g., "1234567 Canada Inc.," and operate the app under "HouseParty" as a registered trade name instead — often simpler).
2. **File Articles of Incorporation** with Corporations Canada (federal) or your provincial registry. Federal filing fee is roughly $200 online.
3. **Get a Business Number (BN)** from the Canada Revenue Agency — happens automatically as part of federal incorporation, or you request one separately for provincial incorporation.
4. **Register for GST/HST** with CRA once you expect to cross CAD $30,000 in revenue (not required before that, but simple to set up early if you'd rather not track the threshold).
5. **Corporate bank account**, using your BN and incorporation documents. Same rule as the US track: never mix personal and business funds.
6. **Organizational resolutions / minute book.** Similar purpose to a US Operating Agreement — the paper trail showing the corporation operates as a distinct entity. A formation service will typically generate the initial set for you.
7. **Ongoing:** an annual return to Corporations Canada (separate from tax filing) to keep the corporation active.

**Where to do this:** Ownr, Rocket Lawyer Canada, or a local incorporation service handle the filing paperwork for a flat fee. A local accountant is worth having on retainer once you're incorporated, for the annual corporate tax return (a Canadian corporation's tax filing is genuinely more involved than a US single-member LLC's, and this is worth paying a professional for rather than DIY-ing).

**Rough total cost:** CAD $200–$600 to incorporate, then annual accounting fees (CAD $500–$1500/year is a reasonable range for a simple small-business corporate return).

---

### Track C — If you live in India

**Entity type: One Person Company (OPC) or Private Limited Company.** India specifically created the OPC structure for solo founders — it gives you the liability shield of a Private Limited Company without needing a second shareholder/director. Worth strongly considering if it's genuinely just you. If you expect to bring on a co-founder or raise investment relatively soon, going straight to a Private Limited Company (which most investors prefer) may save you a later conversion step. An LLP (Limited Liability Partnership) is a third option but requires at least two partners, so it doesn't fit a true solo founder.

**Steps (via the MCA's SPICe+ integrated form — this single form now bundles most of what used to be separate applications):**
1. **Digital Signature Certificate (DSC)** for yourself as the proposed director — needed to sign the electronic filing. Obtained through a government-licensed certifying authority, typically same-day to a few days.
2. **Name reservation** via the SPICe+ Part A form on the MCA (Ministry of Corporate Affairs) portal — propose 1–2 names, checked against the existing company register and trademark database.
3. **File SPICe+ Part B**, which bundles: incorporation application, PAN (Permanent Account Number) and TAN (Tax Deduction Account Number) application, and (for OPC/Pvt Ltd) EPFO/ESIC registration.
4. **Certificate of Incorporation** issued by the Registrar of Companies (RoC) once approved — this is your official "the company legally exists" document, PAN/TAN arrive alongside it.
5. **Open a current account** (India's business-banking equivalent of a checking account) using the Certificate of Incorporation and PAN.
6. **GST registration** — required once turnover crosses the threshold (₹20 lakh for services in most states, ₹10 lakh in some special-category states), but many founders register early since it's needed to invoice most business customers/vendors anyway.
7. **Ongoing:** annual RoC filings (financial statements, annual return) and, for an OPC specifically, mandatory conversion to a Private Limited Company if turnover exceeds ₹2 crore in a financial year — worth knowing about early even if it's far off.

**Where to do this:** company-secretary (CS) or chartered-accountant (CA) firms handle the SPICe+ filing end-to-end for a flat fee, and this is genuinely worth paying for in India specifically — the compliance calendar (RoC filings, GST returns, TDS) is more involved than the US/Canada tracks, and a CA on retainer will keep you from missing deadlines that carry real penalties.

**Rough total cost:** ₹8,000–₹20,000 for incorporation (professional fees + government fees combined, OPC/Pvt Ltd), then ₹15,000–₹40,000/year for a CA handling ongoing compliance.

---

## Part 3 — Insurance

Three distinct kinds of policy are relevant here — "business insurance" as a single generic product doesn't really exist.

**1. General Liability (GL) insurance.** Covers third-party bodily injury or property damage claims connected to your business's operations. This is the one that's relevant if someone tries to argue an event "facilitated by HouseParty" caused them harm. Ask any insurer explicitly whether their GL policy responds to claims arising from *events the platform connected people to*, even though HouseParty doesn't host or organize the events itself — this is exactly the kind of nuance a generic quote won't surface unless you ask.

**2. Technology Errors & Omissions (Tech E&O) / Professional Liability.** Covers claims that your *software* failed in some way that caused a customer financial or other harm — e.g., a bug in the booking-capacity logic that let an event overbook, or the verification system approving someone it shouldn't have.

**3. Cyber Liability insurance.** Specifically covers data-breach costs: legal fees, mandatory user notification costs, credit-monitoring services for affected users, regulatory fines. Given you store government ID photos, this is not optional-feeling once you have real users — a breach-response process without insurance behind it can be genuinely business-ending for a solo founder.

**Where to look:** search for "startup insurance" or "technology insurance" — several insurers specifically package GL + Tech E&O + Cyber together for small software companies (bundled policies are usually cheaper than buying three separately). Get quotes from at least two providers; pricing varies a lot based on how much they perceive the "in-person meetup" angle as risk, so it's worth talking to more than one.

**Rough cost:** for a pre-revenue or early-revenue solo app, a few hundred to a couple thousand USD/year is a reasonable range to budget for a bundled small-business tech policy — get real quotes rather than trusting this number, since "in-person meetup facilitation" is a less standard risk profile than typical SaaS and could price differently.

---

## Part 4 — Get your legal documents properly reviewed

**What already exists.** `docs/index.html` (Privacy Policy) and `docs/terms.html` (Terms of Service) are live, hosted at your GitHub Pages URL, and linked from both the sign-up screen and Profile settings in the app. They were written to accurately match what the app actually collects and does — verified directly against the database schema and code rather than guessed — and already include an assumption-of-risk section and a limitation-of-liability clause. **They have not been reviewed by an attorney.** They're a strong, honest starting draft, not a substitute for review.

**What a lawyer's review specifically adds** that I couldn't:
- An **arbitration clause / class-action waiver** — very commonly added by consumer apps specifically to route disputes to individual arbitration instead of court, which meaningfully reduces both the cost and unpredictability of the kind of lawsuit a platform like this could face. Whether this is enforceable, and how to word it, depends on jurisdiction-specific case law.
- **State/country-specific mandatory disclosures** — e.g., California's specific privacy-rights notice requirements, India's DPDP Act consent-language requirements (see Part 5), Quebec's Law 25 provisions if you have Quebec users specifically.
- Making sure the **governing-law clause** actually matches wherever you incorporate (Part 2), and is enforceable there.
- A sanity check on the **alcohol/event liability language** specifically for house-party-style gatherings (see Part 5) — this is a narrow, unusual enough use case that generic ToS templates (and generic AI-written ones) don't specifically address it well.

**How to find the right lawyer, affordably.** Look for a "startup lawyer" or "technology/internet law attorney" — not a general-practice lawyer, who likely won't have this specific pattern-matched from other clients. Two paths:
- **Fixed-fee document review services** (e.g., on-demand legal marketplaces like UpCounsel, LawTrades, or a local startup-law firm that explicitly offers flat-fee ToS/Privacy Policy review) — you're paying to review and adjust an *existing* draft, not draft from scratch, which is meaningfully cheaper.
- **A single paid consultation** with a startup attorney (many offer a first consultation at a flat rate, e.g., $150–$400) specifically to walk through Part 5's risk areas below and get a plain answer on which ones actually need document changes for your situation.

**Rough cost:** a fixed-fee review of an existing ToS + Privacy Policy draft is commonly in the few-hundred-to-~$1,500 range (details vary a lot by firm and how much back-and-forth you want) — dramatically cheaper than paying a lawyer to draft these from a blank page, and cheaper than an ongoing retainer, which you don't need yet.

---

## Part 5 — Risk areas specific to *this* app

The generic startup-legal checklist won't surface these — they come directly from what HouseParty actually does.

**In-person meetups between strangers.** This is the core thing that makes HouseParty's risk profile different from a typical app. Precedent from similar platforms (Meetup, Bumble/dating apps, Eventbrite) generally shows courts reluctant to hold a pure "introduction" platform liable for what happens between two adults who met through it — *provided* the platform's own terms are clear that it doesn't vet, supervise, or guarantee anything about events or attendees beyond its own verification step. The ToS draft already includes this language; a lawyer confirming it's airtight for your specific target markets is the Part 4 review.

**Alcohol and "social host" liability.** "House party" strongly implies alcohol will often be present, even though HouseParty itself never serves or sells anything. Liability for alcohol-related harm at a private gathering ("social host liability") varies enormously:
- *US:* varies by state — some states have strong dram-shop/social-host statutes exposing hosts (not platforms) to liability if they serve a minor or visibly intoxicated guest who then causes harm; others have very limited social-host liability.
- *Canada:* similarly province-dependent, generally trending toward more host liability in recent case law (particularly around serving minors).
- *India:* a different legal framework entirely, with liquor licensing law handled at the state level and less developed case law specifically around private social-host liability.

The exposure here lands mostly on individual **hosts**, not on HouseParty as a platform — but it's exactly the kind of specific, unusual risk worth naming explicitly to whichever lawyer reviews your ToS, so the "hosts are responsible for complying with their own local laws around their events" language is solid.

**ID / biometric data handling, by market.** The app currently uses **manual human review** of ID photos, not automated facial recognition or biometric matching — this materially reduces exposure under laws specifically about biometric identifiers, and is worth deliberately staying true to unless you get specific legal advice to add automated verification later.
- *US:* a handful of states (Illinois' BIPA is the strictest and most litigated, also Texas and Washington) have specific biometric-privacy statutes with real penalties — these are typically triggered by things like facial-geometry scanning or fingerprinting, less so by "a human looks at a photo," but worth a specific lawyer confirmation if you ever add automated ID verification.
- *Canada:* Quebec's Law 25 has explicit requirements (including a registration duty with the provincial privacy regulator, the CAI) specifically for databases of biometric characteristics — again, most relevant if/when automated biometric matching is added, but worth knowing about now.
- *India:* the DPDP Act 2023 is India's first comprehensive data-protection law and treats ID-type documents as sensitive personal data requiring clear consent and defined retention limits — your account-deletion flow (which already deletes ID images) is a meaningful compliance asset here; a lawyer review of the exact consent language shown during ID upload is worth doing specifically for Indian users.

**Payments (if/when you add them).** HouseParty currently does **not** process any payments — hosts and guests handle any money exchange entirely outside the app. This is deliberately the simplest possible position to be in. The moment you add in-app payments, you open up a substantial new compliance area (money-transmitter licensing requirements vary by US state and can be genuinely onerous; Canada and India have their own payment-services regulatory regimes). **Recommendation: use a payments platform that absorbs most of this regulatory burden for you** (Stripe Connect is the standard choice for marketplace-style apps) rather than building custom payment handling, and treat "add payments" as its own dedicated legal-review trigger, not something to bolt on quietly.

**The age-verification gap.** Signup currently self-attests date of birth (client-side check requiring 18+) *before* ID verification completes. A user could lie about their birthdate at signup; your manual ID review is the actual backstop that catches this before they can host or book (unverified users can browse but not transact — this gate is already in place). Worth explicitly confirming with a lawyer that "self-attestation at signup + mandatory human ID review before any transaction capability" is a defensible sequence, particularly for the US/Canada/India age-of-majority contexts specifically.

**Trademark risk on the name "HouseParty."** This is the one item on this whole list a legal novice would have no way to know to check, so it's worth stating plainly: **"Houseparty" was the name of a real, well-known video-chat app** (made by Life on Air, later acquired by Epic Games, discontinued in 2021). Even discontinued, the trademark registration may still be active, and launching a new consumer social app under an identical name is a genuine, checkable risk — not a hypothetical one. Before investing further in the brand (App Store listing, marketing, business cards):
1. Search the **USPTO's TESS database** (US), **CIPO's trademark database** (Canada), and **India's IP India trademark search** for "Houseparty" / "House Party" in relevant classes (software/apps, social networking).
2. If it's live and covers a similar category, talk to a trademark lawyer about the actual risk level and whether a naming adjustment is worth doing now (cheap) versus after launch (expensive — rebrands after real users exist are painful).

This is worth doing in the next couple of weeks, specifically *before* the App Store listing goes live, not after.

---

## Part 6 — Ongoing compliance (don't let these lapse)

- **Renew your business registration annually** (Part 2's "ongoing" step for whichever track applies) — a lapsed entity quietly stops protecting you.
- **Keep the Privacy Policy's "Last updated" date current** whenever data practices actually change (new data collected, new third-party service added, etc.) — the doc is already structured this way; just remember to touch it.
- **Have a breach-response plan written down *before* you need it.** Most jurisdictions have mandatory data-breach notification laws with real deadlines (some as short as 72 hours from discovery) — figuring out the process for the first time *during* an actual breach is the worst possible time. A one-page "if this happens, do these things in this order, call this lawyer" document, written once with legal help, is cheap insurance against a panicked scramble later.
- **Re-run the trademark search** (Part 5) periodically until you've either cleared it or adjusted the name — trademark status can change.

---

## Part 7 — Prioritized checklist

**Before any real strangers use the app (not test accounts):**
- [ ] Form your business entity (Part 2 — pick your track)
- [ ] Open a business bank account, stop mixing personal/business funds
- [ ] Run the "HouseParty" trademark search (Part 5) — cheap and fast, do it early
- [ ] Get an EIN/BN/PAN (whichever applies) — needed for the bank account anyway

**Before public launch (App Store goes live to strangers):**
- [ ] Get the Privacy Policy + Terms of Service reviewed by a startup/tech lawyer (Part 4)
- [ ] Add an arbitration clause if your lawyer recommends it for your markets
- [ ] Get quotes for General Liability + Tech E&O + Cyber insurance, bind at least basic coverage (Part 3)
- [ ] Write the one-page breach-response plan (Part 6)
- [ ] Confirm the alcohol/social-host liability language with your lawyer (Part 5)

**As you grow (revisit, not urgent now):**
- [ ] If you add in-app payments: full legal review before building, use Stripe Connect or similar (Part 5)
- [ ] If you add automated/biometric ID verification (vs. current manual review): specific legal review of BIPA/Law 25/DPDP implications (Part 5)
- [ ] Annual: renew business registration, review insurance coverage as user count grows, re-check trademark status

---

## Part 8 — Rough cost summary

| Item | US | Canada | India |
|---|---|---|---|
| Entity formation (one-time) | $150–$800 | CAD $200–$600 | ₹8,000–₹20,000 |
| Entity — annual upkeep | $50–$300/yr | CAD $500–$1,500/yr (incl. accounting) | ₹15,000–₹40,000/yr (incl. CA) |
| Legal doc review (one-time) | $300–$1,500 | similar | similar |
| Bundled insurance (annual) | few hundred–low thousands USD/yr | similar | similar |

Treat every number here as a planning range, not a quote — get real quotes for your specific situation before budgeting hard against these.

---

## Part 9 — Glossary

**LLC (Limited Liability Company):** A US business structure that legally separates the company from its owner(s), shielding personal assets from business liabilities.

**Liability shield:** The legal wall a business entity creates between the company's obligations/debts/lawsuits and the owner's personal assets.

**Piercing the corporate veil:** When a court disregards a company's liability shield and holds the owner personally responsible anyway — usually triggered by mixing personal and business finances, or otherwise failing to treat the company as a genuinely separate entity.

**EIN / BN / PAN:** The US, Canadian, and Indian equivalents of a business tax-identification number, respectively (Employer Identification Number, Business Number, Permanent Account Number).

**Terms of Service (ToS):** The contract between you and your users governing use of the app, including liability limitations and dispute-resolution terms.

**Privacy Policy:** The disclosure document explaining what personal data you collect, why, and how it's handled — generally a legal requirement, not optional.

**Governing law clause:** The part of a contract specifying which jurisdiction's laws apply and where disputes will be resolved.

**Arbitration clause / class-action waiver:** Contract language routing disputes to private arbitration instead of court, and/or requiring claims to be brought individually rather than as a class action.

**General Liability (GL) insurance:** Covers third-party bodily injury or property damage claims connected to business operations.

**Tech E&O (Errors & Omissions):** Insurance covering claims that your software/service failed in a way that caused a customer harm.

**Cyber liability insurance:** Insurance specifically covering data-breach costs — notification, legal fees, regulatory fines, credit monitoring.

**Dram shop / social host liability:** Legal liability for harm caused by someone who was served alcohol, potentially extending to the person/venue that served them (varies hugely by jurisdiction).

**Biometric data law (BIPA, Law 25, etc.):** Laws specifically regulating collection/storage of biometric identifiers (fingerprints, facial geometry, etc.) — generally triggered by automated matching, not manual human review of a photo.

**DPDP Act 2023:** India's Digital Personal Data Protection Act — India's first comprehensive data-privacy law, governing consent and handling of personal (including sensitive) data.

**Trademark:** Legal protection for a brand name/logo in a specific category of goods/services — using an identical name to an existing registered trademark in an overlapping category is a real legal risk, not just a branding concern.
