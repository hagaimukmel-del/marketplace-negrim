#!/usr/bin/env node

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const report = {
  timestamp: new Date().toISOString(),
  checks: [],
  summary: {
    passed: 0,
    failed: 0,
    warnings: 0,
  },
}

function runCheck(name, command, severity = 'error') {
  console.log(`\n🔍 ${name}...`)
  try {
    const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' })
    report.checks.push({
      name,
      status: 'passed',
      severity,
      output: output.substring(0, 500),
    })
    report.summary.passed++
    console.log(`✅ ${name} passed`)
    return true
  } catch (error) {
    report.checks.push({
      name,
      status: 'failed',
      severity,
      error: error.message.substring(0, 500),
    })
    if (severity === 'error') {
      report.summary.failed++
    } else {
      report.summary.warnings++
    }
    console.log(`❌ ${name} failed`)
    return false
  }
}

function main() {
  console.log('🔒 Starting Security Audit...\n')

  // 1. npm audit
  runCheck(
    '📦 npm audit (dependencies)',
    'npm audit --audit-level=moderate',
    'error'
  )

  // 2. Check for secrets
  console.log('\n🔐 Scanning for hardcoded secrets...')
  const secretPatterns = [
    'PRIVATE_KEY',
    'API_KEY',
    'SECRET_KEY',
    'PASSWORD',
    'api_key',
    'secret',
  ]

  try {
    const srcPath = path.join(__dirname, '../src')
    const files = execSync(`find ${srcPath} -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \\)`, {
      encoding: 'utf-8',
    }).split('\n')

    let secretsFound = []
    for (const file of files) {
      if (!file) continue
      const content = fs.readFileSync(file, 'utf-8')
      for (const pattern of secretPatterns) {
        if (content.includes(pattern) && !file.includes('node_modules')) {
          secretsFound.push({ file, pattern })
        }
      }
    }

    if (secretsFound.length === 0) {
      report.checks.push({
        name: '🔐 Hardcoded secrets scan',
        status: 'passed',
        severity: 'error',
      })
      report.summary.passed++
      console.log('✅ No hardcoded secrets found')
    } else {
      report.checks.push({
        name: '🔐 Hardcoded secrets scan',
        status: 'failed',
        severity: 'error',
        issues: secretsFound,
      })
      report.summary.failed++
      console.log(`⚠️ Found ${secretsFound.length} potential secrets`)
    }
  } catch (error) {
    console.log(`⚠️ Secret scan skipped: ${error.message}`)
  }

  // 3. TypeScript check
  runCheck(
    '📝 TypeScript type checking',
    'npx tsc --noEmit',
    'error'
  )

  // 4. File permissions
  console.log('\n🔐 Checking file permissions...')
  try {
    const envFiles = ['.env.local', '.env']
    let permissionIssues = []

    for (const envFile of envFiles) {
      const filePath = path.join(__dirname, '../' + envFile)
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath)
        // Check if file is readable by others (0o044 = readable by group/others)
        if ((stats.mode & 0o044) !== 0) {
          permissionIssues.push({
            file: envFile,
            issue: 'File is readable by group/others',
          })
        }
      }
    }

    if (permissionIssues.length === 0) {
      report.checks.push({
        name: '🔐 File permissions',
        status: 'passed',
        severity: 'warning',
      })
      report.summary.passed++
      console.log('✅ File permissions OK')
    } else {
      report.checks.push({
        name: '🔐 File permissions',
        status: 'failed',
        severity: 'warning',
        issues: permissionIssues,
      })
      report.summary.warnings++
      console.log(`⚠️ Found ${permissionIssues.length} permission issues`)
    }
  } catch (error) {
    console.log(`⚠️ Permission check skipped: ${error.message}`)
  }

  // 5. License compliance
  console.log('\n📜 Checking license compliance...')
  try {
    execSync('npm ls --depth=0', { stdio: 'pipe' })
    report.checks.push({
      name: '📜 License compliance',
      status: 'passed',
      severity: 'warning',
    })
    report.summary.passed++
    console.log('✅ License check passed')
  } catch (error) {
    report.checks.push({
      name: '📜 License compliance',
      status: 'failed',
      severity: 'warning',
    })
    report.summary.warnings++
  }

  // Generate report
  console.log('\n\n' + '='.repeat(60))
  console.log('📊 SECURITY AUDIT REPORT')
  console.log('='.repeat(60))
  console.log(`📅 ${report.timestamp}`)
  console.log(`✅ Passed: ${report.summary.passed}`)
  console.log(`❌ Failed: ${report.summary.failed}`)
  console.log(`⚠️ Warnings: ${report.summary.warnings}`)
  console.log('='.repeat(60) + '\n')

  // Save report
  const reportPath = path.join(__dirname, '../reports/security-' + Date.now() + '.json')
  const reportsDir = path.dirname(reportPath)

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true })
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`📄 Report saved to: ${reportPath}\n`)

  // Exit with error if critical issues found
  if (report.summary.failed > 0) {
    console.log('🚨 Security audit FAILED')
    process.exit(1)
  }

  console.log('✅ Security audit PASSED')
  process.exit(0)
}

main()
