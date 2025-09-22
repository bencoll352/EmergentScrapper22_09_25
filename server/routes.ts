import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { companySearchSchema, bulkUploadSchema, processingOptionsSchema, type ProcessingOptions } from "@shared/schema";
import { z } from "zod";

// Enhanced Companies House API integration with rate limiting, caching, and improved error handling
class CompaniesHouseService {
  private baseUrl = "https://api.company-information.service.gov.uk";
  private apiKey = process.env.COMPANIES_HOUSE_API_KEY || "";
  private lastRequestTime = 0;
  private minRequestInterval = 500; // 500ms between requests for rate limiting
  private cache = new Map<string, { timestamp: number; data: any }>();
  private cacheExpiry = 3600000; // 1 hour cache expiry in milliseconds

  private async enforceRateLimit() {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - elapsed));
    }
  }

  private getCacheKey(endpoint: string, params?: Record<string, any>): string {
    const paramStr = params ? JSON.stringify(params, Object.keys(params).sort()) : "";
    return `${endpoint}?${paramStr}`;
  }

  private isValidCache(cacheKey: string): boolean {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    return (Date.now() - cached.timestamp) < this.cacheExpiry;
  }

  private async makeRequest(endpoint: string, params?: Record<string, any>): Promise<any> {
    if (!this.apiKey) {
      throw new Error("Companies House API key not configured");
    }

    const cacheKey = this.getCacheKey(endpoint, params);
    
    // Check cache first
    if (this.isValidCache(cacheKey)) {
      console.log(`Using cached data for ${endpoint}`);
      return this.cache.get(cacheKey)!.data;
    }

    // Enforce rate limiting
    await this.enforceRateLimit();

    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
          'Accept': 'application/json',
          'User-Agent': 'Enhanced-Company-Intelligence-Platform/1.0'
        }
      });

      this.lastRequestTime = Date.now();

      // Handle rate limiting (HTTP 429)
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10) * 1000;
        console.warn(`Rate limited. Retrying after ${retryAfter}ms`);
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        return this.makeRequest(endpoint, params);
      }

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Company not found");
        }
        throw new Error(`Companies House API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache successful responses
      this.cache.set(cacheKey, { timestamp: Date.now(), data });
      
      return data;
    } catch (error) {
      console.error(`Companies House API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  private validateAndEnhanceCompanyData(data: any): any {
    // Ensure required fields exist
    const requiredFields = ['company_name', 'company_number', 'company_status'];
    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Add data retrieval timestamp
    data.data_retrieved_at = new Date().toISOString();

    // Add status interpretation
    const statusInterpretations: Record<string, string> = {
      'active': 'Company is actively trading',
      'dissolved': 'Company has been dissolved',
      'liquidation': 'Company is in liquidation',
      'receivership': 'Company is in receivership',
      'converted-closed': 'Company has been converted and closed',
      'insolvency-proceedings': 'Company is undergoing insolvency proceedings'
    };
    data.status_interpretation = statusInterpretations[data.company_status] || 'Unknown status';

    // Calculate company age in years
    if (data.date_of_creation) {
      try {
        const creationDate = new Date(data.date_of_creation);
        const now = new Date();
        data.age_years = (now.getTime() - creationDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      } catch (error) {
        console.warn('Could not parse company creation date:', data.date_of_creation);
        data.age_years = null;
      }
    }

    return data;
  }

  async searchCompany(query: string): Promise<any[]> {
    const params = {
      q: query,
      items_per_page: 20 // Increased for better search results
    };

    try {
      const data = await this.makeRequest('/search/companies', params);
      return data.items || [];
    } catch (error) {
      console.error('Companies House search error:', error);
      throw error;
    }
  }

  async getCompanyDetails(companyNumber: string): Promise<any> {
    try {
      const data = await this.makeRequest(`/company/${companyNumber}`);
      return this.validateAndEnhanceCompanyData(data);
    } catch (error) {
      console.error('Companies House details error:', error);
      throw error;
    }
  }

  async getFilingHistory(companyNumber: string): Promise<any[]> {
    try {
      const params = { items_per_page: 50 }; // Increased for more comprehensive history
      const data = await this.makeRequest(`/company/${companyNumber}/filing-history`, params);
      const filings = data.items || [];

      // Enhance filing data with categories
      return filings.map((filing: any) => ({
        ...filing,
        category: this.categorizeFilingType(filing.type || ''),
        days_since_filing: filing.date ? Math.floor((Date.now() - new Date(filing.date).getTime()) / (24 * 60 * 60 * 1000)) : null
      }));
    } catch (error) {
      console.error('Filing history error:', error);
      return [];
    }
  }

  private categorizeFilingType(filingType: string): string {
    const categories: Record<string, string[]> = {
      'accounts': ['AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AZ'],
      'annual-return': ['AR01', 'AR02', 'AR03', 'AR04', 'AR05', 'AR06', 'AR07', 'AR08', 'AR09', 'AR10', 'AR11'],
      'change-of-name': ['NM01', 'NM02', 'NM04', 'NM05', 'NM06'],
      'officer-appointment': ['AP01', 'AP02', 'AP03', 'AP04'],
      'officer-termination': ['TM01', 'TM02', 'TM03'],
      'capital': ['SH01', 'SH02', 'SH03', 'SH04', 'SH05', 'SH06', 'SH07', 'SH08', 'SH09', 'SH10'],
      'mortgage': ['MG01', 'MG02', 'MG03', 'MG04', 'MG05', 'MG06', 'MG07', 'MG08', 'MG09', 'MG10'],
      'incorporation': ['IN01'],
      'dissolution': ['DS01']
    };

    for (const [category, types] of Object.entries(categories)) {
      if (types.includes(filingType)) {
        return category;
      }
    }
    return 'other';
  }

  // Clear cache when needed (e.g., for fresh data requirements)
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache statistics for monitoring
  getCacheStats(): { size: number; oldestEntry: number | null } {
    const now = Date.now();
    let oldest: number | null = null;
    
    const values = Array.from(this.cache.values());
    for (const { timestamp } of values) {
      if (oldest === null || timestamp < oldest) {
        oldest = timestamp;
      }
    }
    
    return {
      size: this.cache.size,
      oldestEntry: oldest ? now - oldest : null
    };
  }
}

// Enhanced data service for employee estimation, revenue calculation, etc.
class EnhancementService {
  estimateEmployeeCount(companyData: any, sicCodes: string[] = []) {
    const companyType = companyData.type || '';
    const incorporationDate = new Date(companyData.date_of_creation);
    const companyAge = new Date().getFullYear() - incorporationDate.getFullYear();
    
    // Realistic UK SME employee estimation based on ONS data
    // Most UK limited companies are small (1-9 employees: 95.7% of businesses)
    let baseEmployees = 2; // Minimum realistic staffing
    
    // Construction sector realistic sizing (most are micro businesses)
    if (sicCodes.some(code => code.startsWith('43'))) {
      // Specialized construction activities - typically 1-5 employees
      baseEmployees = Math.max(1, Math.min(4, companyAge > 5 ? 3 : 2));
    } else if (sicCodes.some(code => code.startsWith('41'))) {
      // General construction - slightly larger
      baseEmployees = Math.max(2, Math.min(8, companyAge > 10 ? 6 : 3));
    } else if (sicCodes.some(code => code.startsWith('42'))) {
      // Civil engineering - larger projects
      baseEmployees = Math.max(5, Math.min(15, companyAge > 15 ? 12 : 7));
    } else if (sicCodes.some(code => code.startsWith('81'))) {
      // Services to buildings and landscape - very small
      baseEmployees = Math.max(1, Math.min(3, companyAge > 3 ? 2 : 1));
    } else {
      // Default for other sectors
      baseEmployees = Math.max(1, Math.min(5, companyAge > 8 ? 4 : 2));
    }
    
    // Age-based realistic growth (most UK SMEs don't grow beyond 10 employees)
    if (companyAge > 20) baseEmployees = Math.floor(baseEmployees * 1.5);
    else if (companyAge > 10) baseEmployees = Math.floor(baseEmployees * 1.3);
    else if (companyAge > 5) baseEmployees = Math.floor(baseEmployees * 1.1);
    
    // Cap at realistic SME size (99% of UK businesses have <50 employees)
    return Math.max(1, Math.min(baseEmployees, 12));
  }

  estimateRevenue(employeeCount: number, sicCodes: string[] = [], location: string = 'UK') {
    // Realistic UK SME revenue per employee (ONS data: median £45k-£65k per employee)
    let revenuePerEmployee = 55000; // Conservative UK SME average
    
    // Construction industry realistic revenue per employee (typically £40k-£80k)
    if (sicCodes.some(code => code.startsWith('43'))) {
      // Specialized construction (roofing, plumbing, electrical)
      revenuePerEmployee = 48000; // Lower margin, competitive trades
    } else if (sicCodes.some(code => code.startsWith('41'))) {
      // General construction
      revenuePerEmployee = 62000; // Slightly higher for building work
    } else if (sicCodes.some(code => code.startsWith('42'))) {
      // Civil engineering
      revenuePerEmployee = 75000; // Higher value infrastructure work
    } else if (sicCodes.some(code => code.startsWith('81'))) {
      // Landscaping and grounds maintenance
      revenuePerEmployee = 35000; // Lower margin service work
    }
    
    // Small business reality - lower efficiency than large corporations
    let efficiencyFactor = 1.0;
    if (employeeCount <= 2) efficiencyFactor = 0.75; // Solo/micro business challenges
    else if (employeeCount <= 5) efficiencyFactor = 0.85; // Small team coordination
    else if (employeeCount <= 10) efficiencyFactor = 0.95; // Optimal small business size
    
    const estimatedRevenue = employeeCount * revenuePerEmployee * efficiencyFactor;
    return Math.floor(estimatedRevenue);
  }

  estimateValuation(revenue: number, employeeCount: number, sicCodes: string[] = [], companyAge: number = 0) {
    // Realistic UK SME valuation multiples (typically 0.5x - 2.0x revenue for small businesses)
    let revenueMultiple = 0.8; // Conservative SME multiple
    
    // Construction industry realistic multiples (asset-light service businesses)
    if (sicCodes.some(code => code.startsWith('43'))) {
      // Specialized construction trades
      revenueMultiple = 0.6; // Lower multiples for competitive trades
    } else if (sicCodes.some(code => code.startsWith('41'))) {
      // General construction
      revenueMultiple = 0.9; // Slightly higher for established builders
    } else if (sicCodes.some(code => code.startsWith('42'))) {
      // Civil engineering
      revenueMultiple = 1.2; // Higher for specialized infrastructure
    } else if (sicCodes.some(code => code.startsWith('81'))) {
      // Landscaping services
      revenueMultiple = 0.5; // Low asset, competitive service business
    }
    
    // Age-based stability premium (but modest for SMEs)
    let maturityBonus = 1.0;
    if (companyAge > 15) maturityBonus = 1.15; // Established track record
    else if (companyAge > 8) maturityBonus = 1.08; // Proven operations
    else if (companyAge > 3) maturityBonus = 1.02; // Past startup phase
    else if (companyAge < 2) maturityBonus = 0.85; // Startup risk discount
    
    // Small business liquidity discount (harder to sell than large companies)
    let liquidityDiscount = 0.9;
    if (employeeCount <= 2) liquidityDiscount = 0.75; // Very small, owner-dependent
    else if (employeeCount <= 5) liquidityDiscount = 0.85; // Small team dependency
    
    const estimatedValuation = revenue * revenueMultiple * maturityBonus * liquidityDiscount;
    return Math.floor(estimatedValuation);
  }
}

const companiesHouseService = new CompaniesHouseService();
const enhancementService = new EnhancementService();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Single company search and processing
  app.get("/api/company", async (req, res) => {
    let job: any = null;
    try {
      const { company, cache, 'filing-history': filingHistory, financials, enhance } = req.query;
      
      if (!company) {
        return res.status(400).json({ error: "Company parameter is required" });
      }

      const companyQuery = company as string;
      const useCache = cache !== 'false';
      const includeFilingHistory = filingHistory === 'true';
      const includeFinancials = financials === 'true';
      const includeEnhancement = enhance === 'true';

      // Create a processing job for UI tracking
      job = await storage.createProcessingJob({
        jobType: "single",
        totalItems: 1,
        options: {
          useCache,
          filingHistory: includeFilingHistory,
          financialData: includeFinancials,
          employeeEstimation: includeEnhancement,
          revenueEstimation: includeEnhancement,
          valuationAnalysis: includeEnhancement,
          parallelProcessing: false,
          errorHandling: true
        },
      });

      // Update job status to processing
      await storage.updateProcessingJob(job.id, {
        status: "processing",
        processedItems: 0,
      });

      // Check cache first
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
        // Update job status to completed for cache hit
        await storage.updateProcessingJob(job.id, {
          status: "completed",
          processedItems: 1,
          results: { companies: [existingCompany] },
        });

        return res.json({
          company: existingCompany,
          cached: true,
          filings: includeFilingHistory ? await storage.getFilingsByCompany(existingCompany.id) : undefined,
          jobId: job.id
        });
      }

      // Search Companies House
      let companyData;
      if (companyQuery.match(/^\d{8}$/)) {
        // Direct company number lookup
        companyData = await companiesHouseService.getCompanyDetails(companyQuery);
      } else {
        // Search by name
        const searchResults = await companiesHouseService.searchCompany(companyQuery);
        if (searchResults.length === 0) {
          // Mark job as failed for no results
          await storage.updateProcessingJob(job.id, {
            status: "failed",
            errorLog: { error: "Company not found" },
          });
          return res.status(404).json({ error: "Company not found", jobId: job.id });
        }
        companyData = await companiesHouseService.getCompanyDetails(searchResults[0].company_number);
      }

      // Process and enhance the data
      const sicCodes = companyData.sic_codes || [];
      const incorporationDate = new Date(companyData.date_of_creation);
      const companyAge = new Date().getFullYear() - incorporationDate.getFullYear();

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
          valuationSource: "estimated",
        };
      }

      // Save to storage
      const newCompany = await storage.createCompany({
        companyNumber: companyData.company_number,
        companyName: companyData.company_name,
        status: companyData.company_status,
        incorporationDate: incorporationDate,
        companyType: companyData.type,
        jurisdiction: companyData.jurisdiction,
        registeredAddress: companyData.registered_office_address,
        sicCodes,
        ...enhancedData,
      });

      // Get filing history if requested
      let filings: any[] = [];
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
            subcategory: filing.subcategory,
          });
        }
        filings = await storage.getFilingsByCompany(newCompany.id);
      }

      // Update job status to completed
      await storage.updateProcessingJob(job.id, {
        status: "completed",
        processedItems: 1,
        results: { companies: [newCompany] },
      });

      res.json({
        company: newCompany,
        cached: false,
        filings: includeFilingHistory ? filings : undefined,
        jobId: job.id
      });

    } catch (error) {
      console.error("Company processing error:", error);
      
      // Update job status to failed if job was created
      try {
        if (job) {
          await storage.updateProcessingJob(job.id, {
            status: "failed",
            errorLog: { error: error instanceof Error ? error.message : "Processing failed" },
          });
        }
      } catch (jobError) {
        console.error("Failed to update job status:", jobError);
      }

      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to process company data",
        jobId: job?.id
      });
    }
  });

  // Company search endpoint
  app.get("/api/search", async (req, res) => {
    try {
      const { q, limit = "10" } = req.query;
      
      if (!q) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const searchLimit = Math.min(parseInt(limit as string), 50);
      
      // Search both local storage and Companies House
      const localResults = await storage.searchCompanies(q as string, searchLimit);
      
      if (localResults.length >= searchLimit) {
        return res.json({ companies: localResults });
      }

      // Supplement with Companies House search
      try {
        const companiesHouseResults = await companiesHouseService.searchCompany(q as string);
        const combinedResults = [
          ...localResults,
          ...companiesHouseResults.slice(0, searchLimit - localResults.length)
        ];
        
        res.json({ companies: combinedResults });
      } catch (error) {
        // If Companies House fails, return local results
        res.json({ companies: localResults });
      }

    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Search failed" 
      });
    }
  });

  // Bulk processing endpoint
  app.post("/api/bulk-process", async (req, res) => {
    try {
      const validation = bulkUploadSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: validation.error.errors 
        });
      }

      const { companies, options } = validation.data;
      
      // Create processing job
      const job = await storage.createProcessingJob({
        jobType: "bulk",
        totalItems: companies.length,
        options,
      });

      // Start async processing
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
        priorityQueue: false,
      };
      processBulkCompanies(job.id, companies, processingOptions);

      res.json({ 
        jobId: job.id,
        message: "Bulk processing started",
        totalItems: companies.length 
      });

    } catch (error) {
      console.error("Bulk processing error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to start bulk processing" 
      });
    }
  });

  // Job status endpoint
  app.get("/api/status/:jobId", async (req, res) => {
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

  // Get processed companies with pagination
  app.get("/api/companies", async (req, res) => {
    try {
      const { offset = "0", limit = "50" } = req.query;
      const result = await storage.getCompanies(
        parseInt(offset as string), 
        parseInt(limit as string)
      );
      
      res.json(result);

    } catch (error) {
      console.error("Companies list error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to get companies" 
      });
    }
  });

  // Recent processing jobs
  app.get("/api/recent-jobs", async (req, res) => {
    try {
      const { limit = "10" } = req.query;
      const jobs = await storage.getRecentJobs(parseInt(limit as string));
      
      res.json({ jobs });

    } catch (error) {
      console.error("Recent jobs error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to get recent jobs" 
      });
    }
  });

  // Clear corrupted data endpoint (for debugging accuracy issues)
  app.post("/api/clear-data", async (req, res) => {
    try {
      console.log("Clearing all stored company data to remove mock/corrupted entries");
      
      // Clear all companies and jobs to ensure fresh authentic data only
      await storage.clearAllData?.();
      
      res.json({ 
        message: "All data cleared successfully. Ready for fresh Companies House data.",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Clear data error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to clear data" 
      });
    }
  });

  // Export endpoint
  app.get("/api/export", async (req, res) => {
    try {
      const { format = "json", jobId } = req.query;
      
      let companies;
      if (jobId) {
        const job = await storage.getProcessingJob(jobId as string);
        if (!job || !job.results) {
          return res.status(404).json({ error: "Job not found or not completed" });
        }
        companies = Array.isArray(job.results) ? job.results : [];
      } else {
        const result = await storage.getCompanies(0, 1000); // Get all companies
        companies = result.companies;
      }

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      
      switch (format) {
        case 'csv':
          const csv = generateCSV(companies);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="companies-${timestamp}.csv"`);
          res.send(csv);
          break;
          
        case 'json':
        default:
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="companies-${timestamp}.json"`);
          res.json({ companies, exportedAt: new Date().toISOString() });
          break;
      }

    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Export failed" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Async bulk processing function
async function processBulkCompanies(jobId: string, companies: string[], options: ProcessingOptions) {
  const startTime = Date.now();
  let processedCount = 0;
  let failedCount = 0;
  const results: any[] = [];
  const errors: any[] = [];

  await storage.updateProcessingJob(jobId, { 
    status: "processing",
    processedItems: 0,
    estimatedDuration: companies.length * 2 // 2 seconds per company estimate
  });

  for (const companyQuery of companies) {
    try {
      let companyData;
      
      if (companyQuery.match(/^\d{8}$/)) {
        // Direct company number lookup
        companyData = await companiesHouseService.getCompanyDetails(companyQuery);
      } else {
        // Search by company name with multiple variations
        let searchResults = await companiesHouseService.searchCompany(companyQuery);
        
        // If no results, try search variations
        if (searchResults.length === 0) {
          const variations = [
            `${companyQuery} LIMITED`,
            `${companyQuery} LTD`,
            `${companyQuery} SERVICES`,
            companyQuery.replace(/\s+/g, ' ').trim() // Clean whitespace
          ];
          
          for (const variation of variations) {
            searchResults = await companiesHouseService.searchCompany(variation);
            if (searchResults.length > 0) break;
          }
        }
        
        if (searchResults.length > 0) {
          // Use exact or best match from search results
          const bestMatch = searchResults.find(result => {
            const resultName = result.title.toLowerCase();
            const queryName = companyQuery.toLowerCase();
            return resultName.includes(queryName) || queryName.includes(resultName);
          }) || searchResults[0];
          
          companyData = await companiesHouseService.getCompanyDetails(bestMatch.company_number);
        } else {
          // Company genuinely not found in Companies House - skip with proper error
          throw new Error(`Company "${companyQuery}" not found in Companies House registry. This may be a sole trader, partnership, or inactive business not required to register.`);
        }
      }

      // Enhanced processing with data validation
      const sicCodes = Array.isArray(companyData.sic_codes) ? companyData.sic_codes : [];
      const incorporationDate = new Date(companyData.date_of_creation);
      const companyAge = new Date().getFullYear() - incorporationDate.getFullYear();

      // Validate SIC codes - ensure they are strings and valid format
      const validSicCodes = sicCodes.filter((code: any) => 
        typeof code === 'string' && code.match(/^\d{5}$/)
      );

      // Calculate enhancement data using validated SIC codes
      const employeeCount = enhancementService.estimateEmployeeCount(companyData, validSicCodes);
      const estimatedRevenue = enhancementService.estimateRevenue(employeeCount, validSicCodes);
      const estimatedValuation = enhancementService.estimateValuation(estimatedRevenue, employeeCount, validSicCodes, companyAge);

      // ALWAYS include enhancement data - this is the core value proposition
      const enhancedData = {
        employeeCount: employeeCount,
        employeeCountSource: "estimated",
        estimatedRevenue: estimatedRevenue.toString(),
        revenueSource: "estimated",
        estimatedValuation: estimatedValuation.toString(),
        valuationSource: "estimated",
      };

      const savedCompany = await storage.createCompany({
        companyNumber: companyData.company_number,
        companyName: companyData.company_name,
        status: companyData.company_status,
        incorporationDate,
        companyType: companyData.type,
        jurisdiction: companyData.jurisdiction,
        registeredAddress: companyData.registered_office_address,
        sicCodes: validSicCodes, // Use validated SIC codes
        ...enhancedData,
      });

      results.push(savedCompany);
      processedCount++;

      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      failedCount++;
      errors.push({
        company: companyQuery,
        error: error instanceof Error ? error.message : "Processing failed"
      });
    }

    // Update progress
    await storage.updateProcessingJob(jobId, {
      processedItems: processedCount,
      failedItems: failedCount,
    });
  }

  // Complete the job
  const actualDuration = Math.floor((Date.now() - startTime) / 1000);
  await storage.updateProcessingJob(jobId, {
    status: processedCount > 0 ? "completed" : "failed",
    results,
    errorLog: errors,
    actualDuration,
  });
}

// Helper function to generate CSV with proper array and object handling
function generateCSV(companies: any[]): string {
  if (companies.length === 0) return '';
  
  const headers = Object.keys(companies[0]).join(',');
  const rows = companies.map(company => 
    Object.values(company).map(value => {
      // Handle arrays (like SIC codes)
      if (Array.isArray(value)) {
        return `"${value.join(';')}"`;
      }
      // Handle objects (like addresses)
      if (typeof value === 'object' && value !== null) {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      // Handle strings
      if (typeof value === 'string') {
        return `"${value.replace(/"/g, '""')}"`;
      }
      // Handle null/undefined
      if (value === null || value === undefined) {
        return '';
      }
      // Handle other primitives
      return value;
    }).join(',')
  );
  
  return [headers, ...rows].join('\n');
}
