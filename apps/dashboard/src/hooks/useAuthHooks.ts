import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { StaffLoginInput } from '@sharon/shared';
import { dashboardQueryKeys } from '../api/queryKeys';
import { getCurrentProfile, loginStaff } from '../services/auth.service';
import { useDashboardUiStore } from '../stores/useDashboardUiStore';

export function useCurrentProfileQuery(enabled = true) {
  const token = useDashboardUiStore((state) => state.token);
  return useQuery({
    queryKey: dashboardQueryKeys.auth.profile,
    queryFn: getCurrentProfile,
    enabled: enabled && Boolean(token),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useStaffLoginMutation() {
  const queryClient = useQueryClient();
  const setSession = useDashboardUiStore((state) => state.setSession);

  return useMutation({
    mutationFn: (payload: StaffLoginInput) => loginStaff(payload),
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
      queryClient.setQueryData(dashboardQueryKeys.auth.profile, data.user);
    },
  });
}
