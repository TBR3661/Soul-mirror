#!/usr/bin/env node
/**
 * Hivemind Operator - File Update Script
 * Safely applies file updates from repository_dispatch payloads
 * Respects allow/deny lists to prevent unauthorized changes
 */

const fs = require('fs');
const path = require('path');

// Define allowed and forbidden paths
const ALLOW_LIST = [
  'src/',
  'public/',
  'README.md',
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'index.tsx'
];

const DENY_LIST = [
  '.github/workflows/',
  '.github/operator/',
  '.git/',
  'node_modules/',
  '.env',
  'secrets'
];

/**
 * Check if a file path is allowed based on allow/deny lists
 */
function isPathAllowed(filePath) {
  const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
  
  // Check deny list first (higher priority)
  for (const deniedPath of DENY_LIST) {
    const normalizedDenied = deniedPath.replace(/\\/g, '/');
    // Match if path starts with denied path or has it as a directory component
    if (normalizedPath.startsWith(normalizedDenied) || 
        normalizedPath.startsWith('/' + normalizedDenied)) {
      return false;
    }
  }
  
  // Check allow list
  for (const allowedPath of ALLOW_LIST) {
    if (normalizedPath.startsWith(allowedPath) || normalizedPath === allowedPath) {
      return true;
    }
  }
  
  return false;
}

/**
 * Validate the payload structure
 */
function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload: must be an object');
  }
  
  if (!payload.task) {
    throw new Error('Invalid payload: missing "task" field');
  }
  
  if (payload.task === 'update_files') {
    if (!Array.isArray(payload.files)) {
      throw new Error('Invalid payload: "files" must be an array for update_files task');
    }
    
    for (const file of payload.files) {
      if (!file.path || typeof file.path !== 'string') {
        throw new Error('Invalid payload: each file must have a "path" field');
      }
      
      if (file.operation === 'delete') {
        // Delete operations don't need content
        continue;
      }
      
      if (file.content === undefined) {
        throw new Error(`Invalid payload: file "${file.path}" must have "content" field`);
      }
    }
  }
  
  return true;
}

/**
 * Apply file updates from the payload
 */
function applyFileUpdates(files) {
  const results = [];
  
  for (const file of files) {
    const filePath = file.path;
    const operation = file.operation || 'upsert'; // default to upsert (create or update)
    
    try {
      // Security check
      if (!isPathAllowed(filePath)) {
        results.push({
          path: filePath,
          status: 'denied',
          message: 'Path not allowed by security policy'
        });
        console.error(`❌ DENIED: ${filePath} (security policy)`);
        continue;
      }
      
      const fullPath = path.join(process.cwd(), filePath);
      
      if (operation === 'delete') {
        // Delete operation
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          results.push({
            path: filePath,
            status: 'deleted',
            message: 'File deleted successfully'
          });
          console.log(`🗑️  DELETED: ${filePath}`);
        } else {
          results.push({
            path: filePath,
            status: 'skipped',
            message: 'File does not exist'
          });
          console.log(`⏭️  SKIPPED: ${filePath} (does not exist)`);
        }
      } else {
        // Create or update operation
        const dirPath = path.dirname(fullPath);
        
        // Check if file exists before writing
        const fileExists = fs.existsSync(fullPath);
        
        // Ensure directory exists
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        
        // Write file content
        fs.writeFileSync(fullPath, file.content, 'utf8');
        
        const action = fileExists ? 'updated' : 'created';
        results.push({
          path: filePath,
          status: action,
          message: `File ${action} successfully`
        });
        console.log(`✅ ${action.toUpperCase()}: ${filePath}`);
      }
    } catch (error) {
      results.push({
        path: filePath,
        status: 'error',
        message: error.message
      });
      console.error(`❌ ERROR: ${filePath} - ${error.message}`);
    }
  }
  
  return results;
}

/**
 * Main execution
 */
function main() {
  try {
    // Read payload from environment variable or stdin
    const payloadStr = process.env.PAYLOAD || process.argv[2];
    
    if (!payloadStr) {
      throw new Error('No payload provided. Set PAYLOAD env var or pass as argument');
    }
    
    // Parse payload
    let payload;
    try {
      payload = JSON.parse(payloadStr);
    } catch (error) {
      throw new Error(`Failed to parse payload JSON: ${error.message}`);
    }
    
    console.log('📋 Validating payload...');
    validatePayload(payload);
    console.log('✅ Payload validation passed');
    
    // Handle different task types
    if (payload.task === 'update_files') {
      console.log(`\n📝 Processing ${payload.files.length} file update(s)...`);
      const results = applyFileUpdates(payload.files);
      
      // Summary
      const succeeded = results.filter(r => r.status === 'created' || r.status === 'updated' || r.status === 'deleted').length;
      const denied = results.filter(r => r.status === 'denied').length;
      const errors = results.filter(r => r.status === 'error').length;
      
      console.log('\n📊 Summary:');
      console.log(`   ✅ Succeeded: ${succeeded}`);
      console.log(`   ❌ Denied: ${denied}`);
      console.log(`   ⚠️  Errors: ${errors}`);
      
      // Write results to file for workflow to read
      fs.writeFileSync('operator-results.json', JSON.stringify(results, null, 2));
      
      // Exit with error if any operation failed
      if (errors > 0) {
        process.exit(1);
      }
    } else {
      console.log(`⚠️  Unknown task type: ${payload.task}`);
      process.exit(1);
    }
    
    console.log('\n✅ All operations completed successfully');
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { validatePayload, isPathAllowed, applyFileUpdates };
