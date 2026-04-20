export const CLIENTS = [
  "Cognizant",
  "KPMG",
  "UST GAMA",
  "B2C",
  "Infosys",
  "Wipro",
  "Sogeti",
  "Talent 500",
];

export const SKILLS = [
  "Angular",
  "ASP.NET Core WebAPI",
  "Asp.net MVC",
  "C#",
  "C#-Selenium",
  "C++",
  "Capstone",
  "CSS",
  "Cucumber",
  "Cypress",
  "DevOps",
  "Django",
  "Docker",
  "DotNet",
  "DotNet-Angular",
  "DotNet-React",
  "DotNet-Selenium",
  "Flask",
  "Git",
  "Go Lang",
  "HTML",
  "HTML-CSS",
  "HTML-CSS-JS",
  "HTML-CSS-TS",
  "HTML-JS",
  "Java",
  "Java-Angular",
  "Java-Design Patterns",
  "Java-Hibernate",
  "Java-JDBC",
  "Java-JWT",
  "Java-Microservices",
  "Java-React",
  "Java-Selenium",
  "Java-Servlet",
  "Java-SpringBoot",
  "JS",
  "Junit",
  "Kotlin",
  "LA(C#,JS)",
  "LA(C,C++,Java)",
  "LA(C,Java)",
  "LA(Java,C#,Python)",
  "LA(Java,C,C++,Python,JS)",
  "LA(Java,Python,JS)",
  "LA(Java,SQL)",
  "LA(Python,Java,C,C++)",
  "Manual-Usecase",
  "MCQ",
  "MERN",
  "ML/AI",
  "NextJs",
  "Node(Express)",
  "Numpy-Pandas",
  "Oracle",
  "Other",
  "Playwright",
  "Postgres",
  "Pyspark",
  "Pytest",
  "Python",
  "Python-Selenium",
  "Pytorch",
  "React",
  "Rest Assured",
  "Rest Assured-Selenium",
  "Scala",
  "SQL",
  "TS",
];

export const STATUSES = [
  "Under Review",
  "Approved",
  "Closed program",
  "Pending",
  "Rejected",
  "Sent to CSDM",
];

export const TYPES = ["MFA", "SF", "MCQ"] as const;

export const MILESTONES = [
  "Mock",
  "Actual",
  "Re-attempt",
  "Assignment",
  "Assessment",
  "Demo",
  "Milestone",
];

export const GRADINGS = ["AutoGraded", "Manual", "AI-Autograded"] as const;

export const SKILL_ASSIST_OPTS = ["Yes", "No"];

export const LEARNING_PATH_OPTS = ["Yes", "No"];

export const STORAGE_KEY = "csp_v2";

export const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  Approved: {
    bg: "bg-green-50",
    text: "text-green-800",
    border: "border-green-400",
  },
  "Under Review": {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-400",
  },
  "Closed program": {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-400",
  },
  Pending: {
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-400",
  },
  Rejected: {
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-400",
  },
};
