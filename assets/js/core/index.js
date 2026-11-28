
/**
 * JosJis Ecosystem
 * Module: Core Entry Point
 *
 * Purpose:
 * Provides a centralized entry point for accessing JosJis Core modules.
 *
 * Responsibilities:
 * - Re-export the RPC Manager.
 * - Re-export the Contract Registry.
 * - Re-export the Wallet Manager.
 * - Re-export the Token Manager.
 * - Re-export the Data Manager.
 * - Re-export the Transaction Manager.
 * - Re-export the Error Manager.
 *
 * Usage:
 * Other application modules can import the required Core functionality
 * through this single entry point instead of importing each module
 * individually.
 *
 * Architecture:
 * Each module is exposed as a namespace to keep its exported functions
 * and constants grouped under a dedicated module name.
 *
 * Important:
 * This file only organizes module exports.
 * It does not contain business logic or execute blockchain operations.
 */

/*
========================================
 JOSJIS CORE
 Central Module Export
========================================
*/

// RPC Manager
// Provides RPC provider management, health checks, and failover.
export * as RPC from "./rpc-manager.js";

// Contract Registry
// Provides registered contract addresses, network settings, and ABIs.
export * as Registry from "./contract-registry.js";

// Wallet Manager
// Provides wallet connection state and AppKit interaction methods.
export * as Wallet from "./wallet-manager.js";

// Token Manager
// Provides token metadata, balances, supply, and allowance read operations.
export * as Token from "./token-manager.js";

// Data Manager
// Provides dashboard data loading and cached application data.
export * as Data from "./data-manager.js";

// Transaction Manager
// Provides wallet signer management and blockchain transaction methods.
export * as Transaction from "./transaction-manager.js";

// Error Manager
// Provides error classification, normalization, and logging utilities.
export * as Error from "./error-manager.js";
