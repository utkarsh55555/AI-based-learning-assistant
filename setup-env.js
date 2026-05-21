#!/usr/bin/env node

/**
 * Environment Setup Script
 * Creates .env files from .env.example templates
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up environment files...\n');

// Backend .env
const backendEnvExample = path.join(__dirname, 'src', 'obsidian-backend-flask', '.env.example');
const backendEnv = path.join(__dirname, 'src', 'obsidian-backend-flask', '.env');

// Frontend .env
const frontendEnvExample = path.join(__dirname, '.env.example');
const frontendEnv = path.join(__dirname, '.env');

// Create backend .env if it doesn't exist
if (!fs.existsSync(backendEnv) && fs.existsSync(backendEnvExample)) {
  fs.copyFileSync(backendEnvExample, backendEnv);
  console.log('✅ Created: src/obsidian-backend-flask/.env');
  console.log('   📝 Please edit this file and add your Supabase and OpenAI credentials\n');
} else if (fs.existsSync(backendEnv)) {
  console.log('⚠️  Backend .env already exists: src/obsidian-backend-flask/.env');
} else {
  console.log('❌ Backend .env.example not found. Please create it manually.');
}

// Create frontend .env if it doesn't exist
if (!fs.existsSync(frontendEnv) && fs.existsSync(frontendEnvExample)) {
  fs.copyFileSync(frontendEnvExample, frontendEnv);
  console.log('✅ Created: .env');
  console.log('   📝 This file is ready to use (default values should work for local dev)\n');
} else if (fs.existsSync(frontendEnv)) {
  console.log('⚠️  Frontend .env already exists: .env');
} else {
  console.log('❌ Frontend .env.example not found. Please create it manually.');
}

console.log('\n📋 Next steps:');
console.log('1. Edit src/obsidian-backend-flask/.env and add your credentials:');
console.log('   - SUPABASE_URL');
console.log('   - SUPABASE_ANON_KEY');
console.log('   - SUPABASE_SERVICE_KEY');
console.log('   - OPENAI_API_KEY');
console.log('   - SECRET_KEY (generate a secure random string)');
console.log('\n2. Edit .env if needed (default should work for local development)');
console.log('\n3. Run: npm start');
console.log('\n📚 See ENV_SETUP_GUIDE.md for detailed instructions\n');

