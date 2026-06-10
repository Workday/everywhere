import { useState } from 'react';
import { useRequest } from '@workday/everywhere';
import { Card } from '@workday/canvas-kit-react/card';
import { Avatar } from '@workday/canvas-kit-react/avatar';
import { Flex } from '@workday/canvas-kit-react/layout';
import {
  StatusIndicator,
  StatusIndicatorType,
} from '@workday/canvas-kit-react/status-indicator';
import { Heading, Subtext, Text } from '@workday/canvas-kit-react/text';

interface Reference {
  descriptor: string;
  id: string;
  href?: string;
}

export interface Worker {
  id: string;
  descriptor: string;
  businessTitle?: string;
  isManager?: boolean;
  yearsOfService?: string;
  dateOfBirth?: string;
  primaryWorkEmail?: string;
  primaryWorkPhone?: string;
  primaryWorkAddressText?: string;
  location?: Reference;
  primarySupervisoryOrganization?: Reference;
}

interface WorkerCollection {
  data: Worker[];
  total: number;
}

function Field({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <Flex flexDirection="column" gap="xxxs">
      <Subtext size="small" color="hint">
        {label}
      </Subtext>
      <Text typeLevel="body.small">{value}</Text>
    </Flex>
  );
}

function WorkerRow({
  worker,
  onSelect,
}: {
  worker: Worker;
  onSelect?: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const interactive = !!onSelect;
  return (
    <Flex
      alignItems="center"
      gap="s"
      padding="xxs"
      borderRadius="m"
      style={{
        cursor: interactive ? 'pointer' : undefined,
        backgroundColor: interactive && hovered ? 'var(--cnvs-sys-color-bg-alt-soft)' : undefined,
        transition: 'background-color 120ms ease',
      }}
      onClick={interactive ? () => onSelect!(worker.id) : undefined}
      onMouseEnter={interactive ? () => setHovered(true) : undefined}
      onMouseLeave={interactive ? () => setHovered(false) : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect!(worker.id);
              }
            }
          : undefined
      }
    >
      <Avatar size="medium" name={worker.descriptor} />
      <Flex flexDirection="column" gap="xxxs" flex={1}>
        <Text typeLevel="body.small" fontWeight="bold">
          {worker.descriptor}
        </Text>
        {worker.businessTitle ? (
          <Subtext size="small" color="hint">
            {worker.businessTitle}
          </Subtext>
        ) : null}
      </Flex>
      {worker.isManager ? (
        <StatusIndicator type={StatusIndicatorType.Blue} label="Manager" />
      ) : null}
    </Flex>
  );
}

function ProfileCard({ worker }: { worker: Worker }) {
  return (
    <Card>
      <Card.Body>
        <Flex flexDirection="column" gap="m">
          <Flex alignItems="center" gap="s">
            <Avatar size="extraExtraLarge" name={worker.descriptor} />
            <Flex flexDirection="column" gap="xxxs" flex={1}>
              <Heading size="small">{worker.descriptor}</Heading>
              {worker.businessTitle ? (
                <Subtext size="large" color="hint">
                  {worker.businessTitle}
                </Subtext>
              ) : null}
              {worker.isManager ? (
                <Flex marginTop="xxs">
                  <StatusIndicator type={StatusIndicatorType.Blue} label="Manager" />
                </Flex>
              ) : null}
            </Flex>
          </Flex>

          <Flex
            flexDirection="row"
            flexWrap="wrap"
            gap="m"
            paddingTop="s"
            borderTop="solid 1px"
            borderColor="soap400"
          >
            <Flex flexDirection="column" gap="s" flex={1} minWidth={200}>
              <Field label="Email" value={worker.primaryWorkEmail} />
              <Field label="Phone" value={worker.primaryWorkPhone} />
              <Field label="Address" value={worker.primaryWorkAddressText} />
            </Flex>
            <Flex flexDirection="column" gap="s" flex={1} minWidth={200}>
              <Field
                label="Organization"
                value={worker.primarySupervisoryOrganization?.descriptor}
              />
              <Field label="Location" value={worker.location?.descriptor} />
              <Field
                label="Tenure"
                value={worker.yearsOfService ? `${worker.yearsOfService} years` : undefined}
              />
            </Flex>
          </Flex>
        </Flex>
      </Card.Body>
    </Card>
  );
}

function TeamCard({
  workerId,
  onSelectWorker,
}: {
  workerId: string;
  onSelectWorker?: (id: string) => void;
}) {
  const reports = useRequest<WorkerCollection>(
    `/common/v1/workers/${workerId}/directReports`
  );

  const reportList = reports.data?.data ?? [];

  if (!reports.loading && reportList.length === 0 && !reports.error) {
    return null;
  }

  return (
    <Card>
      <Card.Body>
        <Flex flexDirection="column" gap="m">
          <Heading size="small">Team</Heading>
          <Flex flexDirection="column" gap="s">
            <Subtext size="small" color="hint">
              DIRECT REPORTS ({reports.data?.total ?? reportList.length})
            </Subtext>
            {reports.loading ? (
              <Text typeLevel="body.small" color="hint">
                Loading…
              </Text>
            ) : reports.error ? (
              <Text typeLevel="body.small" color="hint">
                Couldn’t load direct reports: {reports.error.message}
              </Text>
            ) : (
              <Flex flexDirection="column" gap="xxs">
                {reportList.map((report) => (
                  <WorkerRow key={report.id} worker={report} onSelect={onSelectWorker} />
                ))}
              </Flex>
            )}
          </Flex>
        </Flex>
      </Card.Body>
    </Card>
  );
}

export interface WorkerProfileProps {
  workerPath: string;
  onSelectWorker?: (id: string) => void;
}

export default function WorkerProfile({ workerPath, onSelectWorker }: WorkerProfileProps) {
  const { data, loading, error } = useRequest<Worker>(workerPath);

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
  if (!data) {
    return (
      <Card>
        <Card.Body>No worker data returned.</Card.Body>
      </Card>
    );
  }

  return (
    <Flex flexDirection="column" gap="m">
      <ProfileCard worker={data} />
      <TeamCard workerId={data.id} onSelectWorker={onSelectWorker} />
    </Flex>
  );
}
