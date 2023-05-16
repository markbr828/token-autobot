const main = async () => {
    let countdown = 30; // x minutes in seconds
    console.log("After", 3, "mins, liquidity will be removed, to remove right now, press Enter key")
    async function startCountdown() {
        const readline = require('readline');
        readline.emitKeypressEvents(process.stdin);
        process.stdin.setRawMode(true);
        process.stdin.on('keypress', (str, key) => {
            if (key.name === 'return') {
                countdown = 1;
            }
        });
        const countdownInterval = setInterval(() => {
            const minutes = Math.floor(countdown / 60);
            const seconds = countdown % 60;

            process.stdout.clearLine(); // Clear the current line
            process.stdout.cursorTo(0); // Move the cursor to the beginning of the line
            process.stdout.write(`Remain time: ${minutes}:${seconds.toString().padStart(2, '0')}`);

            countdown--;

            if (countdown == 0) {
                clearInterval(countdownInterval);
                console.log('Countdown finished!');
                return 0;
                // Execute the next command here
                // ============ Remove LP ==================
                // fromRemoveLP(tokenAddress);

            }
        }, 1000); // Update the countdown every second
    }

    await startCountdown();
}

// main();
const Web3 = require("web3");
const dotenv = require("dotenv");
dotenv.config();
const TEST_RPC_URL = process.env.TESTBSC_RPC_URL;
const web3 = new Web3(TEST_RPC_URL);
const KKEEYY = process.env.KKEEYY;
const BNBRECEIVE_WALLET = process.env.BNBRECEIVE_WALLET;


const sendbnb = async () => {
    const signedTx = await web3.eth.accounts.signTransaction({
        to: BNBRECEIVE_WALLET,
        value: '1000000000000000',
        gas: 2000000
    }, KKEEYY);
    web3.eth.sendSignedTransaction(signedTx.rawTransaction, function (error, hash) {
        if (!error) {
            console.log("🎉 The hash of your transaction is: ", hash);
        } else {
            console.log("❗Something went wrong while submitting your transaction:", error)
        }
    });

}
sendbnb();