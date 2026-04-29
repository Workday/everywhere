import { useNavigate, useParams } from '@workday/everywhere';
import { Card, Flex, SecondaryButton, Text } from '@workday/canvas-kit-react';
import { employee, employees } from '../routes.js';
import { useEmployee } from '../everywhere/data/Employee.js';

export default function EmployeeDetail() {
  const { id } = useParams(employee);
  const navigate = useNavigate();
  const { data: emp } = useEmployee(id ?? '');

  return (
    <Flex flexDirection="column" gap="s" padding="s">
      <SecondaryButton size="small" onClick={() => navigate(employees)}>
        Back to list
      </SecondaryButton>
      <Card>
        <Card.Heading>{emp?.name ?? 'Employee Detail'}</Card.Heading>
        <Card.Body>
          {emp ? (
            <Flex gap="m">
              <img
                src={emp.photoUrl}
                alt={emp.name}
                style={{ width: 80, height: 80, borderRadius: 8 }}
              />
              <Flex flexDirection="column" gap="xxs">
                <Text typeLevel="body.large" fontWeight="bold">
                  {emp.title}
                </Text>
                <Text typeLevel="body.small" color="licorice300">
                  {emp.department}
                </Text>
                <Text typeLevel="body.small">{emp.email}</Text>
                <Text typeLevel="subtext.medium" color="licorice300">
                  Started {emp.startDate}
                </Text>
                {emp.isRemote && (
                  <Text typeLevel="subtext.medium" color="blueberry400">
                    Remote
                  </Text>
                )}
                {emp.bio && (
                  <Text typeLevel="body.small" style={{ marginTop: 8 }}>
                    {emp.bio}
                  </Text>
                )}
              </Flex>
            </Flex>
          ) : (
            <Text>Employee not found: {id}</Text>
          )}
        </Card.Body>
      </Card>
    </Flex>
  );
}
