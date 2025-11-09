import * as vscode from 'vscode';

export type WritingStage = 'ideation' | 'writing' | 'review' | 'publish';

export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private currentStage: WritingStage = 'ideation';

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.show();
        this.updateStage('ideation');
    }

    updateStage(stage: WritingStage): void {
        this.currentStage = stage;
        
        const stageIcons: Record<WritingStage, string> = {
            ideation: '💡',
            writing: '✍️',
            review: '🔍',
            publish: '🚀'
        };

        const stageNames: Record<WritingStage, string> = {
            ideation: 'Ideation',
            writing: 'Writing',
            review: 'Review',
            publish: 'Publish'
        };

        this.statusBarItem.text = `${stageIcons[stage]} ${stageNames[stage]}`;
        this.statusBarItem.tooltip = `Writing Stage: ${stageNames[stage]}`;
    }

    updateProgress(current: number, total: number): void {
        const percentage = Math.round((current / total) * 100);
        this.statusBarItem.text = `$(pencil) Writing: ${percentage}%`;
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}
