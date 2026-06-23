# DATA PRIVACY AGREEMENT (DPA) — TEMPLATE

> ⚠️ **DRAFT TEMPLATE — NOT LEGAL ADVICE.** Have a licensed attorney review and adapt before signing with any district. Many districts will require *their own* DPA or the SDPC National DPA instead — be ready to sign theirs. This is a clean starting point and a sign you're prepared. No notarization is required; this is signed by authorized representatives only.

**This Data Privacy Agreement ("Agreement")** is entered into by and between **[Your LLC legal name] d/b/a Speak ("Provider")**, operator of speakaac.org, and **[School District / LEA name] ("LEA")**, effective **[date]**.

## 1. Purpose & Scope
Provider offers Speak, a web-based augmentative and alternative communication (AAC) service. This Agreement governs Provider's collection, use, and protection of Student Data when the LEA uses the Service. Where this Agreement conflicts with the Provider's general Terms, this Agreement controls for Student Data.

## 2. Definitions
- **Student Data:** any personally identifiable information (PII) from education records, as defined by FERPA, plus any information collected about a student through the Service.
- **De-Identified Data:** data with all direct and indirect identifiers removed such that a student cannot reasonably be identified.

## 3. Data Ownership & Control
3.1 All Student Data is and remains the property of the LEA and/or the parent/student. The LEA retains full ownership and control.
3.2 Provider acts as a **"school official"** with a **"legitimate educational interest"** under FERPA (34 CFR § 99.31(a)(1)), performing a service under the LEA's direct control.
3.3 Provider will not use Student Data for any purpose other than providing the Service to the LEA.

## 4. Permitted Use; Prohibited Use
Provider SHALL:
- Use Student Data solely to provide and improve the Service for the LEA.
Provider SHALL NOT:
- Sell, rent, or trade Student Data.
- Use Student Data for targeted/behavioral advertising.
- Build a personal profile of a student except in furtherance of the educational purpose.
- Re-disclose Student Data except to subprocessors under Section 6 or as required by law (with notice to LEA where lawful).

## 5. Data Security
Provider maintains administrative, physical, and technical safeguards including: encryption in transit (TLS/HTTPS) and at rest; role-based access controls and row-level security; least-privilege access; and regular review. Provider limits Student Data collected to what is needed for the Service (data minimization).

## 6. Subprocessors
Provider uses the subprocessors in **Exhibit B** to deliver the Service. Provider imposes data-protection obligations on each subprocessor consistent with this Agreement and remains responsible for their performance. Provider will give the LEA notice of material changes to subprocessors.

## 7. Data Breach
Provider will notify the LEA without undue delay and within **[10] business days** of confirming a breach involving Student Data, will cooperate with the LEA's investigation and notification obligations, and will take prompt remedial action.

## 8. Data Return & Destruction
Upon termination or LEA request, Provider will, within **[30] days**, return and/or securely delete all Student Data (including from subprocessors), and certify destruction in writing on request. De-Identified Data may be retained for product improvement and research.

## 9. COPPA
For students under 13, Provider relies on the LEA to provide consent on behalf of parents (consistent with FTC guidance for educational use), uses such data solely for the educational purpose authorized by the LEA, and provides notice of its data practices.

## 10. Parent / Student Rights
Provider will support the LEA in fulfilling parent/student rights to access, review, correct, and request deletion of Student Data, as administered through the LEA.

## 11. Term & Termination
This Agreement remains in effect for the term of the underlying service agreement. Either party may terminate for material breach with **[30] days** written notice and opportunity to cure. Sections 3, 4, 7, and 8 survive termination.

## 12. Miscellaneous
Governing law: **State of Kansas.** This Agreement is signed by authorized representatives of each party; no notarization is required. It may be executed electronically and in counterparts.

---

**PROVIDER:** [Your LLC legal name] d/b/a Speak
By: ______________________  Name: Logan Snell  Title: [Member / Owner]  Date: ________

**LEA:** [District name]
By: ______________________  Name: __________  Title: __________  Date: ________

---

## EXHIBIT A — Student Data Elements Collected
- Account: provided name/username, provider (caregiver/SLP) email, tier.
- Usage logs: symbols/words selected, messages spoken, AI sentences generated, timestamps, session activity, optional communicator (patient) identifier set by the provider.
- NOT collected: no precise geolocation, no SSN, no biometric identifiers stored on Provider servers.

## EXHIBIT B — Subprocessors
| Subprocessor | Purpose | Data location |
|---|---|---|
| Supabase | Database / auth / storage | United States |
| Anthropic (Claude API) | AI sentence generation from selected words | United States |
| Netlify | Application hosting / serverless functions | United States |
| Stripe | Payment processing (no student data) | United States |

> Note: the AI feature transmits the words a user selects to Anthropic to generate a sentence. Obtain Anthropic's DPA and confirm no-training / no-retention terms; disclose this flow to the LEA.
