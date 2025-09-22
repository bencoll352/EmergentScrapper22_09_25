import { FileText, Download, FileSpreadsheet, FileJson, FileImage } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function ExportOptions() {
  const handleExport = async (format: string) => {
    try {
      const response = await fetch(`/api/export?format=${format}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || `export.${format}`;
      
      if (format === 'json') {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        downloadBlob(blob, filename);
      } else {
        const blob = await response.blob();
        downloadBlob(blob, filename);
      }

      toast({
        title: "Export Complete",
        description: `Data exported successfully as ${format.toUpperCase()}.`,
      });

    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      });
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const exportOptions = [
    {
      id: 'csv',
      name: 'CSV Export',
      description: 'Spreadsheet format',
      icon: FileSpreadsheet,
      color: 'text-green-600',
    },
    {
      id: 'excel',
      name: 'Excel Export',
      description: 'Enhanced formatting',
      icon: FileSpreadsheet,
      color: 'text-green-700',
    },
    {
      id: 'json',
      name: 'JSON Export',
      description: 'API friendly',
      icon: FileJson,
      color: 'text-blue-600',
    },
    {
      id: 'pdf',
      name: 'PDF Report',
      description: 'Professional format',
      icon: FileText,
      color: 'text-red-600',
    },
  ];

  return (
    <Card className="mt-8 card-shadow">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          Export Enhanced Data
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {exportOptions.map((option) => (
            <Button
              key={option.id}
              variant="outline"
              className="flex flex-col items-center p-6 h-auto hover:border-primary hover:bg-primary/5 transition-colors"
              onClick={() => handleExport(option.id)}
            >
              <option.icon className={`text-2xl mb-2 ${option.color}`} />
              <span className="text-sm font-medium text-foreground">{option.name}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </Button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Export all processed company data with enhanced intelligence
          </div>
          <Button onClick={() => handleExport('json')}>
            <Download className="w-4 h-4 mr-2" />
            Bulk Export All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
