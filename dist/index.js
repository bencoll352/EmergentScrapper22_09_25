// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { randomUUID } from "crypto";
var MemStorage = class {
  users;
  companies;
  processingJobs;
  filingHistory;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.companies = /* @__PURE__ */ new Map();
    this.processingJobs = /* @__PURE__ */ new Map();
    this.filingHistory = /* @__PURE__ */ new Map();
    this.initializeMockData();
  }
  initializeMockData() {
    const mockCompanies = [
      {
        id: "1",
        companyNumber: "12345678",
        companyName: "Apple UK Limited",
        status: "active",
        incorporationDate: /* @__PURE__ */ new Date("2020-01-15"),
        companyType: "ltd",
        jurisdiction: "england-wales",
        registeredAddress: { address_line_1: "1 Apple Place", locality: "London", postal_code: "EC1A 1AA" },
        sicCodes: ["62012", "62020"],
        employeeCount: 1250,
        employeeCountSource: "estimated",
        estimatedRevenue: "185000000.00",
        revenueSource: "estimated",
        estimatedValuation: "645000000.00",
        valuationSource: "estimated",
        lastProcessed: /* @__PURE__ */ new Date(),
        processingStatus: "completed",
        dataQualityScore: "0.95",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      },
      {
        id: "2",
        companyNumber: "87654321",
        companyName: "Google UK Ltd",
        status: "active",
        incorporationDate: /* @__PURE__ */ new Date("2003-08-22"),
        companyType: "ltd",
        jurisdiction: "england-wales",
        registeredAddress: { address_line_1: "Belgrave House", locality: "London", postal_code: "SW1X 8PZ" },
        sicCodes: ["63110", "58290"],
        employeeCount: 2800,
        employeeCountSource: "estimated",
        estimatedRevenue: "420000000.00",
        revenueSource: "estimated",
        estimatedValuation: "1470000000.00",
        valuationSource: "estimated",
        lastProcessed: /* @__PURE__ */ new Date(),
        processingStatus: "completed",
        dataQualityScore: "0.92",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      },
      {
        id: "3",
        companyNumber: "11223344",
        companyName: "Microsoft Limited",
        status: "active",
        incorporationDate: /* @__PURE__ */ new Date("1985-03-10"),
        companyType: "ltd",
        jurisdiction: "england-wales",
        registeredAddress: { address_line_1: "Thames Valley Park", locality: "Reading", postal_code: "RG6 1WG" },
        sicCodes: ["62012", "58290"],
        employeeCount: 3200,
        employeeCountSource: "estimated",
        estimatedRevenue: "580000000.00",
        revenueSource: "estimated",
        estimatedValuation: "2030000000.00",
        valuationSource: "estimated",
        lastProcessed: /* @__PURE__ */ new Date(),
        processingStatus: "completed",
        dataQualityScore: "0.97",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }
    ];
    mockCompanies.forEach((company) => {
      this.companies.set(company.id, company);
    });
  }
  // User methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  // Company methods
  async getCompany(id) {
    return this.companies.get(id);
  }
  async getCompanyByNumber(companyNumber) {
    return Array.from(this.companies.values()).find(
      (company) => company.companyNumber === companyNumber
    );
  }
  async createCompany(insertCompany) {
    const id = randomUUID();
    const now = /* @__PURE__ */ new Date();
    const company = {
      ...insertCompany,
      id,
      createdAt: now,
      updatedAt: now,
      lastProcessed: now,
      processingStatus: "completed",
      dataQualityScore: "0.95",
      status: insertCompany.status || null
    };
    this.companies.set(id, company);
    return company;
  }
  async updateCompany(id, updates) {
    const company = this.companies.get(id);
    if (!company) return void 0;
    const updatedCompany = { ...company, ...updates, updatedAt: /* @__PURE__ */ new Date() };
    this.companies.set(id, updatedCompany);
    return updatedCompany;
  }
  async searchCompanies(query, limit = 10) {
    const normalizedQuery = query.toLowerCase();
    return Array.from(this.companies.values()).filter(
      (company) => company.companyName.toLowerCase().includes(normalizedQuery) || company.companyNumber.includes(query)
    ).slice(0, limit);
  }
  async getCompanies(offset = 0, limit = 50) {
    const allCompanies = Array.from(this.companies.values());
    const companies2 = allCompanies.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(offset, offset + limit);
    return { companies: companies2, total: allCompanies.length };
  }
  // Processing job methods
  async createProcessingJob(insertJob) {
    const id = randomUUID();
    const now = /* @__PURE__ */ new Date();
    const job = {
      ...insertJob,
      options: insertJob.options || {},
      id,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      status: "pending"
    };
    this.processingJobs.set(id, job);
    return job;
  }
  async getProcessingJob(id) {
    return this.processingJobs.get(id);
  }
  async updateProcessingJob(id, updates) {
    const job = this.processingJobs.get(id);
    if (!job) return void 0;
    const updatedJob = { ...job, ...updates, updatedAt: /* @__PURE__ */ new Date() };
    if (updates.status === "completed" || updates.status === "failed") {
      updatedJob.completedAt = /* @__PURE__ */ new Date();
    }
    this.processingJobs.set(id, updatedJob);
    return updatedJob;
  }
  async getRecentJobs(limit = 10) {
    return Array.from(this.processingJobs.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
  }
  // Filing history methods
  async createFilingHistory(insertFiling) {
    const id = randomUUID();
    const filing = {
      ...insertFiling,
      id,
      createdAt: /* @__PURE__ */ new Date(),
      description: insertFiling.description || null,
      companyId: insertFiling.companyId || null,
      filingDate: insertFiling.filingDate || null,
      filingType: insertFiling.filingType || null,
      documentId: insertFiling.documentId || null,
      category: insertFiling.category || null,
      subcategory: insertFiling.subcategory || null
    };
    this.filingHistory.set(id, filing);
    return filing;
  }
  async getFilingsByCompany(companyId) {
    return Array.from(this.filingHistory.values()).filter((filing) => filing.companyId === companyId).sort((a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime());
  }
};
var storage = new MemStorage();

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyNumber: text("company_number").notNull().unique(),
  companyName: text("company_name").notNull(),
  status: text("status"),
  incorporationDate: timestamp("incorporation_date"),
  companyType: text("company_type"),
  jurisdiction: text("jurisdiction"),
  registeredAddress: jsonb("registered_address"),
  sicCodes: text("sic_codes").array(),
  // Enhanced data fields
  employeeCount: integer("employee_count"),
  employeeCountSource: text("employee_count_source"),
  estimatedRevenue: decimal("estimated_revenue", { precision: 15, scale: 2 }),
  revenueSource: text("revenue_source"),
  estimatedValuation: decimal("estimated_valuation", { precision: 15, scale: 2 }),
  valuationSource: text("valuation_source"),
  // Processing metadata
  lastProcessed: timestamp("last_processed").defaultNow(),
  processingStatus: text("processing_status").default("pending"),
  dataQualityScore: decimal("data_quality_score", { precision: 3, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var processingJobs = pgTable("processing_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobType: text("job_type").notNull(),
  // 'single' | 'bulk'
  status: text("status").default("pending"),
  // 'pending' | 'processing' | 'completed' | 'failed'
  totalItems: integer("total_items").default(1),
  processedItems: integer("processed_items").default(0),
  failedItems: integer("failed_items").default(0),
  // Processing options
  options: jsonb("options"),
  // Contains all processing flags and settings
  // Results
  results: jsonb("results"),
  errorLog: jsonb("error_log"),
  // Metadata
  estimatedDuration: integer("estimated_duration"),
  // in seconds
  actualDuration: integer("actual_duration"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at")
});
var filingHistory = pgTable("filing_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id),
  filingDate: timestamp("filing_date"),
  filingType: text("filing_type"),
  description: text("description"),
  documentId: text("document_id"),
  category: text("category"),
  subcategory: text("subcategory"),
  createdAt: timestamp("created_at").defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertProcessingJobSchema = createInsertSchema(processingJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true
});
var insertFilingHistorySchema = createInsertSchema(filingHistory).omit({
  id: true,
  createdAt: true
});
var processingOptionsSchema = z.object({
  useCache: z.boolean().default(true),
  filingHistory: z.boolean().default(false),
  financialData: z.boolean().default(false),
  employeeEstimation: z.boolean().default(false),
  revenueEstimation: z.boolean().default(false),
  valuationAnalysis: z.boolean().default(false),
  industryBenchmark: z.boolean().default(false),
  riskAssessment: z.boolean().default(false),
  parallelProcessing: z.boolean().default(true),
  errorHandling: z.boolean().default(true),
  emailNotification: z.boolean().default(false),
  priorityQueue: z.boolean().default(false)
});
var companySearchSchema = z.object({
  query: z.string().min(1, "Company name or number is required"),
  options: processingOptionsSchema.optional()
});
var bulkUploadSchema = z.object({
  companies: z.array(z.string()).min(1, "At least one company is required"),
  options: processingOptionsSchema.optional()
});

// server/routes.ts
var CompaniesHouseService = class {
  baseUrl = "https://api.company-information.service.gov.uk";
  apiKey = process.env.COMPANIES_HOUSE_API_KEY || "";
  async searchCompany(query) {
    if (!this.apiKey) {
      throw new Error("Companies House API key not configured");
    }
    try {
      const searchUrl = `${this.baseUrl}/search/companies?q=${encodeURIComponent(query)}&items_per_page=10`;
      const response = await fetch(searchUrl, {
        headers: {
          "Authorization": `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
          "Accept": "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(`Companies House API error: ${response.status}`);
      }
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error("Companies House search error:", error);
      throw error;
    }
  }
  async getCompanyDetails(companyNumber) {
    if (!this.apiKey) {
      throw new Error("Companies House API key not configured");
    }
    try {
      const detailsUrl = `${this.baseUrl}/company/${companyNumber}`;
      const response = await fetch(detailsUrl, {
        headers: {
          "Authorization": `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
          "Accept": "application/json"
        }
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Company not found");
        }
        throw new Error(`Companies House API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Companies House details error:", error);
      throw error;
    }
  }
  async getFilingHistory(companyNumber) {
    if (!this.apiKey) return [];
    try {
      const filingsUrl = `${this.baseUrl}/company/${companyNumber}/filing-history?items_per_page=20`;
      const response = await fetch(filingsUrl, {
        headers: {
          "Authorization": `Basic ${Buffer.from(this.apiKey + ":").toString("base64")}`,
          "Accept": "application/json"
        }
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error("Filing history error:", error);
      return [];
    }
  }
};
var EnhancementService = class {
  estimateEmployeeCount(companyData, sicCodes = []) {
    const turnover = companyData.accounts?.next_accounts?.overdue || 0;
    const companyType = companyData.type || "";
    const jurisdiction = companyData.jurisdiction || "";
    let estimatedEmployees = 1;
    if (turnover > 0) {
      if (turnover > 5e7) estimatedEmployees = Math.floor(turnover / 1e5);
      else if (turnover > 1e7) estimatedEmployees = Math.floor(turnover / 15e4);
      else if (turnover > 1e6) estimatedEmployees = Math.floor(turnover / 8e4);
      else estimatedEmployees = Math.floor(turnover / 5e4);
    }
    const techSicCodes = ["62", "63", "58", "26"];
    const manufacturingSicCodes = ["10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25"];
    if (sicCodes.some((code) => techSicCodes.some((tech) => code.startsWith(tech)))) {
      estimatedEmployees = Math.floor(estimatedEmployees * 0.8);
    }
    if (sicCodes.some((code) => manufacturingSicCodes.some((mfg) => code.startsWith(mfg)))) {
      estimatedEmployees = Math.floor(estimatedEmployees * 1.3);
    }
    return Math.max(1, Math.min(estimatedEmployees, 5e5));
  }
  estimateRevenue(employeeCount, sicCodes = [], location = "UK") {
    const baseRevenuePerEmployee = 75e3;
    let revenueMultiplier = 1;
    const financialSicCodes = ["64", "65", "66"];
    const techSicCodes = ["62", "63", "58", "26"];
    const retailSicCodes = ["47"];
    const manufacturingSicCodes = ["10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25"];
    if (sicCodes.some((code) => financialSicCodes.some((fin) => code.startsWith(fin)))) {
      revenueMultiplier = 2.5;
    } else if (sicCodes.some((code) => techSicCodes.some((tech) => code.startsWith(tech)))) {
      revenueMultiplier = 1.8;
    } else if (sicCodes.some((code) => retailSicCodes.some((retail) => code.startsWith(retail)))) {
      revenueMultiplier = 0.6;
    } else if (sicCodes.some((code) => manufacturingSicCodes.some((mfg) => code.startsWith(mfg)))) {
      revenueMultiplier = 1.1;
    }
    if (location.toLowerCase().includes("london")) {
      revenueMultiplier *= 1.3;
    }
    const estimatedRevenue = employeeCount * baseRevenuePerEmployee * revenueMultiplier;
    return Math.max(0, estimatedRevenue);
  }
  estimateValuation(revenue, employeeCount, sicCodes = [], companyAge = 0) {
    let revenueMultiple = 1;
    const techSicCodes = ["62", "63", "58", "26"];
    const financialSicCodes = ["64", "65", "66"];
    const manufacturingSicCodes = ["10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25"];
    if (sicCodes.some((code) => techSicCodes.some((tech) => code.startsWith(tech)))) {
      revenueMultiple = 3.5;
    } else if (sicCodes.some((code) => financialSicCodes.some((fin) => code.startsWith(fin)))) {
      revenueMultiple = 1.8;
    } else if (sicCodes.some((code) => manufacturingSicCodes.some((mfg) => code.startsWith(mfg)))) {
      revenueMultiple = 1.2;
    }
    if (companyAge > 10) revenueMultiple *= 1.1;
    if (companyAge < 2) revenueMultiple *= 0.8;
    if (employeeCount > 1e3) revenueMultiple *= 1.2;
    if (employeeCount < 10) revenueMultiple *= 0.7;
    const estimatedValuation = revenue * revenueMultiple;
    return Math.max(0, estimatedValuation);
  }
};
var companiesHouseService = new CompaniesHouseService();
var enhancementService = new EnhancementService();
async function registerRoutes(app2) {
  app2.get("/api/company", async (req, res) => {
    try {
      const { company, cache, "filing-history": filingHistory2, financials, enhance } = req.query;
      if (!company) {
        return res.status(400).json({ error: "Company parameter is required" });
      }
      const companyQuery = company;
      const useCache = cache !== "false";
      const includeFilingHistory = filingHistory2 === "true";
      const includeFinancials = financials === "true";
      const includeEnhancement = enhance === "true";
      let existingCompany;
      if (useCache) {
        if (companyQuery.match(/^\d{8}$/)) {
          existingCompany = await storage.getCompanyByNumber(companyQuery);
        } else {
          const searchResults = await storage.searchCompanies(companyQuery, 1);
          existingCompany = searchResults[0];
        }
      }
      if (existingCompany && useCache) {
        return res.json({
          company: existingCompany,
          cached: true,
          filings: includeFilingHistory ? await storage.getFilingsByCompany(existingCompany.id) : void 0
        });
      }
      let companyData;
      if (companyQuery.match(/^\d{8}$/)) {
        companyData = await companiesHouseService.getCompanyDetails(companyQuery);
      } else {
        const searchResults = await companiesHouseService.searchCompany(companyQuery);
        if (searchResults.length === 0) {
          return res.status(404).json({ error: "Company not found" });
        }
        companyData = await companiesHouseService.getCompanyDetails(searchResults[0].company_number);
      }
      const sicCodes = companyData.sic_codes || [];
      const incorporationDate = new Date(companyData.date_of_creation);
      const companyAge = (/* @__PURE__ */ new Date()).getFullYear() - incorporationDate.getFullYear();
      let enhancedData = {};
      if (includeEnhancement) {
        const employeeCount = enhancementService.estimateEmployeeCount(companyData, sicCodes);
        const estimatedRevenue = enhancementService.estimateRevenue(employeeCount, sicCodes);
        const estimatedValuation = enhancementService.estimateValuation(estimatedRevenue, employeeCount, sicCodes, companyAge);
        enhancedData = {
          employeeCount,
          employeeCountSource: "estimated",
          estimatedRevenue: estimatedRevenue.toString(),
          revenueSource: "estimated",
          estimatedValuation: estimatedValuation.toString(),
          valuationSource: "estimated"
        };
      }
      const newCompany = await storage.createCompany({
        companyNumber: companyData.company_number,
        companyName: companyData.company_name,
        status: companyData.company_status,
        incorporationDate,
        companyType: companyData.type,
        jurisdiction: companyData.jurisdiction,
        registeredAddress: companyData.registered_office_address,
        sicCodes,
        ...enhancedData
      });
      let filings = [];
      if (includeFilingHistory) {
        const filingData = await companiesHouseService.getFilingHistory(companyData.company_number);
        for (const filing of filingData) {
          await storage.createFilingHistory({
            companyId: newCompany.id,
            filingDate: new Date(filing.date),
            filingType: filing.type,
            description: filing.description,
            documentId: filing.links?.document_metadata,
            category: filing.category,
            subcategory: filing.subcategory
          });
        }
        filings = await storage.getFilingsByCompany(newCompany.id);
      }
      res.json({
        company: newCompany,
        cached: false,
        filings: includeFilingHistory ? filings : void 0
      });
    } catch (error) {
      console.error("Company processing error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to process company data"
      });
    }
  });
  app2.get("/api/search", async (req, res) => {
    try {
      const { q, limit = "10" } = req.query;
      if (!q) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      const searchLimit = Math.min(parseInt(limit), 50);
      const localResults = await storage.searchCompanies(q, searchLimit);
      if (localResults.length >= searchLimit) {
        return res.json({ companies: localResults });
      }
      try {
        const companiesHouseResults = await companiesHouseService.searchCompany(q);
        const combinedResults = [
          ...localResults,
          ...companiesHouseResults.slice(0, searchLimit - localResults.length)
        ];
        res.json({ companies: combinedResults });
      } catch (error) {
        res.json({ companies: localResults });
      }
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Search failed"
      });
    }
  });
  app2.post("/api/bulk-process", async (req, res) => {
    try {
      const validation = bulkUploadSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid request data",
          details: validation.error.errors
        });
      }
      const { companies: companies2, options } = validation.data;
      const job = await storage.createProcessingJob({
        jobType: "bulk",
        totalItems: companies2.length,
        options
      });
      const processingOptions = options || {
        useCache: true,
        filingHistory: false,
        financialData: false,
        employeeEstimation: false,
        revenueEstimation: false,
        valuationAnalysis: false,
        industryBenchmark: false,
        riskAssessment: false,
        parallelProcessing: true,
        errorHandling: true,
        emailNotification: false,
        priorityQueue: false
      };
      processBulkCompanies(job.id, companies2, processingOptions);
      res.json({
        jobId: job.id,
        message: "Bulk processing started",
        totalItems: companies2.length
      });
    } catch (error) {
      console.error("Bulk processing error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to start bulk processing"
      });
    }
  });
  app2.get("/api/status/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = await storage.getProcessingJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Status check error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get job status"
      });
    }
  });
  app2.get("/api/companies", async (req, res) => {
    try {
      const { offset = "0", limit = "50" } = req.query;
      const result = await storage.getCompanies(
        parseInt(offset),
        parseInt(limit)
      );
      res.json(result);
    } catch (error) {
      console.error("Companies list error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get companies"
      });
    }
  });
  app2.get("/api/recent-jobs", async (req, res) => {
    try {
      const { limit = "10" } = req.query;
      const jobs = await storage.getRecentJobs(parseInt(limit));
      res.json({ jobs });
    } catch (error) {
      console.error("Recent jobs error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get recent jobs"
      });
    }
  });
  app2.get("/api/export", async (req, res) => {
    try {
      const { format = "json", jobId } = req.query;
      let companies2;
      if (jobId) {
        const job = await storage.getProcessingJob(jobId);
        if (!job || !job.results) {
          return res.status(404).json({ error: "Job not found or not completed" });
        }
        companies2 = Array.isArray(job.results) ? job.results : [];
      } else {
        const result = await storage.getCompanies(0, 1e3);
        companies2 = result.companies;
      }
      const timestamp2 = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/:/g, "-");
      switch (format) {
        case "csv":
          const csv = generateCSV(companies2);
          res.setHeader("Content-Type", "text/csv");
          res.setHeader("Content-Disposition", `attachment; filename="companies-${timestamp2}.csv"`);
          res.send(csv);
          break;
        case "json":
        default:
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Content-Disposition", `attachment; filename="companies-${timestamp2}.json"`);
          res.json({ companies: companies2, exportedAt: (/* @__PURE__ */ new Date()).toISOString() });
          break;
      }
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Export failed"
      });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}
async function processBulkCompanies(jobId, companies2, options) {
  const startTime = Date.now();
  let processedCount = 0;
  let failedCount = 0;
  const results = [];
  const errors = [];
  await storage.updateProcessingJob(jobId, {
    status: "processing",
    processedItems: 0,
    estimatedDuration: companies2.length * 2
    // 2 seconds per company estimate
  });
  for (const companyQuery of companies2) {
    try {
      let companyData;
      if (companyQuery.match(/^\d{8}$/)) {
        companyData = await companiesHouseService.getCompanyDetails(companyQuery);
      } else {
        const searchResults = await companiesHouseService.searchCompany(companyQuery);
        if (searchResults.length > 0) {
          companyData = await companiesHouseService.getCompanyDetails(searchResults[0].company_number);
        } else {
          throw new Error("Company not found");
        }
      }
      const sicCodes = companyData.sic_codes || [];
      const incorporationDate = new Date(companyData.date_of_creation);
      const companyAge = (/* @__PURE__ */ new Date()).getFullYear() - incorporationDate.getFullYear();
      const employeeCount = enhancementService.estimateEmployeeCount(companyData, sicCodes);
      const estimatedRevenue = enhancementService.estimateRevenue(employeeCount, sicCodes);
      const estimatedValuation = enhancementService.estimateValuation(estimatedRevenue, employeeCount, sicCodes, companyAge);
      const enhancedData = {
        employeeCount: options.employeeEstimation ? employeeCount : null,
        employeeCountSource: options.employeeEstimation ? "estimated" : null,
        estimatedRevenue: options.revenueEstimation ? estimatedRevenue.toString() : null,
        revenueSource: options.revenueEstimation ? "estimated" : null,
        estimatedValuation: options.valuationAnalysis ? estimatedValuation.toString() : null,
        valuationSource: options.valuationAnalysis ? "estimated" : null
      };
      const savedCompany = await storage.createCompany({
        companyNumber: companyData.company_number,
        companyName: companyData.company_name,
        status: companyData.company_status,
        incorporationDate,
        companyType: companyData.type,
        jurisdiction: companyData.jurisdiction,
        registeredAddress: companyData.registered_office_address,
        sicCodes,
        ...enhancedData
      });
      results.push(savedCompany);
      processedCount++;
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      failedCount++;
      errors.push({
        company: companyQuery,
        error: error instanceof Error ? error.message : "Processing failed"
      });
    }
    await storage.updateProcessingJob(jobId, {
      processedItems: processedCount,
      failedItems: failedCount
    });
  }
  const actualDuration = Math.floor((Date.now() - startTime) / 1e3);
  await storage.updateProcessingJob(jobId, {
    status: processedCount > 0 ? "completed" : "failed",
    results,
    errorLog: errors,
    actualDuration
  });
}
function generateCSV(companies2) {
  if (companies2.length === 0) return "";
  const headers = Object.keys(companies2[0]).join(",");
  const rows = companies2.map(
    (company) => Object.values(company).map(
      (value) => typeof value === "string" ? `"${value.replace(/"/g, '""')}"` : value
    ).join(",")
  );
  return [headers, ...rows].join("\n");
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
