import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { type CompanySearch, type BulkUpload } from "@shared/schema";

export function useCompanyProcessing() {
  const queryClient = useQueryClient();

  const processCompanyMutation = useMutation({
    mutationFn: async (data: CompanySearch) => {
      const searchParams = new URLSearchParams();
      searchParams.set('company', data.query);
      
      if (data.options) {
        Object.entries(data.options).forEach(([key, value]) => {
          if (value === true) {
            searchParams.set(key.replace(/([A-Z])/g, '-$1').toLowerCase(), 'true');
          }
        });
      }

      const response = await apiRequest('GET', `/api/company?${searchParams.toString()}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/recent-jobs'] });
    },
  });

  return {
    processCompany: processCompanyMutation.mutateAsync,
    isProcessing: processCompanyMutation.isPending,
  };
}

export function useBulkProcessing() {
  const queryClient = useQueryClient();

  const processBulkMutation = useMutation({
    mutationFn: async (data: BulkUpload) => {
      const response = await apiRequest('POST', '/api/bulk-process', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recent-jobs'] });
    },
  });

  return {
    processBulk: processBulkMutation.mutateAsync,
    isProcessing: processBulkMutation.isPending,
  };
}
