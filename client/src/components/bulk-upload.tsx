import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, CloudUpload, FileText, Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { processingOptionsSchema, type ProcessingOptions } from "@shared/schema";
import { useBulkProcessing } from "@/hooks/use-company-processing";
import { toast } from "@/hooks/use-toast";

export default function BulkUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { processBulk, isProcessing } = useBulkProcessing();

  const form = useForm<{ options: ProcessingOptions }>({
    resolver: zodResolver(processingOptionsSchema.partial()),
    defaultValues: {
      options: {
        parallelProcessing: true,
        errorHandling: true,
        emailNotification: false,
        priorityQueue: false,
      }
    }
  });

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      'text/plain',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a .txt, .csv, .xlsx, or .xls file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const parseFileContent = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        let companies: string[] = [];

        if (file.type === 'text/plain') {
          // Text file - one company per line
          companies = content.split('\n').map(line => line.trim()).filter(line => line);
        } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          // CSV file - parse rows
          const lines = content.split('\n').map(line => line.trim()).filter(line => line);
          
          // Skip header if it looks like a header
          const firstLine = lines[0]?.toLowerCase();
          const startIndex = (firstLine?.includes('company') || firstLine?.includes('name')) ? 1 : 0;
          
          companies = lines.slice(startIndex).map(line => {
            // Take first column that's not empty
            const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
            return columns.find(col => col) || '';
          }).filter(company => company);
        } else {
          // Excel files would need a proper parser library
          reject(new Error('Excel files not yet supported. Please use CSV or TXT format.'));
          return;
        }

        resolve(companies);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const onSubmit = async (data: { options: ProcessingOptions }) => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }

    try {
      const companies = await parseFileContent(selectedFile);
      
      if (companies.length === 0) {
        toast({
          title: "No Companies Found",
          description: "The uploaded file doesn't contain any valid company data.",
          variant: "destructive",
        });
        return;
      }

      await processBulk({ companies, options: data.options });
      
      toast({
        title: "Bulk Processing Started",
        description: `Processing ${companies.length} companies. You'll be notified when complete.`,
      });

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "Failed to start bulk processing",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Bulk Company Processing</h3>
          
          {/* File Upload Zone */}
          <div 
            className={`file-drop-zone rounded-lg p-8 text-center mb-6 cursor-pointer ${
              dragOver ? 'drag-over' : ''
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUpload className="mx-auto text-4xl text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium text-foreground mb-2">Drop your files here</h4>
            <p className="text-muted-foreground mb-4">or click to browse files</p>
            
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".txt,.csv,.xlsx,.xls"
              onChange={handleFileInputChange}
            />
            
            <Button type="button" variant="outline">
              Select File
            </Button>
            
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Supported formats: .txt, .csv, .xlsx, .xls</p>
              <p>Maximum file size: 10MB</p>
            </div>

            {selectedFile && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* File Format Examples */}
          <Card className="bg-muted mb-6">
            <CardHeader>
              <CardTitle className="text-sm">File Format Examples</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="font-medium text-foreground mb-1">Text file (.txt)</div>
                <div className="bg-card p-2 rounded border font-mono text-xs">
                  12345678<br />
                  Apple Inc<br />
                  87654321
                </div>
              </div>
              <div>
                <div className="font-medium text-foreground mb-1">CSV file (.csv)</div>
                <div className="bg-card p-2 rounded border font-mono text-xs">
                  company_name,number<br />
                  Apple Inc,12345678<br />
                  Google,87654321
                </div>
              </div>
              <div>
                <div className="font-medium text-foreground mb-1">Excel file (.xlsx)</div>
                <div className="bg-card p-2 rounded border font-mono text-xs">
                  Column A: Company names<br />
                  Column B: Numbers<br />
                  (Headers optional)
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Processing Options */}
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Cog className="w-4 h-4" />
              Bulk Processing Options
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="options.parallelProcessing"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm">Parallel Processing</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="options.errorHandling"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm">Advanced Error Handling</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="options.emailNotification"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm">Email Notification</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="options.priorityQueue"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm">Priority Queue</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          className="w-full bg-accent hover:bg-accent/90" 
          disabled={isProcessing || !selectedFile}
        >
          <Cog className="w-4 h-4 mr-2" />
          {isProcessing ? "Processing..." : "Process Company List"}
        </Button>
      </form>
    </Form>
  );
}
