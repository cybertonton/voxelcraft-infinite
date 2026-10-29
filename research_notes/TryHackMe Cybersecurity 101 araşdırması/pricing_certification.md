# TryHackMe "Cyber Security 101": Access, Pricing, Prerequisites and Certification (as of 2026-10-29)

Notes on method: Official pages (tryhackme.com, help.tryhackme.com) were read via WebFetch on 2026-10-29 unless noted. Some official pages (the path outline page and the /certification/security-101 page) returned HTTP 429 and could not be read directly; those facts come from search-result summaries and are flagged. Several FAQ answers on TryHackMe certification pages did not render in the fetch (validity, prerequisites), so those are filled from the help center and a third-party guide where possible. Third-party sources are labelled as such.

## 1. Free vs Premium: what a learner must pay for Cyber Security 101

### Takeaway
The Cyber Security 101 path is only partly free: introductory rooms are free with a free account, but the full structured path, path completion certificates and unlimited AttackBox require a paid Premium subscription. No room-by-room free/premium list could be retrieved, so the exact number of locked rooms is unknown.

### Cited Findings
- The official pricing page (read 2026-10-29) shows a Free plan at EUR 0 with "limited learning paths", free rooms only, and a 1-hour daily AttackBox limit. — [TryHackMe Pricing](https://tryhackme.com/pricing)
- Premium on the pricing page is described as including full beginner learning paths, a completion certificate per path, unlimited AttackBox, and a 15% certification discount. — [TryHackMe Pricing](https://tryhackme.com/pricing)
- TryHackMe's own blog says Premium gives "full access to structured learning paths, unlimited AttackBox time, certificates of path completion, and 15% off TryHackMe certifications"; free tier includes "introductory rooms in every major learning path", 1 hour daily AttackBox, and free OpenVPN access. Cyber Security 101 is named as one of the structured paths unlocked by Premium, with its introductory rooms free (blog says prices accurate as of April 2026). — [TryHackMe blog: best free vs paid platforms 2026](https://tryhackme.com/resources/blog/best-free-vs-paid-cybersecurity-learning-platforms-in-2026)
- The same blog says free introductory rooms in Pre Security and Cyber Security 101 amount to "weeks of genuine learning" and suggests spending the first 4 to 6 weeks on free content. — [TryHackMe blog](https://tryhackme.com/resources/blog/best-free-vs-paid-cybersecurity-learning-platforms-in-2026)
- Third-party (HackerDNA, updated 2026-09-30) lists what free users do NOT get: premium rooms in paths, unlimited AttackBox, Networks, premium challenges, private King of the Hill games, and path certificates. Free: ~100+ free guided labs, no card needed, account does not expire. — [HackerDNA pricing guide](https://hackerdna.com/blog/tryhackme-pricing)
- Official help center for SEC1: "You do not need a TryHackMe subscription to purchase the exam. Some parts of the Cyber Security 101 learning path may require a subscription." — [Help Center: SEC1 training content](https://help.tryhackme.com/en/articles/13530807-sec1-training-content)
- Training paths require a separate Premium subscription that is NOT included in a certification purchase (third-party guide). — [HackerDNA certifications guide](https://hackerdna.com/blog/tryhackme-certifications)
- The Oct 2024 launch blog for the revamped path does not say whether the path is free or paid; it merges the former Complete Beginner and Intro to Cyber Security paths (published 2024-10-21). — [New Cyber Security 101 path](https://tryhackme.com/resources/blog/new-cyber-security-101-path)

### Inferences
- A learner wanting to finish every room and receive the path completion certificate should budget for at least one Premium subscription period; Free is suitable only for sampling.
- Because the path is described as "partly" free everywhere, the free/premium split likely changes over time; the learner should check the lock icons on the live path page.

### Gaps
- Exact list of free vs premium rooms in Cyber Security 101: the path outline page (tryhackme.com/path/outline/cybersecurity101) returned HTTP 429. A search summary reported 14 modules and 56 labs, easy difficulty (unverified from the page itself).

## 2. Pricing (Premium, MAX, student, business/education, regional)

### Takeaway
Premium is shown on the official page as EUR 16.99 (monthly rate, inferred) with EUR 10.50/month when billed annually; MAX is EUR 29.11 / EUR 17.99 per month annual. US buyers see higher, experimental prices (about $18.11/month, $134.28/year). Student discount is 20% off annual Premium only. Business and education plans are quote-based.

### Cited Findings
- Pricing page (read 2026-10-29, currency shown: EUR): Premium EUR 16.99 with "EUR 10.50/month, billed annually, save 38%"; MAX EUR 29.11 with "EUR 17.99/month, billed annually, save 38%". The page does not explicitly label EUR 16.99 as the monthly price (fetch summary inferred it) and does not state the annual total. "Cancel anytime" on paid plans; "Get 5 months free with annual" appears in the comparison. — [TryHackMe Pricing](https://tryhackme.com/pricing)
- Third-party (HackerDNA, updated and "last verified" Sept 2026): Premium EUR 16.99/month or EUR 126/year in most non-US countries (local currency). US checkout showed $18.11/month and $134.28/year, which the article calls part of a TryHackMe "pricing experiment". Prices exclude sales tax/VAT. — [HackerDNA pricing guide](https://hackerdna.com/blog/tryhackme-pricing)
- MAX tier launched June 2026 (per HackerDNA): US checkout $30.73/month, $227.88/year; includes advanced paths, persistent AttackBox, Recent Threats access (pricing page also lists a 40% discount on one certification for MAX). — [HackerDNA pricing guide](https://hackerdna.com/blog/tryhackme-pricing); [TryHackMe Pricing](https://tryhackme.com/pricing)
- Regional pricing: prices differ by region and US buyers pay more than most of the world (HackerDNA). The official pricing page showed only EUR for the fetch and no regional table. — [HackerDNA](https://hackerdna.com/blog/tryhackme-pricing); [TryHackMe Pricing](https://tryhackme.com/pricing)
- Student discount (official): 20% off the regular Premium ANNUAL plan only; excludes monthly plans, MAX, voucher purchases, and stacking with other discounts; applied automatically once student/intern occupation details are in the account; can be revoked if institution info is wrong; no retroactive refund. — [Help Center: Student discount](https://help.tryhackme.com/en/articles/6494960-student-discount)
- HackerDNA says verification goes through Student Beans ("Check eligibility"), no .edu address needed, giving about $100-107/year. — [HackerDNA](https://hackerdna.com/blog/tryhackme-pricing). The pricing page links to a student discount program. — [TryHackMe Pricing](https://tryhackme.com/pricing)
- Contradiction: a search snippet of a TryHackMe FAQ claimed student savings "up to 37.5%"; the official help article and student page say 20%. Treat 20% as authoritative. — [Student discount page](https://tryhackme.com/students); [Help Center](https://help.tryhackme.com/en/articles/6494960-student-discount)
- Business and Education: TryHackMe's help center says pricing is via contacting sales and that, except for price, Education and B2B subscriptions have no differences. — [Help Center: Premium vs B2B or EDU](https://help.tryhackme.com/en/articles/8470000-difference-premium-vs-b2b-or-edu)
- Business/education figures are third-party and inconsistent: fitgap listing says minimum 5 licenses, 12-month term, EDU about $25/license/month with $2,000 minimum order (likely dated, based on earlier announcement); another source says education from $30/user/month; UK G-Cloud listing shows GBP 296.40 per licence per year; AWS Marketplace shows private-offer pricing (one listing $9,999.99 for 12 months Business Foundation). — [fitgap](https://us.fitgap.com/products/020598/tryhackme); [UK G-Cloud listing](https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud-14/services/359973699268083); [AWS Marketplace](https://aws.amazon.com/marketplace/pp/prodview-bmmjerccakmd2)
- Older/other-date data: a HackerDNA/other guide quoting about $14/month monthly and about $10/month annual (blog says accurate as of April 2026) predates the September 2026 figures. — [TryHackMe blog](https://tryhackme.com/resources/blog/best-free-vs-paid-cybersecurity-learning-platforms-in-2026)

### Inferences
- The "monthly" price is roughly EUR 16.99 / about $18 (US), and annual billing is roughly EUR 126 (about EUR 10.50/month). Student annual Premium in Europe would then be roughly EUR 100 (20% of EUR 126 = EUR 25 off), my calculation, not a published figure.
- US pricing instability ("experiment") means US figures may change quickly.

### Gaps
- Official regional pricing table and exact price in other currencies (the pricing page shows only EUR in the fetch).
- Official business/team price per seat (quote-only).
- Whether "5 months free with annual" is an ongoing offer.

## 3. Certificates and certifications (completion certificate, SEC1, SAL1, PT1)

### Takeaway
There are two distinct credentials: (a) a free-with-Premium path completion certificate, and (b) a paid proctor-free practical exam, SEC1 "Cyber Security 101", which is the official capstone to this path (EUR 131, 24-hour window, valid 3 years, Credly badge). SAL1 and PT1 are separate, more advanced exams (about $349 / EUR 301 each) tied to other paths.

### Cited Findings
- Path completion certificate: Included in Premium ("a completion certificate per path"); not available on Free. — [TryHackMe Pricing](https://tryhackme.com/pricing); [HackerDNA](https://hackerdna.com/blog/tryhackme-pricing)
- TryHackMe's certification guide lists six certifications: SEC0 Pre-Security, SEC1 Security 101 (prepared by the Cyber Security 101 path), SAL1, SAL2, PT1, AI1. All exams are practical with no multiple choice per that page; 15% off for Premium subscribers; 20% bundle discount for SEC0 + SEC1. — [TryHackMe certification guide](https://tryhackme.com/resources/blog/tryhackme-certification-guide). (Note: HackerDNA reports SAL1 includes 80 multiple-choice questions, which conflicts with this statement; see below.)
- SEC1 price: EUR 131; bundle with SAL1 EUR 346 (down from EUR 432). Premium/MAX subscribers can use a discount code; 20% off per cert for bundles. Hands-on, scenario-based exam, no multiple choice; 24-hour window; one free retake. — [SEC1 certification page](https://tryhackme.com/certification/cyber-security-101)
- SEC1 details (help center): 7 sections across Red, Blue and Purple team work, analyst VM with artifacts, instant results, retake after a cool-down, valid 3 years then must retake, cloud-based. Target: students, early-career, interns, career switchers, 0 to 2 years experience. Prerequisites: none formal; completing the Cyber Security 101 path is recommended, with basic familiarity with Windows, Linux, networking and blue/red teams helpful. — [Help Center: SEC1 training content](https://help.tryhackme.com/en/articles/13530807-sec1-training-content)
- SEC1 covers: OS fundamentals, network traffic analysis, web application security, security operations (logs, detection, IR), password attacks, basic malware analysis. — [SEC1 certification page](https://tryhackme.com/certification/cyber-security-101)
- SEC1 blog (2026-01-28): verifiable certificate with QR code, valid 3 years, one retake included, results immediate; career outcomes not explicitly stated (positioned to validate skills for entry-level roles). — [SEC1 blog](https://tryhackme.com/resources/blog/cyber-101-certification-a-practical-way-to-prove-youre-ready-for-cyber-security)
- Credly badge exists for SEC1. — [Credly: Cyber Security 101 (SEC1)](https://www.credly.com/org/tryhackme/badge/cyber-security-101-sec1)
- Exam attempts: each certification purchase includes 2 attempts valid 12 months from purchase; extra attempts cost extra and the price varies by location. — [Help Center: Certification access](https://help.tryhackme.com/en/articles/10624994-certification-access)
- Vendor says exam price is not tied to subscription: "A subscription is not required to purchase the exam." — [Help Center](https://help.tryhackme.com/en/articles/13530807-sec1-training-content)
- SAL1: "from $349" (EUR 301 in exam-details section); 24-hour window; verifiable certificate and Credly badge; one free retake; 25% discount for existing premium subscribers noted on page (conflicts with 15% stated elsewhere); developed with Accenture and Salesforce (vendor claim). — [SAL1 page](https://tryhackme.com/certification/security-analyst-level-1)
- Third-party SAL1/PT1 details (HackerDNA): both $349 (EUR 301), valid 3 years from exam start; SAL1 = 80 MCQ (1 hour, 20%) plus two 2-hour SOC Simulator scenarios (40% each), launched Feb 2025; PT1 = 48-hour practical, web 60%, network 20%, AD 20%, not proctored, 750 points; PT1 up from $297 at launch. Recognition: employer awareness "growing but not yet widespread"; job ads still more often name Security+, CySA+ or OSCP. — [HackerDNA certifications guide](https://hackerdna.com/blog/tryhackme-certifications)
- A March 2025 Reddit thread called SAL1 pricey for an entry cert (anecdotal). — [r/tryhackme SAL1 thoughts mirror](https://red.127.pp.ua/r/tryhackme/comments/1jnh61h/sal_1_thoughts)
- Vendor claims on recognition for SEC1: "industry recognised", built with industry experts; PT1 FAQ presented as preparation for OSCP. These are vendor statements and not independently verified. — [SEC1 certification page](https://tryhackme.com/certification/cyber-security-101); [Certification guide](https://tryhackme.com/resources/blog/tryhackme-certification-guide)

### Inferences
- The "Cyber Security 101 certificate" a learner gets for free with Premium is a platform completion certificate; the credible, verifiable credential is SEC1, which costs extra (EUR 131) and is separate from Premium.
- Total cost to go from zero to SEC1 holder: about EUR 126/year Premium (or EUR 16.99 monthly for a few months) plus EUR 131 exam, less a 15% Premium discount on the exam if applied (approximately EUR 111; my calculation).
- SEC1 is a foundation credential; independent evidence of employer recognition is thin (HackerDNA says even the more advanced SAL1/PT1 have limited hiring recognition).

### Gaps
- Official SEC1 validity/prerequisite FAQ text did not render; validity of 3 years comes from the help center and blog (adequate).
- Independent employer-recognition data for SEC1 (launched around January 2026; no reviews found beyond LinkedIn posts).
- Whether the path completion certificate has any external verification or accreditation; not found.
- Discrepancy on SAL1 format (MCQ vs "no multiple-choice") and Premium discount (15% vs 25%) unresolved.

## 4. Audience, prerequisites, time commitment

### Takeaway
Aimed at complete beginners; no formal prerequisites, but Pre Security is suggested first for those with no background. No official hours-per-week or total-hours figure was found.

### Cited Findings
- Audience: complete beginners with no cyber security background and people revisiting basics; "designed for new cyber security users"; suitable for all users. — [New Cyber Security 101 path blog (2024-10-21)](https://tryhackme.com/resources/blog/new-cyber-security-101-path)
- Content areas: Cyber Security Prerequisites (cryptography, networking), Required Skills (Linux, Windows), Offensive Security, Defensive Security, Career in Cyber Security; merges the former Complete Beginner and Intro to Cyber Security paths; 31 new rooms created and existing rooms revamped (8 existing and 5 new modules). — [New Cyber Security 101 path blog](https://tryhackme.com/resources/blog/new-cyber-security-101-path)
- Pre-Security is suggested first only for those with no prior knowledge; not mandatory. — [New Cyber Security 101 path blog](https://tryhackme.com/resources/blog/new-cyber-security-101-path)
- Search summary of the official path page (could not be fetched directly): 14 modules, 56 labs, easy difficulty; Pre Security 5 modules, 18 labs. — [Path outline](https://tryhackme.com/path/outline/cybersecurity101) (via search summary, unverified)
- Free beginner rooms are described as taking 30 minutes to 2 hours each; harder CTF rooms can take an afternoon. — [TryHackMe blog: free training 2026](https://tryhackme.com/resources/blog/free-tryhackme-training-to-learn-cyber-security-in-2026)
- Blog suggests 4 to 6 weeks on free content to test fit. — [TryHackMe blog](https://tryhackme.com/resources/blog/best-free-vs-paid-cybersecurity-learning-platforms-in-2026)

### Inferences
- With 56 labs at 30 min to 2 hours each (per-room range from the free-rooms blog, not path-specific), a rough total might be tens of hours; this is my estimate, not an official figure.

### Gaps
- Official estimated total hours and recommended hours per week: not stated in any official source retrieved; community figures (for example about 40 hours for Pre Security) are unofficial and not verified.

## 5. Technical requirements (AttackBox, VPN, browser)

### Takeaway
Labs are cloud/browser-based; Free users get 1 hour of AttackBox per day and can use OpenVPN with shared public servers; Premium has unlimited AttackBox.

### Cited Findings
- Free AttackBox: 1 hour per day; Premium: unlimited; MAX: unlimited and persistent. — [TryHackMe Pricing](https://tryhackme.com/pricing)
- Free tier includes OpenVPN access; free users share public OpenVPN servers that can be slower at peak times. — [TryHackMe blog](https://tryhackme.com/resources/blog/best-free-vs-paid-cybersecurity-learning-platforms-in-2026); [HackerDNA](https://hackerdna.com/blog/tryhackme-pricing)
- The SEC1 exam is cloud-based on TryHackMe with no local setup. — [Help Center: SEC1](https://help.tryhackme.com/en/articles/13530807-sec1-training-content)
- A free account is all that is needed to start labs for free rooms. — [TryHackMe free training blog](https://tryhackme.com/resources/blog/free-tryhackme-training-to-learn-cyber-security-in-2026)

### Inferences
- Because the free AttackBox is capped at 1 hour/day, free learners wanting longer sessions can use their own VM over OpenVPN, though no hardware spec was found.

### Gaps
- Official minimum hardware/browser specs and OpenVPN setup steps (help.tryhackme.com articles not fetched).
- Whether the cap applies per calendar day or per rolling 24 hours.

## 6. Career outcomes, partnerships, accreditations

### Takeaway
No official accreditation or NHS partnership tied to Cyber Security 101 was found. TryHackMe makes education/business offerings and claims industry backing for its certifications, but no career-outcome statistics for this path.

### Cited Findings
- SEC1 blog does not list specific jobs, salaries or hiring outcomes; positions the cert as validating foundations for entry-level roles. — [SEC1 blog](https://tryhackme.com/resources/blog/cyber-101-certification-a-practical-way-to-prove-youre-ready-for-cyber-security)
- SAL1 is described as developed with or backed by Accenture and Salesforce (vendor claim). — [SAL1 page](https://tryhackme.com/certification/security-analyst-level-1); [Certification guide](https://tryhackme.com/resources/blog/tryhackme-certification-guide)
- TryHackMe says it works with schools, colleges and universities; one source mentions use in Scottish schools for ages 14 to 15 (secondary summary, not verified). UK G-Cloud listing exists, indicating public-sector procurement availability. — [UK G-Cloud listing](https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud-14/services/359973699268083); [TryHackMe About](https://tryhackme.com/about)
- Independent view: employer awareness of TryHackMe certs is limited; established certs (Security+, CySA+, OSCP) appear more often in job ads. — [HackerDNA certifications guide](https://hackerdna.com/blog/tryhackme-certifications)

### Inferences
- Cyber Security 101 and SEC1 are best treated as a learning and portfolio signal, not an accredited qualification.

### Gaps
- No evidence found for NHS partnership, university credit, or formal accreditation (for example CPD, NCSC, CompTIA mapping) tied to Cyber Security 101.
- Reddit r/tryhackme and r/cybersecurity discussions on SEC1 value and cost were not retrieved (only one older SAL1 thread mirror seen).
