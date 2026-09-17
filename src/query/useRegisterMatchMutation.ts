import { useMutation, useQueryClient } from '@tanstack/react-query';
import { registerMatch } from '../api/history';

export function useRegisterMatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: registerMatch,
    onSuccess: () => {
      // A confirmed match affects both tabs; invalidate rather than guess the
      // exact page/config key that's currently on screen.
      void queryClient.invalidateQueries({ queryKey: ['ranking'] });
      void queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
}
