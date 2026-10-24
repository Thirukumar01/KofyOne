/**
 * KofyOne - Default Canonical Legal & Site Pages
 *
 * Specific to KofyOne:
 * - Student resource discovery platform for Microsoft, AWS, Google, and developer tools.
 * - Accurately documents authentication (bcrypt security questions, HTTP-only cookies).
 * - Documents Microsoft Contributor ID (wt.mc_id) tracking parameters.
 * - Disclaims official affiliation with third-party cloud providers.
 * - Unknown placeholders are explicitly marked with square brackets (e.g., [support@kofyone.com]).
 */

import type { SitePage } from '@/types/legal';

export const DEFAULT_LEGAL_PAGES: Record<string, SitePage> = {
  terms: {
    slug: 'terms',
    title: 'Terms & Conditions',
    summary: 'The terms governing your access to and use of the KofyOne discovery platform.',
    is_published: true,
    published_at: '2026-10-24T00:00:00.000Z',
    updated_at: '2026-10-24T00:00:00.000Z',
    content: `# Terms & Conditions

**Last Updated:** October 24, 2026  
**Platform:** KofyOne (Student Technology Resource Discovery Platform)

Welcome to **KofyOne**. These Terms and Conditions ("Terms") govern your access to and use of the KofyOne website, directory, personalized features, and related services (collectively, the "Platform"). By accessing or using KofyOne, you agree to be bound by these Terms. If you do not agree with any part of these Terms, please do not use the Platform.

---

### 1. Purpose and Scope of KofyOne

KofyOne is an independent, student-focused educational resource directory. Our mission is to help students, aspiring developers, educators, and technology enthusiasts discover official learning portals, cloud credits, developer software, and certification training paths across Microsoft, AWS, Google Cloud, GitHub, and independent developer platforms.

KofyOne provides catalog listings, direct links, and descriptive overviews of third-party educational offerings. **KofyOne is an independent community discovery project and is not owned, operated, endorsed, or affiliated with Microsoft Corporation, Amazon Web Services, Google LLC, or GitHub Inc.**

---

### 2. User Accounts and Security

1. **Eligibility:** The Platform is open to students and general learners worldwide. Where local law requires minimum age thresholds or parental consent for online account registration, users must satisfy those prerequisites.
2. **Account Credentials:** When creating an account, you agree to provide truthful and accurate information (email and unique username).
3. **Password and Security Question:** You are responsible for safeguarding your password and account credentials. KofyOne utilizes salted cryptographic hashes (bcrypt) for self-service security recovery answers. Never share your recovery answers or account access credentials with others.
4. **Account Termination:** You may delete your account at any time via your Security Settings dashboard. KofyOne reserves the right to suspend or terminate accounts that violate these Terms or compromise platform integrity.

---

### 3. Acceptable Use and Prohibited Activities

You agree to use KofyOne solely for lawful, educational, and discovery purposes. You agree **not** to:
- Attempt to gain unauthorized access to administrative portals, underlying database servers, or other user accounts.
- Deploy automated crawlers, scrapers, bots, or extraction scripts against KofyOne without prior written permission.
- Transmit malicious code, viruses, or exploit payloads against the Platform or any connected service.
- Use KofyOne to distribute spam, unauthorized advertising, or fraudulent material.
- Impersonate any person, student ambassador, or organization, or falsely claim affiliation with KofyOne.
- Interfere with the normal operation, network infrastructure, or availability of the Platform.

---

### 4. External Links, Redirections, and Third-Party Services

1. **Third-Party Offerings:** KofyOne contains links and redirections (e.g., via \`/go/[slug]\`) to external websites, documentation, and cloud resources.
2. **Independent Policies:** Once you leave KofyOne, external platforms operate under their own independent terms of service and privacy policies. KofyOne does not control, supervise, or assume responsibility for external content, pricing, platform availability, student verification procedures (e.g., SheerID), or software downloads.
3. **Tracking & Contributor IDs:** For select Microsoft student programs and learning paths, KofyOne may attach educational contributor tracking parameters (\`wt.mc_id\`) to official URLs to attribute educational reach and community engagement. These tracking parameters do not alter the pricing or educational content of the external resource.

---

### 5. Intellectual Property and Content Ownership

1. **Platform Content:** The KofyOne name, brand identity, logo assets, UI design, curated metadata, and website source code are proprietary to the KofyOne project and protected by intellectual property laws.
2. **Third-Party Trademarks:** Microsoft, Azure, AWS, Google Cloud, GitHub, Visual Studio, and other brand names or logos referenced in resource listings are trademarks of their respective owners. Their inclusion in the KofyOne directory is for identification and reference purposes only and does not imply sponsorship or endorsement.

---

### 6. Disclaimer of Warranties

**KofyOne is provided strictly on an "AS IS" and "AS AVAILABLE" basis.** To the fullest extent permitted by applicable law, KofyOne disclaims all warranties of any kind, whether express, implied, statutory, or otherwise, including but not limited to:
- Guarantees that external educational offers, student free tiers, or discount codes remain active or available.
- Warranties that the Platform will operate uninterrupted, error-free, or free of harmful components.
- The completeness, reliability, or accuracy of descriptive summaries of third-party platforms.

---

### 7. Limitation of Liability

To the maximum extent permitted under applicable law, in no event shall KofyOne, its developers, or its contributors be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, loss of anticipated savings, or academic interruption arising out of or related to your use of or inability to use the Platform.

---

### 8. Changes to These Terms

We may update or revise these Terms from time to time to reflect platform improvements, new feature additions, or regulatory updates. When changes are made, the "Last Updated" date at the top of this document will be revised. Continued use of KofyOne after revisions indicates acceptance of the updated Terms.

---

### 9. Contact Information

If you have questions, feedback, or concerns regarding these Terms and Conditions, please contact us at:
- **Email:** [support@kofyone.com] *(Pending official domain verification)*
- **Support Portal:** Visit our [Contact & Support](/contact) page
- **Project Repository:** [https://github.com/kofyone](https://github.com/kofyone)
`,
  },

  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy',
    summary: 'How KofyOne collects, uses, protects, and handles your personal information.',
    is_published: true,
    published_at: '2026-10-24T00:00:00.000Z',
    updated_at: '2026-10-24T00:00:00.000Z',
    content: `# Privacy Policy

**Last Updated:** October 24, 2026  
**Platform:** KofyOne (Student Technology Resource Discovery Platform)

Your privacy is paramount to us at **KofyOne**. This Privacy Policy explains what information we collect when you visit or interact with our platform, how that information is processed and secured, and your rights regarding your personal data.

KofyOne is committed to transparency. We do not sell user data, we do not run third-party advertising networks, and we strictly minimize data collection to what is necessary to deliver student resource discovery.

---

### 1. Information We Collect

We collect information only in the following contexts:

#### A. Account Information (For Registered Users)
When you register for an optional KofyOne user account, we collect:
- **Email Address:** Used for authentication, session verification, and account recovery.
- **Username:** A public display handle (3–30 characters, alphanumeric + underscore).
- **Full Name (Optional):** Used for personalizing your dashboard interface.
- **Security Recovery Answers:** We offer self-service account recovery via three predefined security questions. **Security answers are normalized and cryptographically hashed using bcrypt with a unique salt before storage. Plaintext security answers are never stored in our database, never written to log files, and never transmitted back to the browser.**

#### B. Personalization & Resource Interaction Data
When logged into an account, we store:
- **Saved Favorites:** Resource cards you explicitly bookmark for quick access.
- **Recently Viewed Resources:** A local history of resources you have recently explored to facilitate returning to learning paths.

#### C. Technical & Session Data
- **Authentication Cookies:** We use secure, HTTP-only session cookies managed by Supabase SSR (\`@supabase/ssr\`) to maintain authenticated sessions without exposing sensitive tokens to browser \`localStorage\`.
- **Server Access Logs:** Our web servers log standard HTTP request metadata (such as IP address, request method, user-agent, and status codes) for system maintenance, rate limiting, and DDoS defense.

#### D. What We DO NOT Collect
- **No Payment Information:** KofyOne is a free resource directory. We do not process, collect, or store credit cards, bank accounts, or billing information.
- **No Plaintext Passwords:** Passwords are never known to KofyOne; they are cryptographically hashed by Supabase Auth using industry-standard hashing algorithms.

---

### 2. How We Use Your Information

We process collected information strictly for the following purposes:
1. **Providing Platform Functionality:** Authenticating your identity, maintaining your login session, and rendering your saved favorites and recently viewed items.
2. **Account Security & Rate Limiting:** Protecting accounts against brute-force password guessing and automated credential stuffing using progressive lockout mechanisms.
3. **Platform Improvement:** Analyzing aggregated, anonymized trends (e.g., most popular resource categories) to expand the platform's catalog of useful student tools.
4. **Security Question Recovery:** Validating hashed recovery answers when a user initiates a password reset without requiring immediate third-party email delivery.

---

### 3. Third-Party Services and Data Processors

KofyOne relies on selected technical infrastructure partners to deliver platform functionality:

- **Supabase (Database & Authentication):** Houses the PostgreSQL database and managed authentication services under strict Row Level Security (RLS) policies.
- **Microsoft & Google (Optional OAuth):** If you choose to sign in via Microsoft Entra ID or Google OAuth, your email and name are securely retrieved via standard OAuth 2.0 PKCE flow.
- **External Resource Providers:** When you click out to an external link (such as Microsoft Learn or AWS Skill Builder), you interact directly with that third-party platform under their independent privacy policies.

---

### 4. Data Security and Storage Practices

We implement defense-in-depth security measures to protect your information:
- **Row Level Security (RLS):** All user-specific tables (such as favorites, history, and roles) enforce database-level access control. Users cannot read or modify another user's records.
- **HTTPS Encryption:** All client-to-server and server-to-database communications are encrypted in transit using modern TLS.
- **Zero Plaintext Sensitive Fields:** Passwords and security recovery answers are stored strictly as irreversible cryptographic hashes.
- **Secure Cookies:** Session tokens are stored in \`HttpOnly\`, \`Secure\`, and \`SameSite=Lax\` cookies.

---

### 5. Your Rights and Choices

You have full control over your personal information on KofyOne:
- **Access and Review:** You can view your account details and profile information at any time in your [Profile](/profile) page.
- **Update Information:** You can update your display name and preferred learning platform in your account settings.
- **Account Deletion:** You can permanently delete your KofyOne account and all associated data at any time via [Security Settings](/settings/security). Upon deletion, your profile, roles, favorites, and recent history are permanently removed.

---

### 6. Updates to This Privacy Policy

We may periodically revise this Privacy Policy to reflect technical updates, legal requirements, or platform enhancements. Revisions will be posted on this page with an updated "Last Updated" date.

---

### 7. Privacy Questions and Contact

For privacy-related inquiries, data requests, or feedback, please contact:
- **Privacy Lead:** [privacy@kofyone.com] *(Pending official domain verification)*
- **Contact Form:** [Contact & Support](/contact)
`,
  },

  about: {
    slug: 'about',
    title: 'About KofyOne',
    summary: 'The story, mission, and guiding principles behind KofyOne.',
    is_published: true,
    published_at: '2026-10-24T00:00:00.000Z',
    updated_at: '2026-10-24T00:00:00.000Z',
    content: `# About KofyOne

**Mission:** Empowering every student to discover official tech learning, cloud credits, and developer tools without friction.

---

### Why KofyOne Exists

Technology companies offer incredible opportunities for students and aspiring developers: free cloud computing credits, industry certifications, subsidized developer tools, interactive sandboxes, and world-class AI models.

However, these resources are often scattered across hundreds of separate subdomains, partner portals, and obscure documentation pages. Students frequently miss out on thousands of dollars in learning credits simply because they don't know where to look.

**KofyOne** was created to solve this problem:
1. **Centralized Discovery:** Curating verified student programs and learning pathways in one unified, searchable directory.
2. **Multi-Provider Coverage:** Bringing together Microsoft Learn, Azure for Students, AWS Skill Builder, Google Cloud Skills Boost, GitHub Student Pack, and AI tools side-by-side.
3. **Zero Noise:** Providing direct, verified links without paywalls, sponsored clutter, or misleading advertisements.
4. **Student-First Features:** Offering bookmarking, personal learning history, and category filtering to help you organize your upskilling journey.

---

### Our Core Values

- **Educational Equity:** Technology learning resources should be accessible to all students regardless of background or financial means.
- **Accuracy & Transparency:** We clearly state what each resource provides, whether it is free or requires student verification, and who provides it.
- **Independence:** KofyOne is built as an independent community directory. We do not represent any single tech giant, and we evaluate resources based purely on their value to students.
- **Privacy by Design:** We do not track you across the web, sell your contact details, or monetize your activity.

---

### The Platform Ecosystem

KofyOne organizes resources into clear domains:
- **Cloud Infrastructure:** Sandbox environments, serverless computing, and student credit allocations.
- **Artificial Intelligence:** Foundations in machine learning, generative AI, model APIs, and prompt engineering.
- **Developer Tools:** Code editors, version control systems, developer toolkits, and student packs.
- **Certifications & Curricula:** Structured learning paths designed to prepare students for recognized technical credentials.

---

### Join the Community

KofyOne is continuously growing. We welcome student ambassadors, educators, and community members to suggest new student-friendly resources, report broken links, or collaborate on open technology initiatives.

Get in touch with us via our [Contact Page](/contact) or explore our catalog on the [Resources](/resources) directory.
`,
  },

  contact: {
    slug: 'contact',
    title: 'Contact & Support',
    summary: 'Get in touch with the KofyOne team for support, suggestions, or community partnerships.',
    is_published: true,
    published_at: '2026-10-24T00:00:00.000Z',
    updated_at: '2026-10-24T00:00:00.000Z',
    content: `# Contact & Support

We are here to help! Whether you are a student encountering an issue, an educator with questions, or someone who wants to suggest a new free technology resource for the catalog, we'd love to hear from you.

---

### Ways to Connect

#### 1. Official Support Inquiries
For general questions, platform feedback, or help with your KofyOne account:
- **Support Email:** [support@kofyone.com] *(Pending official domain setup)*
- **Administrative Contact:** [admin@kofyone.com]
- **Response Time:** We strive to respond to all student and community inquiries within 1–2 business days.

#### 2. Resource Suggestions & Corrections
Know an incredible student program or free cloud tier that we haven't listed yet? Or found a link that needs updating?
- Send us a message via the form below with the resource name, provider, and official URL.
- We will review and verify the submission for inclusion in our catalog.

#### 3. Community & Open Source
- Follow project updates and report technical issues on our [GitHub Organization](https://github.com/kofyone).

---

### Frequently Asked Questions

**Q: Does KofyOne charge students for any of the listed resources?**  
A: No. KofyOne is completely free to use. All resources listed in our directory are free educational offerings, student packs, or developer free tiers provided by their respective platforms.

**Q: Can I request deletion of my KofyOne account?**  
A: Yes. You can delete your account instantly at any time from your [Security Settings](/settings/security) dashboard.

**Q: Are you officially affiliated with Microsoft, AWS, or Google?**  
A: No. KofyOne is an independent discovery platform designed to help students discover and navigate third-party technology resources.
`,
  },
};
