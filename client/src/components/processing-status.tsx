import { useQuery } from "@tanstack/react-query";
import { BarChart3, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function ProcessingStatus() {
  const { data: recentJobs = [], isLoading } = useQuery({
    queryKey: ["/api/recent-jobs"],
    refetchInterval: 5000, // Refresh every 5 seconds
    select: (data: any) => data.jobs || []
  });

  const activeJob = recentJobs.find((job: any) => job.status === 'processing');
  const completedJobs = recentJobs.filter((job: any) => job.status === 'completed');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-accent';
      case 'processing':
        return 'bg-warning';
      case 'failed':
        return 'bg-destructive';
      default:
        return 'bg-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'processing':
        return <Clock className="w-4 h-4 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Processing Status */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Processing Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeJob ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Status:</span>
                <Badge variant="secondary" className="bg-warning text-warning-foreground">
                  Processing
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round((activeJob.processedItems / activeJob.totalItems) * 100)}%</span>
                </div>
                <Progress 
                  value={(activeJob.processedItems / activeJob.totalItems) * 100} 
                  className="h-2"
                />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Processed:</span>
                  <span>{activeJob.processedItems} / {activeJob.totalItems}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Failed:</span>
                  <span>{activeJob.failedItems || 0}</span>
                </div>
              </div>

              <div className="bg-primary/5 rounded-lg p-3 mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Est. Time Remaining:</span>
                  <span className="font-medium">
                    {activeJob.estimatedDuration 
                      ? `${Math.max(0, activeJob.estimatedDuration - (activeJob.actualDuration || 0))}s`
                      : '-'
                    }
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Status:</span>
                <Badge variant="secondary" className="bg-accent text-accent-foreground">
                  Ready
                </Badge>
              </div>
              <div className="text-center py-4 text-muted-foreground">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active processing jobs</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent Results */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-secondary" />
            Recent Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">No recent processing jobs</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentJobs.slice(0, 5).map((job: any) => (
                <div key={job.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">
                      {job.jobType === 'bulk' 
                        ? `Bulk Upload (${job.totalItems} companies)`
                        : 'Single Company'
                      }
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(job.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <Badge 
                      variant="secondary" 
                      className={`${getStatusColor(job.status)} text-white`}
                    >
                      <span className="flex items-center gap-1">
                        {getStatusIcon(job.status)}
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </Badge>
                    {job.actualDuration && (
                      <span className="text-muted-foreground">{job.actualDuration}s</span>
                    )}
                  </div>
                  {job.status === 'processing' && (
                    <div className="mt-2">
                      <Progress 
                        value={(job.processedItems / job.totalItems) * 100} 
                        className="h-1"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
