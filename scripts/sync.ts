#!/usr/bin/env npx tsx
/**
 * CREAACTIVO LOGISTICS INTELLIGENCE SYSTEM
 * Sync Script - Builds graph and uploads to Google Drive
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

async function main() {
  const projectRoot = path.resolve(__dirname, '..');

  console.log('='.repeat(50));
  console.log('CREAACTIVO - Knowledge Base Sync');
  console.log('='.repeat(50));
  console.log();

  // Step 1: Build the graph with Python
  console.log('Step 1: Building context graph...');
  try {
    const pythonScript = path.join(projectRoot, 'scripts', 'build_graph.py');
    const { stdout, stderr } = await execAsync(`python "${pythonScript}"`);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    console.log('Graph built successfully!\n');
  } catch (error: any) {
    console.error('Error building graph:', error.message);
    if (error.stderr) console.error(error.stderr);
    // Continue anyway - graph might not be critical
  }

  // Step 2: Sync to Google Drive
  console.log('Step 2: Syncing to Google Drive...');
  try {
    const { syncKnowledgeBase } = await import('../src/services/driveSync');
    const success = await syncKnowledgeBase();
    if (success) {
      console.log('\nSync completed successfully!');
      console.log('Files uploaded to Google Drive folder.');
    } else {
      console.log('\nSync completed with some warnings.');
    }
  } catch (error: any) {
    console.error('Error syncing to Drive:', error.message);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(50));
  console.log('Done!');
}

main().catch(console.error);
