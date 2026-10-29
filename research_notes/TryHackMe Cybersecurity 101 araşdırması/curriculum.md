# TryHackMe "Cyber Security 101" Learning Path: Curriculum and Structure (as of 2026-10-29)

Method note: tryhackme.com returned HTTP 429 to every direct fetch of the official path outline (tryhackme.com/path/outline/cybersecurity101, /r/path/..., module pages, llms.txt), so the official room-by-room outline could not be read first-hand. The module/room list below comes from a learner's GitHub documentation repo that mirrors the official outline (secondary source), cross-checked against official blog/help-center pages and independent reviews. Treat the exact list as "very likely current but not verified against the official page today."

## What is the exact structure (modules, rooms, tasks, hours) as of 2026-10-29, and what are the modules and key rooms?

### Takeaway
The path launched in Oct 2024 as 13 modules and now appears to be 14 modules and about 56 rooms (a 2025 OWASP Top 10 module appears to have been added), with TryHackMe listing roughly 80 hours in mid-2026 while learners' certificates show about 45 hours. Official current counts and task counts could not be verified (site rate-limited); sources disagree on hours and room counts.

### Cited Findings
- Launch blog (21 Oct 2024, Ben Spring): the path has 13 modules, 8 existing modules completely revamped plus 5 brand-new modules; "31 new rooms" created plus revamped existing rooms; no total room count or hours stated. — [TryHackMe blog: New Cyber Security 101 path](https://tryhackme.com/resources/blog/new-cyber-security-101-path)
- Launch blog groups content into five areas: (1) Cyber Security Prerequisites (cryptography, networking, key technologies), (2) Required Skills (Linux and Windows interfaces), (3) Offensive Security (pentesting, red teams, exploitation, web hacking), (4) Defensive Security (blue teams, defensive tools), (5) Career in Cyber Security (career paths, choosing a specialisation). — [TryHackMe blog](https://tryhackme.com/resources/blog/new-cyber-security-101-path)
- Feb 2025 completion post: 13 modules, 54 rooms, 45 h 43 min to complete. — [SecBurg, 16 Feb 2025](https://secburg.com/posts/tryhackme-completed-cybersecurity-101/)
- 2026 completion post (published 28 Mar 2026, updated 16 Aug 2026): 14 modules, 56 hands-on labs/rooms, 45 hours per certificate. — [Aaron Adkins](https://aaronjadkins.com/posts/completed-tryhackmes-cyber-security-101-learning-path/)
- Review dated 9 Jun 2026: "THM lists about 80 hours" for Cyber Security 101 (reviewer's own estimate 40-60 h with IT background, 100-150 h from zero); Pre-Security 15-20 h. Module/room counts not given. — [Lateral Moves review](https://lateralmoves.net/tryhackme-cyber-security-101-review/)
- GitHub repo documenting the path lists 14 modules and "56+" labs (repo says it is still in progress). Module and room list (secondary source; room counts per module in parentheses; totals 56 counting "Defensive Security Intro" twice): — [Deeptig9138/CyberSecurity101---THM](https://github.com/Deeptig9138/CyberSecurity101---THM)
  1. Start Your Cyber Security Journey (3): Offensive Security Intro, Defensive Security Intro, Search Skills
  2. Linux Fundamentals (3): Linux Fundamentals Parts 1-3
  3. Windows and AD Fundamentals (4): Windows Fundamentals 1, 2, 3; Active Directory Basics
  4. Command Line (3): Windows Command Line, Windows PowerShell, Linux Shells
  5. Networking (7): Networking Concepts, Networking Essentials, Networking Core Protocols, Networking Secure Protocols, Wireshark: The Basics, Tcpdump: The Basics, Nmap: The Basics
  6. Cryptography (4): Cryptography Basics, Public Key Cryptography Basics, Hashing Basics, John the Ripper: The Basics
  7. Exploitation Basics (5): Moniker Link (CVE-2024-21413), Metasploit: Introduction, Metasploit: Exploitation, Metasploit: Meterpreter, Blue
  8. Web Hacking (4): Web Application Basics, JavaScript Essentials, SQL Fundamentals, Burp Suite: The Basics
  9. Offensive Security Tooling (4): Hydra, Gobuster: The Basics, Shells Overview, SQLMap: The Basics
  10. Defensive Security (5): Defensive Security Intro, SOC Fundamentals, Digital Forensics Fundamentals, Incident Response Fundamentals, Logs Fundamentals
  11. Security Solutions (4): Introduction to SIEM, Firewall Fundamentals, IDS Fundamentals, Vulnerability Scanner Overview
  12. Defensive Security Tooling (4): CyberChef: The Basics, CAPA: The Basics, REMnux: Getting Started, FlareVM: Arsenal of Tools
  13. Build Your Cyber Security Career (3): Security Principles, Careers in Cyber, Training Impact on Teams
  14. OWASP Top 10 (2025) (3): IAAA Failures, Application Design Flaws, Insecure Data Handling
- The "OWASP Top 10 (2025)" module exists officially as a three-room module (rooms cover A01, A07, A09 as IAAA failures, etc.). — [TryHackMe module page (via search result)](https://tryhackme.com/module/owasp-top-10-2025); the search snippet did not confirm release date or path membership.
- Aaron Adkins' post corroborates the Exploitation Basics module (three Metasploit rooms plus Blue/EternalBlue). — [Aaron Adkins](https://aaronjadkins.com/posts/completed-tryhackmes-cyber-security-101-learning-path/)
- TryHackMe's description of hierarchy: a path is made of modules, a module of bite-sized rooms. — [TryHackMe blog](https://tryhackme.com/resources/blog/new-cyber-security-101-path)

### Inferences
- The 13 -> 14 module change between Feb 2025 and 2026 is most plausibly the addition of the OWASP Top 10 (2025) module (it carries a 2025 edition tag and the GitHub list puts it as module 14), but the 54 -> 56 room change does not equal +3, so other rooms were also swapped/removed (e.g., rooms merged or dropped). Not verified.
- The 45 h (certificate/early completion) vs ~80 h ("THM lists") discrepancy likely reflects different measures (certificate-listed content hours versus the path page's estimate, possibly updated after additions) or learners' own timing; cannot determine which is the current official figure.
- Some module names (e.g., "Defensive Security" vs "Security Solutions") may differ slightly from the official outline since the repo is community-authored.

### Gaps
- Official, current module/room/task counts and official hour estimate from the path page (site returned 429).
- Per-room difficulty ratings and per-room durations; number of tasks per room (not found in any source).
- Whether OWASP Top 10 (2025) was added to the path and on what date (no official statement found); room/module differences between 54 and 56 rooms.
- The repo's Section 1 and Section 10 both list "Defensive Security Intro," so the list may contain a duplicate or an error.

## Which tools, technologies and skills are covered?

### Takeaway
Broad foundations plus tool introductions: Linux, Windows, AD basics, command lines (PowerShell, shells), networking and packet analysis (Wireshark, tcpdump, Nmap), cryptography/hashing, Metasploit, Burp Suite, Hydra, Gobuster, SQLMap, SIEM/IDS/firewalls, DFIR, malware-analysis tools (CAPA, REMnux, FlareVM), and CyberChef.

### Cited Findings
- Tools and technologies by room (see module list above): Wireshark, tcpdump, Nmap, John the Ripper, Metasploit (Intro/Exploitation/Meterpreter), Burp Suite, Hydra, Gobuster, SQLMap, CyberChef, CAPA, REMnux, FlareVM; topics also include SIEM, firewalls, IDS, vulnerability scanners, SQL, JavaScript, Moniker Link CVE-2024-21413, EternalBlue (Blue). — [GitHub module list](https://github.com/Deeptig9138/CyberSecurity101---THM)
- Help center summary: Cyber Security 101 covers computer networking, cryptography, and basics of Linux, Windows and Active Directory. — [TryHackMe help center](https://help.tryhackme.com/en/articles/10632551-big-changes-on-tryhackme-retired-three-learning-paths) (as paraphrased by search snippet; the fetched page itself lists replacement mapping)
- 2026 review: covers defensive basics, offensive basics, cryptography, SOC concepts, light incident response, and introductions to several specialty areas; uses real VMs (SSH/attack) and a browser-based AttackBox, no VPN needed; breadth over depth, too basic for sysadmins with 5+ years. — [Lateral Moves](https://lateralmoves.net/tryhackme-cyber-security-101-review/)
- The SEC1 exam domains (which mirror path skills): Operating Systems Fundamentals, Network Traffic Analysis, Web Application Security, Security Operations, Password Attacks and Credential Security, Malware Analysis Fundamentals. — [TryHackMe SEC1 certification page](https://tryhackme.com/certification/cyber-security-101)

### Inferences
- The "Offensive Security Tooling" and "Exploitation Basics" modules provide the offensive toolchain that feeds directly into Jr Penetration Tester; "Defensive Security Tooling"/"Security Solutions" feed SOC Level 1.

### Gaps
- No official statement of learning objectives per room was retrievable. Whether lab VMs are AttackBox-only or also VPN-capable is not stated beyond the 2026 review.

## How does it relate to other paths; was it a replacement; launch and update dates?

### Takeaway
Cyber Security 101 launched 21 Oct 2024 by merging Complete Beginner and Introduction to Cyber Security; those (plus Cyber Defense) were formally retired 2 Apr 2025. Pre Security (revamped Feb 2026) is the recommended prerequisite; next steps are Jr Penetration Tester, SOC Level 1 / Security Analyst, Security Engineer.

### Cited Findings
- Launch blog dated 21 Oct 2024: Complete Beginner and Introduction to Cyber Security merged into Cyber Security 101; the old paths remain available "until further notice"; Pre Security recommended first for those with no prior knowledge; recommended next paths are Security Analyst, Penetration Tester, Security Engineer; a $48,000+ prize draw was run for path completers. — [TryHackMe blog](https://tryhackme.com/resources/blog/new-cyber-security-101-path)
- Help center article (dated 18 Feb 2026): retired paths are Complete Beginner (replaced by Cyber Security 101), Introduction to Cyber Security (replaced by Cyber Security 101), Cyber Defense (replaced by SOC Level 1 and SOC Level 2); retirement date 2 April 2025; retired paths can no longer be completed; most rooms remain accessible and marked complete; some rooms/modules will be removed; earned certificates remain; Discord channels for them archived. — [TryHackMe help center](https://help.tryhackme.com/en/articles/10632551-big-changes-on-tryhackme-retired-three-learning-paths)
- Same article: Pre Security revamped 18 Feb 2026 (previous version labelled "(Legacy)", temporarily available); SOC Level 1 also revamped with a Legacy version. — [TryHackMe help center](https://help.tryhackme.com/en/articles/10632551-big-changes-on-tryhackme-retired-three-learning-paths)
- Pre Security legacy page: new Pre Security starts earlier ("how computers work from the inside out"), adds modules on software fundamentals, intro coding, real-world attacks and defences; progress on shared modules preserved. — [Pre Security (Legacy) path](https://tryhackme.com/path/outline/presecuritylegacy) (via search-result snippet; direct fetch rate-limited)
- 2026 updates blog (22 Jul 2026): SEC0 (Pre Security certification) launched 25 Feb 2026, leads into SEC1; bundling saves 20%. — [TryHackMe 2026 updates](https://tryhackme.com/resources/blog/tryhackme-2026-updates-so-far-why-its-worth-it)
- Review (Jun 2026): "Cyber Security 101 absorbed Complete Beginner, Intro to Cyber Security, and parts of Cyber Defense"; next steps SOC Level 1, Jr Penetration Tester, or the newer AI Security path. — [Lateral Moves](https://lateralmoves.net/tryhackme-cyber-security-101-review/)
- Jr Penetration Tester rebuilt 21 May 2026: 89 rooms in 17 modules, 9-room Active Directory module, rewritten Web Security module, new CSRF room (full OWASP Top 10 2025 coverage), three capstone challenges. — [TryHackMe 2026 updates](https://tryhackme.com/resources/blog/tryhackme-2026-updates-so-far-why-its-worth-it)
- Free vs. paid: free tier covers part of Pre-Security and some Cyber Security 101; full path needs a subscription (~$14/month or less annually per the review). TryHackMe MAX launched 29 Jun 2026 above Premium (SOC Level 2, Red Teaming etc. moved to MAX); Cyber Security 101 not listed among MAX-only content. — [Lateral Moves](https://lateralmoves.net/tryhackme-cyber-security-101-review/); [TryHackMe 2026 updates](https://tryhackme.com/resources/blog/tryhackme-2026-updates-so-far-why-its-worth-it)

### Inferences
- Intended learner sequence: Pre Security (SEC0) -> Cyber Security 101 (SEC1) -> specialisation (SOC Level 1 / Jr Pen Tester / Security Engineer / AI Security).

### Gaps
- Discrepancy: the launch blog (Oct 2024) says old paths stay until further notice, while the help center says retirement date was 2 Apr 2025 (not necessarily contradictory; reflects the later actual retirement). The help center's own article revision history changed its title ("retiring" -> "retired"), and its 18 Feb 2026 date refers to the article edit, not the retirement.
- Exact Pre Security revamp date is 18 Feb (help center) vs. 25 Feb (SEC0 launch, blog); likely path revamp vs. certification launch (inference, not stated).
- Exact overlap rooms between Pre Security and Cyber Security 101 not enumerated in any source.

## Capstone/challenge rooms; progress, points, badges, streaks

### Takeaway
No in-path capstone room was identified in any source; the capstone is the separate paid SEC1 certification (EUR 131, 24-hour hands-on exam). Points, badges and streaks follow TryHackMe's platform-wide rules; progress is tracked per room/module/path with a certificate on completion.

### Cited Findings
- SEC1 is described as the capstone of the Cyber Security 101 path: 24-hour window, seven practical scenario-based sections (Red/Blue/Purple team), no multiple choice, one retake, instant results, 3-year validity, QR-verifiable certificate; price EUR 131 (bundle EUR 346 with SAL1 at EUR 301); a subscription is not required to purchase the exam. — [Official SEC1 certification page](https://tryhackme.com/certification/cyber-security-101); [Blog 28 Jan 2026](https://tryhackme.com/resources/blog/cyber-101-certification-a-practical-way-to-prove-youre-ready-for-cyber-security); [Help center: SEC1 training content](https://help.tryhackme.com/en/articles/13530807-sec1-training-content)
- Path completion yields a completion certificate (image shown in the learner's post). — [SecBurg](https://secburg.com/posts/tryhackme-completed-cybersecurity-101/); certificates remain viewable/downloadable in profile Certificates tab — [Help center](https://help.tryhackme.com/en/articles/10632551-big-changes-on-tryhackme-retired-three-learning-paths)
- Points: public rooms award points depending on difficulty; leaderboards require more than 100 points; monthly points reset at 23:59 GMT on the last day of the month and the #1 monthly rank gets a badge. — [Help center: Points explained](https://help.tryhackme.com/en/articles/6563910-points-explained) (via search summary; not fully fetched)
- Streaks: consecutive days answering questions successfully; can unlock badges, discount coupons, network lab access; streak freezes exist; 7-day window to contact support after losing a streak; streaks under 14 days not reset. — [Help center: How do streaks work](https://help.tryhackme.com/en/articles/6596150-how-do-streaks-work); [Streak freeze](https://help.tryhackme.com/en/articles/7843540-streak-freeze) (via search summary)
- Anti-cheating flags withhold points only for flagged questions; badges, streaks, completion unaffected. — [Help center: Anti-cheating](https://help.tryhackme.com/en/articles/15538210-anti-cheating-explained-securing-our-competitive-ranks) (via search summary)
- 31 Mar 2026: the "Top 1%" ranking was replaced by the Capability Score (1-100; Consistency, Relevance, Versatility, Depth; can decrease over time). — [TryHackMe 2026 updates](https://tryhackme.com/resources/blog/tryhackme-2026-updates-so-far-why-its-worth-it)

### Inferences
- Because the leaderboard "Top X%" has been replaced by Capability Score, older help articles about "Top X%" ranking may be partially outdated; the points-explained article may also have changed.

### Gaps
- No source confirmed per-path capstone rooms inside Cyber Security 101 (the reviewed repo and reviews list none; unlike the rebuilt Jr Pen Tester path which has three capstone challenges). Whether the "Blue" room acts as a capstone for Exploitation Basics is unconfirmed.
- Exact point values per room, current badge list for completing this path, and the current streak-freeze rules were not read from full pages.

## Recent changes and restructurings (2025-2026)

### Takeaway
Timeline: 21 Oct 2024 launch; 2 Apr 2025 old paths retired; 28 Jan 2026 SEC1 capstone certification; 18/25 Feb 2026 Pre Security revamp and SEC0; Mar-Jun 2026 platform changes (Capability Score, Jr Pen Tester rebuild, AI Security path, MAX tier); likely addition of OWASP Top 10 (2025) module to the path.

### Cited Findings
- 21 Oct 2024: launch (13 modules). — [TryHackMe blog](https://tryhackme.com/resources/blog/new-cyber-security-101-path)
- 2 Apr 2025: Complete Beginner, Intro to Cyber Security, Cyber Defense retired. — [Help center](https://help.tryhackme.com/en/articles/10632551-big-changes-on-tryhackme-retired-three-learning-paths)
- 28 Jan 2026: SEC1 certification launched as the path's capstone. — [TryHackMe 2026 updates](https://tryhackme.com/resources/blog/tryhackme-2026-updates-so-far-why-its-worth-it)
- 18 Feb 2026: Pre Security and SOC Level 1 revamped, legacy versions kept temporarily. — [Help center](https://help.tryhackme.com/en/articles/10632551-big-changes-on-tryhackme-retired-three-learning-paths)
- 25 Feb 2026: SEC0 launched. 25 Mar: SAL2. 31 Mar: Capability Score. 21 May: Jr Pen Tester rebuild. 29 May: AI Security path (5 modules, 25 rooms) and AI1. 29 Jun: MAX tier. — [TryHackMe 2026 updates](https://tryhackme.com/resources/blog/tryhackme-2026-updates-so-far-why-its-worth-it)
- The 2026 updates blog (covering to June) says nothing else about Cyber Security 101 content changes beyond SEC1. — [TryHackMe 2026 updates](https://tryhackme.com/resources/blog/tryhackme-2026-updates-so-far-why-its-worth-it)
- Module count increased from 13 (Feb 2025) to 14 (2026 reports), and OWASP Top 10 (2025) is the 14th module in the community-documented outline. — [SecBurg](https://secburg.com/posts/tryhackme-completed-cybersecurity-101/); [Aaron Adkins](https://aaronjadkins.com/posts/completed-tryhackmes-cyber-security-101-learning-path/); [GitHub list](https://github.com/Deeptig9138/CyberSecurity101---THM)

### Inferences
- Any change between July and 29 Oct 2026 is not covered by sources found (latest dated source is 22 Jul 2026, plus a post updated 16 Aug 2026).

### Gaps
- No official changelog entry for Cyber Security 101 module additions; nothing found for Aug-Oct 2026.
- The SEC1 help-center page's module topics (OS fundamentals, network traffic analysis, web app security, SOC, password attacks, malware analysis) differ from the path's module names; the mapping between exam domains and path modules is not documented.
