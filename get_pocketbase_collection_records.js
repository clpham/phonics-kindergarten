import PocketBase from "pocketbase";

// 1. Get the collection name from the command line arguments
const collectionName = process.argv[2];

if (!collectionName) {
  console.error("❌ Error: Please provide a collection name.");
  console.log("Usage: node script.js <collection_name>");
  process.exit(1);
}

// 2. Initialize PocketBase
const pb = new PocketBase("http://127.0.0.1:8090");

async function downloadRecords() {
  try {
    console.log(`📥 Fetching records from collection: "${collectionName}"...`);

    // 3. Fetch all records (automatically handles pagination)
    const records = await pb.collection(collectionName).getFullList({
      sort: "-created",
    });

    console.log(`✅ Successfully downloaded ${records.length} records:`);
    console.log(JSON.stringify(records, null, 2));
  } catch (error) {
    console.error("❌ Failed to fetch records:", error.message);
  }
}

downloadRecords();
