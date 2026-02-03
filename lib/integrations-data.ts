// List of Taskspace integrations - ONLY showing uploaded logos
export const integrations = [
  // Communication & Collaboration
  { name: "Slack", logo: "/integrations/slack-svgrepo-com.svg", category: "communication" },
  { name: "Microsoft Teams", logo: "/integrations/icons8-microsoft-teams.svg", category: "communication" },
  { name: "Zoom", logo: "/integrations/icons8-zoom.svg", category: "communication" },
  { name: "Gmail", logo: "/integrations/gmail.svg", category: "communication" },
  { name: "Outlook", logo: "/integrations/icons8-microsoft-outlook-2019.svg", category: "communication" },
  { name: "Telegram", logo: "/integrations/telegram-communication-chat-interaction-network-connection-svgrepo-com.svg", category: "communication" },

  // Project Management
  { name: "Asana", logo: "/integrations/asana.svg", category: "project-management" },
  { name: "Notion", logo: "/integrations/notion.svg", category: "project-management" },
  { name: "Airtable", logo: "/integrations/airtable-svgrepo-com.svg", category: "project-management" },
  { name: "Linear", logo: "/integrations/linear.svg", category: "project-management" },

  // CRM & Sales
  { name: "HubSpot", logo: "/integrations/hubspot-svgrepo-com.svg", category: "crm" },
  { name: "Salesforce", logo: "/integrations/salesforce.svg", category: "crm" },
  { name: "Apollo", logo: "/integrations/apollo.svg", category: "crm" },

  // Google Workspace
  { name: "Google Calendar", logo: "/integrations/google-calendar-svgrepo-com.svg", category: "productivity" },
  { name: "Google Drive", logo: "/integrations/google-drive-svgrepo-com.svg", category: "productivity" },
  { name: "Google Sheets", logo: "/integrations/gsheet-document-svgrepo-com.svg", category: "productivity" },
  { name: "Google Docs", logo: "/integrations/google-docs-svgrepo-com.svg", category: "productivity" },
  { name: "Google Ads", logo: "/integrations/google-ads-svgrepo-com.svg", category: "marketing" },
  { name: "Google Search Console", logo: "/integrations/search-console-icon-2025-1.svg", category: "marketing" },

  // AI & Automation
  { name: "Claude", logo: "/logos/integrations/claude.png", category: "ai" },
  { name: "OpenAI", logo: "/integrations/openai-svgrepo-com.svg", category: "ai" },

  // Social Media
  { name: "Meta", logo: "/integrations/meta-color.svg", category: "social" },
  { name: "X (Twitter)", logo: "/integrations/X_idJxGuURW1_0.svg", category: "social" },
  { name: "LinkedIn", logo: "/integrations/linkedin.svg", category: "social" },
  { name: "Instagram", logo: "/integrations/icons8-instagram.svg", category: "social" },
  { name: "Pinterest", logo: "/integrations/icons8-pinterest.svg", category: "social" },
  { name: "Reddit", logo: "/integrations/reddit-4.svg", category: "social" },

  // Payments
  { name: "Stripe", logo: "/logos/integrations/stripe.png", category: "payments" },

  // E-commerce & Marketing
  { name: "Shopify", logo: "/integrations/shopify.svg", category: "ecommerce" },
  { name: "Klaviyo", logo: "/integrations/klaviyo.svg", category: "marketing" },
  { name: "Resend", logo: "/logos/integrations/resend.png", category: "marketing" },
  { name: "Typeform", logo: "/integrations/typeform.svg", category: "marketing" },

  // Developer Tools
  { name: "GitHub", logo: "/integrations/github.svg", category: "developer" },
  { name: "Sentry", logo: "/integrations/Sentry_idovIhtf_y_0.svg", category: "developer" },

  // Design & Content
  { name: "Webflow", logo: "/integrations/Webflow_id2IyfqSKv_0.svg", category: "design" },

  // Scheduling
  { name: "Calendly", logo: "/integrations/calendly.svg", category: "scheduling" },
]

export const agentUseCases = {
  marketing: [
    { logo: "/integrations/klaviyo.svg", title: "Create and send bulk campaigns", description: "Automate multi-channel campaigns across email, SMS, and social" },
    { logo: "/integrations/meta-color.svg", title: "Generate ad copy and creatives", description: "AI-powered ad creation for Meta, Google, and TikTok" },
    { logo: "/logos/integrations/resend.png", title: "Draft email campaign outlines", description: "Create compelling email sequences with AI" },
    { logo: "/integrations/google-ads-svgrepo-com.svg", title: "Compile ROI dashboards", description: "Automated reporting across all marketing channels" },
    { logo: "/logos/integrations/claude.png", title: "AI-POV audience insight", description: "Deep audience analysis and segmentation" },
  ],
  operations: [
    { logo: "/integrations/gmail.svg", title: "Automate email triage", description: "Smart email categorization and routing" },
    { logo: "/integrations/notion.svg", title: "Research and create briefs through docs", description: "Automated research compilation and documentation" },
    { logo: "/integrations/airtable-svgrepo-com.svg", title: "Measure and create through data", description: "Data-driven decision making and reporting" },
    { logo: "/integrations/asana.svg", title: "Track and suggest team KPIs", description: "Real-time KPI monitoring and optimization" },
    { logo: "/integrations/google-drive-svgrepo-com.svg", title: "Organize and clean data files", description: "Automated data management and cleanup" },
  ],
  sales: [
    { logo: "/integrations/salesforce.svg", title: "Review demo and draft proposals", description: "AI-generated proposals based on discovery calls" },
    { logo: "/integrations/slack-svgrepo-com.svg", title: "Assess deal from chat logs", description: "Deal intelligence from conversation analysis" },
    { logo: "/integrations/hubspot-svgrepo-com.svg", title: "Send personalized outreach emails", description: "Hyper-personalized outbound at scale" },
    { logo: "/integrations/calendly.svg", title: "Track actions and perform calls", description: "Automated follow-ups and call scheduling" },
    { logo: "/logos/integrations/stripe.png", title: "Close deals and process payments", description: "Automated payment processing and invoice generation" },
  ],
}
