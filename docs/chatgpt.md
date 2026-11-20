# Sana from Workday — ChatGPT plugin

Use Sana in ChatGPT to get answers and take action in Workday. Each person signs in with their own
Workday account, so the same permissions, approval chains, and business rules apply to every answer
and action.

## Two parts: the plugin and the connection

Sana in ChatGPT has two parts. You need both, and you set each one up separately.

1. **The plugin** is the instructions that tell ChatGPT when and how to use Workday. Workday
   supplies it, and it is the same file for every customer. It cannot reach Workday by itself.
2. **The connection** is what signs people in and talks to Workday. Your ChatGPT admin creates it
   with your tenant's details.

Set up the connection first. The plugin then uses whichever Workday connection is turned on for the
person asking. Nothing else links the two, so you can update or replace either part without changing
the other.

Routing, ESS, and response-formatting skills are not in this package. They come from the Workday
Agent Gateway at runtime, through the connection.

## Before you start

- An active Workday UMSA, with the Sana agent available in Agent Management Hub.
- A Workday admin who can register the agent and generate its client credentials.
- A ChatGPT workspace admin who can add custom MCP servers and plugins.
- The Workday MCP URL and your tenant alias, from your Workday setup materials.

## Set up

Setup has three parts. Parts 1 and 2 create the connection. Part 3 adds the plugin.

### 1. Workday admin: turn on the agent

1. In **Agent Management Hub**, register the Sana agent.
2. On the agent's **Credentials** tab, set the Redirect URI your Workday setup materials give, and
   turn on PKCE.
3. Generate a client secret. Copy it and the client ID. Workday shows the secret only once.
4. Configure the agent's skills and who it is available to, then activate it.
5. Pass the client ID and secret to your ChatGPT admin through a secure channel.

### 2. ChatGPT admin: create the Workday connection

1. In ChatGPT, go to **Plugins**, then **Add** > **Add custom MCP server**.
2. Enter a plain name such as `Sana from Workday`. People see this name in approval prompts.
3. Enter the Workday MCP URL as the **Server URL**, and leave **Authentication** as OAuth.
4. Open **Advanced OAuth settings**. Choose **User-Defined OAuth Client**, enter the client ID and
   secret, and for the token endpoint auth method choose the option that sends the secret in the
   POST body.
5. Accept the notice and select **Create as a plugin**.
6. Select **Continue**, enter your tenant alias, and sign in to Workday to confirm it works.
7. Share the connection with the people who should use it.

The client ID and secret cannot be edited later. To change them, delete the connection and create it
again. The plugin does not need to change.

### 3. ChatGPT admin: add the plugin

1. Go to **Plugins**, then **Add** > **Upload plugin archive**.
2. Choose `sana-chatgpt-<version>.zip` and select **Add plugin**.
3. Share the plugin with the same people as the connection.

## Using it

1. Install **Sana from Workday** from **Plugins**.
2. The first time, connect, enter your tenant alias, and sign in to Workday.
3. Ask a question, for example `@Sana from Workday What are our company holidays?`
4. If ChatGPT asks to allow files returned by the connection, allow it. Otherwise the answer reports
   that the connection is unavailable.

## Troubleshooting

| What you see                                        | What to do                                                                          |
| --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| "The connection is unavailable" or no Workday tools | Check the connection shows **Connected**, then ask again and allow the file prompt. |
| Sign-in fails with a redirect URI error             | Check the Redirect URI on the agent's **Credentials** tab in Workday.               |
| Sign-in fails with an invalid client error          | The client ID or secret is wrong or was regenerated. Recreate the connection.       |
| Signed in, but no tools                             | Check the agent is active and available to that person in Workday.                  |
| Access denied on one question                       | The person lacks that permission in Workday. Sana follows Workday security.         |

## Build the zip

```sh
just bundle-chatgpt
```

That writes `dist/sana-chatgpt-<version>.zip` (gitignored). The same zip works in every workspace,
because it holds nothing specific to one. ChatGPT caches by version, so bump `version` in
`plugins/sana/.claude-plugin/plugin.json` for every change.

The zip holds the plugin's manifest at `.claude-plugin/plugin.json`, the skills and the logo.
ChatGPT accepts that Claude-compatible manifest and takes its listing from the `interface` block.
The zip leaves out `.mcp.json`, because ChatGPT rejects an upload that names a server with no
matching workspace connection. The connection is the one you create in part 2.
