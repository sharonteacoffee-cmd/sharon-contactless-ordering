import type {
  CustomerLoginResult,
  CustomerLookupResult,
  CustomerOrderHistoryItem,
  CustomerProfileDto,
  SaveCustomerProfileInput,
  SendCustomerLoginOtpInput,
  SendCustomerLoginOtpResult,
  UpdateCustomerProfileInput,
  VerifyCustomerLoginOtpInput,
} from '@sharon/shared';
import { unwrapApiGet, unwrapApiPost, unwrapApiPut } from '@/api/axiosClient';
import { PUBLIC_ENDPOINTS } from '@/api/endpoints';

export async function lookupCustomerByPhone(phone: string): Promise<CustomerLookupResult> {
  return unwrapApiGet<CustomerLookupResult>(PUBLIC_ENDPOINTS.CUSTOMER_LOOKUP_BY_PHONE, {
    phone,
  });
}

export async function saveCustomerProfile(
  payload: SaveCustomerProfileInput,
): Promise<CustomerProfileDto> {
  return unwrapApiPost<CustomerProfileDto, SaveCustomerProfileInput>(
    PUBLIC_ENDPOINTS.CUSTOMER_SAVE_PROFILE,
    payload,
  );
}

export async function sendCustomerLoginOtp(
  payload: SendCustomerLoginOtpInput,
): Promise<SendCustomerLoginOtpResult> {
  return unwrapApiPost<SendCustomerLoginOtpResult, SendCustomerLoginOtpInput>(
    PUBLIC_ENDPOINTS.CUSTOMER_SEND_LOGIN_OTP,
    payload,
  );
}

export async function verifyCustomerLoginOtp(
  payload: VerifyCustomerLoginOtpInput,
): Promise<CustomerLoginResult> {
  return unwrapApiPost<CustomerLoginResult, VerifyCustomerLoginOtpInput>(
    PUBLIC_ENDPOINTS.CUSTOMER_VERIFY_LOGIN_OTP,
    payload,
  );
}

export async function getMyCustomerProfile(): Promise<CustomerProfileDto> {
  return unwrapApiGet<CustomerProfileDto>(PUBLIC_ENDPOINTS.CUSTOMER_GET_MY_PROFILE);
}

export async function updateMyCustomerProfile(
  payload: UpdateCustomerProfileInput,
): Promise<CustomerProfileDto> {
  return unwrapApiPut<CustomerProfileDto, UpdateCustomerProfileInput>(
    PUBLIC_ENDPOINTS.CUSTOMER_UPDATE_MY_PROFILE,
    payload,
  );
}

export async function getMyCustomerOrders(): Promise<CustomerOrderHistoryItem[]> {
  return unwrapApiGet<CustomerOrderHistoryItem[]>(PUBLIC_ENDPOINTS.CUSTOMER_GET_MY_ORDERS);
}
