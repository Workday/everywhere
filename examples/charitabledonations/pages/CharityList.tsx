import { useNavigate, useParams } from '@workday/everywhere';
import { Card, Flex, Heading, SecondaryButton, Text } from '@workday/canvas-kit-react';
import { useCharities, useCharity } from '../everywhere/data/Charity.js';
import type { Charity } from '../everywhere/data/models.js';

function MatchBadge({ matched, workdayMatched }: { matched: boolean; workdayMatched: boolean }) {
  if (workdayMatched) {
    return <span className="charity-badge charity-badge--workday">Workday Matched</span>;
  }
  if (matched) {
    return <span className="charity-badge charity-badge--matched">Donation Matching</span>;
  }
  return <span className="charity-badge charity-badge--unmatched">No Matching</span>;
}

function CharityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: charity } = useCharity(id ?? '');

  return (
    <Flex flexDirection="column" gap="s" padding="s">
      <SecondaryButton size="small" onClick={() => navigate('charities')}>
        Back to list
      </SecondaryButton>
      <Card>
        <Card.Heading>{charity?.name ?? 'Charity Detail'}</Card.Heading>
        <Card.Body>
          {charity ? (
            <Flex flexDirection="column" gap="s">
              <Text typeLevel="body.large">{charity.description}</Text>

              <Flex gap="xs" alignItems="center">
                <MatchBadge
                  matched={charity.matchDonations}
                  workdayMatched={charity.workdayMatched}
                />
                {charity.logoLabel && (
                  <Text typeLevel="subtext.medium" color="licorice300">
                    Logo: {charity.logoLabel}
                  </Text>
                )}
              </Flex>

              <Flex flexDirection="column" gap="xxs">
                <Text typeLevel="subtext.large" fontWeight="bold" color="licorice500">
                  Details
                </Text>
                <Text typeLevel="body.small">
                  <strong>Relationship Manager:</strong>{' '}
                  {charity.relationshipManager || 'Not assigned'}
                </Text>
                <Text typeLevel="body.small">
                  <strong>Created By:</strong> {charity.createdBy || 'Unknown'}
                </Text>
                <Text typeLevel="body.small">
                  <strong>Logo Before 2022:</strong>{' '}
                  {charity.logoUploadedBefore2022 ? 'Yes' : 'No'}
                </Text>
              </Flex>
            </Flex>
          ) : (
            <Text>Charity not found: {id}</Text>
          )}
        </Card.Body>
      </Card>
    </Flex>
  );
}

function CharityRow({ charity, onClick }: { charity: Charity; onClick: () => void }) {
  return (
    <div className="charity-row" onClick={onClick} role="button" tabIndex={0}>
      <Flex justifyContent="space-between" alignItems="flex-start">
        <Flex flexDirection="column" gap="xxs" flex={1}>
          <Text typeLevel="body.small" fontWeight="bold">
            {charity.name}
          </Text>
          <Text typeLevel="subtext.medium" color="licorice300">
            {charity.description}
          </Text>
        </Flex>
        <MatchBadge matched={charity.matchDonations} workdayMatched={charity.workdayMatched} />
      </Flex>
    </div>
  );
}

export default function CharityListPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: charities } = useCharities();

  if (id) {
    return <CharityDetail />;
  }

  return (
    <Flex flexDirection="column" gap="m" padding="s">
      <Heading size="large">Charities</Heading>
      <Text typeLevel="body.large" color="licorice300">
        {Array.isArray(charities) ? `${charities.length} charities` : 'Loading...'}
      </Text>
      <Card>
        <Card.Body>
          <Flex flexDirection="column" gap="xxs">
            {Array.isArray(charities) &&
              charities.map((charity) => (
                <CharityRow
                  key={charity.id}
                  charity={charity}
                  onClick={() => navigate('charities/detail', { id: charity.id })}
                />
              ))}
          </Flex>
        </Card.Body>
      </Card>
    </Flex>
  );
}
