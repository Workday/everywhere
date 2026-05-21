import { useMemo } from 'react';
import { useNavigate } from '@workday/everywhere';
import {
  Card,
  Flex,
  Grid,
  Heading,
  PrimaryButton,
  StatusIndicator,
  StatusIndicatorType,
  Text,
} from '@workday/canvas-kit-react';
import { useCharities } from '../everywhere/data/Charity.js';
import type { Charity } from '../everywhere/data/models.js';
import { charityDetail } from '../routes.js';

function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return (
    <Card>
      <Card.Body>
        <Flex flexDirection="column" alignItems="center" gap="xxs" padding="xs">
          <Text typeLevel="subtext.large" color="licorice300">
            {label}
          </Text>
          <Text typeLevel="title.large" color="blueberry400" fontWeight="bold">
            {value}
          </Text>
          <Text typeLevel="subtext.medium" color="licorice300" fontStyle="italic">
            {subtitle}
          </Text>
        </Flex>
      </Card.Body>
    </Card>
  );
}

function CharityCard({ charity, onView }: { charity: Charity; onView: () => void }) {
  return (
    <Card height="100%">
      <Card.Body>
        <Flex flexDirection="column" gap="s" height="100%">
          <Flex flexDirection="column" gap="xxs" flex={1}>
            <Heading size="small">{charity.name}</Heading>
            <Text typeLevel="body.medium" color="licorice300">
              {charity.description}
            </Text>
          </Flex>

          <Flex gap="xs" flexWrap="wrap">
            {charity.matchDonations && (
              <StatusIndicator type={StatusIndicatorType.Green} label="Matched donations" />
            )}
            {charity.workdayMatched && (
              <StatusIndicator type={StatusIndicatorType.Blue} label="Workday matched" />
            )}
            <StatusIndicator
              type={
                charity.logoUploadedBefore2022
                  ? StatusIndicatorType.Orange
                  : StatusIndicatorType.Gray
              }
              label={charity.logoLabel}
            />
          </Flex>

          <PrimaryButton onClick={onView}>View details</PrimaryButton>
        </Flex>
      </Card.Body>
    </Card>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { data: charities, loading, error } = useCharities();

  const stats = useMemo(() => {
    if (!Array.isArray(charities)) {
      return { total: 0, matched: 0, workday: 0 };
    }
    return {
      total: charities.length,
      matched: charities.filter((c) => c.matchDonations).length,
      workday: charities.filter((c) => c.workdayMatched).length,
    };
  }, [charities]);

  if (error) {
    return (
      <Flex padding="m">
        <Text color="cinnamon500">{error.message}</Text>
      </Flex>
    );
  }

  return (
    <Flex flexDirection="column" gap="m" padding="m" maxWidth="1200px" margin="0 auto">
      <Flex flexDirection="column" gap="xs">
        <Heading size="large">Charitable Donations</Heading>
        <Text typeLevel="body.large" color="licorice300">
          Discover charities supported by your organization. Matched donations and Workday
          partnerships are highlighted on each card.
        </Text>
      </Flex>

      <Grid gridTemplateColumns="repeat(3, 1fr)" gridGap="s">
        <StatCard label="Charities" value={String(stats.total)} subtitle="Available to support" />
        <StatCard
          label="Donation matching"
          value={String(stats.matched)}
          subtitle="Employer will match"
        />
        <StatCard
          label="Workday matched"
          value={String(stats.workday)}
          subtitle="Official partnerships"
        />
      </Grid>

      {loading && (
        <Card>
          <Card.Body>
            <Text typeLevel="body.medium" color="licorice300">
              Loading charities…
            </Text>
          </Card.Body>
        </Card>
      )}

      {!loading && Array.isArray(charities) && charities.length === 0 && (
        <Card>
          <Card.Body>
            <Flex flexDirection="column" gap="s" alignItems="center" padding="l">
              <Heading size="small">No charities yet</Heading>
              <Text typeLevel="body.medium" color="licorice300" textAlign="center">
                When charities are added in Workday, they will appear here.
              </Text>
            </Flex>
          </Card.Body>
        </Card>
      )}

      {!loading && Array.isArray(charities) && charities.length > 0 && (
        <Flex flexDirection="column" gap="s">
          <Heading size="small">Browse charities</Heading>
          <Grid gridTemplateColumns="repeat(auto-fill, minmax(280px, 1fr))" gridGap="m">
            {charities.map((charity) => (
              <CharityCard
                key={charity.id}
                charity={charity}
                onView={() => navigate(charityDetail, { id: charity.id })}
              />
            ))}
          </Grid>
        </Flex>
      )}
    </Flex>
  );
}
