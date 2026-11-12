import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  SaveCustomerProfileInput,
  SendCustomerLoginOtpInput,
  UpdateCustomerProfileInput,
  VerifyCustomerLoginOtpInput,
} from '@sharon/shared';
import { queryKeys } from '@/api/queryKeys';
import {
  getMyCustomerOrders,
  getMyCustomerProfile,
  lookupCustomerByPhone,
  saveCustomerProfile,
  sendCustomerLoginOtp,
  updateMyCustomerProfile,
  verifyCustomerLoginOtp,
} from '@/services/publicCustomer.service';
import { useCartStore } from '@/stores/useCartStore';
import { useCustomerAuthStore } from '@/stores/useCustomerAuthStore';

const indianMobileRegex = /^[6-9]\d{9}$/;

export function useCustomerLookupQuery(phone: string) {
  const trimmed = phone.trim();
  const isValid = indianMobileRegex.test(trimmed);

  return useQuery({
    queryKey: queryKeys.customerLookup(trimmed),
    queryFn: () => lookupCustomerByPhone(trimmed),
    enabled: isValid,
    staleTime: 60_000,
    retry: false,
  });
}

export function useSaveCustomerProfileMutation() {
  const setSavedIdentity = useCustomerAuthStore((s) => s.setSavedIdentity);
  const setCartProfile = useCartStore((s) => s.setCustomerProfile);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SaveCustomerProfileInput) => saveCustomerProfile(payload),
    onSuccess: (profile) => {
      setSavedIdentity({
        customerBusinessId: profile.businessId,
        fullName: profile.fullName,
        phone: profile.phone,
      });
      const currentCartProfile = useCartStore.getState().customerProfile;
      setCartProfile({
        customerName: profile.fullName,
        customerPhone: profile.phone,
        otpVerificationToken: currentCartProfile.otpVerificationToken,
      });
      queryClient.setQueryData(queryKeys.customerLookup(profile.phone), {
        found: true,
        fullName: profile.fullName,
      });
    },
  });
}

export function useSendCustomerLoginOtpMutation() {
  return useMutation({
    mutationFn: (payload: SendCustomerLoginOtpInput) => sendCustomerLoginOtp(payload),
  });
}

export function useVerifyCustomerLoginOtpMutation() {
  const setSession = useCustomerAuthStore((s) => s.setSession);
  const setCartProfile = useCartStore((s) => s.setCustomerProfile);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: VerifyCustomerLoginOtpInput) => verifyCustomerLoginOtp(payload),
    onSuccess: (loginResult) => {
      setSession({
        customerAccessToken: loginResult.customerAccessToken,
        customerBusinessId: loginResult.customer.businessId,
        fullName: loginResult.customer.fullName,
        phone: loginResult.customer.phone,
      });
      const currentCartProfile = useCartStore.getState().customerProfile;
      setCartProfile({
        customerName: loginResult.customer.fullName,
        customerPhone: loginResult.customer.phone,
        otpVerificationToken: currentCartProfile.otpVerificationToken,
      });
      queryClient.setQueryData(queryKeys.customerProfile, loginResult.customer);
      void queryClient.invalidateQueries({ queryKey: queryKeys.customerOrders });
    },
  });
}

export function useCustomerProfileQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.customerProfile,
    queryFn: getMyCustomerProfile,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useUpdateCustomerProfileMutation() {
  const updateFullName = useCustomerAuthStore((s) => s.updateFullName);
  const setCartProfile = useCartStore((s) => s.setCustomerProfile);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCustomerProfileInput) => updateMyCustomerProfile(payload),
    onSuccess: (updated) => {
      updateFullName(updated.fullName);
      const currentCartProfile = useCartStore.getState().customerProfile;
      setCartProfile({
        customerName: updated.fullName,
        customerPhone: updated.phone,
        otpVerificationToken: currentCartProfile.otpVerificationToken,
      });
      queryClient.setQueryData(queryKeys.customerProfile, updated);
    },
  });
}

export function useCustomerOrdersQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.customerOrders,
    queryFn: getMyCustomerOrders,
    enabled,
    staleTime: 15_000,
    retry: 1,
  });
}
