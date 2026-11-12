import { useNavigate } from 'react-router-dom';
import { SystemErrorView } from '../components/common/SystemErrorView';

export function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <SystemErrorView
      code="403"
      title="Access Restricted"
      subtitle="This section requires Managing Director (MD) privileges or belongs to a different outlet branch."
      actionLabel="Return to Live KDS"
      onAction={() => navigate('/kds', { replace: true })}
    />
  );
}
