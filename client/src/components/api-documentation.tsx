import { Code, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function ApiDocumentation() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "API endpoint copied to clipboard.",
    });
  };

  const endpoints = [
    {
      title: "Single Company Endpoint",
      method: "GET",
      url: "/api/company?company=12345678&filing-history=true&financials=true&enhance=true",
      description: "Get detailed information for a single company",
      parameters: [
        { name: "company", required: true, description: "Company number or name" },
        { name: "cache", required: false, description: "Use cached result (true/false)" },
        { name: "filing-history", required: false, description: "Include filing history" },
        { name: "financials", required: false, description: "Include financial data" },
        { name: "enhance", required: false, description: "Include enhancement features" },
      ]
    },
    {
      title: "Company Search Endpoint",
      method: "GET", 
      url: "/api/search?q=apple&limit=10",
      description: "Search for companies by name",
      parameters: [
        { name: "q", required: true, description: "Company name to search" },
        { name: "limit", required: false, description: "Number of results (default: 10)" },
      ]
    },
    {
      title: "Bulk Processing Endpoint",
      method: "POST",
      url: "/api/bulk-process",
      description: "Process multiple companies at once",
      parameters: [
        { name: "companies", required: true, description: "Array of company names/numbers" },
        { name: "options", required: false, description: "Processing options object" },
      ]
    },
    {
      title: "Processing Status",
      method: "GET",
      url: "/api/status/{job_id}",
      description: "Check the status of a bulk processing job",
      parameters: [
        { name: "job_id", required: true, description: "ID of the processing job" },
      ]
    },
    {
      title: "Export Data",
      method: "GET",
      url: "/api/export?format=json&jobId={job_id}",
      description: "Export processed data in various formats",
      parameters: [
        { name: "format", required: false, description: "Export format (json, csv)" },
        { name: "jobId", required: false, description: "Specific job to export" },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">API Documentation</h3>
        <p className="text-muted-foreground mb-6">
          Integrate company intelligence directly into your applications using our REST API.
        </p>
      </div>

      {endpoints.map((endpoint, index) => (
        <Card key={index} className="bg-muted">
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{endpoint.title}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(endpoint.url)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 text-xs font-bold rounded ${
                  endpoint.method === 'GET' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {endpoint.method}
                </span>
              </div>
              <code className="block bg-card text-foreground p-3 rounded text-sm overflow-x-auto border">
                {endpoint.url}
              </code>
            </div>

            <p className="text-sm text-muted-foreground">{endpoint.description}</p>

            {endpoint.parameters.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-foreground mb-2">Parameters:</h5>
                <ul className="space-y-1">
                  {endpoint.parameters.map((param, paramIndex) => (
                    <li key={paramIndex} className="text-sm">
                      <code className="text-xs bg-muted px-1 rounded">{param.name}</code>
                      {param.required && <span className="text-destructive ml-1">*</span>}
                      <span className="text-muted-foreground ml-2">- {param.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Code className="w-4 h-4 text-primary" />
            Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Currently, no authentication is required for API access. Rate limits may apply for high-volume usage.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
