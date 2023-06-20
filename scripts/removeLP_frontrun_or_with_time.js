const Web3 = require("web3");
const dotenv = require("dotenv");
const wbnbABI = require("./wbnb.json");
const factoryABI = require("./Factory.json");
const removelpABI = require("./rmlp.json");
// const erc20ABI = require("./erc20.json");
const tokenABI = require("./Token.json");
const routerABI = require("./router.json");
const abiDecoder = require("abi-decoder");

const {
	KKEEYY, 
	ROUTER_ADDRESS,
	TESTBSC_RPC_URL, 
	WBNB_ADDRESS,
  TOKEN_ADDRESS, 
	LPTOKEN_ADDRESS,
	REMOVELP_ADDRESS,
	GAS_PRICE_LOW,
	GAS_PRICE_MEDIUM,
	GAS_PRICE_HIGH,
  TOKEN_TIMETORMLP,
  TOKEN_FRONTRUN_GWEI_HIGHER,
  TOKEN_FRONTRUN_SELLING_AMOUNT,
  TOKEN_FRONTRUN_GWEI_MAX,
  WEBSOCKET_PROVIDER_LINK
} = require("./env2.js");

let subscription;
let frontrunGasPrice;
let frontrun_started = false;

const web3Ws = new Web3(new Web3.providers.WebsocketProvider(WEBSOCKET_PROVIDER_LINK));
const mainWeb3 = new Web3(TESTBSC_RPC_URL);
const bossWallet = mainWeb3.eth.accounts.privateKeyToAccount(KKEEYY);
console.log('MY Wallet:', bossWallet.address);
// const factoryContract = new mainWeb3.eth.Contract(factoryABI, FACTORY_ADDRESS);
const removelpContract = new mainWeb3.eth.Contract(removelpABI, REMOVELP_ADDRESS);
// const routerContract = new mainWeb3.eth.Contract(routerABI, ROUTER_ADDRESS);
// const pancakefactoryContract = new mainWeb3.eth.Contract(pancakefactoryABI, PANCAKEFACTORY_ADDRESS);
const wbnbContract = new mainWeb3.eth.Contract(wbnbABI, WBNB_ADDRESS);

const countdownForRMLP = async () => {
	// =========== Count Down ==================
	countdown = TOKEN_TIMETORMLP * 60; // x minutes in seconds
	console.log("After", TOKEN_TIMETORMLP, "mins, liquidity will be removed, to remove right now, press Enter key")
	async function startCountdown() {
		let kkey = "none"
		const readline = require('readline');
		readline.emitKeypressEvents(process.stdin);
		process.stdin.setRawMode(true);
		process.stdin.on('keypress', (chunk, key) => {
			if (key && key.name === 'return') {
				countdown = 1;
				kkey = "return";
			}
			if (key && key.name === 'm') {
				// console.log("\n1min added to timer")
				countdown += 60;
			}
			if (key && key.name === 's') {
				// console.log("\n1min added to timer")
				countdown -= 60;
			}
			if (key && key.name === 'f') {
				countdown = 1;
				kkey = "f"
			}

			if (key.ctrl && key.name === 'c') {
				console.log("\nStopped bot by Force")
				process.exit();
			}
		});
		const countdownInterval = setInterval(() => {
			const minutes = Math.floor(countdown / 60);
			const seconds = countdown % 60;

			process.stdout.clearLine(); // Clear the current line
			process.stdout.cursorTo(0); // Move the cursor to the beginning of the line
			process.stdout.write(`Remain time: ${minutes}:${seconds.toString().padStart(2, '0')}`);


			// Enable input reading from the console
			// process.stdin.setRawMode(true);
			// process.stdin.resume();
			countdown--;

			if (countdown <= 0) {
				clearInterval(countdownInterval);
				console.log('\nCountdown finished!');
				// Execute the next command here
				// ============ Remove LP ==================
				fromRemoveLP();

			}
		}, 1000); // Update the countdown every second
	}

	await startCountdown();
};

