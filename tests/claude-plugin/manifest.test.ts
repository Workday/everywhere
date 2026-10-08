import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Schema validity is checked by plugin submission. These tests guard the policy invariants a
// schema check cannot see: the empty connector URL, and nothing committed that changes how
// existing installs authenticate or prompt.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const readText = (relativePath: string): string =>
  readFileSync(resolve(repoRoot, relativePath), 'utf8');

const readJson = <T>(relativePath: string): T => JSON.parse(readText(relativePath)) as T;

interface McpConfig {
  mcpServers: Record<string, Record<string, unknown>>;
}

describe('the Sana from Workday plugin', () => {
  const manifest = readJson<Record<string, unknown>>('plugins/sana/.claude-plugin/plugin.json');
  const servers = readJson<McpConfig>('plugins/sana/.mcp.json').mcpServers;
  const server = servers['workday'] ?? {};
  const skill = readText('plugins/sana/skills/workday/SKILL.md');

  it('declares no user configuration, since the directory listing collects the gateway URL', () => {
    expect('userConfig' in manifest).toBe(false);
  });

  it('bundles the Workday routing skill', () => {
    expect(skill).toContain('# Workday HR Assistant');
  });

  it('registers the bundled skill under the workday name', () => {
    expect(skill).toMatch(/^name: workday$/m);
  });

  it('declares exactly one MCP server, named "workday"', () => {
    expect(Object.keys(servers)).toEqual(['workday']);
  });

  it('connects over HTTP with an empty URL, which an Owner fills in through the directory listing', () => {
    expect(server).toMatchObject({ type: 'http', url: '' });
  });

  it('runs no local command', () => {
    expect('command' in server).toBe(false);
  });

  it('sends no custom headers', () => {
    expect('headers' in server).toBe(false);
  });

  it('commits no OAuth client material', () => {
    expect('oauth' in server).toBe(false);
  });

  it('loads skills from the plugin skills directory', () => {
    expect(manifest.skills).toEqual(['./skills/']);
  });
});

describe('production Workday skills', () => {
  const onboard = readText('plugins/sana/skills/workday-onboard/SKILL.md');
  const design = readText('plugins/sana/skills/using-workday-design/SKILL.md');

  it('bundles the onboard card skill', () => {
    expect(onboard).toContain('name: workday-onboard');
  });

  it('builds the onboard card through the live gateway agent', () => {
    expect(onboard).toContain('routing must choose an agent');
  });

  it('does not use the local catalog worker read for onboard', () => {
    expect(onboard).not.toContain('find_staffing_workers');
  });

  it('bundles the Workday design skill', () => {
    expect(design).toContain('name: using-workday-design');
  });

  it('loads the workday skill before its own query', () => {
    expect(onboard).toContain('Load `workday` before the query.');
  });

  it('bundles the tools-only skill for sessions that cannot read resources', () => {
    expect(readText('plugins/sana/skills/workday-tools-only/SKILL.md')).toContain(
      'name: workday-tools-only'
    );
  });

  it('bundles the agent-dialogue skill for a selected agent', () => {
    expect(readText('plugins/sana/skills/workday-agent-dialogue/SKILL.md')).toContain(
      'name: workday-agent-dialogue'
    );
  });

  it('starts an artifact with a charset and leaves the example open', () => {
    expect(design).toContain('<meta charset="utf-8">\n<title>Workday snapshot</title>\n```');
  });
});

