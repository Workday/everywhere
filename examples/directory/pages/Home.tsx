import { useNavigate } from '@workday/everywhere';
import WorkerProfile from '../components/WorkerProfile.js';
import { worker } from '../routes.js';

export default function Home() {
  const navigate = useNavigate();
  return (
    <WorkerProfile
      workerPath="/common/v1/workers/me"
      onSelectWorker={(id) => navigate(worker, { id })}
    />
  );
}
