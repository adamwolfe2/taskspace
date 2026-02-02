// Comprehensive list of all Taskspace integrations
export const integrations = [
  // Communication & Collaboration
  { name: "Slack", logo: "/integrations/slack-svgrepo-com.svg", category: "communication" },
  { name: "Microsoft Teams", logo: "/integrations/microsoft.svg", category: "communication" },
  { name: "Zoom", logo: "/integrations/icons8-zoom.svg", category: "communication" },
  { name: "Gmail", logo: "/integrations/gmail.svg", category: "communication" },
  { name: "Outlook", logo: "/integrations/icons8-microsoft-outlook-2019.svg", category: "communication" },

  // Project Management
  { name: "Asana", logo: "/integrations/asana.svg", category: "project-management" },
  { name: "Notion", logo: "/integrations/notion.svg", category: "project-management" },
  { name: "Airtable", logo: "/integrations/airtable-svgrepo-com.svg", category: "project-management" },
  { name: "TikTok", logo: "/integrations/tiktok.svg", category: "social" },

  // CRM & Sales
  { name: "HubSpot", logo: "/integrations/hubspot-svgrepo-com.svg", category: "crm" },
  { name: "Instantly", logo: "/integrations/instantly.webp", category: "sales" },

  // Google Workspace
  { name: "Google Calendar", logo: "/integrations/google-calendar-svgrepo-com.svg", category: "productivity" },
  { name: "Google Drive", logo: "/integrations/icons8-google-drive.svg", category: "productivity" },
  { name: "Google Sheets", logo: "/integrations/gsheet-document-svgrepo-com.svg", category: "productivity" },
  { name: "Google Ads", logo: "/integrations/google-ads-svgrepo-com.svg", category: "marketing" },
  { name: "Google Search Console", logo: "/integrations/search-console-icon-2025-1.svg", category: "analytics" },

  // AI & Automation
  { name: "OpenAI", logo: "/integrations/openai-svgrepo-com.svg", category: "ai" },
  { name: "Meta", logo: "/integrations/meta.svg", category: "marketing" },
  { name: "X (Twitter)", logo: "/integrations/X_id.IxGuIRW1_0.svg", category: "social" },

  // Additional common integrations (using placeholder paths for now)
  { name: "Salesforce", logo: "/integrations/salesforce.svg", category: "crm" },
  { name: "Monday.com", logo: "/integrations/monday.svg", category: "project-management" },
  { name: "Jira", logo: "/integrations/jira.svg", category: "project-management" },
  { name: "Trello", logo: "/integrations/trello.svg", category: "project-management" },
  { name: "ClickUp", logo: "/integrations/clickup.svg", category: "project-management" },
  { name: "Linear", logo: "/integrations/linear.svg", category: "project-management" },
  { name: "Basecamp", logo: "/integrations/basecamp.svg", category: "project-management" },

  { name: "Stripe", logo: "/integrations/stripe.svg", category: "payments" },
  { name: "PayPal", logo: "/integrations/paypal.svg", category: "payments" },

  { name: "Dropbox", logo: "/integrations/dropbox.svg", category: "storage" },
  { name: "Box", logo: "/integrations/box.svg", category: "storage" },
  { name: "OneDrive", logo: "/integrations/onedrive.svg", category: "storage" },

  { name: "Zapier", logo: "/integrations/zapier.svg", category: "automation" },
  { name: "Make", logo: "/integrations/make.svg", category: "automation" },
  { name: "IFTTT", logo: "/integrations/ifttt.svg", category: "automation" },

  { name: "Shopify", logo: "/integrations/shopify.svg", category: "ecommerce" },
  { name: "WooCommerce", logo: "/integrations/woocommerce.svg", category: "ecommerce" },
  { name: "BigCommerce", logo: "/integrations/bigcommerce.svg", category: "ecommerce" },

  { name: "Mailchimp", logo: "/integrations/mailchimp.svg", category: "marketing" },
  { name: "SendGrid", logo: "/integrations/sendgrid.svg", category: "marketing" },
  { name: "Intercom", logo: "/integrations/intercom.svg", category: "support" },
  { name: "Zendesk", logo: "/integrations/zendesk.svg", category: "support" },
  { name: "Freshdesk", logo: "/integrations/freshdesk.svg", category: "support" },

  { name: "QuickBooks", logo: "/integrations/quickbooks.svg", category: "accounting" },
  { name: "Xero", logo: "/integrations/xero.svg", category: "accounting" },

  { name: "LinkedIn", logo: "/integrations/linkedin.svg", category: "social" },
  { name: "Facebook", logo: "/integrations/facebook.svg", category: "social" },
  { name: "Instagram", logo: "/integrations/instagram.svg", category: "social" },
  { name: "YouTube", logo: "/integrations/youtube.svg", category: "social" },

  { name: "GitHub", logo: "/integrations/github.svg", category: "developer" },
  { name: "GitLab", logo: "/integrations/gitlab.svg", category: "developer" },
  { name: "Bitbucket", logo: "/integrations/bitbucket.svg", category: "developer" },

  { name: "Figma", logo: "/integrations/figma.svg", category: "design" },
  { name: "Adobe", logo: "/integrations/adobe.svg", category: "design" },
  { name: "Canva", logo: "/integrations/canva.svg", category: "design" },

  { name: "Calendly", logo: "/integrations/calendly.svg", category: "scheduling" },
  { name: "Cal.com", logo: "/integrations/cal.svg", category: "scheduling" },

  { name: "Datadog", logo: "/integrations/datadog.svg", category: "monitoring" },
  { name: "Sentry", logo: "/integrations/sentry.svg", category: "monitoring" },

  { name: "Twilio", logo: "/integrations/twilio.svg", category: "communication" },
  { name: "Discord", logo: "/integrations/discord.svg", category: "communication" },
]

export const agentUseCases = {
  marketing: [
    { icon: "📊", title: "Create and send bulk campaigns", description: "Automate multi-channel campaigns across email, SMS, and social" },
    { icon: "🎯", title: "Generate ad copy and creatives", description: "AI-powered ad creation for Meta, Google, and TikTok" },
    { icon: "📧", title: "Draft email campaign outlines", description: "Create compelling email sequences with AI" },
    { icon: "📈", title: "Compile ROI dashboards", description: "Automated reporting across all marketing channels" },
    { icon: "🤖", title: "AI-POV audience insight", description: "Deep audience analysis and segmentation" },
  ],
  operations: [
    { icon: "✅", title: "Automate email triage", description: "Smart email categorization and routing" },
    { icon: "📋", title: "Research and create briefs through docs", description: "Automated research compilation and documentation" },
    { icon: "🔄", title: "Measure and create through data", description: "Data-driven decision making and reporting" },
    { icon: "📊", title: "Track and suggest team KPIs", description: "Real-time KPI monitoring and optimization" },
    { icon: "🔍", title: "Organize and clean data files", description: "Automated data management and cleanup" },
  ],
  sales: [
    { icon: "👤", title: "Review demo and draft proposals", description: "AI-generated proposals based on discovery calls" },
    { icon: "🤝", title: "Assess deal from chat logs", description: "Deal intelligence from conversation analysis" },
    { icon: "📨", title: "Send personalized outreach emails", description: "Hyper-personalized outbound at scale" },
    { icon: "💼", title: "Track actions and perform calls", description: "Automated follow-ups and call scheduling" },
    { icon: "🎯", title: "Analyze prospect and tailor pitch", description: "AI-powered prospect research and customization" },
  ],
}