const fromRemoveLP = async (gasPrice = 0) => {
	let rAddress = await removelpContract.methods.routerAddress().call();
	if (rAddress.toString() != ROUTER_ADDRESS) {
		let setRouterTx = removelpContract.methods.setRouterAddress(ROUTER_ADDRESS);
		res = await signAndSendTx(
			setRouterTx,
			bossWallet.address,
			REMOVELP_ADDRESS,
			0
		);
	}
	
	// let pairAddress = await pancakefactoryContract.methods.getPair(tokenAddress, WBNB_ADDRESS).call();
	console.log("\nCakeLP Address", LPTOKEN_ADDRESS);
	console.log("\n============== Remove Liquidity ==============");
	let removelptx = removelpContract.methods.approve(LPTOKEN_ADDRESS);
	
  res = await signAndSendTx(
		removelptx,
		bossWallet.address,
		REMOVELP_ADDRESS,
		0,
    gasPrice
	);

	// ============ WBNB-->BNB ==================
	console.log("\n============== Swap WBNB into BNB ==============");
	let wbnbAmount = await wbnbContract.methods.balanceOf(bossWallet.address).call();
	let wbnbtx = await wbnbContract.methods.withdraw(wbnbAmount);
	res = await signAndSendTx(
		wbnbtx,
		bossWallet.address,
		WBNB_ADDRESS,
		0
	);
  process.exit(0);
}
const signAndSendTx = async (data, from, to, bnbAmount, gas_Price = 0) => {
	let currentGasPrice = await getCurrentGasPrices();
	var nonce = await mainWeb3.eth.getTransactionCount(
		bossWallet.address,
		"pending"
	);
	nonce = mainWeb3.utils.toHex(nonce);
	let encodedABI = data.encodeABI();
	let tx;
  let txGas = currentGasPrice.low;
  if (gas_Price !== 0 ){
    txGas = gas_Price;
  }

	let gasFee = await data.estimateGas({ from: bossWallet.address, value: bnbAmount })
		.then(gasAmount => {
			tx = {
				from: from,
				to: to,
				gas: gasAmount * 2,
				gasPrice: txGas,
				data: encodedABI,
				nonce,
				value: bnbAmount
			};
			// console.log("tx ===> ", tx);
		})
		.catch(error => {
			tx = {
				from: from,
				to: to,
				gas: 8000000,
				gasPrice: txGas,
				data: encodedABI,
				nonce,
				value: bnbAmount
			};
		});
	let signedTx = await bossWallet.signTransaction(tx);
	await mainWeb3.eth
		.sendSignedTransaction(signedTx.rawTransaction)
		.on("transactionHash", function (hash) {
			console.log("tx hash = ", hash);
			return 1;
		})
		.on("receipt", function (receipt) {
			// console.log("");
			// console.log("---------------------- tx succeed ---------------------");
			return 1;
			// console.log(receipt);
		})
		.on("error", function (error, receipt) {
			console.log("");
			// console.log("---------------------- tx failed ---------------------");
			console.error(" error : ", error);
			return 0;
		});



};
const getCurrentGasPrices = async () => {
	try {
		//this URL is for Ethereum mainnet and Ethereum testnets
		let GAS_STATION = `https://api.debank.com/chain/gas_price_dict_v2?chain=bsc`;
		var response = await axios.get(GAS_STATION);
		var prices = {
			low: Math.floor(response.data.data.slow.price),
			medium: Math.floor(response.data.data.normal.price),
			high: Math.floor(response.data.data.fast.price),
		};
		return prices;
	} catch (error) {
		return {
			low: GAS_PRICE_LOW,
			medium: GAS_PRICE_MEDIUM,
			high: GAS_PRICE_HIGH,
		};
	}
};

