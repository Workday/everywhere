import { useRequest } from '@workday/everywhere';
import { Card } from '@workday/canvas-kit-react/card';

interface Worker {
  descriptor: string;
}

export default function Home() {
  const { data, loading, error } = useRequest<Worker>('/common/v1/workers/me');

  if (loading) {
    return (
      <Card>
        <Card.Body>Loading…</Card.Body>
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <Card.Body>Error: {error.message}</Card.Body>
      </Card>
    );
  }
  return (
    <Card>
      <Card.Heading>Me</Card.Heading>
      <Card.Body>{data?.descriptor ?? 'No worker descriptor returned.'}</Card.Body>
    </Card>
  );
}
