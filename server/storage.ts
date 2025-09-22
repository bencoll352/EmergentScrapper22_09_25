import { type User, type InsertUser, type Company, type InsertCompany, type ProcessingJob, type InsertProcessingJob, type FilingHistory, type InsertFilingHistory } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Company methods
  getCompany(id: string): Promise<Company | undefined>;
  getCompanyByNumber(companyNumber: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, updates: Partial<Company>): Promise<Company | undefined>;
  searchCompanies(query: string, limit?: number): Promise<Company[]>;
  getCompanies(offset?: number, limit?: number): Promise<{ companies: Company[], total: number }>;

  // Processing job methods
  createProcessingJob(job: InsertProcessingJob): Promise<ProcessingJob>;
  getProcessingJob(id: string): Promise<ProcessingJob | undefined>;
  updateProcessingJob(id: string, updates: Partial<ProcessingJob>): Promise<ProcessingJob | undefined>;
  getRecentJobs(limit?: number): Promise<ProcessingJob[]>;

  // Filing history methods
  createFilingHistory(filing: InsertFilingHistory): Promise<FilingHistory>;
  getFilingsByCompany(companyId: string): Promise<FilingHistory[]>;

  // Data management methods
  clearAllData?(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private companies: Map<string, Company>;
  private processingJobs: Map<string, ProcessingJob>;
  private filingHistory: Map<string, FilingHistory>;

  constructor() {
    this.users = new Map();
    this.companies = new Map();
    this.processingJobs = new Map();
    this.filingHistory = new Map();
    this.initializeMockData();
  }

  private initializeMockData() {
    // Initialize with empty storage - no mock data to ensure authentic Companies House data only
    // All companies will be populated through real Companies House API calls with accurate calculations
    console.log("MemStorage initialized with no mock data - using authentic Companies House data only");
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Company methods
  async getCompany(id: string): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async getCompanyByNumber(companyNumber: string): Promise<Company | undefined> {
    return Array.from(this.companies.values()).find(
      (company) => company.companyNumber === companyNumber,
    );
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const id = randomUUID();
    const now = new Date();
    const company: Company = { 
      ...insertCompany, 
      id,
      createdAt: now,
      updatedAt: now,
      lastProcessed: now,
      processingStatus: "completed",
      dataQualityScore: "0.95",
      status: insertCompany.status || null,
      incorporationDate: insertCompany.incorporationDate || null,
      companyType: insertCompany.companyType || null,
      jurisdiction: insertCompany.jurisdiction || null,
      registeredAddress: insertCompany.registeredAddress || null,
      sicCodes: insertCompany.sicCodes || null,
      employeeCount: insertCompany.employeeCount || null,
      employeeCountSource: insertCompany.employeeCountSource || null,
      estimatedRevenue: insertCompany.estimatedRevenue || null,
      revenueSource: insertCompany.revenueSource || null,
      estimatedValuation: insertCompany.estimatedValuation || null,
      valuationSource: insertCompany.valuationSource || null
    };
    this.companies.set(id, company);
    return company;
  }

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company | undefined> {
    const company = this.companies.get(id);
    if (!company) return undefined;
    
    const updatedCompany = { ...company, ...updates, updatedAt: new Date() };
    this.companies.set(id, updatedCompany);
    return updatedCompany;
  }

  async searchCompanies(query: string, limit: number = 10): Promise<Company[]> {
    const normalizedQuery = query.toLowerCase();
    return Array.from(this.companies.values())
      .filter(company => 
        company.companyName.toLowerCase().includes(normalizedQuery) ||
        company.companyNumber.includes(query)
      )
      .slice(0, limit);
  }

  async getCompanies(offset: number = 0, limit: number = 50): Promise<{ companies: Company[], total: number }> {
    const allCompanies = Array.from(this.companies.values());
    const companies = allCompanies
      .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime())
      .slice(offset, offset + limit);
    
    return { companies, total: allCompanies.length };
  }

  // Processing job methods
  async createProcessingJob(insertJob: InsertProcessingJob): Promise<ProcessingJob> {
    const id = randomUUID();
    const now = new Date();
    const job: ProcessingJob = { 
      ...insertJob,
      options: insertJob.options || {},
      id,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      status: "pending",
      totalItems: insertJob.totalItems || 1,
      processedItems: insertJob.processedItems || 0,
      failedItems: insertJob.failedItems || 0,
      results: null,
      errorLog: null,
      estimatedDuration: null,
      actualDuration: null
    };
    this.processingJobs.set(id, job);
    return job;
  }

  async getProcessingJob(id: string): Promise<ProcessingJob | undefined> {
    return this.processingJobs.get(id);
  }

  async updateProcessingJob(id: string, updates: Partial<ProcessingJob>): Promise<ProcessingJob | undefined> {
    const job = this.processingJobs.get(id);
    if (!job) return undefined;
    
    const updatedJob = { ...job, ...updates, updatedAt: new Date() };
    if (updates.status === "completed" || updates.status === "failed") {
      updatedJob.completedAt = new Date();
    }
    
    this.processingJobs.set(id, updatedJob);
    return updatedJob;
  }

  async getRecentJobs(limit: number = 10): Promise<ProcessingJob[]> {
    return Array.from(this.processingJobs.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
  }

  // Filing history methods
  async createFilingHistory(insertFiling: InsertFilingHistory): Promise<FilingHistory> {
    const id = randomUUID();
    const filing: FilingHistory = { 
      ...insertFiling, 
      id,
      createdAt: new Date(),
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

  async getFilingsByCompany(companyId: string): Promise<FilingHistory[]> {
    return Array.from(this.filingHistory.values())
      .filter(filing => filing.companyId === companyId)
      .sort((a, b) => new Date(b.filingDate!).getTime() - new Date(a.filingDate!).getTime());
  }

  // Clear all data for debugging accuracy issues
  async clearAllData(): Promise<void> {
    this.companies.clear();
    this.processingJobs.clear();
    this.filingHistory.clear();
    console.log("All storage cleared - ready for authentic Companies House data only");
  }
}

export const storage = new MemStorage();
