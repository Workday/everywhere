import { useMemo } from 'react';
import { useNavigate } from '@workday/everywhere';
import { Card, Flex, Grid, Heading, PrimaryButton, Text } from '@workday/canvas-kit-react';
import { useCharities } from '../everywhere/data/Charity.js';

function StatCard({ label, value }: { label: string; value: string }) {
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
        </Flex>
      </Card.Body>
    </Card>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { data: charities } = useCharities();

  const stats = useMemo(() => {
    if (!Array.isArray(charities)) return { total: 0, matched: 0, workdayMatched: 0 };
    return {
      total: charities.length,
      matched: charities.filter((c) => c.matchDonations).length,
      workdayMatched: charities.filter((c) => c.workdayMatched).length,
    };
  }, [charities]);

  return (
    <Flex flexDirection="column" gap="m" padding="s">
      <Heading size="large">Charitable Donations</Heading>

      <Text typeLevel="body.large">
        Support causes that matter. Browse approved charities and see which ones qualify for company
        donation matching.
      </Text>

      <Card>
        <Card.Body>
          <Heading size="small" marginBottom="s">
            Overview
          </Heading>
          <Grid gridTemplateColumns="repeat(3, 1fr)" gridGap="s">
            <StatCard
              label="Approved Charities"
              value={Array.isArray(charities) ? String(stats.total) : '—'}
            />
            <StatCard
              label="Donation Matching"
              value={Array.isArray(charities) ? String(stats.matched) : '—'}
            />
            <StatCard
              label="Workday Matched"
              value={Array.isArray(charities) ? String(stats.workdayMatched) : '—'}
            />
          </Grid>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <Heading size="small" marginBottom="s">
            Quick Actions
          </Heading>
          <Flex gap="s">
            <PrimaryButton onClick={() => navigate('charities')}>Browse Charities</PrimaryButton>
          </Flex>
        </Card.Body>
      </Card>
    </Flex>
  );
}
