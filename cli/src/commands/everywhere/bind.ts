import { Args } from '@oclif/core';
import * as fs from 'node:fs';
import * as path from 'node:path';

import EverywhereBaseCommand from './base.js';
import {
  loadBusinessObjects,
  loadBusinessObjectsFromZip,
  type BusinessObjectFile,
} from './business-objects.js';
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
    'app-source': Args.string({
      description:
        'Path to a directory containing a model/ subfolder, or a .zip archive with the same structure. Directory paths are saved for future runs.',
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

    const records = await this.loadRecords(args['app-source'], pluginDir);

    // Parse all business objects
    const schemas = records.map((record) => parseBusinessObject(JSON.parse(record.content)));

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

  private async loadRecords(
    argSource: string | undefined,
    pluginDir: string
  ): Promise<BusinessObjectFile[]> {
    const config = pluginConfig();

    try {
      if (argSource) {
        const appSource = path.resolve(argSource);

        if (appSource.endsWith('.zip') && fs.existsSync(appSource)) {
          return await loadBusinessObjectsFromZip(appSource);
        }

        if (fs.existsSync(appSource) && fs.statSync(appSource).isDirectory()) {
          config.write({ extend: appSource });
          return loadBusinessObjects(appSource);
        }

        this.error(`app-source must be a directory or .zip file: ${appSource}`);
      }

      const saved = config.read();
      const appDir = saved.extend ? path.resolve(pluginDir, saved.extend) : pluginDir;
      return loadBusinessObjects(appDir);
    } catch (err) {
      this.error(err instanceof Error ? err.message : String(err));
    }
  }
}
