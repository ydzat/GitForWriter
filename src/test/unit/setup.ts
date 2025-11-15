/**
 * Test setup file to mock VSCode API for unit tests
 */

// Mock vscode module for unit tests
const vscode = {
    window: {
        showErrorMessage: () => Promise.resolve(),
        showWarningMessage: () => Promise.resolve(),
        showInformationMessage: () => Promise.resolve(),
        createOutputChannel: () => ({
            appendLine: () => {},
            append: () => {},
            clear: () => {},
            show: () => {},
            hide: () => {},
            dispose: () => {}
        }),
        createStatusBarItem: () => ({
            text: '',
            tooltip: '',
            command: '',
            show: () => {},
            hide: () => {},
            dispose: () => {}
        }),
        showQuickPick: () => Promise.resolve(),
        showInputBox: () => Promise.resolve(),
        createTextEditorDecorationType: () => ({
            dispose: () => {}
        }),
        activeTextEditor: undefined,
        visibleTextEditors: []
    },
    workspace: {
        getConfiguration: () => ({
            get: () => undefined,
            has: () => false,
            inspect: () => undefined,
            update: () => Promise.resolve()
        }),
        workspaceFolders: [],
        onDidChangeConfiguration: () => ({ dispose: () => {} }),
        onDidChangeTextDocument: () => ({ dispose: () => {} }),
        onDidSaveTextDocument: () => ({ dispose: () => {} }),
        fs: {
            readFile: () => Promise.resolve(Buffer.from('')),
            writeFile: () => Promise.resolve(),
            delete: () => Promise.resolve(),
            createDirectory: () => Promise.resolve(),
            stat: () => Promise.resolve({ type: 1, ctime: 0, mtime: 0, size: 0 })
        }
    },
    Uri: {
        file: (path: string) => ({ fsPath: path, path, scheme: 'file' }),
        parse: (uri: string) => ({ fsPath: uri, path: uri, scheme: 'file' })
    },
    Range: class Range {
        constructor(
            public start: any,
            public end: any
        ) {}
    },
    Position: class Position {
        constructor(
            public line: number,
            public character: number
        ) {}
    },
    StatusBarAlignment: {
        Left: 1,
        Right: 2
    },
    ConfigurationTarget: {
        Global: 1,
        Workspace: 2,
        WorkspaceFolder: 3
    },
    FileType: {
        Unknown: 0,
        File: 1,
        Directory: 2,
        SymbolicLink: 64
    },
    commands: {
        registerCommand: () => ({ dispose: () => {} }),
        executeCommand: () => Promise.resolve()
    },
    languages: {
        registerCodeActionsProvider: () => ({ dispose: () => {} }),
        createDiagnosticCollection: () => ({
            set: () => {},
            delete: () => {},
            clear: () => {},
            dispose: () => {}
        })
    },
    Diagnostic: class Diagnostic {
        constructor(
            public range: any,
            public message: string,
            public severity?: any
        ) {}
    },
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
    }
};

// Register the mock by intercepting require calls
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id: string) {
    if (id === 'vscode') {
        return vscode;
    }
    return originalRequire.apply(this, arguments);
};

