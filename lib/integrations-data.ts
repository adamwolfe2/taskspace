// Comprehensive list of all Taskspace integrations
// Using Clearbit Logo API for actual colored brand logos: https://logo.clearbit.com/[domain]
export const integrations = [
  // Communication & Collaboration
  { name: "Slack", logo: "/logos/integrations/slack.png", category: "communication" },
  { name: "Microsoft Teams", logo: "https://logo.clearbit.com/microsoft.com", category: "communication" },
  { name: "Zoom", logo: "https://logo.clearbit.com/zoom.us", category: "communication" },
  { name: "Gmail", logo: "https://logo.clearbit.com/google.com", category: "communication" },
  { name: "Discord", logo: "https://logo.clearbit.com/discord.com", category: "communication" },
  { name: "Twilio", logo: "https://logo.clearbit.com/twilio.com", category: "communication" },

  // Project Management
  { name: "Asana", logo: "/logos/integrations/asana.jpg", category: "project-management" },
  { name: "Notion", logo: "https://logo.clearbit.com/notion.so", category: "project-management" },
  { name: "Airtable", logo: "https://logo.clearbit.com/airtable.com", category: "project-management" },
  { name: "Monday.com", logo: "https://logo.clearbit.com/monday.com", category: "project-management" },
  { name: "Jira", logo: "https://logo.clearbit.com/atlassian.com", category: "project-management" },
  { name: "Trello", logo: "https://logo.clearbit.com/trello.com", category: "project-management" },
  { name: "ClickUp", logo: "https://logo.clearbit.com/clickup.com", category: "project-management" },
  { name: "Linear", logo: "https://logo.clearbit.com/linear.app", category: "project-management" },
  { name: "Basecamp", logo: "https://logo.clearbit.com/basecamp.com", category: "project-management" },

  // CRM & Sales
  { name: "HubSpot", logo: "https://logo.clearbit.com/hubspot.com", category: "crm" },
  { name: "Salesforce", logo: "https://logo.clearbit.com/salesforce.com", category: "crm" },

  // Google Workspace
  { name: "Google Calendar", logo: "/logos/integrations/google-calendar.png", category: "productivity" },
  { name: "Google Drive", logo: "https://logo.clearbit.com/google.com", category: "productivity" },
  { name: "Google Sheets", logo: "https://logo.clearbit.com/google.com", category: "productivity" },
  { name: "Google Ads", logo: "https://logo.clearbit.com/google.com", category: "marketing" },

  // AI & Automation
  { name: "Claude", logo: "/logos/integrations/claude.png", category: "ai" },
  { name: "OpenAI", logo: "https://logo.clearbit.com/openai.com", category: "ai" },
  { name: "Zapier", logo: "https://logo.clearbit.com/zapier.com", category: "automation" },
  { name: "Make", logo: "https://logo.clearbit.com/make.com", category: "automation" },

  // Social Media
  { name: "Meta", logo: "https://logo.clearbit.com/meta.com", category: "social" },
  { name: "X (Twitter)", logo: "https://logo.clearbit.com/x.com", category: "social" },
  { name: "TikTok", logo: "https://logo.clearbit.com/tiktok.com", category: "social" },
  { name: "LinkedIn", logo: "https://logo.clearbit.com/linkedin.com", category: "social" },
  { name: "Facebook", logo: "https://logo.clearbit.com/facebook.com", category: "social" },
  { name: "Instagram", logo: "https://logo.clearbit.com/instagram.com", category: "social" },
  { name: "YouTube", logo: "https://logo.clearbit.com/youtube.com", category: "social" },

  // Payments
  { name: "Stripe", logo: "/logos/integrations/stripe.png", category: "payments" },
  { name: "PayPal", logo: "https://logo.clearbit.com/paypal.com", category: "payments" },

  // Storage
  { name: "Dropbox", logo: "https://logo.clearbit.com/dropbox.com", category: "storage" },
  { name: "OneDrive", logo: "https://logo.clearbit.com/microsoft.com", category: "storage" },
  { name: "Box", logo: "https://logo.clearbit.com/box.com", category: "storage" },

  // E-commerce
  { name: "Shopify", logo: "https://logo.clearbit.com/shopify.com", category: "ecommerce" },
  { name: "WooCommerce", logo: "https://logo.clearbit.com/woocommerce.com", category: "ecommerce" },

  // Marketing & Email
  { name: "Mailchimp", logo: "https://logo.clearbit.com/mailchimp.com", category: "marketing" },
  { name: "Resend", logo: "/logos/integrations/resend.png", category: "marketing" },
  { name: "SendGrid", logo: "https://logo.clearbit.com/sendgrid.com", category: "marketing" },

  // Support
  { name: "Intercom", logo: "https://logo.clearbit.com/intercom.com", category: "support" },
  { name: "Zendesk", logo: "https://logo.clearbit.com/zendesk.com", category: "support" },

  // Accounting
  { name: "QuickBooks", logo: "https://logo.clearbit.com/quickbooks.intuit.com", category: "accounting" },
  { name: "Xero", logo: "https://logo.clearbit.com/xero.com", category: "accounting" },

  // Developer Tools
  { name: "GitHub", logo: "https://logo.clearbit.com/github.com", category: "developer" },
  { name: "GitLab", logo: "https://logo.clearbit.com/gitlab.com", category: "developer" },
  { name: "Bitbucket", logo: "https://logo.clearbit.com/bitbucket.org", category: "developer" },

  // Design
  { name: "Figma", logo: "https://logo.clearbit.com/figma.com", category: "design" },
  { name: "Adobe", logo: "https://logo.clearbit.com/adobe.com", category: "design" },
  { name: "Canva", logo: "https://logo.clearbit.com/canva.com", category: "design" },

  // Scheduling
  { name: "Calendly", logo: "https://logo.clearbit.com/calendly.com", category: "scheduling" },

  // Monitoring
  { name: "Datadog", logo: "https://logo.clearbit.com/datadoghq.com", category: "monitoring" },
  { name: "Sentry", logo: "https://logo.clearbit.com/sentry.io", category: "monitoring" },
]

