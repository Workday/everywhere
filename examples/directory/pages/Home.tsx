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

interface Worker {
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
  if (!data) {
    return (
      <Card>
        <Card.Body>No worker data returned.</Card.Body>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Body>
        <Flex flexDirection="column" gap="m">
          <Flex alignItems="center" gap="s">
            <Avatar size="extraExtraLarge" name={data.descriptor} />
            <Flex flexDirection="column" gap="xxxs" flex={1}>
              <Heading size="small">{data.descriptor}</Heading>
              {data.businessTitle ? (
                <Subtext size="large" color="hint">
                  {data.businessTitle}
                </Subtext>
              ) : null}
              {data.isManager ? (
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
              <Field label="Email" value={data.primaryWorkEmail} />
              <Field label="Phone" value={data.primaryWorkPhone} />
              <Field label="Address" value={data.primaryWorkAddressText} />
            </Flex>
            <Flex flexDirection="column" gap="s" flex={1} minWidth={200}>
              <Field label="Organization" value={data.primarySupervisoryOrganization?.descriptor} />
              <Field label="Location" value={data.location?.descriptor} />
              <Field
                label="Tenure"
                value={data.yearsOfService ? `${data.yearsOfService} years` : undefined}
              />
            </Flex>
          </Flex>
        </Flex>
      </Card.Body>
    </Card>
  );
}