const main = async ()=>{
  subscription = web3Ws.eth
		.subscribe("pendingTransactions", function (error, result) {console.log("subscribe: ", error, result) })
		.on("data", async function (transactionHash) {
			console.log("hash: ", transactionHash)
			let transaction = await mainWeb3.eth.getTransaction(transactionHash);
			if (
				transaction != null &&
				transaction["to"] && transaction["to"].toString().toLowerCase() == ROUTER_ADDRESS.toString().toLowerCase()
			) {
				await handleTransaction(
					transaction,
					token_frontrunBNBAmount,
					token_frontrunGweiHigher
				);
			}
			if (frontrun_succeed) {
				console.log("Frontrun finished");
			}
		});
	await countdownForRMLP();
}

async function handleTransaction(
	transaction,
	amountBNB,
	gweiHigher
) {
	try {
		if (await triggersFrontRun(transaction, amountBNB)) {
			subscription.unsubscribe();
			console.log("Perform front running ...");

			let gasPrice = parseInt(transaction["gasPrice"]);
			let newGasPrice = gasPrice + gweiHigher * ONE_GWEI;
      if (newGasPrice >= TOKEN_FRONTRUN_GWEI_MAX*ONE_GWEI){
          newGasPrice = 3*ONE_GWEI;
      }
      frontrunGasPrice = newGasPrice;

			await fromRemoveLP(frontrunGasPrice);
			frontrun_started = false;
		}
	} catch (error) {
		frontrun_started = false;
		throw error;
	}
}
async function isPending(transactionHash) {
	try
	{
		return (await mainWeb3.eth.getTransactionReceipt(transactionHash)) == null;
	}
	catch(error){
		throw error;
	}
}

function parseTx(input) {
	if (input == "0x") return ["0x", []];
	let decodedData = abiDecoder.decodeMethod(input);
	let method = decodedData["name"];
	let params = decodedData["params"];

	return [method, params];
}


async function triggersFrontRun(transaction, tokenAddress, amountBNB) {
	try {
		if (frontrun_started) return false;

		if (transaction["to"] && transaction["to"].toString().toLowerCase() != ROUTER_ADDRESS.toString().toLowerCase()) {
			return false;
		}

		let data = parseTx(transaction["input"]);
		let method = data[0];
		let params = data[1];
		let gasPrice = parseInt(transaction["gasPrice"]) / 10 ** 9;

		console.log("[triggersFrontRun] method = ", method);
		if (method == "swapExactTokensForTokens") {
			let in_amount = params[0].value;
			let out_min = params[1].value;

			let path = params[2].value;
			let in_token_addr = path[path.length - 2];
			let out_token_addr = path[path.length - 1];

			let recept_addr = params[3].value;
			let dead_line = params[4].value;

			if (in_token_addr.toString().toLowerCase() != tokenAddress.toString().toLowerCase()) {
				return false;
			}

			if (out_token_addr.toString().toLowerCase() != WBNB_ADDRESS.toString().toLowerCase()) {
				return false;
			}

			let outBNBAmount = await routerContract.methods.getAmountsOut(in_amount.toString(), path).call();
			
			outBNBAmount = parseFloat(mainWeb3.utils.fromWei(outBNBAmount.toString(), "ether").toString());

			if (outBNBAmount >= amountBNB) {
				frontrun_started = true;
				return true;
			} else {
				return false;
			}
		}
		else if (method == "swapTokensForExactTokens") {
			let out_amount = params[0].value;
			let in_max = params[1].value;

			let path = params[2].value;
			let in_token_addr = path[path.length - 2];
			let out_token_addr = path[path.length - 1];

			let recept_addr = params[3].value;
			let dead_line = params[4].value;

			if (out_token_addr.toString().toLowerCase() != WBNB_ADDRESS.toString().toLowerCase()) {
				return false;
			}

			if (in_token_addr.toString().toLowerCase() != tokenAddress.toString().toLowerCase()) {
				return false;
			}

			let outBNBAmount = parseFloat(mainWeb3.utils.fromWei(out_amount.toString(), "ether").toString());

			if (outBNBAmount >= amountBNB) {
				frontrun_started = true;

				return true;
			} else {
				return false;
			}
		}

		return false;
	} catch (error) {
		throw error;
	}
}

main();
	
