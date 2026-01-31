import * as vscode from 'vscode';

let _context: vscode.ExtensionContext | undefined

export function setContext(context: vscode.ExtensionContext) {
    _context = context;
}

// get context from everywhere
export function getContext(): vscode.ExtensionContext {
    if(!_context) {
        throw new Error("Extension not initialised yet");
    }
    return _context;
}