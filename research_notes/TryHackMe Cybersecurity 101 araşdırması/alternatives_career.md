# TryHackMe Cyber Security 101: alternatives, career value, roadmap and 2025-2026 market context (as of 2026-10-29)

Method note: ~19 tool calls (web searches plus page fetches). Many comparison pieces about TryHackMe (THM) are vendor-authored or affiliate blogs (hackerdna.com, refontelearning.com, THM's own blog); these are flagged. All prices are quoted as found, with source date; anything not confirmed on an official page is marked UNVERIFIED.

## 1. How does Cyber Security 101 compare with alternatives (cost, depth, hands-on, credential recognition, target role)?

### Takeaway
Cyber Security 101 (CS101) is a beginner-oriented, guided, browser-lab path costing roughly US$10-14/month (Premium) with a separate paid, hands-on SEC1 exam (EUR 131); it has little formal credential weight compared with CompTIA Security+ or ISC2 CC, but it is cheaper and more hands-on than most certification-prep routes. The strongest free/low-cost alternatives for structured learning are Cisco Networking Academy (free Intro to Cybersecurity and Junior Cybersecurity Analyst path), Google's certificate (about US$49/month on Coursera), and free tiers on LetsDefend/PortSwigger; HTB Academy is deeper but costlier and aimed at intermediate learners.

### Cited Findings

#### TryHackMe Cyber Security 101 itself
- CS101 merged the former "Complete Beginner" and "Intro to Cyber Security" paths: 8 revamped existing modules plus 5 new modules, 31 new rooms; five topic areas: prerequisites (cryptography, networking), required skills (Linux and Windows), offensive security, defensive security, careers. Blog dated 21 Oct 2024; no total hours or room count given. — [THM blog: new CS101 path](https://tryhackme.com/resources/blog/new-cyber-security-101-path)
- Audience: complete beginners with no background; if you have no prior knowledge THM suggests Pre-Security first; recommended next paths are Security Analyst, Penetration Tester, or Security Engineer. — [THM blog: new CS101 path](https://tryhackme.com/resources/blog/new-cyber-security-101-path)
- One third-party learner write-up cites "45+ hours" of hands-on training; another cites "14 modules, 100+ rooms" (may refer to a different path, treat as low confidence). — search snippet summaries of [GitHub notes](https://github.com/Deeptig9138/CyberSecurity101---THM) and [Rheinwerk blog](https://blog.rheinwerk-computing.com/what-is-tryhackme); UNVERIFIED hours
- SEC1 (Cyber Security 101 exam): EUR 131; bundle with SAL1 EUR 346 (20% saving each); hands-on scenario-based exam covering offensive and defensive tasks, no multiple choice; 24-hour window; one free retake; verifiable certificate and Credly badge. "Industry recognised" is a marketing claim; the page documents no formal accreditation. — [THM SEC1 certification page](https://tryhackme.com/certification/cyber-security-101)
- THM cert guide (27 Jun 2026): SEC1 is a structured practical assessment; SAL1 is a live SOC simulator with real alerts and graded incident reports; PT1 is a 48-hour practical engagement across web, network and Active Directory with a graded report. Premium subscribers get 15% off; SEC0+SEC1 together 20% each. — [THM certification guide](https://tryhackme.com/resources/blog/tryhackme-certification-guide)

#### Pricing, all platforms (USD unless stated)
- THM Premium: about $10/month billed annually, $14/month monthly; THM MAX tier: $18.99/month annual, $30.73/month monthly (vendor blog, 22 Jul 2026). — [THM blog: subscriptions compared, 22 Jul 2026](https://tryhackme.com/resources/blog/cyber-security-training-subscriptions-compared-cost-features-roi-2026)
- THM monthly price rose for existing and new subscribers from 16 Jun 2025; annual price unchanged. — [THM blog: upcoming changes to monthly pricing](https://tryhackme.com/resources/blog/upcoming-changes-to-tryhackme-monthly-pricing) (as reported in search summary; exact amount not seen on THM page)
- THM annual about $126/year and a student discount of about $100/year are reported by a third party, not confirmed officially. — [hackerdna pricing guide](https://hackerdna.com/blog/tryhackme-pricing); UNVERIFIED
- HTB Academy new tier-based pricing announced 3 Sep 2026, effective 12 Oct 2026: Student $10/mo (EUR 9, GBP 8; Tier 0-II); Silver $30/mo or $550/yr (annual includes 2 exam vouchers: HTB CJCA plus one Specialist cert); Gold $95/mo or $1,400/yr (Tier 0-III, vouchers incl.); Platinum $125/mo (Tier 0-IV). — [HTB blog: new Academy pricing](https://www.hackthebox.com/blog/new-academy-pricing). This supersedes the pre-change figures THM listed in July 2026 (Silver $490/yr, Gold $1,260/yr; HTB VIP+ labs $25/mo or $223/yr). — [THM blog, 22 Jul 2026](https://tryhackme.com/resources/blog/cyber-security-training-subscriptions-compared-cost-features-roi-2026)
- HTB Junior Cybersecurity Associate (CJCA) exam was listed at $105 ($124.95 incl. VAT) on an HTB help page; date unclear. — via search result of [HTB help center](https://help.hackthebox.com/en/articles/13677074-academy-subscriptions); UNVERIFIED on date
- HTB CPTS / CBBH / CDSA are HTB's cert names (CPTS is pentest-oriented, intermediate/advanced). — [THM comparison blog, 27 Feb 2026](https://tryhackme.com/resources/blog/which-cyber-security-training-platform-actually-gets-you-job-ready-2026-comparison) (vendor-authored, THM-favourable)
- Google Cybersecurity Professional Certificate: $49/month on Coursera (US/Canada), about 6 months at ~7 hrs/week, so roughly $294 total; dual credential option with CompTIA Security+ (exam fee extra; one source says $404). Regional prices vary. — [skillscouter overview / search results](https://skillscouter.com/cyber-security-courses-certificates/) and [hakia review](https://hakia.com/news/google-cybersecurity-certificate-review/); check Coursera for current price. Hiring-manager view: [The Interview Guys](https://blog.theinterviewguys.com/?p=10689) (not reviewed in detail)
- CompTIA Security+ SY0-701: most 2026 guides say about $425 list; one source claims list rose to $439 in mid-2026 with resellers ~$394; not confirmed on comptia.org. Network+ and ITF+ prices: not found. — [trainingcost.com](https://trainingcost.com/certifications/comptia-security-plus-training-cost), [hackerdna Security+ cost](https://hackerdna.com/blog/security-plus-certification-cost); UNVERIFIED
- ISC2 CC: the free "One Million Certified in Cybersecurity" program ended 20 May 2026; those with unexpired exam codes can sit the exam until 31 Dec 2026; afterwards CC exam/course are "available for purchase" (price not stated by ISC2). — [ISC2 conclusion notice, Apr 2026](https://www.isc2.org/Insights/2026/04/one-million-certified-cyber-conclusion). A third party reports $199 exam plus $50/yr maintenance (UNVERIFIED) and notes a new exam outline from 1 Sep 2026. — [trainingcamp.com](https://trainingcamp.com/articles/isc2-cc-certification-guide-2026-exam-domains-cost-and-what-its-worth/). A Refonte Learning (Aug 2026) guide still describes free vouchers, which contradicts ISC2: [Refonte](https://www.refontelearning.com/blog/isc2-certified-in-cybersecurity-cc-free-guide)
- Cisco Networking Academy: Introduction to Cybersecurity is free, self-paced, about 6 hours, Credly badge; leads into the Junior Cybersecurity Analyst Career Path (reported ~120 hours free, ending in a practice assessment for Cisco CCST Cybersecurity, exam USD 125 at Pearson VUE); CyberOps Associate (exam 200-201 CBROPS) results found were paid university/provider courses, so free availability is unconfirmed. — [Metropolia open university](https://www.metropolia.fi/en/academics/open-university/introduction-to-cybersecurity-aaf084), [netguardia summary](https://netguardia.com/?p=5225), [NICCS CyberOps listing](https://niccs.cisa.gov/education-training/catalog/within-u/cisco-cyberops-associate); check netacad.com
- PortSwigger Burp Suite Certified Practitioner exam: $99, 4 hours, valid 12 months from purchase, requires Burp Suite Professional subscription; Practitioner-level Academy labs recommended first. (The $9 price was a Nov 2021 promotion only.) — [PortSwigger certification pages](https://portswigger.net/web-security/certification/exam-hints-and-guidance), [FAQ](https://portswigger.net/web-security/certification/frequently-asked-questions). That the Web Security Academy content is free was not confirmed in my searches (widely known but not cited here).
- LetsDefend: Basic plan free with free courses, challenges and 15 SOC alerts/month; one source says the material is now in HTB Academy/Labs under HTB pricing (reported HTB ownership), so verify status. — [hackerdna LetsDefend guide](https://hackerdna.com/blog/letsdefend), [ethicalhacking.ai](https://ethicalhacking.ai/pricing/letsdefend-pricing)
- Blue Team Labs Online: Pro reported at GBP 15/month, GBP 40.50 for 3 months, GBP 76.50 for 6 months, GBP 144/year (third-party listing, undated). — via [metana.io / search results](https://metana.io/blog/what-is-the-best-soc-analyst-training-platform/); UNVERIFIED
- Cybrary: video-led courses with labs, free tier plus "Insider Pro" (price not found), CompTIA/ISC2 prep, Credly badges (vendor-authored THM comparison). — [THM comparison, Feb 2026](https://tryhackme.com/resources/blog/which-cyber-security-training-platform-actually-gets-you-job-ready-2026-comparison)
- SANS/GIAC (for context): GIAC exam about $999, courses often over $8,500. — same THM comparison (vendor-authored)
- Immersive Labs: no pricing or beginner-path information found. Free university/MOOC options: not specifically researched.

#### Comparison matrix (synthesis of the above; see Inferences)
| Option | Cost (source date) | Hands-on | Credential recognition | Target role |
|---|---|---|---|---|
| THM CS101 + SEC1 | ~$10-14/mo + EUR 131 exam (Jul/Oct 2026) | High (guided browser labs) | Low-moderate; vendor badge | Absolute beginner, SOC/pentest/engineer fork |
| HTB Academy | $10/mo student to $30/mo Silver (from 12 Oct 2026) | High, less guided | Moderate in pentest niche (CPTS) | Intermediate, pentest/defensive |
| Google Cert | ~$49/mo, ~6 mo | Low-moderate | Brand recognised, not an accredited exam | Entry-level analyst / help desk |
| Security+ | ~$425 exam (UNVERIFIED) | Low (some PBQs) | High (HR filters, US DoD 8140 context) | General entry-level |
| ISC2 CC | exam ~$199 UNVERIFIED after free program ended | None | Entry-level, lower than Security+ | Entry-level generalist |
| Cisco NetAcad | Free (courses); CCST $125 | Moderate (Packet Tracer etc.) | Cisco brand | Network/security technician |
| PortSwigger | Free academy (unconfirmed here); BSCP $99 | High (web labs) | Respected in web-appsec niche | Web pentester / bug bounty |
| LetsDefend / BTLO | Free tier / ~GBP 15/mo | High (SOC alerts) | Employers list BTL1 (see Q4) | SOC L1 |

### Inferences
- CS101 is best viewed as a low-cost, guided on-ramp, not a competitor to certificate-grade credentials; the proper comparison is "THM for skills + a recognised cert (Security+/CC/CCST) for HR filters."
- For a budget-constrained beginner, combining free Cisco NetAcad content with THM Premium (about $10-14/mo) covers fundamentals for roughly $120-170/year; adding Security+ adds about $400.
- Because HTB repriced Academy effective 12 Oct 2026, older comparison articles (including THM's July 2026 blog) now understate HTB Academy cost.

### Gaps
- Official THM pricing page was not directly fetched; Premium/MAX numbers come from THM's own blog and third parties. Student discount unconfirmed.
- Network+ and ITF+ (CompTIA) prices, Immersive Labs pricing/beginner offering, Cybrary pricing, official Coursera current price, ISC2 CC current price, CyberOps Associate free availability, and free university/MOOC options were not found or not verified.
- No independent (non-vendor) head-to-head review of CS101 versus HTB Academy was found.

## 2. How do employers view TryHackMe paths, badges and certificates?

### Takeaway
Evidence suggests employers value TryHackMe mainly as proof of hands-on practice and initiative (portfolio, public profile), not as a recognised credential; no hiring-manager survey rates THM badges directly. Hiring managers in the ISC2 survey rank certifications, IT experience and education similarly, and nearly all use skills assessments, so demonstrable ability matters most.

### Cited Findings
- ISC2 2025 Hiring Trends (929 hiring managers in US, UK, Canada, Germany, India, Japan; surveyed Dec 2024; margin of error plus/minus 3%): 89% would consider a candidate with only an entry-level cybersecurity certification; 90% would consider only prior IT work experience; certifications ranked 47% as a critical attribute, ahead of IT experience 44% and education 43%; 84% use skills-based assessments for entry/junior applicants; 54% have passed on candidates because of social media activity. — [ISC2 Hiring Trends study](https://www.isc2.org/insights/2025/06/cybersecurity-hiring-trends-study)
- Entry-level ramp-up: 56% of hiring managers say 4-9 months to independence. — same ISC2 source
- THM states SAL1 was built with input from hiring managers/SOC teams at companies including Accenture and Salesforce (vendor claim, not independently verified). — [THM SAL1 page](https://tryhackme.com/certification/security-analyst-level-1/details); [THM blog on certs employers trust](https://tryhackme.com/resources/blog/creating-certifications-employers-trust)
- SEC1 marketing says "industry recognised" but documents no accreditation. — [THM SEC1 page](https://tryhackme.com/certification/cyber-security-101)
- Third-party commentary: over-reliance on certifications without hands-on experience is a negative; recruiter-oriented articles say employers weight projects and practical problem solving more than any single certificate. — [VisualCV](https://www.visualcv.com/tryhackme-certification/), [InfoSecTrain](https://www.infosectrain.com/blog/what-recruiters-really-look-for-in-cybersecurity-candidates)
- Reddit: an r/tryhackme thread (Mar 2024) asks whether employers look at THM progress; a commenter elsewhere argues newer certs have little pull and recommends Security+, CySA+ or CCNA. — [r/tryhackme thread mirror](https://reddit.birdcat.cafe/r/tryhackme/comments/1bp5m2t/i_need_a_job) (could not be opened in my fetch, content known only from search snippet); [Reddit user profile mirror](https://redlib.hbubli.cc/user/Mysterious_Bit511). Low confidence, anecdotal.
- A Baku Tier 1 SOC job posting (deadline 10 Jul 2026) listed BTL1, eJPT and SAL1 as preferred certifications, indicating at least one regional employer recognises SAL1. — via [Azerbaijan LinkedIn/job search results](https://skillers.tech/jobs/head-of-soc-security-operations-center) (posting details from search summary; single data point)

### Inferences
- THM helps most as (a) a public, verifiable activity record (rank, badges, Credly cert) and (b) practice for skills assessments, which 84% of managers use; it helps least as an HR-filter credential, where Security+/CC/CCST names are better known.
- Social-media/public-profile hygiene matters: 54% of managers have rejected candidates on that basis, so a public THM profile should be curated.
- Practical-format certs (SAL1, PT1) are likely to carry more weight than SEC1 because they simulate job tasks, but independent evidence is thin.

### Gaps
- No survey data or hiring-manager testimonies specifically rating THM certificates; Reddit/LinkedIn discussions found were few, anecdotal and mostly undated or 2024.
- Reddit pages were not directly readable; claims rely on search snippets.

## 3. Recommended roadmap after Cyber Security 101

### Takeaway
THM's official sequence is Pre-Security (if needed) then CS101 (SEC1) then one role path (SOC Level 1/Security Analyst or Jr Penetration Tester), then the corresponding cert (SAL1 or PT1), with an industry cert and portfolio alongside. Independent advice is to finish one path to ~80%, ship portfolio artifacts, and only then specialise.

### Cited Findings
- THM-recommended certification order: complete beginner SEC0 then SEC1 then SAL1 or PT1; SOC route SEC1 then SAL1 then SAL2; pentest route SEC1 then PT1 then AI1. — [THM certification guide, 27 Jun 2026](https://tryhackme.com/resources/blog/tryhackme-certification-guide)
- THM recommends Security Analyst, Penetration Tester or Security Engineer paths after CS101; a career quiz is offered. — [THM blog: new CS101 path](https://tryhackme.com/resources/blog/new-cyber-security-101-path)
- Refonte (2026 review, affiliate-style source): take one role path to 80% completion, ship portfolio artifacts, then add a specialization path. — [Refonte review](https://www.refontelearning.com/blog/tryhackme-learning-path-review)
- PT1 is a 48-hour practical engagement incl. web, network and AD plus report; SAL1 is a live SOC simulation with graded reports. — [THM certification guide](https://tryhackme.com/certification/security-analyst-level-1/details)
- For web/bug bounty: PortSwigger recommends completing Practitioner-level labs before the $99 BSCP exam (Burp Pro subscription needed). — [PortSwigger](https://portswigger.net/web-security/certification/frequently-asked-questions)
- Cisco's free path (Intro to Cybersecurity then Cybersecurity Essentials, Endpoint Security, Network Defense, Cyber Threat Management) and CCST ($125) is a free-content alternative for an HR-recognisable credential. — [netguardia](https://netguardia.com/?p=5225)
- ISC2 says managers take ~4-9 months to ramp up entry-level hires and 84% test skills, supporting a portfolio plus lab-based assessment prep. — [ISC2](https://www.isc2.org/insights/2025/06/cybersecurity-hiring-trends-study)
- HTB Academy's Student tier ($10/mo, from 12 Oct 2026) and Silver annual bundling CJCA voucher offer a deeper second platform. — [HTB pricing blog](https://www.hackthebox.com/blog/new-academy-pricing)

### Inferences (suggested sequence; synthesis, not sourced as a single recommendation)
1. Months 0-3: Pre-Security (if weak on networking) then CS101; optionally sit SEC1 only if a certificate for the CV is wanted (EUR 131).
2. Months 3-8: choose a fork. SOC: SOC Level 1 / Security Analyst path then SAL1, supplement with LetsDefend free tier or BTLO. Pentest: Jr Penetration Tester, Web Fundamentals, then PortSwigger labs and PT1; Offensive Pentesting later.
3. In parallel or after: one recognised cert (Security+ or CCST/CC) for HR filters, particularly for SOC roles, plus a public portfolio (write-ups, a home lab) and CTFs. Bug bounty is a longer, less certain route.
4. Move to HTB Academy/CPTS only once fundamentals are solid.

### Gaps
- No independent outcome data (job placement rates) for THM paths or certs.
- Specific content/hours of the SOC Level 1, Jr Pentester and Offensive Pentesting paths were not fetched.
- Bug bounty and CTF guidance sources were not researched.

## 4. Entry-level cybersecurity job market 2025-2026, with Azerbaijan/CIS notes

### Takeaway
Overall demand is large (about 514,000 US postings in the 12 months to ~April 2025) but entry-level openings are scarce relative to total, employers want proof of practical skill, and AI is expected by some to reduce entry-level need. For Azerbaijan, only fragmentary data was found: some Baku SOC Tier 1 roles exist and list BTL1/eJPT/SAL1, but salary and TryHackMe payment-access details are not reliably documented.

### Cited Findings
- CyberSeek (CompTIA/Lightcast, June 2025): 514,000 US cybersecurity job postings, supply-demand ratio 74%. — [CompTIA press release on CyberSeek](https://www.comptia.org/en/about-us/news/press-releases/cyberseek-expands-cybersecurity-workforce-data-coverage-and-enhances-user-experience/); [CyberSeek June 2025 PDF](https://www.cyberseek.org/docs/06-02-2025_CyberSeek_June_2025.pdf). (The press-release data window and the infographic's "2024 to Q1 2025" differ slightly.)
- CyberSeek June 2024 (older): under 9,000 entry-level specialist postings vs ~28,000 mid-level analyst and 61,000+ advanced engineer postings; I found no 2025 equivalent breakdown. — via [search summary of CyberSeek 2024 coverage](https://www.potomacofficersclub.com/news/cyberseek-study-shows-surge-in-cybersecurity-job-vacancies/)
- Academic paper (2025): most entry-level cybersecurity jobs require several years of experience, a supply-demand mismatch. — [Communications of the IIMA](https://scholarworks.lib.csusb.edu/ciima/vol23/iss1/8)
- ISC2 hiring managers: 75% planned to hire more cyber staff in 2025, nearly 90% had open positions; 21% fill entry-level roles in under a month and 40% in 1-3 months. — [ISC2 Hiring Trends](https://www.isc2.org/insights/2025/06/cybersecurity-hiring-trends-study)
- ISC2 AI Adoption Pulse Survey (436 respondents, July 2025): 52% say AI will significantly or somewhat reduce need for entry-level staff (another write-up cites 56%; check original). — [ISC2 research via AAP](https://www.aap.com.au/aapreleases/cision20250716ae30906); [Infosecurity Magazine](https://www.infosecurity-magazine.com/news/hands-on-skills-first-cyber-role/)
- ISC2 2025 Workforce Study (4 Dec 2025; 16,029 respondents): budget strain is a key driver of staff shortages; AI is the most-cited skill need (41%, per one summary). — [ISC2 publication notice](https://www.isc2.org/Insights/2025/12/ISC2-publishes-2025-cybersecurity-workforce-study)
- Typical certifications required: managers expect CISA (38%) and CISSP (34%) at entry level in some cases (both need ~5 years experience), which signals that many "entry-level" ads are really junior/mid. — [ISC2 Hiring Trends](https://www.isc2.org/insights/2025/06/cybersecurity-hiring-trends-study)
- Azerbaijan: a Baku Tier 1 SOC role (24/7 shifts, deadline 10 Jul 2026) listed BTL1, eJPT, SAL1 as preferred; a senior bank SOC role paid in AZN. — [skillers.tech Head of SOC listing](https://skillers.tech/jobs/head-of-soc-security-operations-center) and Azerbaijani LinkedIn profiles surfaced in search; weak, single-source
- Azerbaijan salary: TalentUp shows 33,500 AZN base for a Cyber Security Analyst in Baku (period and seniority not stated); GlobalCostData models about $1,968/month (World Bank-derived); Paylab IT Analyst range 412-1,662 AZN gross (generic IT). Figures conflict. — [TalentUp](https://talentup.io/salary/cyber-security-analyst/baku), [GlobalCostData](https://globalcostdata.com/salary/azerbaijan/cybersecurity-analyst/), [Paylab](https://paylab.com/az/salaryinfo/information-technology/it-analyst?lang=en)
- Payments: THM's help center documents bank wire only for Business/Education customers; PayPal can be opened in Azerbaijan per a 2026 guide; Visa leads website payments in Azerbaijan (third-party estimate). Nothing found confirming that Azerbaijani-issued cards work on THM. — [THM help: bank wire](https://help.tryhackme.com/en/articles/8469839-pay-via-bank-wire-transfer), [doola PayPal guide](https://www.doola.com/paypal-guide/how-to-open-a-paypal-account-in-azerbaijan/), [wmtips](https://www.wmtips.com/technologies/payments/country/az/)
- CIS note: a Russian-language article describes a workaround for paying THM from Russia/Belarus via a third-party service, implying direct payment problems there (not Azerbaijan-specific). — [vc.ru](https://vc.ru/services/2758477-oplata-podpiski-tryhackme-iz-rossii-i-belarusi-cherez-payholder)

### Inferences
- A beginner should expect a slow entry-level market: aim for help desk/IT support/SOC Tier 1 and combine a recognised cert with demonstrated lab work and assessments readiness.
- In Azerbaijan, SOC Tier 1 certs listed (BTL1, eJPT, SAL1) suggest THM's SAL1 is a more regionally relevant target than SEC1, but this rests on one posting.
- Because TryHackMe card acceptance for Azerbaijan is unverified, free tools (Cisco NetAcad, free LetsDefend/THM tiers) are a lower-risk starting point; test a small purchase or ask THM support before committing to an annual plan.

### Gaps
- Azerbaijani/Russian-language availability of THM content (THM is English-only per my understanding, but I found no source), local certifications/education options (e.g., Azerbaijani universities, ADA University, Azerbaijan Technical University, EPAM/IT Academy programmes, SOC/regulator certifications) were not found.
- Reliable entry-level SOC salary for Baku was not found.
- Whether THM accepts Azerbaijani-issued cards, and local currency effects, not found.
- No CIS-wide hiring data found; CyberSeek is US-only.
