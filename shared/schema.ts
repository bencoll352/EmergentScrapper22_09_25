import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const companies = pgTable("companies", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const processingJobs = pgTable("processing_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobType: text("job_type").notNull(), // 'single' | 'bulk'
  status: text("status").default("pending"), // 'pending' | 'processing' | 'completed' | 'failed'
  totalItems: integer("total_items").default(1),
  processedItems: integer("processed_items").default(0),
  failedItems: integer("failed_items").default(0),
  
  // Processing options
  options: jsonb("options"), // Contains all processing flags and settings
  
  // Results
  results: jsonb("results"),
  errorLog: jsonb("error_log"),
  
  // Metadata
  estimatedDuration: integer("estimated_duration"), // in seconds
  actualDuration: integer("actual_duration"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const filingHistory = pgTable("filing_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id),
  filingDate: timestamp("filing_date"),
  filingType: text("filing_type"),
  description: text("description"),
  documentId: text("document_id"),
  category: text("category"),
  subcategory: text("subcategory"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProcessingJobSchema = createInsertSchema(processingJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertFilingHistorySchema = createInsertSchema(filingHistory).omit({
  id: true,
  createdAt: true,
});

// Processing options schema
export const processingOptionsSchema = z.object({
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
  priorityQueue: z.boolean().default(false),
});

// Company search schema
export const companySearchSchema = z.object({
  query: z.string().min(1, "Company name or number is required"),
  options: processingOptionsSchema.optional(),
});

// Bulk upload schema
export const bulkUploadSchema = z.object({
  companies: z.array(z.string()).min(1, "At least one company is required"),
  options: processingOptionsSchema.optional(),
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export type InsertProcessingJob = z.infer<typeof insertProcessingJobSchema>;
export type ProcessingJob = typeof processingJobs.$inferSelect;

export type InsertFilingHistory = z.infer<typeof insertFilingHistorySchema>;
export type FilingHistory = typeof filingHistory.$inferSelect;

export type ProcessingOptions = z.infer<typeof processingOptionsSchema>;
export type CompanySearch = z.infer<typeof companySearchSchema>;
export type BulkUpload = z.infer<typeof bulkUploadSchema>;