describe('the workday skill', () => {
  const skill = readText('plugins/sana/skills/workday/SKILL.md').replace(/\s+/g, ' ');

  it('does not send the user to the onboard skill', () => {
    expect(skill).not.toContain('workday-onboard');
  });

  it('sends a session with no resource reader to the tools-only skill', () => {
    expect(skill).toContain('read `workday-tools-only`');
  });

  it('does not treat a workday-only tool search as proof that no catalog tool exists', () => {
    expect(skill).toContain('An empty search is not proof that no catalog tool exists.');
  });

  it('leaves agent-run polling to the tools-only skill', () => {
    expect(skill).not.toContain('Wait 5 seconds before every poll');
  });

  it('sends a selected agent to the agent-dialogue skill', () => {
    expect(skill).toContain('Read `workday-agent-dialogue`');
  });

  it('leaves agent write confirmation to the agent-dialogue skill', () => {
    expect(skill).not.toContain('Never send a bare "yes"');
  });

  it('applies result rules to every Workday result', () => {
    expect(skill).toContain('These rules apply to every Workday result.');
  });

  describe('when the user asks what the connector can do', () => {
    it('uses a standing reply and does not call an agent', () => {
      expect(skill).toContain(
        '"What can you do?" uses this standing reply. Do not send it to an agent.'
      );
    });

    it('lists the standing Workday areas', () => {
      expect(skill).toContain(
        'time off, pay and benefits, people and org, personal records, travel and expenses, IT and access, hiring and lifecycle, and policy and help'
      );
    });
  });

  describe('when the user asks which agents are exposed', () => {
    it('uses a standing reply and does not call an agent', () => {
      expect(skill).toContain(
        '"What agents are exposed?" uses this standing reply. Do not send it to an agent.'
      );
    });

    it('names Employee self-service', () => {
      expect(skill).toContain('> Employee self-service.');
    });
  });
});

describe('local run helpers', () => {
  it('are not bundled as a local catalog onboard skill', () => {
    expect(existsSync(resolve(repoRoot, 'plugins/sana/.local'))).toBe(false);
  });

  it('are not committed as a local access token', () => {
    expect(existsSync(resolve(repoRoot, 'plugins/sana/.local-asu'))).toBe(false);
  });

  it('are not bundled as an onboard preview page', () => {
    expect(
      existsSync(
        resolve(repoRoot, 'plugins/sana/skills/workday-onboard/example-workday-onboard.html')
      )
    ).toBe(false);
  });
});

describe('Workday authorization failures', () => {
  const skill = readText('plugins/sana/skills/workday/SKILL.md').replace(/\s+/g, ' ');

  describe('when the user is not signed in', () => {
    it('sends missing tools, a 401, or an unauthorized token to host sign-in', () => {
      expect(skill).toContain('Workday tools are missing, or a call returns 401 or "unauthorized"');
    });

    it('keeps 403 out of the sign-in failure', () => {
      expect(skill).not.toMatch(/401\s*\/\s*403/);
    });
  });

  describe('when a call returns 403', () => {
    describe('when the error is insufficient_scope', () => {
      it('treats the failure as scope escalation for a signed-in user', () => {
        expect(skill).toContain(
          'A 403 with `insufficient_scope` is scope escalation. The user is signed in.'
        );
      });

      it('tells the user to approve step-up for the scopes named in the challenge', () => {
        expect(skill).toContain(
          'Tell them to approve step-up authorization for the scopes named in the challenge.'
        );
      });

      it('stops when the same scope challenge repeats after one step-up', () => {
        expect(skill).toContain(
          'If that same challenge comes back after one step-up, stop and tell them the extra access was not granted.'
        );
      });
    });

    describe('when the error is not a scope challenge', () => {
      it('treats the failure as denied access', () => {
        expect(skill).toContain(
          'A 403 with no `insufficient_scope` challenge, or Workday `S22`, is denied access.'
        );
      });

      it('does not send the user through sign-in again', () => {
        expect(skill).toContain('Do not ask them to sign in again');
      });
    });
  });

  describe('the troubleshooting table', () => {
    it('lists sign-in separately from 403', () => {
      expect(skill).toContain('| Tools missing, 401, or unauthorized');
    });

    it('lists insufficient_scope as its own row', () => {
      expect(skill).toContain('| 403 with `insufficient_scope`');
    });

    it('lists a 403 without a scope challenge as denied access', () => {
      expect(skill).toContain('| 403 without `insufficient_scope`, or `S22`');
    });
  });
});

describe('the Workday marketplace', () => {
  const marketplace = readJson<{
    renames?: Record<string, string | null>;
    plugins: { name: string; source: string; displayName: string }[];
  }>('.claude-plugin/marketplace.json');

  it('lists only Sana from Workday', () => {
    expect(
      marketplace.plugins.map(({ name, source, displayName }) => ({ name, source, displayName }))
    ).toEqual([{ name: 'sana', source: './plugins/sana', displayName: 'Sana from Workday' }]);
  });

  it('moves existing everywhere installs to sana', () => {
    expect(marketplace.renames?.['everywhere']).toBe('sana');
  });
});
