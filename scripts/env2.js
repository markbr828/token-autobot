
// #################### Contract #################
const ROUTER_ADDRESS = "0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3"             // pancake router address
const PANCAKEFACTORY_ADDRESS = "0xB7926C0430Afb07AA7DEfDE6DA862aE0Bde767bc"              
const WBNB_ADDRESS = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd"                     // WBNB contract address
const FACTORY_ADDRESS = "0x13A1c24Ed41c9897E02429DfBd66cC5c5B09fF10"                  // token factory address
const REMOVELP_ADDRESS = "0x806A0fa5bf73cEC046d37fbaeC0dc08eE4A84B49"                 // rmlq contract address


// ####################  Wallet  ##################
const KKEEYY = "5d2e0d16c40df633301ae6918052cb0c19a30649c8848a781bad2739a84f0921"             // my private key
const TESTBSC_RPC_URL = "https://data-seed-prebsc-2-s2.binance.org:8545"                     // RPC

// #################### TOKEN ###################
const TOKEN_ADDRESS = "0x69E445eCe585bC6981ECe1Cf0325407deb4e3A7b"
const LPTOKEN_ADDRESS = "0x32906C25aC8C53C0EBC56AaFA9de867eA50D7601"

// #################### TimeTo 
const GAS_PRICE_LOW = 10000000000
const GAS_PRICE_MEDIUM = 6000000000
const GAS_PRICE_HIGH = 10000000000
const WEBSOCKET_PROVIDER_LINK = "ws://localhost/8546"
const TOKEN_TIMETORMLP = 3
const TOKEN_FRONTRUN_SELLING_AMOUNT = 0.05
const TOKEN_FRONTRUN_GWEI_HIGHER = 1

module.exports = {
    WEBSOCKET_PROVIDER_LINK,
    TOKEN_FRONTRUN_GWEI_HIGHER,
    TOKEN_TIMETORMLP,
    TOKEN_FRONTRUN_SELLING_AMOUNT,
    TOKEN_ADDRESS,
    LPTOKEN_ADDRESS,
    ROUTER_ADDRESS,
    PANCAKEFACTORY_ADDRESS,
    WBNB_ADDRESS,
    FACTORY_ADDRESS,
    REMOVELP_ADDRESS,
    KKEEYY,
    TESTBSC_RPC_URL,
    GAS_PRICE_LOW,
    GAS_PRICE_MEDIUM,
    GAS_PRICE_HIGH
};
