import { useMemo } from 'react';
import { useNavigate } from '@workday/everywhere';
import { Card, Flex, Grid, Heading, SecondaryButton, Text } from '@workday/canvas-kit-react';
import { employees } from '../routes.js';
import { useEmployees } from '../everywhere/data/Employee.js';
import { useDepartments } from '../everywhere/data/Department.js';

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

export default function HomePage() {
  const navigate = useNavigate();
  const { data: employees } = useEmployees();
  const { data: departments } = useDepartments();

  const totalEmployees = employees?.length ?? 0;

  const deptStats = useMemo(() => {
    if (!departments || !Array.isArray(departments)) return [];
    return departments.map((dept) => {
      const count = Array.isArray(employees)
        ? employees.filter((e) => e.department === dept.name).length
        : Number(dept.headcount);
      return { ...dept, count };
    });
  }, [employees, departments, totalEmployees]);

  return (
    <Flex flexDirection="column" gap="m" padding="s">
      <Heading size="large">Employee Directory</Heading>

      <Text typeLevel="body.large">
        Welcome to the Employee Directory. Search for colleagues, view team information, and manage
        employee records.
      </Text>

      <Card>
        <Card.Body>
          <Heading size="small" marginBottom="s">
            Team Overview
          </Heading>
          <Grid gridTemplateColumns="repeat(4, 1fr)" gridGap="s">
            <StatCard
              label="Total Employees"
              value={String(totalEmployees)}
              subtitle="All departments"
            />
            {deptStats.slice(0, 3).map((dept) => (
              <StatCard
                key={dept.id}
                label={dept.name}
                value={String(dept.count)}
                subtitle="Employees"
              />
            ))}
          </Grid>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <Heading size="small" marginBottom="s">
            Quick Actions
          </Heading>
          <Flex gap="s">
            <SecondaryButton onClick={() => navigate(employees)}>
              View All Employees
            </SecondaryButton>
          </Flex>
        </Card.Body>
      </Card>
    </Flex>
  );
}
