"""
Demo Blockchain Module for Property Registry
Simulates blockchain anchoring for hackathon demonstration
"""

import hashlib
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional


class BlockchainDemo:
    """Simulates blockchain operations for demonstration purposes"""
    
    def __init__(self):
        # Simulated blockchain state
        self.current_block = 1000000  # Start at a realistic block number
        self.chain_id = "ethereum-sepolia-testnet"
        self.gas_price = "20 gwei"
        
    def generate_tx_hash(self, data: Dict[str, Any]) -> str:
        """
        Generate a realistic transaction hash from data
        Uses SHA-256 to create deterministic hash
        """
        # Serialize data consistently
        data_str = json.dumps(data, sort_keys=True, separators=(',', ':'))
        
        # Add timestamp for uniqueness
        unique_data = f"{data_str}:{time.time()}"
        
        # Generate hash
        hash_obj = hashlib.sha256(unique_data.encode('utf-8'))
        tx_hash = "0x" + hash_obj.hexdigest()
        
        return tx_hash
    
    def generate_bundle_hash(self, bundle_data: Dict[str, Any]) -> str:
        """
        Generate a content hash for the transparency bundle
        This represents the Merkle root or IPFS CID in a real system
        """
        # Remove any existing hashes to avoid circular dependency
        clean_bundle = {k: v for k, v in bundle_data.items() if 'hash' not in k.lower()}
        
        # Serialize bundle
        bundle_str = json.dumps(clean_bundle, sort_keys=True, separators=(',', ':'))
        
        # Generate SHA-256 hash
        hash_obj = hashlib.sha256(bundle_str.encode('utf-8'))
        bundle_hash = "0x" + hash_obj.hexdigest()
        
        return bundle_hash
    
    def simulate_blockchain_anchor(
        self, 
        bundle_data: Dict[str, Any],
        submission_id: str
    ) -> Dict[str, Any]:
        """
        Simulate anchoring a transparency bundle to blockchain
        Returns a chain anchor object with transaction details
        """
        # Increment block number (simulate new block)
        self.current_block += 1
        
        # Generate bundle hash
        bundle_hash = self.generate_bundle_hash(bundle_data)
        
        # Create transaction data
        tx_data = {
            "submission_id": submission_id,
            "bundle_hash": bundle_hash,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "block": self.current_block
        }
        
        # Generate transaction hash
        tx_hash = self.generate_tx_hash(tx_data)
        
        # Create chain anchor
        chain_anchor = {
            "tx_hash": tx_hash,
            "block_number": self.current_block,
            "bundle_hash": bundle_hash,
            "timestamp": tx_data["timestamp"],
            "chain_id": self.chain_id,
            "gas_used": "21000",
            "gas_price": self.gas_price,
            "status": "confirmed",
            "confirmations": 12,
            "network": "Ethereum Sepolia Testnet (Demo)"
        }
        
        return chain_anchor
    
    def verify_bundle_hash(
        self, 
        bundle_data: Dict[str, Any], 
        expected_hash: str
    ) -> bool:
        """
        Verify that a bundle's computed hash matches the expected hash
        Used for integrity verification
        """
        computed_hash = self.generate_bundle_hash(bundle_data)
        return computed_hash == expected_hash
    
    def get_transaction_receipt(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        """
        Simulate fetching a transaction receipt
        In a real system, this would query the blockchain
        """
        # For demo purposes, return a mock receipt
        return {
            "tx_hash": tx_hash,
            "status": "confirmed",
            "confirmations": 12,
            "block_number": self.current_block,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "chain_id": self.chain_id
        }


# Global instance for the demo
blockchain_demo = BlockchainDemo()


# Convenience functions for use in Flask routes
def anchor_to_blockchain(bundle_data: Dict[str, Any], submission_id: str) -> Dict[str, Any]:
    """Anchor a transparency bundle to the demo blockchain"""
    return blockchain_demo.simulate_blockchain_anchor(bundle_data, submission_id)


def generate_bundle_hash(bundle_data: Dict[str, Any]) -> str:
    """Generate a hash for a transparency bundle"""
    return blockchain_demo.generate_bundle_hash(bundle_data)


def verify_bundle_integrity(bundle_data: Dict[str, Any], expected_hash: str) -> bool:
    """Verify bundle integrity"""
    return blockchain_demo.verify_bundle_hash(bundle_data, expected_hash)


def get_tx_receipt(tx_hash: str) -> Optional[Dict[str, Any]]:
    """Get transaction receipt"""
    return blockchain_demo.get_transaction_receipt(tx_hash)
