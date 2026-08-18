export const demoForms = [
  {
    name: "Developer Velocity & Tooling Survey",
    privacyMode: "encrypted",
    fields: [
      {
        key: "dev_name",
        label: "Developer Name",
        type: "text",
        required: true,
        description: "Your full name for record validation",
        privacy: "redacted_analyzable"
      },
      {
        key: "experience_years",
        label: "Years of Experience",
        type: "number",
        required: true,
        description: "Years of professional software engineering experience",
        privacy: "analyzable",
        config: { validation: { min: 0, max: 50 } }
      },
      {
        key: "primary_language",
        label: "Primary Language",
        type: "enum",
        required: true,
        description: "The coding language you spend most time in",
        privacy: "analyzable",
        config: { options: ["TypeScript", "JavaScript", "Python", "Go", "Rust", "C++"] }
      },
      {
        key: "ci_satisfaction",
        label: "CI/CD Satisfaction (1-5)",
        type: "number",
        required: true,
        description: "Rate your satisfaction with the build/deploy pipelines",
        privacy: "analyzable",
        config: { validation: { min: 1, max: 5 } }
      },
      {
        key: "ai_adoption",
        label: "AI Coding Assistant Usage",
        type: "enum",
        required: true,
        description: "How frequently you use generative coding tools",
        privacy: "analyzable",
        config: { options: ["Daily", "Weekly", "Rarely", "Never"] }
      },
      {
        key: "biggest_bottleneck",
        label: "What is your biggest bottleneck today?",
        type: "textarea",
        required: true,
        description: "Elaborate on what slows down your development cycle",
        privacy: "redacted_analyzable"
      }
    ],
    responses: [
      {
        dev_name: "Alice Smith",
        experience_years: 5,
        primary_language: "TypeScript",
        ci_satisfaction: 2,
        ai_adoption: "Daily",
        biggest_bottleneck: "Our CI/CD pipeline takes 25 minutes to run unit tests and bundle assets. We spend so much time waiting for green checks to pass on pull requests."
      },
      {
        dev_name: "Bob Johnson",
        experience_years: 12,
        primary_language: "Go",
        ci_satisfaction: 4,
        ai_adoption: "Weekly",
        biggest_bottleneck: "Refactoring legacy endpoints in backend services that completely lack unit test coverage. Whenever I update the logger or middleware, unrelated tests fail."
      },
      {
        dev_name: "Charlie Lee",
        experience_years: 2,
        primary_language: "Python",
        ci_satisfaction: 3,
        ai_adoption: "Daily",
        biggest_bottleneck: "Wrangling package dependencies and docker environments across our microservice mesh is very tedious. AI writes boilerplate fine, but environment debugging is painful."
      },
      {
        dev_name: "Diana Prince",
        experience_years: 8,
        primary_language: "Rust",
        ci_satisfaction: 1,
        ai_adoption: "Rarely",
        biggest_bottleneck: "Cargo compilation times for large workspace crates are extremely slow on local dev machines, and it gets worse when deploying inside staging docker layers."
      },
      {
        dev_name: "Evan Wright",
        experience_years: 4,
        primary_language: "TypeScript",
        ci_satisfaction: 4,
        ai_adoption: "Daily",
        biggest_bottleneck: "Too many synchronous alignment meetings and check-ins. I only get about 2 to 3 hours of uninterrupted coding flow time per day."
      },
      {
        dev_name: "Fiona Gallagher",
        experience_years: 7,
        primary_language: "C++",
        ci_satisfaction: 3,
        ai_adoption: "Never",
        biggest_bottleneck: "Completely outdated internal architecture documentation. I have to read the raw source code of core modules to understand how to integrate new data feeds."
      }
    ]
  },
  {
    name: "Customer Satisfaction & Product Feedback",
    privacyMode: "encrypted",
    fields: [
      {
        key: "customer_name",
        label: "Customer Name",
        type: "text",
        required: true,
        description: "Organization or enterprise name",
        privacy: "redacted_analyzable"
      },
      {
        key: "nps_rating",
        label: "NPS Rating (1-10)",
        type: "number",
        required: true,
        description: "How likely are you to recommend us to another team?",
        privacy: "analyzable",
        config: { validation: { min: 1, max: 10 } }
      },
      {
        key: "product_area",
        label: "Primary Area of Use",
        type: "enum",
        required: true,
        description: "Which part of the product is most critical to your workflow",
        privacy: "analyzable",
        config: { options: ["UI & Analytics Dashboard", "API Integration", "Billing & Subscriptions", "Data Synchronization"] }
      },
      {
        key: "feedback_details",
        label: "Please share details on your experience",
        type: "textarea",
        required: true,
        description: "Describe any feature gaps or performance issues",
        privacy: "redacted_analyzable"
      }
    ],
    responses: [
      {
        customer_name: "Stark Industries",
        nps_rating: 9,
        product_area: "API Integration",
        feedback_details: "The database query API is incredibly fast. We synced 10M secure transaction records in under 3 minutes. The documentation is pristine, though we'd appreciate webhook endpoints."
      },
      {
        customer_name: "Wayne Enterprises",
        nps_rating: 5,
        product_area: "UI & Analytics Dashboard",
        feedback_details: "The analytics dashboard feels slow when loading charts with more than 6 months of historical metrics. It frequently causes the browser tab to stutter and consume high memory."
      },
      {
        customer_name: "Oscorp Tech",
        nps_rating: 7,
        product_area: "Billing & Subscriptions",
        feedback_details: "The subscription management UI was confusing for mid-cycle seat upgrades. It was not clear if we would get prorated charges immediately or on the next billing date."
      },
      {
        customer_name: "Tyrell Corp",
        nps_rating: 10,
        product_area: "Data Synchronization",
        feedback_details: "The zero-knowledge encryption architecture is phenomenal. We are able to pass our strict financial compliance audits without any operational bottlenecks."
      },
      {
        customer_name: "Cyberdyne Systems",
        nps_rating: 4,
        product_area: "UI & Analytics Dashboard",
        feedback_details: "We require a dark mode theme option. Operating our consoles in low-light server environments and switching to this bright light interface is very straining for our operations team."
      },
      {
        customer_name: "Pied Piper",
        nps_rating: 8,
        product_area: "API Integration",
        feedback_details: "Super easy integration via the TypeScript SDK. Took us only 10 minutes to wire up. We are waiting on custom rate-limiting configuration features before expanding rollout."
      }
    ]
  }
];
