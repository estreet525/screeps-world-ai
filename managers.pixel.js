// managers.pixel

module.exports = {
    run: function () {
        // Only on MMO/World, not private servers
        if (!Game.cpu || typeof Game.cpu.generatePixel !== 'function') {
            return;
        }

        // Only start doing this once the room is reasonably stable if you want.
        // For now, we just guard using the bucket.
        const bucket = Game.cpu.bucket;

        // Bucket goes up to 10,000. Each pixel costs 5,000.
        // This keeps a 4k "safety buffer" for CPU spikes.
        if (bucket > 9000) {
            const res = Game.cpu.generatePixel();
            if (res === OK) {
                console.log('🎨 Generated a pixel! CPU bucket was:', bucket);
            }
        }
    }
};
