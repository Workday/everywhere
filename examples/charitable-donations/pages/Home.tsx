import { useNavigate } from '@workday/everywhere';
import {
  Card,
  Flex,
  Heading,
  Text,
  PrimaryButton,
  StatusIndicator,
  StatusIndicatorType,
} from '@workday/canvas-kit-react';
import { useCharities } from '../everywhere/data/Charity.js';
import { charityDetail } from '../routes.js';

export default function HomePage() {
  const navigate = useNavigate();
  const { data: charities, error } = useCharities();

  if (error) return <Text color="cinnamon500">{error.message}</Text>;

  return (
    <Flex flexDirection="column" gap="m" padding="m">
      <Heading size="large">Charitable Donations</Heading>
      <Text typeLevel="body.large">
        Support causes that matter. Browse the charities below to learn more and make a donation.
      </Text>

      {!Array.isArray(charities) && <Text>Loading charities…</Text>}

      {Array.isArray(charities) &&
        charities.map((charity) => (
          <Card key={charity.id}>
            <Card.Body>
              <Flex justifyContent="space-between" alignItems="flex-start">
                <Flex flexDirection="column" gap="xxs" flex={1}>
                  <Heading size="small">{charity.name}</Heading>
                  <Text typeLevel="body.medium" color="licorice300">
                    {charity.description}
                  </Text>
                  {charity.matchDonations && (
                    <StatusIndicator type={StatusIndicatorType.Green} label="Donations Matched" />
                  )}
                </Flex>
                <PrimaryButton onClick={() => navigate(charityDetail, { id: charity.id })}>
                  View Details
                </PrimaryButton>
              </Flex>
            </Card.Body>
          </Card>
        ))}
    </Flex>
  );
}