export const agentUseCases = {
  marketing: [
    { logo: "https://logo.clearbit.com/mailchimp.com", title: "Create and send bulk campaigns", description: "Automate multi-channel campaigns across email, SMS, and social" },
    { logo: "https://logo.clearbit.com/meta.com", title: "Generate ad copy and creatives", description: "AI-powered ad creation for Meta, Google, and TikTok" },
    { logo: "/logos/integrations/resend.png", title: "Draft email campaign outlines", description: "Create compelling email sequences with AI" },
    { logo: "/logos/integrations/google-calendar.png", title: "Compile ROI dashboards", description: "Automated reporting across all marketing channels" },
    { logo: "/logos/integrations/claude.png", title: "AI-POV audience insight", description: "Deep audience analysis and segmentation" },
  ],
  operations: [
    { logo: "https://logo.clearbit.com/gmail.com", title: "Automate email triage", description: "Smart email categorization and routing" },
    { logo: "https://logo.clearbit.com/notion.so", title: "Research and create briefs through docs", description: "Automated research compilation and documentation" },
    { logo: "https://logo.clearbit.com/airtable.com", title: "Measure and create through data", description: "Data-driven decision making and reporting" },
    { logo: "/logos/integrations/asana.jpg", title: "Track and suggest team KPIs", description: "Real-time KPI monitoring and optimization" },
    { logo: "https://logo.clearbit.com/dropbox.com", title: "Organize and clean data files", description: "Automated data management and cleanup" },
  ],
  sales: [
    { logo: "https://logo.clearbit.com/salesforce.com", title: "Review demo and draft proposals", description: "AI-generated proposals based on discovery calls" },
    { logo: "/logos/integrations/slack.png", title: "Assess deal from chat logs", description: "Deal intelligence from conversation analysis" },
    { logo: "https://logo.clearbit.com/hubspot.com", title: "Send personalized outreach emails", description: "Hyper-personalized outbound at scale" },
    { logo: "/logos/integrations/google-calendar.png", title: "Track actions and perform calls", description: "Automated follow-ups and call scheduling" },
    { logo: "/logos/integrations/stripe.png", title: "Close deals and process payments", description: "Automated payment processing and invoice generation" },
  ],
}
