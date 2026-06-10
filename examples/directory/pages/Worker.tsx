import { useNavigate, useParams } from '@workday/everywhere';
import WorkerProfile from '../components/WorkerProfile.js';
import { worker } from '../routes.js';

export default function Worker() {
  const { id } = useParams(worker);
  const navigate = useNavigate();
  return (
    <WorkerProfile
      workerPath={`/common/v1/workers/${id}`}
      onSelectWorker={(nextId) => navigate(worker, { id: nextId })}
    />
  );
}
