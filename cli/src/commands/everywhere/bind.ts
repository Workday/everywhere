import { Args } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import EverywhereBaseCommand from './base.js';
import { parseBusinessObject } from '../../codegen/parser.js';
import {
  generateModels,
  generateSchema,
  generateModelHooks,
  generateIndex,
} from '../../codegen/generator.js';
import { pluginConfig } from '../../config.js';

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
    const everywhereDir = path.join(pluginDir, 'everywhere');
    const config = pluginConfig();
    let appDir: string;

    if (args['app-dir']) {
      appDir = path.resolve(args['app-dir']);
      config.write({ extend: appDir });
    } else {
      const saved = config.read();
      if (saved.extend) {
        appDir = path.resolve(pluginDir, saved.extend);
      } else {
        appDir = pluginDir;
      }
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
