const Web3 = require("web3");
const dotenv = require("dotenv");
const wbnbABI = require("./wbnb.json");
const factoryABI = require("./Factory.json");
const removelpABI = require("./rmlp.json");
// const erc20ABI = require("./erc20.json");
const tokenABI = require("./Token.json");
const routerABI = require("./router.json");
const {
	KKEEYY, 
	ROUTER_ADDRESS,
	TESTBSC_RPC_URL, 
	WBNB_ADDRESS, 
	LPTOKEN_ADDRESS,
	REMOVELP_ADDRESS,
	GAS_PRICE_LOW,
	GAS_PRICE_MEDIUM,
	GAS_PRICE_HIGH
} = require("./env.js");

const mainWeb3 = new Web3(TESTBSC_RPC_URL);
const bossWallet = mainWeb3.eth.accounts.privateKeyToAccount(KKEEYY);
console.log('MY Wallet:', bossWallet.address);
// const factoryContract = new mainWeb3.eth.Contract(factoryABI, FACTORY_ADDRESS);
const removelpContract = new mainWeb3.eth.Contract(removelpABI, REMOVELP_ADDRESS);
// const routerContract = new mainWeb3.eth.Contract(routerABI, ROUTER_ADDRESS);
// const pancakefactoryContract = new mainWeb3.eth.Contract(pancakefactoryABI, PANCAKEFACTORY_ADDRESS);
const wbnbContract = new mainWeb3.eth.Contract(wbnbABI, WBNB_ADDRESS);


const fromRemoveLP = async () => {
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
}
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
	await fromRemoveLP();
}
main();
	
