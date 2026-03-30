import { Args } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import EverywhereBaseCommand from './base';
import { parseBusinessObject } from '../../codegen/parser';
import {
  generateModels,
  generateSchema,
  generateModelHooks,
  generateIndex,
} from '../../codegen/generator';

const CONFIG_DIR = 'everywhere';
const CONFIG_FILE = '.config.json';
const OUTPUT_DIR = 'data';

export default class BindCommand extends EverywhereBaseCommand {
  static description =
    'Generate TypeScript types and data hooks from Workday Extend business object models.';

  static args = {
    'app-dir': Args.directory({
      description:
        'Directory containing model/ subfolder with .businessobject files. Saved for future runs.',
      required: false,
    }),
  };

  static flags = {
    ...EverywhereBaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const { args } = await this.parse(BindCommand);
    const pluginDir = await this.parsePluginDir();
    const everywhereDir = path.join(pluginDir, CONFIG_DIR);
    const configPath = path.join(everywhereDir, CONFIG_FILE);

    // Resolve the app directory
    let appDir: string;

    if (args['app-dir']) {
      appDir = path.resolve(args['app-dir']);
      // Save to config for future runs
      fs.mkdirSync(everywhereDir, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify({ extend: appDir }, null, 2) + '\n');
    } else if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      appDir = path.resolve(pluginDir, config.extend);
    } else {
      // Fall back to plugin dir itself (model/ in the plugin)
      appDir = pluginDir;
    }

    // Find .businessobject files
    const modelDir = path.join(appDir, 'model');
    if (!fs.existsSync(modelDir)) {
      this.error(`No model/ directory found in ${appDir}`);
    }

    const files = fs.readdirSync(modelDir).filter((f) => f.endsWith('.businessobject'));
    if (files.length === 0) {
      this.error(`No .businessobject files found in ${modelDir}`);
    }

    // Parse all business objects
    const schemas = files.map((file) => {
      const content = fs.readFileSync(path.join(modelDir, file), 'utf-8');
      return parseBusinessObject(JSON.parse(content));
    });

    // Generate output
    const outputDir = path.join(everywhereDir, OUTPUT_DIR);
    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(path.join(outputDir, 'models.ts'), generateModels(schemas));
    fs.writeFileSync(path.join(outputDir, 'schema.ts'), generateSchema(schemas));
    fs.writeFileSync(path.join(outputDir, 'index.ts'), generateIndex(schemas));

    for (const schema of schemas) {
      fs.writeFileSync(path.join(outputDir, `${schema.name}.ts`), generateModelHooks(schema));
    }

    this.log(
      `Generated types for ${schemas.length} model(s): ${schemas.map((s) => s.name).join(', ')}`
    );
    this.log(`Output: ${outputDir}`);
  }
}
