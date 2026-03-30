import { useNavigate, useParams } from '@workday/everywhere';
import { Card, Flex, Heading, SecondaryButton, Text } from '@workday/canvas-kit-react';
import { useEmployees, useEmployee } from '../everywhere/data/Employee.js';
import type { Employee } from '../everywhere/data/models.js';

function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: employee } = useEmployee(id ?? '');

  return (
    <Flex flexDirection="column" gap="s" padding="s">
      <SecondaryButton size="small" onClick={() => navigate('employees')}>
        Back to list
      </SecondaryButton>
      <Card>
        <Card.Heading>{employee?.name ?? 'Employee Detail'}</Card.Heading>
        <Card.Body>
          {employee ? (
            <Flex gap="m">
              <img
                src={employee.photoUrl}
                alt={employee.name}
                style={{ width: 80, height: 80, borderRadius: 8 }}
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
          ) : (
            <Text>Employee not found: {id}</Text>
          )}
        </Card.Body>
      </Card>
    </Flex>
  );
}

function EmployeeRow({ employee, onClick }: { employee: Employee; onClick: () => void }) {
  return (
    <Flex
      alignItems="center"
      gap="s"
      padding="xs"
      style={{ cursor: 'pointer', borderRadius: 8 }}
      onClick={onClick}
    >
      <img
        src={employee.photoUrl}
        alt={employee.name}
        style={{ width: 40, height: 40, borderRadius: '50%' }}
      />
      <Flex flexDirection="column" flex={1}>
        <Text typeLevel="body.small" fontWeight="bold">
          {employee.name}
        </Text>
        <Text typeLevel="subtext.medium" color="licorice300">
          {employee.title}
        </Text>
      </Flex>
      <Text typeLevel="subtext.medium" color="licorice300">
        {employee.department}
      </Text>
    </Flex>
  );
}

export default function EmployeeListPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: employees } = useEmployees();

  if (id) {
    return <EmployeeDetail />;
  }

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
                  employee={emp}
                  onClick={() => navigate('employees/detail', { id: emp.id })}
                />
              ))}
          </Flex>
        </Card.Body>
      </Card>
    </Flex>
  );
}
