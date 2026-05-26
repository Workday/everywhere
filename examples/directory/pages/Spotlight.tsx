import { useCallback, useMemo, useState } from 'react';
import { Card, Flex, Heading, PrimaryButton, Text } from '@workday/canvas-kit-react';
import { useEmployees } from '../everywhere/data/Employee.js';

export default function SpotlightPage() {
  const { data: employees } = useEmployees();
  const [index, setIndex] = useState(() => Math.floor(Math.random() * 1000));

  const employee = useMemo(() => {
    if (!Array.isArray(employees) || employees.length === 0) return undefined;
    return employees[index % employees.length];
  }, [employees, index]);

  const reroll = useCallback(() => {
    setIndex((prev) => {
      let next;
      do {
        next = Math.floor(Math.random() * 1000);
      } while (
        Array.isArray(employees) &&
        employees.length > 1 &&
        next % employees.length === prev % employees.length
      );
      return next;
    });
  }, [employees]);

  if (!Array.isArray(employees)) {
    return (
      <Flex flexDirection="column" gap="m" padding="s">
        <Heading size="large">Spotlight</Heading>
        <Text typeLevel="body.large" color="licorice300">
          Loading...
        </Text>
      </Flex>
    );
  }

  if (!employee) {
    return (
      <Flex flexDirection="column" gap="m" padding="s">
        <Heading size="large">Spotlight</Heading>
        <Text typeLevel="body.large" color="licorice300">
          No employees found.
        </Text>
      </Flex>
    );
  }

  return (
    <Flex flexDirection="column" gap="m" padding="s">
      <Heading size="large">Spotlight</Heading>
      <Text typeLevel="body.large" color="licorice300">
        Meet your coworker!
      </Text>
      <Card>
        <Card.Heading>{employee.name}</Card.Heading>
        <Card.Body>
          <Flex gap="m">
            <img
              src={employee.photoUrl}
              alt={employee.name}
              style={{ width: 100, height: 100, borderRadius: 8 }}
            />
            <Flex flexDirection="column" gap="xxs">
              <Text typeLevel="body.large" fontWeight="bold">
                {employee.title}
              </Text>
              <Text typeLevel="body.small" color="licorice300">
                {employee.department}
              </Text>
              <Text typeLevel="body.small">{employee.email}</Text>
              <Text typeLevel="subtext.medium" color="licorice300">
                Started {employee.startDate}
              </Text>
              {employee.isRemote && (
                <Text typeLevel="subtext.medium" color="blueberry400">
                  Remote
                </Text>
              )}
              {employee.bio && (
                <Text typeLevel="body.small" style={{ marginTop: 8 }}>
                  {employee.bio}
                </Text>
              )}
            </Flex>
          </Flex>
        </Card.Body>
      </Card>
      <PrimaryButton onClick={reroll}>Meet Someone New</PrimaryButton>
    </Flex>
  );
}
