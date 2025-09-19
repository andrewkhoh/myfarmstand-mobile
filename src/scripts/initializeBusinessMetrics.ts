/**
 * Business Metrics Initialization Script
 * One-time script to populate business_metrics table with order data
 * Can be run via: npx ts-node src/scripts/initializeBusinessMetrics.ts
 */

import { DataPopulationService } from '../services/data-pipeline/dataPopulationService';

async function initializeBusinessMetrics() {
  console.log('🚀 Starting business_metrics table initialization...');
  console.log('================================================');

  try {
    // Check current status
    console.log('📊 Checking current data status...');
    const status = await DataPopulationService.getPopulationStatus();

    console.log(`Current metrics count: ${status.totalMetrics}`);
    console.log(`Last run: ${status.lastRun || 'Never'}`);
    console.log(`Errors: ${status.errors.length > 0 ? status.errors.join(', ') : 'None'}`);

    if (status.totalMetrics > 0) {
      console.log('⚠️  Table already has data. Use force=true to overwrite.');

      // Just run incremental update
      console.log('🔄 Running incremental update instead...');
      const incrementalResult = await DataPopulationService.runIncrementalPopulation();

      if (incrementalResult.success) {
        console.log(`✅ Incremental update completed: ${incrementalResult.message}`);
      } else {
        console.log(`❌ Incremental update failed: ${incrementalResult.message}`);
      }

      return;
    }

    // Initialize with 90 days of data
    console.log('🔄 Initializing business_metrics table with 90 days of order data...');

    const result = await DataPopulationService.initializeBusinessMetrics({
      daysBack: 90,
      force: false
    });

    if (result.success) {
      console.log('✅ Initialization completed successfully!');
      console.log(`📈 Created ${result.metrics} business metrics`);
      console.log(`💬 ${result.message}`);
    } else {
      console.log('❌ Initialization failed!');
      console.log(`💬 ${result.message}`);
      process.exit(1);
    }

    // Verify data integrity
    console.log('🔍 Verifying data integrity...');
    const integrity = await DataPopulationService.verifyDataIntegrity();

    if (integrity.isValid) {
      console.log('✅ Data integrity check passed');
    } else {
      console.log('⚠️  Data integrity issues found:');
      integrity.issues.forEach(issue => console.log(`   • ${issue}`));

      console.log('💡 Recommendations:');
      integrity.recommendations.forEach(rec => console.log(`   • ${rec}`));

      // Try auto-fix
      console.log('🔧 Attempting to auto-fix issues...');
      const autoFix = await DataPopulationService.autoFixDataIssues();

      if (autoFix.success) {
        console.log('✅ Auto-fix completed successfully');
        autoFix.fixes.forEach(fix => console.log(`   • ${fix}`));
      } else {
        console.log('❌ Auto-fix failed');
        autoFix.errors.forEach(error => console.log(`   • ${error}`));
      }
    }

    // Final status check
    console.log('📊 Final status check...');
    const finalStatus = await DataPopulationService.getPopulationStatus();

    console.log('================================================');
    console.log('🎉 Business Metrics Initialization Complete!');
    console.log(`📈 Total metrics: ${finalStatus.totalMetrics}`);
    console.log(`⏰ Last update: ${finalStatus.lastSuccess || 'Unknown'}`);
    console.log('================================================');

    console.log('\n💡 Next steps:');
    console.log('1. Your analytics dashboards should now show real data');
    console.log('2. Set up a cron job to run incremental updates daily');
    console.log('3. Monitor the Data Population Manager in the admin panel');

  } catch (error) {
    console.error('❌ Fatal error during initialization:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  initializeBusinessMetrics()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { initializeBusinessMetrics };