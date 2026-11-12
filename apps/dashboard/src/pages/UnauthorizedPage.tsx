import { useNavigate } from 'react-router-dom';
import { SystemErrorView } from '../components/common/SystemErrorView';

export function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <SystemErrorView
      code="401"
      title="Session Expired or Unauthorized"
      subtitle="Your operations portal session has expired or is invalid. Please sign in again to access the live KDS."
      actionLabel="Go to Login"
      onAction={() => navigate('/login', { replace: true })}
    />
  );
}
