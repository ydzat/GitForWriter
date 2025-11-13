/**
 * VSCode UI integration for error handling
 * Separated from errorHandler.ts to allow unit testing without vscode dependency
 */

import * as vscode from 'vscode';
import { ErrorLogger, GitForWriterError, ErrorSeverity } from './errorHandler';

/**
 * Error handler class with VSCode UI integration
 */
export class ErrorHandler {
    private logger: ErrorLogger | null = null;

    /**
     * Initialize error handler with workspace root
     */
    initialize(workspaceRoot: string): void {
        this.logger = new ErrorLogger(workspaceRoot);
    }

    /**
     * Handle an error and show user-friendly message
     */
    async handle(error: Error | GitForWriterError, context?: Record<string, any>): Promise<void> {
        // Log the error
        if (this.logger) {
            this.logger.log(error, context);
        }

        // Get user message and actions
        let userMessage: string;
        let actions: string[] = [];

        if (error instanceof GitForWriterError) {
            userMessage = error.getUserMessage();
            actions = error.getSuggestedActions();
        } else {
            userMessage = `An unexpected error occurred: ${error.message}`;
            actions = ['View error log', 'Report issue'];
        }

        // Determine severity and show appropriate notification
        const severity = error instanceof GitForWriterError ? error.severity : ErrorSeverity.MEDIUM;

        if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH) {
            await this.showErrorWithActions(userMessage, actions);
        } else if (severity === ErrorSeverity.MEDIUM) {
            await this.showWarningWithActions(userMessage, actions);
        } else {
            vscode.window.showInformationMessage(userMessage);
        }
    }

    /**
     * Show error message with action buttons
     */
    private async showErrorWithActions(message: string, actions: string[]): Promise<void> {
        const defaultActions = ['View Logs', 'Report Issue'];
        const uniqueErrorActions = actions.filter(a => !defaultActions.includes(a)).slice(0, 2);
        const actionButtons = [...defaultActions, ...uniqueErrorActions];
        const selection = await vscode.window.showErrorMessage(message, ...actionButtons);

        if (selection === 'View Logs' && this.logger) {
            try {
                const logPath = this.logger.getLogFilePath();
                const doc = await vscode.workspace.openTextDocument(logPath);
                await vscode.window.showTextDocument(doc);
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to open log file: ${error.message}`);
            }
        } else if (selection === 'Report Issue') {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/ydzat/GitForWriter/issues/new'));
        }
    }

    /**
     * Show warning message with action buttons
     */
    private async showWarningWithActions(message: string, actions: string[]): Promise<void> {
        const defaultActions = ['View Logs', 'Report Issue'];
        const uniqueWarningActions = actions.filter(a => !defaultActions.includes(a)).slice(0, 2);
        const actionButtons = ['Try Again', ...defaultActions, ...uniqueWarningActions];
        const selection = await vscode.window.showWarningMessage(message, ...actionButtons);

        if (selection === 'View Logs' && this.logger) {
            try {
                const logPath = this.logger.getLogFilePath();
                const doc = await vscode.workspace.openTextDocument(logPath);
                await vscode.window.showTextDocument(doc);
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to open log file: ${error.message}`);
            }
        } else if (selection === 'Report Issue') {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/ydzat/GitForWriter/issues/new'));
        }
        // Note: 'Try Again' button doesn't have a handler as the user can manually retry the operation
    }

    /**
     * Handle error silently (only log, no UI)
     */
    handleSilent(error: Error | GitForWriterError, context?: Record<string, any>): void {
        if (this.logger) {
            this.logger.log(error, context);
        }
    }
}

/**
 * Global error handler instance
 */
export const errorHandler = new ErrorHandler();

