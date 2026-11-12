import { useNavigate } from 'react-router-dom';
import { SystemErrorView } from '../components/common/SystemErrorView';

export function ServiceUnavailablePage() {
  const navigate = useNavigate();

  return (
    <SystemErrorView
      code="503"
      title="Contactless API Temporarily Unavailable"
      subtitle="The backend server is undergoing maintenance or temporarily unreachable. Please retry in a moment."
      actionLabel="Retry KDS"
      onAction={() => navigate('/kds', { replace: true })}
    />
  );
}
