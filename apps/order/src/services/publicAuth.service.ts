import type { SendCustomerOtpInput, VerifyCustomerOtpInput } from '@sharon/shared';
import { unwrapApiPost } from '@/api/axiosClient';
import { PUBLIC_ENDPOINTS } from '@/api/endpoints';
import type {
  SendCustomerOtpResponse,
  VerifyCustomerOtpResponse,
} from '@/types/order';

export async function sendCustomerOtp(
  payload: SendCustomerOtpInput,
): Promise<SendCustomerOtpResponse> {
  return unwrapApiPost<SendCustomerOtpResponse, SendCustomerOtpInput>(
    PUBLIC_ENDPOINTS.SEND_CUSTOMER_OTP,
    payload,
  );
}

export async function verifyCustomerOtp(
  payload: VerifyCustomerOtpInput,
): Promise<VerifyCustomerOtpResponse> {
  return unwrapApiPost<VerifyCustomerOtpResponse, VerifyCustomerOtpInput>(
    PUBLIC_ENDPOINTS.VERIFY_CUSTOMER_OTP,
    payload,
  );
}
