import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download, RefreshCw, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ResultsTable() {
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/companies", { offset: currentPage * pageSize, limit: pageSize }],
    queryFn: async () => {
      const response = await fetch(`/api/companies?offset=${currentPage * pageSize}&limit=${pageSize}`);
      if (!response.ok) throw new Error('Failed to fetch companies');
      return response.json();
    }
  });

  const companies = data?.companies || [];
  const totalCompanies = data?.total || 0;
  const totalPages = Math.ceil(totalCompanies / pageSize);

  const formatCurrency = (value: string | null) => {
    if (!value) return '-';
    const num = parseFloat(value);
    if (num >= 1000000000) return `£${(num / 1000000000).toFixed(1)}B`;
    if (num >= 1000000) return `£${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `£${(num / 1000).toFixed(0)}K`;
    return `£${num.toLocaleString()}`;
  };

  const formatNumber = (value: number | null) => {
    if (!value) return '-';
    return value.toLocaleString();
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="secondary">Unknown</Badge>;
    
    const statusColors: Record<string, string> = {
      'active': 'bg-accent text-accent-foreground',
      'dissolved': 'bg-destructive text-destructive-foreground',
      'liquidation': 'bg-warning text-warning-foreground',
    };

    return (
      <Badge 
        variant="secondary" 
        className={statusColors[status.toLowerCase()] || 'bg-muted text-muted-foreground'}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Calculate summary stats
  const stats = companies.reduce((acc: any, company: any) => {
    acc.totalProcessed = companies.length;
    if (company.companyNumber) acc.verified++;
    if (company.employeeCount || company.estimatedRevenue || company.estimatedValuation) acc.enhanced++;
    if (company.estimatedValuation) acc.valuations++;
    return acc;
  }, { totalProcessed: 0, verified: 0, enhanced: 0, valuations: 0 });

  return (
    <Card className="mt-8 card-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Enhanced Data Results
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Results Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="gradient-primary text-white p-4 rounded-lg">
            <div className="text-2xl font-bold">{totalCompanies}</div>
            <div className="text-sm opacity-90">Total Processed</div>
            <div className="text-xs opacity-75 mt-1">All time</div>
          </div>
          <div className="gradient-accent text-white p-4 rounded-lg">
            <div className="text-2xl font-bold">{stats.verified}</div>
            <div className="text-sm opacity-90">Companies Verified</div>
            <div className="text-xs opacity-75 mt-1">
              {totalCompanies > 0 ? `${Math.round((stats.verified / totalCompanies) * 100)}%` : '0%'} success rate
            </div>
          </div>
          <div className="gradient-warning text-white p-4 rounded-lg">
            <div className="text-2xl font-bold">{stats.enhanced}</div>
            <div className="text-sm opacity-90">Data Enhanced</div>
            <div className="text-xs opacity-75 mt-1">
              {totalCompanies > 0 ? `${Math.round((stats.enhanced / totalCompanies) * 100)}%` : '0%'} coverage
            </div>
          </div>
          <div className="gradient-secondary text-white p-4 rounded-lg">
            <div className="text-2xl font-bold">{stats.valuations}</div>
            <div className="text-sm opacity-90">Valuations Calculated</div>
            <div className="text-xs opacity-75 mt-1">
              {totalCompanies > 0 ? `${Math.round((stats.valuations / totalCompanies) * 100)}%` : '0%'} coverage
            </div>
          </div>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No companies processed yet.</p>
            <p className="text-sm">Start by searching for a company or uploading a file.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Registration</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Revenue Est.</TableHead>
                    <TableHead>Valuation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company: any) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium text-foreground">{company.companyName}</div>
                          <div className="text-sm text-muted-foreground">{company.companyNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {company.incorporationDate ? new Date(company.incorporationDate).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatNumber(company.employeeCount)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatCurrency(company.estimatedRevenue)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatCurrency(company.estimatedValuation)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(company.status)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{currentPage * pageSize + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min((currentPage + 1) * pageSize, totalCompanies)}
                </span>{' '}
                of <span className="font-medium">{totalCompanies}</span> results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = currentPage < 3 ? i : currentPage - 2 + i;
                    if (page >= totalPages) return null;
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page + 1}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage >= totalPages - 1}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
