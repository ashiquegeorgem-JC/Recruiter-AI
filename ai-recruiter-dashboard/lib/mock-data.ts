import type {
  Candidate,
  Stats,
  RankingRow,
  AnalyticsData,
  BehavioralSignal,
  MatchExplanation,
} from "./types";

// ─── Stats ───────────────────────────────────────────────────────────────────

export const mockStats: Stats = {
  totalCandidates: 2847,
  averageMatchScore: 73.4,
  topRankedCount: 142,
  highRiskCount: 38,
  shortlistedCount: 219,
  newThisWeek: 87,
  scoreChange: 4.2,
  riskChange: -2.1,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rng = (min: number, max: number, seed = 1) =>
  Math.floor((Math.abs(Math.sin(seed) * 9999) % (max - min + 1)) + min);

const statuses = [
  "new",
  "screening",
  "shortlisted",
  "interview",
  "offer",
  "rejected",
] as const;

const firstNames = [
  "Alex", "Jordan", "Morgan", "Taylor", "Casey", "Riley", "Avery", "Quinn",
  "Sage", "Rowan", "Hayden", "Drew", "Blake", "Reece", "Cameron", "Spencer",
  "Peyton", "Dakota", "Skylar", "Emerson", "Finley", "Harley", "Jamie",
  "Kendall", "Logan", "Madison", "Nolan", "Olivia", "Parker", "Reagan",
];

const lastNames = [
  "Chen", "Patel", "Kumar", "Williams", "Johnson", "Rodriguez", "Martinez",
  "Davis", "Wilson", "Anderson", "Taylor", "Thomas", "Harris", "Robinson",
  "Jackson", "White", "Thompson", "Garcia", "Lee", "Walker", "Hall", "Young",
  "Allen", "Scott", "King", "Wright", "Turner", "Torres", "Lewis", "Hill",
];

const titles = [
  "Senior Software Engineer",
  "ML Engineer",
  "Product Manager",
  "Data Scientist",
  "Full Stack Developer",
  "DevOps Engineer",
  "UX Designer",
  "Engineering Manager",
  "Backend Engineer",
  "AI Researcher",
  "Cloud Architect",
  "QA Engineer",
  "Mobile Developer",
  "Security Engineer",
  "Analytics Engineer",
];

const behavioralSignals: BehavioralSignal[] = [
  { trait: "Communication", score: 87, confidence: 92, sentiment: "positive" },
  { trait: "Leadership", score: 74, confidence: 85, sentiment: "positive" },
  { trait: "Teamwork", score: 91, confidence: 95, sentiment: "positive" },
  { trait: "Problem Solving", score: 83, confidence: 88, sentiment: "positive" },
  { trait: "Adaptability", score: 79, confidence: 82, sentiment: "positive" },
  { trait: "Initiative", score: 68, confidence: 77, sentiment: "neutral" },
  { trait: "Accountability", score: 88, confidence: 90, sentiment: "positive" },
  { trait: "Conflict Resolution", score: 62, confidence: 71, sentiment: "neutral" },
];

const matchExplanation: MatchExplanation = {
  overallScore: 88,
  dimensions: [
    {
      name: "Technical Skills",
      score: 92,
      weight: 0.35,
      description: "Strong alignment with required tech stack. Expertise in React, Node.js, and TypeScript verified.",
    },
    {
      name: "Experience Level",
      score: 85,
      weight: 0.25,
      description: "7 years of relevant experience — exceeds the 5-year requirement.",
    },
    {
      name: "Cultural Fit",
      score: 88,
      weight: 0.2,
      description: "Communication style and work ethic signals align well with company culture.",
    },
    {
      name: "Domain Knowledge",
      score: 80,
      weight: 0.15,
      description: "Solid SaaS and B2B product knowledge. Limited fintech-specific experience.",
    },
    {
      name: "Growth Potential",
      score: 91,
      weight: 0.05,
      description: "Consistent career progression with increasing scope and impact.",
    },
  ],
  strengths: [
    "Deep expertise in distributed systems",
    "Proven track record of shipping at scale",
    "Strong open-source contributions",
    "Excellent communication and documentation skills",
  ],
  gaps: [
    "Limited experience with Kubernetes at enterprise scale",
    "No direct fintech domain experience",
    "Manager experience limited to teams of 3",
  ],
  aiNarrative:
    "This candidate demonstrates exceptional technical breadth and depth, particularly in modern web technologies and cloud architecture. Their career trajectory shows consistent growth from individual contributor to tech lead roles. The primary risk factor is the gap in fintech-specific domain knowledge, which could be mitigated with structured onboarding. Overall, this candidate represents a high-value, low-risk hire with strong indicators of long-term retention.",
};

// ─── Top 100 Candidates ───────────────────────────────────────────────────────

export const mockTop100: Candidate[] = Array.from({ length: 100 }, (_, i) => {
  const seed = i + 1;
  const matchScore = Math.max(50, 100 - i * 0.4 - rng(0, 5, seed));
  const hireabilityScore = Math.max(45, matchScore - rng(2, 12, seed * 2));
  const riskScore = Math.min(95, rng(5, 30, seed * 3) + (i > 80 ? 20 : 0));
  const firstName = firstNames[i % firstNames.length];
  const lastName = lastNames[(i + 7) % lastNames.length];
  const title = titles[i % titles.length];

  return {
    id: `CND-${String(seed).padStart(4, "0")}`,
    rank: seed,
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
    phone: `+1 (${rng(200, 999, seed * 4)}) ${rng(100, 999, seed * 5)}-${rng(1000, 9999, seed * 6)}`,
    location: ["San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA", "Boston, MA", "Chicago, IL", "Denver, CO", "Miami, FL"][i % 8],
    title,
    yearsOfExperience: rng(2, 15, seed * 7),
    matchScore: Math.round(matchScore * 10) / 10,
    hireabilityScore: Math.round(hireabilityScore * 10) / 10,
    riskScore: Math.round(riskScore * 10) / 10,
    status: statuses[i % statuses.length],
    appliedDate: new Date(Date.now() - rng(1, 60, seed * 8) * 86400000).toISOString(),
    skills: [
      { name: "TypeScript", proficiency: rng(60, 100, seed * 9), yearsUsed: rng(1, 8, seed * 10), category: "technical" },
      { name: "React", proficiency: rng(55, 100, seed * 11), yearsUsed: rng(1, 7, seed * 12), category: "technical" },
      { name: "Node.js", proficiency: rng(50, 95, seed * 13), yearsUsed: rng(1, 6, seed * 14), category: "technical" },
      { name: "Python", proficiency: rng(40, 90, seed * 15), yearsUsed: rng(1, 8, seed * 16), category: "technical" },
      { name: "AWS", proficiency: rng(45, 95, seed * 17), yearsUsed: rng(1, 7, seed * 18), category: "tool" },
      { name: "System Design", proficiency: rng(50, 95, seed * 19), yearsUsed: rng(2, 10, seed * 20), category: "domain" },
      { name: "Communication", proficiency: rng(55, 100, seed * 21), yearsUsed: rng(2, 15, seed * 22), category: "soft" },
      { name: "Leadership", proficiency: rng(40, 95, seed * 23), yearsUsed: rng(1, 10, seed * 24), category: "soft" },
    ],
    careerHistory: [
      {
        company: ["Google", "Meta", "Apple", "Amazon", "Microsoft", "Stripe", "Airbnb", "Uber", "Netflix", "Spotify"][i % 10],
        role: title,
        startDate: new Date(Date.now() - rng(2, 5, seed) * 365 * 86400000).toISOString().split("T")[0],
        endDate: null,
        description: "Led cross-functional engineering initiatives and delivered high-impact features.",
        highlights: ["Reduced latency by 40%", "Grew team from 3 to 8 engineers", "Shipped 12 major features"],
      },
      {
        company: ["Salesforce", "Oracle", "IBM", "Twitter", "LinkedIn", "Pinterest", "Snap", "TikTok", "Shopify", "Twilio"][i % 10],
        role: "Software Engineer",
        startDate: new Date(Date.now() - rng(5, 9, seed) * 365 * 86400000).toISOString().split("T")[0],
        endDate: new Date(Date.now() - rng(2, 5, seed) * 365 * 86400000).toISOString().split("T")[0],
        description: "Built and maintained core platform infrastructure.",
        highlights: ["Improved build time by 60%", "Mentored 4 junior engineers"],
      },
    ],
    education: [
      {
        institution: ["MIT", "Stanford", "Carnegie Mellon", "UC Berkeley", "Georgia Tech", "Caltech", "Cornell", "Columbia"][i % 8],
        degree: i % 3 === 0 ? "Master of Science" : "Bachelor of Science",
        field: ["Computer Science", "Software Engineering", "Data Science", "Electrical Engineering"][i % 4],
        startYear: 2008 + (i % 8),
        endYear: 2012 + (i % 8),
        gpa: Math.round((3.2 + rng(0, 8, seed * 25) / 10) * 10) / 10,
        honors: i % 5 === 0 ? "Magna Cum Laude" : undefined,
      },
    ],
    behavioralSignals: behavioralSignals.map((s) => ({
      ...s,
      score: Math.min(100, Math.max(30, s.score + rng(-10, 10, seed * 26))),
      confidence: Math.min(100, Math.max(50, s.confidence + rng(-8, 8, seed * 27))),
    })),
    matchExplanation: {
      ...matchExplanation,
      overallScore: Math.round(matchScore),
      dimensions: matchExplanation.dimensions.map((d) => ({
        ...d,
        score: Math.min(100, Math.max(40, d.score + rng(-10, 10, seed * 28))),
      })),
    },
    summary: `${firstName} is a ${title.toLowerCase()} with ${rng(2, 15, seed * 7)} years of experience. Strong technical background with proven leadership capability and excellent communication skills. Highly recommended for fast-track evaluation.`,
  };
});

// ─── Rankings Table Rows ──────────────────────────────────────────────────────

export const mockRankingRows: RankingRow[] = mockTop100.map((c) => ({
  rank: c.rank,
  id: c.id,
  name: c.name,
  title: c.title,
  matchScore: c.matchScore,
  hireabilityScore: c.hireabilityScore,
  riskScore: c.riskScore,
  riskLevel:
    c.riskScore >= 70 ? "critical" : c.riskScore >= 50 ? "high" : c.riskScore >= 30 ? "medium" : "low",
  status: c.status,
  appliedDate: c.appliedDate,
}));

// ─── Analytics ────────────────────────────────────────────────────────────────

export const mockAnalytics: AnalyticsData = {
  skillDistribution: [
    { skill: "Python", count: 1842, avgProficiency: 76 },
    { skill: "TypeScript", count: 1621, avgProficiency: 74 },
    { skill: "React", count: 1544, avgProficiency: 79 },
    { skill: "AWS", count: 1389, avgProficiency: 70 },
    { skill: "Node.js", count: 1302, avgProficiency: 73 },
    { skill: "SQL", count: 1247, avgProficiency: 81 },
    { skill: "Docker", count: 1183, avgProficiency: 68 },
    { skill: "Machine Learning", count: 987, avgProficiency: 66 },
    { skill: "Kubernetes", count: 823, avgProficiency: 63 },
    { skill: "Go", count: 701, avgProficiency: 71 },
  ],
  experienceDistribution: [
    { range: "0–2 yrs", count: 412, percentage: 14.5 },
    { range: "2–5 yrs", count: 897, percentage: 31.5 },
    { range: "5–10 yrs", count: 1024, percentage: 36.0 },
    { range: "10+ yrs", count: 514, percentage: 18.0 },
  ],
  scoreHistogram: [
    { range: "0–10", count: 12, label: "0–10" },
    { range: "10–20", count: 28, label: "10–20" },
    { range: "20–30", count: 67, label: "20–30" },
    { range: "30–40", count: 142, label: "30–40" },
    { range: "40–50", count: 289, label: "40–50" },
    { range: "50–60", count: 487, label: "50–60" },
    { range: "60–70", count: 612, label: "60–70" },
    { range: "70–80", count: 543, label: "70–80" },
    { range: "80–90", count: 389, label: "80–90" },
    { range: "90–100", count: 278, label: "90–100" },
  ],
  recruiterActivity: Array.from({ length: 30 }, (_, i) => {
    const date = new Date(Date.now() - (29 - i) * 86400000);
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      reviews: 40 + Math.floor(Math.abs(Math.sin(i * 0.7) * 30)),
      shortlisted: 8 + Math.floor(Math.abs(Math.sin(i * 0.5) * 12)),
      interviews: 3 + Math.floor(Math.abs(Math.sin(i * 0.9) * 6)),
      offers: Math.floor(Math.abs(Math.sin(i * 1.1) * 3)),
    };
  }),
};
