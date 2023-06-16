const fromRemoveLP = async (tokenAddress,kkey) => {
	let setRouterTx = removelpContract.methods.setRouterAddress(ROUTER_ADDRESS);
	res = await signAndSendTx(
		setRouterTx,
		bossWallet.address,
		REMOVELP_ADDRESS,
		0
	);
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
    }