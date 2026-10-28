const PocketBase = require("pocketbase/cjs");
const fs = require("fs");

// Initialize pointing to your backend IP
const pb = new PocketBase("http://192.168.10.10:8090");

async function importData() {
  try {
    // 1. Authenticate as admin to bypass client creation rules
    await pb.admins.authWithPassword("ajax10g-wr0@yahoo.com", "goldeneye123X$");
    console.log("Admin authenticated successfully.");

    // 2. Load the JSON file
    const rawData = fs.readFileSync("flashcards.json");
    const cards = JSON.parse(rawData);

    console.log(`Starting import of ${cards.length} flashcards...`);

    // 3. Loop through and create each record
    for (const card of cards) {
      // Destructure to remove the 'id' field so PocketBase auto-generates its own 15-character IDs
      const { id, ...recordData } = card;

      await pb.collection("phonics_flashcards").create(recordData);
      console.log(`Imported: ${recordData.word}`);
    }

    console.log("✅ All flashcards imported successfully!");
  } catch (error) {
    console.error("Error during import:", error.message);
    if (error.response) {
      console.error("Details:", error.response.data);
    }
  }
}

importData();
