import { useNavigate } from '@workday/everywhere';
import { Card, Flex, Heading, Text } from '@workday/canvas-kit-react';
import { employee } from '../routes.js';
import { useEmployees } from '../everywhere/data/Employee.js';
import type { Employee } from '../everywhere/data/models.js';

function EmployeeRow({ emp, onClick }: { emp: Employee; onClick: () => void }) {
  return (
    <Flex
      alignItems="center"
      gap="s"
      padding="xs"
      style={{ cursor: 'pointer', borderRadius: 8 }}
      onClick={onClick}
    >
      <img
        src={emp.photoUrl}
        alt={emp.name}
        style={{ width: 40, height: 40, borderRadius: '50%' }}
      />
      <Flex flexDirection="column" flex={1}>
        <Text typeLevel="body.small" fontWeight="bold">
          {emp.name}
        </Text>
        <Text typeLevel="subtext.medium" color="licorice300">
          {emp.title}
        </Text>
      </Flex>
      <Text typeLevel="subtext.medium" color="licorice300">
        {emp.department}
      </Text>
    </Flex>
  );
}

export default function EmployeeListPage() {
  const navigate = useNavigate();
  const { data: employees } = useEmployees();

  return (
    <Flex flexDirection="column" gap="m" padding="s">
      <Heading size="large">Employees</Heading>
      <Text typeLevel="body.large" color="licorice300">
        {Array.isArray(employees) ? `${employees.length} employees` : 'Loading...'}
      </Text>
      <Card>
        <Card.Body>
          <Flex flexDirection="column" gap="xxs">
            {Array.isArray(employees) &&
              employees.map((emp) => (
                <EmployeeRow
                  key={emp.id}
                  emp={emp}
                  onClick={() => navigate(employee, { id: emp.id })}
                />
              ))}
          </Flex>
        </Card.Body>
      </Card>
    </Flex>
  );
}
