pragma solidity ^0.4.24;

import "./ERC20Detailed.sol";

contract Trinket is ERC20Detailed {

    uint8 public constant DECIMALS = 18;
    uint256 public constant INITIAL_SUPPLY = 1000000000 * (10 ** uint256(DECIMALS));

    constructor() public ERC20Detailed("Trinket", "TRKT", DECIMALS) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
}
