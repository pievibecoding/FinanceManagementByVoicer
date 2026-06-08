import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, Category } from '@/api/categories';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getCategories(),
  });
}

export function useAddCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (category: {
      category_name: string;
      category_type: string;
      icon: string;
      color: string;
    }) => categoriesApi.addCategory(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ categoryId, category }: {
      categoryId: string;
      category: {
        category_name?: string;
        category_type?: string;
        icon?: string;
        color?: string;
      };
    }) => categoriesApi.updateCategory(categoryId, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (categoryId: string) => categoriesApi.deleteCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
