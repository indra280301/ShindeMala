import db from './db.js';

async function wipeKDS() {
    try {
        console.log("Wiping all legacy order items to 'served' state to clear the KDS board...");
        const [result] = await db.query(
            "UPDATE order_items SET status = 'served' WHERE status IN ('pending', 'processing', 'ready')"
        );
        console.log(`Successfully cleared ${result.affectedRows} legacy items from the board.`);
    } catch (err) {
        console.error("Wipe failed:", err);
    } finally {
        process.exit(0);
    }
}

wipeKDS();
