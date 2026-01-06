// MA Employee seed data for org chart
// This data populates the ma_employees table

export interface MAEmployeeSeed {
  firstName: string
  lastName: string
  supervisor: string | null  // Full name of supervisor, null = CEO/top level
  department: string
  jobTitle: string
  responsibilities: string
  notes: string
  email: string
}

export const MA_EMPLOYEES_SEED: MAEmployeeSeed[] = [
  // === CEO (No Supervisor) ===
  {
    firstName: "Mike",
    lastName: "Hoffman",
    supervisor: null,
    department: "G&A",
    jobTitle: "CEO",
    responsibilities: "",
    notes: "",
    email: "mhoffmann@modern-amenities.com"
  },

  // === Direct Reports to Mike Hoffman ===
  {
    firstName: "Jessica",
    lastName: "Mayo",
    supervisor: "Mike Hoffmann",
    department: "AIMS",
    jobTitle: "Head of Automation",
    responsibilities: "- Drive AIMS productized service offerings, roadmap and development\n- Bringing Top of Funnel Marketing Channels in House\n- Process optimization and automation",
    notes: "Go to her for process improvement, marketing funnels, lead generation systems, and any 'how can we automate this?' challenges.",
    email: "jess@modern-amenities.com"
  },
  {
    firstName: "John (JB)",
    lastName: "Burton",
    supervisor: "Mike Hoffmann",
    department: "Commercial",
    jobTitle: "Director, Business Development",
    responsibilities: "-Manage B2B sales team; north star is # of properties under MSA",
    notes: "MSA related questions for national accounts",
    email: "jb@modern-amenities.com"
  },
  {
    firstName: "Anthony",
    lastName: "Kolodziej",
    supervisor: "Mike Hoffmann",
    department: "CS",
    jobTitle: "Head of Revenue",
    responsibilities: "- Revenue Strategy & Growth Targets\n- Sales, Marketing & Funnel Optimization\n- Partnerships, Monetize Expansion",
    notes: "",
    email: "anthony@modern-amenities.com"
  },
  {
    firstName: "Kelsey",
    lastName: "Holshouser",
    supervisor: "Mike Hoffmann",
    department: "G&A",
    jobTitle: "COO",
    responsibilities: "- Systems integrator for MA & OpCos\n- SOP support for scale",
    notes: "",
    email: "kelsey@modern-amenities.com"
  },
  {
    firstName: "Christelle",
    lastName: "Francis",
    supervisor: "Mike Hoffmann",
    department: "HR",
    jobTitle: "Operations Manager",
    responsibilities: "- Manage hiring team\n- Manage onboarding/offboarding process\n- Various ops tasks as needed",
    notes: "The mastermind! She can help to direct you to the right person if you need help...",
    email: "christelle@modern-amenities.com"
  },
  {
    firstName: "Joe",
    lastName: "Dysert",
    supervisor: "Mike Hoffmann",
    department: "Sales",
    jobTitle: "Sr. Sales Manager",
    responsibilities: "- Manages sales team to close rate improvement",
    notes: "Manages the sales team - anything sales related at a high level",
    email: "joedysert@modern-amenities.com"
  },
  {
    firstName: "Eric",
    lastName: "Nygard",
    supervisor: "Mike Hoffmann",
    department: "MA Routes",
    jobTitle: "Eugene Route Manager",
    responsibilities: "- Manages the performance of the Eugene route",
    notes: "",
    email: "eric@modern-amenities.com"
  },
  {
    firstName: "Peter",
    lastName: "Broadston",
    supervisor: "Mike Hoffmann",
    department: "MA Routes",
    jobTitle: "Vending Machine Stocker",
    responsibilities: "Stocks vending machines to ensure products are available and properly organized.",
    notes: "",
    email: "pbroadston65@gmail.com"
  },
  {
    firstName: "Alex",
    lastName: "Bender",
    supervisor: "Mike Hoffmann",
    department: "G&A",
    jobTitle: "Data Analyst",
    responsibilities: "- Pursue manufacturing relationships for AIR\n- Assist MSA team with machine placement\n- Arrange Payment Gateway services",
    notes: "Focused on machine manufacturing",
    email: "alex@modern-amenities.com"
  },
  {
    firstName: "Jimmy",
    lastName: "Seifrit",
    supervisor: "Mike Hoffmann",
    department: "AIMS",
    jobTitle: "Innovation Director – Beverage Product",
    responsibilities: "Lead product formulation for the Modern Amenities beverage line\nProvide innovation and product strategy input for new beverage concepts\nSupport testing, refinement, and iteration of formulations in collaboration with internal stakeholders",
    notes: "",
    email: "jimmy@modern-amenities.com"
  },

  // === Reports to Jessica Mayo (Head of Automation) ===
  {
    firstName: "Adam",
    lastName: "Wolfe",
    supervisor: "Jess Mayo",
    department: "AIMS",
    jobTitle: "Technical Project Assistant",
    responsibilities: "- Owning all AI enablement systems, tools, dashboards, websites, and productized services across AIMS / MA / VP / Sales\n- Productizing and scaling new AIMS service verticals (GHL snapshots, SEO/AEO, AI dialers, lead gen, dashboards, automation)\n- Managing all our Attention automations for Sales & self hosted n8n workflows",
    notes: "Tech/AI projects - go to him for leveraging technology to improve processes, or anything to do with websites",
    email: "adam@modern-amenities.com"
  },
  {
    firstName: "Donnie",
    lastName: "Lee",
    supervisor: "Jess Mayo",
    department: "AIMS",
    jobTitle: "Marketing Systems & Lead Generation Specialist",
    responsibilities: "- Webinar funnels\n- PPC Ads\n- Meta Ads",
    notes: "",
    email: "donnie@modern-amenities.com"
  },
  {
    firstName: "Marco",
    lastName: "Sanchez",
    supervisor: "Jess Mayo",
    department: "AIMS",
    jobTitle: "PM Assistant",
    responsibilities: "- Cold Email Campaign - Writing/Launching\n- Platinum Student Weekly Campaign Reports\n- Remove leads from student campaigns, add leads (one-off), one off campaign tasks",
    notes: "Go to him for anything Cold Email campaigns, who's active, weekly reports, etc.",
    email: "marco@modern-amenities.com"
  },
  {
    firstName: "Lujan",
    lastName: "Luna",
    supervisor: "Jess Mayo",
    department: "AIMS",
    jobTitle: "GTM Engineer",
    responsibilities: "- Lead scraping\n- Lead enrichment\nFor Sales and Lead Gen",
    notes: "Go to her for Lead Scraping, National accounts",
    email: "lujan@modern-amenities.com"
  },
  {
    firstName: "Pablo",
    lastName: "Urritia",
    supervisor: "Jess Mayo",
    department: "AIMS",
    jobTitle: "Cold Email Sales Rep",
    responsibilities: "- Cold Email Sales Rep\n- Cold Calling Sales Rep",
    notes: "Sales rep - go to him for anything related to his Cold Email Leads (Student Campaigns)",
    email: "pablo@modern-amenities.com"
  },
  {
    firstName: "Joel",
    lastName: "Cabrera",
    supervisor: "Jess Mayo",
    department: "AIMS",
    jobTitle: "Cold Outbound Campaign Manager",
    responsibilities: "Own and manage all cold outbound campaigns (email, dialing, and multi-channel) for AIMS\nBuild, optimize, and scale campaign strategy, targeting, and messaging to drive qualified pipeline\nMonitor performance, iterate on campaigns, and report results and insights to leadership",
    notes: "",
    email: "joel@modern-amenities.com"
  },
  {
    firstName: "Ailyn",
    lastName: "Magno",
    supervisor: "Jess Mayo",
    department: "AIMS",
    jobTitle: "Content Manager",
    responsibilities: "- VendHub Newsletter\n- Mike's Personal Newsletter\n- Eventually Assist with Social Media Campaign Management",
    notes: "",
    email: "Ailyn@modern-amenities.com"
  },
  {
    firstName: "Alysia",
    lastName: "Boyer",
    supervisor: "Jessica Mayo",
    department: "AIMS",
    jobTitle: "Marketing Director",
    responsibilities: "- Modern Amenities Marketing/Brand, landing pages, emails, etc\n- Owning the messaging in the client journey\n- MA Collateral",
    notes: "Anything related to marketing for Modern Amenities, Vendingpreneurs, or VendHub",
    email: "Alysia@modern-amenities.com"
  },

  // === Reports to Adam Wolfe ===
  {
    firstName: "Maureen",
    lastName: "Maingi",
    supervisor: "Adam Wolfe",
    department: "AIMS",
    jobTitle: "Data and Reporting Assistant",
    responsibilities: "- Sales Enablement Dashboards\n- Data/Reporting Assistance",
    notes: "",
    email: "maureen@modern-amenities.com"
  },
  {
    firstName: "Sheenam",
    lastName: "Seo",
    supervisor: "Adam Wolfe",
    department: "AIMS",
    jobTitle: "SEO",
    responsibilities: "- MA & VP Site SEO / AEO / GEO\n- Managing all AIMS SEO / AEO services & clients\n- Website backlinks, public content, community management",
    notes: "",
    email: "Sheenam@modern-amenities.com"
  },
  {
    firstName: "Saad",
    lastName: "Ahmed",
    supervisor: "Adam Wolfe",
    department: "AIMS",
    jobTitle: "Lead Generation Specialist",
    responsibilities: "- Lead scraping\n- Lead enrichment\nFor Sales and Lead Gen",
    notes: "",
    email: "saad@modern-amenities.com"
  },
  {
    firstName: "Kumar",
    lastName: "Sahil",
    supervisor: "Adam Wolfe",
    department: "AIMS",
    jobTitle: "N8N/GTM Specialist",
    responsibilities: "- Automate Processes and Workflows",
    notes: "",
    email: "kumar@modern-amenities.com"
  },
  {
    firstName: "Irtaza",
    lastName: "Naqvi",
    supervisor: "Adam Wolfe",
    department: "AIMS",
    jobTitle: "GHL",
    responsibilities: "- Build and configure GoHighLevel subaccounts, workflows, and automation sequences\n- Connect external tools to GHL via webhooks and API integrations\n- Implement snapshots and templates for repeatable client deployments",
    notes: "",
    email: "irtaza@modern-amenities.com"
  },

  // === Reports to Christelle Francis ===
  {
    firstName: "Jade",
    lastName: "Buizon",
    supervisor: "Christelle Francis",
    department: "AIMS",
    jobTitle: "Lead Scraper - Students",
    responsibilities: "- Student Campaign Management\n- Scraping Leads & Adding Leads\n- Student Onboarding Lead Scrapes",
    notes: "Go to her for anything related to Student Leads",
    email: "jade@modern-amenities.com"
  },
  {
    firstName: "Regina",
    lastName: "Deniega",
    supervisor: "Christelle Francis",
    department: "AIMS",
    jobTitle: "Student Lead Gen VA",
    responsibilities: "- Student Email Campaigns, pacing leads into the campaigns",
    notes: "Handles the manual process for pushing new emails into the student email campaigns each week",
    email: "regina@modern-amenities.com"
  },
  {
    firstName: "Glenda",
    lastName: "Castro",
    supervisor: "Christelle Francis",
    department: "G&A",
    jobTitle: "Chief of Staff",
    responsibilities: "- Manage inboxes & slack for Mike/Kelsey\n- Support special projects and tasks for Mike/Kelsey/Anthony",
    notes: "",
    email: "glenda@modern-amenities.com"
  },

  // === Reports to Alysia Boyer ===
  {
    firstName: "Jeffrey",
    lastName: "Byrd",
    supervisor: "Alysia Boyer",
    department: "AIMS",
    jobTitle: "Marketing Programs & Community Manager",
    responsibilities: "- Passivepreneur community -> send leads to book VP call\n- Social media framework\n- Podcast launch (under the surface)\n- VP Podcast editing (testimonials)",
    notes: "",
    email: "jeffery@modern-amenities.com"
  },
  {
    firstName: "Aman",
    lastName: "Parihar",
    supervisor: "Alysia Boyer",
    department: "AIMS",
    jobTitle: "Graphic Designer",
    responsibilities: "- Create sales asset system\n- Create framework/tool kit for other brands\n- Brand Foundations",
    notes: "",
    email: "aman@modern-amenities.com"
  },
  {
    firstName: "Samuel",
    lastName: "Smith",
    supervisor: "Alysia Boyer",
    department: "Sales",
    jobTitle: "Rev Ops Coordinator",
    responsibilities: "- Sales onboarding documentation & coordination system\n- Sales request intake & triage system\n- Sales tech stack coordination + optimization",
    notes: "",
    email: "Samuel@modern-amenities.com"
  },

  // === Reports to JB (John Burton) ===
  {
    firstName: "David",
    lastName: "Rattray",
    supervisor: "JB",
    department: "Commercial",
    jobTitle: "Director of National Accounts",
    responsibilities: "-Net new properties/portfolios - New Market strategy & execution - Engagement campaigns in new markets",
    notes: "",
    email: "david@modern-amenities.com"
  },
  {
    firstName: "Carney",
    lastName: "Gillin",
    supervisor: "JB",
    department: "Commercial",
    jobTitle: "Manager of Key Accounts",
    responsibilities: "-MSA Portfolio relationship management - MSA Portfolio expansion - MSA Portfolio qualification",
    notes: "",
    email: "carney@modern-amenities.com"
  },
  {
    firstName: "Daniel",
    lastName: "Bustos",
    supervisor: "JB",
    department: "Commercial",
    jobTitle: "Biz Dev",
    responsibilities: "-Top of Funnel campaigns and lead gen - Lead Qualification - Targeted outreach",
    notes: "",
    email: "daniel@modern-amenities.com"
  },
  {
    firstName: "Andy",
    lastName: "Lopez",
    supervisor: "JB",
    department: "Sales",
    jobTitle: "SDR",
    responsibilities: "Qualify inbound and outbound leads.\nBook meetings for the sales team.\nUpdate CRM with accurate notes and follow-ups.",
    notes: "",
    email: "andy@modern-amenities.com"
  },

  // === Reports to Anthony Kolodziej ===
  {
    firstName: "Thomas",
    lastName: "Rohlader",
    supervisor: "Anthony Kolodziej",
    department: "CS",
    jobTitle: "Head of Fulfillment",
    responsibilities: "-Fulfill Platinum Students, manage Platinum cold call campaigns\n-Fulfill National Leads - who gets leads and making sure National Leads are fulfilled in a quality manner\n-Manage AirTable Data collection for students - National Lead Score, time in the program, knowing good operators and poor ones",
    notes: "Anything related to national account contracts with operators & related to platinum lead fulfillment",
    email: "thomas@modern-amenities.com"
  },
  {
    firstName: "Tom",
    lastName: "Canterino",
    supervisor: "Anthony Kolodziej",
    department: "CS",
    jobTitle: "Customer Success Director",
    responsibilities: "- Reduce Refund/Escalation Issues\n- Ambassador Program Oversight\n- Elevate Customer Experience & Operational Efficiency",
    notes: "",
    email: "Tom@modern-amenities.com"
  },
  {
    firstName: "Graham",
    lastName: "Parker",
    supervisor: "Anthony Kolodziej",
    department: "CS",
    jobTitle: "Part-Time Partner Relationships Coordinator",
    responsibilities: "Manage ongoing partner communication and relationships\nCoordinate partner onboarding and initiative\nTrack partner engagement and report insights",
    notes: "",
    email: "graham@modern-amenities.com"
  },
  {
    firstName: "Colin",
    lastName: "Cook",
    supervisor: "Anthony Kolodziej",
    department: "MA Routes",
    jobTitle: "General Manager, Chicago",
    responsibilities: "- Operational Performance & Route Management\n- Financial Oversight\n- Growth Accountability",
    notes: "Manages the chicago route",
    email: "colin@modern-amenities.com"
  },

  // === Reports to Thomas Rohlader ===
  {
    firstName: "Mav Mavryk",
    lastName: "Paolo A. Ang Espina",
    supervisor: "Thomas Rohlader",
    department: "CS",
    jobTitle: "Outbound Cold Caller",
    responsibilities: "-Generate warm leads for Platinum Students\n-Book Appointments for Platinum Students\n-Submit information to AirTable properly for Students to act on",
    notes: "",
    email: "paoloangespina@gmail.com"
  },
  {
    firstName: "Harold",
    lastName: "Sibag",
    supervisor: "Thomas Rohlader",
    department: "CS",
    jobTitle: "Outbound Cold Caller",
    responsibilities: "-Generate warm leads for Platinum Students\n-Book Appointments for Platinum Students\n-Submit information to AirTable properly for Students to act on",
    notes: "",
    email: "hsibag13@gmail.com"
  },
  {
    firstName: "Mark",
    lastName: "Villaverde",
    supervisor: "Thomas Rohlader",
    department: "CS",
    jobTitle: "Outbound Cold Caller",
    responsibilities: "-Generate warm leads for Platinum Students\n-Book Appointments for Platinum Students\n-Submit information to AirTable properly for Students to act on",
    notes: "",
    email: "markvillaverde@yahoo.com"
  },
  {
    firstName: "Ralph",
    lastName: "Fontanos",
    supervisor: "Thomas Rohlader",
    department: "CS",
    jobTitle: "Outbound Cold Caller",
    responsibilities: "-Generate warm leads for Platinum Students\n-Book Appointments for Platinum Students\n-Submit information to AirTable properly for Students to act on",
    notes: "",
    email: "jared.tadashi.rjf@gmail.com"
  },
  {
    firstName: "Cecille",
    lastName: "Ebron",
    supervisor: "Thomas Rohlader",
    department: "CS",
    jobTitle: "Outbound Cold Caller",
    responsibilities: "-Generate warm leads for Platinum Students\n-Book Appointments for Platinum Students\n-Submit information to AirTable properly for Students to act on",
    notes: "",
    email: "cecilleebron@gmail.com"
  },
  {
    firstName: "Isenie",
    lastName: "Gutierrez",
    supervisor: "Thomas Rohlader",
    department: "CS",
    jobTitle: "Outbound Cold Caller",
    responsibilities: "-Generate warm leads for Platinum Students\n-Book Appointments for Platinum Students\n-Submit information to AirTable properly for Students to act on",
    notes: "",
    email: "isenie16@gmail.com"
  },
  {
    firstName: "Kunooz",
    lastName: "Waris",
    supervisor: "Thomas Rohlader",
    department: "CS",
    jobTitle: "Outbound Cold Caller",
    responsibilities: "-Generate warm leads for Platinum Students\n-Book Appointments for Platinum Students\n-Submit information to AirTable properly for Students to act on",
    notes: "",
    email: "kunoozwrs20@gmail.com"
  },
  {
    firstName: "Shai",
    lastName: "Palma",
    supervisor: "Thomas Rohlader",
    department: "CS",
    jobTitle: "Outbound Cold Caller",
    responsibilities: "-Generate warm leads for Platinum Students\n-Book Appointments for Platinum Students\n-Submit information to AirTable properly for Students to act on",
    notes: "",
    email: "shaipalma28@gmail.com"
  },
  {
    firstName: "Ramon",
    lastName: "Alvarez",
    supervisor: "Thomas Rohlader",
    department: "CS",
    jobTitle: "Outbound Cold Caller",
    responsibilities: "-Generate warm leads for Platinum Students\n-Book Appointments for Platinum Students\n-Submit information to AirTable properly for Students to act on",
    notes: "",
    email: "yoyoyalvarez@yahoo.com"
  },
  {
    firstName: "Holly",
    lastName: "Bankhead",
    supervisor: "Thomas Rohlader",
    department: "CS",
    jobTitle: "Outbound Cold Caller",
    responsibilities: "-Generate warm leads for Platinum Students\n-Book Appointments for Platinum Students\n-Submit information to AirTable properly for Students to act on",
    notes: "",
    email: "hm2719@hotmail.com"
  },
  {
    firstName: "Leona",
    lastName: "Raypon",
    supervisor: "Thomas Rohlader",
    department: "CS",
    jobTitle: "MSA/National Specialist VA",
    responsibilities: "-Collect critical National Lead installation information - Ensure machine is ordered, gather delivery date, make sure machine is installed properly\n-Follow up with problematic VPs and elevate any issues so they can be solved quickly\n-Message mass MSA rollouts to kickoff MSA compliance",
    notes: "",
    email: "leonaraypon04@gmail.com"
  },
  {
    firstName: "Lawrence",
    lastName: "Matondo",
    supervisor: "Thomas Rohlader",
    department: "CS",
    jobTitle: "MSA/National Specialist VA",
    responsibilities: "-Collect critical National Lead Revenue Collection information - Confirm machine active date, revenue start date\n-Interface with VPs and Machine companies to ensure MA has backend access to all installed National Leads\n-Message mass MSA rollouts to kickoff MSA compliance",
    notes: "",
    email: "ljmatondo12@gmail.com"
  },

  // === Reports to Tom Canterino ===
  {
    firstName: "Christabel",
    lastName: "Kemunto",
    supervisor: "Tom Canterino",
    department: "CS",
    jobTitle: "Customer Support",
    responsibilities: "- Intercom support tickets\n- Side projects (Tom Directed)\n- AMB daily recording -> Skool",
    notes: "",
    email: "christabel@modern-amenities.com"
  },
  {
    firstName: "Alvina",
    lastName: "Odhiambo",
    supervisor: "Tom Canterino",
    department: "CS",
    jobTitle: "Customer Support",
    responsibilities: "- Intercom support tickets\n- Side projects (Tom Directed)",
    notes: "",
    email: "alvina@modern-amenities.com"
  },
  {
    firstName: "Matt",
    lastName: "Bacine",
    supervisor: "Tom Canterino",
    department: "CS",
    jobTitle: "Onboarding Specialist",
    responsibilities: "- Onboarding calls - 95% of new members within first 7 days\n- Office hours support\n- New student access",
    notes: "",
    email: "mbacine@modern-amenities.com"
  },
  {
    firstName: "Alexis",
    lastName: "Bourbeau",
    supervisor: "Tom Canterino",
    department: "CS",
    jobTitle: "Customer Success Consultant",
    responsibilities: "- New App Launch\n- Adding & Organizing content in the app",
    notes: "",
    email: "alexis@modern-amenities.com"
  },
  {
    firstName: "Ann",
    lastName: "Nyambura",
    supervisor: "Tom Canterino",
    department: "Tech",
    jobTitle: "eComm Admin",
    responsibilities: "- Vistar / USG / Machine financing\n- Financing contracts\n- Overall VendHub support",
    notes: "",
    email: "ann@modern-amenities.com"
  },
  {
    firstName: "Nokuthula",
    lastName: "Shili",
    supervisor: "Tom Canterino",
    department: "Tech",
    jobTitle: "VendHub Support",
    responsibilities: "- Overall VendHub support\n- Assist Ann w/workload",
    notes: "",
    email: "nokuthula@modern-amenities.com"
  },

  // === Reports to Kelsey Holshouser ===
  {
    firstName: "Cole",
    lastName: "Weinhold",
    supervisor: "Kelsey Holshouser",
    department: "Finance",
    jobTitle: "CFO",
    responsibilities: "- Implement and oversee financial processes that ensure accurate financials\n- Investigate, model, and assess profitability\n- Review transaction workflows to determine appropriate accounting treatment",
    notes: "Manages finance & is building all of our systems around money...",
    email: "cole@modern-amenities.com"
  },
  {
    firstName: "Ethan",
    lastName: "Rasmussen",
    supervisor: "Kelsey Holshouser",
    department: "Finance",
    jobTitle: "CFO",
    responsibilities: "- Implement and oversee financial processes that ensure accurate financials\n- Investigate, model, and assess profitability\n- Review transaction workflows to determine appropriate accounting treatment",
    notes: "",
    email: "ethan@modern-amenities.com"
  },
  {
    firstName: "Joshua",
    lastName: "Munsch",
    supervisor: "Kelsey Holshouser",
    department: "Tech",
    jobTitle: "Head of Tech",
    responsibilities: "- Drive VendHub product roadmap and development\n- Translate business goals into product direction\n- Own product quality and cross-functional alignment",
    notes: "",
    email: "josh@modern-amenities.com"
  },
  {
    firstName: "Melissa",
    lastName: "Freeman",
    supervisor: "Kelsey Holshouser",
    department: "G&A",
    jobTitle: "Workforce Experience & Operations Manager",
    responsibilities: "-Own workforce experience, HR operations, and internal people processes\n-Manage onboarding/offboarding and employee lifecycle workflows\n-Partner with leadership on operational efficiency and team support",
    notes: "",
    email: ""
  },

  // === Reports to Joshua Munsch ===
  {
    firstName: "Sorwoar",
    lastName: "Huda",
    supervisor: "Joshua Munsch",
    department: "Tech",
    jobTitle: "Contract Product Designer",
    responsibilities: "- UI/UX design for VendHub products and features\n- Translating product requirements into polished designs\n- Collaborating with product and dev on design execution",
    notes: "Main designer for VendHub product",
    email: "sorwoar.resim10@gmail.com"
  },
  {
    firstName: "Hamza",
    lastName: "",
    supervisor: "Joshua Munsch",
    department: "Tech",
    jobTitle: "Developer",
    responsibilities: "- Technical strategy and architecture decisions\n- Feature implementation and code quality ownership\n- Holding Geeky Ants accountable for delivery and standards",
    notes: "Vendhub Developer - 1 Month Trial",
    email: "hamza@modern-amenities.com"
  },

  // === Reports to Joe Dysert ===
  {
    firstName: "Christian",
    lastName: "Hartwell",
    supervisor: "Joe Dysert",
    department: "Sales",
    jobTitle: "Inside Sales Rep",
    responsibilities: "- Closing deals.",
    notes: "Sales rep - go to him for anything related to one of his deals",
    email: "christian@modern-amenities.com"
  },
  {
    firstName: "Ategeka",
    lastName: "Musinguzi",
    supervisor: "Joe Dysert",
    department: "Sales",
    jobTitle: "Inside Sales Rep",
    responsibilities: "- Closing deals.",
    notes: "Sales rep - go to him for anything related to one of his deals",
    email: "ategeka@modern-amenities.com"
  },
  {
    firstName: "Spencer",
    lastName: "Reynolds",
    supervisor: "Joe Dysert",
    department: "Sales",
    jobTitle: "Setter",
    responsibilities: "- Supporting the closing of deals via show rate improvements",
    notes: "",
    email: "spencer@modern-amenities.com"
  },
  {
    firstName: "Scott",
    lastName: "Seymour",
    supervisor: "Joe Dysert",
    department: "Sales",
    jobTitle: "Inside Sales Rep",
    responsibilities: "- Closing deals.",
    notes: "Sales rep - go to him for anything related to one of his deals",
    email: "scott@modern-amenities.com"
  },
  {
    firstName: "Lyle",
    lastName: "Hubbard",
    supervisor: "Joe Dysert",
    department: "Sales",
    jobTitle: "Sales Specialist",
    responsibilities: "- Closing deals.",
    notes: "Sales rep - go to him for anything related to one of his deals",
    email: "lyle@modern-amenities.com"
  },
  {
    firstName: "Jordan",
    lastName: "Humphrey",
    supervisor: "Joe Dysert",
    department: "Sales",
    jobTitle: "Inside Sales Rep",
    responsibilities: "- Closing deals.",
    notes: "Sales rep - go to him for anything related to one of his deals",
    email: "jordan@modern-amenities.com"
  },
  {
    firstName: "Jason",
    lastName: "Aaron",
    supervisor: "Joe Dysert",
    department: "Sales",
    jobTitle: "Inside Sales Manager",
    responsibilities: "- Closing deals.",
    notes: "Sales rep - go to him for anything related to one of his deals",
    email: "jasonaaron@modern-amenities.com"
  },
  {
    firstName: "Matt",
    lastName: "Chubb",
    supervisor: "Joe Dysert",
    department: "Sales",
    jobTitle: "Sales Specialist",
    responsibilities: "- Closing deals.",
    notes: "Sales rep - go to him for anything related to one of his deals",
    email: "matt@modern-amenities.com"
  },
  {
    firstName: "Kristin",
    lastName: "Nelson",
    supervisor: "Joe Dysert",
    department: "Sales",
    jobTitle: "Sales Specialist",
    responsibilities: "- Closing deals.",
    notes: "Sales rep - go to him for anything related to one of his deals",
    email: "kristin@modern-amenities.com"
  },
  {
    firstName: "Matt",
    lastName: "Moore",
    supervisor: "Joe Dysert",
    department: "Sales",
    jobTitle: "Sales Specialist",
    responsibilities: "- Closing deals.",
    notes: "",
    email: "mathew@modern-amenities.com"
  },
  {
    firstName: "William",
    lastName: "Chase",
    supervisor: "Joe Dysert",
    department: "Sales",
    jobTitle: "Sales Specialist",
    responsibilities: "- Closing deals.",
    notes: "Sales rep - go to him for anything related to one of his deals",
    email: "william@modern-amenities.com"
  },
  {
    firstName: "Robin",
    lastName: "Perkins",
    supervisor: "Joe Dysert",
    department: "Sales",
    jobTitle: "Sales Specialist",
    responsibilities: "- Closing deals.",
    notes: "Sales rep - go to him for anything related to one of his deals",
    email: "robin@modern-amenities.com"
  },
  {
    firstName: "Eric",
    lastName: "Piccione",
    supervisor: "Joe Dysert",
    department: "Sales",
    jobTitle: "Sales Specialist",
    responsibilities: "- Closing deals.",
    notes: "Sales rep - go to him for anything related to one of his deals",
    email: "eric@modern-amenitie.com"
  },
  {
    firstName: "Ryan",
    lastName: "Jones",
    supervisor: "Joe Dysert",
    department: "Sales",
    jobTitle: "Sales Specialist",
    responsibilities: "- Closing deals.",
    notes: "Sales rep - go to him for anything related to one of his deals",
    email: "ryan@modern-amenities.com"
  },
  {
    firstName: "Mallory",
    lastName: "Kent",
    supervisor: "Joe Dysert",
    department: "Sales",
    jobTitle: "Sales Specialist (Part-Time)",
    responsibilities: "- Closing deals.",
    notes: "Sales rep - go to him for anything related to one of his deals",
    email: "mallory@modern-amenities.com"
  },
  {
    firstName: "John",
    lastName: "Kirk",
    supervisor: "Joe Dysert",
    department: "Sales",
    jobTitle: "Sales Specialist",
    responsibilities: "- Closing deals.",
    notes: "Sales rep - go to him for anything related to one of his deals",
    email: "john@modern-amenities.com"
  },

  // === Reports to Eric Nygard ===
  {
    firstName: "Michael",
    lastName: "Leahy",
    supervisor: "Eric Nygard",
    department: "MA Routes",
    jobTitle: "Eugene Stocker",
    responsibilities: "- Stocks the machines on the Eugene Route",
    notes: "",
    email: "leahymichaelevan@gmail.com"
  },
]

// Get total employee count
export const TOTAL_EMPLOYEES = MA_EMPLOYEES_SEED.length
