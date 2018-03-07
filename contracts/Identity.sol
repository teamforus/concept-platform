pragma solidity ^0.4.18;

contract Identity {
    bytes32 key;

    struct Attribute {
        string name;
        string value;
        uint256 validatedBy;
    }
    mapping(bytes32 => Attribute) attributes;

    modifier onlyManagement() {
        bytes32 senderKey = keccak256(msg.sender);
        if (senderKey == key) {
            _;
        }
    }

    function Identity() public {
        key = keccak256(msg.sender);
    }

    function setAttribute(string name, string value) onlyManagement public {
        bytes32 attributeKey = keccak256(name);
        attributes[attributeKey].name = name;
        attributes[attributeKey].value = value;
        attributes[attributeKey].validatedBy = 0;
    }

    function validateAttribute(string name, uint256 validatorAddress) onlyManagement public {
        bytes32 attributeKey = keccak256(name);
        require(keccak256(attributes[attributeKey].name) != keccak256(""));
        attributes[attributeKey].validatedBy = validatorAddress;
    }

    function getAttribute(string name) public view returns(string, string, uint) {
        bytes32 attributeKey = keccak256(name);
        return (attributes[attributeKey].name, attributes[attributeKey].value, attributes[attributeKey].validatedBy);
    }

}