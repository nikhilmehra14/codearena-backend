const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script to clean up duplicate contests in the database
 * Duplicates are identified by having the same URL
 * When duplicates exist, we keep the one from platform-specific APIs (cf_, lc_, etc.)
 * and remove the ones from Clist (clist_ prefix)
 */
async function cleanupDuplicateContests() {
  try {
    console.log('Starting duplicate contest cleanup...');

    // Get all active contests
    const contests = await prisma.contest.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`Found ${contests.length} active contests`);

    // Group contests by URL
    const urlMap = new Map();
    for (const contest of contests) {
      const url = contest.url;
      if (!urlMap.has(url)) {
        urlMap.set(url, []);
      }
      urlMap.get(url).push(contest);
    }

    // Find duplicates
    const duplicateGroups = Array.from(urlMap.entries())
      .filter(([url, contests]) => contests.length > 1);

    console.log(`Found ${duplicateGroups.length} URLs with duplicate contests`);

    let totalRemoved = 0;

    // Process each duplicate group
    for (const [url, duplicates] of duplicateGroups) {
      console.log(`\nProcessing duplicates for URL: ${url}`);
      console.log(`Found ${duplicates.length} duplicates:`);
      
      duplicates.forEach(c => {
        console.log(`- ID: ${c.id}, ExternalID: ${c.externalId}, Name: ${c.name}`);
      });

      // Sort to prefer non-clist sources
      // Priority: platform-specific (cf_, lc_, etc.) > clist_
      duplicates.sort((a, b) => {
        const aIsClist = a.externalId.startsWith('clist_');
        const bIsClist = b.externalId.startsWith('clist_');
        
        if (aIsClist && !bIsClist) return 1;  // b comes first
        if (!aIsClist && bIsClist) return -1; // a comes first
        
        // If both are same type, prefer the older one (created first)
        return new Date(a.createdAt) - new Date(b.createdAt);
      });

      // Keep the first one (highest priority), delete the rest
      const toKeep = duplicates[0];
      const toDelete = duplicates.slice(1);

      console.log(`  Keeping: ${toKeep.externalId} (ID: ${toKeep.id})`);
      console.log(`  Deleting ${toDelete.length} duplicate(s)...`);

      // Delete duplicates
      for (const contest of toDelete) {
        try {
          // First, delete any reminders associated with this contest
          await prisma.reminder.deleteMany({
            where: { contestId: contest.id },
          });

          // Then delete the contest
          await prisma.contest.delete({
            where: { id: contest.id },
          });

          console.log(`✓ Deleted: ${contest.externalId} (ID: ${contest.id})`);
          totalRemoved++;
        } catch (error) {
          console.error(`✗ Error deleting contest ${contest.id}:`, error.message);
        }
      }
    }

    console.log(`\n✅ Cleanup complete!`);
    console.log(`Total duplicates removed: ${totalRemoved}`);
    console.log(`Remaining contests: ${contests.length - totalRemoved}`);

  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupDuplicateContests()
  .then(() => {
    console.log('\nScript finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });
