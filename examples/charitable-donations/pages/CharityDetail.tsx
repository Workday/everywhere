import { useParams, useNavigate } from '@workday/everywhere';
import {
  Card,
  Flex,
  Heading,
  Text,
  SecondaryButton,
  StatusIndicator,
  StatusIndicatorType,
} from '@workday/canvas-kit-react';
import { useCharity } from '../everywhere/data/Charity.js';
import { home, charityDetail } from '../routes.js';

export default function CharityDetailPage() {
  const { id } = useParams(charityDetail);
  const navigate = useNavigate();
  const { data: charity, error } = useCharity(id ?? '');

  if (error) return <Text color="cinnamon500">{error.message}</Text>;
  if (!charity) return <Text>Loading…</Text>;

  return (
    <Flex flexDirection="column" gap="m" padding="m">
      <SecondaryButton onClick={() => navigate(home)}>Back to Charities</SecondaryButton>

      <Card>
        <Card.Body>
          <Flex flexDirection="column" gap="s">
            <Heading size="large">{charity.name}</Heading>
            <Text typeLevel="body.large">{charity.description}</Text>

            <Flex gap="s" flexWrap="wrap">
              <StatusIndicator
                type={charity.matchDonations ? StatusIndicatorType.Green : StatusIndicatorType.Gray}
                label={charity.matchDonations ? 'Donations Matched' : 'No Donation Matching'}
              />
              {charity.workdayMatched && (
                <StatusIndicator type={StatusIndicatorType.Blue} label="Workday Matched Charity" />
              )}
            </Flex>

            <Flex flexDirection="column" gap="xxs">
              <Text typeLevel="subtext.large" color="licorice300">
                Logo Status
              </Text>
              <Text typeLevel="body.medium">{charity.logoLabel}</Text>
            </Flex>
          </Flex>
        </Card.Body>
      </Card>
    </Flex>
  );
}
